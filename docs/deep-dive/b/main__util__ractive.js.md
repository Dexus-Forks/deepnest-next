# `main/util/ractive.js`

> Deep dive — Group B / B2. **Vendored.**

## Upstream

- Project: [Ractive.js](https://ractive.js.org) (no longer actively maintained — the project is in long-term maintenance mode; last upstream release was 0.10.x)
- Version: **0.8.1** (commit `fd141daa3bb45f2d176cf5268e71483436039727`, 2016-10-20)
- License: MIT

## How it is loaded

Classic `<script src="util/ractive.js">` in `main/index.html`. Installs `window.Ractive` (the bundle has a UMD-ish header that prefers `module.exports` if available, falls back to `define`, then to `global.Ractive`). Not loaded in the background renderer.

## Why we use it

Two-way data binding for the parts table and the nest results viewer. Per ADR-006 (`docs/architecture.md`), Ractive is a frozen choice — replacing it would invalidate every template attribute used by the legacy components.

Consumers:

- `main/ui/components/parts-view.ts` — `new Ractive({ … })` over `#parts-template` for the parts list.
- `main/ui/components/nest-view.ts` — same pattern for nest results. Stashed on `window.nest`.
- `main/ui/components/sheet-dialog.ts` — refers to the Ractive instances of the two components above.

The TS side declares `Ractive` as a `declare const` ambient global at the top of each consumer; there is no `@types/ractive` fitting v0.8.1.

## Local fork notes

None. The bundle is the upstream 0.8.1 release.

## Replace / upgrade path

- ADR-006 says do not replace Ractive — new UI work should prefer plain DOM + the existing service layer. Honour that ADR unless you are deliberately superseding it.
- If we ever do migrate, plan a full rewrite of `parts-view.ts` and `nest-view.ts` (the two non-trivial components) plus the surrounding `sheet-dialog.ts`. Templates live inline in `main/index.html` (`<script id="parts-template" type="text/ractive">…</script>`).

## Test coverage

E2E (`tests/index.spec.ts`) drives the parts list and nest viewer to assert imports and nests count, which exercises the Ractive binding paths. No unit tests.
