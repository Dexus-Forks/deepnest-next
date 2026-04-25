# `main/ui/services/import.service.ts` — ImportService

The renderer-side **file import path**. Handles SVG directly and routes other
CAD formats (`.ps`, `.eps`, `.dxf`, `.dwg`) through the configured conversion
server. After parsing, hands the result to `DeepNest.importsvg(...)` which
populates `window.DeepNest.imports` and `window.DeepNest.parts`.

- File: [`main/ui/services/import.service.ts`](../../../main/ui/services/import.service.ts)
- Public API: `ImportService` class + `createImportService()` factory.
- Static helpers: `ImportService.getFileFilters()`, `ImportService.getSupportedExtensions()`.

## Role in the architecture

```
+-------------------------+        readFileSync / readFile        +-------------------+
|  showImportDialog()     |  -- node fs (renderer-side) -->        | local filesystem |
|  (dialog.showOpenDialog)|                                        +-------------------+
+-----------+-------------+                                                  ^
            |                                                                |
            | per file                                                       |
            v                                                                |
   ext === ".svg" ?                                                          |
            |  no                                                            |
            +--> convertAndImport() -- HTTP POST multipart -->  conversionServer
            |                                                                |
            v                                                                |
   processSvgData()  (optional @deepnest/svg-preprocessor)                   |
            |                                                                |
            v                                                                |
   importData()  -> DeepNest.importsvg(filename, dirpath, svg, scaling, dxfFlag)
            |                                                                |
            v                                                                |
   Update Ractive (parts-view), select latest import, run callbacks
```

## Public API surface

| Member | Purpose |
| --- | --- |
| `constructor(options?)` | All deps are optional and DI'd: `dialog`, `remote`, `fs`, `path`, `httpClient`, `FormData`, `svgPreProcessor`, `config`, `deepNest`, `ractive`, callbacks. |
| `set*` setters | Per-dependency setters used by the composition root. |
| `setCallbacks({ attachSort, applyZoom, resize })` | Post-import hooks executed via `updateViews()`. |
| `loadNestDirectoryFiles()` | Reads `NEST_DIRECTORY` (electron `getGlobal`) on boot, sorts, and imports each `*.svg`. Silently no-ops if directory or `fs` is missing. |
| `showImportDialog()` | Opens `dialog.showOpenDialog`, then iterates `processFile` per selected path. Re-entry is guarded by `isImporting`. |
| `processFile(filePath)` | Routes by extension to `readSvgFile` (SVG) or `convertAndImport` (everything in `NEEDS_CONVERSION`). |
| `importSvgString(svg, filename, options?)` | **Programmatic** entry — used by callers that already hold an SVG string. Returns the parsed `Part[]` or `null`. |
| `isImportInProgress()` | Reflects `isImporting`. Drives the `#import` button class in `index.ts`. |
| Static `getFileFilters()` / `getSupportedExtensions()` | Read-only views of the constants. |

## File handling

| Source | Extensions | Path |
| --- | --- | --- |
| Direct SVG | `.svg` (case-insensitive) | `readSvgFile()` → `fs.readFile(path, "utf-8", cb)` → `processSvgData(data, filename, dirpath)`. `dirpath` is set so embedded `<image>` references resolve. |
| Needs conversion | `.ps`, `.eps`, `.dxf`, `.dwg` | `convertAndImport()` → multipart POST to `conversionServer`. `dirpath = null` (no embedded images expected). DXF additionally applies `dxfImportScale` and sets `dxfFlag = true`. |

`FILE_FILTERS` for the open dialog covers `["svg","ps","eps","dxf","dwg"]`,
plus narrower `SVG/EPS/PS` and `DXF/DWG` filters.

## IPC channels

The import path **does not directly use Electron IPC**. It uses:

- `dialog.showOpenDialog` (Electron remote) — receives `{ canceled, filePaths }`.
- `remote.getGlobal("NEST_DIRECTORY")` — for the boot-time directory scan.
- `fs.readFile` / `fs.readFileSync` / `fs.readdirSync` (graceful-fs in the
  composition root).
- `httpClient.post(conversionServer, FormData.getBuffer(), { headers, responseType: "text" })`
  for non-SVG conversion.

Persisted state is touched only indirectly via the `ConfigGetter` (`config.getSync`).

## Data shapes

### Open dialog result

```ts
interface OpenDialogResult {
  canceled: boolean;
  filePaths: string[];
}
```

### Conversion server request

`multipart/form-data`:
- `fileUpload`: file `Buffer`, `contentType: "application/dxf"` (regardless of
  source extension — server decides by `format` field).
- `format`: `"svg"`.

Response is plain text (`responseType: "text"`):
- Success: SVG string.
- Error markers (any of):
  - Body starts with `"error"` (raw text).
  - Body contains both `"error"` and `"error_id"` JSON keys → parsed as
    `{ error_id: string }` and shown to the user with a deepnest GitHub link.

### `processSvgData(data, filename, dirpath, scalingFactor?, dxfFlag?)`

Optionally runs through `@deepnest/svg-preprocessor` when
`config.useSvgPreProcessor` is true:

```ts
interface SvgPreProcessorResult {
  success: boolean;
  result: string; // SVG on success, error message on failure
}
```

The preprocessor is invoked with the current `scale` (default 72) — see
[`config.service`](./main__ui__services__config.service.md).

### `DeepNest.importsvg(...)` payload

The terminal call shape is defined in
[`main/ui/types/index.ts`](../../../main/ui/types/index.ts) (`DeepNestInstance.importsvg`)
and implemented in [`main/deepnest.js:55-83`](../../../main/deepnest.js):

```ts
DeepNest.importsvg(
  filename: string,            // basename, used as the import key
  dirpath: string | null,      // for relative <image href> resolution
  svgstring: string,           // SVG source
  scalingFactor: number | null,// applied for converted DXF
  dxfFlag: boolean             // tells SvgParser.cleanInput() to apply DXF heuristics
): Part[]                      // newly added parts (mutates DeepNest.parts and .imports)
```

After the call the service:

1. Deselects every entry in `DeepNest.imports`.
2. Selects the most recently appended entry.
3. Calls `ractive.update("imports")` and `ractive.update("parts")`
   ([parts-view.ts](../../../main/ui/components/parts-view.ts)).
4. Runs the post-import callbacks: `attachSort`, `applyZoom`, `resize`.

## Used by

Composition root [`main/ui/index.ts`](../../../main/ui/index.ts) wires the
service in `initializeComponents()` (line 642) and binds the `#import` button
in `initializeImportButton()` (line 700).

| Caller | What it does |
| --- | --- |
| `#import` button click (`index.ts:701-720`) | Disables button, awaits `importService.showImportDialog()`, restores button. |
| `loadInitialFiles()` (`index.ts:757-759`) | One-shot boot scan via `loadNestDirectoryFiles()`. |
| `partsViewService` | Implicit consumer — its Ractive is updated by `updateViews()`. |
| `nestViewService` / `sheetDialogService` | Indirect consumers — they read `DeepNest.parts` and `DeepNest.imports` populated by this service. |

The injected `ractive` is `partsViewService.getRactive()` (cast to
`RactiveInstance<PartsViewData>`), so component-level updates flow through
parts-view.

## Security and architecture smells

> The issue calls out: "Note any service that does work in the renderer that
> should arguably live in main (security smell — `nodeIntegration: true`)."

This service is the **biggest offender** in Group D:

1. **Direct `fs` use in the renderer.** `readFileSync`, `readFile`, and
   `readdirSync` are called from the renderer process. With
   `nodeIntegration: true` and `contextIsolation: false`
   ([`main.js:100-103`](../../../main.js)), this works but means a malicious
   imported SVG **with inlined script** could trivially read arbitrary files.
   Mitigation path: move file reads behind an IPC handler in `main.js` and have
   the renderer receive `{ filename, contents }` payloads only.
2. **Direct outbound HTTP from the renderer.** `axios.post` to
   `conversionServer` runs in the renderer. Combined with
   `useSvgPreProcessor`, the renderer is doing untrusted-input parsing **before**
   handing it to `SvgParser.load`. Either the conversion call or, at minimum,
   the file read should be moved to main.
3. **`remote.getGlobal("NEST_DIRECTORY")`** uses `@electron/remote`, which is
   itself deprecated and a known IPC weak spot. The service does not invalidate
   if the directory changes after boot.
4. **Conversion server URL is user-configurable** (`config.conversionServer`).
   The renderer trusts the response body as SVG content and feeds it to the
   SVG parser. A bad/compromised server can return arbitrary SVG (which is
   expected) — but with the renderer running with full Node access, an
   `<image href="file:///...">` or `<script>` payload in returned SVG is a
   real attack surface unless the SVG parser strips it. Validate that
   `SvgParser.cleanInput` strips scripts (out of scope for this deep-dive).
5. **Flag-based re-entry guard** (`isImporting`) is best-effort. Concurrent
   `loadNestDirectoryFiles()` and `showImportDialog()` calls could overlap; it
   does not currently happen because boot runs to completion before the user
   can click the button, but the guard does not protect against that.
6. **Error messages embed user-facing HTML** with a deepnest GitHub link
   inline. The `error_id` is interpolated into HTML before being passed to
   `message(..., true)`. If `message` does not escape its input, that's an XSS
   into the renderer (in turn, due to `nodeIntegration`, an RCE).

## Test surface

- Fully DI'd; mock `fs`, `path`, `httpClient`, `FormData`, `dialog`, `remote`,
  `svgPreProcessor`, `config`, `deepNest`, and `ractive`.
- High-value cases: SVG passthrough vs. preprocessor, DXF scaling factor,
  conversion-server error parsing, `dirpath` propagation for embedded images,
  re-entry guard, post-import selection ordering, callbacks fire-order.

## References

- [`main/ui/services/import.service.ts`](../../../main/ui/services/import.service.ts)
- [`main/ui/types/index.ts`](../../../main/ui/types/index.ts) — `DeepNestInstance`,
  `Part`, `PartsViewData`, `RactiveInstance`, `DEFAULT_CONVERSION_SERVER`
- [`main/deepnest.js`](../../../main/deepnest.js) — `importsvg`
- [`main/ui/index.ts`](../../../main/ui/index.ts) — composition root
- [`main.js`](../../../main.js) — Electron windows + `webPreferences`
- [`main/ui/components/parts-view.ts`](../../../main/ui/components/parts-view.ts)
  — Ractive instance updated after import
- Sister docs: [`config`](./main__ui__services__config.service.md),
  [`export`](./main__ui__services__export.service.md),
  [`nesting`](./main__ui__services__nesting.service.md)
