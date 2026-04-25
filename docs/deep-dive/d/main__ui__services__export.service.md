# `main/ui/services/export.service.ts` — Deep Dive

**Generated:** 2026-04-26 by Paige (Tech Writer) for [DEE-36](/DEE/issues/DEE-36) (parent: [DEE-11](/DEE/issues/DEE-11)).
**Group:** D — UI services.
**Surface:** Renderer-side export path. Owns SVG / DXF / JSON output of nesting results.

## 1. Purpose

`ExportService` turns the *currently selected* `SelectableNestingResult` into a file on disk in one of three formats:

- **SVG** — directly from the placement data (`exportToSvg` line 355). The SVG is built in DOM, then serialised with `XMLSerializer`.
- **DXF/DWG** — same SVG generation pipeline, then POSTed to the conversion server which returns DXF text (`exportToDxf` line 390).
- **JSON** — raw `JSON.stringify(selected)` of the nest result, written to `<NEST_DIRECTORY>/exports.json`. This is **not** a user-facing export — there is no save dialog. It's the one called by `nestingService.stopNesting()` to leave a sidecar copy on disk (`export.service.ts:328-349`).

The core SVG-generation logic is shared (`generateSvgExport` at line 486). It builds an `<svg>` document containing one `<g>` per sheet, places each part as a transformed clone of the source SVG elements, optionally adds sheet boundary outlines, optionally inserts blank space between sheets, and finally either applies SVG-Parser's line-merging optimisation (`mergeOverlap` + `mergeLines`) or not (gated by `mergeLines` config). See §6 for the SVG-build invariants.

Like `ImportService`, this is a **dependency-injected** class — Electron, fs, axios, FormData, the SvgParser, and the export-button DOM element are all passed in.

## 2. Public surface

| Member | Lines | Purpose |
| --- | --- | --- |
| `class ExportService` | 149-744 | The service. |
| `interface ExportOptions` | 123-126 | `{ forDxfConversion?: boolean }` — flag that triggers DXF-specific scaling adjustments in `applyDimensions`. |
| `type ExportFormat` | 131 | `"svg" \| "dxf" \| "json"`. |
| `constructor(options?)` | 184-206 | All deps optional. |
| `setDialog`, `setRemote`, `setFileSystem`, `setHttpClient`, `setFormDataConstructor`, `setConfig`, `setDeepNest`, `setSvgParser`, `setExportButton` | 212-278 | Late-binding setters. `setExportButton` is used in `main/ui/index.ts:672-676` because the button doesn't exist at construction time. |
| `exportToJson(): boolean` | 328-349 | Sync. Writes `<NEST_DIRECTORY>/exports.json`. Returns `false` if any dep missing or no nest selected. |
| `exportToSvg(): boolean` | 355-384 | Sync. Opens save dialog, generates SVG, writes file. |
| `exportToDxf(): Promise<boolean>` | 390-477 | Async. Generates SVG (with `forDxfConversion: true`), POSTs to conversion server, writes the response body to disk. Manages the export-button spinner via `setExportLoading`. |
| `generateSvgExport(nestResult, options?): string` | 486-576 | The core SVG builder. Returns the serialised string. **Throws** if `deepNest` or `config` are unset. |
| `export(format): Promise<boolean>` | 672-694 | Re-entrancy-guarded dispatcher. Routes to one of the three above. |
| `isExportInProgress(): boolean` | 700-702 | Re-entrancy probe. |
| `hasSelectedNest(): boolean` | 708-710 | Convenience — whether `getSelectedNest()` returns non-null. |
| `static getSupportedFormats()` | 716-718 | `["svg", "dxf", "json"]`. |
| `static getFileFilters(format)` | 725-734 | Format-specific filter set. |
| `static create(options?)` / `createExportService(options?)` | 741-754 | Factories. |

Private helpers worth knowing: `getConversionServerUrl` (284-291), `getSelectedNest` (297-308), `setExportLoading` (313-321), `addSheetBoundary` (583-590), `applyDimensions` (599-628), `applyLineMerging` (635-665).

## 3. IPC / global side-effects

This service does **not directly invoke any IPC channel**. Side-effects are file I/O, HTTP, dialog calls, and DOM mutation:

| Side-effect | Mechanism | Notes |
| --- | --- | --- |
| HTTP POST to conversion server | `httpClient.post(url, formData.getBuffer(), {headers, responseType: 'text'})` (line 429) | URL from `config.getSync('conversionServer')`. Same multipart contract as `import.service.ts` but with `format=dxf` (line 427) and `fileUpload` body of `image/svg+xml` content type (line 425). |
| `electron.dialog.showSaveDialogSync` | line 361, 396 | **Sync** dialog. Returns `string | undefined`. |
| `electron.remote.getGlobal('NEST_DIRECTORY')` | line 333 | Used by `exportToJson` only, to write the sidecar JSON. |
| `fs.writeFileSync(path, data)` | lines 346, 381, 451 | Synchronous file write for SVG, DXF, JSON. No back-pressure handling — the renderer blocks on disk. |
| `document.createElementNS('http://www.w3.org/2000/svg', ...)` | lines 494, 508, 532 | Builds an in-memory SVG DOM tree. Not attached to the page document. |
| `XMLSerializer().serializeToString(svg)` | line 575 | Serialises the in-memory DOM. |
| `svgParser.applyTransform / flatten / splitLines / mergeOverlap / mergeLines` | lines 650-654 | Run **only if** `mergeLines === true` *and* `nestResult.mergedLength > 0`. See [`docs/deep-dive/b/main__svgparser.js.md`](../b/main__svgparser.js.md). |
| Export-button class mutation | `this.exportButton.className = "button export spinner"` (line 316) | Visual spinner during DXF round-trip. |
| `message(...)` | from `../utils/ui-helpers.js` | All error paths. |

The data-flow is **fully renderer-local except for the conversion HTTP** — same shape as `ImportService` but inverted direction, and same security caveat (see §6).

## 4. Dependencies

**Imports** (`export.service.ts:1-15`):

- Type-only: `UIConfig`, `DeepNestInstance`, `SelectableNestingResult`, `Part`, `SvgParserInstance` from `../types/index.js`.
- Value: `DEFAULT_CONVERSION_SERVER` from `../types/index.js:45`.
- Value: `message` from `../utils/ui-helpers.js`.

**Injected at construction** (see options bag at `export.service.ts:184-194`):

| Dependency | Production source ([`main/ui/index.ts:660-669, 675`](../../../main/ui/index.ts)) | Why injected |
| --- | --- | --- |
| `dialog` | `electronRemote.dialog` | Save dialog. |
| `remote` | `electronRemote` | `getGlobal('NEST_DIRECTORY')`. |
| `fs` | `require("graceful-fs")` | Sync writes. |
| `httpClient` | `axios.default` | Conversion-server POST. |
| `FormData` | `require("form-data")` | Multipart body builder. |
| `config` | `configService` | Read-only `getSync` shape. |
| `deepNest` | `getDeepNest()` | Source of `parts` and `nests`. |
| `svgParser` | `getSvgParser()` (`window.SvgParser`) | Line-merge pass. |
| `exportButton` | `getElement("#export")` (set after construction via `setExportButton`) | Spinner state during DXF. |

**Reverse dependencies**:

| Consumer | How it uses the service |
| --- | --- |
| [`main/ui/index.ts:659-676`](../../../main/ui/index.ts) | Creates the singleton via `createExportService(...)` and binds the export button. |
| [`main/ui/index.ts:725-752` (`initializeExportButtons`)](../../../main/ui/index.ts) | Wires `#exportjson` / `#exportsvg` / `#exportdxf` onclick handlers to `exportService.exportTo{Json,Svg,Dxf}()`. |
| [`main/ui/index.ts:685` (Nesting Service wiring)](../../../main/ui/index.ts) | The `saveJsonFn` callback for `NestingService` is `() => exportService.exportToJson()`. **This is the cross-service link** that makes "stop nesting" persist a JSON snapshot. |

The service is **not** consumed by any of the four UI components.

## 5. SVG generation pipeline (`generateSvgExport` line 486-576)

This is the most algorithmically dense method in the file. The shape:

1. **Read config** — `exportWithSheetBoundboarders`, `exportWithSheetsSpace`, `exportWithSheetsSpaceValue` (lines 500-502).
2. **Iterate `nestResult.placements` as `SheetGroup[]`** (line 505). Each placement is one sheet.
3. **Per sheet:**
   - Create a `<g>` group (line 508).
   - If `exportWithSheetBoundboarders`, clone the sheet's own SVG elements with green stroke / no fill (line 512-514, 583-590).
   - Position the group with `transform="translate(-sheetBounds.x, svgHeight - sheetBounds.y)"` (line 519-522). `svgHeight` is the running vertical offset that places sheets *stacked top-to-bottom*.
   - Track `svgWidth = max(svgWidth, sheetBounds.width)` (line 525-526).
   - **Per part placement on the sheet:**
     - Look up the part by `parts[p.source]` (line 531).
     - `cloneNode(false)` each `svgelement` from the part (line 536).
     - For `<image>` elements, copy `data-href` → `href` and remove `data-href` (lines 539-545). This unhides the image reference that `DeepNest` had captured at import time.
     - Append the cloned element to a per-part group (line 547).
     - Set `transform="translate(p.x p.y) rotate(p.rotation)"` and `id=p.id` (lines 553-557).
   - Increment `svgHeight += sheetBounds.height` (line 561).
   - If `exportWithSheetsSpace` and not the last sheet, add `exportWithSheetsSpaceValue` to `svgHeight` (lines 564-566).
4. **`applyDimensions(svg, svgWidth, svgHeight, options)`** (line 570) — sets `width`, `height`, `viewBox` on the root `<svg>`. See §6 for the unit math.
5. **`applyLineMerging(svg, nestResult)`** (line 573) — gated by `mergeLines && nestResult.mergedLength > 0`. Runs `svgParser.applyTransform → flatten → splitLines → mergeOverlap(0.1*curveTolerance) → mergeLines`, then sets `fill=none stroke=#000000` on every non-`<g>` non-`<image>` top-level element (lines 656-664).
6. **`new XMLSerializer().serializeToString(svg)`** returns the string.

## 6. Invariants & gotchas

1. **Distances and `scale` interpretation flow from `ConfigService`.** `applyDimensions` (line 599-628) computes the final SVG width/height by dividing user-units by `scale`. If `units === "mm"`, scale is divided by 25.4 (line 620) — same conversion used by `ConfigService.getConversionFactor` but **inlined** here. Drift between the two is a real risk; both must be updated together if the conversion convention changes.
2. **DXF export uses an *additional* scale divisor.** `dxfExportScale` is divided into `scale` (line 614) only when `forDxfConversion: true`. The default value is `1`, so DXF-only-scale-correction is opt-in.
3. **The `viewBox` is in *raw* sheet-bounds units, not unit-converted.** `viewBox="0 0 ${width} ${height}"` (line 627) where `width`/`height` come from `sheetBounds`. The display dimensions (`width="123.4in"`) are the *physical* size; the `viewBox` is the *coordinate system*. Don't try to "fix" one without the other.
4. **`exportToJson` is silent — no save dialog.** It uses `<NEST_DIRECTORY>/exports.json` from the env-driven global. Most users will never see it. It exists so `NestingService.stopNesting` can leave a JSON copy on disk for post-processing tools (line 502 in `nesting.service.ts`). The `#exportjson` button onclick (`main/ui/index.ts:729-733`) calls the same method — meaning "Export → JSON" overwrites that sidecar file.
5. **`exportToJson` returns `false` for *all* missing-dep cases without a `message(...)`.** Compare to `exportToSvg` which calls `message("Export dependencies not available", true)` (line 357). `exportToJson` is meant to be invisible, but a fail-silent path makes debugging the "no JSON appeared" path painful.
6. **The conversion-error parsing is duplicated 4× in this file alone.** Lines 437-449 (success-path with marker JSON), 456-471 (catch path) — same shape as `import.service.ts:511-555`. See `import.service.md` §6 TODOs.
7. **Renderer-side HTTP — security caveat.** Same as import: the renderer (with `nodeIntegration: true`) issues the POST. Should arguably live in main. The task spec calls it out explicitly.
8. **Re-entrancy guard is on `export(format)` only**, not on the individual `exportToX` methods. Calling `exportToSvg()` and `exportToDxf()` directly in parallel from JS would race. The button onclick handlers in `main/ui/index.ts:736-751` call them directly, **bypassing the guard**, but that's safe because the user can't click two buttons at the same instant.
9. **Sync `writeFileSync` on the renderer.** A large multi-sheet SVG can be tens of MB. Sync write blocks the renderer event loop. No streaming.
10. **`generateSvgExport` *throws* if `deepNest` or `config` are missing** (line 491). The other public methods return `false` on missing deps. The asymmetry is because `generateSvgExport` is intended to be called from the other methods which have already null-checked their deps; if a future caller hits it with bad state, throwing is louder than a silent boolean.
11. **`<image data-href>` → `<image href>` rewrite is one-way.** Line 540-545 — DeepNest's `importsvg` captures `<image href>` to `data-href` to avoid premature loading; export reverses it. If the spec ever changes (e.g. DeepNest stops using `data-href`), the export rewrite becomes a no-op, not a regression — but you'll lose the lazy-loading semantics on the import side.
12. **`exportToSvg` always appends `.svg`** if missing (line 371). `exportToDxf` does the same for `.dxf` *or* `.dwg` (line 406). The check is case-insensitive (`.toLowerCase().endsWith(...)`). A user who types `cabinets.svg.bak` will get `cabinets.svg.bak` (no append) which won't open.

## 7. Known TODOs / smells

No `// TODO` / `// FIXME` comments are present. Surfacing for follow-up:

1. **Renderer HTTP** (security smell, same as `import.service.ts`).
2. **Quadruple-implemented conversion-error parser** (see §6.6).
3. **Inlined unit-conversion math** in `applyDimensions` (line 620). Should call `configService.getConversionFactor()` (or the inverse) instead of recomputing.
4. **No streaming on large exports.** A 50 MB SVG written sync will jank the UI. Streaming or async write is the fix.
5. **`exportToJson` invisibility / contract ambiguity.** Two callers (the button and `nestingService.stopNesting`'s `saveJsonFn`) both write to the same `exports.json` path — the button never invites the user to choose a name. A "Save As JSON…" affordance would make the export consistent with SVG/DXF.
6. **No format guard on the re-entrancy mutex.** A user clicking "Export SVG" and "Export DXF" rapidly could see one cancel the other (the second `export(...)` returns `false` instantly). The visible button states should reflect this — currently they don't.

## 8. Extension points

- **Add a new format** — extend `ExportFormat`, add a private `exportToX` method, route in `export(format)`, add a static `getFileFilters` case. The `generateSvgExport` core can be reused or replaced with a per-format generator.
- **Per-format options** — extend `ExportOptions`. The current shape is single-purpose (`forDxfConversion`); a more elaborate format-specific options bag would be cleaner.
- **Stream large exports** — replace `XMLSerializer().serializeToString` with chunked write + a Node `WriteStream`. Most fragile change point.
- **Move conversion to main** — same as `ImportService`. The `httpClient` injection point is the seam.

## 9. Test coverage status

- **No unit tests.** DI shape is testable; no fixture exists.
- **E2E covers SVG export only.** `tests/index.spec.ts` clicks `#exportsvg` and verifies the dialog opens (it stubs the path and asserts the file appears). The DXF and JSON paths are uncovered. See [`docs/deep-dive/j/tests__index.spec.ts.md`](../j/tests__index.spec.ts.md).
- **`generateSvgExport`** has no direct test. The output isn't snapshot-tested.
- **`applyLineMerging`** is gated by `mergeLines: true` (a default). The test doesn't run nesting long enough to produce `mergedLength > 0`, so this branch is uncovered.

A snapshot test of `generateSvgExport` against a small known-input nest result would be high-value and inexpensive.

## 10. Cross-references

- [`docs/deep-dive/d/main__ui__services__import.service.md`](./main__ui__services__import.service.md) — sibling: same conversion-server pattern, opposite direction.
- [`docs/deep-dive/d/main__ui__services__nesting.service.md`](./main__ui__services__nesting.service.md) §"Stop sequence" — the consumer of `exportToJson` via the `saveJsonFn` callback.
- [`docs/deep-dive/d/main__ui__services__config.service.md`](./main__ui__services__config.service.md) §3 — config keys this service reads.
- [`docs/deep-dive/c/main__ui__index.ts.md`](../c/main__ui__index.ts.md) — composition root and export-button wiring (`#exportjson`, `#exportsvg`, `#exportdxf`).
- [`docs/deep-dive/c/main__ui__types__index.ts.md`](../c/main__ui__types__index.ts.md) — `SelectableNestingResult`, `SvgParserInstance`, `Part`.
- [`docs/deep-dive/b/main__deepnest.js.md`](../b/main__deepnest.js.md) — `DeepNest.parts` and `DeepNest.nests` shape.
- [`docs/deep-dive/g/main__index.html.md`](../g/main__index.html.md) — `#export`, `#exportjson`, `#exportsvg`, `#exportdxf` button DOM.
- [`docs/deep-dive/b/main__svgparser.js.md`](../b/main__svgparser.js.md) — `applyTransform`, `flatten`, `splitLines`, `mergeOverlap`, `mergeLines` (the line-merging pipeline used here).
