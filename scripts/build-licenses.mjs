#!/usr/bin/env node
// Story 2.2 (DEE-92 / FR-02 / ADR-008) — deterministic LICENSES.md generator.
// Story 2.3 (DEE-124 / FR-02 §A4) — refactored for onFail injection (P2-04 harness),
//   mode-aware diagnostic prefix (P3-07 / Copilot inline #4), unified-diff drift output
//   with truncation honesty (P3-03 / Copilot inline #3), single-pass renderTable (P3-04),
//   --help / -h exit-0 (P3-05), absolute-path / `..` per-folder rejection (Copilot inline #2),
//   notes:string schema branch (Copilot inline #1), and importability via isMain() guard.
//
// Walks per-folder LICENSE.yml metadata + the main/LICENSE.yml first-party-passthrough
// file, parses each entry per the ADR-008 §5 step 1 "Schema reference", and emits a
// canonically-ordered LICENSES.md. Companion check mode (--check) regenerates in memory
// and diffs against the committed file. `npm run licenses:check` is the CI drift gate
// (Story 2.3 / DEE-124 wired this into `npm test`).
//
// Zero-dep: Node-stable fs + path + url only. No YAML library — the constrained schema
// (top-level array of flat entry maps; required string fields + optional first_party
// boolean + optional notes string; no nested objects, anchors, or flow style) is parsed
// by a hand-rolled reader. Budgeted < 1 s on a developer laptop (architecture.md §3.3
// test-latency rule); CI gate fails > 750 ms wall (scripts/check-licenses-budget.mjs).
//
// Exit codes: 0 OK · 1 drift (--check mismatch) · 2 schema parse error · 3 usage · 4 I/O.
// Docs pointer: _bmad-output/planning-artifacts/architecture.md §5 ADR-008 (full text).
//
// Drift-diff marker convention: unified-diff style. `-${expected}` is the byte-correct
// regenerated content (what `npm run licenses:build` would write); `+${observed}` is
// what is currently committed in LICENSES.md. Reads as "to make CI green, accept the `-`
// lines into LICENSES.md (run `npm run licenses:build` and stage the result)".

import { readFileSync, writeFileSync } from "node:fs";
import * as path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const SCRIPT_DIR = path.dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = path.resolve(SCRIPT_DIR, "..");

// LICENSE.yml sources. Walk order matters: the first-party block is emitted in walk
// order then YAML insertion order within each file, so main/LICENSE.yml (5 rows) lands
// first and main/font/LICENSE.yml's `latolatinfonts.css` (first_party: true) lands sixth.
export const LICENSE_YML_FILES = [
  "main/LICENSE.yml",
  "main/util/LICENSE.yml",
  "main/font/LICENSE.yml",
  "tests/assets/LICENSE.yml",
];

// main/LICENSE.yml is the in-installer-but-out-of-tree first-party-passthrough source
// (Story 2.2 §2a option (a) / Sage Round-1 P2-01). Entries here use `path:` as the
// LITERAL Unit-column value (some rows refer to paths under node_modules/ that aren't
// in-tree, e.g. `minkowski.cc, minkowski.h` and `/polygon`). All other LICENSE.yml
// files use the default folder-relative derivation: Unit = `/<containing folder>/<path>`.
export const PASSTHROUGH_FILE = "main/LICENSE.yml";

export const OUTPUT_FILE = "LICENSES.md";

const REQUIRED_FIELDS = ["path", "name", "license", "copyright", "upstream_url"];
const KNOWN_FIELDS = new Set([
  "path",
  "name",
  "license",
  "copyright",
  "upstream_url",
  "notes",
  "first_party",
]);

const HEADER =
  "This software contains different units with different licenses, copyrights and authors.\n\n" +
  "| Unit | License | Copyright |\n" +
  "| - | - | - |\n";

export const EXIT_OK = 0;
export const EXIT_DRIFT = 1;
export const EXIT_SCHEMA = 2;
export const EXIT_USAGE = 3;
export const EXIT_IO = 4;

const DOCS_POINTER =
  '_bmad-output/planning-artifacts/architecture.md §5 ADR-008 (Schema reference + §271 out-of-tree clause)';

// MODE drives the diagnostic prefix (Story 2.3 / P3-07 / Copilot inline #4). Default
// matches the build-mode prefix; `--check` dispatch flips it before any fail* call.
export let MODE = "licenses:build";

export function setMode(mode) {
  MODE = mode;
}

// onFail injection seam (Story 2.3 / P2-04 / AC-02.3.3). Production behaviour is
// byte-identical to the original: write `msg + "\n"` to stderr and exit with `code`.
// Test harness swaps in a capturing callback via `setOnFail(...)` to assert exit codes
// and message substrings without spawning the script.
export const defaultOnFail = (code, msg) => {
  process.stderr.write(msg + "\n");
  process.exit(code);
};

let _onFail = defaultOnFail;

// Aegis defense-in-depth (DEE-140 fold-in): test-only injection seam — production code
// MUST NOT call setOnFail; only the .test.mjs harness swaps in a throwing callback.
export function setOnFail(fn) {
  _onFail = fn ?? defaultOnFail;
}

export function failSchema(file, lineNo, msg) {
  _onFail(
    EXIT_SCHEMA,
    `[${MODE}] FAIL — schema parse error in ${file}:${lineNo}.\n` +
      `  ${msg}\n` +
      `  See ${DOCS_POINTER}.`,
  );
}

export function failIO(file, err) {
  _onFail(
    EXIT_IO,
    `[${MODE}] FAIL — I/O error on ${file}: ${err.message}\n` +
      `  See ${DOCS_POINTER}.`,
  );
}

// Hand-rolled YAML reader for the constrained Story 2.1 schema. Each file is a top-level
// array of entry maps. Lines beginning with `- ` start a new entry (and carry the entry's
// first key/value pair); lines beginning with `  ` (2 spaces) carry continuation keys.
// Comment lines (`#…`) and blank lines are skipped. Quoted string values use double quotes
// with `\"` escape; `\\` is rendered as `\`. Booleans accept literal `true` / `false`.
export function parseYaml(text, file) {
  const entries = [];
  let cur = null;
  let curStartLine = 0;
  const lines = text.split("\n");
  for (let i = 0; i < lines.length; i++) {
    const lineNo = i + 1;
    const raw = lines[i];
    const stripped = raw.replace(/\s+$/, "");
    if (stripped === "") continue;
    if (/^\s*#/.test(stripped)) continue;

    let m = stripped.match(/^- ([a-zA-Z_][a-zA-Z0-9_]*):\s*(.*)$/);
    if (m) {
      if (cur) entries.push({ entry: cur, startLine: curStartLine });
      cur = {};
      curStartLine = lineNo;
      cur[m[1]] = parseValue(m[2], file, lineNo);
      continue;
    }

    if (cur === null) {
      failSchema(file, lineNo, `value-line outside any entry: \`${raw}\``);
      return entries;
    }

    m = stripped.match(/^  ([a-zA-Z_][a-zA-Z0-9_]*):\s*(.*)$/);
    if (!m) {
      failSchema(
        file,
        lineNo,
        `expected \`  key: value\` continuation or \`- key: value\` new entry, got \`${raw}\``,
      );
      return entries;
    }
    cur[m[1]] = parseValue(m[2], file, lineNo);
  }
  if (cur) entries.push({ entry: cur, startLine: curStartLine });
  return entries;
}

export function parseValue(raw, file, lineNo) {
  if (raw === "true") return true;
  if (raw === "false") return false;
  if (raw.startsWith('"')) {
    if (!raw.endsWith('"') || raw.length < 2) {
      failSchema(file, lineNo, `unterminated double-quoted string: \`${raw}\``);
      return raw;
    }
    return raw.slice(1, -1).replace(/\\(["\\])/g, "$1");
  }
  return raw;
}

export function loadEntries() {
  const all = [];
  for (const rel of LICENSE_YML_FILES) {
    const abs = path.join(REPO_ROOT, rel);
    let text;
    try {
      text = readFileSync(abs, "utf8");
    } catch (err) {
      failIO(rel, err);
      return all;
    }
    const parsed = parseYaml(text, rel);
    for (const { entry, startLine } of parsed) {
      validateEntry(entry, rel, startLine);
      // Aegis defense-in-depth (DEE-140 fold-in): `entry.path` here is a label-only
      // string used to build the LICENSES.md Unit cell — no fs operation is performed
      // on it. The path-traversal/absolute-prefix checks in validateEntry above are
      // schema enforcement (ADR-008 §5), not runtime fs sanitation; the fs invariant
      // (no readlink / open / unlink against `entry.path`) is assumed and held here.
      const unit = deriveUnit(rel, entry.path);
      all.push({
        unit,
        license: entry.license,
        copyright: entry.copyright,
        firstParty: entry.first_party === true,
        sourceFile: rel,
        sourceLine: startLine,
      });
    }
  }
  return all;
}

export function validateEntry(entry, file, lineNo) {
  for (const f of REQUIRED_FIELDS) {
    if (!(f in entry)) {
      failSchema(file, lineNo, `entry is missing required field \`${f}\``);
      return;
    }
    if (typeof entry[f] !== "string" || entry[f] === "") {
      failSchema(
        file,
        lineNo,
        `required field \`${f}\` must be a non-empty string`,
      );
      return;
    }
  }
  for (const k of Object.keys(entry)) {
    if (!KNOWN_FIELDS.has(k)) {
      failSchema(file, lineNo, `unknown field \`${k}\` (allowed: ${[...KNOWN_FIELDS].join(", ")})`);
      return;
    }
  }
  if ("first_party" in entry && typeof entry.first_party !== "boolean") {
    failSchema(file, lineNo, `\`first_party\` must be boolean true|false`);
    return;
  }
  // Copilot inline #1 / Story 2.3 row 8: `notes` must be a string when present.
  if ("notes" in entry && typeof entry.notes !== "string") {
    failSchema(file, lineNo, `\`notes\` must be a string when present`);
    return;
  }
  // Copilot inline #2 / Story 2.3 row 9: per-folder `path:` MUST be folder-relative.
  // The PASSTHROUGH_FILE (main/LICENSE.yml) opts out — its `path:` IS the literal
  // Unit-column value (some rows are out-of-tree, e.g. `/polygon`). ADR-008 §5 step 1.
  if (file !== PASSTHROUGH_FILE) {
    if (entry.path.startsWith("/")) {
      failSchema(
        file,
        lineNo,
        "per-folder `path:` MUST be folder-relative — leading `/` is not allowed; see ADR-008 §5 step 1 schema reference",
      );
      return;
    }
    if (entry.path.split("/").includes("..")) {
      failSchema(
        file,
        lineNo,
        "per-folder `path:` MUST NOT contain `..` segments; see ADR-008 §5 step 1 schema reference",
      );
      return;
    }
  }
}

export function deriveUnit(licenseYmlRel, entryPath) {
  if (licenseYmlRel === PASSTHROUGH_FILE) {
    // main/LICENSE.yml: `path:` IS the Unit column literal (some rows are out-of-tree —
    // `/polygon`, `minkowski.cc, minkowski.h` — that aren't in-tree paths under main/).
    return entryPath;
  }
  const folder = path.dirname(licenseYmlRel); // e.g. 'main/util'
  return `/${folder}/${entryPath}`;
}

function rowOf(e) {
  return `| ${e.unit} | ${e.license} | ${e.copyright} |`;
}

export function renderTable(entries) {
  // First-party block: walk-order then YAML-insertion-order (preserved by loadEntries).
  // Third-party block: alphabetical by Unit (ASCII byte order — `_` (0x5F) precedes
  // lower-case letters; matches Sage Round-1 pre-flight ordering of the Story 2.1 baseline).
  const firstParty = entries.filter((e) => e.firstParty);
  const thirdParty = entries
    .filter((e) => !e.firstParty)
    .sort((a, b) => (a.unit < b.unit ? -1 : a.unit > b.unit ? 1 : 0));

  // Single-pass for-of accumulation (Story 2.3 / P3-04). Output is byte-identical to
  // the prior `[...firstParty, ...thirdParty].map(rowOf).join("\n")` shape.
  let body = HEADER;
  for (const e of firstParty) body += rowOf(e) + "\n";
  for (const e of thirdParty) body += rowOf(e) + "\n";
  // Strip the trailing newline left by the last accumulator step, then re-add a single
  // trailing newline to match the prior `join("\n") + "\n"` shape — net result identical.
  return body.replace(/\n$/, "") + "\n";
}

export function buildOutput() {
  return renderTable(loadEntries());
}

export function modeBuild() {
  const out = buildOutput();
  const dest = path.join(REPO_ROOT, OUTPUT_FILE);
  try {
    writeFileSync(dest, out, "utf8");
  } catch (err) {
    failIO(OUTPUT_FILE, err);
    return;
  }
  process.stdout.write(
    `[${MODE}] wrote ${OUTPUT_FILE} (${out.length} bytes; ${out.split("\n").length - 1} lines)\n`,
  );
  process.exit(EXIT_OK);
}

export function modeCheck() {
  const startNs = process.hrtime.bigint();
  const expected = buildOutput();
  const dest = path.join(REPO_ROOT, OUTPUT_FILE);
  let observed;
  try {
    observed = readFileSync(dest, "utf8");
  } catch (err) {
    if (err.code === "ENOENT") {
      _onFail(
        EXIT_DRIFT,
        `[${MODE}] FAIL — ${OUTPUT_FILE} not found.\n` +
          `  Run \`npm run licenses:build\` to seed it. See ${DOCS_POINTER}.`,
      );
      return;
    }
    failIO(OUTPUT_FILE, err);
    return;
  }
  if (observed === expected) {
    const ms = Number(process.hrtime.bigint() - startNs) / 1e6;
    process.stdout.write(
      `[${MODE}] OK — ${OUTPUT_FILE} matches regenerated output (0 drift, ${ms.toFixed(0)} ms wall)\n`,
    );
    process.exit(EXIT_OK);
    return;
  }
  emitDriftDiff(expected, observed);
  process.exit(EXIT_DRIFT);
}

// Drift-diff display cap. After the cap is reached the banner reports the truncation
// honestly (Story 2.3 / P3-03 / Lydia F2): `First N of M differing line(s):` plus
// `(…M-N more truncated)` when truncated.
const DRIFT_DISPLAY_CAP = 20;

export function emitDriftDiff(expected, observed) {
  const expLines = expected.split("\n");
  const obsLines = observed.split("\n");
  const maxLen = Math.max(expLines.length, obsLines.length);
  // Single pass: count total drift across the whole file (truncation honesty), capture
  // the first DRIFT_DISPLAY_CAP for the unified-diff display.
  const diffs = [];
  let totalDrift = 0;
  for (let i = 0; i < maxLen; i++) {
    if (expLines[i] !== obsLines[i]) {
      totalDrift += 1;
      if (diffs.length < DRIFT_DISPLAY_CAP) {
        diffs.push({
          line: i + 1,
          exp: expLines[i] ?? "<missing>",
          obs: obsLines[i] ?? "<missing>",
        });
      }
    }
  }
  // Unified-diff-style stanzas (Story 2.3 / Copilot inline #3): `-${exp}` is the
  // byte-correct regenerated content; `+${obs}` is what is currently committed.
  // See file-header comment for the marker convention.
  const body = diffs
    .map((d) => `@@ L${d.line} @@\n-${d.exp}\n+${d.obs}`)
    .join("\n");
  const banner =
    totalDrift > diffs.length
      ? `First ${diffs.length} of ${totalDrift} differing line(s) (…${totalDrift - diffs.length} more truncated):`
      : `First ${diffs.length} of ${totalDrift} differing line(s):`;
  // Vitra F8 (Round-1 P3, DEE-144 fold-in): inline marker legend above the diff body so
  // a contributor reading the CI log without opening the source does not read the diff
  // with standard `diff(1)` semantics and paste the wrong direction back into LICENSES.md.
  const legend =
    `('-' lines = expected (run \`npm run licenses:build\`); '+' lines = committed in ${OUTPUT_FILE})`;
  process.stderr.write(
    `[${MODE}] FAIL — ${OUTPUT_FILE} differs from regenerated output.\n\n` +
      `${banner}\n${legend}\n${body}\n\n` +
      `Re-derive via \`npm run licenses:build\` after a deliberate metadata edit; see\n` +
      `  ${DOCS_POINTER}.\n` +
      `Story 2.4 (A5) lands the contributor-facing "add a new vendored library" workflow\n` +
      `  in docs/development-guide.md; until then, ADR-008 §5 is canonical.\n`,
  );
}

function emitUsage(stream) {
  stream.write(
    `usage: node scripts/build-licenses.mjs [--check | --help | -h]\n` +
      `  (no flag) regenerate ${OUTPUT_FILE} from per-folder LICENSE.yml metadata\n` +
      `  --check   regenerate in memory + diff against committed ${OUTPUT_FILE}; exit 1 on drift\n` +
      `  --help/-h print this usage and exit 0\n`,
  );
}

export function dispatchCli(argv) {
  // Story 2.3 / P3-07: the dispatcher sets MODE before invoking the mode handler so
  // every fail* call carries the correct prefix (was incorrectly always `licenses:build`).
  if (argv.length === 0) {
    setMode("licenses:build");
    modeBuild();
    return;
  }
  if (argv.length === 1) {
    if (argv[0] === "--check") {
      setMode("licenses:check");
      modeCheck();
      return;
    }
    // Story 2.3 / P3-05: POSIX-conventional exit 0 on --help / -h.
    if (argv[0] === "--help" || argv[0] === "-h") {
      emitUsage(process.stdout);
      process.exit(EXIT_OK);
      return;
    }
  }
  emitUsage(process.stderr);
  process.exit(EXIT_USAGE);
}

// Entry-point guard (Story 2.3 / AC-02.3.3 module-shape constraint). The dispatcher
// only runs when this file is invoked as a Node entry point; importing the module from
// the test harness MUST NOT trigger CLI behaviour.
//
// `process.argv[1]` is commonly a relative path (`node scripts/build-licenses.mjs`) or
// can be missing (`node -e '…'` flows have `argv[1] === undefined`). `pathToFileURL`
// requires an absolute path on input or it throws on Windows / on relative inputs that
// fail its internal validation (Copilot inline #2 on PR #36). Resolve to an absolute
// path first and treat the missing-argv case as "not main".
export function isMain() {
  const entry = process.argv[1];
  if (!entry) return false;
  return import.meta.url === pathToFileURL(path.resolve(entry)).href;
}

if (isMain()) {
  dispatchCli(process.argv.slice(2));
}
