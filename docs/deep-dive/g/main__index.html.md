# `main/index.html` — Deep Dive

**Generated:** 2026-04-25 by Paige (Tech Writer); **re-verified** 2026-04-26 against `HEAD` for [DEE-39](/DEE/issues/DEE-39) (Paperclip-isolated full redo of the Group G deep-dive; parent: [DEE-11](/DEE/issues/DEE-11)).
**Group:** G — deep-dive static surfaces.
**File:** `main/index.html` (3 579 LOC, single file).
**Mode:** Exhaustive deep-dive — every line citation below has been spot-checked against `HEAD` on 2026-04-26.

## 1. Purpose

The visible Electron renderer entry point. Loaded by the main `BrowserWindow` (`main.js:88-146`) via a `file://` URL. Hosts the entire interactive UI: nesting view, parts table, configuration form, info page, and the inline SVG illustrations for each config field's "what does this do?" panel.

The file is the **contract surface** between two worlds:

1. The legacy renderer (six vendored `<script>` tags + a couple of first-party modules in `util/`) that installs globals on `window`.
2. The modular TypeScript layer (`build/ui/index.js`) that reads back those globals and binds Ractive templates, IPC, and the config form. The TS modules use the element ids and the `data-config="<key>"` / `data-conversion="true"` attributes documented below as their only public contract with the HTML.

> **Document this file before touching ConfigService.** Every `data-config` attribute below is a covenant with `main/ui/services/config.service.ts`. Renaming an attribute without renaming its consumer breaks the round-trip silently — `updateForm()` will simply skip an unknown key.

## 2. Load order

```
<head>
  font/latolatinfonts.css                    ← @font-face: LatoLatinWeb / LatoLatinWebLight
  style.css                                  ← all the #ids styled below
  util/pathsegpolyfill.js                    ← global SVGPathSeg* polyfill
  util/clipper.js                            ← window.ClipperLib (vendored Clipper 6.2.1)
  util/parallel.js                           ← window.Parallel
  util/geometryutil.js                       ← window.GeometryUtil
  util/interact.js                           ← global interact() (drag / drop)
  util/ractive.js                            ← window.Ractive 0.8.1
  util/svgpanzoom.js                         ← window.svgPanZoom 3.6.2
  util/simplify.js                           ← window.simplify

  <script type="module">                     ← lines 23-31
    SvgParser → window.SvgParser
    DeepNest → window.DeepNest                (constructed with electron.ipcRenderer)
    import * as ui from "../build/ui/index.js"  ← TS entry point
  </script>
</head>
```

The classic `<script>` tags **must** finish executing before the module block runs (browsers guarantee this for in-line `<script type="module">` blocks: the module evaluates after `DOMContentLoaded`-ish but the classic scripts above it run synchronously). The TS code therefore can rely on `window.GeometryUtil`, `window.Parallel`, `window.svgPanZoom`, `window.Ractive`, and `interact()` being present when it boots — see `main/ui/types/index.ts` for the typed shims.

## 3. `data-*` attribute contract

> **The deliverable.** Without this table, `ConfigService` and the conversion utils have no documented contract. If you add a new config key, this table is the canonical place that says *"yes, line `<n>` of the HTML carries it."*

### 3.1 `data-config="<UIConfig key>"` — config form bindings

Every input/select inside `<form id="configform">` carries `data-config="<key>"`. The key matches a property on the `UIConfig` interface (see `main/ui/types/index.ts`) and is read by:

- `main/ui/index.ts:183-211` (`updateForm(c)`) — writes config → DOM (line 193 reads the attr).
- `main/ui/index.ts:389-462` (`initializeConfigForm()`) — wires `change` listeners back to `ConfigService` (line 402 reads the attr; line 453 reads it inside the explainer-panel handler).

| Attribute value | Element id | Element type | HTML line | Default value | Consumed by |
|---|---|---|---|---|---|
| `units` | (none — radio×2 with `name="units"`) | `<input type="radio">` × 2 | 222, 225 | `inch` (checked on first radio) | `ConfigService` → `UIConfig.units`; switches `<span class="unit-label">` text via `main/ui/index.ts:155-169` |
| `spacing` | (none) | `<input type="number">` | 236 | `0` | `UIConfig.spacing` (length, with `data-conversion="true"`) |
| `curveTolerance` | (none) | `<input type="number">` | 250 | `0.3` | `UIConfig.curveTolerance` (length, with `data-conversion="true"`) |
| `rotations` | (none) | `<input type="number">` | 265 | `4` (range 1-32) | `UIConfig.rotations` |
| `placementType` | (none — select with `name="placementType"`) | `<select>` | 272 | `gravity` (options: `gravity`, `box`, `convexhull`) | `UIConfig.placementType` |
| `simplify` | (none) | `<input type="checkbox">` | 281 | unchecked | `UIConfig.simplify` (boolean) |
| `threads` | (none) | `<input type="number">` | 292 | `4` (range 1-8) | `UIConfig.threads` |
| `useSvgPreProcessor` | `useSvgPreProcessor` | `<input type="checkbox">` | 305-307 | unchecked | `UIConfig.useSvgPreProcessor` (boolean) |
| `scale` | `inputscale` | `<input type="number">` | 314-319 | `72` (units/inch) | `UIConfig.scale`; **special-cased** in `updateForm()` line 178 (mm display divides by 25.4) and `initializeConfigForm()` line 411 (multiplies inverse on change) |
| `endpointTolerance` | (none) | `<input type="number">` | 332 | `0.3` | `UIConfig.endpointTolerance` (length, with `data-conversion="true"`) |
| `dxfImportScale` | (none — select with `name="dxfImportScale"`) | `<select>` | 341 | `1` (Points; options 1, 12, 72, 2.83465, 28.3465) | `UIConfig.dxfImportScale` |
| `dxfExportScale` | (none — select with `name="dxfExportScale"`) | `<select>` | 352 | `72` (Points; options 72, 6, 1, 25.4, 2.54) | `UIConfig.dxfExportScale` |
| `exportWithSheetBoundboarders` | `exportWithSheetBoundboarders` | `<input type="checkbox">` | 366-368 | unchecked | `UIConfig.exportWithSheetBoundboarders` (boolean — note the misspelling, see §6) |
| `exportWithSheetsSpace` | `exportWithSheetsSpace` | `<input type="checkbox">` | 379-381 | unchecked | `UIConfig.exportWithSheetsSpace` (boolean) |
| `exportWithSheetsSpaceValue` | `exportWithSheetsSpaceValue` | `<input type="number">` | 390-396 | `0.25` | `UIConfig.exportWithSheetsSpaceValue` (length, with `data-conversion="true"`) |
| `mergeLines` | (none) | `<input type="checkbox">` | 411 | **checked** (the only data-config input that defaults to true in HTML; ConfigService also defaults this to true server-side) | `UIConfig.mergeLines` (boolean) |
| `timeRatio` | (none) | `<input type="number">` | 423 | `0.5` (range 0-1) | `UIConfig.timeRatio` |
| `populationSize` | (none) | `<input type="number">` | 438 | `10` (min 3) | `UIConfig.populationSize` |
| `mutationRate` | (none) | `<input type="number">` | 451 | `10` (range 1-512) | `UIConfig.mutationRate` |
| `useQuantityFromFileName` | (none) | `<input type="checkbox">` | 464 | unchecked | `UIConfig.useQuantityFromFileName` (boolean) |

**Boolean keys** are explicitly handled by `BOOLEAN_CONFIG_KEYS` in `main/ui/index.ts` and stored as `boolean`, not `"true"`/`"false"` strings. Adding a new boolean config key requires updating `BOOLEAN_CONFIG_KEYS` *and* the `UIConfig` type.

### 3.2 `data-conversion="true"` — length-scaled inputs

Five inputs carry both `data-config` and `data-conversion`. The conversion logic is **bidirectional and stateful** (depends on the current `units` and `scale`):

| HTML line | `data-config` | What "conversion" means |
|---|---|---|
| 237 | `spacing` | DOM-write: `value × scale` (and `× 1/25.4` if `units === "mm"`). DOM-read: inverse. |
| 251 | `curveTolerance` | same |
| 333 | `endpointTolerance` | same |
| 397 | `exportWithSheetsSpaceValue` | same |

Implementation: `main/ui/index.ts:204-208` (write) and `main/ui/index.ts:421-426` (read). The `key === "scale"` branch is **separate** from the `data-conversion` branch and they must not be folded — see `docs/deep-dive/c/main__ui__index.ts.md` §"Invariants".

> **Gotcha**: there is no `data-conversion="false"` — a missing attribute is treated as not-converted. Don't add `data-conversion="false"` decoratively; the comparator is `=== "true"`.

### 3.3 `data-page` — sidenav routing (4 entries)

`<li>` elements in `<ul id="sidenav">` (lines 124-128). The attribute names the page id to switch to.

| Attribute value | Element id | HTML line | Target page (`<div id="...">`) | Consumer |
|---|---|---|---|---|
| `home` | `home_tab` | 124 | `#home` (line 131) | `NavigationService.switchToTab()` (`main/ui/components/navigation.ts:147-189`) |
| `config` | `config_tab` | 125 | `#config` (line 210) | same |
| `info` | `info_tab` | 127 | `#info` (line 3345) | same |
| (commented out) | `account_tab` | 126 (commented) | `#account` (line 3341 — the page itself is still in the DOM) | dead code |

The `darkmode_tab` `<li>` (line 128) has **no** `data-page` — it is routed by id (`SPECIAL_TABS.DARK_MODE` in `navigation.ts:48-50`) and toggles `body.dark-mode` instead of switching pages.

### 3.4 `data-sort-field` — parts table column sort (3 entries)

`<th>` elements inside the home page's parts table. Used by the sortable-table machinery in `main/ui/components/parts-view.ts:144` (`SORT_FIELD: "data-sort-field"`).

| Attribute value | HTML line | Sort key on `Part` object |
|---|---|---|
| `area` | 147 | bounding-box area |
| `sheet` | 148 | sheet flag (boolean) |
| `quantity` | 149 | quantity input value |

The `<th>` for the part-thumbnail column has **no** `data-sort-field` (line 146) — it intentionally is not sortable.

## 4. Element id inventory

Grouped by surface. Every id below is referenced from at least one consumer (TS, CSS, or Ractive). Ids that appear *only* in `style.css` are flagged "CSS-only" — they exist for styling, not behaviour.

### 4.1 Top-level shell

| id | HTML line | Consumer |
|---|---|---|
| `nest` | 35 | CSS-only (`style.css:1405,1412,1418,1424,1430` — wraps the dark-mode "nesting in progress" view) |
| `main` | 122 | `nesting.service.ts:61` (`MAIN_VIEW: "#main"`) — toggles `.active` on/off when nesting starts/stops |
| `messagewrapper` | 115 | `ui-helpers.ts:15`, `index.ts:545`; CSS at `style.css:1081-1100,1608` |
| `message` | 116 | `ui-helpers.ts:14`, `index.ts:542` (`#message a.close`) |
| `messagecontent` | 118 | `ui-helpers.ts:16` |

### 4.2 Sidenav (4 tabs)

| id | HTML line | Consumer |
|---|---|---|
| `sidenav` | 123 | CSS-only (`style.css:97,112,124,128,1583,1586`); navigation queries `#sidenav li` (`navigation.ts:21`) |
| `home_tab` | 124 | `style.css:133` (logo); routed via `data-page="home"` |
| `config_tab` | 125 | `style.css:141` (settings icon); routed via `data-page="config"` |
| `info_tab` | 127 | `style.css:155` (info icon); routed via `data-page="info"` |
| `darkmode_tab` | 128 | `navigation.ts:49` (`SPECIAL_TABS.DARK_MODE`); `style.css:162` (dark-mode icon) |
| `account_tab` | (commented, line 126) | Dead — referenced by `style.css:148` only |

### 4.3 Nest progress view (top of `<div id="nest">`)

| id | HTML line | Consumer |
|---|---|---|
| `stopnest` | 37 | `nesting.service.ts:66` (`STOP_BUTTON`) |
| `export_wrapper` | 38 | `nesting.service.ts:64` (`EXPORT_WRAPPER`); `style.css:360,373` |
| `export` | 39 | `nesting.service.ts:65` (`EXPORT_BUTTON`); `index.ts:672` (toggles spinner during DXF/SVG export); `style.css:366` |
| `exportsvg` | 41 | `index.ts:736` (click → SVG export) |
| `exportdxf` | 42 | `index.ts:745` (click → DXF export) |
| `exportjson` | 43 | `index.ts:727` (click → JSON export) |
| `exportgcode` | (commented, line 44) | Dead — feature stub |
| `back` | 47 | `nesting.service.ts:68` (`BACK_BUTTON`) |
| `progressbar_wrapper` | 86 | CSS-only (`style.css:198,1623`) |
| `progressbar` | 87 | `index.ts:516` (`#progressbar`) — width updated during background-progress IPC |
| `nestcontent` | 90 | `nest-view.ts:101` (`NEST_CONTENT`) — Ractive mounts the `#nest-template` here |
| `nestdisplay` | 91 | `nesting.service.ts:63`, `nest-view.ts:105` — receives the rendered SVG nest result |
| `nest-template` | 93 | `nest-view.ts:103` (Ractive template id; `<script id="nest-template" type="text/ractive">`) |
| `nestinfo` | 94 (inside template) | CSS-only (`style.css:1162-1177`) — added/removed by Ractive based on `{{ nests.length > 0 }}` |
| `nestlist` | 100 (inside template) | CSS-only (the `style.css` rule for `#nestlist` lives in surrounding selectors) |

### 4.4 Home page — parts table & sheet dialog

| id | HTML line | Consumer |
|---|---|---|
| `home` | 131 | Tab page target; navigation switches `.page.active` here |
| `homecontent` | 132 | `parts-view.ts:120` (`HOME_CONTENT`) — Ractive mount point for `#template-part-list` |
| `template-part-list` | 134 | `parts-view.ts:122` (`TEMPLATE_PART_LIST`); Ractive template (`<script type="text/ractive">`) |
| `import` | 136 (inside template) | `index.ts:701` — file import button (toggles spinner via `.button.import.spinner`) |
| `startnest` | 137 (inside template) | `nesting.service.ts:67` (`START_BUTTON`) |
| `parts` | 140 (inside template) | `parts-view.ts:126` (`PARTS_CONTAINER`); `index.ts:133`; `style.css:422` |
| `partscroll` | 142 (inside template) | `style.css:439` |
| `partstools` | 165 (inside template) | `sheet-dialog.ts:32` (`PARTS_TOOLS`); `style.css:788-841` |
| `addsheet` | 167 (inside template) | `sheet-dialog.ts:26` (`ADD_SHEET_BTN`) |
| `selectall` | 169 (inside template) | Ractive `on-click="selectall"` handler |
| `sheetdialog` | 171 (inside template) | `style.css:827-872` (positioned absolute; toggled via `#partstools.active #sheetdialog`) |
| `sheetwidth` | 173 (inside template) | `sheet-dialog.ts:34` (`SHEET_WIDTH_INPUT`) |
| `sheetheight` | 174 (inside template) | `sheet-dialog.ts:36` (`SHEET_HEIGHT_INPUT`) |
| `confirmsheet` | 176 (inside template) | `sheet-dialog.ts:30` (`CONFIRM_SHEET_BTN`) |
| `cancelsheet` | 177 (inside template) | `sheet-dialog.ts:28` (`CANCEL_SHEET_BTN`) |
| `imports` | 183 (inside template) | `style.css:447,1652` |
| `importsnav` | 185 (inside template) | `style.css:892-953,1655,1658` |
| `import-{{i}}` | 196 (inside template, Ractive expression) | `parts-view.ts:294,325,328,331` (`#import-${i} svg`, `.zoomin`, `.zoomout`, `.zoomreset` for svg-pan-zoom binding) |

### 4.5 Config form

| id | HTML line | Consumer |
|---|---|---|
| `config` | 210 | Tab page target; `#config input, #config select` queried by `index.ts:183,389` |
| `configform` | 211 | `index.ts:156-158` (queries `#configform input[value=inch]` / `[value=mm]`); `index.ts:502` (`#configform dd`) |
| `useSvgPreProcessor` | 305 | Carries `data-config="useSvgPreProcessor"` — id is **redundant** with the data-config (read via attribute, not id) but kept to match the explainer-panel id pattern (`#explain_<configKey>`) |
| `inputscale` | 314 | `index.ts:172` (`#inputscale` — special-cased mm/inch conversion); also carries `data-config="scale"` |
| `exportWithSheetBoundboarders` | 366 | id matches `data-config`; same redundancy as above |
| `exportWithSheetsSpace` | 379 | id matches `data-config` |
| `exportWithSheetsSpaceValue` | 390 | id matches `data-config` |
| `presets-container` | 471, 475 | **Duplicate id** — used twice (see §6 Gotchas). Styled by `style.css:1753`. |
| `savePresetBtn` | 472 | `index.ts:244` |
| `presetSelect` | 477 | `index.ts:220, 247`; skipped in `updateForm()` because `inputId in ["presetSelect","presetName"]` (`index.ts:189`) |
| `loadPresetBtn` | 481 | `index.ts:245` |
| `deletePresetBtn` | 482 | `index.ts:246`; `style.css:1832` |
| `preset-modal` | 488 | `index.ts:248` |
| `presetName` | 494 | `index.ts:250`; skipped in `updateForm()` (`index.ts:189`); `style.css:1813` |
| `confirmSavePreset` | 499 | `index.ts:249`; `style.css:1828` |
| `setdefault` | 504 | `index.ts:474` (clicking resets all config to defaults) |

### 4.6 Config-form explainer panels

The right-hand panel that shows an SVG illustration + descriptive copy when a config field receives focus. Logic lives in `main/ui/index.ts:455-459`: on input focus, `document.querySelector("#explain_" + configKey)` highlights the panel.

| id | HTML line | Pairs with `data-config="<key>"` |
|---|---|---|
| `explain_units` | 508 | `units` |
| `explain_spacing` | 628 | `spacing` |
| `explain_scale` | 756 | `scale` |
| `explain_curveTolerance` | 928 | `curveTolerance` |
| `explain_endpointTolerance` | 991 | `endpointTolerance` |
| `explain_simplify` | 1063 | `simplify` |
| `explain_rotations` | 1308 | `rotations` |
| `explain_placementType` | 1441 | `placementType` |
| `explain_threads` | 1941 | `threads` |
| `explain_mergeLines` | 1993 | `mergeLines` |
| `explain_timeRatio` | 2208 | `timeRatio` |
| `explain_populationSize` | 2406 | `populationSize` |
| `explain_mutationRate` | 2885 | `mutationRate` |

> **Gap**: 19 keys carry `data-config`, only 13 have explainer panels. Missing: `useSvgPreProcessor`, `dxfImportScale`, `dxfExportScale`, `exportWithSheetBoundboarders`, `exportWithSheetsSpace`, `exportWithSheetsSpaceValue`, `useQuantityFromFileName`. New config keys do not require an explainer — `querySelector("#explain_" + key)` simply returns null and the focus handler is a no-op.

### 4.7 Account & info pages

| id | HTML line | Consumer |
|---|---|---|
| `account` | 3341 | Page target — but the tab (`account_tab`) is commented out, so the page is unreachable through the UI. CSS at `style.css:148`. |
| `purchaseSingle` | 3342 | Dead — leftover from the original deepnest.io purchase flow. No TS handler. |
| `info` | 3345 | Page target via `data-page="info"`; `style.css:604,612-621,1647` |
| `Layer_1` | 3354 | id on the inline `<svg>` deepnest logo in the info page; not consumed by code |
| `package-version` | 3548 | `index.ts:579` (`getElement<HTMLElement>("#package-version")`) — populated with the package version from `package.json` at app startup |

## 5. IPC / global side-effects

The HTML itself emits no IPC. Side effects come from the inline `<script type="module">` block (lines 23-31):

1. `new SvgParser()` → `window.SvgParser` (singleton; consumed by `main/ui/services/import.service.ts`).
2. `new DeepNest(require("electron").ipcRenderer)` → `window.DeepNest` (singleton; consumed by `main/ui/services/nesting.service.ts`).
3. `import * as ui from "../build/ui/index.js"` → triggers the entire `main/ui/` boot sequence; `import.service`, `export.service`, `nesting.service`, `preset.service`, `config.service`, `parts-view`, `nest-view`, `sheet-dialog`, `navigation`.

The `require("electron").ipcRenderer` call works only because `webPreferences.nodeIntegration: true` (set in `main.js`). Removing `nodeIntegration` would require switching to the contextBridge-style preload script — see ADR-004.

## 6. Invariants & gotchas

1. **Duplicate `id="presets-container"`** (lines 471, 475). HTML5 forbids duplicate ids. No code currently selects `#presets-container` other than CSS (which matches both — fine for `style.css:1753`). If a future feature wants to attach a TS listener to the container, fix this first.
2. **`exportWithSheetBoundboarders` is a misspelling of "boundaries"** but is the canonical `UIConfig` key. Renaming requires a config migration (presets stored on disk use the misspelled key).
3. **The explainer-panel highlight logic does an `el.scrollIntoView()` + class swap** — adding a new explainer requires the surrounding container to be scrollable (`#config` already is).
4. **`#account_tab` is commented out, but `#account` is not** — the account page is dead but its DOM still ships. Keep them out of sync at your peril; the cleanup story should remove both at once.
5. **`form id="configform"` wraps the whole config page**, including the modal dialog (`#preset-modal`) and the Set-default button (`#setdefault`). Browsers treat a `<button>` inside a `<form>` without `type="button"` as `type="submit"` — every preset/save button declares `type="button"` implicitly because it is `<button class="button">` (no `type` attribute). This works because `<form>` has no `action` and submission is suppressed by the change handlers, but adding a stray `type="submit"` button would reload the page.
6. **`<script type="module">` cannot use top-level `require`**, but the inline module on line 23-31 calls `require("electron").ipcRenderer` because `nodeIntegration: true` exposes Node's `require` globally (not via ESM). This is the reason the legacy `<script>` tags above the module block can also `require()`. Removing nodeIntegration breaks both pathways.
7. **Sheet-dialog inputs (`#sheetwidth`, `#sheetheight`) live inside the parts-list Ractive template** — they are recreated on every Ractive re-render. `sheet-dialog.ts` re-queries them on each open; do not cache references.

## 7. Known TODOs in the file

- Line 44: `<!--<li id="exportgcode">GCode file</li>-->` — gcode export was scoped but never landed.
- Line 126: `<!--<li id="account_tab" data-page="account"></li>-->` — account tab disabled when payments were removed (deepnest.io legacy).
- Lines 124-128 (`<ul id="sidenav">`) are populated **statically** — there is no plan to move them under Ractive control. If a new tab is needed, add another `<li>` here and wire it via `data-page`.

## 8. Extension points

| To add… | Touch this in `index.html` | And update… |
|---|---|---|
| A new config key | Add `<input data-config="<key>" [data-conversion="true"]>` inside an existing `<dl class="formgroup">` | `UIConfig` in `main/ui/types/index.ts`; default in `ConfigService`; (optional) `BOOLEAN_CONFIG_KEYS`; (optional) explainer panel `<div class="config_explain" id="explain_<key>">` |
| A new sidenav tab | Add `<li id="<x>_tab" data-page="<x>">` to `<ul id="sidenav">`; add `<div id="<x>" class="page">` body | CSS rule for `#<x>_tab` icon |
| A new Ractive-driven view | Add `<script id="template-<name>" type="text/ractive">` inside an existing page | Component module under `main/ui/components/` referencing the new template id |
| A new export format | Add `<li id="export<format>">` inside `<ul class="dropdown">` | Click handler near `index.ts:727-755` and corresponding service in `export.service.ts` |

## 9. Test coverage

- `tests/e2e/specs/config.spec.ts` exercises the config tab — covers `config_tab`, `inputscale`, the radio inputs for `units`, and at least one `data-conversion` input. Click selectors typically use the `data-config` attribute (`[data-config="spacing"]`).
- `tests/e2e/specs/preset.spec.ts` exercises `savePresetBtn`, `loadPresetBtn`, `deletePresetBtn`, `presetSelect`, `presetName`, `preset-modal`, `confirmSavePreset`.
- No spec covers the explainer-panel highlight (`#explain_<key>`) — manual verification.
- No spec covers `account` / `purchaseSingle` — those surfaces are unreachable through the live tab list.

## 10. Cross-references

- [`docs/deep-dive/c/main__ui__index.ts.md`](../c/main__ui__index.ts.md) — the consumer of every `data-config` attribute.
- [`docs/deep-dive/d/main__ui__services__config.service.md`](../d/main__ui__services__config.service.md) — explains the round-trip with `index.html`'s data-config form.
- [`docs/deep-dive/e/main__ui__components__navigation.md`](../e/main__ui__components__navigation.md) — `data-page` consumer.
- [`docs/deep-dive/e/main__ui__components__parts-view.md`](../e/main__ui__components__parts-view.md) — `data-sort-field` consumer.
- [`docs/deep-dive/e/main__ui__components__sheet-dialog.md`](../e/main__ui__components__sheet-dialog.md) — sheet-dialog id consumers.
- [`docs/deep-dive/g/main__notification.html.md`](./main__notification.html.md) — sibling notification surface.
