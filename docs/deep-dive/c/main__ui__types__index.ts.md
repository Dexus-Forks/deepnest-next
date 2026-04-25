# Deep Dive — `main/ui/types/index.ts`

> **Group**: C (UI renderer composition) · **Issue**: DEE-14 · **Parent**: [DEE-11](../../../docs/index.md) · **Author**: Paige · **Generated**: 2026-04-25
>
> Per-file deep dive following the [DEE-11 shared template](../../../docs/index.md). Companion file: [`main__ui__index.ts.md`](./main__ui__index.ts.md).

| Field | Value |
|---|---|
| Path | [`main/ui/types/index.ts`](../../../main/ui/types/index.ts) |
| Lines | 316 |
| Language / module | TypeScript (ambient + runtime exports) |
| Compiled to | `build/ui/types/index.js` (only the `IPC_CHANNELS` constant survives compilation; everything else is type-only) |
| Layer | Tier A — visible renderer / type & contract definitions |

---

## 1. Purpose

`main/ui/types/index.ts` is a **two-faced contract surface**:

1. **Type extension layer.** It re-exports the canonical core types from root [`index.d.ts`](../../../index.d.ts) and extends them with UI-only concerns (`UIConfig`, `ConfigObject`, view-data shapes, Ractive instance generic, etc.). The root file is the engine contract; this file is the renderer contract.
2. **Runtime IPC contract.** It exports `IPC_CHANNELS` — the only place where channel-name strings are declared. Every IPC site in the renderer (and, by convention, the main process) imports from here. Renaming a channel is a one-line edit; that's the entire point.

Treat this file like an API spec. **Every change is breaking** because every consumer is a different process or module compiled at different times. Bump the cross-references when a payload shape or channel name changes.

---

## 2. Public surface — type & value exports

### 2.1 Re-exports (passthrough from `index.d.ts`)

| Symbol | Source | Notes |
|---|---|---|
| `DeepNestConfig` | `index.d.ts` | Core algorithm + UX config (units, scale, spacing, rotations, populationSize, mutationRate, placementType, mergeLines, timeRatio, simplify, dxfImport/Export scale, endpointTolerance, conversionServer). 17 fields. |
| `SheetPlacement` | `index.d.ts` | `{filename, id, rotation, source, x, y}`. One placed copy of one part. |
| `NestingResult` | `index.d.ts` | `{area, fitness, index, mergedLength, selected, placements: [{sheet, sheetid, sheetplacements: SheetPlacement[]}]}`. Output of one GA individual's evaluation. |
| `PlacementType` | `index.d.ts` | `"gravity" \| "box" \| "convexhull"`. |
| `UnitType` | `index.d.ts` | `"mm" \| "inch"`. |
| `Bounds` | `index.d.ts` | `{x, y, width, height}`. |
| `PolygonPoint` | `index.d.ts` | `{x, y, marked?, exact?}`. |
| `Polygon` | `index.d.ts` | `Array<PolygonPoint>` extended with `id?, source?, children?, parent?, filename?`. |
| `Part` | `index.d.ts` | `{polygontree, svgelements, bounds, area, quantity, filename, sheet?, selected?}`. |

> ⚠ **Hazard.** `Part`, `Polygon`, and `NestingResult` define both engine state (read by `main/deepnest.js`, `main/background.js`) and UI state (rendered by `partsViewService` / `nestViewService`). Adding a field affects both sides. If the field is renderer-only, prefer to extend on the UI side (see `SelectableNestingResult` for the pattern).

### 2.2 Constants

| Symbol | Type | Value | Where used |
|---|---|---|---|
| `DEFAULT_CONVERSION_SERVER` | `string` | `"https://converter.deepnest.app/convert"` | `services/config.service.ts` `DEFAULT_CONFIG.conversionServer`. The legacy `convert.deepnest.io` URL is rewritten to this on `read-config` (see `main.js` lines 354–356). |
| `IPC_CHANNELS` | `Readonly<Record<string, string>>` (via `as const`) | See [§3](#3-ipc-channel-contract) | All renderer-side IPC sites import `IPC_CHANNELS.<KEY>` rather than literal strings. |

### 2.3 `UIConfig extends DeepNestConfig`

Adds 7 UI-only fields on top of the 17 core fields:

| Field | Type | Purpose | Default (from `services/config.service.ts`) |
|---|---|---|---|
| `access_token` | `string?` | OAuth access token for authenticated features | `undefined` |
| `id_token` | `string?` | OAuth ID token for user identification | `undefined` |
| `useSvgPreProcessor` | `boolean` | Enable `@deepnest/svg-preprocessor` cleanup pass on import | `false` |
| `useQuantityFromFileName` | `boolean` | Parse `part.3.svg` filename suffix as quantity | `false` |
| `exportWithSheetBoundboarders` | `boolean` | Include sheet boundary rectangles in exports (note: misspelled `boundboarders` is intentional — the persisted key matches) | `false` |
| `exportWithSheetsSpace` | `boolean` | Add spacing between sheets in multi-sheet exports | `false` |
| `exportWithSheetsSpaceValue` | `number` | Space between sheets in SVG units (inches; default `0.3937…` = 10mm) | `0.3937007874015748` |

> 🔒 **Persisted-shape contract.** `UIConfig` is what gets `JSON.stringify`'d into `userData/settings.json` (via `IPC_CHANNELS.WRITE_CONFIG`) and into named presets (via `IPC_CHANNELS.SAVE_PRESET`). Renaming or removing a key is a migration event for every existing user — keep `services/config.service.ts#DEFAULT_CONFIG` aligned and consider a one-time read-side rewrite (the `convert.deepnest.io` precedent in `main.js`).

### 2.4 `ConfigObject extends UIConfig`

Adds the synchronous getter/setter façade implemented by `ConfigService`. This is what `window.config` is typed as.

```ts
getSync<K extends keyof UIConfig>(key?: K):
  K extends keyof UIConfig ? UIConfig[K] : UIConfig;
setSync<K extends keyof UIConfig>(
  keyOrObject: K | Partial<UIConfig>,
  value?: UIConfig[K]
): void;
resetToDefaultsSync(): void;
```

> Note: this is a **shadowing** generic of the `ConfigObject` declared in root `index.d.ts` (which is parameterised over `DeepNestConfig`, not `UIConfig`). The renderer-side overload widens the type to include UI-only keys. Both surfaces need to track each other; if you add a `UIConfig` field, the engine-side `index.d.ts` does not need to know about it.

### 2.5 View-data interfaces (Ractive bindings)

These describe the data context Ractive templates see. They drive `RactiveInstance<T>` typing.

| Interface | Methods / fields | Used by |
|---|---|---|
| `PartsViewData` | `parts: Part[]`, `imports: ImportedFile[]`, `getSelected()`, `getSheets()`, `serializeSvg(svg)`, `partrenderer(part)` | `components/parts-view.ts` (Ractive template `#parts`) |
| `NestViewData` | `nests: SelectableNestingResult[]`, `getSelected()`, `getNestedPartSources(n)`, `getColorBySource(id)`, `getPartsPlaced()`, `getUtilisation()`, `getTimeSaved()` | `components/nest-view.ts` (Ractive template for nest results) |

A change to either interface must be matched by a change to the corresponding Ractive template (`<input on-click="@.getSelected()">`-style references). There is no compile-time check between the two — Ractive templates are strings.

### 2.6 Other UI extensions

| Symbol | Notes |
|---|---|
| `SvgPanZoomInstance` | Minimal surface of the vendored `svgpanzoom.js` (`main/util/svgpanzoom.js`). Captured here because import-side preview relies on it. |
| `ImportedFile` | `{filename, svg, selected?, zoom?}` — one row in the imports list. Stored on `DeepNest.imports[]`. |
| `NestingProgress` | `{index, progress}`. `progress < 0` means done (matches `main.js` background-progress passthrough). |
| `SelectableNestingResult` | Extends `NestingResult` with `selected: boolean` + `utilisation: number` (the latter is computed for the result panel header). |
| `DeepNestInstance` | Renderer-side typing of `window.DeepNest`. Mirrors the legacy class shape — `imports`, `parts`, `nests`, `working`, `importsvg(...)`, `config(...)`, `start(...)`, `stop()`, `reset()`. |
| `RactiveInstance<T>` | Generic Ractive surface — `update`, `get`, `set`, `on`. `T` is the view-data type. The root `index.d.ts` declares a non-generic version for `window.nest`; this generic version is the one services should use. |
| `ThrottleOptions` | `{leading?, trailing?}`. Used by `parts-view`'s sort/zoom throttle. |
| `FileFilter` | `{name, extensions: string[]}`. Used by `dialog.showOpenDialog` and `dialog.showSaveDialogSync` calls in `services/import.service.ts` and `services/export.service.ts`. |
| `MergedSegment` | `{x, y}`. Endpoint of a merged laser line (used for "merge lines" optimization display). |
| `SheetPlacementWithMerged` | Extends `SheetPlacement` with `mergedSegments?: [MergedSegment, MergedSegment][]`. Pairs of points → line-segment overlay. |
| `PresetConfig` | `{ [presetName: string]: string }` (each value is a `JSON.stringify(UIConfig)`). The exact shape of `userData/presets.json` after `IPC_CHANNELS.SAVE_PRESET`. |
| `IpcChannel` | `(typeof IPC_CHANNELS)[keyof typeof IPC_CHANNELS]` — discriminated union of all 10 channel string-literals. |
| `SvgParserInstance` | Renderer-side typing of `window.SvgParser`. Surface mirrors the legacy class; subset of the methods is used by `services/export.service.ts` and `services/import.service.ts`. |
| `ExtendedWindow` | Detailed `Window` surface for renderer modules that want the typed shape without relying on the ambient augmentation in root `index.d.ts`. **Not currently consumed** — kept for future strict-mode tightening. |

---

## 3. IPC channel contract

This is the canonical IPC table for the renderer. **Cross-reference**: `architecture.md` §5 and Group A's `main.js` deep dive (DEE-12) — the main-process side of every channel.

### 3.1 IPC channel table

> Direction shorthand: **R→M** = renderer to main (request); **M→R** = main to renderer (push); **bg→M→R** = background renderer to main, forwarded to main renderer (and vice-versa).

| Constant | Channel name | Direction | Kind | Payload shape | Sender (renderer side) | Handler (main side) |
|---|---|---|---|---|---|---|
| `LOAD_PRESETS` | `"load-presets"` | R→M (request/response) | `ipcMain.handle` / `ipcRenderer.invoke` | `()` → `Record<string, string>` (per `PresetConfig`) | `services/preset.service.ts` line 76 (`loadPresets()`) | `main.js` line 378–380 → `presets.js#loadPresets` |
| `SAVE_PRESET` | `"save-preset"` | R→M (request/response) | `ipcMain.handle` / `ipcRenderer.invoke` | `(name: string, config: UIConfig)` → `void` | `services/preset.service.ts` line 145 (`savePreset()`) | `main.js` line 382–384 → `presets.js#savePreset` |
| `DELETE_PRESET` | `"delete-preset"` | R→M (request/response) | `ipcMain.handle` / `ipcRenderer.invoke` | `(name: string)` → `void` | `services/preset.service.ts` line 177 (`deletePreset()`) | `main.js` line 386–388 → `presets.js#deletePreset` |
| `READ_CONFIG` | `"read-config"` | R→M (request/response) | `ipcMain.handle` / `ipcRenderer.invoke` | `()` → `UIConfig` (or `{}` on first run; URL rewrite of `convert.deepnest.io` → `converter.deepnest.app` is done in main on read) | `services/config.service.ts` line 147 (`initialize()`) | `main.js` line 353–357 |
| `WRITE_CONFIG` | `"write-config"` | R→M (request/response) | `ipcMain.handle` / `ipcRenderer.invoke` | `(stringifiedConfig: string)` → `void` (renderer is responsible for `JSON.stringify`; main does `fs.writeFileSync` verbatim) | `services/config.service.ts` line 301 (`save()`) | `main.js` line 358–360 |
| `BACKGROUND_START` | `"background-start"` | R→M→bg (fire-and-forget) | `ipcRenderer.send` / `ipcMain.on` | `BackgroundStartPayload` (see [§3.3](#33-backgroundstart-payload)) | `main/deepnest.js` (legacy) — **not** the modular UI services | `main.js` line 302–311; main forwards to first idle bg window (`isBusy=false`) |
| `BACKGROUND_RESPONSE` | `"background-response"` | bg→M→R (push) | `ipcRenderer.on` / `ipcMain.on` | Placement result (engine-internal — see `main/background.js`) | `main/deepnest.js` (legacy) | `main.js` line 313–326; main pairs sender to its window slot, clears `isBusy` |
| `BACKGROUND_PROGRESS` | `"background-progress"` | bg→M→R (push) | `ipcRenderer.on` / `ipcMain.on` | `NestingProgress` (`{index: number, progress: number}`; negative = done) | **`main/ui/index.ts` line 514** (`initializeBackgroundProgress()`) — the only direct IPC subscription in the modular UI | `main.js` line 328–335 |
| `BACKGROUND_STOP` | `"background-stop"` | R→M (fire-and-forget) | `ipcRenderer.send` / `ipcMain.on` | `()` | `services/nesting.service.ts` lines 488, 557 | `main.js` line 337–349; destroys all bg windows then re-creates them |
| `SET_PLACEMENTS` | `"setPlacements"` | R→M (fire-and-forget) | `ipcRenderer.send` / `ipcMain.on` | `payload: unknown` (engine-defined) | `main/deepnest.js` / engine | `main.js` line 370–372; stashes on `global.exportedPlacements` for remote inspection |

> **10 channels declared in `IPC_CHANNELS`**. The main process exposes a few more (`login-success`, `purchase-success`, `test`, `get-notification-data`, `notification-data`, `close-notification`) that are **not** in this constant — those are scoped to the OAuth flow and the notification window, which the modular UI doesn't currently touch. If you add a renderer-side handler for any of those, lift the channel name into `IPC_CHANNELS` first.

### 3.2 Channels declared but not subscribed by the modular UI

`BACKGROUND_START`, `BACKGROUND_RESPONSE`, and `SET_PLACEMENTS` are declared in this constant for completeness, but the modular UI services (`main/ui/services/*`) never call `ipcRenderer.send(BACKGROUND_START)` or `ipcRenderer.on(BACKGROUND_RESPONSE)` directly. Those channels are owned by the legacy `main/deepnest.js` GA orchestrator (`architecture.md` §3.3 / ADR-002). The modular `NestingService` only sends `BACKGROUND_STOP`; everything else flows through the legacy code path.

This is deliberate — the GA lives in legacy until the engine port lands. Don't introduce direct background-IPC calls from a new TypeScript service; route through `DeepNest.start(...)` instead.

### 3.3 `BACKGROUND_START` payload

This shape is **not** declared in `types/index.ts` because the only producer is `main/deepnest.js` and the only consumer is `main/background.js` (the hidden renderer). Documented here for cross-reference (Group B's `deepnest.js` deep dive owns the canonical shape):

```
{
  individual: { placement: number[], rotation: number[] },
  sheets: Polygon[],
  ids: number[],
  sources: number[],
  children: Polygon[][],
  filenames: (string | null)[],
  sheetids: number[],
  sheetsources: number[],
  sheetchildren: Polygon[][],
  config: DeepNestConfig
}
```

If a modular service ever needs to send `BACKGROUND_START` directly, lift this into `types/index.ts` as `BackgroundStartPayload` and reference here.

### 3.4 Channel additions checklist

When you add a channel:

1. **Add the key to `IPC_CHANNELS` in this file**, with `as const` preserved at the bottom.
2. **Update the `IpcChannel` type** — automatic if you keep `as const`.
3. **Add the renderer-side caller** (preferred: in a service under `main/ui/services/`; only put it directly in `main/ui/index.ts` if it's UI-only with no service home).
4. **Add the main-side handler** in `main.js`. Use `ipcMain.handle` for request/response, `ipcMain.on` for fire-and-forget or push.
5. **Document payload shape** in this section (table + a payload type if it's complex enough to deserve one).
6. **Add to `architecture.md` §5** so the canonical IPC table stays accurate.

---

## 4. Dependencies

### 4.1 Inbound (who imports this file)

Every TypeScript module under `main/ui/` imports something from here. Verified imports as of 2026-04-25:

| Importer | Imports |
|---|---|
| `main/ui/index.ts` | 8 type imports (`UIConfig`, `ConfigObject`, `DeepNestInstance`, `SvgParserInstance`, `RactiveInstance`, `NestViewData`, `NestingProgress`, `PartsViewData`) + `IPC_CHANNELS` |
| `main/ui/services/config.service.ts` | `UIConfig`, `ConfigObject`, `PlacementType`, `UnitType`, `DEFAULT_CONVERSION_SERVER`, `IPC_CHANNELS` |
| `main/ui/services/preset.service.ts` | `IPC_CHANNELS`, `UIConfig`, `PresetConfig` |
| `main/ui/services/import.service.ts` | `UIConfig`, `ImportedFile`, `Part`, `RactiveInstance`, `PartsViewData`, `FileFilter` |
| `main/ui/services/export.service.ts` | `UIConfig`, `SvgParserInstance`, `DeepNestInstance`, `SelectableNestingResult`, `MergedSegment`, `SheetPlacementWithMerged` |
| `main/ui/services/nesting.service.ts` | `IPC_CHANNELS`, `RactiveInstance`, `NestViewData`, `SelectableNestingResult`, `DeepNestInstance` |
| `main/ui/components/*` | View-data interfaces + the `Ractive`-related types they bind to |

### 4.2 Outbound

Type-only re-exports from [`../../../index.d.ts`](../../../index.d.ts). No runtime dependencies. No imports from any sibling under `main/ui/`.

---

## 5. Invariants & gotchas

1. **`as const` is required.** The `IPC_CHANNELS` constant is `as const`; this is what makes `IpcChannel` a string-literal union. Removing `as const` widens every value to plain `string` and silently breaks the discriminated-union behaviour at every call site.
2. **`exportWithSheetBoundboarders` typo is on the wire.** Misspelling preserved because that's the persisted key in `userData/settings.json` for every existing user. Fixing it requires a migration on the main side — see the `convert.deepnest.io` URL-rewrite precedent in `main.js`.
3. **`UIConfig` is doubly-typed.** The same shape is described here (renderer side) and partially in `index.d.ts` (engine side, narrower as `DeepNestConfig`). Engine code only sees `DeepNestConfig`; renderer sees `UIConfig`. Adding a UI-only field here does **not** require an engine-side change.
4. **`RactiveInstance<T>` shadows root.** Root `index.d.ts` declares a non-generic `RactiveInstance` for `window.nest`. The generic version here widens the API surface (adds `get`/`set`/`on`). If you reference `RactiveInstance` from a renderer module, make sure you're getting the generic version (this file), not the root one.
5. **Not every `IPC_CHANNELS` entry has a renderer-side caller.** See [§3.2](#32-channels-declared-but-not-subscribed-by-the-modular-ui). Don't assume the constant is exhaustive of "what the renderer does" — it's exhaustive of "what the modular code calls", with three legacy passthroughs included for reference.
6. **`SelectableNestingResult` is a UI overlay**, not what the engine produces. The engine produces `NestingResult` (with `selected: boolean` already, from root `index.d.ts`) — `utilisation: number` is the renderer extension. `nest-view` is the only consumer.
7. **`PresetConfig` values are JSON strings, not `UIConfig` objects.** The wire format double-encodes: `presets.json` is `Record<name, JSON.stringify(UIConfig)>`. Don't `JSON.parse` once and assume you get the config — `services/preset.service.ts` does the second `JSON.parse`.
8. **`ExtendedWindow` is unused.** It exists for future strict-mode tightening; the actual ambient augmentation is in root `index.d.ts`. If you start consuming `ExtendedWindow`, you must also stop relying on the ambient `Window` augmentation — they overlap.
9. **`DeepNestInstance` here vs. in root.** The root `index.d.ts` version has `parts: Part[]`, `nests: NestingResult[]`. This file's version adds `imports: ImportedFile[]` and replaces `nests` with `nests: SelectableNestingResult[]`. The renderer version is a superset of the engine's contract — keep it that way.

---

## 6. Known TODOs

In-source: **none**. No `TODO` / `FIXME` / `HACK` markers in this file.

Implicit (called out elsewhere in the docs):

- **`exportWithSheetBoundboarders` rename** — flagged in `architecture.md` §11 indirectly (under "Known Risks") and in this deep dive's invariants. Migrating requires read-side rewriting in `main.js` and a deprecation period.
- **`BACKGROUND_START` payload type** — currently undocumented in TypeScript. Lifting it into a named interface here would let the modular `NestingService` stop relying on the legacy GA path. This is gated on the engine port (`architecture.md` ADR-002 successor).

---

## 7. Extension points

1. **Add a new IPC channel.**
   - Add a key to `IPC_CHANNELS` (line 267).
   - Document payload + direction in [§3](#3-ipc-channel-contract).
   - Implement renderer side in the relevant service (or `main/ui/index.ts` if UI-only).
   - Implement main-process handler in `main.js`.
   - Update `architecture.md` §5.
2. **Add a new `UIConfig` field.**
   - Append to `UIConfig` (line 25).
   - Update `DEFAULT_CONFIG` in `services/config.service.ts`.
   - If checkbox: append the key to `BOOLEAN_CONFIG_KEYS` in the same service file.
   - Add the form input to `main/index.html` with `data-config="<key>"` (and `data-conversion="true"` if scaled).
3. **Add a new view-data interface for a new Ractive component.**
   - Define the interface here next to `PartsViewData` / `NestViewData`.
   - Type the component's Ractive instance as `RactiveInstance<NewData>`.
4. **Promote a legacy IPC channel into the modular path.**
   - Today `BACKGROUND_START` / `BACKGROUND_RESPONSE` / `SET_PLACEMENTS` are legacy passthroughs (see [§3.2](#32-channels-declared-but-not-subscribed-by-the-modular-ui)).
   - To consume them from a TypeScript service: lift the payload into a named interface here, document, then call `ipcRenderer.send / on` from the service. This is part of the eventual engine port (`architecture.md` ADR-002 successor).
5. **Add a new global on `window`.**
   - **Don't** (ADR-005). If you must: declare on `Window` in root `index.d.ts`, document in this file's `ExtendedWindow`, and update `architecture.md` ADR-005.

---

## 8. Test coverage status

- **Unit tests**: none. Type-only declarations don't run; they're erased at compile time. The only runtime export (`IPC_CHANNELS` + `DEFAULT_CONVERSION_SERVER`) is exercised indirectly by every IPC test path.
- **Compile-time checks**: `tsc --strict` (`tsconfig.json`) covers every importer of this file. A breaking type change here surfaces as a compiler error in the consumer service.
- **E2E tests**: `tests/index.spec.ts` exercises `IPC_CHANNELS.READ_CONFIG`, `WRITE_CONFIG`, `LOAD_PRESETS`, `SAVE_PRESET`, `DELETE_PRESET`, `BACKGROUND_PROGRESS`, `BACKGROUND_STOP` indirectly via real Electron + Playwright. Pure renderer types like `MergedSegment` or `SheetPlacementWithMerged` are not E2E-asserted.
- **Coverage gap**: no contract tests against the main-process handlers. A channel-name typo (e.g. `BACKGROUND_PORGRESS`) would compile cleanly and only surface as "progress bar doesn't move" in manual smoke. Mitigated today by the small surface area + every consumer importing `IPC_CHANNELS` instead of literal strings.

---

## 9. Cross-references

- **Sibling deep dive**: [`main__ui__index.ts.md`](./main__ui__index.ts.md) — the single direct subscriber of `BACKGROUND_PROGRESS` and the only place outside services that touches `IPC_CHANNELS`.
- **Group A** (DEE-12): `main.js` deep dive — main-process side of every channel in [§3.1](#31-ipc-channel-table).
- **Group A** (DEE-12): `presets.js` — handler implementation for `LOAD_PRESETS` / `SAVE_PRESET` / `DELETE_PRESET`.
- **Group B** (DEE-13): `main/deepnest.js` — owns `BACKGROUND_START` / `BACKGROUND_RESPONSE` send/receive (legacy GA orchestrator).
- **Group B** (DEE-13): `main/background.js` — far end of `BACKGROUND_START`; emits `BACKGROUND_RESPONSE` and `BACKGROUND_PROGRESS`.
- **Group D** (DEE-15): per-service deep dives — `config.service.ts` (`READ_CONFIG`/`WRITE_CONFIG`), `preset.service.ts` (`LOAD_PRESETS`/`SAVE_PRESET`/`DELETE_PRESET`), `nesting.service.ts` (`BACKGROUND_STOP`).
- **Architecture context**: `docs/architecture.md` §5 (canonical IPC table), §3.2 (renderer types), ADR-005 (window globals), ADR-007 (TS scope).
- **Root types**: [`index.d.ts`](../../../index.d.ts) — engine-side contract; this file extends it.
