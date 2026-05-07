#!/usr/bin/env node
// Story 2.3 (DEE-124 / FR-02 §A4 / P2-04 / Lydia F1) — parser/drift smoke harness.
//
// Covers the 13 fail-fast branches in scripts/build-licenses.mjs per the AC-02.3.3
// table. Uses Node's built-in node:test runner (zero-dep; built-in since Node 18 LTS).
// Every test injects a capturing `onFail` via setOnFail() that throws a TestExit so the
// assertion can read back (code, msg). After each test setOnFail(null) restores the
// production default; this is the contract documented in build-licenses.mjs.
//
// Invoke directly: `node --test scripts/build-licenses.test.mjs`
// Or via npm: `npm run test:licenses` (wired into `npm test` per Story 2.3 AC-02.3.1).
//
// Exit codes asserted (must match build-licenses.mjs constants):
//   EXIT_DRIFT  = 1   (--check drift / missing LICENSES.md)
//   EXIT_SCHEMA = 2   (parser / validateEntry violations)
//   EXIT_IO     = 4   (loadEntries / modeBuild filesystem errors)

import test from "node:test";
import assert from "node:assert/strict";
import {
  copyFileSync,
  mkdtempSync,
  mkdirSync,
  writeFileSync,
  chmodSync,
  rmSync,
  statSync,
} from "node:fs";
import { spawnSync } from "node:child_process";
import { tmpdir } from "node:os";
import * as path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

// Resolve the directory containing this test file. Use `fileURLToPath` (not
// `new URL(import.meta.url).pathname`) — the latter is not a safe filesystem path on
// Windows and can be percent-encoded on paths with spaces (Copilot inline #3 on PR #36).
const TEST_DIR = path.dirname(fileURLToPath(import.meta.url));

import {
  EXIT_DRIFT,
  EXIT_SCHEMA,
  EXIT_IO,
  setOnFail,
  setMode,
  parseYaml,
  parseValue,
  validateEntry,
  renderTable,
} from "./build-licenses.mjs";

// Lydia F4 (Round-1 P3, DEE-144 fold-in): tmp-repo fixture builder. Five tests
// previously inlined ~30 lines of identical boilerplate (mkdir × 4 + writeFile × 4
// + copyFileSync of build-licenses.mjs). Helper returns { tmp, scriptPath }; the
// caller seeds whichever LICENSE.yml bodies it needs via the named params (each
// `undefined` skips that file — Branch 10 leaves all four LICENSE.yml absent to
// trip the loadEntries I/O path). Cleanup stays per-test via `rmSync(tmp, ...)`.
const STUB_PER_FOLDER =
  `- path: stub\n  name: stub\n  license: MIT\n  copyright: (c)\n  upstream_url: https://example.org\n`;
const STUB_PASSTHROUGH =
  `- path: /stub\n  name: stub\n  license: MIT\n  copyright: (c)\n  upstream_url: https://example.org\n`;

function setupTmpRepo({
  prefix = "build-licenses-",
  passthrough,
  perFolderUtil,
  perFolderFont,
  perFolderAssets,
  licensesMd,
} = {}) {
  const tmp = mkdtempSync(path.join(tmpdir(), prefix));
  const scriptDir = path.join(tmp, "scripts");
  mkdirSync(scriptDir, { recursive: true });
  const scriptPath = path.join(scriptDir, "build-licenses.mjs");
  copyFileSync(path.join(TEST_DIR, "build-licenses.mjs"), scriptPath);
  if (passthrough !== undefined) {
    mkdirSync(path.join(tmp, "main"), { recursive: true });
    writeFileSync(path.join(tmp, "main/LICENSE.yml"), passthrough);
  }
  if (perFolderUtil !== undefined) {
    mkdirSync(path.join(tmp, "main/util"), { recursive: true });
    writeFileSync(path.join(tmp, "main/util/LICENSE.yml"), perFolderUtil);
  }
  if (perFolderFont !== undefined) {
    mkdirSync(path.join(tmp, "main/font"), { recursive: true });
    writeFileSync(path.join(tmp, "main/font/LICENSE.yml"), perFolderFont);
  }
  if (perFolderAssets !== undefined) {
    mkdirSync(path.join(tmp, "tests/assets"), { recursive: true });
    writeFileSync(path.join(tmp, "tests/assets/LICENSE.yml"), perFolderAssets);
  }
  if (licensesMd !== undefined) {
    writeFileSync(path.join(tmp, "LICENSES.md"), licensesMd);
  }
  return { tmp, scriptPath };
}

class TestExit extends Error {
  constructor(code, msg) {
    super(msg);
    this.code = code;
  }
}

// captureOnFail invokes `fn` with a throwing onFail. Returns { code, msg } from the
// captured TestExit. Throws if `fn` does not invoke onFail.
function captureOnFail(fn) {
  setOnFail((code, msg) => {
    throw new TestExit(code, msg);
  });
  try {
    fn();
    throw new Error("expected onFail to be called but fn returned without calling it");
  } catch (e) {
    if (e instanceof TestExit) return { code: e.code, msg: e.message };
    throw e;
  } finally {
    setOnFail(null);
  }
}

// Reset MODE before each test so a prior run leaving MODE=licenses:check does not
// pollute the diagnostic prefix asserted on subsequent tests. Test asserts use a
// substring search on `msg`, so MODE-dependent prefix bytes are not asserted directly.
test.beforeEach(() => {
  setMode("licenses:build");
});

// Branch 1: parseYaml — value-line outside any entry.
test("parser: value-line outside any entry → EXIT_SCHEMA", () => {
  const { code, msg } = captureOnFail(() => {
    parseYaml("  key: value\n", "fake/LICENSE.yml");
  });
  assert.equal(code, EXIT_SCHEMA);
  assert.match(msg, /value-line outside any entry/);
});

// Branch 2: parseYaml — expected continuation / new-entry.
// Triggered by a continuation line whose indentation is not exactly 2 spaces (no `- `
// prefix, but does not match the `^  key: value` continuation regex).
test("parser: expected continuation / new-entry → EXIT_SCHEMA", () => {
  const { code, msg } = captureOnFail(() => {
    parseYaml("- a: 1\n notb: 2\n", "fake/LICENSE.yml");
  });
  assert.equal(code, EXIT_SCHEMA);
  assert.match(msg, /expected `  key: value` continuation/);
});

// Branch 3: parseValue — unterminated double-quoted string.
test("parser: unterminated double-quoted string → EXIT_SCHEMA", () => {
  const { code, msg } = captureOnFail(() => {
    parseValue('"Hello', "fake/LICENSE.yml", 7);
  });
  assert.equal(code, EXIT_SCHEMA);
  assert.match(msg, /unterminated double-quoted string/);
});

// Branch 4: validateEntry — missing required field.
test("validate: missing required field → EXIT_SCHEMA", () => {
  const { code, msg } = captureOnFail(() => {
    validateEntry(
      { name: "x", license: "MIT", copyright: "(c)", upstream_url: "u" },
      "main/util/LICENSE.yml",
      1,
    );
  });
  assert.equal(code, EXIT_SCHEMA);
  assert.match(msg, /missing required field `path`/);
});

// Branch 5: validateEntry — required field non-empty-string violation.
test("validate: required field non-empty-string → EXIT_SCHEMA", () => {
  const { code, msg } = captureOnFail(() => {
    validateEntry(
      { path: "", name: "x", license: "MIT", copyright: "(c)", upstream_url: "u" },
      "main/util/LICENSE.yml",
      1,
    );
  });
  assert.equal(code, EXIT_SCHEMA);
  assert.match(msg, /required field `path` must be a non-empty string/);
});

// Branch 6: validateEntry — unknown field.
test("validate: unknown field → EXIT_SCHEMA", () => {
  const { code, msg } = captureOnFail(() => {
    validateEntry(
      {
        path: "x",
        name: "x",
        license: "MIT",
        copyright: "(c)",
        upstream_url: "u",
        bogus: "y",
      },
      "main/util/LICENSE.yml",
      1,
    );
  });
  assert.equal(code, EXIT_SCHEMA);
  assert.match(msg, /unknown field `bogus`/);
});

// Branch 7: validateEntry — first_party non-boolean.
test("validate: first_party non-boolean → EXIT_SCHEMA", () => {
  const { code, msg } = captureOnFail(() => {
    validateEntry(
      {
        path: "x",
        name: "x",
        license: "MIT",
        copyright: "(c)",
        upstream_url: "u",
        first_party: "maybe",
      },
      "main/util/LICENSE.yml",
      1,
    );
  });
  assert.equal(code, EXIT_SCHEMA);
  assert.match(msg, /`first_party` must be boolean/);
});

// Branch 8 (NEW — Copilot inline #1): validateEntry — `notes` non-string.
test("validate: notes non-string → EXIT_SCHEMA (Copilot inline #1)", () => {
  const { code, msg } = captureOnFail(() => {
    validateEntry(
      {
        path: "x",
        name: "x",
        license: "MIT",
        copyright: "(c)",
        upstream_url: "u",
        notes: true,
      },
      "main/util/LICENSE.yml",
      1,
    );
  });
  assert.equal(code, EXIT_SCHEMA);
  assert.match(msg, /`notes` must be a string/);
});

// Branch 9a (NEW — Copilot inline #2): per-folder absolute path rejection.
test("validate: per-folder absolute path → EXIT_SCHEMA (Copilot inline #2)", () => {
  const { code, msg } = captureOnFail(() => {
    validateEntry(
      {
        path: "/clipper.js",
        name: "clipper",
        license: "MIT",
        copyright: "(c)",
        upstream_url: "u",
      },
      "main/util/LICENSE.yml",
      1,
    );
  });
  assert.equal(code, EXIT_SCHEMA);
  assert.match(msg, /per-folder `path:` MUST be folder-relative/);
});

// Branch 9b (NEW — Copilot inline #2): per-folder `..` segment rejection.
test("validate: per-folder `..` segment → EXIT_SCHEMA (Copilot inline #2)", () => {
  const { code, msg } = captureOnFail(() => {
    validateEntry(
      {
        path: "../clipper.js",
        name: "clipper",
        license: "MIT",
        copyright: "(c)",
        upstream_url: "u",
      },
      "main/util/LICENSE.yml",
      1,
    );
  });
  assert.equal(code, EXIT_SCHEMA);
  assert.match(msg, /per-folder `path:` MUST NOT contain `\.\.` segments/);
});

// PASSTHROUGH_FILE opt-out: main/LICENSE.yml uses literal Unit values, including some
// out-of-tree paths starting with `/` (e.g. `/polygon`). MUST NOT trigger row-9 fail.
test("validate: PASSTHROUGH_FILE absolute path is ALLOWED", () => {
  // Should not throw — runs to completion without invoking onFail.
  setOnFail((code, msg) => {
    throw new TestExit(code, msg);
  });
  try {
    validateEntry(
      {
        path: "/polygon",
        name: "polygon",
        license: "MIT",
        copyright: "(c)",
        upstream_url: "u",
      },
      "main/LICENSE.yml",
      1,
    );
  } finally {
    setOnFail(null);
  }
});

// Branch 10: loadEntries — I/O error (file doesn't exist). Triggered by parseYaml
// receiving a synthetic ENOENT. We don't have a direct seam into loadEntries' I/O
// (it walks LICENSE_YML_FILES from REPO_ROOT) so simulate via parseYaml of a missing
// file. Test the underlying contract: failIO is called with EXIT_IO from outside-the-
// repo context. Use a dynamic import + custom CWD to drive loadEntries against a
// missing file.
test("loadEntries: I/O error → EXIT_IO", () => {
  // Run a child Node process pointed at a temp REPO_ROOT lacking LICENSE.yml files.
  // We can't override REPO_ROOT post-import (it's resolved relative to SCRIPT_DIR).
  // setupTmpRepo() with no overrides leaves all four LICENSE.yml files absent;
  // modeCheck loads will fail on the first ENOENT (main/LICENSE.yml).
  const { tmp, scriptPath } = setupTmpRepo({ prefix: "build-licenses-io-" });
  const r = spawnSync(process.execPath, [scriptPath, "--check"], { encoding: "utf8" });
  rmSync(tmp, { recursive: true, force: true });
  assert.equal(r.status, EXIT_IO);
  assert.match(r.stderr, /FAIL — I\/O error on main\/LICENSE\.yml/);
  // P3-07 / Lydia F2 (DEE-140 fold-in): MODE-prefix correctness on the failIO half of
  // P3-07. Dispatched with `--check`, so failIO MUST emit `[licenses:check]`.
  assert.match(r.stderr, /^\[licenses:check\]/m);
});

// Branch 11: modeBuild — write error. Skipped on Windows (chmod semantics differ;
// the platform-conditional skip is documented in AC-02.3.3 row 11).
test(
  "modeBuild: write error → EXIT_IO",
  { skip: process.platform === "win32" ? "windows chmod semantics" : false },
  () => {
    // Recreate a minimal valid REPO_ROOT layout so loadEntries succeeds and modeBuild
    // reaches the writeFileSync. Then chmod the REPO_ROOT to 0o555 (read+execute only)
    // so writing LICENSES.md fails with EACCES.
    const { tmp, scriptPath } = setupTmpRepo({
      prefix: "build-licenses-write-",
      passthrough: STUB_PASSTHROUGH,
      perFolderUtil: STUB_PER_FOLDER,
      perFolderFont: STUB_PER_FOLDER,
      perFolderAssets: STUB_PER_FOLDER,
    });
    chmodSync(tmp, 0o555);
    const r = spawnSync(process.execPath, [scriptPath], { encoding: "utf8" });
    chmodSync(tmp, 0o755);
    rmSync(tmp, { recursive: true, force: true });
    assert.equal(r.status, EXIT_IO);
    assert.match(r.stderr, /FAIL — I\/O error on LICENSES\.md/);
    // P3-07 / Lydia F2 (DEE-140 fold-in): MODE-prefix correctness on the modeBuild
    // failIO branch. Dispatched without `--check`, so failIO MUST emit `[licenses:build]`.
    assert.match(r.stderr, /^\[licenses:build\]/m);
  },
);

// Branch 11.5 (P3-07 / Lydia F2 / DEE-140 fold-in): schema-fail spawned test under the
// build dispatcher. Drives a malformed LICENSE.yml so the parser short-circuits via
// failSchema. MUST emit `[licenses:build]` (NOT `[licenses:check]`) because the gate
// runs without `--check`. Closes the failSchema half of P3-07 (companion to the
// existing in-process Branch-1..9 captureOnFail asserts which can't observe MODE).
test("modeBuild: schema-fail spawned → EXIT_SCHEMA + [licenses:build] prefix", () => {
  // Drop `name:` to trip "missing required field" in validateEntry.
  const brokenEntry = `- path: stub\n  license: MIT\n  copyright: (c)\n  upstream_url: https://example.org\n`;
  const { tmp, scriptPath } = setupTmpRepo({
    prefix: "build-licenses-schemafail-",
    passthrough: STUB_PASSTHROUGH,
    perFolderUtil: brokenEntry,
    perFolderFont: STUB_PER_FOLDER,
    perFolderAssets: STUB_PER_FOLDER,
  });
  const r = spawnSync(process.execPath, [scriptPath], { encoding: "utf8" });
  rmSync(tmp, { recursive: true, force: true });
  assert.equal(r.status, EXIT_SCHEMA);
  assert.match(r.stderr, /missing required field `name`/);
  assert.match(r.stderr, /^\[licenses:build\]/m);
  assert.doesNotMatch(r.stderr, /^\[licenses:check\]/m);
});

// Branch 12: modeCheck — LICENSES.md missing (ENOENT).
test("modeCheck: LICENSES.md missing → EXIT_DRIFT", () => {
  // Deliberately do NOT seed LICENSES.md (licensesMd undefined → not written).
  const { tmp, scriptPath } = setupTmpRepo({
    prefix: "build-licenses-missing-",
    passthrough: STUB_PASSTHROUGH,
    perFolderUtil: STUB_PER_FOLDER,
    perFolderFont: STUB_PER_FOLDER,
    perFolderAssets: STUB_PER_FOLDER,
  });
  const r = spawnSync(process.execPath, [scriptPath, "--check"], { encoding: "utf8" });
  rmSync(tmp, { recursive: true, force: true });
  assert.equal(r.status, EXIT_DRIFT);
  assert.match(r.stderr, /LICENSES\.md not found/);
});

// Branch 13: modeCheck — content drift.
test("modeCheck: content drift → EXIT_DRIFT", () => {
  // Seed LICENSES.md with a deliberately wrong body so --check detects drift.
  const { tmp, scriptPath } = setupTmpRepo({
    prefix: "build-licenses-drift-",
    passthrough: STUB_PASSTHROUGH,
    perFolderUtil: STUB_PER_FOLDER,
    perFolderFont: STUB_PER_FOLDER,
    perFolderAssets: STUB_PER_FOLDER,
    licensesMd: "wrong contents\n",
  });
  const r = spawnSync(process.execPath, [scriptPath, "--check"], { encoding: "utf8" });
  rmSync(tmp, { recursive: true, force: true });
  assert.equal(r.status, EXIT_DRIFT);
  assert.match(r.stderr, /differs from regenerated output/);
  // Truncation banner: regenerated output for 4 stub entries is 8 lines, committed is
  // 1 line — total drift = 8 (each regenerated line vs `<missing>` after L1). Below the
  // 20-line cap, so banner reads `First 8 of 8 differing line(s):` with NO `(…N more
  // truncated)` clause. Assert the un-truncated shape (no `(…` substring).
  const m = r.stderr.match(/First (\d+) of (\d+) differing line\(s\)( \(…\d+ more truncated\))?:/);
  assert.ok(m, `expected drift banner; got stderr:\n${r.stderr}`);
  assert.equal(Number(m[1]), Number(m[2]), "shown count must equal total when un-truncated");
  assert.equal(m[3], undefined, "un-truncated banner must NOT contain `(…N more truncated)`");
  // Unified-diff markers present.
  assert.match(r.stderr, /^@@ L1 @@$/m);
  assert.match(r.stderr, /^\+wrong contents$/m);
});

// Truncation honesty (Story 2.3 / P3-03): emitDriftDiff caps display at 20 entries
// AND reports the total. Exercise via a tall drift (25 differing lines).
test("modeCheck: truncation honesty → 'First 20 of 25 differing line(s) (…5 more truncated):'", () => {
  // Build a large LICENSE.yml stack so the regenerated LICENSES.md spans > 25 rows.
  // 25 distinct entries spread across the per-folder files.
  let perFolderUtil = "";
  for (let i = 0; i < 25; i++) {
    perFolderUtil +=
      `- path: stub${i}\n  name: stub${i}\n  license: MIT\n  copyright: (c) ${i}\n  upstream_url: https://example.org/${i}\n`;
  }
  const stub =
    `- path: stub-folder\n  name: stub-folder\n  license: MIT\n  copyright: (c)\n  upstream_url: https://example.org\n`;
  const { tmp, scriptPath } = setupTmpRepo({
    prefix: "build-licenses-trunc-",
    passthrough: `- path: /stub-passthrough\n  name: stub\n  license: MIT\n  copyright: (c)\n  upstream_url: https://example.org\n`,
    perFolderUtil,
    perFolderFont: stub,
    perFolderAssets: stub,
    // Seed the committed LICENSES.md with an entirely wrong body so every line drifts.
    licensesMd: Array.from({ length: 30 }, (_, i) => `wrong line ${i}`).join("\n") + "\n",
  });
  const r = spawnSync(process.execPath, [scriptPath, "--check"], { encoding: "utf8" });
  rmSync(tmp, { recursive: true, force: true });
  assert.equal(r.status, EXIT_DRIFT);
  // The total drift count depends on the regenerated output's exact length; we assert
  // the truncation pattern specifically: "First 20 of N differing line(s) (…N-20 more truncated):"
  // for N > 20. Capture N from stderr to avoid coupling to the exact row count.
  const m = r.stderr.match(/First (\d+) of (\d+) differing line\(s\)(?: \(…(\d+) more truncated\))?:/);
  assert.ok(m, `expected truncation banner; got stderr: ${r.stderr}`);
  const shown = Number(m[1]);
  const total = Number(m[2]);
  assert.equal(shown, 20, "display cap must be 20");
  assert.ok(total > 20, `expected total drift > 20; got ${total}`);
  assert.equal(Number(m[3]), total - shown);
});

// --help / -h exit-0 (Story 2.3 / P3-05).
test("dispatcher: --help → exit 0 with usage on stdout", () => {
  const r = spawnSync(
    process.execPath,
    [path.join(TEST_DIR, "build-licenses.mjs"), "--help"],
    { encoding: "utf8" },
  );
  assert.equal(r.status, 0);
  assert.match(r.stdout, /usage: node scripts\/build-licenses\.mjs/);
});

test("dispatcher: -h → exit 0 with usage on stdout", () => {
  const r = spawnSync(
    process.execPath,
    [path.join(TEST_DIR, "build-licenses.mjs"), "-h"],
    { encoding: "utf8" },
  );
  assert.equal(r.status, 0);
  assert.match(r.stdout, /usage: node scripts\/build-licenses\.mjs/);
});

// Unrecognised flag → EXIT_USAGE (regression guard for the --help branch).
test("dispatcher: unrecognised flag → EXIT_USAGE", () => {
  const r = spawnSync(
    process.execPath,
    [path.join(TEST_DIR, "build-licenses.mjs"), "--bogus"],
    { encoding: "utf8" },
  );
  assert.equal(r.status, 3);
  assert.match(r.stderr, /usage: node scripts\/build-licenses\.mjs/);
});

// Mode-prefix correctness (Story 2.3 / P3-07 / Copilot inline #4): a `--check` failure
// emits `[licenses:check]`, not `[licenses:build]`. Drive a missing-LICENSES.md case.
test("dispatcher: --check failure prefix is [licenses:check] (not [licenses:build])", () => {
  const { tmp, scriptPath } = setupTmpRepo({
    prefix: "build-licenses-modepfx-",
    passthrough: STUB_PASSTHROUGH,
    perFolderUtil: STUB_PER_FOLDER,
    perFolderFont: STUB_PER_FOLDER,
    perFolderAssets: STUB_PER_FOLDER,
  });
  const r = spawnSync(process.execPath, [scriptPath, "--check"], { encoding: "utf8" });
  rmSync(tmp, { recursive: true, force: true });
  assert.equal(r.status, EXIT_DRIFT);
  assert.match(r.stderr, /^\[licenses:check\]/m);
  assert.doesNotMatch(r.stderr, /^\[licenses:build\]/m);
});

// Importability sanity (Lydia F5 — Round-1 P3, DEE-144 fold-in): importing the module
// must NOT trigger CLI dispatch. The original test landed `assert.ok(true)` and relied
// solely on this file's top-level import not having spawned modeBuild as the implicit
// proof. Strengthen by spawning a fresh Node that imports the module and serialises
// `Object.keys(...)` to stdout — assert (a) clean exit 0, (b) no LICENSES.md was
// written to the spawn CWD, (c) the exported-surface keys include the documented
// public API (`setOnFail`, `renderTable`, `EXIT_DRIFT`, `MODE`).
test("module shape: import does not trigger CLI dispatch (isMain guard)", () => {
  const targetUrl = pathToFileURL(path.join(TEST_DIR, "build-licenses.mjs")).href;
  const cwdTmp = mkdtempSync(path.join(tmpdir(), "build-licenses-import-"));
  const r = spawnSync(
    process.execPath,
    [
      "-e",
      `import(${JSON.stringify(targetUrl)})` +
        `.then(m => process.stdout.write(JSON.stringify(Object.keys(m))))`,
    ],
    { cwd: cwdTmp, encoding: "utf8" },
  );
  let licensesMdExisted = false;
  try {
    statSync(path.join(cwdTmp, "LICENSES.md"));
    licensesMdExisted = true;
  } catch {
    // expected — import must not have written LICENSES.md to CWD
  }
  rmSync(cwdTmp, { recursive: true, force: true });
  assert.equal(r.status, 0, `expected clean exit; got status=${r.status} stderr=${r.stderr}`);
  assert.equal(licensesMdExisted, false, "import must not write LICENSES.md to CWD");
  const exported = JSON.parse(r.stdout);
  for (const key of ["setOnFail", "renderTable", "EXIT_DRIFT", "MODE"]) {
    assert.ok(exported.includes(key), `missing exported member \`${key}\`; got ${r.stdout}`);
  }
});

// Lydia F6 (Round-1 P3, DEE-144 fold-in): renderTable byte-identity is currently
// guarded only transitively (via the production licenses:check gate against the
// committed LICENSES.md). Add a direct snapshot test on a small fixture asserting
// (a) header line, (b) first-party row precedes the third-party block, (c) third-
// party rows ordered by ASCII byte order (reverse-alpha input → sorted output), and
// (d) trailing newline.
test("renderTable: byte-identical to fixture (header + ordering + trailing newline)", () => {
  const entries = [
    {
      unit: "/main",
      license: "MIT",
      copyright: "Copyright (c) 2015 Jack Qiao",
      firstParty: true,
    },
    {
      unit: "/main/util/zlib.js",
      license: "Zlib",
      copyright: "Copyright (c) Jean-loup Gailly and Mark Adler",
      firstParty: false,
    },
    {
      unit: "/main/util/clipper.js",
      license: "MIT",
      copyright: "Copyright (c) 2014 Angus Johnson",
      firstParty: false,
    },
  ];
  const expected =
    "This software contains different units with different licenses, copyrights and authors.\n\n" +
    "| Unit | License | Copyright |\n" +
    "| - | - | - |\n" +
    "| /main | MIT | Copyright (c) 2015 Jack Qiao |\n" +
    "| /main/util/clipper.js | MIT | Copyright (c) 2014 Angus Johnson |\n" +
    "| /main/util/zlib.js | Zlib | Copyright (c) Jean-loup Gailly and Mark Adler |\n";
  assert.equal(renderTable(entries), expected);
});
