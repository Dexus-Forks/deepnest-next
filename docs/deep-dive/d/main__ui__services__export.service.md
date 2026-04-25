# `main/ui/services/export.service.ts` — ExportService

The renderer-side **export path** for nesting results. Builds an SVG document
from the currently-selected `SelectableNestingResult`, then either writes it
directly (`exportToSvg`), POSTs it to the conversion server for round-trip
into DXF (`exportToDxf`), or dumps the result as JSON to the nest directory
(`exportToJson`).

- File: [`main/ui/services/export.service.ts`](../../../main/ui/services/export.service.ts)
- Public API: `ExportService` class + `createExportService()` factory.
- Static helpers: `ExportService.getSupportedFormats()`,
  `ExportService.getFileFilters(format)`.

## Role in the architecture

```
              +--------------------+
              | UI buttons         |
              | #exportsvg / dxf / |
              | json / nesting svc |
              +---------+----------+
                        |
                        v
              +--------------------+
              | export(format)     |
              +-+--------+---------+
                |        |        \
                v        v         \
       exportToSvg   exportToDxf    exportToJson
                |        |              |
                +---+----+              v
                    v               fs.writeFileSync(NEST_DIR/exports.json)
            generateSvgExport()
                    |
                    v
       +-------------------------+
       |  applyDimensions()      |  reads scale, units, dxfExportScale
       |  applyLineMerging()     |  reads mergeLines, curveTolerance, svgParser
       +-------------------------+
                    |
   exportToSvg ---> fs.writeFileSync(<userpath>.svg)
   exportToDxf ---> POST conversionServer (multipart, format=dxf)
                                      |
                                      v
                              fs.writeFileSync(<userpath>.dxf)
```

## Public API surface

| Member | Purpose |
| --- | --- |
| `constructor(options?)` | All deps DI'd: `dialog`, `remote`, `fs`, `httpClient`, `FormData`, `config`, `deepNest`, `svgParser`, `exportButton`. |
| `set*` setters | Composition-root injection (`setExportButton` is wired separately after creation). |
| `exportToJson()` | Sync. Writes the selected nest as `exports.json` to `NEST_DIRECTORY`. Returns `false` if any dep / selection is missing. |
| `exportToSvg()` | Sync. Opens save dialog, ensures `.svg` suffix, calls `generateSvgExport(selected)`, writes the file. |
| `exportToDxf(): Promise<boolean>` | Async. Opens save dialog, ensures `.dxf`/`.dwg` suffix, calls `generateSvgExport(selected, { forDxfConversion: true })`, POSTs to conversion server, writes response. Toggles spinner via `setExportLoading`. |
| `generateSvgExport(nestResult, options?)` | Pure-ish DOM builder — produces the SVG document string. Reads sheet boundaries, sheets-space, scale, units, and (when `mergeLines`) runs through `SvgParser`. |
| `export(format)` | Promise-wrapper that switches on `"svg" \| "dxf" \| "json"` with an `isExporting` re-entry guard. |
| `isExportInProgress()` / `hasSelectedNest()` | Status helpers. |
| Static `getSupportedFormats()` / `getFileFilters(format)` | Read-only views of the constants. |

## SVG generation

`generateSvgExport(nestResult, options)`:

1. Creates an `<svg>` element via `document.createElementNS`.
2. For each sheet group in `nestResult.placements`:
   - Optional `addSheetBoundary(group, parts[s.sheet])` adds the green
     (`stroke="#00ff00"`) outline when `exportWithSheetBoundboarders` is set.
   - Translates the group by `(-sheetBounds.x, svgHeight - sheetBounds.y)` so
     each sheet stacks vertically without overlap.
   - For each `sheetplacement`, clones every `svgelement` of the part. Image
     elements get their `data-href` migrated back to `href`. The clone is
     wrapped in a per-part group with `transform="translate(x y) rotate(rotation)"`
     and `id={placement.id}`.
   - Increments `svgHeight` by the sheet height + optional
     `exportWithSheetsSpaceValue` (in SVG units).
3. `applyDimensions` sets `width`/`height` (in `mm` or `in`) and `viewBox`,
   accounting for `dxfExportScale` and unit conversion.
4. `applyLineMerging` runs only if `mergeLines` is true and the result has a
   non-zero `mergedLength`. Performs `applyTransform → flatten → splitLines →
   mergeOverlap(0.1 * curveTolerance) → mergeLines`, then sets
   `stroke="#000000"; fill="none"` on every non-`g` non-`image` child.
5. Returns the serialized SVG string (`XMLSerializer`).

The SvgParser methods called are typed in
[`main/ui/types/index.ts` `SvgParserInstance`](../../../main/ui/types/index.ts).

## Data shapes

### Selected nest

`SelectableNestingResult` in
[`main/ui/types/index.ts`](../../../main/ui/types/index.ts) — extends
`NestingResult` from [`index.d.ts`](../../../index.d.ts) with `selected: boolean`
and `utilisation: number`. The export reads:

```ts
nestResult.placements: SheetGroup[]   // typed locally in this file
SheetGroup {
  sheet: number;            // index into DeepNest.parts (the sheet part)
  sheetid: number;
  sheetplacements: PartPlacement[];
}
PartPlacement {
  id: number;               // unique placement id, used as <g id>
  filename: string;
  source: number;           // index into DeepNest.parts (the placed part)
  x: number;
  y: number;
  rotation: number;         // degrees
}
```

A `mergedLength` field is read off the result via an unsafe cast
(`as unknown as { mergedLength?: number }`) — set by the GA path in
[`main/deepnest.js`](../../../main/deepnest.js) and not exposed on the public
type. If line merging was not run, the value is undefined and `applyLineMerging`
no-ops.

### Conversion server (DXF round-trip)

`multipart/form-data`:
- `fileUpload`: `Buffer.from(svgContent)`, `contentType: "image/svg+xml"`,
  `filename: "deepnest.svg"`.
- `format`: `"dxf"`.

Response shape mirrors `ImportService.convertAndImport`:
- Body starts with `"error"` → display raw text.
- Body contains `"error"` and `"error_id"` JSON keys → parse and surface the
  `error_id` with a deepnest GitHub issue link.
- Otherwise: treat as DXF text, write to disk.

### `exportToJson`

```ts
fs.writeFileSync(NEST_DIRECTORY + "exports.json", JSON.stringify(selected));
```

Persists the entire `SelectableNestingResult` (selection state + placements +
metrics). Used as the result snapshot taken when nesting is stopped — see
[NestingService](./main__ui__services__nesting.service.md).

## IPC channels

This service uses **no Electron IPC channels directly**. Indirect IPC happens
via:

- `dialog.showSaveDialogSync` (Electron remote) — synchronous, blocks the
  renderer.
- `remote.getGlobal("NEST_DIRECTORY")` — for the JSON dump path.

The relevant IPC channel constants (`IPC_CHANNELS`) live in
[`main/ui/types/index.ts`](../../../main/ui/types/index.ts) but are not
referenced by this service.

## Used by

Composition root [`main/ui/index.ts`](../../../main/ui/index.ts):

| Hook | Wiring |
| --- | --- |
| `initializeComponents()` (line 658-676) | `createExportService(...)` then `setExportButton(getElement("#export"))`. |
| `nestingService.saveJsonFn` (line 685) | `() => exportService.exportToJson()` is wired into `NestingService` so stopping a nest auto-snapshots the result. |
| `initializeExportButtons()` (line 725-752) | Click handlers for `#exportjson`, `#exportsvg`, `#exportdxf`. |

The DOM contract:

| Selector | Action |
| --- | --- |
| `#exportjson` | `exportService.exportToJson()` |
| `#exportsvg` | `exportService.exportToSvg()` |
| `#exportdxf` | `await exportService.exportToDxf()` |
| `#export` | The export wrapper button toggled to `spinner` during DXF round-trip. |

No component (`parts-view`, `nest-view`, `sheet-dialog`, `navigation`) consumes
the export service directly — it is only triggered from buttons or from the
`NestingService`.

## Security and architecture smells

> Like `ImportService`, this service does I/O work in the renderer that should
> arguably live in main.

1. **Renderer-side `fs.writeFileSync`** for SVG, DXF, and JSON outputs
   ([`exportToJson`](../../../main/ui/services/export.service.ts),
   [`exportToSvg`](../../../main/ui/services/export.service.ts),
   [`exportToDxf`](../../../main/ui/services/export.service.ts)). Combined
   with `nodeIntegration: true` ([`main.js:100-103`](../../../main.js)),
   any compromised script in the renderer can write to arbitrary paths.
   Mitigation: move file writes behind an IPC handler that validates the path
   against the dialog-returned location.
2. **Outbound HTTP from the renderer** for DXF conversion. Same risk profile
   as `ImportService.convertAndImport`. The response body is then written
   verbatim to disk.
3. **`showSaveDialogSync` is synchronous** and blocks the renderer; preferred
   replacement is `showSaveDialog` (async). Not a security issue, but it
   freezes the UI during the dialog.
4. **Error messages are interpolated into HTML** (`<br>...github.com...`) and
   passed to `message(..., true)`. If `message` is not safely escaping the
   `error_id`, this is an XSS path through a malicious / compromised
   conversion server response.
5. **`mergedLength` is read via an unsafe cast.** The export pipeline depends
   on a property the public type does not expose; if the GA path renames or
   stops emitting this, line merging silently no-ops with no compile error.
   Worth promoting `mergedLength` to `SelectableNestingResult`.
6. **`setExportButton` setter mutates a DOM element's `className`** rather
   than going through a class-toggle helper. State synchronization with the
   nesting flow is split between this service (`spinner` during DXF) and
   `NestingService` (`button export` / `disabled`). A single owner of the
   button's class would be safer.

## Test surface

- Pure SVG generation is unit-testable: inject a fake `deepNest`, `config`,
  `svgParser`, run `generateSvgExport()`, assert on the serialized string.
- `exportToDxf` requires mocking `dialog`, `httpClient`, `FormData`, and `fs`.
  Cover error responses (string-prefix and JSON variants) and the spinner
  on/off state.
- `exportToJson` only needs `remote`, `fs`, and `deepNest`.

## References

- [`main/ui/services/export.service.ts`](../../../main/ui/services/export.service.ts)
- [`main/ui/types/index.ts`](../../../main/ui/types/index.ts) —
  `SelectableNestingResult`, `SvgParserInstance`, `DEFAULT_CONVERSION_SERVER`
- [`index.d.ts`](../../../index.d.ts) — `NestingResult`, `SheetPlacement`, `Part`
- [`main/ui/index.ts`](../../../main/ui/index.ts) — `initializeExportButtons()`
  and the `nestingService.saveJsonFn` wiring
- [`main/deepnest.js`](../../../main/deepnest.js) — produces the
  `SelectableNestingResult` (and the unexposed `mergedLength`)
- Sister docs: [`config`](./main__ui__services__config.service.md),
  [`import`](./main__ui__services__import.service.md),
  [`nesting`](./main__ui__services__nesting.service.md)
