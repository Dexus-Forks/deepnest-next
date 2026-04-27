# Build-tooling test-harness — `node:test` + module-level mutable-export pattern

> **Owner:** Amelia (DS, [85a76b80](agent://85a76b80-2d29-4086-b528-7e44ad9fc081)).
> **PM doc-gate:** John (PM, [a4900785](agent://a4900785-0dd5-45be-8944-1af41073e121)).
> **Surface:** `scripts/*.mjs` build-tooling scripts + their `scripts/*.test.mjs` companion harnesses.
> **Source:** [DEE-143](/DEE/issues/DEE-143) — Round-1 board-review F9 finding from Vitra (architecture, [DEE-137](/DEE/issues/DEE-137)) on Story 2.3 ([DEE-131](/DEE/issues/DEE-131) verdict). Reference implementation: [DEE-124](/DEE/issues/DEE-124) `scripts/build-licenses.test.mjs` at merge SHA `bbdc848` (PR [#36](https://github.com/Dexus-Forks/deepnest-next/pull/36)).
> **Status:** docs-only — pattern enforcement lives in code review (PM doc-gate + perspective minions on each new build-tooling test).

## The rule

> **Build-tooling tests (anything under `scripts/*.test.mjs`) MUST use `node:test` with a module-level mutable-export injection seam, an `isMain()` entry-point guard on the script under test, and a `TEST_DIR` constant via `fileURLToPath`. Vitest, Jest, and Playwright are NOT correct for this surface.**

The reference shape is `scripts/build-licenses.test.mjs` (21 cases, 21/21 PASS in CI on `bbdc848`). New build-tooling tests inherit its five elements; deviations must be flagged on the originating story's PR for SOP refinement.

## Why `node:test` (not Vitest / Jest / Playwright)

Build-tooling tests run in `scripts.test` ahead of Playwright, on every `npm test` and every CI run. Three constraints rule out the alternatives:

- **Zero-dep.** Build-tooling scripts are by definition zero-dep (per ADR-008 §3.3 + §16 anti-pattern audit). Their tests must inherit the constraint, otherwise a test-only dependency creeps onto the production-test critical path. `node:test` ships with Node ≥ 18 LTS — already a runtime requirement (`package.json` `engines.node`).
- **Sub-second wall-clock.** ADR-008 §3.3 caps build-time gates at 1 s. The Story 2.3 750 ms wall-clock guard (`scripts/check-licenses-budget.mjs:33`) sits 250 ms below. Vitest's worker-pool boot + Jest's transformer overhead both push individual harness invocations into the 500 ms+ range and would squeeze the budget.
- **In-process import of the script under test.** The injection seam (Pattern 3 below) requires the test harness to `import` the module without spawning. Playwright's worker model + Vitest's vm-isolation by default both make this awkward. `node:test` runs in the same process and respects standard ESM resolution.

The only valid escape hatch is "the script under test launches a subprocess of itself" (e.g. `scripts/check-licenses-budget.mjs` spawning `scripts/build-licenses.mjs --check`). For those, the harness still uses `node:test` but exercises the script via `child_process.spawnSync` — see Pattern 5.

## Pattern 1 — `isMain()` entry-point guard

The script under test must export a callable surface and gate its CLI dispatch behind an `isMain()` check, so the test harness can `import` the module without triggering `process.exit`.

Reference: `scripts/build-licenses.mjs:431-438` (post-PR-#36 `bbdc848`):

```js
export function isMain() {
  const entry = process.argv[1];
  if (!entry) return false;
  return import.meta.url === pathToFileURL(path.resolve(entry)).href;
}

if (isMain()) {
  dispatchCli(process.argv.slice(2));
}
```

Three rules:

1. **Export `isMain()`.** Named export, not a private helper. The test harness asserts behaviour against it (Pattern 5 isMain test).
2. **Treat missing `argv[1]` as "not main."** `node -e '…'` flows leave `argv[1]` undefined; `pathToFileURL(undefined)` throws. Return `false` early.
3. **Resolve `argv[1]` to an absolute path first.** `node scripts/build-licenses.mjs` populates `argv[1]` as the relative invocation string. `pathToFileURL` requires an absolute path on Windows and rejects relative inputs there. `path.resolve(entry)` first, then `pathToFileURL`. Closes Copilot inline #2 on PR #36.

The dispatcher itself (`dispatchCli`) sets module-level state (e.g. `MODE`) before calling mode handlers — that state must be `setMode(...)`-resettable from the harness (see Pattern 3).

## Pattern 2 — Module-level mutable-export injection (`setOnFail` / `defaultOnFail`)

Build-tooling scripts emit fail-fast diagnostics via a `failX(file, …)` helper that calls `process.stderr.write` + `process.exit`. Tests cannot drive that path directly without forking. The seam:

Reference: `scripts/build-licenses.mjs:88-101`:

```js
// Production behaviour byte-identical to the original:
//   write `msg + "\n"` to stderr and exit with `code`.
export const defaultOnFail = (code, msg) => {
  process.stderr.write(msg + "\n");
  process.exit(code);
};

let _onFail = defaultOnFail;

export function setOnFail(fn) {
  _onFail = fn ?? defaultOnFail;
}

export function failSchema(file, lineNo, msg) {
  _onFail(EXIT_SCHEMA, `[${MODE}] FAIL — schema parse error in ${file}:${lineNo}.\n  ${msg}\n  See ${DOCS_POINTER}.`);
}
```

Five rules:

1. **`defaultOnFail` is exported and named.** Tests reset to it via `setOnFail(null)`; reviewers can grep for the production behaviour at one site.
2. **`_onFail` is module-private (`let`).** Only `setOnFail` writes it. No external code mutates the underlying binding.
3. **`setOnFail(null)` (and `setOnFail(undefined)`) restore default.** Implementation: `_onFail = fn ?? defaultOnFail`. Lets the harness's `finally` block be unconditional.
4. **Production behaviour byte-identical.** `defaultOnFail` MUST do `process.stderr.write(msg + "\n")` + `process.exit(code)` — nothing more, nothing less. Don't add logging hooks, don't capture stack traces, don't normalise messages. The exit-code contract is what TEA + CTO sign off against.
5. **`failX` helpers go through `_onFail`, not `defaultOnFail` directly.** Otherwise the injection is dead.

### Why this beats DI / constructor injection / module mocking

- **Constructor injection** requires every helper that calls `failX` to receive the `onFail` instance. Build-tooling scripts are flat top-level functions, not classes. Threading a parameter through `parseYaml` → `failSchema` → ... is mechanical churn for no reader benefit.
- **Module mocking** (e.g. Vitest `vi.mock`) requires the test runner to intercept module resolution. `node:test` doesn't ship that and adding it pulls in a transformer (violates "Why `node:test`" above).
- **Mutable export** is one `let` + one setter. The seam is greppable. Production has zero observable difference. The test contract is "import `setOnFail`, swap, run, restore in `finally`."

The contract is tied to the production exit-code semantics. If you change the script's exit codes (Story 2.2 contract), the SOP's parity guarantee says you must also re-validate every harness branch that asserts those codes — usually a 1-line `EXIT_X = N` constant change on both sides.

## Pattern 3 — `captureOnFail` test helper + per-test reset

Tests use a per-call helper that installs a throwing `onFail`, runs the function under test, captures the thrown `(code, msg)`, and unconditionally restores the default in `finally`.

Reference: `scripts/build-licenses.test.mjs:41-63`:

```js
class TestExit extends Error {
  constructor(code, msg) {
    super(msg);
    this.code = code;
  }
}

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
```

Three rules:

1. **`finally { setOnFail(null); }`** — unconditional. Even on test-failure paths the next test starts from the production default.
2. **Throw if `fn` returns without calling `onFail`.** A "should-have-failed" path that silently returned is a real bug; surface it as a hard test failure rather than letting `captureOnFail` return `undefined`.
3. **MODE reset via `test.beforeEach(setMode("..."))`.** The injected `onFail` reads `MODE` indirectly through `failX`'s message template. A prior test leaving `MODE = "licenses:check"` poisons the diagnostic prefix asserted on subsequent tests. Reset to the script's default (`licenses:build` here) at the top of every case.

```js
test.beforeEach(() => {
  setMode("licenses:build");
});
```

## Pattern 4 — `TEST_DIR` module-scope constant via `fileURLToPath`

Tests that resolve fixture paths or copy the script-under-test into a tmp dir must derive their own directory once, at module scope, via `fileURLToPath`. Never `new URL(import.meta.url).pathname`.

Reference: `scripts/build-licenses.test.mjs:25-28`:

```js
import { fileURLToPath } from "node:url";

// Resolve the directory containing this test file. Use `fileURLToPath` (not
// `new URL(import.meta.url).pathname`) — the latter is not a safe filesystem path on
// Windows and can be percent-encoded on paths with spaces (Copilot inline #3 on PR #36).
const TEST_DIR = path.dirname(fileURLToPath(import.meta.url));
```

Two rules:

1. **`fileURLToPath`, not `URL.pathname`.** On Windows `URL.pathname` returns `/C:/path/to/file.mjs` — the leading slash makes `path.join`-derived results garbage. On any platform a path containing spaces or non-ASCII characters comes back percent-encoded. `fileURLToPath` handles both.
2. **Module-scope `const TEST_DIR`, computed once.** Don't re-derive at every call site. The reference DS implementation removed 8 ad-hoc derivations in favour of one constant (Copilot inline #3 fix on PR #36).

## Pattern 5 — Branch-table coverage discipline

Every fail-fast branch from the story spec table gets its own `node:test` `test()` case. Mode-prefix asserts. Truncation banner shape. Dispatcher exits.

Reference: `scripts/build-licenses.test.mjs:73-504`. Each case:

- Names the branch in the test title (`"parser: value-line outside any entry → EXIT_SCHEMA"`).
- Drives the branch with the smallest input that triggers it (1–3 lines of YAML for parser branches; a tmp `LICENSES.md` + tmp `LICENSE.yml` for `modeCheck` / `modeBuild` branches).
- Asserts `(code, msg)` from `captureOnFail`. `code` exact (`assert.equal(code, EXIT_SCHEMA)`), `msg` substring (`assert.match(msg, /unterminated double-quoted string/)`).

Five rules:

1. **One `test()` per spec-table row.** No "all schema branches in one test" loops. Granular failure-naming makes the regression bisect cheap.
2. **Drive the dispatcher exit-code branches via `child_process.spawnSync`** when the branch can't be reached via in-process `import` (e.g. `--help` exit-0; usage-error exit-N). Reference: lines 440-462 of the test file. Construct the command line, spawn `process.execPath`, assert `r.status` and `r.stdout` / `r.stderr`. `node:test` is the runner; spawn is the driver.
3. **Mode-prefix asserts on at least one case per script-mode.** The `dispatchCli`-set MODE has bitten reviewers before (Copilot inline #4 / P3-07 on PR #36 — `failIO` on `--check` was emitting `[licenses:build]`). At least one case per mode (`licenses:build`, `licenses:check`) asserts `^\[licenses:check\]` (or the script's mode token) on a representative failure path.
4. **Truncation / honesty asserts on display-capped output.** If the script truncates output for readability (e.g. `emitDriftDiff`'s 20-line cap), the harness asserts the un-truncated banner shape (`First N of N`) AND the truncated shape (`First 20 of N (…M-20 more truncated)`). Mitigates "drift hides past the cap" silent-pass risk.
5. **`isMain()` import-no-dispatch sanity test.** Module-scope `import` of the script under test in the harness must not trigger CLI dispatch / FS mutation / `process.exit`. The fact that the test file imports the module at line 30 without crashing is implicit verification; add an explicit assertion (`assert.ok(typeof setOnFail === "function")` or, stronger, spawn `node -e "import('./script.mjs').then(...)"` and assert exit 0) so the property reads as load-bearing rather than incidental.

## Cross-script application

The pattern applies whenever a build-tooling script in `scripts/*.mjs` warrants automated test coverage. Concrete near-term application: [DEE-126](/DEE/issues/DEE-126) (`scripts/check-test-fixtures.mjs --help` exit-0 cross-script symmetry follow-up — sibling pattern of [DEE-141](/DEE/issues/DEE-141) coverage gap on `scripts/check-licenses-budget.mjs`). The DEE-126 author should:

1. Add `isMain()` to `scripts/check-test-fixtures.mjs` (Pattern 1) so a future `scripts/check-test-fixtures.test.mjs` can import without dispatch.
2. Refactor any fail-fast helpers behind `setOnFail` + `defaultOnFail` (Pattern 2) — production behaviour byte-identical.
3. Land the harness at `scripts/check-test-fixtures.test.mjs` with `TEST_DIR` (Pattern 4), `captureOnFail` (Pattern 3), and one case per documented branch (Pattern 5).
4. Wire `npm run test:fixtures` to `node --test scripts/check-test-fixtures.test.mjs`, and chain it into `scripts.test` next to the existing `npm run test:licenses` entry.

[DEE-141](/DEE/issues/DEE-141) (`scripts/check-licenses-budget.test.mjs` — Murat / TEA scope) is the first "spawn-driven" application of Pattern 5 rule 2; deviations from this SOP discovered there should be flagged on this issue thread for SOP refinement.

## Out of scope

- **Migrating existing `*.test.mjs` files** to the SOP shape. Each script's author owns the migration as a hygiene pass.
- **Testing app-level integration** (Electron main process, Playwright UI flows). Those use the existing Playwright harness and are not "build-tooling tests."
- **Mocking the filesystem.** The reference implementation uses tmp directories under `os.tmpdir()` with per-test cleanup via `rmSync(tmp, { recursive: true, force: true })`. Don't reach for `mock-fs` / `memfs`.

## When to amend this SOP

- A new build-tooling story discovers a pattern element this SOP doesn't cover (e.g. async setup, multi-process drivers).
- A perspective minion (Vitra, Hermes, Lydia, Aegis) flags a deviation as a finding and the resolution is "the pattern was wrong, not the deviation."
- ADR-008 §3.3 (build-time gate latency rule) changes — re-validate the "Why `node:test`" section.

Amendments land as PRs against this file with a Change Log row at the bottom.

## References

- ADR-008 §3.3 (`_bmad-output/planning-artifacts/architecture.md` §5 step 3) — build-time gate latency rule (1 s ceiling).
- Reference implementation: `scripts/build-licenses.test.mjs` at merge SHA `bbdc848` (PR [#36](https://github.com/Dexus-Forks/deepnest-next/pull/36) / [DEE-124](/DEE/issues/DEE-124)).
- Production module: `scripts/build-licenses.mjs` (the module the reference test exercises).
- Wall-clock guard precedent: `scripts/check-licenses-budget.mjs` (the spawn-driven Pattern 5 rule 2 example; see [DEE-141](/DEE/issues/DEE-141) for its companion test).
- Round-1 board verdict: [DEE-131](/DEE/issues/DEE-131) — Vitra F9 finding ([DEE-137](/DEE/issues/DEE-137)) is the source for this SOP.

## Change Log

| Date | Change | Author |
|---|---|---|
| 2026-04-27 | Initial SOP authored from `scripts/build-licenses.test.mjs` reference implementation per [DEE-143](/DEE/issues/DEE-143). | Amelia (DS) |
