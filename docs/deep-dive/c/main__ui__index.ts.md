# `main/ui/index.ts` — Deep Dive

**Generated:** 2026-04-26 by Paige (Tech Writer) for [DEE-35](/DEE/issues/DEE-35) (parent: [DEE-11](/DEE/issues/DEE-11)).
**Group:** C — UI renderer composition.
**File:** `main/ui/index.ts` (822 LOC, single file).
**Mode:** Exhaustive deep-dive. The companion file is [`main__ui__types__index.ts.md`](./main__ui__types__index.ts.md).

## 1. Purpose

The composition root of the visible Electron renderer. This file replaces the legacy monolithic `page.js` (per the doc-block at lines 1-5) and orchestrates initialization of every service, every component, every IPC subscription, and every DOM event binding.

It is loaded by the inline `<script type="module">` block in `main/index.html` (`import * as ui from "../build/ui/index.js"` — see [`docs/deep-dive/g/main__index.html.md`](../g/main__index.html.md) §2). Once the module evaluates, it registers a single `DOMContentLoaded` callback (`ready(initialize)`, line 807) and exposes nine service singletons via `export {…}` (lines 812-822) for external consumers. Every other piece of UI behavior — preset modal, config form, drag-drop suppression, parts resizing, version display, import/export buttons, background-progress bar — flows from `initialize()`.

> **Document this file before refactoring any UI service.** It is the only place where every service constructor is called and every cross-service callback is wired (`updatePartsCallback`, `displayNestFn`, `saveJsonFn`, `attachSortCallback`, `applyZoomCallback`, `resizeCallback`). Renaming a public method on any service will silently break composition here unless you update the relevant `createXxxService(…)` call site listed in §4.2.

## 2. Public surface

### 2.1 Module exports

The module re-exports nine service singletons (lines 812-822). They are populated by `initialize()` after the DOM is ready, so any consumer that imports them must wait until `DOMContentLoaded` itself has fired or face `undefined` references.

| Export | Type | Populated by | Lifetime |
|---|---|---|---|
| `configService` | `ConfigService` | `await createConfigService(ipcRenderer)` (line 593) | App lifetime; also published as `window.config` (line 594) |
| `presetService` | `PresetService` | `createPresetService(ipcRenderer)` (line 597) | App lifetime |
| `importService` | `ImportService` | `createImportService({…})` (line 642) | App lifetime |
| `exportService` | `ExportService` | `createExportService({…})` (line 659) | App lifetime |
| `nestingService` | `NestingService` | `createNestingService({…})` (line 679) | App lifetime |
| `navigationService` | `NavigationService` | `createNavigationService({resizeCallback})` (line 610) | App lifetime |
| `partsViewService` | `PartsViewService` | `createPartsViewService({…})` (line 614) | App lifetime |
| `nestViewService` | `NestViewService` | `createNestViewService({…})` (line 622) | App lifetime; Ractive instance also published as `window.nest` (line 629) |
| `sheetDialogService` | `SheetDialogService` | `createSheetDialogService({…})` (line 632) | App lifetime |

Three additional `window.*` globals are written by this module:

| Global | Source | Line | Why it exists |
|---|---|---|---|
| `window.config` | `configService` cast as `ConfigObject` | 594 | Backward-compat with the legacy `electron-settings` API consumed by `deepnest.js`. |
| `window.nest` | `nestViewService.getRactive()` | 629 | Backward-compat for the legacy view code that reads `nest.update(…)`. |
| `window.loginWindow` | `null` | 803 | Slot reserved for the cloud-login popup; populated elsewhere. |

These three are written via the same triple-keyed cast `(window as unknown as { config: unknown; nest: unknown; loginWindow: unknown })` (lines 594, 629, 803) — see §5.10 for the gotcha.

### 2.2 Boot sequence (`initialize()` at lines 765-804)

The numbered list below maps each step of `initialize()` to its source line. **This is the canonical entry-point map** — all other functions in the file are helpers invoked from one of these steps.

1. **Load Electron + Node module references** (lines 766-774). `require()`-loads `electron`, `@electron/remote`, `graceful-fs`, `form-data`, `axios`, `path`, `@deepnest/svg-preprocessor`. These are stored in module-scope `let` bindings declared at lines 120-126. Relies on `nodeIntegration: true` and `enableRemoteModule: true` set by `main.js:100-105` (see [`docs/deep-dive/a/main.js.md`](../a/main.js.md) §3.2).
2. **Disable Ractive debug** (line 777, `Ractive.DEBUG = false`). Suppresses the Ractive 0.8.1 console diagnostics; the `Ractive` global is provided by the vendored `util/ractive.js` loaded earlier in `main/index.html`.
3. **Initialize services** (line 780, `await initializeServices()`). Detail at §4.1.
4. **Load preset list** (line 783, `await loadPresetList()`). Populates `<select id="presetSelect">` from the preset file via IPC `load-presets`.
5. **Initialize components** (line 786, `initializeComponents()`). Detail at §4.2.
6. **Initialize handlers** (lines 789-797). Nine specialised binders, called in this strict order (the order matters for `initializePartsResize()`, see §5.3 below):
    1. `initializePresetModal()` (line 789)
    2. `initializeConfigForm()` (line 790)
    3. `initializeBackgroundProgress()` (line 791)
    4. `initializeDragDropPrevention()` (line 792)
    5. `initializeMessageClose()` (line 793)
    6. `initializePartsResize()` (line 794)
    7. `initializeVersionInfo()` (line 795)
    8. `initializeImportButton()` (line 796)
    9. `initializeExportButtons()` (line 797)
7. **Load initial files** (line 800, `await loadInitialFiles()`). Delegates to `importService.loadNestDirectoryFiles()` so the nest scratch directory is reflected in the parts list at startup.
8. **Reserve `window.loginWindow`** (line 803). Sets it to `null` so subsequent feature code can do `if (window.loginWindow) {…}` safely.

The DOM-ready guard is `ready()` at lines 96-102 — synchronous if `document.readyState !== "loading"`, otherwise `addEventListener("DOMContentLoaded", fn)`. `initialize` returns a Promise, but `ready()` does not await it; an unhandled rejection inside `initialize` propagates as an `unhandledrejection` event on the renderer.

### 2.3 Helper functions in module scope

| Function | Lines | Role |
|---|---|---|
| `getDeepNest()` | 81-83 | Returns the `window.DeepNest` global cast to `DeepNestInstance`. The legacy `deepnest.js` installs the global at parse time. |
| `getSvgParser()` | 88-90 | Returns the `window.SvgParser` global cast to `SvgParserInstance`. Same legacy pattern. |
| `ready(fn)` | 96-102 | DOM-ready shim. |
| `resize(event?)` | 132-146 | Header-width sync between `<table>` cells and their inner `<span>`. Used by both the `interact()` resize handler and the `window.resize` listener. |
| `updateForm(c)` | 152-213 | Writes a `UIConfig` value object back into the DOM (radio, scale, all `data-config` inputs). Mirrors `initializeConfigForm()`'s read direction. |

`updateForm()` and `initializeConfigForm()` are mirror images:

- `updateForm` reads `data-config="<key>"` from each input (line 193), then writes `c[key]` into `inputElement.value` or `.checked` (lines 204-211).
- `initializeConfigForm` (lines 388-508) attaches `change` listeners that read `inputElement.value`/`.checked`, decide whether to multiply by the scale, and call `configService.setSync(key, val)` (line 435).

The two functions form a closed loop: every `change` event ends with `updateForm(cfgValues)` (line 438) so the DOM stays internally consistent if the service mutated additional keys.

## 3. IPC / global side-effects

This file performs **one** IPC subscription directly. All other IPC happens through service objects:

### 3.1 Direct IPC subscription

| Channel | Direction | Handler | Source line |
|---|---|---|---|
| `IPC_CHANNELS.BACKGROUND_PROGRESS` (`"background-progress"`) | main → renderer | `initializeBackgroundProgress()` lines 514-522. Reads `args[0]` as `NestingProgress`, writes `width: <progress*100>%` into `#progressbar`. Below 1% it disables the CSS transition to avoid a "rubber-band" snap. | 514 |

The progress callback is the only place where the file pulls a payload from `main` directly. Every other IPC channel is owned by a service:

- `read-config`, `write-config` → `ConfigService` (`main/ui/services/config.service.ts`).
- `load-presets`, `save-preset`, `delete-preset` → `PresetService` (`main/ui/services/preset.service.ts`).
- `background-start`, `background-stop`, `background-response` → `NestingService` + the legacy `deepnest.js` event emitter.

See [`main__ui__types__index.ts.md`](./main__ui__types__index.ts.md) §3 for the full IPC contract.

### 3.2 DOM side-effects (one-shot, registered once at boot)

| Side-effect | Function | Lines | Element(s) touched |
|---|---|---|---|
| Drag-drop suppression on document and body | `initializeDragDropPrevention()` | 528-536 | `document.ondragover`, `document.ondrop`, `document.body.ondrop` |
| Message close button | `initializeMessageClose()` | 541-552 | `#message a.close`, `#messagewrapper` |
| Parts table resize | `initializePartsResize()` | 557-571 | `interact(".parts-drag")`, `window.resize` listener |
| Version label | `initializeVersionInfo()` | 576-586 | `#package-version` (innerText). Reads `package.json` via Node `require`. |
| Import button | `initializeImportButton()` | 700-720 | `#import` `onclick` |
| Export buttons | `initializeExportButtons()` | 725-752 | `#exportjson`, `#exportsvg`, `#exportdxf` `onclick` (DXF is async) |
| Spinner injection | `initializeConfigForm()` tail | 502-507 | Appends a `<div class="spinner">` to every `#configform dd` so `change` handlers can flip `parentNode.className = "progress"`/`""` (lines 431, 442). |

### 3.3 `window.*` mutations

Lines 594, 629, 803. See §2.1.

## 4. Dependencies

### 4.1 Service initialization graph (`initializeServices()` lines 591-603)

```
createConfigService(ipcRenderer)  ── async, awaits read-config IPC
        │
        ├── window.config = configService       (line 594)
        │
createPresetService(ipcRenderer)                (line 597)
        │
        ▼
configService.getSync()  ──►  DeepNest.config(cfg)  ──►  updateForm(cfg)
                                  (line 601)              (line 602)
```

Only `ConfigService` is async at construction time — it awaits the `read-config` IPC round-trip before it can serve `getSync()`. Every other service is constructed synchronously.

### 4.2 Component initialization graph (`initializeComponents()` lines 608-695)

The order matters because services hand each other Ractive instances and callbacks. Reordering will break references that are still `undefined`.

```
1. NavigationService    (610-611)   ── { resizeCallback }
2. PartsViewService     (614-619)   ── { deepNest, config, resizeCallback }
3. NestViewService      (622-626)   ── { deepNest, config }
4.   window.nest = nestViewService.getRactive()      (629)
5. SheetDialogService   (632-639)   ── { deepNest, config,
                                          updatePartsCallback: () => partsViewService.update(),
                                          resizeCallback }
6. ImportService        (642-656)   ── needs partsViewService.getRactive(),
                                       attachSortCallback, applyZoomCallback
7. ExportService        (659-669)   ── needs svgParser, then setExportButton(#export) (672-676)
8. NestingService       (679-686)   ── needs nestViewService.getDisplayNestCallback()
                                       and exportService.exportToJson
9.   nestingService.setNestRactive(nestViewService.getRactive())   (689-692)
10.  nestingService.bindEventHandlers()                            (694)
```

Key cross-service callbacks (any of which would be `undefined` if the order were wrong):

| Site | Provides | Consumed by |
|---|---|---|
| `partsViewService.update` | DOM refresh of parts table | `SheetDialogService` `updatePartsCallback` (line 636) |
| `partsViewService.attachSort` | Re-bind sortable headers | `ImportService` `attachSortCallback` (line 653) |
| `partsViewService.applyZoom` | Reset SVG pan-zoom | `ImportService` `applyZoomCallback` (line 654) |
| `nestViewService.getDisplayNestCallback()` | Push a placement to the nest view | `NestingService` `displayNestFn` (line 684) |
| `nestViewService.getRactive()` | Ractive view-model for nest results | `NestingService.setNestRactive` (line 691) |
| `exportService.exportToJson` | Serialize nest snapshot | `NestingService` `saveJsonFn` (line 685) |
| `svgPreProcessor` | SVG cleanup pre-import | `ImportService` (line 649) |
| `svgParser` (`getSvgParser()`) | Polygon flatten/merge | `ExportService` (line 667) |

### 4.3 Required globals at boot

These globals must already exist on `window` when `initialize()` runs. They are installed by the synchronous `<script>` tags in `main/index.html` that precede the `<script type="module">` block (see [`docs/deep-dive/g/main__index.html.md`](../g/main__index.html.md) §2):

| Global | Provider | Used at |
|---|---|---|
| `Ractive` | `util/ractive.js` | line 777 (`Ractive.DEBUG = false`) |
| `interact` | `util/interact.js` | line 558 (parts-table resize) |
| `DeepNest` | `main/deepnest.js` (constructed inline in `index.html`) | `getDeepNest()` everywhere |
| `SvgParser` | `main/svgparser.js` (`window.SvgParser = SvgParser`) | `getSvgParser()` (export service init) |

The `declare const Ractive` / `declare const interact` / `declare let DeepNest` / `declare let SvgParser` blocks at lines 55-76 are typescript-only shims; they do not generate runtime code.

### 4.4 Imports from `./types/index.js`

| Import | Source line | Use site |
|---|---|---|
| `UIConfig` (type) | 9 | `c[key]` indexing in `updateForm` (line 202); `keyof UIConfig` cast in `initializeConfigForm` (line 402) |
| `ConfigObject` (type) | 10 | `window.config = configService as unknown as ConfigObject` (line 594) and the per-service casts of `configService` |
| `DeepNestInstance` (type) | 11 | `getDeepNest()` return type (line 81) |
| `SvgParserInstance` (type) | 12 | `getSvgParser()` return type (line 88) |
| `RactiveInstance` (type) | 13 | Casts at lines 652 (`partsViewService.getRactive() as unknown as RactiveInstance<PartsViewData>`) and 691 (`as unknown as RactiveInstance<NestViewData>`) |
| `NestViewData`, `NestingProgress`, `PartsViewData` | 14-16 | Generic parameters for the casts above; `NestingProgress` is the typed view of the IPC payload at line 515 |
| `IPC_CHANNELS` (value) | 18 | `ipcRenderer.on(IPC_CHANNELS.BACKGROUND_PROGRESS, …)` (line 514) |

### 4.5 Imports from siblings

| Import | From | Use |
|---|---|---|
| `ConfigService`, `createConfigService`, `BOOLEAN_CONFIG_KEYS` | `./services/config.service.js` | `initializeServices`, `BOOLEAN_CONFIG_KEYS.includes(key)` (lines 207, 416) |
| `PresetService`, `createPresetService` | `./services/preset.service.js` | `loadPresetList`, `initializePresetModal` |
| `ImportService`, `createImportService` | `./services/import.service.js` | `initializeComponents`, `initializeImportButton`, `loadInitialFiles` |
| `ExportService`, `createExportService` | `./services/export.service.js` | `initializeComponents`, `initializeExportButtons` |
| `NestingService`, `createNestingService` | `./services/nesting.service.js` | `initializeComponents` |
| `NavigationService`, `createNavigationService` | `./components/navigation.js` | `initializeComponents` |
| `PartsViewService`, `createPartsViewService` | `./components/parts-view.js` | `initializeComponents`; `partsViewService.updateUnits()` on `units` change (line 447) |
| `NestViewService`, `createNestViewService` | `./components/nest-view.js` | `initializeComponents`; supplies the global `window.nest` |
| `SheetDialogService`, `createSheetDialogService` | `./components/sheet-dialog.js` | `initializeComponents` |
| `message` | `./utils/ui-helpers.js` | All preset modal user-feedback toasts |
| `getElement`, `getElements` | `./utils/dom-utils.js` | All DOM lookups |

## 5. Invariants & gotchas

> Each invariant below is paired with the source line that codifies it. Violating any of them silently breaks user-visible behavior — there are no runtime asserts.

### 5.1 Internal store is **inches**; mm display is computed at the boundary

- The scale config is stored in **inches** regardless of the UI unit selection.
- Read direction (`updateForm`, lines 174-180): if `c.units === "mm"` divide `c.scale` by `25.4` for display.
- Write direction (`initializeConfigForm`, lines 409-413): if current units are `mm`, multiply the new scale by `25.4` before `configService.setSync`.
- **Do not fold this branch** into the generic `data-conversion` branch (lines 421-427). The two are deliberately separate because `scale` itself is the input to the conversion formula and would self-reference.

### 5.2 `data-conversion` comparator is `=== "true"`

- `inputElement.getAttribute("data-conversion") === "true"` (lines 204, 421).
- Adding `data-conversion="false"` to the HTML decoratively will **not** disable conversion — it will be treated as falsy. There is no `false` branch.

### 5.3 Initial `resize()` runs after `initializePartsResize()` only

`initializePartsResize()` (lines 557-571) calls `resize()` once at the end (line 570). It must run **after** `partsViewService.initialize()` has populated `#parts table th` (handled by `initializeComponents()`, step 5 of `initialize()`) — otherwise `getElements<HTMLTableCellElement>("#parts table th")` returns an empty list and header widths stay zero. Reordering the binder calls in §2.2 step 6 will break this.

### 5.4 Unit display side-effect on every form change

When a `change` event fires on a `data-config="units"` input, `partsViewService.updateUnits()` is called (line 447) to refresh Ractive bindings that show "in" / "mm" labels. If you add another consumer of unit changes, it must hook here — there is no central pub/sub for unit changes.

### 5.5 User profile is preserved across preset/reset operations

Two paths must save/restore `access_token` and `id_token` around bulk config writes:

- **Preset load** (`initializePresetModal`, lines 330-342) — read both, set the preset, restore both.
- **Reset to defaults** (`initializeConfigForm`, lines 480-491) — same dance around `configService.resetToDefaultsSync()`.

Forgetting either restore step logs the user out silently. There is no test asserting this; the only protection is the inline pattern.

### 5.6 Boolean keys are typed `boolean`, not `"true"`/`"false"`

`BOOLEAN_CONFIG_KEYS.includes(key)` at lines 207, 416 is the only switch that distinguishes checkboxes from text inputs. Adding a new boolean config key requires:

1. Adding the key to the `UIConfig` interface in `main/ui/types/index.ts`.
2. Adding it to `BOOLEAN_CONFIG_KEYS` in `main/ui/services/config.service.ts`.
3. Adding the `<input type="checkbox" data-config="<key>">` to `main/index.html`.

Skipping step 2 will store the literal string `"true"` / `"false"` in the config, breaking every consumer that branches on `if (config.<key>)`.

### 5.7 Preset and config form share the same input set

Both `updateForm` (line 183) and `initializeConfigForm` (line 389) iterate `document.querySelectorAll("#config input, #config select")` and skip ids `presetSelect` / `presetName` (lines 189-191, 396-398). If you add another non-config input under `#config`, you must extend the skip list in **both** places — they don't share a constant.

### 5.8 Async unawaited from `ready()`

`ready(initialize)` (line 807) hands `initialize` (which returns `Promise<void>`) to `addEventListener` or invokes it synchronously without awaiting. Unhandled rejections become `unhandledrejection` events on the renderer. There is no central error toast for boot failures — consult the dev console.

### 5.9 Module exports are `let`-bound and populated post-DOMContentLoaded

`configService`, `presetService`, … (lines 107-115) are declared with `let` at module scope and assigned only inside `initialize()`. ES modules export live bindings, so external consumers see them transition from `undefined` → service instance. Don't read them at module top level.

### 5.10 The triple-keyed `window` cast is identical at every call site

```ts
(window as unknown as { config: unknown; nest: unknown; loginWindow: unknown })
```

Used at lines 594, 629, 803. Do not narrow the cast at one call site — TypeScript will infer the property writes as different types and the union will silently drift.

### 5.11 `getElement<T>(…)` returns `T | null`

Every call site checks for null (e.g. `if (parts) {…}` at line 135). `getElement` is the typed wrapper around `document.getElementById`/`querySelector`; do not chain `!` on its return without a null guard.

## 6. Known TODOs

The file has zero `// TODO` / `// FIXME` comments. Every doc-comment block is a normal JSDoc explainer, not a deferred task marker.

Implicit / un-annotated TODOs surfaced during the deep-dive:

- **No central error UI for boot failures.** A rejection from `initialize()` is silent (see §5.8). Acceptable today because the legacy `deepnest.js` already installs a global `window.onerror` handler, but a typed boot-failure toast would be cleaner.
- **`require("../package.json")` swallows errors silently** (`initializeVersionInfo`, lines 583-585). The `// Ignore if package.json is not accessible` comment is a deliberate-but-unverified path; the version label simply stays empty.
- **`window.config` is exposed as `ConfigObject`** for the legacy `deepnest.js` consumer. Removing this requires migrating `deepnest.js` off the global to direct service injection.
- **`alert(…)` for the empty preset-name case** (line 296). Every other user-feedback path uses `message(…)`; this one diverges and is the only blocking modal in the file.

## 7. Extension points

| To add… | Touch |
|---|---|
| A new service | Import its `Service` class + `createXxxService` factory at the top, declare a module-level `let xxxService: XxxService;`, instantiate inside `initializeComponents` (or `initializeServices` if it depends only on IPC), then add to the `export {…}` block. Wire its callbacks against existing services in the same `initializeComponents` block. |
| A new IPC subscription that lives in the entry point (rather than a service) | Add a binder named `initializeXxx()` that registers `ipcRenderer.on(IPC_CHANNELS.NEW_CHANNEL, …)`. Call it from `initialize()` after `initializeBackgroundProgress()`. **Add the channel name to `IPC_CHANNELS` in `types/index.ts` first.** Then add the corresponding `ipcMain.on`/`handle` in `main.js`. |
| A new config field with no conversion | Add to `UIConfig` (`types/index.ts`); add the default in `config.service.ts`; add `<input data-config="<key>">` to `main/index.html`. Boolean? Also add to `BOOLEAN_CONFIG_KEYS`. |
| A new config field with length conversion | Same as above plus `data-conversion="true"` on the HTML element. The math is shared — no code change in `index.ts`. |
| A new top-level button (like Import/Export) | Add an `initializeXxxButton()` binder following the `initializeImportButton()` shape; call from the binder list in step 6 of `initialize()`. |
| A new per-input UI side-effect (like the explainer panel) | Add the side-effect handler inside the `inputs.forEach` block of `initializeConfigForm()`. The explainer-panel pattern at lines 451-470 is the template — `mouseover` highlights `#explain_<configKey>`, `mouseleave` clears it. |

## 8. Test coverage

Direct unit-level coverage: **none**. There is no Jest/Vitest harness for the renderer; the architecture document calls this out as a gap (see [`docs/architecture.md`](../../architecture.md) §8).

Indirect coverage:

- Playwright e2e in `tests/index.spec.ts` exercises the full boot path by launching Electron and clicking through the UI. A regression in `initialize()` (e.g. a broken service constructor) will fail the test at first interaction. See [`docs/deep-dive/j/tests__index.spec.ts.md`](../j/tests__index.spec.ts.md).
- The `data-config` round-trip is implicitly covered by every Playwright assertion that reads a value back from the form.

Coverage gaps worth filling:

- **No test for the unit-conversion math.** Switching `inch ↔ mm` is interactive-only.
- **No test for preset save/load round-trip with cloud tokens.** The `access_token`/`id_token` preserve-and-restore pattern (§5.5) is not asserted.
- **No test for boot-failure paths.** Unhandled rejections in `initializeServices()` would fail the e2e but not produce a useful error message.

## 9. Cross-references

- [`main__ui__types__index.ts.md`](./main__ui__types__index.ts.md) — companion: every type and IPC channel imported by this file.
- [`docs/deep-dive/a/main.js.md`](../a/main.js.md) — the Electron main process that supplies the IPC handlers consumed (transitively) here. §3.2 covers `nodeIntegration` / `enableRemoteModule` (required for the `require()` calls at lines 766-774).
- [`docs/deep-dive/g/main__index.html.md`](../g/main__index.html.md) — the HTML contract surface. Every `data-config` attribute documented there is consumed at lines 193 and 402; every element id (`#parts`, `#configform`, `#progressbar`, `#message`, `#sidenav`, `#presetSelect`, `#savePresetBtn`, `#import`, `#export`, `#exportjson`, `#exportsvg`, `#exportdxf`, `#package-version`, `#setdefault`, `#preset-modal`, `#presetName`, `#confirmSavePreset`, `#deletePresetBtn`, `#loadPresetBtn`, `#message a.close`, `#messagewrapper`) is read by some binder here.
- [`docs/deep-dive/d/main__ui__services__config.service.md`](../d/main__ui__services__config.service.md) — owns `read-config` / `write-config` and the `BOOLEAN_CONFIG_KEYS` constant.
- [`docs/deep-dive/d/main__ui__services__preset.service.md`](../d/main__ui__services__preset.service.md) — owns `load-presets` / `save-preset` / `delete-preset`.
- [`docs/deep-dive/d/main__ui__services__import.service.md`](../d/main__ui__services__import.service.md) — built at line 642 with the seven cross-service callbacks documented in §4.2.
- [`docs/deep-dive/d/main__ui__services__export.service.md`](../d/main__ui__services__export.service.md) — receives the export button via `setExportButton` (line 675).
- [`docs/deep-dive/d/main__ui__services__nesting.service.md`](../d/main__ui__services__nesting.service.md) — owns `background-start` / `background-stop` and consumes `displayNestFn` + `saveJsonFn`.
- [`docs/deep-dive/e/main__ui__components__navigation.md`](../e/main__ui__components__navigation.md), [`parts-view.md`](../e/main__ui__components__parts-view.md), [`nest-view.md`](../e/main__ui__components__nest-view.md), [`sheet-dialog.md`](../e/main__ui__components__sheet-dialog.md) — the four UI components mounted in `initializeComponents()`.
- [`docs/architecture.md`](../../architecture.md) §5 — full IPC table; §7 — cross-cutting concerns (units, scaling, configuration).
