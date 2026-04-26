# `main/util/simplify.js`

> Deep dive — Group B / B2. **Vendored**. Original: [mourner/simplify-js](https://mourner.github.io/simplify-js) by Vladimir Agafonkin (2013), BSD-2-Clause. Header annotation says "modified by Jack Qiao". The local diff vs upstream is minimal — adds a `marked` flag check inside `simplifyRadialDist` so simplification preserves vertices that downstream code (NFP construction) tagged as significant.

## Purpose

Polyline simplification using a combination of radial-distance prefiltering and Ramer-Douglas-Peucker. Only consumed by `main/deepnest.js#simplifyPolygon` when `config.simplify` is enabled or the native `@deepnest/svg-preprocessor` simplifier is unavailable.

Loaded as a classic `<script>` in `main/index.html` so it installs `window.simplify`.

## Public surface

```
window.simplify(points, tolerance, highestQuality?) → points
```

- `points`: `Array<{x, y, marked?}>`
- `tolerance`: number — Euclidean tolerance (squared internally).
- `highestQuality`: boolean — when truthy, skip the radial prefilter.

## How it is loaded

Classic `<script src="util/simplify.js">` in `main/index.html`, immediately after `svgpanzoom.js`. Uses `window.simplify = simplify` at the bottom of the IIFE, so consumers must run after the script tag. Module code in `main/index.html` runs after all classic scripts, so the order is safe.

## Local fork notes

- Adds `point.marked` check in `simplifyRadialDist` to keep marked points even when below tolerance.
- Commented-out marked-point handling inside `simplifyDPStep` (`if(points[i].marked && maxSqDist <= sqTolerance) { … }`) — left in source as a hint for whoever needs to revive marked-point preservation in the DP pass too.

## Dependencies

**In**: `main/deepnest.js#simplifyPolygon` reads `window.simplify`.

**Out**: none.

## Invariants & gotchas

- Mutates nothing — returns a new array.
- `tolerance < 0` is treated as `1` (default); `tolerance === undefined` also uses `1`.
- Mostly used in `simplifyPolygon` with no tolerance argument — relies on the `1`-default. If you start passing tolerance, expect the simplification ratio to change.

## Test coverage

Indirect via E2E only when `config.simplify === true`. Default config has `simplify: false`, so most CI runs do not exercise this path.

## Extension points

None expected; replace with `@deepnest/svg-preprocessor`'s simplifier or `HullPolygon`-based simplification if you want to consolidate.
