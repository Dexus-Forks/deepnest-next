# `main/util/pathsegpolyfill.js`

> Deep dive — Group B / B2. **Vendored.**

## Upstream

- Project: [progers/pathseg](https://github.com/progers/pathseg)
- Author: Philip Rogers (Google) — drop-in replacement for `SVGPathSeg` / `SVGPathSegList` removed from SVG2 (Firefox 43, Chrome 46+).
- Version: unversioned source release. Vendored as-is.
- License: Apache-2.0 (per upstream `LICENSE`).

## How it is loaded

Classic `<script src="util/pathsegpolyfill.js">` is the **first** script tag in `main/index.html`. It must run before any code that touches `path.pathSegList`.

## Why we use it

`main/svgparser.js#splitPath` and `polygonifyPath` consume `SVGPathElement.prototype.pathSegList` to enumerate path commands. Modern Chromium does not implement this API; `polygonifyPath` would silently no-op without the polyfill.

## Local fork notes

None — vendored verbatim.

## Replace / upgrade path

- The polyfill is the canonical way to keep using `pathSegList`. The "modern" alternative is to parse `path.getAttribute('d')` ourselves; doing so is a non-trivial rewrite of `polygonifyPath` and `splitPath`.
- Out of scope of the brownfield docs pass.

## Test coverage

Indirect via the E2E SVG import (any SVG with `<path>` elements exercises the polyfill).
