#!/usr/bin/env node
// Story 2.2 (DEE-92 / FR-02 / ADR-008) — deterministic LICENSES.md generator.
//
// Walks per-folder LICENSE.yml metadata + the main/LICENSE.yml first-party-passthrough
// file, parses each entry per the ADR-008 §5 step 1 "Schema reference", and emits a
// canonically-ordered LICENSES.md. Companion check mode (--check) regenerates in memory
// and diffs against the committed file (Story 2.3 / A4 will wire this into npm test).
//
// Zero-dep: Node-stable fs + path + url only. No YAML library — the constrained schema
// (top-level array of flat entry maps; required string fields + optional first_party
// boolean; no nested objects, anchors, or flow style) is parsed by a hand-rolled reader.
// Budgeted < 1 s on a developer laptop (architecture.md §3.3 test-latency rule), mirroring
// scripts/check-test-fixtures.mjs.
//
// Exit codes: 0 OK · 1 drift (--check mismatch) · 2 schema parse error · 3 usage · 4 I/O.
// Docs pointer: _bmad-output/planning-artifacts/architecture.md §5 ADR-008 (full text).

import { readFileSync, writeFileSync } from "node:fs";
import * as path from "node:path";
import { fileURLToPath } from "node:url";

const SCRIPT_DIR = path.dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = path.resolve(SCRIPT_DIR, "..");

// LICENSE.yml sources. Walk order matters: the first-party block is emitted in walk
// order then YAML insertion order within each file, so main/LICENSE.yml (5 rows) lands
// first and main/font/LICENSE.yml's `latolatinfonts.css` (first_party: true) lands sixth.
const LICENSE_YML_FILES = [
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
const PASSTHROUGH_FILE = "main/LICENSE.yml";

const OUTPUT_FILE = "LICENSES.md";

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

const EXIT_OK = 0;
const EXIT_DRIFT = 1;
const EXIT_SCHEMA = 2;
const EXIT_USAGE = 3;
const EXIT_IO = 4;

const DOCS_POINTER =
  '_bmad-output/planning-artifacts/architecture.md §5 ADR-008 (Schema reference + §271 out-of-tree clause)';

function failSchema(file, lineNo, msg) {
  process.stderr.write(
    `[licenses:build] FAIL — schema parse error in ${file}:${lineNo}.\n` +
      `  ${msg}\n` +
      `  See ${DOCS_POINTER}.\n`,
  );
  process.exit(EXIT_SCHEMA);
}

function failIO(file, err) {
  process.stderr.write(
    `[licenses:build] FAIL — I/O error on ${file}: ${err.message}\n` +
      `  See ${DOCS_POINTER}.\n`,
  );
  process.exit(EXIT_IO);
}

// Hand-rolled YAML reader for the constrained Story 2.1 schema. Each file is a top-level
// array of entry maps. Lines beginning with `- ` start a new entry (and carry the entry's
// first key/value pair); lines beginning with `  ` (2 spaces) carry continuation keys.
// Comment lines (`#…`) and blank lines are skipped. Quoted string values use double quotes
// with `\"` escape; `\\` is rendered as `\`. Booleans accept literal `true` / `false`.
function parseYaml(text, file) {
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
    }

    m = stripped.match(/^  ([a-zA-Z_][a-zA-Z0-9_]*):\s*(.*)$/);
    if (!m) {
      failSchema(
        file,
        lineNo,
        `expected \`  key: value\` continuation or \`- key: value\` new entry, got \`${raw}\``,
      );
    }
    cur[m[1]] = parseValue(m[2], file, lineNo);
  }
  if (cur) entries.push({ entry: cur, startLine: curStartLine });
  return entries;
}

function parseValue(raw, file, lineNo) {
  if (raw === "true") return true;
  if (raw === "false") return false;
  if (raw.startsWith('"')) {
    if (!raw.endsWith('"') || raw.length < 2) {
      failSchema(file, lineNo, `unterminated double-quoted string: \`${raw}\``);
    }
    return raw.slice(1, -1).replace(/\\(["\\])/g, "$1");
  }
  return raw;
}

function loadEntries() {
  const all = [];
  for (const rel of LICENSE_YML_FILES) {
    const abs = path.join(REPO_ROOT, rel);
    let text;
    try {
      text = readFileSync(abs, "utf8");
    } catch (err) {
      failIO(rel, err);
    }
    const parsed = parseYaml(text, rel);
    for (const { entry, startLine } of parsed) {
      validateEntry(entry, rel, startLine);
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

function validateEntry(entry, file, lineNo) {
  for (const f of REQUIRED_FIELDS) {
    if (!(f in entry)) {
      failSchema(file, lineNo, `entry is missing required field \`${f}\``);
    }
    if (typeof entry[f] !== "string" || entry[f] === "") {
      failSchema(
        file,
        lineNo,
        `required field \`${f}\` must be a non-empty string`,
      );
    }
  }
  for (const k of Object.keys(entry)) {
    if (!KNOWN_FIELDS.has(k)) {
      failSchema(file, lineNo, `unknown field \`${k}\` (allowed: ${[...KNOWN_FIELDS].join(", ")})`);
    }
  }
  if ("first_party" in entry && typeof entry.first_party !== "boolean") {
    failSchema(file, lineNo, `\`first_party\` must be boolean true|false`);
  }
}

function deriveUnit(licenseYmlRel, entryPath) {
  if (licenseYmlRel === PASSTHROUGH_FILE) {
    // main/LICENSE.yml: `path:` IS the Unit column literal (some rows are out-of-tree —
    // `/polygon`, `minkowski.cc, minkowski.h` — that aren't in-tree paths under main/).
    return entryPath;
  }
  const folder = path.dirname(licenseYmlRel); // e.g. 'main/util'
  return `/${folder}/${entryPath}`;
}

function renderTable(entries) {
  // First-party block: walk-order then YAML-insertion-order (preserved by loadEntries).
  // Third-party block: alphabetical by Unit (ASCII byte order — `_` (0x5F) precedes
  // lower-case letters; matches Sage Round-1 pre-flight ordering of the Story 2.1 baseline).
  const firstParty = entries.filter((e) => e.firstParty);
  const thirdParty = entries
    .filter((e) => !e.firstParty)
    .sort((a, b) => (a.unit < b.unit ? -1 : a.unit > b.unit ? 1 : 0));

  const rows = [...firstParty, ...thirdParty]
    .map((e) => `| ${e.unit} | ${e.license} | ${e.copyright} |`)
    .join("\n");

  return HEADER + rows + "\n";
}

function buildOutput() {
  return renderTable(loadEntries());
}

function modeBuild() {
  const out = buildOutput();
  const dest = path.join(REPO_ROOT, OUTPUT_FILE);
  try {
    writeFileSync(dest, out, "utf8");
  } catch (err) {
    failIO(OUTPUT_FILE, err);
  }
  process.stdout.write(
    `[licenses:build] wrote ${OUTPUT_FILE} (${out.length} bytes; ${out.split("\n").length - 1} lines)\n`,
  );
  process.exit(EXIT_OK);
}

function modeCheck() {
  const expected = buildOutput();
  const dest = path.join(REPO_ROOT, OUTPUT_FILE);
  let observed;
  try {
    observed = readFileSync(dest, "utf8");
  } catch (err) {
    if (err.code === "ENOENT") {
      process.stderr.write(
        `[licenses:check] FAIL — ${OUTPUT_FILE} not found.\n` +
          `  Run \`npm run licenses:build\` to seed it. See ${DOCS_POINTER}.\n`,
      );
      process.exit(EXIT_DRIFT);
    }
    failIO(OUTPUT_FILE, err);
  }
  if (observed === expected) {
    process.exit(EXIT_OK);
  }
  emitDriftDiff(expected, observed);
  process.exit(EXIT_DRIFT);
}

function emitDriftDiff(expected, observed) {
  const expLines = expected.split("\n");
  const obsLines = observed.split("\n");
  const maxLen = Math.max(expLines.length, obsLines.length);
  const diffs = [];
  for (let i = 0; i < maxLen; i++) {
    if (expLines[i] !== obsLines[i]) {
      diffs.push({ line: i + 1, exp: expLines[i] ?? "<missing>", obs: obsLines[i] ?? "<missing>" });
      if (diffs.length >= 20) break;
    }
  }
  const body = diffs
    .map(
      (d) =>
        `  L${d.line}\n    expected: ${d.exp}\n    observed: ${d.obs}`,
    )
    .join("\n");
  process.stderr.write(
    `[licenses:check] FAIL — ${OUTPUT_FILE} differs from regenerated output.\n\n` +
      `First ${diffs.length} differing line(s):\n${body}\n\n` +
      `Re-derive via \`npm run licenses:build\` after a deliberate metadata edit; see\n` +
      `  ${DOCS_POINTER}.\n` +
      `Story 2.4 (A5) lands the contributor-facing "add a new vendored library" workflow\n` +
      `  in docs/development-guide.md; until then, ADR-008 §5 is canonical.\n`,
  );
}

const argv = process.argv.slice(2);
if (argv.length === 0) {
  modeBuild();
} else if (argv.length === 1 && argv[0] === "--check") {
  modeCheck();
} else {
  process.stderr.write(
    `usage: node scripts/build-licenses.mjs [--check]\n` +
      `  (no flag) regenerate ${OUTPUT_FILE} from per-folder LICENSE.yml metadata\n` +
      `  --check  regenerate in memory + diff against committed ${OUTPUT_FILE}; exit 1 on drift\n`,
  );
  process.exit(EXIT_USAGE);
}
