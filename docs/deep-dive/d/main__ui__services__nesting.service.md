# `main/ui/services/nesting.service.ts` — NestingService

The renderer-side **bridge between the UI and the GA / NFP background process**.
Owns the nesting lifecycle (start, stop, back-out), the cache reset between
runs, the view-switching DOM flips, and the binding to the start/stop/back
buttons. Does **not** itself send `background-start` or receive
`background-progress` directly — it delegates to `DeepNest.start(progressCb,
displayCb)` (which emits `background-start`) and is bound from `index.ts` to
`background-progress` for progress-bar updates.

- File: [`main/ui/services/nesting.service.ts`](../../../main/ui/services/nesting.service.ts)
- Public API: `NestingService` class + `createNestingService()` factory.

## Role in the architecture

```
+----------------------------+
| #startnest / #stopnest /   |
| #back / handleStopStart    |
| Toggle()                   |
+--------+-------------------+
         |
         v
+----------------------------+      DeepNest.start(progressCb, displayCb)
| NestingService             |  ----------------------------------------+
|  startNesting()            |                                          |
|  stopNesting()             |                                          v
|  goBack()                  |                            +-----------------------------+
|  selectNest()              |                            | main/deepnest.js GA loop    |
|  bindEventHandlers()       |                            |  this.eventEmitter.send(    |
+--------+-------------------+                            |    "background-start", {…}) |
         |                                                |  on "background-response"   |
         | display callback (createDisplayCallback)       |    -> setPlacements         |
         v                                                +--------------+--------------+
   nestRactive.update("nests"); displayNestFn(latest);                   |
   enableExportButton();                                                 |
                                                                         v
                               +------------------------------------------+
                               | main.js ipcMain.on("background-start")   |
                               | -> backgroundWindows[i].webContents.send |
                               |    ("background-start", payload)         |
                               +-------+----------+-----------------------+
                                       |          |
                                       v          v
                          background.js         background.js sends
                          ipcRenderer.on        "background-response" {placement}
                          ("background-start")  and "background-progress" {index, progress}
```

## Public API surface

| Member | Purpose |
| --- | --- |
| `constructor(options?)` | DI: `fs`, `ipcRenderer`, `deepNest`, `nestRactive`, `displayNestFn`, `saveJsonFn`. |
| `set*` setters | Composition-root injection (`setNestRactive` is wired separately to dodge a TS variance issue). |
| `deleteCache()` | Recursively wipes `./nfpcache`. Tolerant of missing files / unreadable entries. Called on start, on back, and after stop's `goBack` follow-up. |
| `hasSheet()` / `hasParts()` / `isWorking()` | Pre-flight checks. |
| `startNesting(progressCallback?)` | Validates parts + sheet, switches to nest view, wipes cache, calls `DeepNest.start(progressCallback, displayCallback)`. Re-entry guarded by `isStarting`. |
| `stopNesting()` | Sends `IPC_CHANNELS.BACKGROUND_STOP`, calls `DeepNest.stop()`, clears progress UI, runs `saveJsonFn` (`exportToJson` snapshot), schedules a 3 s button reset. Re-entry guarded by `isStopping`. |
| `handleStopStartToggle()` | Reads `#stopnest` className and toggles between `stop` ↔ `start` (or no-op if `disabled`). |
| `goBack()` | Switches to main view, then after 2 s: stop background + reset DeepNest + delete cache + clear nest display. |
| `getNests()` / `getSelectedNest()` / `selectNest(nest)` | Selection helpers used by the nest view. |
| `bindEventHandlers()` | Wires `#startnest`, `#stopnest`, `#back` in one place. |

## IPC channels

The service references three channel constants from
[`main/ui/types/index.ts`](../../../main/ui/types/index.ts):

| Channel | Direction | Owner | Notes |
| --- | --- | --- | --- |
| `BACKGROUND_STOP` (`"background-stop"`) | renderer → main (`ipcRenderer.send`) | This service (`stopNesting`, `goBack`) | Causes `main.js` ([`:337-347`](../../../main.js)) to `destroy()` every background window so the next start gets a fresh worker. |
| `BACKGROUND_START` (`"background-start"`) | renderer → main → background renderer | **Sent by `main/deepnest.js` `start()`** ([`:1292-1305`](../../../main/deepnest.js)), not by this service. The service triggers it indirectly via `DeepNest.start(...)`. |
| `BACKGROUND_PROGRESS` (`"background-progress"`) | background → main → renderer | Bound in `main/ui/index.ts` `initializeBackgroundProgress()` ([`:513-523`](../../../main/ui/index.ts)) — updates `#progressbar` width. The service exposes a `ProgressCallback` type (`{ index, progress }`) but nothing currently passes one through `startNesting()`. |

Other GA-loop channels owned outside this service:

| Channel | Direction | Where |
| --- | --- | --- |
| `BACKGROUND_RESPONSE` (`"background-response"`) | background → main → renderer (`DeepNest.eventEmitter`) | [`main/deepnest.js:1097`](../../../main/deepnest.js) — receives a single placement, then re-emits `"setPlacements"`. |
| `SET_PLACEMENTS` (`"setPlacements"`) | renderer → main | [`main.js:370-372`](../../../main.js) — main stores `global.exportedPlacements`. |

### `background-start` payload

Built and sent by `DeepNest.prototype.start` (not here), shape from
[`main/deepnest.js:1292-1305`](../../../main/deepnest.js):

```ts
{
  index: number,
  sheets: Polygon[],
  sheetids: number[],
  sheetsources: number[],
  sheetchildren: Polygon[][],
  individual: GAIndividual,    // {placement, rotation, fitness}
  config: DeepNestConfig,
  ids: number[],
  sources: number[],
  children: Polygon[][],
  filenames: string[],
}
```

The renderer-side type for the algorithm config is `DeepNestConfig` in
[`index.d.ts`](../../../index.d.ts), surfaced as `UIConfig` in the renderer.

### `background-progress` payload

```ts
{ index: number; progress: number }
```

`progress` is in `[0, 1]`; the value `-1` signals "finished" — see
[`main/background.js:2480`](../../../main/background.js).

## Data shapes

### Display callback

`createDisplayCallback()` returns a closure (`() => void`) that:

1. Filters `deepNest.nests` for currently-selected results.
2. If none selected, **or** the second-most-recent (`nests[1]`) is selected,
   it deselects all and selects `nests[0]` (the freshly-arrived result).
   This deliberately preserves the user's manual selection when they're
   inspecting an older result.
3. Calls the injected `displayNestFn(latestNest)` (provided by
   [`NestViewService`](../../../main/ui/components/nest-view.ts) via
   `getDisplayNestCallback()`).
4. `nestRactive.update("nests")` and `enableExportButton()`.

### `displayNestFn` and `saveJsonFn`

- `displayNestFn = nestViewService.getDisplayNestCallback()`
  ([`index.ts:684`](../../../main/ui/index.ts)).
- `saveJsonFn = () => exportService.exportToJson()`
  ([`index.ts:685`](../../../main/ui/index.ts)). Triggered on `stopNesting`
  to persist `exports.json` into `NEST_DIRECTORY`.

## DOM contract

Selectors (`SELECTORS` constant):

| Selector | Used in |
| --- | --- |
| `#main` | `switchToMainView`, `switchToNestView` |
| `#nest` | `switchToMainView`, `switchToNestView` |
| `#nestdisplay` | `goBack` (cleared on exit) |
| `#export_wrapper`, `#export` | `enableExportButton`, `disableExportButton` |
| `#stopnest` | `stopNesting`, `handleStopStartToggle`, `updateStopButton` |
| `#startnest` | `bindEventHandlers` |
| `#back` | `bindEventHandlers` |
| `li.progress` | `clearProgressIndicators` |

Button classes (`BUTTON_CLASSES`): `button stop`, `button stop disabled`,
`button start`, `button export`, `button export disabled`.

## Cache lifecycle

`./nfpcache` is the on-disk No-Fit-Polygon cache used by the GA worker.

- `deleteCache()` is called on every `startNesting` (clean run) and on
  `goBack()` (clean state on exit).
- The path is **renderer-relative** (`./nfpcache`) because the renderer is
  spawned in the project directory in dev. In packaged builds the cwd may
  differ — see related discussion in `CHANGELOG.md`.
- Tolerant `try / catch` per file means a partial wipe is acceptable; the
  worker overwrites entries it needs.

## Used by

Composition root [`main/ui/index.ts`](../../../main/ui/index.ts):

| Hook | Wiring |
| --- | --- |
| `initializeComponents()` (`:679-694`) | `createNestingService(...)`, `setNestRactive(nestViewService.getRactive())`, `bindEventHandlers()`. |
| `initializeBackgroundProgress()` (`:513-523`) | Subscribes to `IPC_CHANNELS.BACKGROUND_PROGRESS` directly; updates `#progressbar`. **Does not currently route through `nestingService.startNesting(progressCallback)`** — the `ProgressCallback` parameter is reserved but unused. |

The service is **the only consumer** of these globals/buttons. `partsViewService`,
`nestViewService`, and `sheetDialogService` do not interact with it directly;
they read from `DeepNest.parts` / `DeepNest.nests` and coordinate via the
shared `DeepNest` global plus the display callback.

## Security and architecture smells

> The issue calls out: "Note any service that does work in the renderer that
> should arguably live in main (security smell — `nodeIntegration: true`)."

1. **Direct `fs.existsSync`/`readdirSync`/`unlinkSync`/`rmdirSync` use** in the
   renderer to wipe `./nfpcache`. The destination is hardcoded and contained,
   but the same Node access that makes this work is also a renderer attack
   surface ([`main.js:100-103`](../../../main.js)). Cache management could
   reasonably live in main.
2. **`./nfpcache` is cwd-relative** — packaging changes can move this. A
   future refactor should resolve via `app.getPath("userData")` or similar.
3. **Two timers (`setTimeout`) drive button-state transitions** (3 s reset
   after stop, 2 s settle on goBack, 1 s before start kicks off in the
   toggle). These are UX comfort delays but they do nothing to coordinate
   with the actual background worker shutdown. Race conditions are tolerated
   because `BACKGROUND_STOP` causes main to `destroy()` the windows.
4. **`#stopnest` className is a state machine source.** `handleStopStartToggle`
   reads `stopButton.className` to decide whether to start or stop. If a
   third party (CSS animation, user script) toggles classes, the state
   machine can desync. Storing the state in the service would be safer.
5. **Re-entry guards (`isStarting`, `isStopping`)** are flags toggled inside
   try/finally. They prevent double-clicks but not concurrent calls from
   different code paths (e.g. progress callback re-entering). Currently
   nothing exercises that path.
6. **No timeout / abort** on the background process. If the worker hangs,
   `DeepNest.stop()` plus `BACKGROUND_STOP` is the only escape. The 3 s
   button-reset delay assumes the worker shuts down within that window.
7. **`createDisplayCallback` is recreated on every `startNesting`.** Cheap, but
   means listener identity changes — fine here because `DeepNest.start`
   takes the callback by value.

## Test surface

- DI'd; mock `fs`, `ipcRenderer`, `deepNest`, `nestRactive`, plus
  `displayNestFn` and `saveJsonFn`.
- High-value cases: pre-flight rejections (no parts, no sheet, double-start),
  display-callback selection logic (preserve manual selection), button-state
  transitions in `stopNesting` and `goBack`, cache delete tolerance to
  missing dir / unreadable entries.

## References

- [`main/ui/services/nesting.service.ts`](../../../main/ui/services/nesting.service.ts)
- [`main/ui/types/index.ts`](../../../main/ui/types/index.ts) —
  `IPC_CHANNELS`, `NestViewData`, `SelectableNestingResult`, `NestingProgress`
- [`main/deepnest.js`](../../../main/deepnest.js) — emits `background-start`,
  receives `background-response` in the GA loop
- [`main/background.js`](../../../main/background.js) — receives
  `background-start`, emits `background-progress` and `background-response`
- [`main.js`](../../../main.js) — `background-*` IPC routing,
  `background-stop` window destroy
- [`main/ui/index.ts`](../../../main/ui/index.ts) —
  `initializeBackgroundProgress` (subscribes to `BACKGROUND_PROGRESS`),
  `nestingService.saveJsonFn` wiring
- Sister docs: [`config`](./main__ui__services__config.service.md),
  [`preset`](./main__ui__services__preset.service.md),
  [`import`](./main__ui__services__import.service.md),
  [`export`](./main__ui__services__export.service.md)
