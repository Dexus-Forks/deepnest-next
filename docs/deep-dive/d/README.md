# Deep dive — Group D: UI services

> Per-file deep dives for the renderer-side service layer in
> `main/ui/services/`. These are the TypeScript classes the composition
> root in [`main/ui/index.ts`](../../../main/ui/index.ts) wires together
> for the visible Electron renderer. Sibling of [DEE-11](../../../) parent
> issue and [DEE-15](../../../) tracking issue.

## Files in this group

| File | Role | Deep dive |
|---|---|---|
| `main/ui/services/config.service.ts` | Persisted UI config (read/write via `read-config` / `write-config` IPC, `data-config` form round-trip). | [main__ui__services__config.service.md](./main__ui__services__config.service.md) |
| `main/ui/services/preset.service.ts` | Preset CRUD over `load-presets` / `save-preset` / `delete-preset` IPC. Backed by [`presets.js`](../../../presets.js) on the main side. | [main__ui__services__preset.service.md](./main__ui__services__preset.service.md) |
| `main/ui/services/import.service.ts` | SVG / DXF / DWG / EPS / PS import path. SVG goes direct, others round-trip through the conversion server. | [main__ui__services__import.service.md](./main__ui__services__import.service.md) |
| `main/ui/services/export.service.ts` | Nesting result export to SVG / DXF / JSON. Builds the SVG document from `SelectableNestingResult.placements`. | [main__ui__services__export.service.md](./main__ui__services__export.service.md) |
| `main/ui/services/nesting.service.ts` | UI ↔ GA / NFP background bridge. Owns the start / stop / back lifecycle and view-switching. | [main__ui__services__nesting.service.md](./main__ui__services__nesting.service.md) |

## How these services are loaded

All five are TypeScript classes compiled out of `main/ui/services/*.ts`
into the renderer module bundle. The composition root
[`main/ui/index.ts`](../../../main/ui/index.ts) orchestrates them on
`DOMContentLoaded`:

1. `initializeServices()` (line 591) creates the **async-initialized**
   `ConfigService` (factory awaits `read-config`) and assigns it to
   `window.config`. Then it instantiates `PresetService` and pushes the
   live config into `DeepNest.config(...)` and `updateForm(...)`.
2. `initializeComponents()` (line 608) instantiates the four UI components
   (`navigation`, `parts-view`, `nest-view`, `sheet-dialog`) and the
   remaining three services (`import`, `export`, `nesting`), threading
   the same `configService` instance and the global `DeepNest` /
   `SvgParser` references through their constructor options.
3. UI handlers (preset modal, config form change handlers, drag/drop,
   message close, parts-resize, version info, import button, export
   buttons) are wired afterwards.
4. `loadInitialFiles()` runs `importService.loadNestDirectoryFiles()` so
   any `*.svg` files dropped into `NEST_DIRECTORY` at boot become parts
   automatically.

`window.config` and `window.nest` are set as backwards-compat globals for
legacy templates / inline handlers. `window.DeepNest` and
`window.SvgParser` are populated **outside** of TypeScript by the legacy
`<script>` loader in [`main/index.html`](../../../main/index.html); the
services here read those globals through DI parameters typed in
[`main/ui/types/index.ts`](../../../main/ui/types/index.ts).

## Dependencies (inbound to this group)

```
                +--- window.config -- (legacy templates / inline handlers)
                |
ConfigService --+--- DeepNest.config(values) --- main/deepnest.js (GA loop)
                |
                +--- updateForm()        -- main/ui/index.ts
                |
                +--- partsViewService    -- main/ui/components/parts-view.ts
                +--- nestViewService     -- main/ui/components/nest-view.ts
                +--- sheetDialogService  -- main/ui/components/sheet-dialog.ts
                +--- importService.setConfig
                +--- exportService.setConfig

PresetService --- main/ui/index.ts (initializePresetModal save/load/delete handlers)

ImportService --- main/ui/index.ts (#import button + loadInitialFiles)
                  + parts-view Ractive (passed via setRactive)

ExportService --- main/ui/index.ts (#exportjson / #exportsvg / #exportdxf)
                  + NestingService.saveJsonFn (auto-snapshot on stop)

NestingService -- main/ui/index.ts (initializeBackgroundProgress -> #progressbar)
                  + #startnest / #stopnest / #back via bindEventHandlers()
```

`main/ui/components/*` consumes `ConfigService` (via the `ConfigObject`
interface). `parts-view`, `nest-view`, and `sheet-dialog` do **not**
import the import / export / nesting services directly — those live
behind buttons and the composition root only.

## Dependencies (outbound from this group)

Every service file imports only from `../types/index.js` and
`../utils/ui-helpers.js`:

| File | Imports |
|---|---|
| `config.service.ts` | `DEFAULT_CONVERSION_SERVER`, `IPC_CHANNELS` from `../types/index.js`; `UIConfig`, `ConfigObject`, `PlacementType`, `UnitType` types. |
| `preset.service.ts` | `IPC_CHANNELS`, `DEFAULT_CONVERSION_SERVER`, `UIConfig`, `PresetConfig` from `../types/index.js`. |
| `import.service.ts` | `DEFAULT_CONVERSION_SERVER` from `../types/index.js`; `message` from `../utils/ui-helpers.js`; type-only imports for `UIConfig`, `Part`, `DeepNestInstance`, `RactiveInstance`, `PartsViewData`. |
| `export.service.ts` | `DEFAULT_CONVERSION_SERVER` from `../types/index.js`; `message` from `../utils/ui-helpers.js`; type-only imports for `UIConfig`, `DeepNestInstance`, `SelectableNestingResult`, `Part`, `SvgParserInstance`. |
| `nesting.service.ts` | `IPC_CHANNELS` from `../types/index.js`; `message` from `../utils/ui-helpers.js`; type-only imports for `DeepNestInstance`, `SelectableNestingResult`, `RactiveInstance`, `NestViewData`. |

Every Electron / Node dependency (`fs`, `path`, `@electron/remote`,
`form-data`, `axios`, `@deepnest/svg-preprocessor`, `electron.ipcRenderer`)
is injected through constructor options or `set*` setters. This is
deliberate: the services are unit-testable without an Electron host.

## IPC channel summary

All channel names come from
[`main/ui/types/index.ts` `IPC_CHANNELS`](../../../main/ui/types/index.ts).
This table answers "who owns what channel" for the Group D services:

| Channel | Direction | Owned by | Counterpart |
|---|---|---|---|
| `read-config` | renderer → main (`invoke`) | `ConfigService.initialize()` | `ipcMain.handle("read-config")` in `main.js` |
| `write-config` | renderer → main (`invoke`) | `ConfigService.persist()` | `ipcMain.handle("write-config")` in `main.js` |
| `load-presets` | renderer → main (`invoke`) | `PresetService.loadPresets()` | `ipcMain.handle("load-presets")` → `presets.js` |
| `save-preset` | renderer → main (`invoke`) | `PresetService.savePreset()` | `ipcMain.handle("save-preset")` → `presets.js` |
| `delete-preset` | renderer → main (`invoke`) | `PresetService.deletePreset()` | `ipcMain.handle("delete-preset")` → `presets.js` |
| `background-stop` | renderer → main (`send`) | `NestingService.stopNesting()`, `NestingService.goBack()` | `ipcMain.on("background-stop")` destroys background windows |
| `background-start` | renderer → main → background renderer (`send`) | **`main/deepnest.js DeepNest.start()`** (not the service directly) | `main.js` routes to a non-busy `backgroundWindows[i]` |
| `background-progress` | background → main → renderer | Subscribed by `main/ui/index.ts initializeBackgroundProgress()` | Sent by `main/background.js` during NFP / placement phases |
| `background-response` | background → main → renderer | **Subscribed by `main/deepnest.js`** (not the service) | Sent by `main/background.js` after each placement |
| `setPlacements` | renderer → main (`send`) | `main/deepnest.js` re-emit | `main.js ipcMain.on("setPlacements")` stores `global.exportedPlacements` |

The dotted line is important: `NestingService` does **not** send
`background-start` or receive `background-response` directly. It calls
`DeepNest.start(progressCb, displayCb)` and lets the legacy
`main/deepnest.js` GA loop drive the channel; the service's role is the
UI-side lifecycle (cache wipe, button states, view switching, JSON
snapshot on stop). See
[`nesting.service.md`](./main__ui__services__nesting.service.md) for the
payload shape sent by `main/deepnest.js:1292-1305`.

## Security smell summary (`nodeIntegration: true`)

The Electron windows in [`main.js:100-103`, `:167-170`, `:221-224`](../../../main.js)
all set `nodeIntegration: true`, `contextIsolation: false`, and
`enableRemoteModule: true`. Inside Group D this enables the following
work to happen in the renderer that should arguably live in main:

| Service | Renderer-side work that warrants moving to main |
|---|---|
| `config.service.ts` | None — IPC boundary is correct. |
| `preset.service.ts` | None — IPC boundary is correct. The legacy URL migration is duplicated in renderer + main; consider keeping only the main-side rewrite. |
| `import.service.ts` | **Direct `fs.readFile` / `readFileSync` / `readdirSync`** in the renderer. **Outbound HTTP** to the conversion server. **`@electron/remote getGlobal("NEST_DIRECTORY")`**. Error messages interpolate user-controlled `error_id` into HTML before passing to `message(..., true)`. |
| `export.service.ts` | **Direct `fs.writeFileSync`** for SVG / DXF / JSON outputs. **Outbound HTTP** for DXF round-trip. Same HTML-interpolation risk on conversion-server error responses. |
| `nesting.service.ts` | **Direct `fs.existsSync` / `readdirSync` / `unlinkSync` / `rmdirSync`** to wipe `./nfpcache`. Cwd-relative path is fragile across packaged builds. |

Per-doc `Security and architecture smells` sections expand each item.

## Per-file template

Each deep dive uses the `DEE-11` shared template (see
[group B README](../b/README.md#per-file-template) for the canonical list):

1. **Purpose** — opening paragraph
2. **Public surface** — `Public API surface` table
3. **IPC / global side-effects** — `IPC channels` section
4. **Dependencies (in / out)** — `Used by` (in) and the inbound/outbound
   tables in this README (out)
5. **Invariants & gotchas** — `Security and architecture smells`
6. **Known TODOs** — none in source (`// todo:` / `// FIXME` not present
   in any of the 5 files at the time of this scan)
7. **Extension points** — DI'd dependencies are the primary extension
   surface; each `set*` setter and the constructor `options` parameter
   are explicit injection points. See per-file `Public API surface`
   tables.
8. **Test coverage** — `Test surface` section. None of these services
   currently have a dedicated Playwright spec; they are exercised
   indirectly via `tests/e2e/config-tab.spec.ts` and import / export /
   nesting flows. Unit tests are not yet wired up but each service is
   already DI'd for that purpose.

## Acceptance criteria coverage

For each of the 5 files in scope, the corresponding doc covers:

- ✅ Purpose, public API, and lifecycle
- ✅ IPC channels (sent and received) with payload shape, linked to
  `main/ui/types/index.ts` types
- ✅ Used-by mapping anchored on `main/ui/index.ts` and
  `main/ui/components/`
- ✅ Security / architecture smells around `nodeIntegration: true` work
  done in the renderer
- ✅ Test surface (DI shape; no TODO markers in source)
- ✅ Cross-references to sibling deep-dive docs in this group
