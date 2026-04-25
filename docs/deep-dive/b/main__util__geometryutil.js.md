# `main/util/geometryutil.js`

> Deep dive — Group B / B2. **First-party** classic-script JS utility (Jack Qiao, MIT license — original author of Deepnest's predecessor).

## Purpose

Big bag of geometry primitives the GA/placement engine needs: bezier linearisation (quadratic, cubic, arc), polygon area/bounds/point-in-poly, line-segment intersect, polygon offset slide / projection distance, NFP construction (rectangle and general), polygon hull, polygon rotation. Loaded as a classic `<script>` so it installs `window.GeometryUtil` for both `main/index.html` (visible renderer) and `main/background.html` (hidden renderer); also `require()`d by `parallel.js` workers.

## Public surface

Installed on `window.GeometryUtil`. Public methods (file line numbers in parens):

| Group | Methods |
|---|---|
| Tolerance | `withinDistance` (190), `almostEqual` (194), `almostEqualPoints` (195) |
| Bezier | `QuadraticBezier.{isFlat, linearize, subdivide}` (211/224/251), `CubicBezier.{isFlat, linearize, subdivide}` (275/300/329) |
| Arc | `Arc.linearize`, `Arc.centerToSvg`, `Arc.svgToCenter` (368/431/468) |
| Line | `lineIntersect` (192) |
| Polygon | `getPolygonBounds` (553), `pointInPolygon` (586), `polygonArea` (635), `intersect` (647), `polygonEdge` (808), `pointLineDistance` (956), `pointDistance` (1027), `segmentDistance` (1077), `polygonSlideDistance` (1245), `polygonProjectionDistance` (1312), `searchStartPoint` (1375), `isRectangle` (1505), `polygonHull` (1913), `rotatePolygon` (2108) |
| NFP | `noFitPolygonRectangle` (1528), `noFitPolygon` (1588) |

`TOL = 1e-9` is file-local (matching `vector.ts`).

## IPC / global side-effects

- Installs `root.GeometryUtil = { … }` where `root === this` from the IIFE (line 2147 `})(this)`). In a classic-script context, `this` is `window`; in a `Parallel` worker, `this` is `self`. Both yield a global named `GeometryUtil`.
- No IPC.

## Dependencies

**In**:

- `main/index.html` — classic `<script src="util/geometryutil.js">` before any module code runs.
- `main/background.html` — same.
- `main/background.js` — uses `GeometryUtil.polygonArea`, `getPolygonBounds`, `noFitPolygon`, `intersect`, etc., on the placement hot path.
- `main/svgparser.js` — `Bezier.linearize`, `Arc.linearize`, `_almostEqual` indirectly.
- `main/deepnest.js` — `polygonArea`, `almostEqual`, etc.
- `main/util/parallel.js` workers — `p.require('../../main/util/geometryutil.js')` in `background.js#background-start`.

**Out**: none. Pure JS, no imports.

## Invariants & gotchas

- **`polygonArea` returns half the shoelace sum**, with sign reflecting orientation. `Math.abs(polygonArea(p))` for area-only comparisons.
- **`pointInPolygon` returns `null`, `true`, or `false`** — `null` for "on the edge within `tolerance`". A few call sites pattern-match on `null` for tie-handling; replacing with `boolean` would be a behavioural change.
- **`noFitPolygonRectangle(A, B)`** is a fast-path used when `A` is a rectangle (sheet-shaped). Result coordinate space matches the convention used by `noFitPolygon`. If you generalise the rectangle detection, change both.
- **`noFitPolygon`** is the JS fallback for when the native `@deepnest/calculate-nfp` addon is unavailable. The output convention (origin and orientation) matches the addon's contract — both are translated by `B[0]` after the fact in `background.js`. Don't change the convention without updating the addon.
- **Classic-script load order** — must come *after* `pathsegpolyfill.js` (it's pure geometry, but the polyfill must be in place for the rest of the SVG stack) and *before* the module block.
- **`polygonHull` is distinct from `HullPolygon.hull`** — this returns a Minkowski-style "outer hull of A and B", not a convex hull of one polygon. They are not interchangeable.
- **`rotatePolygon` mutates bounds metadata** on the returned polygon (`x`, `y`, `width`, `height`). Don't reuse the input array; clone first.

## Known TODOs

- Commented-out marked-point preservation block in `simplifyDPStep` of `simplify.js` is the closest related debt; in `geometryutil.js` itself there are no `// todo:` markers.
- Function count is high (>30 methods); a TypeScript port would benefit ergonomics.

## Extension points

- **Native NFP toggle** — both `noFitPolygon` and `noFitPolygonRectangle` are call-compatible drop-ins for the addon. To force the JS implementation, comment out the addon path in `background.js#getOuterNfp` / `getInnerNfp`.
- **Curve linearisation tolerance** — driven by `SvgParser.conf.tolerance`; bumping it cuts vertex count globally.

## Test coverage

Indirect via E2E. No unit tests despite the file being pure-function-rich and easy to test offline.
