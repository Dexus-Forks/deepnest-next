# `main/background.js`

> Deep dive — Group B / B1. Parent: [DEE-13](../../../). Template per [DEE-11](../../../).

## Purpose

`main/background.js` runs inside the **hidden Electron `BrowserWindow`** spawned by `main.js#createBackgroundWindows()`. It is the heavy compute tier: greedy NFP-based placement, hole fitting, fitness scoring, and per-pair NFP precomputation using `parallel.js` workers + `@deepnest/calculate-nfp`. The only consumer is the visible renderer's `DeepNest` orchestrator — the file is otherwise unreachable from the UI.

It is loaded by `main/background.html` as an ES module. On `window.onload` it wires `ipcRenderer`, the native NFP addon, an `NfpCache`, then attaches `ipcRenderer.on('background-start', …)` and waits.

## Public surface

This file has **no exports**. Its public surface is its IPC contract:

| Channel | Direction | Payload | Notes |
|---|---|---|---|
| `background-start` | renderer → main → bg | `{index, individual, sheets, ids, sources, children, filenames, sheetids, sheetsources, sheetchildren, config}` | Reassembles parallel arrays back onto each part / sheet, computes any missing pair NFPs, then runs `placeParts` and emits `background-response`. |
| `background-response` | bg → main → renderer | `{placements, fitness, area, totalarea, mergedLength, utilisation, index}` (`index` set just before send so the GA can match) | One per `background-start`. |
| `background-progress` | bg → main → renderer | `{index, progress}` | Two phases: 0–0.5 during NFP precompute (`spawncount/pairs.length * 0.5`), 0.5–1.0 during placement (`0.5 + 0.5 * placednum/totalnum`). Final progress `-1` signals completion. |
| `test` | bg → main | `[sheets, parts, config, index]` | Debug-only. `main.js` stashes the last payload on `global.test` for E2E inspection. Don't depend on it for product logic. |

Module-internal helper functions (visible at top level):

| Function | Role |
|---|---|
| `mergedLength(parts, p, minlength, tolerance)` | Total length of merged collinear edges between `p` and already-placed `parts`. Drives the edge-merging fitness savings. |
| `shiftPolygon(p, shift)` | Apply a translation to a polygon plus its `children`, returning a new polygon. |
| `toClipperCoordinates`, `toNestCoordinates` | Float `{x,y}` ↔ scaled-int `{X,Y}` conversion (factor `1e7`). |
| `nfpToClipperCoordinates`, `innerNfpToClipperCoordinates` | NFP-shape conversion variants for outer vs inner placement regions. |
| `getHull(polygon)` | Local convex hull (does not call `HullPolygon`). |
| `rotatePolygon(polygon, degrees)` | Returns rotated copy plus rotated `children`. |
| `getOuterNfp(A, B, inside)` | Outer NFP via cache → native addon → Minkowski fallback. |
| `getFrame(A)` | Bounding-rectangle frame polygon for inner-NFP computation. |
| `getInnerNfp(A, B, config)` | Inner NFP for hole fitting; uses native addon if available. |
| `placeParts(sheets, parts, config, nestindex)` | The **greedy placement** entry point. Returns the result that becomes `background-response`. |
| `analyzeSheetHoles(sheets)` | Pre-scan of every sheet's `children` (holes), used to size the hole-candidate filter. |
| `analyzeParts(parts, averageHoleArea, config)` | Splits the part list into `mainParts` (placed normally) and `holeCandidates` (small enough to try inside holes). |
| `alert(message)` | Local override that logs to console; suppresses Chromium's `window.alert` modal that would otherwise hang a hidden window. |

## IPC / global side-effects

- Sets `window.ipcRenderer`, `window.addon` (native NFP), `window.path`, `window.url`, `window.fs` (graceful-fs), `window.db = new NfpCache()` inside `window.onload`. These are the addon's expected globals plus the cache that survives across many `background-start` calls (cumulative, never evicted within a process lifetime).
- Spawns Web/Worker-style workers via `Parallel` (`main/util/parallel.js`) using `evalPath: '../build/util/eval.js'` and `synchronous: false`. Each worker `require`s `clipper.js` and `geometryutil.js` directly so the NFP precompute can run off the renderer thread.
- Subscribes once at module load to `background-start`. The handler is **persistent** — there's no `removeListener`. Pair this with the worker-cleanup TODO in `main.js`.
- Reads `process.env.DEEPNEST_LONGLIST` indirectly: it is honoured by `deepnest.js` only; this side just emits results.

## Dependencies

**In** (loaders):

- `main/background.html` (the only HTML in the repo that targets this script).
- `main.js#createBackgroundWindows()` constructs the `BrowserWindow` that hosts it.

**Out** (imports / requires):

- `../build/nfpDb.js` (TypeScript output of `main/nfpDb.ts`) — `NfpCache`.
- `../build/util/HullPolygon.js` — referenced at module top although the runtime path inside `placeParts` mostly uses local helpers; keep the import to maintain symmetry with `deepnest.js`.
- `electron`'s `ipcRenderer` (via `require`).
- `@deepnest/calculate-nfp` — native add-on, the C++ NFP/Minkowski routines. Loaded as `window.addon`.
- `path`, `url`, `graceful-fs` — Node modules from Electron's renderer-with-nodeIntegration.
- `main/util/clipper.js`, `main/util/geometryutil.js` — pulled into NFP workers via `Parallel.require()` and used directly (via globals) in the main `background.js` body.

## Invariants & gotchas

- **`window.db` is process-scoped, not request-scoped.** Every `background-start` consults the same cache; cache hits across genetic-algorithm generations are the whole point. Don't reset it between calls. The cache is keyed by `{Asource, Bsource, Arotation, Brotation, Aflipped, Bflipped}` — see `main__nfpDb.ts.md`.
- **NFP precompute path matters.** Only **outer** NFPs are computed in worker threads (the C++ addon for inner NFP cannot run inside `parallel.js` — see line ~283 comment). Inner NFPs (for hole fitting) are computed synchronously in the main background thread.
- **Coordinate scale `1e7` is hard-coded** at lines ~161/178/187 (`ClipperLib.JS.ScaleUpPath(Ac, 10000000)`). Changing `config.clipperScale` will not change this value — there are two scales coexisting and they must match. If you bump one, grep for `10000000` and change them all.
- **NFP translation by `B[0]`** at lines ~187–189 — the Minkowski-sum NFP is computed about the origin, then shifted by `B`'s first vertex to match the convention used by the placement code. Don't refactor the rotate/translate without preserving this.
- **`placeParts` mutates inputs**: it sorts `parts`, replaces them with rotated copies, augments each part with `rotation`, `id`, `source`, `filename` — but operates on the structured-clone delivered by IPC, so the caller is unaffected.
- **`alert` is shadowed at module scope.** A native `window.alert` would block the hidden renderer indefinitely. If you call `alert(...)` here you'll only see a `console.log`.
- **`mergedLength` is allocation-heavy.** It allocates `O(parts·edges)` segment arrays on every placement evaluation. Profiling hot spot.
- **Hole candidate threshold**: `config.holeAreaThreshold` defaults to `1000` square user units (line ~1029 comment). Smaller threshold → more aggressive hole packing → slower runs. Document any deliberate tuning.
- **`parts[i].children = children[i]` is conditional on `!config.simplify`** (lines 71–73). Simplify mode flattens children at import time; if you turn `simplify` on at runtime mid-nest you'll see misaligned hole geometry.

## Known TODOs

- `// console.log(...)` debug lines are left throughout (look for `// console.`). Useful when chasing a bad placement; remove only if you replace them with structured logging.
- `console.log('WATCH', allplacements);` at line ~2482 always fires — keeps the placement log very chatty. Remove or guard once we have a real logger.
- The `// todo:` cluster in `main.js` (background-response / background-progress lifecycle) is the upstream owner of "hidden renderers leak handlers on app-quit". Both ends share the bug.
- The `Parallel` library still pulls in `clipper.js` / `geometryutil.js` via classic-script `require` paths (`'../../main/util/clipper.js'`). Any rename of those util files breaks the workers — see `main__util__parallel.js.md`.

## Extension points

- **Native vs JS NFP toggle** — `getOuterNfp` and `getInnerNfp` already check `window.addon` first. Disabling the native fallback is a one-line change for benchmarking.
- **Alternative placement strategies** — `placeParts` switches on `config.placementType` (`gravity`, `box`, `convexhull`). Add new strategies in the same switch and a matching fitness term in the additive scoring pipeline.
- **Edge merging savings** — `mergedLength × config.timeRatio` is subtracted from fitness. Replace `mergedLength` with a more precise cutter-time model if you want richer optimisation.
- **Hole-packing tuning** — `analyzeSheetHoles` / `analyzeParts` are isolated; adjust `holeAreaThreshold` selection or add aspect-ratio matching without touching `placeParts`.
- **Worker pool growth** — `Parallel`'s `maxWorkers` defaults to `navigator.hardwareConcurrency || 4`. Override via the `Parallel(pairs, {maxWorkers: …})` options.

## Test coverage

- E2E only. The Playwright spec at `tests/index.spec.ts` runs a full nesting against bundled fixtures and asserts that `window.DeepNest.nests` populates — that exercises the full `background-start → background-response` round-trip through this file.
- No unit tests; the per-pair NFP and `placeParts` fitness assembly are not covered in isolation.
