# `main/util/clipper.js`

> Deep dive — Group B / B2. **Vendored.**

## Upstream

- Project: [Clipper](http://www.angusj.com/clipper2/) (the legacy Clipper 1.x line — the JS port pre-dates Clipper2)
- JavaScript port: [hasenj/Clipper.js](https://sourceforge.net/projects/jsclipper/) — the file header reads `Clipper Library` rev 482, ported to JS by "Timo".
- Author: Angus Johnson (2010-2014, original C# implementation)
- JS port author: Timo
- Version: **6.2.1.0** (rev 482, 31 October 2014)
- License: Boost Software License Version 1.0

A recent local commit (`d6f21dc`) added defensive guards: `prevent FirstLeft undefined crash; harden DoMaxima and throttle warnings`. That is the only deepnest patch on top of the vendored copy.

## How it is loaded

Classic `<script src="util/clipper.js">` in `main/index.html`, second after the pathseg polyfill. Installs `window.ClipperLib`. Also pulled into `Parallel` workers in `main/background.js` via `p.require('../../main/util/clipper.js')`.

## Why we use it

Boolean polygon operations (intersect / union / difference / xor) and offsetting. Specifically:

- `main/deepnest.js#polygonOffset` — wraps `ClipperLib.ClipperOffset` for the spacing margin.
- `main/deepnest.js#cleanPolygon` — `ClipperLib.Clipper.SimplifyPolygon` + `Clipper.CleanPolygon`.
- `main/deepnest.js#svgToClipper` / `clipperToSvg` — coordinate scale 1e7 conversion (`config.clipperScale`).
- `main/background.js` — `ClipperLib.JS.ScaleUpPath`, `ClipperLib.Clipper.MinkowskiSum` (for the JS-side NFP fallback when the native addon isn't loaded).

## Local fork notes

- The `// rev 482` comment ties this to the upstream SVN revision so future bumps are traceable.
- Commit `d6f21dc` (Dec 2025): protects `FirstLeft` lookup paths from undefined references and throttles the WARN logging that fires from `DoMaxima` under degenerate inputs.

## Replace / upgrade path

- Upstream JS port has not seen a tag since 2014. Bumping requires diffing rev 482 against the latest revision in the SourceForge SVN, then re-applying `d6f21dc`.
- Long-term, **Clipper2** has an official JS port (`clipper2-js`) that is the modern replacement; switching is a non-trivial API change (renamed types, different polytree shape).

## Test coverage

Indirectly via E2E. No unit tests.
