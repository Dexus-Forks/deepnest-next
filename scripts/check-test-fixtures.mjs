#!/usr/bin/env node
// Story 3.1 (DEE-54 / FR-03) — deterministic, single-process integrity check
// for tests/assets/. Captures the fixture set + the two literal counts that
// tests/index.spec.ts depends on (#importsnav li = 2, placements = 54/54)
// and fails before Playwright when the coupling drifts.
//
// Zero-dep: Node-stable fs + path + crypto only. No Playwright spawn,
// no Electron spawn. Budgeted < 1 s on a developer laptop (architecture.md
// §3.3 test-latency rule). See _bmad-output/planning-artifacts/architecture.md
// §4 "FR-03" and _bmad-output/project-context.md §12 (testing rules).

import { readFileSync, readdirSync, readlinkSync, writeFileSync } from "node:fs";
import { createHash } from "node:crypto";
import * as path from "node:path";
import { fileURLToPath } from "node:url";

const SCHEMA_VERSION = 1;
const SCRIPT_DIR = path.dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = path.resolve(SCRIPT_DIR, "..");
const ASSETS_DIR = path.join(REPO_ROOT, "tests", "assets");
const MANIFEST_NAME = ".fixture-manifest.json";
const MANIFEST_PATH = path.join(ASSETS_DIR, MANIFEST_NAME);
const SPEC_PATH = path.join(REPO_ROOT, "tests", "index.spec.ts");

// Exit codes: 0 OK · 1 drift · 2 spec-format/missing · 3 usage · 4 corrupt manifest · 5 symlink
const EXIT_OK = 0;
const EXIT_DRIFT = 1;
const EXIT_SPEC_FORMAT = 2;
const EXIT_USAGE = 3;
const EXIT_CORRUPT_MANIFEST = 4;
const EXIT_SYMLINK = 5;

const DOCS_POINTER =
  'docs/development-guide.md §"Re-deriving the test-fixture literals after a `tests/assets/` change"';

function listFixtures() {
  const out = [];
  function walk(dir, rel) {
    const entries = readdirSync(dir, { withFileTypes: true });
    for (const entry of entries) {
      const abs = path.join(dir, entry.name);
      const relPath = rel ? `${rel}/${entry.name}` : entry.name;
      if (entry.isSymbolicLink()) failSymlink(`tests/assets/${relPath}`, abs);
      if (entry.isDirectory()) {
        walk(abs, relPath);
      } else if (entry.isFile() && entry.name !== MANIFEST_NAME) {
        const buf = readFileSync(abs);
        out.push({
          path: `tests/assets/${relPath}`,
          size: buf.length,
          sha256: createHash("sha256").update(buf).digest("hex"),
        });
      }
    }
  }
  walk(ASSETS_DIR, "");
  out.sort((a, b) => (a.path < b.path ? -1 : a.path > b.path ? 1 : 0));
  return out;
}

function readSpecLiterals() {
  let src;
  try {
    src = readFileSync(SPEC_PATH, "utf8");
  } catch (err) {
    if (err.code === "ENOENT") failSpecMissing();
    throw err;
  }

  // #importsnav li count — anchored on the stable selector identifier.
  // Lazy `.*?` walks past the locator's nested ")" up to ".toHaveCount(N)".
  const navRe =
    /#importsnav\s+li.*?\)\s*\.toHaveCount\(\s*(\d+)\s*\)/;
  const navMatch = src.match(navRe);

  // placements `N/M` literal — accepts either toHaveText or toContainText
  // and is tolerant of whitespace + multiline (\s spans newlines).
  // Trailing `[,)]` allows both `("54/54")` and `("54/54",)` styles.
  const placeRe =
    /\.(?:toHaveText|toContainText)\(\s*["'](\d+)\s*\/\s*(\d+)["']\s*[,)]/;
  const placeMatch = src.match(placeRe);

  if (!navMatch || !placeMatch) {
    return {
      ok: false,
      navMatch: !!navMatch,
      placeMatch: !!placeMatch,
      lineCount: src.split("\n").length,
    };
  }
  return {
    ok: true,
    importsnav_count: Number(navMatch[1]),
    placements_total: Number(placeMatch[1]),
    placements_max: Number(placeMatch[2]),
  };
}

function readManifest() {
  let raw;
  try {
    raw = readFileSync(MANIFEST_PATH, "utf8");
  } catch (err) {
    if (err.code === "ENOENT") return null;
    throw err;
  }
  try {
    return JSON.parse(raw);
  } catch (err) {
    failCorruptManifest(err, raw);
  }
}

function buildManifest(literals, files) {
  return {
    schema_version: SCHEMA_VERSION,
    captured_at: new Date().toISOString(),
    literals: {
      importsnav_count: literals.importsnav_count,
      placements_total: literals.placements_total,
      placements_max: literals.placements_max,
    },
    files,
  };
}

function manifestMatches(expected, observed) {
  if (!expected || !observed) return false;
  const eLit = expected.literals || {};
  const oLit = observed.literals;
  if (eLit.importsnav_count !== oLit.importsnav_count) return false;
  if (eLit.placements_total !== oLit.placements_total) return false;
  if (eLit.placements_max !== oLit.placements_max) return false;
  const e = (expected.files || []).slice().sort((a, b) =>
    a.path < b.path ? -1 : a.path > b.path ? 1 : 0,
  );
  const o = observed.files;
  if (e.length !== o.length) return false;
  for (let i = 0; i < e.length; i++) {
    if (e[i].path !== o[i].path) return false;
    if (e[i].size !== o[i].size) return false;
    if (e[i].sha256 !== o[i].sha256) return false;
  }
  return true;
}

function diffManifest(expected, observed) {
  const lines = [];
  const eLit = expected.literals || {};
  const oLit = observed.literals;
  const litKeys = ["importsnav_count", "placements_total", "placements_max"];
  for (const key of litKeys) {
    const e = eLit[key];
    const o = oLit[key];
    const drift = e !== o ? "   <-- drift" : "";
    lines.push(`  ${key} = ${e}    ${key} = ${o}${drift}`);
  }
  lines.push("");
  const eFiles = new Map((expected.files || []).map((f) => [f.path, f]));
  const oFiles = new Map(observed.files.map((f) => [f.path, f]));
  const allPaths = Array.from(
    new Set([...eFiles.keys(), ...oFiles.keys()]),
  ).sort();
  for (const p of allPaths) {
    const e = eFiles.get(p);
    const o = oFiles.get(p);
    if (e && o) {
      const same = e.size === o.size && e.sha256 === o.sha256;
      const tag = same ? "" : "   <-- drift";
      lines.push(
        `  ${p} (${e.size} ${e.sha256.slice(0, 12)})    ${p} (${o.size} ${o.sha256.slice(0, 12)})${tag}`,
      );
    } else if (e && !o) {
      lines.push(`  ${p}    <missing>   <-- removed`);
    } else if (!e && o) {
      lines.push(`  <missing>    ${p}   <-- new, no manifest entry`);
    }
  }
  return lines.join("\n");
}

function failSpecFormat(literals) {
  const rel = path.relative(REPO_ROOT, SPEC_PATH);
  process.stderr.write(
    `[test:fixtures] FAIL — could not extract spec literals from ${rel}.\n` +
      `  importsnav regex matched: ${literals.navMatch}\n` +
      `  placements regex matched: ${literals.placeMatch}\n` +
      `  Searched lines 1..${literals.lineCount}. Expected patterns:\n` +
      `    expect(...#importsnav li...).toHaveCount(N)\n` +
      `    .toHaveText|toContainText("N/M")\n` +
      `  See ${DOCS_POINTER} for the re-derivation procedure.\n`,
  );
  process.exit(EXIT_SPEC_FORMAT);
}

function failSpecMissing() {
  const rel = path.relative(REPO_ROOT, SPEC_PATH);
  process.stderr.write(
    `[test:fixtures] FAIL — spec file not found at ${rel}.\n` +
      `  Restore tests/index.spec.ts before rerunning fixtures (\`npm run test:fixtures:check\` or \`npm run test:fixtures:update\`). See ${DOCS_POINTER}.\n`,
  );
  process.exit(EXIT_SPEC_FORMAT);
}

function failCorruptManifest(parseErr, raw) {
  const rel = path.relative(REPO_ROOT, MANIFEST_PATH);
  const m = /position\s+(\d+)/i.exec(parseErr.message);
  const line = m ? String(raw.slice(0, Number(m[1])).split("\n").length) : "?";
  process.stderr.write(
    `[test:fixtures:check] FAIL — corrupt manifest at ${rel}.\n` +
      `  JSON parse error near line ${line}: ${parseErr.message}\n` +
      `  Re-seed via \`npm run test:fixtures:update\` after restoring the file. See ${DOCS_POINTER}.\n`,
  );
  process.exit(EXIT_CORRUPT_MANIFEST);
}

function failSymlink(relPath, abs) {
  let target = "<unresolved>";
  try { target = readlinkSync(abs); } catch { /* keep placeholder */ }
  process.stderr.write(
    `[test:fixtures] FAIL — symbolic link rejected at ${relPath} -> ${target}.\n` +
      `  Symlinks could impersonate fixtures from outside tests/assets/; replace with a regular file.\n` +
      `  See ${DOCS_POINTER}.\n`,
  );
  process.exit(EXIT_SYMLINK);
}

function modeCheck() {
  const literals = readSpecLiterals();
  if (!literals.ok) failSpecFormat(literals);

  const observed = buildManifest(literals, listFixtures());
  const expected = readManifest();
  if (!expected) {
    const rel = path.relative(REPO_ROOT, MANIFEST_PATH);
    process.stderr.write(
      `[test:fixtures:check] FAIL — no manifest at ${rel}.\n` +
        `  Run \`npm run test:fixtures:update\` to seed it.\n` +
        `  See ${DOCS_POINTER}.\n`,
    );
    process.exit(EXIT_DRIFT);
  }

  if (manifestMatches(expected, observed)) {
    process.exit(EXIT_OK);
  }

  const diff = diffManifest(expected, observed);
  process.stderr.write(
    `[test:fixtures:check] FAIL — fixture set drifted from manifest.\n\n` +
      `Expected (manifest):    Observed (working tree):\n` +
      `${diff}\n\n` +
      `Re-derive the manifest after a deliberate fixture edit by following:\n` +
      `  ${DOCS_POINTER} (added by Story 3.2).\n` +
      `Fast path: \`npm run test:fixtures:update && git add tests/assets/.fixture-manifest.json\`.\n` +
      `If the spec literals in \`tests/index.spec.ts\` truly need to change (legitimate\n` +
      `  placement-count or import-nav-count drift), update and stage that file in a\n` +
      `  separate edit — \`--update\` mode regenerates the manifest by reading the\n` +
      `  current spec literals; it does NOT rewrite the spec (AC-03.8).\n`,
  );
  process.exit(EXIT_DRIFT);
}

function modeUpdate() {
  const literals = readSpecLiterals();
  if (!literals.ok) failSpecFormat(literals);
  const manifest = buildManifest(literals, listFixtures());
  writeFileSync(
    MANIFEST_PATH,
    JSON.stringify(manifest, null, 2) + "\n",
    "utf8",
  );
  const rel = path.relative(REPO_ROOT, MANIFEST_PATH);
  process.stdout.write(
    `[test:fixtures:update] wrote ${rel}\n` +
      `  literals: importsnav=${manifest.literals.importsnav_count} ` +
      `placements=${manifest.literals.placements_total}/${manifest.literals.placements_max}\n` +
      `  files:    ${manifest.files.length}\n`,
  );
  process.exit(EXIT_OK);
}

const argv = process.argv.slice(2);
if (argv.includes("--update")) {
  modeUpdate();
} else if (argv.length === 0 || argv[0] === "--check") {
  modeCheck();
} else {
  process.stderr.write(
    `usage: node scripts/check-test-fixtures.mjs [--check|--update]\n`,
  );
  process.exit(EXIT_USAGE);
}
