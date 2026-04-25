# `main/util/parallel.js`

> Deep dive — Group B / B2. **First-party**, derived from a public-domain Parallel.js port (no upstream URL in the file). Now repo-local.

## Purpose

Tiny worker-pool library used by `main/background.js` to fan NFP precomputation out across CPU cores. The library spawns Web Workers built from a synthesised source string that imports `clipper.js` and `geometryutil.js`, then map/reduce/spawn over a job array. It is the *only* parallelism primitive in deepnest after the 8-window background pool was reduced to 1.

Loaded as a classic `<script>` in `main/index.html` so it installs `self.Parallel` (= `window.Parallel`) — and pulled into background workers via `Parallel`'s own worker-source synthesis.

## Public surface

`window.Parallel` constructor:

```
new Parallel(data, options)
  .require(scriptUrl | functionRef | {name, fn})
  .spawn(callback, env)              // single-task
  .map(callback, env)                // per-element
  .reduce(callback, env)             // pairwise reduce
  .then(success, error)              // promise-ish

Parallel.isSupported() → boolean
```

`options`:

- `evalPath: string | null` — relative URL to the worker bootstrap (`'../build/util/eval.js'` in production).
- `maxWorkers: number` — defaults to `navigator.hardwareConcurrency || 4`.
- `synchronous: boolean` — fall back to in-thread execution if Workers are not available.
- `env: object`, `envNamespace: string` — globals forwarded to each worker.

## IPC / global side-effects

- Installs `self.Parallel`.
- Does **not** integrate with Electron `ipcRenderer` — workers communicate via `postMessage`. The hidden background renderer aggregates results and forwards via IPC separately.
- Reads `navigator.hardwareConcurrency`, `self.Worker`, `self.URL`/`self.webkitURL`.

## Dependencies

**In**:

- `main/index.html` — loaded as a classic script (every visible-renderer page execution gets `Parallel` available, although the visible renderer never calls it directly today).
- `main/background.html` — same.
- `main/background.js#background-start` — `new Parallel(pairs, {evalPath: '../build/util/eval.js', synchronous: false})` → `.require('../../main/util/clipper.js')` → `.require('../../main/util/geometryutil.js')` → `.map(process)`.

**Out**: none.

## Invariants & gotchas

- **`isCommonJS` and `isNode` are forced to `false`** at the top of the IIFE (lines 4–5). The original library auto-detected, but in Electron the renderer process is "node *and* browser" simultaneously, so the detection was patched out. Don't restore it.
- **`p.require('relative/path.js')`** uses `importScripts` inside the worker. The path is resolved relative to the worker context, which is the synthesised blob URL — that is why the calls in `background.js` use `'../../main/util/clipper.js'` (two up to escape `build/util/eval.js`). Renaming or moving any of: `eval.js`, `clipper.js`, `geometryutil.js`, `main/util/`, will break `background.js` workers silently.
- **Worker source string is constructed via `Function.prototype.toString`** on the user-supplied callback. The callback must be a `function`, not a closure that captures locals — anything not in `env` will be `undefined` inside the worker.
- **`env` becomes a top-level `global.env` (Node) or `global.env` (browser worker scope) JSON snapshot**. Functions in `env` are *not* serialised — pass them via `.require(...)` instead.
- **`synchronous: true` skips workers** silently if `Worker` is unavailable. Production sets `synchronous: false` so any worker setup error throws.
- **No interaction with `_unused/worker.cluster.js` or `_unused/placementworker.js`**. The Group B scope description flagged this as a likely landmine; verified the production path here does not require either. `placementworker.js` is the *legacy* placement loop that was meant to run inside Parallel workers; the current architecture moved placement into `background.js#placeParts` (in the hidden renderer thread) and only NFP precompute fans out via Parallel. If a future refactor revives `placementworker.js`, expect to re-validate the worker source synthesis (`getWorkerSource`) and the require paths.
- **`_spawnMapWorker` is monkey-patched** in `background.js#background-start` to emit `background-progress` per worker spawn. Replacing the prototype method is fragile — any refactor of `parallel.js` must keep the method signature intact.

## Known TODOs

- The forced `isNode = false` is a workaround the original library never knew about. If we ever move NFP precompute back to Node `worker_threads`, the simplest path is to delete this file and use the standard `worker_threads` API, since this library predates it by ~5 years.
- No tests — workers + structured-clone make this harder to test, but it is also the most impactful target for unit coverage.

## Extension points

- **Drop-in replacement for `worker_threads`.** Exposed signature is small; a thin shim could swap the implementation if Electron-side worker semantics ever fix the native-addon-in-worker_threads problem (see ADR-001).
- **Per-call `maxWorkers`**: change `Parallel.options.maxWorkers` per construction; `background.js` currently uses the default.

## Test coverage

Indirect via E2E. The Playwright spec implicitly covers Parallel because every nesting run with more than one part produces non-empty `pairs` and exercises the map flow.
