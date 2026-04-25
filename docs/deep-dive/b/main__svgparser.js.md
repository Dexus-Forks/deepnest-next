# `main/svgparser.js`

> Deep dive — Group B / B1. Parent: [DEE-13](../../../). Template per [DEE-11](../../../).

## Purpose

`main/svgparser.js` turns an SVG string into a normalised DOM tree where every nestable element is reduced to a polygon (or polyline) of `{x, y}` points. It is the only producer of the polygon trees that flow downstream into `DeepNest.getParts`, `polygonOffset`, and the GA. It also handles the SVG-side concerns nobody else wants to touch: namespace fixups, path simplification, transform flattening, open-path merging, and image hrefs.

It is loaded by `main/index.html` as part of the same `<script type="module">` block that boots `DeepNest`. The boot script does `window.SvgParser = new SvgParser()` so all callers can reach it as a singleton via `window.SvgParser`.

## Public surface

ES-module export: `class SvgParser`. `index.d.ts` declares the canonical instance type as `SvgParserInstance`.

| Method | Purpose |
|---|---|
| `config(config)` | Override `tolerance` and `endpointTolerance`. `scale` is set indirectly by `load()`. |
| `load(dirpath, svgString, scale, scalingFactor)` | Parse SVG via `DOMParser`, normalise viewBox / width, push a global `scale(...)` transform so `1 unit = 1 px` of the desired DPI. Stashes `dirpath` for later `imagePaths` href resolution. Returns `svgRoot`. |
| `cleanInput(dxfFlag)` | Pipeline: `applyTransform` → `flatten` (lift all elements out of `<g>`) → `filter(allowedElements)` → `imagePaths` → `recurse(svgRoot, splitPath)` → 3× `mergeLines` with widening tolerances (`toleranceSvg`, `endpointTolerance`, `3*endpointTolerance`). Returns the cleaned `svgRoot`. |
| `polygonify(element)` | Convert one allowed element (`svg`, `circle`, `ellipse`, `path`, `polygon`, `polyline`, `rect`) into an array of `{x,y}` points. Bezier curves are linearised with `GeometryUtil.{Quadratic,Cubic}Bezier.linearize` to `tolerance`. |
| `polygonifyPath(path)` | Path-specific polygonification — handles `M/L/C/Q/A/Z` segments using `pathseg` polyfill data. |
| `isClosed(p, tolerance)` | True if the first and last point are within `tolerance` (used to filter open paths from nesting). |
| `splitPath(path)` | Split compound paths (multiple subpaths in one `d`) into independent `<path>` elements. |
| `splitPathSegments(path)`, `splitLines(root)` | Sub-helpers for the merging pipeline. |
| `getEndpoints(p)`, `getCoincident`, `mergeLines`, `mergeOpenPaths`, `mergeOverlap`, `reverseOpenPath` | Open-path stitching helpers used by `cleanInput`. |
| `pathToAbsolute(path)` | Rewrite all relative path commands (`m/l/c/…`) as absolute (`M/L/C/…`). |
| `transformParse(transformString)` | Convert an SVG transform string into a `Matrix` (delegates to `Matrix.applyTransformString`). |
| `applyTransform(element, globalTransform, skipClosed, dxfFlag)` | Walk the tree, multiplying nested transforms into a single matrix per leaf, then bake them into element coordinates so downstream code can ignore transforms. `dxfFlag` toggles a special-case for DXF imports that arrive pre-transformed. |
| `flatten(element)` | Move all descendants of `<g>` (and similar grouping elements) up to top level so the tree is one node deep. |
| `filter(whitelist, element)` | Remove elements whose `tagName` is not in `allowedElements`. |
| `recurse(element, func)` | Generic depth-first walk. |
| `imagePaths(svg)` | Resolve `<image href>` to absolute `file://` URLs based on `dirPath`. |

Public instance state:

- `svg`, `svgRoot` — current document and its root element.
- `dirPath: string | null` — directory of the loaded SVG, used to resolve image hrefs.
- `allowedElements: string[]` — what survives `filter()`. Drives `cleanInput`.
- `polygonElements: string[]` — what `polygonify` accepts.
- `conf: { tolerance, toleranceSvg, scale, endpointTolerance }` — geometry tolerances; `tolerance` and `endpointTolerance` are settable via `config()`, `scale` is set internally by `load()`.

## IPC / global side-effects

- **No direct IPC.** Lives entirely in the visible renderer.
- **Reads `window.GeometryUtil`** — Bezier linearisation, `_almostEqualPoints`, `_withinDistance`. The classic-script load order in `main/index.html` (`geometryutil.js` before the module block) is required.
- **Reads/expects the `pathseg` polyfill** (loaded as `main/util/pathsegpolyfill.js` before the module block). Without it, `path.pathSegList.getItem(i)` is undefined on Chromium 46+. See `main__util__pathsegpolyfill.js.md`.
- **Reads `window.DOMParser`** — overridden conditionally by `main/util/domparser.ts` to add WebKit `text/html` fallback. `image/svg+xml` parsing here uses the native parser; the polyfill is only relevant for SvgParser if the host browser ever fails on `text/html` (it doesn't in current Electron).
- Touches `window.document.createElementNS` (XML SVG namespace) when constructing replacement elements during `splitPath`.

## Dependencies

**In** (who uses):

- `main/deepnest.js` — `importsvg` calls `load` + `cleanInput`; `getParts` calls `polygonify` + `isClosed` + `polygonElements`.
- `main/ui/services/import.service.ts` — drives the user-facing import dialog; ultimately funnels through `DeepNest.importsvg` which talks to this file.
- `main/ui/services/export.service.ts` — uses `applyTransform` indirectly via the imported svg roots stashed on `DeepNest.imports`.

**Out** (imports):

- `../build/util/domparser.js` (compiled `main/util/domparser.ts`) — side-effecting polyfill, mutates `DOMParser.prototype`.
- `../build/util/matrix.js` (compiled `main/util/matrix.ts`) — `Matrix` for transform composition.
- `../build/util/point.js` (compiled `main/util/point.ts`) — `Point` constructor in a few helpers.

Implicit globals: `GeometryUtil`, `ClipperLib` (via `polygonify` callers, not directly), `document`, `DOMParser`, `SVGPathElement` (polyfilled).

## Invariants & gotchas

- **`load()` mutates the parsed SVG root**: it pushes a `scale(...)` transform onto the root's `transform` attribute and rewrites `this.conf.scale`. Calling `load` twice with different `scale`/`scalingFactor` arguments compounds — always use a fresh `SvgParser` per import or call `cleanInput` between loads (which bakes the transform out).
- **`cleanInput` is called once after `load`.** The pipeline assumes ungrouped, transform-free leaves. Skipping `cleanInput` produces nesting input that has unbaked transforms and breaks `polygonify` for anything inside a `<g transform=…>`.
- **Three-pass `mergeLines` widens tolerance.** Replacing one of the passes is fine, but reordering them can swallow short segments before the wide pass would have closed a path.
- **`polygonify` linearises beziers to `conf.tolerance`** — bumping tolerance reduces vertex count (faster nesting) at the cost of rougher edges.
- **DXF-imported SVG**: the converter at `converter.deepnest.app` returns geometry with transforms already baked in; `cleanInput(true)` skips the second-pass transform reapplication that would re-bake them. Don't pass `dxfFlag = true` for hand-authored SVG.
- **`isClosed` tolerates tiny gaps.** `DeepNest.getParts` uses `2 * config.curveTolerance` as the tolerance — open paths within that distance still register as closed. Increase `curveTolerance` to be more permissive of imperfect SVG.
- **Inkscape namespace fixup**: `load()` heuristically inserts `xmlns:inkscape="…"` if the string contains the word "inkscape" but no `xmlns:inkscape` declaration. False positives possible (file metadata mentioning the word) — harmless but verbose.
- **`console.log('this is the scale ', …)` in `cleanInput`** is dev noise. Same kind of "WATCH" log as `background.js`.
- **`splitPath` relies on `pathseg`**. Without the polyfill on Chromium 46+, this method silently no-ops because `pathSegList` is undefined.

## Known TODOs

- Commented-out `splitLines` / `mergeOverlap` block in `cleanInput` (lines ~171–173) — left as "may have unexpected edge cases". A refactor candidate paired with regression tests.
- The unconditional `console.log('this is the scale ', …)` log line.
- No unit tests for `polygonify`/`polygonifyPath` despite the breadth of SVG path syntax it has to handle.

## Extension points

- **New element types** — extend `allowedElements` and `polygonElements`, then add a branch in `polygonify`. `polygonElements` ⊆ `allowedElements`.
- **Alternative path simplification** — `cleanInput` deliberately separates filter/flatten/merge stages. New simplification can slot between them without touching `load()`.
- **Custom transform handling** — override `applyTransform` to support obscure SVG transform attributes (e.g., `viewBox` aware percentage conversions).
- **Image embedding** — `imagePaths` already resolves to file URLs; replace with a base64-data-URL strategy for self-contained exports.

## Test coverage

- E2E — the Playwright spec imports `tests/assets/henny-penny.svg` and `tests/assets/mrs-saint-delafield.svg` through the UI, which exercises this entire file end to end (`load → cleanInput → polygonify → getParts`).
- No unit tests on the pipeline. Regressions show up only when a real-world SVG fails to import.
