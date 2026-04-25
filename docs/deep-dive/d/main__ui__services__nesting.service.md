# `main/ui/services/nesting.service.ts` — Deep Dive

**Generated:** 2026-04-26 by Paige (Tech Writer) for [DEE-36](/DEE/issues/DEE-36) (parent: [DEE-11](/DEE/issues/DEE-11)).
**Group:** D — UI services.
**Surface:** Bridge between the nesting UI (start/stop/back buttons, progress bar, results panel) and `DeepNest`'s GA + NFP-worker pipeline. Owns the view-switch, the cache-wipe, and the IPC stop signal.

## 1. Purpose

`NestingService` is the *control plane* for a nesting run from the renderer's perspective. It does **not** do any nesting — that's all in [`main/deepnest.js`](../../../main/deepnest.js). What this service does:

1. **Validates prerequisites** — at least one part marked as a sheet, at least one part to nest (`hasSheet`, `hasParts`, lines 255-272).
2. **Switches the UI from main view to nest view** — by toggling CSS classes on `#main` and `#nest` (`switchToNestView`, line 286-296).
3. **Wipes the NFP cache directory** — `./nfpcache` is recursively deleted before each run (`deleteCache` + `deleteFolderRecursive`, lines 192-249).
4. **Calls `deepNest.start(progressCallback, displayCallback)`** — the actual GA/NFP run. This service owns the `displayCallback` (it picks the latest result and refreshes the UI; `createDisplayCallback`, lines 384-421).
5. **Sends `background-stop` IPC** when stopping — directly to `ipcMain` (line 488). This is the only IPC channel this service uses.
6. **Manages button state** for `#stopnest`, `#startnest`, `#export`, `#export_wrapper` — class-name juggling for "stop" / "stop disabled" / "start" states with `setTimeout`-driven transitions (lines 358-376).
7. **Persists a JSON sidecar on stop** via the injected `saveJsonFn` (which is `() => exportService.exportToJson()` — see `main/ui/index.ts:685`).

It also owns the `#back` button → main-view transition with cleanup (`goBack`, lines 548-592), which mirrors stop semantics plus a `deepNest.reset()`.

## 2. Public surface

| Member | Lines | Purpose |
| --- | --- | --- |
| `class NestingService` | 93-677 | The service. |
| `type DisplayCallback` | 38 | `() => void`. |
| `type ProgressCallback` | 43 | `((progress: { index: number; progress: number }) => void) \| null`. |
| `type DisplayNestFunction` | 49 | `(nest: SelectableNestingResult) => void` — selects + renders one result. |
| `type SaveJsonFunction` | 55 | `() => void` — sidecar JSON writer. |
| `constructor(options?)` | 122-138 | All deps optional. |
| `setFileSystem`, `setIpcRenderer`, `setDeepNest`, `setNestRactive`, `setDisplayNestFunction`, `setSaveJsonFunction` | 144-186 | Late-binding setters. `setNestRactive` is the only one used after construction in production (`main/ui/index.ts:691`). |
| `deleteCache(): void` | 192-220 | Wipe `./nfpcache`. Lenient — individual file errors are swallowed. |
| `hasSheet(): boolean` | 255-261 | True if any part has `sheet === true`. |
| `hasParts(): boolean` | 267-273 | True if `deepNest.parts.length > 0`. |
| `isWorking(): boolean` | 279-281 | Reflects `deepNest.working`. |
| `startNesting(progressCallback?): boolean` | 428-468 | Validates prerequisites, switches view, wipes cache, calls `deepNest.start`. Re-entrancy guarded by `isStarting`. |
| `stopNesting(): boolean` | 474-514 | Sends `background-stop`, calls `deepNest.stop()`, clears progress, schedules a 3-second "Start nest" rebound. Re-entrancy guarded by `isStopping`. |
| `handleStopStartToggle(): void` | 520-542 | The button click handler — transitions stop→start→stop based on current `className` of `#stopnest`. |
| `goBack(): void` | 548-592 | Switches to main view, then 2 s later: stops nesting, wipes cache, resets DeepNest, clears nest-display HTML, re-enables the start button, disables export. |
| `getNests(): SelectableNestingResult[]` | 598-600 | `deepNest.nests` accessor. |
| `getSelectedNest(): SelectableNestingResult \| null` | 606-613 | The "selected" nest result (the last one with `selected === true`). |
| `selectNest(nest): void` | 619-641 | Manually select a result and trigger `displayNestFn`. |
| `bindEventHandlers(): void` | 647-665 | Attach onclick listeners to `#startnest`, `#stopnest`, `#back`. Called from `main/ui/index.ts:694`. |
| `static create(options?)` / `createNestingService(options?)` | 672-688 | Factories. |

Private helpers: `deleteFolderRecursive` (226-249), `switchToNestView` (286-296), `switchToMainView` (301-311), `enableExportButton` (316-326), `disableExportButton` (331-341), `clearProgressIndicators` (346-352), `updateStopButton` (358-377), `createDisplayCallback` (384-421).

## 3. IPC contract

One channel, one direction:

| Channel | Direction | Sender (renderer) | Handler (main) | Payload | Purpose |
| --- | --- | --- | --- | --- | --- |
| `background-stop` | renderer → main | `nesting.service.ts:488, 557` | [`main.js:337-349`](../../../main.js) | (none) | Tear down all `backgroundWindows`, then re-create them. The handler **destroys** every NFP-worker BrowserWindow and re-creates the pool — this is "stop" rather than "pause": all in-flight calculations are abandoned. |

The sister channels — `background-start`, `background-progress`, `background-response`, `setPlacements` — are **not** used by this service. They are wired between `main/deepnest.js` and `main.js` directly:

- `background-start` is sent inside `DeepNest.GAlaunch` (`main/deepnest.js:1292`) once *per worker per generation*. Each payload contains `{index, sheets, sheetids, sheetsources, sheetchildren, individual, config, ids, sources, children, filenames}`. Forwarded by [`main.js:302-311`](../../../main.js) to a non-busy `backgroundWindow`.
- `background-response` is sent by each `main/background.js` worker on completion. Forwarded by [`main.js:313-326`](../../../main.js) back to the renderer where `DeepNest`'s `eventEmitter.on('background-response', ...)` (`main/deepnest.js:1097`) reduces it into `nests[]` and triggers the `displayCallback` that **this service** registered.
- `background-progress` is sent by `main/background.js` at three milestones (`background.js:264, 2307, 2480`): NFP pair generation half-progress, placement progress, and final `-1` "done." Forwarded by [`main.js:328-335`](../../../main.js) to the renderer where the progress-bar handler in [`main/ui/index.ts:514-522`](../../../main/ui/index.ts) (**not this service**) updates `#progressbar`.
- `setPlacements` is sent by `DeepNest`'s response handler (`main/deepnest.js:1098`). Stored on the main-process global `exportedPlacements` ([`main.js:370-372`](../../../main.js)) for external tools.

This service therefore stands "off to the side" of the IPC pump: it kicks off the run via `deepNest.start(...)` (which is what triggers `background-start`), and it tears the run down via `background-stop`. The progress and result IPC traffic flows through `DeepNest` directly.

## 4. Dependencies

**Imports** (`nesting.service.ts:1-15`):

- Type-only: `DeepNestInstance`, `SelectableNestingResult`, `RactiveInstance`, `NestViewData` from `../types/index.js`.
- Value: `IPC_CHANNELS` from `../types/index.js`.
- Value: `message` from `../utils/ui-helpers.js`.

**Injected at construction** (`nesting.service.ts:122-138`):

| Dependency | Production source ([`main/ui/index.ts:679-692`](../../../main/ui/index.ts)) | Why injected |
| --- | --- | --- |
| `fs` | `require("graceful-fs")` | Cache wipe. |
| `ipcRenderer` | `electron.ipcRenderer` | `send('background-stop')` only. |
| `deepNest` | `getDeepNest()` (`window.DeepNest`) | The actual nesting engine. |
| `nestRactive` | `nestViewService.getRactive()` (set after construction) | UI re-render of the results list. |
| `displayNestFn` | `nestViewService.getDisplayNestCallback()` | Renders one specific nest result. |
| `saveJsonFn` | `() => exportService.exportToJson()` | Sidecar JSON on stop. |

`nestRactive` is set *after* the constructor (line 691) because of a circular initialization issue: `NestViewService` already exists at that point and the cast happens to suppress a type conflict that the constructor signature doesn't know how to express.

**Reverse dependencies**:

| Consumer | How it uses the service |
| --- | --- |
| [`main/ui/index.ts:679-694`](../../../main/ui/index.ts) | Creates the singleton, sets `nestRactive` separately, calls `bindEventHandlers()`. |
| [`#startnest`](../../../main/index.html), [`#stopnest`](../../../main/index.html), [`#back`](../../../main/index.html) buttons | Click handlers attached by `bindEventHandlers`. |
| `main/deepnest.js:1097-1145` (`background-response` handler) | Calls the `displayCallback` *this service* registered via `deepNest.start(progressCallback, displayCallback)` (line 462). The callback (line 384-421) is what advances the UI as new generations complete. |

**Forward dependencies that aren't injected** but *are* used:

- The DOM. `document.querySelector('#main')`, `'#nest'`, `'#nestdisplay'`, `'#export_wrapper'`, `'#export'`, `'#stopnest'`, `'#startnest'`, `'#back'`, `'li.progress'` — all defined in `SELECTORS` (`nesting.service.ts:60-70`). Anyone editing `main/index.html` IDs must update this constant.

## 5. Display callback semantics (lines 384-421)

The most subtle code in this file. When a new nest result lands (via `background-response` → `DeepNest`), the callback runs:

1. Read currently selected nests: `selected = nests.filter(n => n.selected)`.
2. **Decide whether to re-focus on the latest result.** The condition (line 395-398):
   - `selected.length === 0` (nothing selected — focus the new one), **OR**
   - `nests.length > 1 && nests[1].selected` (the *previous* latest is still selected, so the user hasn't manually picked an older result — promote selection to the new latest).
3. If yes:
   - Deselect everything (lines 400-402).
   - Pick `nests[0]` (the *latest* — `DeepNest` `unshift`s new results, see `main/deepnest.js:1109`).
   - Mark it `selected = true`.
   - Call `displayNestFn(latestNest)` if available.
4. Always: `nestRactive.update("nests")` (line 416) and `enableExportButton()` (line 419).

**The user-selection-preserve rule:** If a user clicks an *older* result while nesting is still running, and a new result then lands, the new result is *not* auto-focused — the user keeps viewing what they chose. Only if they're still on what *was* the latest at the time of selection (i.e. `nests[1]` after the unshift) does the focus advance.

This is a UX-sensitive invariant. Changing the heuristic risks "the screen jumps under me" complaints from users who pause to inspect a result.

## 6. Invariants & gotchas

1. **`./nfpcache` is a *relative* path.** `NFP_CACHE_PATH = "./nfpcache"` (line 86). Resolved against `process.cwd()` of the renderer process — which depends on how Electron was launched. The same path appears in `main.js:290` (`path.join(__dirname, "./nfpcache")`) for the `before-quit` cleanup, but that's resolved against the main-process dir. **They may not be the same directory.** If a worktree's `__dirname` differs from `cwd`, the cache wipe in this service won't hit the cache the workers wrote. See TODOs §8.
2. **`deleteCache` is silent on failure.** The outer try and per-file try both swallow exceptions (lines 212-218 and 215-216). A locked or permission-denied file leaves stale NFP data in place, which can corrupt the next run's cache.
3. **`stopNesting` is asynchronous in *appearance* only.** It does its synchronous work, then schedules a 3-second `setTimeout` to flip the button to "Start nest" (lines 506-508). During those 3 seconds the button is in the `stop-disabled` state — the user *cannot* click "Start" to relaunch. This is deliberate to give workers time to drain after `background-stop` destroyed them.
4. **`goBack` does its cleanup *after a 2-second `setTimeout`*** (lines 553-591). That delay is to let the CSS transition between `#main`/`#nest` complete. If the user double-clicks "back" they'll trigger a second `goBack` whose cleanup races with the first. There is no re-entrancy guard on `goBack`.
5. **`handleStopStartToggle` reads button state via `className === 'button stop'` exact-match** (line 528). Adding any extra class (e.g. for accessibility) would silently break the toggle. The design assumes total ownership of `#stopnest`'s class name.
6. **`bindEventHandlers` adds *both* `#startnest` and `#stopnest` listeners.** `#startnest` calls `startNesting()` directly (line 651); `#stopnest` calls `handleStopStartToggle()` (line 657). The two flows can collide if `#startnest` is visible while `#stopnest` is in `start` state — but in practice they're mutually exclusive in the DOM (different views).
7. **`createDisplayCallback` captures `this` via arrow function** (line 385). If a future refactor uses `function () {...}` here, `this` will become `undefined` and the callback will fail silently (no `nests` to filter, `nestRactive.update` throws). The arrow function is load-bearing.
8. **`isStarting` and `isStopping` only guard *the same method*.** Calling `startNesting()` twice in a row is guarded; calling `startNesting()` then `stopNesting()` then `startNesting()` very quickly is *not* — the second start can land before the worker pool is fully recreated. The 1 s and 3 s `setTimeout`s in `handleStopStartToggle` (line 533, 537) are the practical mitigations.
9. **`stopNesting` calls `saveJsonFn`** (line 502) which is `exportService.exportToJson()`. That writes `<NEST_DIRECTORY>/exports.json` synchronously. If `NEST_DIRECTORY` is unset, the call is a no-op and returns false silently — the user gets no warning. See `export.service.md` §6.4.

## 7. Known TODOs / smells

No `// TODO` / `// FIXME` comments are present. Smells worth surfacing:

1. **Two `nfpcache` cleanup paths in two processes**, both with relative-path resolution. Centralising into one main-process IPC verb (e.g. `clear-nfp-cache`) would make this resilient to `cwd` differences. (See §6.1.)
2. **`background-stop` destroys *and re-creates* worker windows.** That's heavy. A "drain + reuse" semantic would shorten the stop-and-restart cycle.
3. **`setTimeout`-driven UI transitions** (lines 506-508, 537-539, 553-591) are fragile. A state-machine in `nestingService` (e.g. `xstate`) would replace the implicit "phase via wall-clock" pattern with explicit transitions.
4. **DOM-coupled** — `SELECTORS` (lines 60-70) ties the service to specific element IDs. A future component-based refactor (where `nestingService` accepts a small interface like `{ setStopButton(state), setStartButton(visible), …}`) would make it testable without a DOM.
5. **`exportToJson`-on-stop has no way to fail loudly.** A future story might want to surface "JSON sidecar failed to write" through `message(...)`.
6. **`createDisplayCallback`'s focus heuristic is implicit** — the `nests[1].selected` check (line 397) only makes sense if you know `unshift` semantics. A small comment block summarising the §5 rule would help future readers.

## 8. Extension points

- **Pause/resume** — there's no `pause-nesting` IPC; only stop+restart. Adding one would require: (a) main-process `background-pause` that suspends workers without destroying them, (b) a new method here that toggles a `paused` flag on `deepNest`, (c) UI state for the button.
- **Multiple concurrent runs** — the service is a singleton tied to `deepNest.working`. A multi-run model would need a queue/scheduler.
- **Custom result selection policy** — replace the focus heuristic in `createDisplayCallback`. Easiest seam in the file.
- **Headless mode** — strip the DOM coupling (replace querySelectors with no-op stubs); `startNesting` then runs without a UI. The current shape is close — the `bindEventHandlers` method is opt-in and the rest of the API is DOM-aware but not DOM-mandatory if `setX(null)` is tolerated. (It mostly is — the helpers no-op on missing elements.)

## 9. Test coverage status

- **No unit tests.** DI shape is testable; no fixture exists.
- **E2E exercises the start path.** `tests/index.spec.ts` clicks `#startnest`, waits for `#stopnest` to appear, clicks it. See [`docs/deep-dive/j/tests__index.spec.ts.md`](../j/tests__index.spec.ts.md). The progress-callback path is uncovered (no assertions on `#progressbar`).
- **`goBack` and `handleStopStartToggle`** are uncovered.
- **The `displayCallback` focus heuristic** (the most subtle logic) has zero tests.

A unit test of `createDisplayCallback` with various `nests[]` shapes would catch a lot — that's the highest-value test gap in this file.

## 10. Cross-references

- [`docs/deep-dive/d/main__ui__services__export.service.md`](./main__ui__services__export.service.md) §"`exportToJson`" — the `saveJsonFn` callback.
- [`docs/deep-dive/d/main__ui__services__config.service.md`](./main__ui__services__config.service.md) — `DeepNest.config(values)` snapshot path; not directly read by this service but populated before `start()` is called.
- [`docs/deep-dive/c/main__ui__index.ts.md`](../c/main__ui__index.ts.md) — composition root, the `nestRactive` post-construction wiring, and the `#progressbar` handler.
- [`docs/deep-dive/c/main__ui__types__index.ts.md`](../c/main__ui__types__index.ts.md) — `DeepNestInstance.start/.stop/.reset`, `SelectableNestingResult`, `NestViewData`.
- [`docs/deep-dive/b/main__deepnest.js.md`](../b/main__deepnest.js.md) — the engine: `start`, the `eventEmitter` IPC pump, `unshift` ordering of `nests[]`, `GAlaunch` `background-start` payload (line 1292).
- [`docs/deep-dive/b/main__background.js.md`](../b/main__background.js.md) — the worker that consumes `background-start` and emits `background-progress` / `background-response`.
- [`docs/deep-dive/a/main.js.md`](../a/main.js.md) §"Background IPC pump" — `background-start`/`-stop`/`-progress`/`-response` forwarders (lines 302-349).
- [`docs/deep-dive/e/main__ui__components__nest-view.md`](../e/main__ui__components__nest-view.md) — the Ractive view this service updates via `update("nests")`.
- [`docs/deep-dive/g/main__index.html.md`](../g/main__index.html.md) — `#startnest`, `#stopnest`, `#back`, `#nestdisplay`, `#export_wrapper`, `#export`, `li.progress` DOM elements.
