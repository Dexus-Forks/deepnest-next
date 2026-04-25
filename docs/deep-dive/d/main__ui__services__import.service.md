# `main/ui/services/import.service.ts` — Deep Dive

**Generated:** 2026-04-26 by Paige (Tech Writer) for [DEE-36](/DEE/issues/DEE-36) (parent: [DEE-11](/DEE/issues/DEE-11)).
**Group:** D — UI services.
**Surface:** Renderer-side file-import path. Owns SVG / EPS / PS / DXF / DWG ingestion, conversion-server round-trips, and pushing imported parts into `window.DeepNest`.

## 1. Purpose

`ImportService` orchestrates everything between "user clicks the Import button" and "parts appear in the parts table." Concretely:

1. **Opens the OS file dialog** with the right `FileFilter` set (`import.service.ts:141-145, 397-425`).
2. **Routes by extension** — `.svg` is read directly, `.ps`/`.eps`/`.dxf`/`.dwg` are POSTed to a conversion server (`import.service.ts:432-446`).
3. **Optionally runs the SVG through `@deepnest/svg-preprocessor`** to clean it before parts are extracted (`import.service.ts:569-596`).
4. **Calls `DeepNest.importsvg(...)`** — the actual SVG-to-parts logic lives in [`main/deepnest.js`](../../../main/deepnest.js), not here. This service is purely the *transport* layer.
5. **Updates the imports/parts Ractive views** and fires post-import callbacks (sort attach, zoom apply, parts-list resize) — see `import.service.ts:638-655`.

It also bootstraps autoload of any `.svg` files in the `NEST_DIRECTORY` env-defined directory at startup (`import.service.ts:369-391`), which is the dev-mode "drop a file in this folder and it shows up" affordance.

The class is **dependency-injected** — Electron, fs, path, axios, FormData, the SVG pre-processor, the DeepNest instance, the Ractive instance, and three post-import callbacks are all passed in via the constructor or `setX()` setters. This is the most DI-heavy service in the group; the shape is a direct response to wanting it testable without an Electron harness.

## 2. Public surface

| Member | Lines | Purpose |
| --- | --- | --- |
| `class ImportService` | 152-760 | The service. |
| `constructor(options?)` | 199-229 | All dependencies optional. Tests pass none and use `setX()` setters. |
| `setDialog`, `setRemote`, `setFileSystem`, `setPath`, `setHttpClient`, `setFormDataConstructor`, `setSvgPreProcessor`, `setConfig`, `setDeepNest`, `setRactive` | 235-309 | Late-binding setters. Used in `main/ui/index.ts:642-656` directly via constructor instead, but kept for testability. |
| `setCallbacks({attachSort, applyZoom, resize})` | 315-329 | Bind the three post-import UI callbacks. |
| `loadNestDirectoryFiles(): Promise<void>` | 369-391 | Reads `NEST_DIRECTORY` global from main process; auto-imports every `.svg` file in lexicographic order. Silent on missing directory. |
| `showImportDialog(): Promise<void>` | 397-425 | The "Import" button entry point. Opens the OS dialog, calls `processFile` on each selection. Re-entrancy guarded by `this.isImporting`. |
| `processFile(filePath): Promise<void>` | 432-446 | Routes by extension. `.svg` → `readSvgFile`; `.ps`/`.eps`/`.dxf`/`.dwg` → `convertAndImport`. Anything else is silently dropped. |
| `importSvgString(svgString, filename, options?): Part[] \| null` | 664-726 | Programmatic counterpart to `processFile` — for SVG strings already in memory. Bypasses fs and the dialog. **Currently has no callers.** Designed for future programmatic flows. |
| `isImportInProgress(): boolean` | 732-734 | Re-entrancy probe (see Invariants §5). |
| `static getFileFilters()` | 740-742 | Read-only copy of `FILE_FILTERS` (`import.service.ts:141-145`). |
| `static getSupportedExtensions()` | 748-750 | Read-only copy of `SUPPORTED_EXTENSIONS` (`import.service.ts:133-136`). |
| `static create(options?)` / `createImportService(options?)` | 757-771 | Factories. |

Private helpers worth knowing: `getConversionServerUrl` (335-342), `needsConversion` (349-354), `isDxf` (361-363), `readSvgFile` (452-473), `convertAndImport` (481-558), `processSvgData` (569-596), `importData` (606-633), `updateViews` (638-655).

## 3. IPC / global side-effects

This service does **not directly invoke any IPC channel**. The work it dispatches happens via:

| Side-effect | Mechanism | Notes |
| --- | --- | --- |
| HTTP POST to conversion server | `httpClient.post(url, formData.getBuffer(), {headers, responseType: 'text'})` (line 503) | URL is read from `config.getSync('conversionServer')` (default `https://converter.deepnest.app/convert` from `types/index.ts:45`). The body is `multipart/form-data` with a `fileUpload` field (raw bytes, `application/dxf` content-type) and a `format=svg` field (lines 497-501). The response body is checked for two error markers: a leading `error` substring (line 511) and a JSON body with `"error"`+`"error_id"` (lines 516-523). |
| `electron.dialog.showOpenDialog` | `this.dialog.showOpenDialog(...)` (line 410) | Opens the native picker with `properties: ['openFile', 'multiSelections']` — multi-select is allowed. |
| `electron.remote.getGlobal('NEST_DIRECTORY')` | line 374 | Reads a main-process global (set in [`main.js`](../../../main.js)) for the auto-load directory. |
| `fs.readFile(filePath, 'utf-8', cb)` | line 459 | Async SVG read. |
| `fs.readFileSync(filePath)` | line 494 | Sync byte read for conversion (binary buffer; not utf-8). |
| `fs.readdirSync(nestDirectory)` | line 380 | Auto-load directory listing. |
| `DeepNest.importsvg(filename, dirpath, data, scalingFactor, dxfFlag)` | lines 619, 704-710 | The handoff that actually parses SVG to `Part[]`. See [`main/deepnest.js`](../../../main/deepnest.js) and [`docs/deep-dive/b/main__deepnest.js.md`](../b/main__deepnest.js.md). |
| `DeepNest.imports[].selected` mutation | lines 622-629, 712-720 | Deselects all previous imports, selects the latest. |
| `ractive.update('imports')` and `update('parts')` | line 640-641 | Triggers Ractive re-render of the parts panel. |
| User-visible message | `message(text, error?)` from `../utils/ui-helpers.js` (line 15) | All error paths use this. |

**No `ipcRenderer.invoke` or `.send`.** The service stays in the renderer; the conversion server is contacted directly over HTTP, not via the main process.

The `attachSortCallback`, `applyZoomCallback`, and `resizeCallback` (`import.service.ts:184-190`) are external side-effects too — they each touch the DOM (parts-view sort headers, the SVG-pan-zoom instance per import, and the parts-table column widths respectively).

## 4. Dependencies

**Imports** (`import.service.ts:1-15`):

- Type-only: `UIConfig`, `Part`, `DeepNestInstance`, `RactiveInstance`, `PartsViewData` from `../types/index.js`.
- Value: `DEFAULT_CONVERSION_SERVER` from `../types/index.js:45`.
- Value: `message` from `../utils/ui-helpers.js`.

**Injected at construction** (see options bag at `import.service.ts:199-213`):

| Dependency | Production source ([`main/ui/index.ts:643-656`](../../../main/ui/index.ts)) | Why injected |
| --- | --- | --- |
| `dialog` | `electronRemote.dialog` (`require("@electron/remote")`) | Dialog needs Electron's main-process bridge. |
| `remote` | `electronRemote` | For `getGlobal('NEST_DIRECTORY')`. |
| `fs` | `require("graceful-fs")` | Async + sync fs access. |
| `path` | `require("path")` | `extname`, `basename`, `dirname`. |
| `httpClient` | `axios.default` | Conversion-server POST. |
| `FormData` | `require("form-data")` | Multipart body builder (Node-side, *not* the browser FormData). |
| `svgPreProcessor` | `require("@deepnest/svg-preprocessor")` | Optional pre-cleaner; gated by `useSvgPreProcessor` config. |
| `config` | `configService` | Read-only `getSync` shape. |
| `deepNest` | `getDeepNest()` (`window.DeepNest`) | Receives parsed parts. |
| `ractive` | `partsViewService.getRactive()` | UI re-render trigger. |
| `attachSortCallback` | `() => partsViewService.attachSort()` | Reattach sort handlers after new rows render. |
| `applyZoomCallback` | `() => partsViewService.applyZoom()` | Re-init svg-pan-zoom on the new import preview. |
| `resizeCallback` | `resize` (the local function in `index.ts:132-146`) | Recompute parts-table column header widths. |

**Reverse dependencies**:

| Consumer | How it uses the service |
| --- | --- |
| [`main/ui/index.ts:642-656`](../../../main/ui/index.ts) | Creates the singleton via `createImportService(...)`. |
| [`main/ui/index.ts:700-720` (`initializeImportButton`)](../../../main/ui/index.ts) | Wires the `#import` button onclick to `importService.showImportDialog()`. Manages the spinner CSS class on the button. |
| [`main/ui/index.ts:758` (`loadInitialFiles`)](../../../main/ui/index.ts) | Calls `importService.loadNestDirectoryFiles()` once at startup. |

The service is **not** consumed by any of the four UI components (`navigation`, `parts-view`, `nest-view`, `sheet-dialog`). Imports flow into `DeepNest`; components react to that, not to the service itself.

## 5. Invariants & gotchas

1. **Re-entrancy guard is on the dialog method only.** `showImportDialog` checks `this.isImporting` and bails early (lines 403-405). But `processFile` and `importSvgString` *don't* — they can be called concurrently. The pattern works because the dialog is the only user-facing entry point; the auto-loader at `loadNestDirectoryFiles` `await`s each file in turn.
2. **`NEST_DIRECTORY` does not get a trailing-slash check.** `nestDirectory + file` (line 386) and `nestDirectory + "exports.json"` (export.service.ts:338) require a trailing `/` in the value. A misconfigured `NEST_DIRECTORY` without trailing slash would produce a broken path. There is no normalization.
3. **DXF detection happens twice.** `needsConversion(ext)` checks for any of `[.ps, .eps, .dxf, .dwg]`; then inside `convertAndImport` `isDxf(ext)` re-checks specifically for `.dxf` to apply `dxfImportScale` (lines 529-532). The DXF-only scaling factor is intentional — only DXF conversions need the scale because they have unitless coordinates upstream.
4. **`scalingFactor` is `null` for non-DXF conversions.** `convertAndImport` only sets it if the source was `.dxf` (line 530). It's also `null` for direct SVG imports (`processSvgData` is called with `null` from `readSvgFile`, line 469). Downstream, `DeepNest.importsvg` interprets `null` as "no scaling" — see [`docs/deep-dive/b/main__deepnest.js.md`](../b/main__deepnest.js.md) §`importsvg`.
5. **`dirpath` is `null` for converted files.** Comment at line 535-536 documents the why: converted files won't have embedded image references, so the directory used to resolve `<image href="...">` is moot. SVG imports pass the real `path.dirname(filePath)` (line 467).
6. **The pre-processor is *opt-in* per config and *opt-in* per call.** `processSvgData` (line 576) reads `config.getSync('useSvgPreProcessor')` — that's the persisted user setting. `importSvgString` takes a separate `usePreProcessor` option (line 671) that defaults to `false`. Programmatic callers must opt in explicitly; user-driven imports are gated by the config toggle.
7. **`importSvgString` is currently dead code.** No caller in the repo. Kept as the documented programmatic affordance for future flows (e.g. clipboard paste, drag-and-drop). Lines 664-726.
8. **Error responses from the conversion server are *string-sniffed*.** The handler checks for a literal `error` prefix (line 511) and a regex-y `'"error"'`+`'"error_id"'` substring match (lines 516-523). The server isn't strictly typed — that's why the parsing is defensive. If a future server change uses different markers, this code silently drops the message and shows the raw body.
9. **`fs.readFile` (async, line 459) vs `fs.readFileSync` (line 494).** The SVG path is async; the conversion path is sync. The SVG path runs through a callback wrapped in a `Promise<void>` (line 458-472). The conversion path is fully `await`ed already. Both shapes work, but the asymmetry is historical — the legacy `page.js` used `fs.readFile` for SVGs.
10. **DXF response error parsing throws on malformed JSON.** Line 517 `JSON.parse(body)` is called only after substring matches succeed; if those marker strings appear but the body is *not* valid JSON, this throws and the catch at line 537 fires — which then **double-handles** the error (it parses again at line 546). This is benign but redundant. See TODOs §6.

## 6. Known TODOs / smells

No `// TODO` / `// FIXME` comments are present in `import.service.ts`. The smells worth surfacing:

1. **Renderer-side HTTP to a public server.** The conversion POST goes directly from the renderer (Chromium, with `nodeIntegration: true` so `axios.default` is the *Node* client, not browser fetch). This makes the renderer a *trusted* network actor — any exploit in the SVG/DXF path could exfiltrate data from `userData/` because the renderer has full Node access. A safer architecture would be to route the conversion through the main process. The task spec calls this out: *"Note any service that does work in the renderer that should arguably live in main (security smell — `nodeIntegration: true`)."*
2. **Duplicate error-detection block.** The error-string parsing in `convertAndImport` (lines 511-523) is mirrored in the catch (lines 542-555) and again in `export.service.ts:438-449` and again in `export.service.ts:456-471`. A `parseConversionError(body): string | null` helper would deduplicate.
3. **`messages` are HTML.** `message(`There was an Error while converting: ${jsonErr.error_id}<br>...`, true)` (line 519) interpolates a server-controlled `error_id` into a string that's then assigned via `innerHTML` (`ui-helpers.ts:34`). If a malicious conversion server returned an HTML-laden `error_id`, it would be interpreted in the renderer. Likely low-risk because the server is trusted, but worth noting.
4. **No upload size limit.** `fs.readFileSync(filePath)` (line 494) reads the *entire* file into memory before posting. A very large DXF would OOM the renderer. The dialog has no extension cap.
5. **Auto-load is silent.** `loadNestDirectoryFiles` swallows directory errors (line 388-390) and continues. The user gets no feedback that startup auto-import didn't happen.

## 7. Extension points

- **Add a new format** — extend `SUPPORTED_EXTENSIONS.NEEDS_CONVERSION` (`import.service.ts:133-136`) and add a row to `FILE_FILTERS` (line 141-145). The conversion server already accepts extra formats; this service is format-agnostic past the extension check.
- **Plug a different conversion server** — `getConversionServerUrl` reads the per-user `conversionServer` config field. No code change needed.
- **Add a DXF/DWG scaling factor for *export*** — already done in `export.service.ts` (`dxfExportScale`); this service only handles import scaling.
- **Add drag-and-drop or paste** — wire into `importSvgString` (line 664-726). The infrastructure is already in place.
- **Move conversion to main** (security hardening) — replace the `httpClient` injection with an IPC channel; the main process performs the POST and returns the body. The error-parsing logic stays in the service.

## 8. Test coverage status

- **No unit tests.** The DI-friendly shape (every dependency in the constructor options) was built specifically for testing, but no fixture exists yet.
- **E2E covers the dialog button.** `tests/index.spec.ts` clicks `#import` and verifies that an SVG appears in the parts list. See [`docs/deep-dive/j/tests__index.spec.ts.md`](../j/tests__index.spec.ts.md). The conversion path (DXF/DWG/EPS) is **not** covered — there's no offline conversion server in CI.
- **The pre-processor branch is uncovered** — `useSvgPreProcessor` is `false` by default and the test config doesn't enable it.
- **`importSvgString` is dead code in tests too.**

A unit test pass against this file would catch a lot — the DI surface makes it easy to mock everything and assert that the right `DeepNest.importsvg(...)` call is made for each input shape. Probably the highest-value test gap in Group D.

## 9. Cross-references

- [`docs/deep-dive/d/main__ui__services__config.service.md`](./main__ui__services__config.service.md) §3 — the config keys this service reads (`conversionServer`, `dxfImportScale`, `useSvgPreProcessor`, `scale`).
- [`docs/deep-dive/d/main__ui__services__export.service.md`](./main__ui__services__export.service.md) — sibling that uses the same conversion-server pattern, in reverse.
- [`docs/deep-dive/c/main__ui__index.ts.md`](../c/main__ui__index.ts.md) — composition root and import-button wiring.
- [`docs/deep-dive/c/main__ui__types__index.ts.md`](../c/main__ui__types__index.ts.md) — `DeepNestInstance.importsvg` shape, `Part`, `DEFAULT_CONVERSION_SERVER`.
- [`docs/deep-dive/b/main__deepnest.js.md`](../b/main__deepnest.js.md) — `DeepNest.importsvg(filename, dirpath, data, scalingFactor, dxfFlag)`, the consumer of every parsed payload.
- [`docs/deep-dive/e/main__ui__components__parts-view.md`](../e/main__ui__components__parts-view.md) — the Ractive view that re-renders on `update('imports')` / `update('parts')` from this service.
- [`docs/deep-dive/g/main__index.html.md`](../g/main__index.html.md) — the `#import` button DOM.
- [`docs/deep-dive/a/main.js.md`](../a/main.js.md) — `NEST_DIRECTORY` global.
