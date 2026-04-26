# `main/util/svgpanzoom.js`

> Deep dive — Group B / B2. **Vendored.**

## Upstream

- Project: [bumbu/svg-pan-zoom](https://github.com/bumbu/svg-pan-zoom)
- Version: **3.6.2**
- License: BSD-2-Clause

## How it is loaded

Classic `<script src="util/svgpanzoom.js">` in `main/index.html`, after `ractive.js` and before `simplify.js`. Installs `window.svgPanZoom` as a callable factory.

## Why we use it

Per-import zoom and pan inside the parts table thumbnails. Callsite: `main/ui/components/parts-view.ts:294` —

```ts
importItem.zoom = svgPanZoom("#import-" + i + " svg", {
  zoomEnabled: true,
  controlIconsEnabled: true,
  fit: true,
  center: true,
});
```

— stored on each import row so subsequent re-renders can `destroy()` the previous instance. The TS-side declares the function as ambient (`declare function svgPanZoom(...)`) at `main/ui/components/parts-view.ts:62` because there is no first-party `@types/svg-pan-zoom@3.6.2` in our dependency tree.

The library is referenced once in commit `3d28304` (`update svg pan zoom`) — the file was bumped to 3.6.2 from an older drop.

## Local fork notes

None. Pre-minified upstream release.

## Replace / upgrade path

- Upstream is dormant since 2019; no recent maintenance.
- Modern alternatives: `panzoom`, native SVG `viewBox` manipulation, or CSS `transform: scale()`.
- Out of scope of the brownfield docs pass.

## Test coverage

Manual / E2E only. The Playwright spec doesn't drive zoom controls.
