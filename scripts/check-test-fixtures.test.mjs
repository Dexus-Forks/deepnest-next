#!/usr/bin/env node
// DEE-126 / Bundle 3 P3-05 — cross-script symmetry smoke for
// scripts/check-test-fixtures.mjs --help / -h / --bogus exit codes.
//
// Mirrors the DEE-124 dispatcher tests on scripts/build-licenses.test.mjs and
// follows the build-tooling test-harness SOP (DEE-143,
// _bmad-output/sops/build-tooling-test-harness.md) Pattern 5 rule 2:
// dispatcher exit-code branches are spawn-driven (the script under test is not
// yet refactored to the isMain() / setOnFail() seams from Patterns 1-2; that is
// a separate hygiene pass — the spawn driver is the SOP-sanctioned escape
// hatch in the meantime).
//
// Invoke directly: `node --test scripts/check-test-fixtures.test.mjs`
// Or via npm: chained into `npm run test:licenses` (the build-tooling
// node:test runner) per the SOP wiring guidance.
//
// Exit codes asserted (must match scripts/check-test-fixtures.mjs constants):
//   0 — EXIT_OK     (--help / -h)
//   3 — EXIT_USAGE  (unrecognised flag)

import test from "node:test";
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import * as path from "node:path";
import { fileURLToPath } from "node:url";

// SOP Pattern 4: resolve TEST_DIR via fileURLToPath at module scope (not
// `new URL(import.meta.url).pathname` — Windows / percent-encoding hazard).
const TEST_DIR = path.dirname(fileURLToPath(import.meta.url));
const SCRIPT = path.join(TEST_DIR, "check-test-fixtures.mjs");

test("dispatcher: --help → exit 0 with usage on stdout", () => {
  const r = spawnSync(process.execPath, [SCRIPT, "--help"], { encoding: "utf8" });
  assert.equal(r.status, 0);
  assert.match(r.stdout, /usage: node scripts\/check-test-fixtures\.mjs/);
  assert.equal(r.stderr, "");
});

test("dispatcher: -h → exit 0 with usage on stdout", () => {
  const r = spawnSync(process.execPath, [SCRIPT, "-h"], { encoding: "utf8" });
  assert.equal(r.status, 0);
  assert.match(r.stdout, /usage: node scripts\/check-test-fixtures\.mjs/);
  assert.equal(r.stderr, "");
});

test("dispatcher: --bogus → exit 3 with usage on stderr (regression guard)", () => {
  const r = spawnSync(process.execPath, [SCRIPT, "--bogus"], { encoding: "utf8" });
  assert.equal(r.status, 3);
  assert.match(r.stderr, /usage: node scripts\/check-test-fixtures\.mjs/);
  assert.equal(r.stdout, "");
});
