# Deep Dive — `main/ui/index.ts`

> **Group**: C (UI renderer composition) · **Issue**: DEE-14 · **Parent**: [DEE-11](../../../docs/index.md) · **Author**: Paige · **Generated**: 2026-04-25
>
> Per-file deep dive following the [DEE-11 shared template](../../../docs/index.md). Companion file: [`main__ui__types__index.ts.md`](./main__ui__types__index.ts.md).

| Field | Value |
|---|---|
| Path | [`main/ui/index.ts`](../../../main/ui/index.ts) |
| Lines (incl. blanks/comments) | 823 |
| Language / module | TypeScript (compiled to ESM under `build/ui/index.js`) |
| Loaded by | `main/index.html` `<script type="module" src="../build/ui/index.js">` |
| Layer | Tier A — visible renderer / composition root (see `architecture.md` §2) |

---

## 1. Purpose

`main/ui/index.ts` is the **composition root** of the visible renderer. It is the single seam between the legacy globals (`window.DeepNest`, `window.SvgParser`) and the modern modular UI under `main/ui/services/`, `main/ui/components/`, and `main/ui/utils/`.

It owns three concerns and nothing else:

1. **Boot orchestration** — wait for DOM, resolve Node modules, initialise services then components, register every event handler, hand off to `loadInitialFiles()`.
2. **Cross-module wiring** — every callback shared between modules (`updatePartsCallback`, `displayNestFn`, `saveJsonFn`, `attachSortCallback`, `applyZoomCallback`, `resizeCallback`) is constructed here. There is no DI container; constructor injection via plain factory functions is the convention (see `architecture.md` ADR-007 + `component-inventory.md`).
3. **Renderer-side glue logic that doesn't justify a service** — the config-form change handler, preset modal lifecycle, parts-list resize, version label, button click handlers. Anything that's "DOM event → call service" lives here.

It does **not** own:
- The IPC contract (lives in [`types/index.ts`](./main__ui__types__index.ts.md)).
- Persistence (lives in `services/config.service.ts` and `services/preset.service.ts`).
- Ractive view-data (lives in the relevant component file).

This file replaces the monolithic legacy `page.js` (header comment line 3). Treat it as load-bearing — every renderer feature touches it.

---

## 2. Public surface

### 2.1 Boot sequence

The exported behaviour is the side-effect of calling `ready(initialize)` at the bottom (line 807). Reproduced as a numbered list — each step is tied to the source line.

| # | Step | Source line | Notes |
|---|---|---|---|
| 1 | Wait for `DOMContentLoaded` | `ready(initialize)` line 807; `ready()` defined at line 96 | Calls `initialize` immediately if `document.readyState !== "loading"`. |
| 2 | `require("electron")` → `ipcRenderer` | line 767–768 | First side-effect inside `initialize()`. Only the renderer-side `ipcRenderer` is captured; `@electron/remote` is loaded on the next line. |
| 3 | Resolve `@electron/remote`, `graceful-fs`, `form-data`, `axios`, `path`, `@deepnest/svg-preprocessor` | lines 769–774 | Loaded synchronously via `require()` because `nodeIntegration: true` is enabled in the renderer (`architecture.md` ADR-004). The `svgPreProcessor` module is an out-of-tree native package (`architecture.md` §3.5). |
| 4 | `Ractive.DEBUG = false` | line 777 | Disables Ractive's runtime warnings. Ractive itself is loaded as a `<script>` in `main/index.html`, not via `require`. |
| 5 | `await initializeServices()` | line 780 → defined line 591 | Creates `configService` (async, calls `IPC_CHANNELS.READ_CONFIG`), creates `presetService`, attaches `window.config`, pushes initial config into `DeepNest`, calls `updateForm(cfgValues)` to seed the form. |
| 6 | `await loadPresetList()` | line 783 → defined line 218 | Calls `presetService.loadPresets()` → `IPC_CHANNELS.LOAD_PRESETS`. Populates `#presetSelect` `<option>`s. |
| 7 | `initializeComponents()` | line 786 → defined line 608 | Synchronous. Order: navigation → parts-view → nest-view → `(window as any).nest = nestViewService.getRactive()` → sheet-dialog → import-service → export-service → `setExportButton(#export)` → nesting-service → `setNestRactive(...)` → `nestingService.bindEventHandlers()`. |
| 8 | `initializePresetModal()` | line 789 → defined line 243 | Wires `#savePresetBtn`, `#loadPresetBtn`, `#deletePresetBtn`, `#preset-modal`, `#confirmSavePreset`, `#presetName`, the `.close` button, and an outside-click dismiss on `window`. |
| 9 | `initializeConfigForm()` | line 790 → defined line 388 | Iterates `#config input, #config select`. For each: registers `change` (config-write + DeepNest re-config + `updateForm`), `mouseover` (highlight `.config_explain`), `mouseleave` (clear highlight). Also wires `#setdefault` and appends `.spinner` `<div>` to every `#configform dd`. |
| 10 | `initializeBackgroundProgress()` | line 791 → defined line 513 | **Only direct `ipcRenderer.on()` call in this file.** Subscribes to `IPC_CHANNELS.BACKGROUND_PROGRESS` and updates the width of `#progressbar`. |
| 11 | `initializeDragDropPrevention()` | line 792 → defined line 528 | Sets `document.ondragover`, `document.ondrop`, `document.body.ondrop` to `preventDefault`. Stops accidental file drops from navigating away. |
| 12 | `initializeMessageClose()` | line 793 → defined line 541 | Wires the `#message a.close` link to clear `#messagewrapper.className`. The banner itself is rendered by `utils/ui-helpers.ts#message()`. |
| 13 | `initializePartsResize()` | line 794 → defined line 557 | Wraps `interact(".parts-drag").resizable(...)` and `window.addEventListener("resize", resize)`. Also calls `resize()` once for the initial layout. |
| 14 | `initializeVersionInfo()` | line 795 → defined line 576 | `require("../package.json")` and writes `pjson.version` into `#package-version`. Wrapped in a try/catch — failure is silent (line 583). |
| 15 | `initializeImportButton()` | line 796 → defined line 700 | Wires `#import` click → `importService.showImportDialog()`, with className-based busy-state (`button import disabled` → `button import spinner` → `button import`). |
| 16 | `initializeExportButtons()` | line 797 → defined line 725 | Wires `#exportjson`, `#exportsvg`, `#exportdxf` to `exportService.exportTo*()`. |
| 17 | `await loadInitialFiles()` | line 800 → defined line 757 | Calls `importService.loadNestDirectoryFiles()` which reads SVGs already in `global.NEST_DIRECTORY` (set by `main.js` line 138) and imports each one. |
| 18 | `window.loginWindow = null` | line 803 | OAuth flow expects this slot; the actual popup is created elsewhere. |

> **Boot-order invariant.** Steps 5 and 7 are not interchangeable — `initializeComponents()` reads `configService.getSync()` and `presetService` and so requires step 5 to have completed. Similarly, step 6 depends on `presetService` from step 5. Anything new that needs services or globals goes **after** step 5 / step 7 respectively.

### 2.2 Module exports

The named exports (lines 812–822) expose the same nine instances that are wired in `initializeComponents()`:

| Export | Type | Set in | Available after |
|---|---|---|---|
| `configService` | `ConfigService` | `initializeServices()` | Step 5 |
| `presetService` | `PresetService` | `initializeServices()` | Step 5 |
| `importService` | `ImportService` | `initializeComponents()` | Step 7 |
| `exportService` | `ExportService` | `initializeComponents()` | Step 7 |
| `nestingService` | `NestingService` | `initializeComponents()` | Step 7 |
| `navigationService` | `NavigationService` | `initializeComponents()` | Step 7 |
| `partsViewService` | `PartsViewService` | `initializeComponents()` | Step 7 |
| `nestViewService` | `NestViewService` | `initializeComponents()` | Step 7 |
| `sheetDialogService` | `SheetDialogService` | `initializeComponents()` | Step 7 |

> ⚠ **Hazard.** All nine exports start as `undefined` at module load time and are populated inside `initialize()`. Any consumer importing these from another renderer module must guard against the pre-init state, or import within an event handler that fires post-boot. There is currently **no consumer** in the repo — the exports exist for tooling/testability.

### 2.3 Internal helpers (file-private but architecturally relevant)

| Symbol | Source line | Role |
|---|---|---|
| `getDeepNest()` | 81 | Typed accessor for the `window.DeepNest` global. **Use this** instead of touching the global directly (ADR-005). |
| `getSvgParser()` | 88 | Same pattern for `window.SvgParser`. |
| `ready(fn)` | 96 | DOM-ready helper. Idempotent on `readyState !== "loading"`. |
| `resize(event?)` | 132 | Adjusts `#parts` width and per-`<th>` span widths. Used as `resizeCallback` for navigation, parts-view, sheet-dialog, import-service, and `interact.js` resize-move. |
| `updateForm(c)` | 152 | Reflects a `UIConfig` into every `#config input, #config select`. Handles unit/scale conversion (mm → divide by 25.4 in `#inputscale`; `data-conversion="true"` divides by current scale), boolean keys (`BOOLEAN_CONFIG_KEYS`), and skips `presetSelect` / `presetName`. |
| `loadPresetList()` | 218 | Repopulates `#presetSelect`. |

These helpers are **not exported** but are referenced from inside `initialize*()` functions, so any refactor that splits this file must keep them visible to those handlers.

---

## 3. IPC / global side-effects

### 3.1 IPC subscribed (renderer side)

`main/ui/index.ts` itself directly subscribes to **exactly one** IPC channel:

| Channel | Method | Source line | Handler effect |
|---|---|---|---|
| `IPC_CHANNELS.BACKGROUND_PROGRESS` (`"background-progress"`) | `ipcRenderer.on(...)` | 514 | Reads `args[0] as NestingProgress`, sets `#progressbar` width to `progress*100%`. Adds `transition: none` when `progress < 0.01` to snap back instantly on a fresh run. |

All other IPC traffic from the renderer is mediated by the services (see `architecture.md` §5). This file passes the captured `ipcRenderer` into `createConfigService(...)`, `createPresetService(...)`, and `createNestingService({ ipcRenderer })`. The services then invoke / send / on as documented in `component-inventory.md` and the [types deep dive](./main__ui__types__index.ts.md#3-ipc-channel-contract).

### 3.2 Globals written

| Global | Source line | When | Why |
|---|---|---|---|
| `window.config` | 594 | After `createConfigService()` completes (step 5) | Backwards compat with `window.config.getSync(...)` calls in legacy renderer code (`main/deepnest.js`, etc.). |
| `window.nest` | 629 | After `nestViewService` is created (step 7) | Legacy access pattern for the nest-view Ractive — still read by some exported functions. Type is `RactiveInstance<NestViewData>`. |
| `window.loginWindow` | 803 | End of `initialize()` | OAuth popup slot; populated when login flow runs. |

> All three globals are declared in `index.d.ts` (root-level `Window` augmentation) — see ADR-005. **Do not add a fourth.**

### 3.3 Globals read

- `DeepNest` (legacy global, set by `main/deepnest.js`) — read via `getDeepNest()` from `initializeServices()`, `initializeComponents()`, `initializeConfigForm()`, and the preset load/reset paths.
- `SvgParser` (legacy global, set by `main/svgparser.js`) — read via `getSvgParser()` and passed into `createExportService(...)`.
- `Ractive` (script-tag global) — `Ractive.DEBUG = false` (line 777).
- `interact` (script-tag global) — used by `initializePartsResize()` line 558.
- `require` (Node CommonJS, available because `nodeIntegration: true`) — every Node module is loaded synchronously in `initialize()`.

### 3.4 DOM contract

`main/ui/index.ts` reads/writes the following selectors. Anything that renames these in `main/index.html` will silently break boot. Cross-reference: Group G's `main/index.html` deep-dive (DEE-18).

| Selector | Used in | Direction |
|---|---|---|
| `#parts` | `resize()` line 133 | Write `style.width` |
| `#parts table th` | `resize()` line 140 | Read `offsetWidth`, write `<span>.style.width` |
| `#configform input[value=inch]` / `[value=mm]` | `updateForm()` lines 156, 158 | Write `checked` |
| `span.unit-label` | `updateForm()` line 166 | Write `innerText` |
| `#inputscale` | `updateForm()`, `initializeConfigForm()` | Read/write `value` |
| `#config input, #config select` | `updateForm()`, `initializeConfigForm()` | Read attributes (`data-config`, `data-conversion`, `id`); write `value` / `checked` |
| `#configform dd` | `initializeConfigForm()` line 502 | Append `.spinner` div |
| `#presetSelect`, `#savePresetBtn`, `#loadPresetBtn`, `#deletePresetBtn`, `#preset-modal`, `#confirmSavePreset`, `#presetName` | `initializePresetModal()` | Click + value handling |
| `#preset-modal .close` | `initializePresetModal()` line 256 | Click |
| `body.modal-open` (class) | `initializePresetModal()` | Add/remove |
| `#progressbar` | `initializeBackgroundProgress()` | Write `style` attribute |
| `#message a.close` | `initializeMessageClose()` | Click |
| `#messagewrapper` | `initializeMessageClose()` | Write `className` |
| `.parts-drag` | `initializePartsResize()` | `interact.js` resizable |
| `#package-version` | `initializeVersionInfo()` | Write `innerText` |
| `#import`, `#export` | Import/export wiring | Click + className busy state |
| `#exportjson`, `#exportsvg`, `#exportdxf` | `initializeExportButtons()` | Click |
| `#explain_<config-key>` | Config-form mouseover | Toggle `.config_explain.active` |
| `.config_explain` | Config-form mouseover/mouseleave | Reset class |
| `#setdefault` | `initializeConfigForm()` | Click |

The HTML also relies on **`data-config="<UIConfig key>"`** and **`data-conversion="true"`** attributes — those are the canonical contract between this file and `main/index.html`. See Group G for the static-surface deep dive of the HTML.

---

## 4. Dependencies

### 4.1 Inbound (who imports / triggers this file)

- **`main/index.html`** loads the compiled `build/ui/index.js` as the renderer entry script.
- No runtime importer — exports are not consumed elsewhere in the repo (verified via grep at time of writing). They exist for testability.

### 4.2 Outbound — type-only imports

From [`./types/index.js`](./main__ui__types__index.ts.md):

```
UIConfig, ConfigObject, DeepNestInstance, SvgParserInstance,
RactiveInstance, NestViewData, NestingProgress, PartsViewData
```

Plus the runtime constant `IPC_CHANNELS`.

### 4.3 Outbound — service / component imports

| Module | Imports |
|---|---|
| `./services/config.service.js` | `ConfigService`, `createConfigService`, `BOOLEAN_CONFIG_KEYS` |
| `./services/preset.service.js` | `PresetService`, `createPresetService` |
| `./services/import.service.js` | `ImportService`, `createImportService` |
| `./services/export.service.js` | `ExportService`, `createExportService` |
| `./services/nesting.service.js` | `NestingService`, `createNestingService` |
| `./components/navigation.js` | `NavigationService`, `createNavigationService` |
| `./components/parts-view.js` | `PartsViewService`, `createPartsViewService` |
| `./components/nest-view.js` | `NestViewService`, `createNestViewService` |
| `./components/sheet-dialog.js` | `SheetDialogService`, `createSheetDialogService` |
| `./utils/ui-helpers.js` | `message` |
| `./utils/dom-utils.js` | `getElement`, `getElements` |

Each of these modules has its own deep dive: Group D (services, [DEE-15](https://example/DEE-15)), Group E (components, [DEE-16](https://example/DEE-16)), Group F (utils, [DEE-17](https://example/DEE-17)).

### 4.4 Outbound — Node / Electron / vendor (resolved via `require()`)

| Module | Used as | Required for |
|---|---|---|
| `electron` | `ipcRenderer` | All renderer↔main IPC |
| `@electron/remote` | `electronRemote.dialog`, `electronRemote.getGlobal` | File dialogs, `global.NEST_DIRECTORY` access |
| `graceful-fs` | `fs` | Reading nest dir, writing exports |
| `form-data` | `FormData` | Multipart payload for converter |
| `axios` | `axios.default` | Converter HTTP round-trips |
| `path` | `extname`, `basename`, `dirname` | Filename handling |
| `@deepnest/svg-preprocessor` | `svgPreProcessor.loadSvgString` | Optional SVG cleanup pass on import |

### 4.5 Cross-callback wiring (this file is the wiring diagram)

```
                      configService ─┬─► (window.config)
                                     │
   resize() ─┬───────────────────────┘
             │
             ├─► navigationService.initialize()
             ├─► partsViewService.initialize()
             ├─► sheetDialogService.initialize()
             └─► importService.showImportDialog()

   partsViewService.update         ◄─── sheetDialogService (updatePartsCallback)
   partsViewService.attachSort     ◄─── importService (attachSortCallback)
   partsViewService.applyZoom      ◄─── importService (applyZoomCallback)
   nestViewService.getDisplayNestCallback() ──► nestingService.displayNestFn
   exportService.exportToJson      ◄─── nestingService (saveJsonFn)
   nestViewService.getRactive()    ──► (window.nest)
                                     ──► nestingService.setNestRactive(...)
```

Read this when you add a new callback edge. If a new module needs another module's behaviour, the wire goes here — **not** as a direct import in the consumer module.

---

## 5. Invariants & gotchas

1. **Service singletons**. All nine `let` bindings (lines 107–115) are module-private singletons populated in `initialize()`. There is no provision for re-init. If you ever need to swap a service at runtime (HMR, test fixture), you'll need to add reset functions explicitly.
2. **Boot order is load-bearing**. See the boot-order invariant under §2.1. Adding a step that needs `configService` before line 780 will throw a `Cannot read properties of undefined`.
3. **Unit conversion must not be doubled**. `updateForm()` divides scale by 25.4 for mm display (line 178) and `initializeConfigForm()` multiplies the inverse on change (line 411). The `data-conversion="true"` and `key === "scale"` branches each handle a different conversion — see the explicit guards. Don't fold them.
4. **User profile preservation on reset/preset-load**. Both `#setdefault` (line 478) and the preset-load handler (line 329) snapshot `access_token` + `id_token` before mutation and restore after. Any new "reset" path must do the same — losing OAuth on a config reload would log the user out silently.
5. **Spinner UX is class-based, not state-managed**. The change handler manually toggles `parentNode.className` between `"progress"` and `""` (lines 430, 442). If a future change is async, the spinner will be cleared before the IPC write resolves. Today this is fine because `setSync` is fire-and-forget into the in-memory cache; the IPC write is best-effort.
6. **`window.nest` is the Ractive instance, not a `NestingService`**. Misleading name but legacy. Don't rename without auditing `main/deepnest.js`.
7. **`Ractive.DEBUG = false`** is set globally and affects every Ractive component. Don't flip it for a one-off debug — Ractive scolds loudly.
8. **`require()` is Node CommonJS, not ESM dynamic import**. `nodeIntegration: true` makes this work; flipping that off (per ADR-004 hardening discussion) means rewriting every `require(...)` here as a preload-bridge call.
9. **`interact.js` is ambient**. The `declare const interact: ...` (line 56) only types the resizable surface used here. Other `interact.js` features (drag/drop) are not typed in this file.
10. **`#progressbar` width-snap heuristic**. `progress < 0.01` switches off CSS transition. This is intentional so the bar resets to 0 instantly when a fresh nest run starts; without it, you'd see a backwards-running animation.
11. **Drag/drop prevention is global**. Setting `document.ondragover` (line 529) overrides any handler attached later via `addEventListener`. Order matters — anything that wants to handle a drop must call `event.stopPropagation()` upstream of `document`.

---

## 6. Known TODOs

In-source: **none**. There are no `TODO`/`FIXME`/`HACK`/`XXX` markers in this file. The composition root is currently considered finished w.r.t. its own scope; outstanding items live in the services it composes.

Inherited from upstream architecture (cross-reference, not native to this file):

- `main.js` background-worker shutdown TODOs (`architecture.md` §11) — those propagate to this file via the `BACKGROUND_PROGRESS` subscription (line 514): when the bg window is destroyed mid-run, the renderer continues to receive the last frame's progress until it isn't. No action here — the fix is in the main process.

---

## 7. Extension points

Concrete places to extend without restructuring the file:

1. **Add a new service.**
   - Create `main/ui/services/foo.service.ts` with a `createFooService(deps)` factory.
   - Import in `main/ui/index.ts`, declare a `let fooService: FooService` near line 115.
   - Construct in `initializeServices()` (if it needs no DOM) or `initializeComponents()` (if it does), wired into the dependency graph alongside its peers.
   - Add to the export block at the bottom (lines 812–822).
2. **Subscribe to a new IPC channel from the renderer.**
   - Add the channel constant to `IPC_CHANNELS` in [`types/index.ts`](./main__ui__types__index.ts.md#3-ipc-channel-contract).
   - Add the matching handler in `main.js` (Group A deep dive).
   - Subscribe via `ipcRenderer.on(IPC_CHANNELS.<NAME>, ...)` either inside `initialize*()` here, or — preferred — inside the service that owns the concern. Only put it here if it has no service home (the `BACKGROUND_PROGRESS` precedent at line 514 was a UI-only side-effect).
3. **Add a new top-level UI button.**
   - Add the element + `id` to `main/index.html`.
   - Add an `initializeXyzButton()` function next to `initializeImportButton()` / `initializeExportButtons()`.
   - Call it from the bottom of `initialize()` after the existing button initialisers.
4. **Add a new config field.**
   - Add to `UIConfig` in [`types/index.ts`](./main__ui__types__index.ts.md#23-uiconfig-extends-deepnestconfig). Update `DEFAULT_CONFIG` in `services/config.service.ts`. Add to `BOOLEAN_CONFIG_KEYS` if checkbox.
   - Add the input to `main/index.html` with `data-config="<key>"` (and `data-conversion="true"` if it's a unit-scaled value).
   - `updateForm()` and `initializeConfigForm()` will pick it up automatically — no edit here is required.
5. **Provide a callback between two existing modules.**
   - Add the callback type to the affected module's options interface.
   - Wire the callback in `initializeComponents()`, calling `partsViewService.foo()` or whichever method satisfies it. Keep the wire here, not in the consumer module.

---

## 8. Test coverage status

- **Unit tests**: none. The composition root is not exercised by Jest/Vitest because no unit-test runner is configured (`architecture.md` §8).
- **E2E tests**: indirectly covered by `tests/index.spec.ts` (Playwright) — the test launches Electron, which boots `main/index.html`, which executes this file. Failures here typically surface as "config-form selectors not found" or "nest button does nothing" in the spec.
- **Coverage gap**: no fixture-level test of the boot sequence in isolation. To add one, you'd need to compile `main/ui/index.ts` into a unit-testable shape (currently the `require()` calls hard-bind it to Electron) and stub `ipcRenderer`. Out of scope for this issue.
- **Manual smoke**: every change to this file should be verified by `npm run start`, opening the Config tab, importing one of `tests/assets/*.svg`, running a single nest, and confirming progress bar + nest result render. The `#progressbar`, `#parts`, and `#nest` panels each cover one of the boot steps end-to-end.

---

## 9. Cross-references

- **Sibling deep dive**: [`main__ui__types__index.ts.md`](./main__ui__types__index.ts.md) — full `IPC_CHANNELS` contract and view-data shapes.
- **Group A** (DEE-12, in progress): `main.js` deep dive — the other side of every IPC channel referenced here.
- **Group D** (DEE-15): each `services/*.service.ts` deep dive — what `createXService(...)` actually constructs.
- **Group E** (DEE-16): each `components/*.ts` deep dive — what `initializeComponents()` mounts.
- **Group F** (DEE-17): `utils/{dom-utils,ui-helpers,conversion}.ts` deep dives.
- **Architecture context**: `docs/architecture.md` §3.2 (renderer tree), §5 (IPC contract), ADR-005 (window globals), ADR-007 (TS scope).
- **Component inventory**: `docs/component-inventory.md` "Composition root" section — lighter overview of the same file.
