# `main/deepnest.js`

> Deep dive — Group B / B1 core renderer modules. Parent: [DEE-13](../../../). Template per [DEE-11](../../../).

## Purpose

`main/deepnest.js` is the **genetic-algorithm orchestrator** for the visible renderer. It owns the part list, derives the polygon tree from imported SVG, drives a GA over part orderings + rotations, dispatches each individual to the hidden background renderer for evaluation via IPC `background-start`, and re-ranks the population on each `background-response`. It also exports the `GeneticAlgorithm` helper class used internally.

The file is plain ES-module JavaScript loaded directly by `main/index.html` — no TypeScript step. It imports compiled output (`../build/util/point.js`, `../build/util/HullPolygon.js`) and the native `@deepnest/svg-preprocessor` for `simplifyPolygon`. It assumes Clipper, GeometryUtil and SvgParser are already installed on `window` (see "Invariants").

## Public surface

ES-module exports:

| Symbol | Kind | Notes |
|---|---|---|
| `DeepNest` | `class` | Main orchestrator. Singleton in production: `main/index.html` does `window.DeepNest = new DeepNest(require('electron').ipcRenderer)`. |
| `GeneticAlgorithm` | `class` | GA helper used internally; exported so tests / future tooling can build a GA without dragging the whole orchestrator in. |

`window.DeepNest` (an instance of `DeepNest`) is the global the rest of the UI talks to (`window.DeepNest.config(...)`, `window.DeepNest.start(...)`, `window.DeepNest.nests`).

`DeepNest` instance API (declared canonically in `index.d.ts` as `DeepNestInstance`):

| Method | Purpose |
|---|---|
| `config(c?)` | Get or set algorithm config. Without args returns current `config`. With an object, merges allowed keys (clipperScale, curveTolerance, spacing, rotations, populationSize, mutationRate, threads, placementType, mergeLines, simplify, scale, timeRatio, conversionServer). Pushes a subset (`tolerance`, `endpointTolerance`, `scale`) into `window.SvgParser.config(...)`. |
| `importsvg(filename, dirpath, svgstring, scalingFactor, dxfFlag)` | Run the SVG → polygon-tree pipeline by delegating to `window.SvgParser.load` then `cleanInput(dxfFlag)`. Pushes `{filename, svg}` onto `imports` and the produced parts onto `parts`. Returns the new parts. |
| `getParts(paths, filename)` | Recursive polygon-tree builder used by `importsvg` and tests. Calls `window.SvgParser.polygonify`, computes nesting via `pointInPolygon`/`getHull`, and assigns `polygontree`, `svgelements`, `bounds`, `area`, `quantity`. |
| `start(progressCallback, displayCallback)` | Begin nesting. Clones part trees, applies `polygonOffset(±0.5*spacing)` per sheet/part, primes `working = true`, starts a `setInterval(launchWorkers, 100)`, and subscribes once to `background-response`. |
| `stop()` | Set `working = false`, mark every population member as not processing, `clearInterval(workerTimer)`. |
| `reset()` | Drop the GA, clear `nests`, null callbacks. |
| `polygonOffset(polygon, offset)` | Clipper-backed offset (positive = expand). Returns array. |
| `cleanPolygon(polygon)` | Clipper `SimplifyPolygon` + `CleanPolygon` pass; returns the largest result. |
| `simplifyPolygon(polygon, inside)` | Multi-stage simplification: optional native `simplifyPoly` from `@deepnest/svg-preprocessor`, hull replacement when `config.simplify`, fixed-tol radial filtering, marked-point preservation, and child-hole simplification when not `inside`. |
| `applyPlacement(placement)` | Materialise a nesting result into renderable SVG strings/elements; consumed by export.service. |
| `getHull(polygon)` | Convex-hull wrapper over `HullPolygon.hull`, falls back to the polygon itself if `hull` returns `null`. |
| `pointInPolygon(point, polygon)` | Even-odd point-in-polygon respecting `polygontree.children` (holes). |

Public instance state:

- `imports: Array<{filename, svg}>` — every imported SVG, used by export.
- `parts: Array<Part>` — flattened part list shown in the parts table.
- `partsTree: Array<PolygonTree>` — pure polygon view of `parts`, rebuilt during nesting only.
- `nests: Array<NestingResult>` — best-fitness-first list, capped at 10 by default; capped at 100 with insertion order if `process.env.DEEPNEST_LONGLIST` is truthy.
- `working: boolean` — true between `start()` and `stop()`.
- `GA: GeneticAlgorithm | null` — current population.
- `workerTimer: number | null` — `setInterval` handle for `launchWorkers`.

`GeneticAlgorithm` instance API:

| Method | Purpose |
|---|---|
| `constructor(adam, config)` | Seed with one canonical individual (`adam`) sorted by descending area, then fill `population` with mutants until `populationSize` is reached. |
| `mutate(individual)` | Per-gene swap-with-next at rate `mutationRate%` and per-gene rotation re-roll at the same rate. Returns a new individual; does not mutate the input. |
| `mate(male, female)` | Single-point crossover using the gene `id` to keep each part exactly once per child. Returns a 2-tuple. |
| `generation()` | Sort by ascending fitness, keep elite[0], breed the rest with weighted random selection. |
| `randomWeightedIndividual(exclude?)` | Lower-fitness individuals weighted higher; called by `generation`. |

## IPC / global side-effects

- **Reads `window.SvgParser`** (set by the same boot script in `main/index.html`) — `importsvg`, `getParts`, `cleanInput`, `polygonify` calls.
- **Reads `window.GeometryUtil`** — every offset / hull / area path. `geometryutil.js` must be loaded as a classic `<script>` before this module evaluates.
- **Reads `window.ClipperLib`** — `polygonOffset`, `cleanPolygon`, `svgToClipper`, `clipperToSvg`.
- **Reads `window.document`** — `renderPolygon`, `renderPoints`, `applyPlacement` build SVG nodes via `createElementNS`.
- **Sends `background-start`** through the constructor-injected `ipcRenderer` (variable name `eventEmitter`). Payload schema:

  ```js
  {
    index,                // GA population index
    sheets, sheetids, sheetsources, sheetchildren,
    individual,           // GA gene (placement[] + rotation[])
    config,               // module-level `config` object
    ids, sources, children, filenames
  }
  ```

  The `ids/sources/children/filenames` parallel arrays exist because **array properties don't survive structured-clone IPC** — see comment at line ~1275. Reassembled in `background.js` `background-start` handler.

- **Subscribes once per `start()` call to `background-response`**: rebroadcasts the payload as `setPlacements` (which `main.js` stashes on `global.exportedPlacements` for E2E inspection), then updates `GA.population[index].fitness` and unshifts into `nests` if it beats the current best.

- **Does not subscribe to `background-progress` directly**. Progress goes through `main.js`, which forwards to the visible renderer; UI components in `main/ui/components/` listen to it.

- **Reads `process.env.DEEPNEST_LONGLIST`** to switch the `nests` retention strategy. Mentioned only here — set this env var on `npm start` if you want to keep up to 100 nests for analysis.

## Dependencies

**In** (who imports / uses):

- `main/index.html` — imports the module and instantiates `DeepNest`.
- `main/ui/services/nesting.service.ts` — drives `start/stop/reset`.
- `main/ui/services/import.service.ts` — calls `importsvg`.
- `main/ui/services/export.service.ts` — reads `imports`, `nests`, calls `applyPlacement`.
- `main/ui/components/parts-view.ts`, `nest-view.ts` — read `parts`, `nests`.
- `tests/index.spec.ts` — `window.DeepNest.config()` (`tests/index.spec.ts:90`), `window.DeepNest.nests` (`tests/index.spec.ts:192`).

**Out** (what this imports):

- `../build/util/point.js` (compiled from `main/util/point.ts`) — `Point` class (used in `getHull`).
- `../build/util/HullPolygon.js` (compiled from `main/util/HullPolygon.ts`) — `HullPolygon.hull`.
- `@deepnest/svg-preprocessor` (native via `require`) — only `simplifyPolygon` here. The same package is used elsewhere via `loadSvgString`; this module touches only the simplifier.
- Implicit globals via `window`: `SvgParser`, `GeometryUtil`, `ClipperLib`, `document`, `process` (Electron exposes Node `process` in renderer).

## Invariants & gotchas

- **Module-level `config`** is captured by closure at module-load time. `config(c)` rebinds **into** that same object — do not replace it. Several callers (`background.js`, `parallel.js` worker source) snapshot config into IPC; the same `config` reference is reused.
- **Concurrent generations**: `launchWorkers` runs every 100 ms while the previous fitness call may still be in flight. Re-entry is guarded by `population[i].processing` — keep that flag accurate when refactoring.
- **Worker count is hard-coded to 1** at line ~1268 (`if (running < 1 && !processing && !fitness)`). The original was `running < config.threads`; the change tracks the matching cap in `main.js` `createBackgroundWindows()`. Increasing this means re-checking both ends *and* `main.js`'s `winCount` round-robin.
- **Elitism**: `generation()` always keeps `population[0]` after sorting by ascending fitness. Mutating the elite by reference (don't) would corrupt subsequent generations.
- **Spacing offset is applied once per `start()`**: parts get +0.5×spacing, sheets get −0.5×spacing inside their hole boundaries. Re-running `start` against the same parts inflates them again — `reset()` does **not** clear `parts`, only `GA` / `nests`. Call sites should rely on a fresh import or the `parts` mutation methods elsewhere.
- **`nests` ordering depends on `DEEPNEST_LONGLIST`**. With the env var, results are appended in arrival order (cap 100, evict the worst); without it, results are unshifted only when they beat the current best (cap 10). UI code that assumes "best at index 0" still works in both modes; UI code that assumes "sorted descending by fitness" is wrong in long-list mode.
- **`renderPolygon` / `renderPoints` are debug helpers**. They mutate the SVG passed in and have no callers in the production UI path (only mentioned in source comments). Don't introduce production callers without revisiting their `class` attribute usage.
- **`importsvg` returns the parts but also mutates `this.parts`.** Callers that want to "preview" an SVG without committing must `pop()` the imported parts back off — there is no undo helper.

## Known TODOs

- `// todo:` markers in `main.js` around `background-response` and `background-progress` (workers not cleanly torn down) bite this file too — the `eventEmitter.on('background-response', …)` listener is **never removed**, so each `start()` adds another listener. `EventEmitter.defaultMaxListeners` is bumped to 30 in `main.js`; long-running sessions that re-`start` more than 30 times will print a MaxListenersExceededWarning. Refactor: use `eventEmitter.once` per individual or stash the handler and `removeListener` in `stop()`.
- Hard-coded `running < 1` cap (see invariants above).
- Block-comment dead code at the top of `start()` (`/*while(this.nests.length > 0){...}*/`) — was once the reset path.
- `// only one background window now...` comment at line ~1267.

## Extension points

- **Multi-worker fan-out** — restore parallelism by changing the cap on line ~1268 and updating `main.js` `createBackgroundWindows(winCount)` together. The IPC payload already carries `index`, so per-individual round-robin works without further changes.
- **Alternative GA operators** — `GeneticAlgorithm.mutate`, `mate`, `randomWeightedIndividual` are independent methods. Subclass or monkey-patch on the exported class.
- **Custom fitness post-processing** — wrap or replace the `background-response` handler in `start()` to apply additional shaping (e.g., diversity preservation) before pushing into `nests`.
- **Alternative simplifiers** — `simplifyPolygon` already supports both the native `@deepnest/svg-preprocessor` and a hull fallback. New simplification strategies should plug in here, not in `background.js`.

## Test coverage

- `tests/index.spec.ts:90` — `window.DeepNest.config()` reads back the merged config under E2E.
- `tests/index.spec.ts:192` — `window.DeepNest.nests` is asserted non-empty after a full nesting run with the bundled `henny-penny.svg` / `mrs-saint-delafield.svg` fixtures.
- No unit tests; no harness exists below the UI layer.
