# `main/util/eval.ts`

> Deep dive — Group B / B2. **First-party** worker bootstrap.

## Purpose

Eleven-line worker entry point used by `main/util/parallel.js` when it spawns workers via `evalPath`. The script registers a one-shot listener that `eval()`s the first message it receives. The message is the worker source synthesised by `Parallel.getWorkerSource(...)` and contains the actual `onmessage` handler that does the per-pair NFP computation.

## Public surface

No exports.

```ts
const isNode = typeof module !== "undefined" && module.exports;

if (isNode) {
  process.once("message", (code) => eval(JSON.parse(code).data));
} else {
  self.onmessage = (code) => eval(code.data);
}
```

## IPC / global side-effects

- Reads `process` (Node) or `self` (Web Worker).
- Calls `eval(...)`.
- After eval, the loaded handler typically reassigns `self.onmessage` so the worker can process subsequent messages.

## Dependencies

**In** (loaders): only `main/util/parallel.js` via the `Parallel(..., {evalPath: '../build/util/eval.js'})` option set in `main/background.js#background-start`.

**Out**: none.

## Invariants & gotchas

- **`eval` is required by `parallel.js`'s worker design** — the worker source contains the user-supplied callback (`process` function in `background.js`) plus `require()` calls that pull in `clipper.js` and `geometryutil.js`. Removing `eval` here means rewriting `parallel.js` to use a structured worker URL.
- **Once-mode**: the Node branch uses `process.once('message', …)` because subsequent messages are handled by the eval'd code's own listener. The Web Worker branch is single-message in shape too (the eval'd code reassigns `self.onmessage`).
- **No sandboxing.** The string passed in runs with full worker privileges. Within deepnest this is fine because `parallel.js` constructs the source from in-process code; do not feed user-supplied strings into Parallel.
- **`code.data` is the message body** in the Web Worker branch (it's a `MessageEvent`); in the Node branch the parameter is the raw string passed to `process.send`, so we `JSON.parse(...).data`. Keep both shapes when refactoring.

## Known TODOs

- The branch is `if (isNode) { … } else { … }` and the constant `isNode` is computed once at module load. `parallel.js` currently sets `isNode = false` at the top of its IIFE, so only the worker branch runs in production. Whether you should preserve the Node branch depends on whether anyone wants to revive `_unused/worker.cluster.js`-style fan-out (probably not — see `main__util__parallel.js.md`).

## Extension points

- Replacing `eval` with `new Function(...)` would still let CSP `'unsafe-eval'` pass, with cleaner scope semantics. Worth doing if we ever tighten renderer CSP.

## Test coverage

Indirect via the E2E nesting run, which spawns workers when `pairs.length > 0`. No unit tests.
