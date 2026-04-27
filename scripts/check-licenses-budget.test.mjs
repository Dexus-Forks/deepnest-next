#!/usr/bin/env node
// Story 2.3 Round-1 follow-up (DEE-140 / Lydia F1 / Sage P1) — coverage harness for
// scripts/check-licenses-budget.mjs.
//
// Closes the test-coverage gap flagged in the Round-1 board review: the 91-LOC budget
// wrapper had no automated test, leaving the spawn-error / signal-kill / threshold-
// breach / --help / unrecognised-arg branches uncovered. The most consequential of
// those is the `r.error || r.signal` ⇒ EXIT_BUDGET = 3 fix from Copilot inline #3
// (false-pass hole on `process.exit(null)` ≡ 0). This file is the regression guard.
//
// Invoke directly: `node --test scripts/check-licenses-budget.test.mjs`
// Or via npm: `npm run test:licenses` (Story 2.3 / DEE-140 wired this in).
//
// Branches covered (issue DEE-140 acceptance):
//   1. signal-kill (covers `r.signal` half of `r.error || r.signal`) → EXIT_BUDGET
//   2. threshold-breach (slow fixture > 750 ms)                       → EXIT_BUDGET
//   3. --help / -h                                                    → exit 0 (stdout)
//   4. unrecognised arg                                               → EXIT_BUDGET
//   5. happy path (fast fixture)                                      → exit 0
//   + import-sanity: THRESHOLD_MS === 750 (Hermes F10 fold-in regression guard)
//
// Note on the `r.error` half of the union branch: triggering a true spawn-failure
// (e.g. ENOENT on `process.execPath`) requires injecting an alternative execPath into
// spawnSync, which the script does not currently expose. The signal-kill fixture
// drives the same `if (r.error || r.signal)` arm via `r.signal`; both halves emit the
// identical "gate process did not exit cleanly" message and the identical EXIT_BUDGET
// = 3 exit code, so coverage of the arm is preserved. A future refactor that adds an
// execPath seam can extend this file with a direct ENOENT case.

import test from "node:test";
import assert from "node:assert/strict";
import { mkdtempSync, mkdirSync, writeFileSync, copyFileSync, rmSync } from "node:fs";
import { spawnSync } from "node:child_process";
import { tmpdir } from "node:os";
import * as path from "node:path";
import { fileURLToPath } from "node:url";

import { THRESHOLD_MS, EXIT_BUDGET, isMain } from "./check-licenses-budget.mjs";

const TEST_DIR = path.dirname(fileURLToPath(import.meta.url));
const BUDGET_SCRIPT = path.join(TEST_DIR, "check-licenses-budget.mjs");

// Set up an isolated tmp scripts/ dir containing a copy of check-licenses-budget.mjs
// alongside a caller-supplied fixture build-licenses.mjs. Returns the absolute path to
// the budget-script copy (so spawnSync can run it from the tmp tree, and TARGET resolves
// to the fixture in the same dir).
function setupTmpScripts(fixtureSource) {
  const tmp = mkdtempSync(path.join(tmpdir(), "check-licenses-budget-"));
  const scriptDir = path.join(tmp, "scripts");
  mkdirSync(scriptDir, { recursive: true });
  copyFileSync(BUDGET_SCRIPT, path.join(scriptDir, "check-licenses-budget.mjs"));
  writeFileSync(path.join(scriptDir, "build-licenses.mjs"), fixtureSource);
  return { tmp, budgetCopy: path.join(scriptDir, "check-licenses-budget.mjs") };
}

function cleanup(tmp) {
  rmSync(tmp, { recursive: true, force: true });
}

// Branch 1 — signal-kill (covers `r.signal` half of the Copilot inline #3 union branch).
// Fixture: child SIGKILLs itself before exiting normally. spawnSync surfaces this as
// `r.signal === 'SIGKILL'` and `r.status === null`. The budget gate's `if (r.error ||
// r.signal)` arm MUST fire and exit EXIT_BUDGET (3) — NOT fall through to
// `process.exit(r.status)` which `process.exit(null)` resolves to 0 (false-pass hole).
test(
  "gate: child SIGKILL → EXIT_BUDGET + 'gate process did not exit cleanly' (Copilot inline #3 regression)",
  { skip: process.platform === "win32" ? "windows signal semantics differ" : false },
  () => {
    const { tmp, budgetCopy } = setupTmpScripts(
      // Self-SIGKILL before the budget script can observe a normal exit.
      `process.kill(process.pid, "SIGKILL");\n`,
    );
    const r = spawnSync(process.execPath, [budgetCopy], { encoding: "utf8" });
    cleanup(tmp);
    assert.equal(r.status, EXIT_BUDGET);
    assert.match(r.stderr, /gate process did not exit cleanly/);
    assert.match(r.stderr, /terminated by signal SIGKILL/);
  },
);

// Branch 2 — threshold-breach. Fixture: build-licenses.mjs sleeps > THRESHOLD_MS then
// exits 0. Gate observes wall-clock > 750 ms and exits EXIT_BUDGET with the wall-clock
// fail message. Sleep is set to THRESHOLD_MS + 1000 to leave generous margin under
// loaded CI without making the test painfully slow on a developer laptop.
test("gate: wall-clock > THRESHOLD_MS → EXIT_BUDGET + /wall-clock/", () => {
  const sleepMs = THRESHOLD_MS + 1000; // 1750 ms — well past 750 ms threshold.
  const { tmp, budgetCopy } = setupTmpScripts(
    `await new Promise((res) => setTimeout(res, ${sleepMs}));\nprocess.exit(0);\n`,
  );
  const r = spawnSync(process.execPath, [budgetCopy], { encoding: "utf8" });
  cleanup(tmp);
  assert.equal(r.status, EXIT_BUDGET);
  assert.match(r.stderr, /wall-clock/);
  assert.match(r.stderr, new RegExp(`exceeds ${THRESHOLD_MS} ms threshold`));
});

// Branch 3a — --help → exit 0 with usage on stdout (NOT stderr).
test("gate: --help → exit 0 with usage on stdout", () => {
  const r = spawnSync(process.execPath, [BUDGET_SCRIPT, "--help"], { encoding: "utf8" });
  assert.equal(r.status, 0);
  assert.match(r.stdout, /usage: node scripts\/check-licenses-budget\.mjs/);
  assert.equal(r.stderr, "");
});

// Branch 3b — -h → exit 0 with usage on stdout (POSIX-conventional short form).
test("gate: -h → exit 0 with usage on stdout", () => {
  const r = spawnSync(process.execPath, [BUDGET_SCRIPT, "-h"], { encoding: "utf8" });
  assert.equal(r.status, 0);
  assert.match(r.stdout, /usage: node scripts\/check-licenses-budget\.mjs/);
  assert.equal(r.stderr, "");
});

// Branch 4 — unrecognised arg → EXIT_BUDGET + usage on stderr.
test("gate: unrecognised arg → EXIT_BUDGET + usage on stderr", () => {
  const r = spawnSync(process.execPath, [BUDGET_SCRIPT, "--bogus"], { encoding: "utf8" });
  assert.equal(r.status, EXIT_BUDGET);
  assert.match(r.stderr, /unrecognised arg\(s\)/);
  assert.match(r.stderr, /usage:/);
});

// Branch 5 — happy path. Fixture exits 0 immediately; gate observes wall-clock well
// under THRESHOLD_MS and exits 0 with the OK banner on stdout.
test("gate: fast fixture under threshold → exit 0 + OK banner", () => {
  const { tmp, budgetCopy } = setupTmpScripts(`process.exit(0);\n`);
  const r = spawnSync(process.execPath, [budgetCopy], { encoding: "utf8" });
  cleanup(tmp);
  assert.equal(r.status, 0);
  assert.match(r.stdout, /\[licenses:check:budget\] OK/);
  assert.match(r.stdout, new RegExp(`<= ${THRESHOLD_MS} ms threshold`));
});

// F10 (Hermes) fold-in regression guard — THRESHOLD_MS is named and exported so a
// future drift from the architecture.md §3.3 1 s ceiling cushion (250 ms) is caught
// in one line. If this assertion ever needs to change, ping @Murat (TEA) and update
// architecture.md §3.3 in the same PR — the budget posture is explicit per Sage
// Round-1 P3-06 / Hermes F1.
test("module: THRESHOLD_MS export === 750 (Hermes F10 fold-in regression guard)", () => {
  assert.equal(THRESHOLD_MS, 750);
  assert.equal(EXIT_BUDGET, 3);
});

// Importability sanity — importing this module MUST NOT trigger CLI dispatch via the
// isMain() guard. Reaching this assertion proves the guard works (otherwise top-level
// runGate(...) would have spawned the gate as a side effect of the import above).
test("module: import does not trigger CLI dispatch (isMain guard)", () => {
  assert.equal(typeof isMain, "function");
  assert.equal(isMain(), false, "isMain() must be false under the test runner");
});
