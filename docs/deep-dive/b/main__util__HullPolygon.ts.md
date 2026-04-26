# `main/util/HullPolygon.ts`

> Deep dive — Group B / B2. **First-party** TypeScript utility, ported from [d3/d3-polygon v1.0.2](https://github.com/d3/d3-polygon) (BSD-3-Clause). Header comment carries the attribution; the port is a hand-translation, not a vendor pull.

## Purpose

Static utility class providing convex hull, polygon area, centroid, perimeter, and point-in-polygon tests. Used by `main/deepnest.js` (`getHull` for fitness/visualisation) and imported defensively by `main/background.js` (although `background.js`' production path uses local helpers — keep the import for symmetry).

The hull algorithm is monotone-chain with a private upper-hull pass and a flipped (negated y) pass for the lower hull.

## Public surface

```ts
type Polygon = Point[];

export class HullPolygon {
  static area(polygon: Polygon): number;        // signed
  static centroid(polygon: Polygon): Point;
  static hull(points: Polygon): Polygon | null; // CCW; null if n < 3
  static contains(polygon: Polygon, point: Point): boolean;
  static length(polygon: Polygon): number;      // perimeter
}
```

`IndexedPoint` and the `cross` / `lexicographicOrder` / `computeUpperHullIndexes` helpers are file-private.

## IPC / global side-effects

None.

## Dependencies

**In**:

- `main/deepnest.js` — `HullPolygon.hull` for `getHull`.
- `main/background.js` — imports the type but does not call it on the placement hot path.

**Out**: `Point` from `./point.js` (used both for output and to construct vertices for the cross-product check).

## Invariants & gotchas

- **`area` is signed.** Counter-clockwise input gives positive area, clockwise gives negative. Most callers in this repo wrap in `Math.abs(...)` — `deepnest.js` does, `background.js` does, `geometryutil.polygonArea` does. If you write a new caller, follow that convention.
- **`hull` returns `null` when `points.length < 3`.** Don't unwrap blindly. `deepnest.js#getHull` falls back to the input polygon on null.
- **`hull` returns vertices in counter-clockwise order** (matching the d3 source convention). Some downstream code assumes CW for sheet polygons (Clipper inputs after offset) — be deliberate when feeding hull output into Clipper.
- **`contains` uses ray-cast even-odd**. It does not handle holes — for a polygon-with-children check, callers must combine with their own outer-test + child-test.
- **`computeUpperHullIndexes` assumes unique y-values after sort.** The current call sites tolerate duplicates because the ordering breaks ties on `y`. If you preprocess with deduplication, do not strip exact-equal `(x,y)` pairs without checking that this assumption still holds.

## Known TODOs

None in-source. Could promote `Polygon` from a file-local type alias to a shared exported alias.

## Extension points

- Add `simplify(polygon, tolerance)` (Douglas-Peucker) to consolidate the duplicated implementation in `simplify.js`.
- Add `convexHullArea` shortcut for fitness functions in `background.js`.

## Test coverage

Indirect via E2E. No unit tests despite this being one of the easier files to test (no DOM, no IPC).
