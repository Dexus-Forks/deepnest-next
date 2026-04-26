# `main/util/vector.ts`

> Deep dive — Group B / B2. **First-party** TypeScript utility.

## Purpose

`Vector` is the 2D direction-with-magnitude companion to `Point`. Used to express edges (`P0.to(P1)` returns a `Vector`), and supports dot product, length, scaling, and unit normalisation. Floating-point comparison at `1e-9` tolerance.

## Public surface

```ts
export class Vector {
  dx: number;
  dy: number;
  constructor(dx: number, dy: number);
  dot(other: Vector): number;
  squaredLength(): number;
  length(): number;
  scaled(scale: number): Vector;
  normalized(): Vector;
}
```

`TOL = 1e-9` and `_almostEqual` are file-private — both intentionally.

## IPC / global side-effects

None.

## Dependencies

**In**: `main/util/point.ts` (`Point.to` returns a `Vector`). No other current importer.

**Out**: none.

## Invariants & gotchas

- **`normalized()` short-circuits on already-unit vectors** via `_almostEqual(sqLen, 1)` — returns `this` (not a clone). Don't mutate the result.
- **`scaled` and `normalized` return new `Vector` instances**; the rest of the API is read-only.
- **`length` allocates** via `Math.sqrt` — prefer `squaredLength` in inner loops where you only need to compare magnitudes.
- **No `add`, `subtract`, `cross`, `rotate`** — extend if needed.
- **`TOL = 1e-9`** is duplicated in `geometryutil.js`. Keep the values aligned if you tune one.

## Known TODOs

- Single-importer means most edge math in `background.js` and `geometryutil.js` still uses raw `{dx, dy}` literals. A consolidation pass would migrate them.

## Extension points

- Add `cross(other): number` for 2D cross product (`dx*other.dy - dy*other.dx`) — already inlined in several callers.

## Test coverage

Indirect via E2E. No unit tests.
