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
import { mkdtempSync, mkdirSync, writeFileSync, chmodSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import * as path from "node:path";
import { pathToFileURL } from "node:url";

import {
  EXIT_DRIFT,
  EXIT_SCHEMA,
  EXIT_IO,
  setOnFail,
  setMode,
  parseYaml,
  parseValue,
  validateEntry,
} from "./build-licenses.mjs";

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
test("loadEntries: I/O error → EXIT_IO", async () => {
  // Run a child Node process pointed at a temp REPO_ROOT lacking LICENSE.yml files.
  // We can't override REPO_ROOT post-import (it's resolved relative to SCRIPT_DIR).
  // Spawn the script from a tmp dir with no main/LICENSE.yml; modeBuild loads will fail.
  const { spawnSync } = await import("node:child_process");
  const tmp = mkdtempSync(path.join(tmpdir(), "build-licenses-io-"));
  const scriptDir = path.join(tmp, "scripts");
  mkdirSync(scriptDir, { recursive: true });
  // Re-resolve the script source relative to this test file. Both files live in
  // <repo>/scripts; we copy build-licenses.mjs into the temp scripts/ dir so its
  // SCRIPT_DIR/REPO_ROOT resolution picks up the (empty-of-LICENSE.yml) tmp REPO_ROOT.
  const { copyFileSync } = await import("node:fs");
  const thisDir = path.dirname(new URL(import.meta.url).pathname);
  copyFileSync(path.join(thisDir, "build-licenses.mjs"), path.join(scriptDir, "build-licenses.mjs"));
  const r = spawnSync(process.execPath, [path.join(scriptDir, "build-licenses.mjs"), "--check"], {
    encoding: "utf8",
  });
  rmSync(tmp, { recursive: true, force: true });
  assert.equal(r.status, EXIT_IO);
  assert.match(r.stderr, /FAIL — I\/O error on main\/LICENSE\.yml/);
});

// Branch 11: modeBuild — write error. Skipped on Windows (chmod semantics differ;
// the platform-conditional skip is documented in AC-02.3.3 row 11).
test(
  "modeBuild: write error → EXIT_IO",
  { skip: process.platform === "win32" ? "windows chmod semantics" : false },
  async () => {
    const { spawnSync } = await import("node:child_process");
    const { copyFileSync, mkdirSync: mk } = await import("node:fs");
    const tmp = mkdtempSync(path.join(tmpdir(), "build-licenses-write-"));
    // Recreate a minimal valid REPO_ROOT layout so loadEntries succeeds and modeBuild
    // reaches the writeFileSync. Then chmod the REPO_ROOT to 0o555 (read+execute only)
    // so writing LICENSES.md fails with EACCES.
    const scriptDir = path.join(tmp, "scripts");
    mk(scriptDir, { recursive: true });
    const thisDir = path.dirname(new URL(import.meta.url).pathname);
    copyFileSync(
      path.join(thisDir, "build-licenses.mjs"),
      path.join(scriptDir, "build-licenses.mjs"),
    );
    // Minimal LICENSE.yml stack — main/, main/util/, main/font/, tests/assets/.
    const validEntry = (folder) =>
      `- path: stub\n  name: stub\n  license: MIT\n  copyright: (c)\n  upstream_url: https://example.org\n`;
    const passthroughEntry =
      `- path: /stub\n  name: stub\n  license: MIT\n  copyright: (c)\n  upstream_url: https://example.org\n`;
    mk(path.join(tmp, "main"), { recursive: true });
    mk(path.join(tmp, "main/util"), { recursive: true });
    mk(path.join(tmp, "main/font"), { recursive: true });
    mk(path.join(tmp, "tests/assets"), { recursive: true });
    writeFileSync(path.join(tmp, "main/LICENSE.yml"), passthroughEntry);
    writeFileSync(path.join(tmp, "main/util/LICENSE.yml"), validEntry("main/util"));
    writeFileSync(path.join(tmp, "main/font/LICENSE.yml"), validEntry("main/font"));
    writeFileSync(path.join(tmp, "tests/assets/LICENSE.yml"), validEntry("tests/assets"));
    chmodSync(tmp, 0o555);
    const r = spawnSync(process.execPath, [path.join(scriptDir, "build-licenses.mjs")], {
      encoding: "utf8",
    });
    chmodSync(tmp, 0o755);
    rmSync(tmp, { recursive: true, force: true });
    assert.equal(r.status, EXIT_IO);
    assert.match(r.stderr, /FAIL — I\/O error on LICENSES\.md/);
  },
);

// Branch 12: modeCheck — LICENSES.md missing (ENOENT).
test("modeCheck: LICENSES.md missing → EXIT_DRIFT", async () => {
  const { spawnSync } = await import("node:child_process");
  const { copyFileSync, mkdirSync: mk } = await import("node:fs");
  const tmp = mkdtempSync(path.join(tmpdir(), "build-licenses-missing-"));
  const scriptDir = path.join(tmp, "scripts");
  mk(scriptDir, { recursive: true });
  const thisDir = path.dirname(new URL(import.meta.url).pathname);
  copyFileSync(path.join(thisDir, "build-licenses.mjs"), path.join(scriptDir, "build-licenses.mjs"));
  const validEntry = `- path: stub\n  name: stub\n  license: MIT\n  copyright: (c)\n  upstream_url: https://example.org\n`;
  const passthroughEntry = `- path: /stub\n  name: stub\n  license: MIT\n  copyright: (c)\n  upstream_url: https://example.org\n`;
  mk(path.join(tmp, "main"), { recursive: true });
  mk(path.join(tmp, "main/util"), { recursive: true });
  mk(path.join(tmp, "main/font"), { recursive: true });
  mk(path.join(tmp, "tests/assets"), { recursive: true });
  writeFileSync(path.join(tmp, "main/LICENSE.yml"), passthroughEntry);
  writeFileSync(path.join(tmp, "main/util/LICENSE.yml"), validEntry);
  writeFileSync(path.join(tmp, "main/font/LICENSE.yml"), validEntry);
  writeFileSync(path.join(tmp, "tests/assets/LICENSE.yml"), validEntry);
  // Deliberately do NOT seed LICENSES.md.
  const r = spawnSync(process.execPath, [path.join(scriptDir, "build-licenses.mjs"), "--check"], {
    encoding: "utf8",
  });
  rmSync(tmp, { recursive: true, force: true });
  assert.equal(r.status, EXIT_DRIFT);
  assert.match(r.stderr, /LICENSES\.md not found/);
});

// Branch 13: modeCheck — content drift.
test("modeCheck: content drift → EXIT_DRIFT", async () => {
  const { spawnSync } = await import("node:child_process");
  const { copyFileSync, mkdirSync: mk } = await import("node:fs");
  const tmp = mkdtempSync(path.join(tmpdir(), "build-licenses-drift-"));
  const scriptDir = path.join(tmp, "scripts");
  mk(scriptDir, { recursive: true });
  const thisDir = path.dirname(new URL(import.meta.url).pathname);
  copyFileSync(path.join(thisDir, "build-licenses.mjs"), path.join(scriptDir, "build-licenses.mjs"));
  const validEntry = `- path: stub\n  name: stub\n  license: MIT\n  copyright: (c)\n  upstream_url: https://example.org\n`;
  const passthroughEntry = `- path: /stub\n  name: stub\n  license: MIT\n  copyright: (c)\n  upstream_url: https://example.org\n`;
  mk(path.join(tmp, "main"), { recursive: true });
  mk(path.join(tmp, "main/util"), { recursive: true });
  mk(path.join(tmp, "main/font"), { recursive: true });
  mk(path.join(tmp, "tests/assets"), { recursive: true });
  writeFileSync(path.join(tmp, "main/LICENSE.yml"), passthroughEntry);
  writeFileSync(path.join(tmp, "main/util/LICENSE.yml"), validEntry);
  writeFileSync(path.join(tmp, "main/font/LICENSE.yml"), validEntry);
  writeFileSync(path.join(tmp, "tests/assets/LICENSE.yml"), validEntry);
  // Seed LICENSES.md with a deliberately wrong body so --check detects drift.
  writeFileSync(path.join(tmp, "LICENSES.md"), "wrong contents\n");
  const r = spawnSync(process.execPath, [path.join(scriptDir, "build-licenses.mjs"), "--check"], {
    encoding: "utf8",
  });
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
test("modeCheck: truncation honesty → 'First 20 of 25 differing line(s) (…5 more truncated):'", async () => {
  const { spawnSync } = await import("node:child_process");
  const { copyFileSync, mkdirSync: mk } = await import("node:fs");
  const tmp = mkdtempSync(path.join(tmpdir(), "build-licenses-trunc-"));
  const scriptDir = path.join(tmp, "scripts");
  mk(scriptDir, { recursive: true });
  const thisDir = path.dirname(new URL(import.meta.url).pathname);
  copyFileSync(path.join(thisDir, "build-licenses.mjs"), path.join(scriptDir, "build-licenses.mjs"));
  // Build a large LICENSE.yml stack so the regenerated LICENSES.md spans > 25 rows.
  // 25 distinct entries spread across the per-folder files.
  let perFolderUtil = "";
  for (let i = 0; i < 25; i++) {
    perFolderUtil +=
      `- path: stub${i}\n  name: stub${i}\n  license: MIT\n  copyright: (c) ${i}\n  upstream_url: https://example.org/${i}\n`;
  }
  const passthrough =
    `- path: /stub-passthrough\n  name: stub\n  license: MIT\n  copyright: (c)\n  upstream_url: https://example.org\n`;
  const stub =
    `- path: stub-folder\n  name: stub-folder\n  license: MIT\n  copyright: (c)\n  upstream_url: https://example.org\n`;
  mk(path.join(tmp, "main"), { recursive: true });
  mk(path.join(tmp, "main/util"), { recursive: true });
  mk(path.join(tmp, "main/font"), { recursive: true });
  mk(path.join(tmp, "tests/assets"), { recursive: true });
  writeFileSync(path.join(tmp, "main/LICENSE.yml"), passthrough);
  writeFileSync(path.join(tmp, "main/util/LICENSE.yml"), perFolderUtil);
  writeFileSync(path.join(tmp, "main/font/LICENSE.yml"), stub);
  writeFileSync(path.join(tmp, "tests/assets/LICENSE.yml"), stub);
  // Seed the committed LICENSES.md with an entirely wrong body so every line drifts.
  writeFileSync(
    path.join(tmp, "LICENSES.md"),
    Array.from({ length: 30 }, (_, i) => `wrong line ${i}`).join("\n") + "\n",
  );
  const r = spawnSync(process.execPath, [path.join(scriptDir, "build-licenses.mjs"), "--check"], {
    encoding: "utf8",
  });
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
test("dispatcher: --help → exit 0 with usage on stdout", async () => {
  const { spawnSync } = await import("node:child_process");
  const thisDir = path.dirname(new URL(import.meta.url).pathname);
  const r = spawnSync(
    process.execPath,
    [path.join(thisDir, "build-licenses.mjs"), "--help"],
    { encoding: "utf8" },
  );
  assert.equal(r.status, 0);
  assert.match(r.stdout, /usage: node scripts\/build-licenses\.mjs/);
});

test("dispatcher: -h → exit 0 with usage on stdout", async () => {
  const { spawnSync } = await import("node:child_process");
  const thisDir = path.dirname(new URL(import.meta.url).pathname);
  const r = spawnSync(
    process.execPath,
    [path.join(thisDir, "build-licenses.mjs"), "-h"],
    { encoding: "utf8" },
  );
  assert.equal(r.status, 0);
  assert.match(r.stdout, /usage: node scripts\/build-licenses\.mjs/);
});

// Unrecognised flag → EXIT_USAGE (regression guard for the --help branch).
test("dispatcher: unrecognised flag → EXIT_USAGE", async () => {
  const { spawnSync } = await import("node:child_process");
  const thisDir = path.dirname(new URL(import.meta.url).pathname);
  const r = spawnSync(
    process.execPath,
    [path.join(thisDir, "build-licenses.mjs"), "--bogus"],
    { encoding: "utf8" },
  );
  assert.equal(r.status, 3);
  assert.match(r.stderr, /usage: node scripts\/build-licenses\.mjs/);
});

// Mode-prefix correctness (Story 2.3 / P3-07 / Copilot inline #4): a `--check` failure
// emits `[licenses:check]`, not `[licenses:build]`. Drive a missing-LICENSES.md case.
test("dispatcher: --check failure prefix is [licenses:check] (not [licenses:build])", async () => {
  const { spawnSync } = await import("node:child_process");
  const { copyFileSync, mkdirSync: mk } = await import("node:fs");
  const tmp = mkdtempSync(path.join(tmpdir(), "build-licenses-modepfx-"));
  const scriptDir = path.join(tmp, "scripts");
  mk(scriptDir, { recursive: true });
  const thisDir = path.dirname(new URL(import.meta.url).pathname);
  copyFileSync(path.join(thisDir, "build-licenses.mjs"), path.join(scriptDir, "build-licenses.mjs"));
  const validEntry = `- path: stub\n  name: stub\n  license: MIT\n  copyright: (c)\n  upstream_url: https://example.org\n`;
  const passthroughEntry = `- path: /stub\n  name: stub\n  license: MIT\n  copyright: (c)\n  upstream_url: https://example.org\n`;
  mk(path.join(tmp, "main"), { recursive: true });
  mk(path.join(tmp, "main/util"), { recursive: true });
  mk(path.join(tmp, "main/font"), { recursive: true });
  mk(path.join(tmp, "tests/assets"), { recursive: true });
  writeFileSync(path.join(tmp, "main/LICENSE.yml"), passthroughEntry);
  writeFileSync(path.join(tmp, "main/util/LICENSE.yml"), validEntry);
  writeFileSync(path.join(tmp, "main/font/LICENSE.yml"), validEntry);
  writeFileSync(path.join(tmp, "tests/assets/LICENSE.yml"), validEntry);
  const r = spawnSync(process.execPath, [path.join(scriptDir, "build-licenses.mjs"), "--check"], {
    encoding: "utf8",
  });
  rmSync(tmp, { recursive: true, force: true });
  assert.equal(r.status, EXIT_DRIFT);
  assert.match(r.stderr, /^\[licenses:check\]/m);
  assert.doesNotMatch(r.stderr, /^\[licenses:build\]/m);
});

// Importability sanity: importing the module must NOT trigger CLI dispatch. If it did,
// loading this test file (which imports build-licenses.mjs) would itself spawn modeBuild
// and the test runner would fail or hang. The fact that we reach this assertion proves
// the isMain() guard works as intended.
test("module shape: import does not trigger CLI dispatch (isMain guard)", () => {
  // No-op assertion — reaching this line demonstrates the guard.
  assert.ok(true);
});
