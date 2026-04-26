# `main/ui/types/index.ts` — Deep Dive

**Generated:** 2026-04-26 by Paige (Tech Writer) for [DEE-35](/DEE/issues/DEE-35) (parent: [DEE-11](/DEE/issues/DEE-11)).
**Group:** C — UI renderer composition.
**File:** `main/ui/types/index.ts` (315 LOC, single file).
**Mode:** Exhaustive deep-dive. The companion file is [`main__ui__index.ts.md`](./main__ui__index.ts.md).

## 1. Purpose

The UI type spec. This file is a thin extension layer over the engine's root `index.d.ts` (which owns `DeepNestConfig`, `Part`, `Polygon`, `NestingResult`, etc.) and adds:

1. **`UIConfig`** — adds the user-profile, SVG-pre-processor, and export-shape config keys that only the UI cares about.
2. **`IPC_CHANNELS`** — the **only string-typed contract** between renderer and main process. Every IPC `send` / `invoke` / `on` call site in `main/ui/services/*.ts` reads its channel name from this constant.
3. **`DeepNestInstance`, `SvgParserInstance`, `ConfigObject`, `RactiveInstance<T>`** — typed shims for the four globals installed on `window` by legacy JS (`window.DeepNest`, `window.SvgParser`, `window.config`, `window.nest`).
4. **View-data interfaces** (`PartsViewData`, `NestViewData`, `ImportedFile`, `SelectableNestingResult`, `SheetPlacementWithMerged`) that match Ractive template bindings.
5. **Misc helpers**: `SvgPanZoomInstance`, `ThrottleOptions`, `FileFilter`, `MergedSegment`, `PresetConfig`, `NestingProgress`.

> **Treat this file like an API doc.** `IPC_CHANNELS` (lines 267-278) is the contract surface between Tier A (renderer) and the Electron main process; rename a key here and you must rename it in `main.js` (`ipcMain.on/handle` call sites) **and** in every consumer service in the same commit. The constant's `as const` annotation (line 278) is what makes the rename detectable to TypeScript at the consumer site — drop it and the contract goes string-typed.

## 2. Public surface

### 2.1 Re-exports from `index.d.ts` (lines 7-17)

These types live in the engine-side root `index.d.ts` and are re-exported here so UI code only imports from `./types/index.js`:

| Re-export | Origin | Purpose |
|---|---|---|
| `DeepNestConfig` | root `index.d.ts:24-62` | Engine-side config base. Every `UIConfig` value flows through this. |
| `SheetPlacement` | root `index.d.ts:67-80` | Per-part placement returned by the genetic algorithm. |
| `NestingResult` | root `index.d.ts:85-105` | Top-level nest result, plus `selected` and the `placements: { sheet, sheetid, sheetplacements }[]` shape. |
| `PlacementType` | root | Discriminated union: `"gravity" \| "box" \| "convexhull"` (consumed by the placement-type `<select>` in `main/index.html`). |
| `UnitType` | root | `"inch" \| "mm"`. The renderer maps to/from these only — internal storage is always inches. |
| `Bounds` | root | `{x,y,width,height}` rectangle. |
| `PolygonPoint`, `Polygon`, `Part` | root | Geometry primitives. `Polygon` is `Array<PolygonPoint>` with an `id`/`children` extension. |

The same identifiers are imported again at line 20 (`import type {…}`) for use as parameters of UIConfig and the various interfaces below — they are duplicated at the import line because TypeScript's `export type {…}` re-export does not implicitly bring them into scope for the file's own type expressions.

### 2.2 `UIConfig` interface (lines 25-40)

```ts
export interface UIConfig extends DeepNestConfig {
  access_token?: string;             // OAuth access token
  id_token?: string;                  // OAuth id token
  useSvgPreProcessor: boolean;        // Enable @deepnest/svg-preprocessor
  useQuantityFromFileName: boolean;   // part.3.svg → 3 copies
  exportWithSheetBoundboarders: boolean;   // include sheet rect in export (note: misspelt)
  exportWithSheetsSpace: boolean;     // gap between sheets in multi-sheet export
  exportWithSheetsSpaceValue: number; // gap value (SVG units, default 10mm equivalent)
}
```

Inherited from `DeepNestConfig` (root `index.d.ts:24-62`):

| Key | Type | Notes |
|---|---|---|
| `units` | `UnitType` | UI-facing only; storage is always inches. |
| `scale` | `number` | SVG units per inch (default 72 = points). |
| `spacing` | `number` | Inter-part spacing (length-converted). |
| `curveTolerance` | `number` | Polygonifier tolerance (length-converted). |
| `clipperScale` | `number` | Clipper integer factor (1e7); never edited via UI. |
| `rotations` | `number` | GA rotation count. |
| `threads` | `number` | Background renderer pool size. |
| `populationSize` | `number` | GA population. |
| `mutationRate` | `number` | GA mutation 0-1. |
| `placementType` | `PlacementType` | gravity / box / convexhull. |
| `mergeLines` | `boolean` | Laser-merge optimisation. |
| `timeRatio` | `number` | Material vs laser-time bias (0-1). |
| `simplify` | `boolean` | Polygon simplification. |
| `dxfImportScale` | `number` | DXF unit-mapping in. |
| `dxfExportScale` | `number` | DXF unit-mapping out. |
| `endpointTolerance` | `number` | Path-close tolerance (length-converted). |
| `conversionServer` | `string` | DXF→SVG converter URL. |

The renderer's `BOOLEAN_CONFIG_KEYS` constant (in `main/ui/services/config.service.ts`) is the runtime mirror of which `UIConfig` fields are `boolean` — see [`main__ui__index.ts.md`](./main__ui__index.ts.md) §5.6 for the dual-source-of-truth gotcha.

### 2.3 `ConfigObject` interface (lines 79-98)

```ts
export interface ConfigObject extends UIConfig {
  getSync<K extends keyof UIConfig>(key?: K): K extends keyof UIConfig ? UIConfig[K] : UIConfig;
  setSync<K extends keyof UIConfig>(keyOrObject: K | Partial<UIConfig>, value?: UIConfig[K]): void;
  resetToDefaultsSync(): void;
}
```

Quirk: `ConfigObject` **extends** `UIConfig`, so an instance is *both* a value object (every config key directly readable) and an action object (`getSync` / `setSync`). This shape matches the legacy `electron-settings` API surface that `deepnest.js` was originally written against. Backward-compat anchor — see [`main__ui__index.ts.md`](./main__ui__index.ts.md) line 594 (`window.config = configService as unknown as ConfigObject`).

`getSync` is a typed conditional: with no key it returns the whole `UIConfig`; with a key it returns the value type of that key.

### 2.4 Globals shims

| Interface | Lines | Backing global | Required for |
|---|---|---|---|
| `DeepNestInstance` | 123-176 | `window.DeepNest` | `getDeepNest()` in the entry point. Lists `imports`, `parts`, `nests`, `working` and the four entry methods (`importsvg`, `config`, `start`, `stop`, `reset`). |
| `SvgParserInstance` | 288-302 | `window.SvgParser` | `getSvgParser()` in the entry point. Lists `load`, `cleanInput`, `polygonElements`, `isClosed`, `polygonify`, `polygonifyPath`, `transformParse`, `applyTransform`, `flatten`, `splitLines`, `mergeOverlap`, `mergeLines`, `config`. |
| `ConfigObject` | 79-98 | `window.config` | The cast at `index.ts` line 594. |
| `RactiveInstance<T>` | 206-215 | `window.nest` (with `T = NestViewData`) | The cast at `index.ts` line 691; also the cast for `partsViewService.getRactive()` at line 652. |
| `SvgPanZoomInstance` | 50-59 | `interact()` is global, but svg-pan-zoom is `window.svgPanZoom` (loaded by `util/svgpanzoom.js`). Used by `ImportedFile.zoom`. |
| `ExtendedWindow` | 309-315 | The whole `window` shape | Documentation-only. The base `Window` interface is augmented in root `index.d.ts:276-…`; this interface is for IDE completion when a service explicitly needs all five globals. |

### 2.5 View-data interfaces

| Interface | Lines | Bound to |
|---|---|---|
| `ImportedFile` | 64-73 | `parts-view.html` Ractive — list of imported SVGs with `selected`, `zoom` (SvgPanZoomInstance) per row. |
| `PartsViewData` | 181-188 | `partsViewService.getRactive()` — `parts`, `imports`, `getSelected()`, `getSheets()`, `serializeSvg(svg)`, `partrenderer(part)`. |
| `NestViewData` | 193-201 | `nestViewService.getRactive()` — `nests`, `getSelected()`, `getNestedPartSources(n)`, `getColorBySource(id)`, `getPartsPlaced()`, `getUtilisation()`, `getTimeSaved()`. |
| `SelectableNestingResult` | 113-118 | Element type of `nests`. Adds `selected: boolean` and `utilisation: number` (0-100) to `NestingResult`. |
| `SheetPlacementWithMerged` | 246-255 | Variant of `SheetPlacement` that carries `mergedSegments?: [MergedSegment, MergedSegment][]` for the laser-merge UI. |
| `MergedSegment` | 238-241 | `{ x, y }` point in a merged-line pair. |
| `NestingProgress` | 103-108 | Payload of `IPC_CHANNELS.BACKGROUND_PROGRESS` — `{ index, progress }`, where a negative `progress` means "this worker is finished." |
| `PresetConfig` | 260-262 | Preset file shape: `{ [presetName: string]: string }` where the value is a JSON-stringified `UIConfig` (yes, double-encoded). |

### 2.6 Misc helper interfaces

| Interface | Lines | Use |
|---|---|---|
| `ThrottleOptions` | 220-225 | `throttle(fn, ms, opts)` in utility helpers; `{ leading?, trailing? }`. |
| `FileFilter` | 230-233 | `dialog.showOpenDialog`'s `filters` shape (`{ name, extensions }`). |

### 2.7 Constants exported as values (not types)

| Constant | Lines | Value | Consumed by |
|---|---|---|---|
| `DEFAULT_CONVERSION_SERVER` | 45 | `"https://converter.deepnest.app/convert"` | `config.service.ts` defaults; `main.js` rewrites legacy `convert.deepnest.io` URLs to this on read. |
| `IPC_CHANNELS` | 267-278 | Frozen-by-`as const` map of channel names. | Every `ipcRenderer.invoke / send / on` in `main/ui/services/*.ts` and the lone `on` call in `main/ui/index.ts:514`. |

## 3. IPC contract — the **deliverable**

> **The canonical IPC contract.** Every consumer site in `main/ui/services/*.ts` and `main/ui/index.ts` reads its channel name from `IPC_CHANNELS` (lines 267-278). Every handler site in `main.js` and `main/background.js` declares the literal string. Adding a new channel: add the key here first, then add the consumer call, then add the handler — in that order, in the same PR.

### 3.1 The constant (lines 267-278)

```ts
export const IPC_CHANNELS = {
  LOAD_PRESETS: "load-presets",
  SAVE_PRESET: "save-preset",
  DELETE_PRESET: "delete-preset",
  READ_CONFIG: "read-config",
  WRITE_CONFIG: "write-config",
  BACKGROUND_START: "background-start",
  BACKGROUND_STOP: "background-stop",
  BACKGROUND_PROGRESS: "background-progress",
  BACKGROUND_RESPONSE: "background-response",
  SET_PLACEMENTS: "setPlacements",
} as const;

export type IpcChannel = (typeof IPC_CHANNELS)[keyof typeof IPC_CHANNELS];
```

`IpcChannel` (line 283) is the union `"load-presets" | "save-preset" | …` derived via lookup — a type, not a value.

### 3.2 Channel-by-channel table

`Direction` legend: `R` = renderer (UI window), `M` = Electron main process, `B` = background renderer (worker), `→` = `send`/`invoke` to, `↔` = round-trip via `invoke`.

| Constant key | String | Direction | Payload | Sender | Handler | Consumed by |
|---|---|---|---|---|---|---|
| `LOAD_PRESETS` | `"load-presets"` | R ↔ M | `() → PresetConfig` | `preset.service.ts:76` (`ipcRenderer.invoke`) | `main.js:378` (`ipcMain.handle`) | `loadPresetList()` in `index.ts:218`. |
| `SAVE_PRESET` | `"save-preset"` | R ↔ M | `(name: string, config: UIConfig) → void` | `preset.service.ts:146` | `main.js:382` | `confirmSavePreset` handler in `index.ts:301`. |
| `DELETE_PRESET` | `"delete-preset"` | R ↔ M | `(name: string) → void` | `preset.service.ts:177` | `main.js:386` | `deletePresetBtn` handler in `index.ts:371`. |
| `READ_CONFIG` | `"read-config"` | R ↔ M | `() → object (parsed JSON, possibly empty)` | `config.service.ts:148` (await on construction) | `main.js:353` | Whole-app boot path; `createConfigService` blocks `initialize()` until this resolves. |
| `WRITE_CONFIG` | `"write-config"` | R ↔ M | `(stringifiedConfig: string) → void` | `config.service.ts:301` | `main.js:358` | Every `setSync` flush. |
| `BACKGROUND_START` | `"background-start"` | R → M → B | `{ individual, sheets, ids, sources, children, filenames, sheetids, sheetsources, sheetchildren, config }` (full ga payload) | `deepnest.js:1292` (`this.eventEmitter.send(...)`) | `main.js:302` (`ipcMain.on`); fans out to first idle bg window with `webContents.send("background-start", payload)` (line 307) | `nestingService` initiates the run via `DeepNest.start(...)`. |
| `BACKGROUND_STOP` | `"background-stop"` | R → M | `()` | `nesting.service.ts:488` and `:557` | `main.js:337` (`ipcMain.on`); destroys all bg windows and recreates the pool | "Stop nesting" button. |
| `BACKGROUND_PROGRESS` | `"background-progress"` | B → M → R | `NestingProgress { index: number, progress: number }` (negative = done) | `background.js:264, 2307, 2480` | `main.js:328` (`ipcMain.on`); rebroadcasts via `mainWindow.webContents.send` (line 331) | `index.ts:514` (`initializeBackgroundProgress`) — the only direct IPC `on` in the entry point. |
| `BACKGROUND_RESPONSE` | `"background-response"` | B → M → R | placement payload (see `setPlacements` below) | `background.js:247` (worker emits) | `main.js:313`; matches `event.sender` to its bg slot, clears `isBusy`, rebroadcasts to main | `deepnest.js:1097` listens and immediately re-sends as `setPlacements`. |
| `SET_PLACEMENTS` | `"setPlacements"` | R → M (stash) | placement payload | `deepnest.js:1098` (`this.eventEmitter.send("setPlacements", payload)`) | `main.js:370` (`ipcMain.on`); stores on `global.exportedPlacements` for remote inspection (e.g. Playwright) | Used by Playwright tests to read out the current nest from the main process; not a user-feature IPC. |

### 3.3 Channel directionality summary

```
┌────────────┐   load-presets / save-preset / delete-preset           ┌────────────┐
│            │   read-config / write-config                           │            │
│  Renderer  │ ────────── ipcRenderer.invoke ─────────────────────►   │   Main     │
│  (Tier A)  │                                                        │            │
│            │   background-stop                                      │            │
│            │ ───────────── ipcRenderer.send ─────────────────────►  │            │
│            │                                                        │            │
│            │   setPlacements                                        │            │
│            │ ───────────── ipcRenderer.send ─────────────────────►  │            │
│            │                                                        │            │
│            │   background-progress / -response                      │            │
│            │ ◄──────────── webContents.send ────────────────────    │            │
└────────────┘                                                        └─────┬──────┘
                                                                            │
                                              background-start              │
                                              webContents.send              ▼
                                                                       ┌────────────┐
                                                                       │ Background │
                                                                       │ renderers  │
                                                                       │ (Tier B)   │
                                                                       └────────────┘
```

Cross-reference: `docs/architecture.md` §5 carries the same table grouped by capability (background nesting / configuration / auxiliary) and is the primary IPC reference. This file is the *type-level* contract; the architecture doc is the *behaviour* contract.

### 3.4 Channels **not** in `IPC_CHANNELS`

The following channels exist in `main.js` but are not surfaced in `IPC_CHANNELS` and therefore are not type-checked at the consumer site. Adding them is a worthy refactor:

| Channel | Where it's referenced | Why it's outside the constant |
|---|---|---|
| `login-success` | `main.js:362` (rebroadcast), consumed by cloud-login UI | Cloud feature; `IPC_CHANNELS` is core-app only. |
| `purchase-success` | `main.js:366` | Same. |
| `test` | `main.js:374` | Test-only stash on `global.test`. |
| `get-notification-data`, `close-notification` | `main.js:391, 401` | Notification window only — see [`docs/deep-dive/g/main__notification.html.md`](../g/main__notification.html.md). |

## 4. Dependencies

### 4.1 Imports

This file imports from exactly one location:

| Import | Source | Use |
|---|---|---|
| `DeepNestConfig`, `NestingResult`, `PolygonPoint`, `Part` (type-only) | `../../../index.d.ts` (root) | Base types extended by `UIConfig`, `SelectableNestingResult`, `SvgParserInstance.polygonify`, `DeepNestInstance.parts`. |

Plus the `export type { … }` re-export block at lines 7-17 (same source).

### 4.2 Consumers

| Consumer | What it imports |
|---|---|
| `main/ui/index.ts` | `UIConfig`, `ConfigObject`, `DeepNestInstance`, `SvgParserInstance`, `RactiveInstance`, `NestViewData`, `NestingProgress`, `PartsViewData`, plus the value `IPC_CHANNELS`. |
| `main/ui/services/config.service.ts` | `UIConfig`, `IPC_CHANNELS` (`READ_CONFIG`, `WRITE_CONFIG`). |
| `main/ui/services/preset.service.ts` | `IPC_CHANNELS` (`LOAD_PRESETS`, `SAVE_PRESET`, `DELETE_PRESET`), `UIConfig`, `PresetConfig`. |
| `main/ui/services/nesting.service.ts` | `IPC_CHANNELS` (`BACKGROUND_STOP`), `NestingResult`, `RactiveInstance`, `NestViewData`. |
| `main/ui/services/import.service.ts` | `ImportedFile`, `RactiveInstance`, `PartsViewData`, `Part`, `SvgPanZoomInstance`, `FileFilter`, `UIConfig`. |
| `main/ui/services/export.service.ts` | `UIConfig`, `SvgParserInstance`, `DeepNestInstance`, `FileFilter`. |
| `main/ui/components/parts-view.ts` | `PartsViewData`, `RactiveInstance`, `Part`, `ImportedFile`. |
| `main/ui/components/nest-view.ts` | `NestViewData`, `RactiveInstance`, `SelectableNestingResult`, `MergedSegment`, `SheetPlacementWithMerged`. |
| `main/ui/components/sheet-dialog.ts` | `Part`, `UIConfig`, `DeepNestInstance`. |

The import graph forms a DAG with this file at the root — every other UI module depends on it.

### 4.3 Outbound runtime dependencies

None. This file emits **only types and one frozen object literal**. The compiled JS output is a single `IPC_CHANNELS = {…}` const plus an empty default export.

## 5. Invariants & gotchas

### 5.1 `IPC_CHANNELS` keys are `as const`

Line 278. The `as const` is what gives `IpcChannel` its literal-union type and what allows TypeScript to detect a typo at the consumer site (`ipcRenderer.invoke(IPC_CHANNELS.READ_CONIFG)` ⇒ compile error). Drop the `as const` and the constant becomes `Record<string, string>` and consumers go string-typed silently.

### 5.2 `IPC_CHANNELS` values are kebab-case **except** `setPlacements`

The lone camelCase value `"setPlacements"` (line 277) does not match the kebab-case convention used by the other channels. Both `main.js:370` and `deepnest.js:1098` use the camelCase string verbatim. Renaming would be a multi-file change for cosmetic value only — leave it alone.

### 5.3 `exportWithSheetBoundboarders` is misspelt

Line 35. The doubled `b` in `Boundboarders` is a typo carried forward from the legacy config (matches the HTML attribute `data-config="exportWithSheetBoundboarders"` in `main/index.html` line 366 — see [`docs/deep-dive/g/main__index.html.md`](../g/main__index.html.md) §3.1). Fixing this requires updating: this file, `config.service.ts` defaults, `main/index.html`, and any persisted user `settings.json` that already contains the misspelt key.

### 5.4 `PresetConfig` values are JSON-stringified `UIConfig`

```ts
export interface PresetConfig {
  [presetName: string]: string; // JSON stringified UIConfig
}
```

The consumer must `JSON.parse(presetConfigValue)` before treating it as a `UIConfig`. This is double-encoding — the wrapping JSON file already represents the keys as JSON strings, and each value is itself a JSON string. The pattern persists for legacy compat with the old preset format.

### 5.5 `DeepNestInstance.config` accepts a partial **`DeepNestConfig`**, not a `UIConfig`

Line 155 (`config(config?: Partial<DeepNestConfig>): DeepNestConfig`). The engine does not know about UI-only keys (`access_token`, `useSvgPreProcessor`, …) so passing a `UIConfig` widens the signature implicitly. The current call sites at `index.ts:601`, `:437`, `:494` rely on TypeScript's structural compatibility: `UIConfig extends DeepNestConfig`, so a `UIConfig` is assignable to `Partial<DeepNestConfig>`. **Don't drop the `extends` relationship** — every UI config write to `DeepNest` would fail to type-check.

### 5.6 `NestingProgress.progress` is overloaded with a sentinel

Line 107: `/** Progress value (0-1, negative means finished) */`. The progress callback at `index.ts:519` does `parseInt(String(progress * 100))` and unconditionally writes a width — so a negative value renders as `width: -50%` which CSS clamps to 0%. Cosmetically benign because the second-leg "transition: none" at line 519 is also engaged only when `progress < 0.01` (i.e. *during the first percent*, not the finish marker). The finish-marker UX is "bar collapses to zero on completion" — verify this is intentional before refactoring.

### 5.7 `SelectableNestingResult.selected` collides with `NestingResult.selected`

Root `index.d.ts:95` already declares `selected: boolean` on `NestingResult`. Re-declaring it in `SelectableNestingResult` (line 115) is harmless TypeScript-side (identical type) but signals that the engine and UI differ on which struct owns the flag. The `utilisation: number` field (line 117) is the *real* UI-only addition.

### 5.8 `RactiveInstance<T>` is a minimal shim

Lines 206-215. It exposes only `update`, `get`, `set`, `on`. Real Ractive 0.8.1 has dozens more methods; the minimal surface is intentional — calling code that needs (e.g.) `ractive.findComponent` must extend the type locally. The generic `<T>` parameter only types `get` and `set`; `on` payloads are still `unknown`.

### 5.9 `ConfigObject` extending `UIConfig` is the only reason `window.config.threads` works

Line 79. Removing `extends UIConfig` from `ConfigObject` would force every read site that does `config.threads` (instead of `config.getSync("threads")`) to switch to the method. The legacy `deepnest.js` does both — see `docs/deep-dive/d/main__ui__services__config.service.md` for the migration plan.

### 5.10 No runtime validators

Every interface in this file is a compile-time-only type. There are no `zod` / `io-ts` validators applied to IPC payloads at runtime — if `main.js` sends a malformed `read-config` response, the renderer trusts it. Acceptable for an Electron app where both sides are owned by us; would be a security gap if a renderer ran untrusted code.

## 6. Known TODOs

The file has zero `// TODO` / `// FIXME` comments. All annotations are explanatory JSDoc.

Implicit / un-annotated TODOs surfaced during the deep-dive:

- **`exportWithSheetBoundboarders` typo** (§5.3) — eligible for cleanup with a migration step.
- **Cloud-feature IPC channels missing from `IPC_CHANNELS`** (§3.4) — `login-success` / `purchase-success` would benefit from being typed.
- **Notification IPC missing** (`get-notification-data`, `close-notification`) — see Group G's notification.html deep-dive for the existing three-channel contract that lives entirely outside `IPC_CHANNELS`.
- **No runtime IPC payload validators** (§5.10) — viable hardening if a future renderer ever runs untrusted SVG content.
- **`SET_PLACEMENTS` is dead-letter on the main side** — `main.js:370-372` only stashes to `global.exportedPlacements`. If no Playwright test reads it, the channel is unused; consider deleting or documenting the test-only contract.

## 7. Extension points

| To add… | Touch |
|---|---|
| A new IPC channel | (1) Add `KEY: "channel-name"` to `IPC_CHANNELS` (lines 267-278). (2) Add `ipcMain.on/handle("channel-name", …)` in `main.js`. (3) Call `ipcRenderer.send/invoke(IPC_CHANNELS.KEY, …)` from a service in `main/ui/services/*.ts`. (4) Update `docs/architecture.md` §5. |
| A new `UIConfig` field | (1) Add the field with a JSDoc. (2) If boolean, add to `BOOLEAN_CONFIG_KEYS` in `config.service.ts`. (3) Add a default value in `config.service.ts` defaults. (4) Add an `<input data-config="...">` in `main/index.html` (and `data-conversion="true"` if it's a length). |
| A new view-data interface | Add an interface that mirrors the Ractive template's data context. Reference it via `RactiveInstance<NewViewData>` at the consumer site. |
| A new globals shim | Add an interface here, `declare let X: NewInstance` in the consumer file, and ensure the global is installed by a `<script>` tag in `main/index.html` before the `<script type="module">` block. |

## 8. Test coverage

Direct coverage: **none**. Type-only files cannot be unit-tested in isolation; the value-side `IPC_CHANNELS` constant has no behaviour to assert.

Indirect coverage:

- **TypeScript compile (`npm run build` / `tsc`)** is the primary "test" — every consumer site that mistypes a channel name or `UIConfig` key fails the build. CI runs `tsc` (see [`docs/architecture.md`](../../architecture.md) §6).
- **Playwright e2e in `tests/index.spec.ts`** exercises every channel in §3.2 transitively — startup performs `read-config`/`load-presets`, the import flow uses `background-start`/`-progress`/`-response`, the export flow uses `setPlacements`. A channel-string mismatch between renderer and main would surface as a hung promise or a missing handler error.

Coverage gap:

- **No fuzz / contract test for IPC payloads.** A renderer could send an `int` where main expects a `string` and the type system wouldn't catch it (TypeScript's view of `ipcRenderer.invoke` is loose). A `zod` schema per channel would close this.

## 9. Cross-references

- [`main__ui__index.ts.md`](./main__ui__index.ts.md) — companion: every consumer site for the types and the `IPC_CHANNELS` constant.
- [`docs/architecture.md`](../../architecture.md) §5 — the canonical IPC behavior table (this file is the type contract; that table is the behavior).
- [`docs/deep-dive/a/main.js.md`](../a/main.js.md) — the handler side. Every channel in §3.2 has a matching `ipcMain.on`/`handle` documented there.
- [`docs/deep-dive/g/main__index.html.md`](../g/main__index.html.md) — the HTML contract surface; `data-config="<UIConfig key>"` is the runtime mirror of §2.2.
- [`docs/deep-dive/d/main__ui__services__config.service.md`](../d/main__ui__services__config.service.md) — owns `READ_CONFIG`, `WRITE_CONFIG`, `BOOLEAN_CONFIG_KEYS`.
- [`docs/deep-dive/d/main__ui__services__preset.service.md`](../d/main__ui__services__preset.service.md) — owns `LOAD_PRESETS`, `SAVE_PRESET`, `DELETE_PRESET`; also unwraps `PresetConfig` (§5.4).
- [`docs/deep-dive/d/main__ui__services__nesting.service.md`](../d/main__ui__services__nesting.service.md) — owns `BACKGROUND_STOP`; consumes `NestingProgress`, `NestingResult`.
- Root `index.d.ts:24-62` — origin of `DeepNestConfig`; this file's `UIConfig` is its only direct extension.
