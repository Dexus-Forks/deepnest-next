#!/usr/bin/env node
// Story 2.3 (DEE-124 / FR-02 §A4 / P3-06 / Hermes F1) — wall-clock CI guard for
// `licenses:check`.
//
// Spawns `node scripts/build-licenses.mjs --check`, captures wall-clock, fails
// when wall-clock > THRESHOLD_MS. Threshold is 750 ms — 250 ms cushion under
// architecture.md §3.3's 1 s test-latency ceiling, ~12× margin over the
// Story 2.2 Round-1 benchmark (mean ≈ 63 ms across 5 cold-process runs:
// 70 / 63 / 61 / 63 / 59 ms). Murat (TEA) is the gate's owner per AC-02.3.4.
//
// Zero-dep: Node-stable child_process + path + url + process.hrtime.bigint() only.
// Mirrors scripts/check-test-fixtures.mjs shape (Node-stable + zero-dep + .mjs).
//
// Exit codes:
//   0           licenses:check passed AND wall-clock <= THRESHOLD_MS
//   1           licenses:check failed (drift / I/O — propagated from the spawn)
//   2           licenses:check schema parse error (propagated from the spawn)
//   3           usage / threshold breach (wall-clock > THRESHOLD_MS while spawn was OK)
//   4           licenses:check I/O error (propagated from the spawn)
//
// CLI surface:
//   node scripts/check-licenses-budget.mjs           — run + check budget
//   node scripts/check-licenses-budget.mjs --help    — print usage + exit 0
//   node scripts/check-licenses-budget.mjs -h        — print usage + exit 0

import { spawnSync } from "node:child_process";
import * as path from "node:path";
import { fileURLToPath } from "node:url";

const SCRIPT_DIR = path.dirname(fileURLToPath(import.meta.url));
const TARGET = path.join(SCRIPT_DIR, "build-licenses.mjs");

const THRESHOLD_MS = 750;
const EXIT_BUDGET = 3;

const argv = process.argv.slice(2);
if (argv.includes("--help") || argv.includes("-h")) {
  process.stdout.write(
    `usage: node scripts/check-licenses-budget.mjs\n` +
      `  Spawns \`node scripts/build-licenses.mjs --check\`, fails if wall-clock > ${THRESHOLD_MS} ms.\n` +
      `  Story 2.3 (DEE-124 / P3-06 / Hermes F1). See scripts/check-licenses-budget.mjs header.\n`,
  );
  process.exit(0);
}
if (argv.length > 0) {
  process.stderr.write(
    `[licenses:check:budget] FAIL — unrecognised arg(s): ${JSON.stringify(argv)}\n` +
      `  usage: node scripts/check-licenses-budget.mjs [--help|-h]\n`,
  );
  process.exit(EXIT_BUDGET);
}

const startNs = process.hrtime.bigint();
const r = spawnSync(process.execPath, [TARGET, "--check"], { stdio: "inherit" });
const ms = Number(process.hrtime.bigint() - startNs) / 1e6;

// Spawn-failure path (Copilot inline #1 on PR #36): if the spawn itself fails (e.g.
// missing target script, OS-level spawn error) `r.error` is set and `r.status === null`.
// `r.signal` is set when the child exits via signal (e.g. SIGKILL on timeout). Neither
// case must be allowed to fall through to `process.exit(r.status)` — `process.exit(null)`
// resolves to exit 0 and would falsely pass the gate.
if (r.error || r.signal) {
  const reason = r.error ? `spawn error: ${r.error.message}` : `terminated by signal ${r.signal}`;
  process.stderr.write(
    `[licenses:check:budget] FAIL — gate process did not exit cleanly (${reason}; wall-clock ${ms.toFixed(0)} ms before failure)\n`,
  );
  process.exit(EXIT_BUDGET);
}

if (r.status !== 0) {
  process.stderr.write(
    `[licenses:check:budget] note — wall-clock ${ms.toFixed(0)} ms (gate exited ${r.status}; budget check skipped)\n`,
  );
  process.exit(r.status);
}

if (ms > THRESHOLD_MS) {
  process.stderr.write(
    `[licenses:check:budget] FAIL — wall-clock ${ms.toFixed(0)} ms exceeds ${THRESHOLD_MS} ms threshold.\n` +
      `  Threshold is 250 ms below architecture.md §3.3's 1 s test-latency ceiling. If a legitimate\n` +
      `  metadata-set growth pushed the gate past 750 ms, ping @Murat (TEA) on the relevant\n` +
      `  story DS issue to renegotiate within the §3.3 1 s ceiling. Do NOT raise the threshold\n` +
      `  silently — the budget posture is explicit per Sage Round-1 P3-06 / Hermes F1.\n`,
  );
  process.exit(EXIT_BUDGET);
}

process.stdout.write(
  `[licenses:check:budget] OK — gate wall-clock ${ms.toFixed(0)} ms <= ${THRESHOLD_MS} ms threshold\n`,
);
process.exit(0);
