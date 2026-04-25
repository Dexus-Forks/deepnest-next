# `main/util/point.ts`

> Deep dive — Group B / B2. **First-party** TypeScript utility.

## Purpose

`Point` is the canonical `{x, y}` type used by every layer of the geometry stack — SVG parser, polygon offsetting, NFP cache, hull computation. The class adds a small set of distance / midpoint / equality helpers and an optional `marked` flag used by polygon simplification (`simplify.js`) to preserve specific vertices.

## Public surface

```ts
export class Point {
  x: number;
  y: number;
  marked?: boolean;                          // honoured by simplify.js
  constructor(x: number, y: number);
  squaredDistanceTo(other: Point): number;
  distanceTo(other: Point): number;
  withinDistance(other: Point, distance: number): boolean;
  plus(dx: number, dy: number): Point;       // returns a new Point
  to(other: Point): Vector;                  // returns this − other
  midpoint(other: Point): Point;
  equals(obj: Point): boolean;
  toString(): string;                        // "<x.x, y.y>"
}
```

## IPC / global side-effects

None. Pure data class.

## Dependencies

**In** (importers):

- `main/nfpDb.ts` — clones polygon vertices on cache read/write.
- `main/svgparser.js` — bezier endpoints / merge-line work.
- `main/deepnest.js` — `getHull` uses `Point` to populate the hull input.
- `main/background.html` — preloads the type for native-addon glue.
- `main/util/matrix.ts` — `calc(point)` consumes / returns `Point`.
- `main/util/HullPolygon.ts` — operates on `Point[]`.

**Out**: `Vector` from `./vector.js` (used by `to(other)`).

## Invariants & gotchas

- **Constructor throws on `NaN`.** This is deliberate — `NaN` propagates silently otherwise. Be ready to handle the throw at the SVG parsing boundary (e.g. malformed `d=""` paths produce `NaN` from `parseFloat`).
- **`to(other)` is `this − other`**, not `other − this`. The asymmetry trips people who reach for "vector from a to b" — that's actually `b.to(a)`.
- **`marked` is opt-in**. Most call sites never touch it; `simplify.js` reads it to keep specific vertices through Ramer-Douglas-Peucker.
- **`equals` does strict `===`** — no tolerance. For tolerance comparisons use `withinDistance` or `GeometryUtil.almostEqualPoints`.
- **`plus(dx, dy)` accepts numbers, not a `Point`/`Vector`.** No overload; do not pass an object.
- **`toString` rounds to 1 decimal** — useful for logs but lossy. Don't use it as a serialisation format.

## Known TODOs

None currently. Could expose a tolerance parameter on `equals` if a use case arises.

## Extension points

- Adding `subtract`, `add`, `rotate(angle, origin)` would consolidate ad-hoc math scattered through `background.js`. Be careful with the existing `to(other)` semantics if you do.

## Test coverage

Indirectly via the E2E nesting run. No unit tests.
