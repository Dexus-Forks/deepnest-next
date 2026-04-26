# `main/util/domparser.ts`

> Deep dive — Group B / B2. **First-party** TypeScript utility — a polyfill installer.

## Purpose

Conditionally extends `DOMParser.prototype.parseFromString` with `text/html` support for environments where the native parser returns `null` for HTML (legacy WebKit). On modern Electron / Chromium this is a no-op — the IIFE detects native support and returns early.

Inspired by [the Eli Grey gist](https://gist.github.com/1129031). Imported by `main/svgparser.js` for its side effect.

## Public surface

No exports. The module is an IIFE invoked at import time.

## IPC / global side-effects

- **Reads** `DOMParser`, `document`.
- **Mutates** `DOMParser.prototype.parseFromString` if and only if a smoke test (`new DOMParser().parseFromString("", "text/html")`) returns null or throws.

## Dependencies

**In**: `main/svgparser.js` (`import '../build/util/domparser.js'`).

**Out**: none. Touches global `DOMParser`, `document.implementation`.

## Invariants & gotchas

- **Side-effect import.** Importing this file mutates global state. Imported once (transitively) by the visible renderer; no need to import elsewhere.
- **Polyfill no-ops in current Electron.** Chromium has supported `text/html` parsing since well before Electron 4. Keep the import anyway — it's cheap and protects future ports to environments that do not (e.g., embedded WebViews).
- **Replaces `parseFromString` only for `text/html`.** All other types (including `image/svg+xml`, which is what `SvgParser.load` actually uses) fall through to the native parser via `nativeParse.apply(this, arguments)`.
- **`arguments as any` cast** is intentional — the polyfill predates strict TypeScript settings. Keep the cast unless you also retype the override to a fixed-arity signature.
- **`<!doctype>` heuristic** — if the markup contains a doctype, the polyfill mounts it under `documentElement.innerHTML`; otherwise under `body.innerHTML`. Matches what SvgParser-style users expect.

## Known TODOs

None. File is 36 lines and does one thing.

## Extension points

None reasonably applicable — replacing the polyfill should be done by deleting the import once we drop support for the affected browsers.

## Test coverage

Indirect via the Playwright run (any module that imports `svgparser.js` triggers the polyfill check). No unit tests.
