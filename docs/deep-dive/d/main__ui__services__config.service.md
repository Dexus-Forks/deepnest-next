# `main/ui/services/config.service.ts` — ConfigService

Owns the **persisted UI configuration** for the renderer process. Wraps the legacy
`electron-settings`–style `getSync` / `setSync` interface and round-trips state to
disk through IPC against the main process. Acts as the renderer-side source of
truth that is later mirrored into `window.config`, the `data-config` form
elements in `main/index.html`, and into `DeepNest.config(...)` (`main/deepnest.js`).

- File: [`main/ui/services/config.service.ts`](../../../main/ui/services/config.service.ts)
- Public API: `ConfigService` class, `createConfigService()` factory, `DEFAULT_CONFIG`,
  `BOOLEAN_CONFIG_KEYS`, `isValidPlacementType()`, `isValidUnitType()`.

## Role in the architecture

```
+---------------------------+      IPC (invoke)        +-------------------------------+
| ConfigService (renderer)  |  <-- read-config -->     | ipcMain.handle("read-config") |
|                           |  -- write-config -->     | ipcMain.handle("write-config")|
|                           |                          |   settings.json (userData)    |
+------------+--------------+                          +-------------------------------+
             |
             | getSync / setSync / resetToDefaultsSync
             v
   window.config  ----------->  updateForm()  --[data-config]-->  main/index.html
             |
             +------------>  DeepNest.config(values)  ->  main/deepnest.js
             |
             +------------>  ImportService / ExportService / parts-view / nest-view / sheet-dialog
```

## Public API surface

| Member | Purpose |
| --- | --- |
| `constructor(ipcRenderer?)` | Seeds instance properties with `DEFAULT_CONFIG`. IPC is optional for tests. |
| `initialize(): Promise<void>` | One-shot bootstrap. Calls `ipc.invoke("read-config")`, merges saved values, then locks `initialized = true`. |
| `getSync<K>(key?)` | Returns a single key (typed) or a shallow copy of the whole config. Compatible with the legacy `electron-settings` shape. |
| `setSync<K>(keyOrObject, value?)` | Single-key or partial-object update. Always re-syncs instance properties and fires-and-forgets a `write-config` invoke. |
| `resetToDefaultsSync()` | Restores `DEFAULT_CONFIG` while preserving `access_token` and `id_token`. Persists. |
| `getConversionFactor()` / `toSvgUnits()` / `fromSvgUnits()` | Unit math. mm uses `scale / 25.4`, inch uses `scale` directly. |
| `getScaleInUnits()` / `setScaleFromUnits()` | Convert between user-facing scale (mm or inch) and stored scale (always inches). |
| `static isBooleanKey(key)` | Mirrors `BOOLEAN_CONFIG_KEYS`. |
| `static create(ipc)` / `createConfigService(ipc)` | Async factory (constructs + initializes). Used by the composition root. |
| `isValidPlacementType()` / `isValidUnitType()` | External validators. Not used internally yet. |

## IPC channels

All channel names come from [`main/ui/types/index.ts` `IPC_CHANNELS`](../../../main/ui/types/index.ts).

| Channel | Direction | Payload sent | Payload received |
| --- | --- | --- | --- |
| `read-config` | renderer → main (`invoke`) | _none_ | `Partial<UIConfig>` (or `{}` if `settings.json` does not exist). The main handler also rewrites legacy `convert.deepnest.io` URLs to `converter.deepnest.app/convert` while reading. See [`main.js` ipcMain.handle("read-config")](../../../main.js). |
| `write-config` | renderer → main (`invoke`) | `string` — `JSON.stringify(this.config, null, 2)` | `void` |

Persistence is **fire-and-forget**: `setSync` triggers `persist()` and ignores rejections.
Failures are intentionally swallowed and expected to be surfaced at the application
level if needed.

## Data shapes

`UIConfig` is defined in [`main/ui/types/index.ts`](../../../main/ui/types/index.ts) and
extends `DeepNestConfig` from [`index.d.ts`](../../../index.d.ts). The fields actually
written:

| Key | Type | Default | Notes |
| --- | --- | --- | --- |
| `units` | `"mm" \| "inch"` | `"inch"` | UI display unit. Storage stays inches. |
| `scale` | `number` | `72` | SVG units per inch. mm conversions divide by `25.4`. |
| `spacing` | `number` | `0` | Part spacing in SVG units. |
| `curveTolerance` | `number` | `0.72` | Bezier flattening tolerance (native units). |
| `clipperScale` | `number` | `10000000` | Integer scale used by clipper-lib. |
| `rotations` | `number` | `4` | Rotation count for GA. |
| `threads` | `number` | `4` | Worker thread count. |
| `populationSize` | `number` | `10` | GA population. |
| `mutationRate` | `number` | `10` | GA mutation rate. |
| `placementType` | `"gravity" \| "box" \| "convexhull"` | `"box"` | Placement heuristic. |
| `mergeLines` | `boolean` | `true` | Optimize laser path on export. |
| `timeRatio` | `number` | `0.5` | 0 = material-only, 1 = laser-time-only. |
| `simplify` | `boolean` | `false` | Polygon simplification. |
| `dxfImportScale` | `number` | `1` | Multiplier applied to converted DXF parts. |
| `dxfExportScale` | `number` | `1` | Multiplier applied during DXF export sizing. |
| `endpointTolerance` | `number` | `0.36` | SVG endpoint matching tolerance. |
| `conversionServer` | `string` | `https://converter.deepnest.app/convert` (`DEFAULT_CONVERSION_SERVER`) | Conversion server URL. |
| `useSvgPreProcessor` | `boolean` | `false` | Run `@deepnest/svg-preprocessor` before import. |
| `useQuantityFromFileName` | `boolean` | `false` | `part.3.svg` → 3 copies. |
| `exportWithSheetBoundboarders` | `boolean` | `false` | Draw green sheet boundary. (Field name carries a typo — kept for backwards compatibility with persisted user `settings.json`.) |
| `exportWithSheetsSpace` | `boolean` | `false` | Spacing between sheets in multi-sheet export. |
| `exportWithSheetsSpaceValue` | `number` | `0.3937007874015748` (10 mm in inches) | Space distance, native units. |
| `access_token` / `id_token` | `string?` | _undefined_ | OAuth tokens; preserved across `resetToDefaultsSync` and preset loads. |

`BOOLEAN_CONFIG_KEYS` lists which fields are rendered as checkboxes:
`mergeLines`, `simplify`, `useSvgPreProcessor`, `useQuantityFromFileName`,
`exportWithSheetBoundboarders`, `exportWithSheetsSpace`.

## Round-trip with `index.html` `data-config`

Every config-bound input in [`main/index.html`](../../../main/index.html) carries a
`data-config="<key>"` attribute (e.g. `data-config="rotations"`,
`data-config="placementType"`). The mapping flows through
[`main/ui/index.ts`](../../../main/ui/index.ts):

1. `initializeServices()` (line 591 in `index.ts`) calls
   `await createConfigService(ipcRenderer)`. Boot path:
   `read-config` → merge → assign to instance → assign to `window.config`.
2. `updateForm(c)` walks `#config input, #config select`, reads `data-config`,
   and writes the current value to the DOM. `data-conversion="true"` inputs are
   divided by `scale` to display in user units.
3. `initializeConfigForm()` registers a `change` listener per input that:
   - Reads `data-config` to find the key.
   - For `scale` in mm mode, multiplies by `25.4` so storage stays inches.
   - For `data-conversion="true"` inputs, multiplies by `scale` (and `/25.4` if mm).
   - For `BOOLEAN_CONFIG_KEYS`, reads `.checked` instead of `.value`.
   - Calls `configService.setSync(key, val)` → `DeepNest.config(values)` → `updateForm(values)`.
4. The "Reset to defaults" button (`#setdefault`) preserves the OAuth tokens,
   calls `resetToDefaultsSync()`, and re-runs `updateForm` + `DeepNest.config`.

## Used by

Composition root: [`main/ui/index.ts`](../../../main/ui/index.ts) wires
`configService` into:

| Consumer | What it reads | Why |
| --- | --- | --- |
| `window.config` | Whole instance | Backwards-compat global for legacy `page.js` callers and inline templates. |
| `DeepNest.config(values)` (`main/deepnest.js`) | Whole config | Algorithm parameters (rotations, threads, scale, mergeLines, …). |
| `updateForm(values)` (`main/ui/index.ts`) | Whole config | Renders the `data-config` form. |
| `partsViewService` (`main/ui/components/parts-view.ts:159, 229, 529`) | `units`, `scale` | Display conversion in the parts list. |
| `nestViewService` (`main/ui/components/nest-view.ts:133, 439`) | `scale` | Render scaling in the nest viewport. |
| `sheetDialogService` (`main/ui/components/sheet-dialog.ts:74, 176`) | `units`, `scale` | Width/height entry for new sheets. |
| `importService` (via `setConfig`) | `conversionServer`, `useSvgPreProcessor`, `dxfImportScale`, `scale` | See [`main__ui__services__import.service.md`](./main__ui__services__import.service.md). |
| `exportService` (via `setConfig`) | `exportWithSheetBoundboarders`, `exportWithSheetsSpace*`, `mergeLines`, `curveTolerance`, `dxfExportScale`, `scale`, `units`, `conversionServer` | See [`main__ui__services__export.service.md`](./main__ui__services__export.service.md). |
| `presetService` consumers in `index.ts` | Whole config (passed to `savePreset`) | Snapshot the config under a named preset. |

## Security and architecture smells

- The renderer reads/writes `settings.json` indirectly through `ipc.invoke`,
  which is the right shape — but the rest of the renderer runs with
  `nodeIntegration: true` and `contextIsolation: false`
  ([`main.js:100-103`, `:167-170`, `:221-224`](../../../main.js)). Any improvement
  to the renderer security posture should preserve this service's IPC boundary
  rather than collapsing it back into direct `fs` access.
- Persistence errors are silently swallowed in `persist()` and `initialize()`.
  This is intentional ("application should handle this at a higher level if
  needed") but means a corrupted `settings.json` will boot the user with
  defaults without any feedback.
- `mergeConfig` and `setSync` use `Object.assign` to bypass strict typing for
  dynamic key assignment. This is contained and not exposed; consumers go
  through `getSync`/`setSync` only.
- The `exportWithSheetBoundboarders` typo cannot be renamed without a migration
  step — the key is part of users' on-disk `settings.json` and stored presets.

## Test surface

- Unit-testable without Electron: pass a mocked `IpcRenderer` (`{ invoke: jest.fn() }`)
  to the constructor.
- Should cover: defaults round-trip, legacy URL rewrite (handled in main but
  shaped by the renderer string), reset preserves tokens, mm/inch scale
  conversions, boolean key detection.

## References

- [`main/ui/services/config.service.ts`](../../../main/ui/services/config.service.ts)
- [`main/ui/types/index.ts`](../../../main/ui/types/index.ts) (`UIConfig`,
  `ConfigObject`, `IPC_CHANNELS`)
- [`main.js`](../../../main.js) — `read-config` / `write-config` handlers
- [`main/index.html`](../../../main/index.html) — `data-config` form bindings
- [`main/ui/index.ts`](../../../main/ui/index.ts) — composition root
- [`main/deepnest.js`](../../../main/deepnest.js) — `DeepNest.config(values)` consumer
