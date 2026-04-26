# `main/util/matrix.ts`

> Deep dive — Group B / B2. **First-party** TypeScript utility (with attribution: `applyTransformString` ported from [fontello/svgpath](https://github.com/fontello/svgpath)).

## Purpose

`Matrix` is the affine 2D transform builder used by the SVG parser to bake nested `transform="…"` attributes into element coordinates so downstream nesting can ignore SVG transforms entirely. It is a chainable queue of operations (`translate`, `scale`, `rotate`, `skewX`, `skewY`, raw `matrix`) flattened on demand into a 6-element row-major matrix `[a, b, c, d, e, f]`.

## Public surface

```ts
export class Matrix {
  v: number[];                                            // base matrix, default identity
  queue: Transformation[];                                // pending ops
  cache: number[] | null;                                 // flattened cache

  constructor(v?: number[]);
  clone(): Matrix;
  isIdentity(): boolean;
  matrix(m: number[]): Matrix;
  matrix(m: ArbitraryMatrix): Matrix;
  translate(tx: number, ty: number): Matrix;
  scale(sx: number, sy: number): Matrix;
  rotate(angle: number, rx: number, ry: number): Matrix;  // degrees, around (rx, ry)
  skewX(angle: number): Matrix;
  skewY(angle: number): Matrix;
  toArray(): number[];                                    // flattened
  calc(point: Point, isRelative?: boolean): Point;
  static combine(m1: number[], m2: number[]): number[];
  static isIdentityMatrix(m: number[]): boolean;
  applyTransformString(transformString: string): Matrix;
  apply(points: Point[]): Point[];
}
```

`Transformation` is an internal interface (`matrix6(): number[]`) implemented by file-private `Translate`, `Scale`, `Rotate`, `SkewX`, `SkewY`, `ArbitraryMatrix` classes — none exported.

## IPC / global side-effects

None.

## Dependencies

**In**: `main/svgparser.js` (`load()` builds a global scale; `applyTransform` walks every element and applies `applyTransformString`).

**Out**: `Point` from `./point.js`.

## Invariants & gotchas

- **`calc(point)` does not mutate `point`** — returns a new `Point`. `apply(points)` maps over the array.
- **`isRelative` skips translation**: pass `true` when transforming a vector-like delta (e.g., a derivative direction); pass `false` (the default) when transforming a position.
- **Rotation goes around `(rx, ry)`**, not the origin. Pass `(angle, 0, 0)` for origin-rotation. The implementation expands to `translate(rx,ry) → rotate → translate(-rx,-ry)` — no separate "rotate around origin" fast path.
- **`cache` is invalidated by every queue mutation**, not by `v` changes — but `v` is not exposed for mutation in any current call site, so this is academic.
- **`matrix(arrayOfSix)`** wraps the array in `ArbitraryMatrix`. `ArbitraryMatrix`'s constructor throws `RangeError` on length mismatch — not when `length === undefined`. If you pass `undefined`, the constructor short-circuits to identity.
- **`applyTransformString`** silently ignores transforms with the wrong arg count (e.g. `rotate(45, 10)` — 2 args isn't a recognised form). It does not throw or warn.
- **Transform composition order matches SVG spec** — left-most transform is outermost. Consumers chain `.translate().rotate().scale()` and it Just Works.
- **`combine` is column-major in argument order, row-major in storage**. Pre-multiply by passing the new op as `m2`.

## Known TODOs

- `_inner` in `nfpDb.ts` and the silent-ignore behaviour of `applyTransformString` are the closest things to debt here. No `// todo:` markers in the file.

## Extension points

- Adding `inverse()` would let callers undo a transform without rebuilding from primitives — currently no caller needs this.
- Adding `decompose()` to extract translation/rotation/scale would make debugging composite transforms easier.

## Test coverage

Indirect via E2E SVG import (which goes through `applyTransform` → this class on every nested transform). No unit tests; the public surface is straightforward and stable since import.
