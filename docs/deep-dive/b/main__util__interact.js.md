# `main/util/interact.js`

> Deep dive — Group B / B2. **Vendored.**

## Upstream

- Project: [taye/interact.js](https://github.com/taye/interact.js)
- Author: Taye Adeyemi (2012-2015 vendored)
- Version: **1.2.6**
- License: MIT

## How it is loaded

Classic `<script src="util/interact.js">` in `main/index.html` (visible renderer only — not loaded in the background renderer). Installs `window.interact` as a callable factory.

## Why we use it

Resizable / draggable splitter on the parts list. Callsite: `main/ui/index.ts:558` —

```ts
interact(".parts-drag").draggable({ ... })
```

— the only consumer in the production codebase. `parts-view.ts` and `nest-view.ts` do not use it directly. The TS-side gets a thin `declare const interact: (selector: string) => …` at `main/ui/index.ts:56` because there are no `@types/interact.js@1.2.6` available.

## Local fork notes

None. The file is the upstream 1.2.6 release verbatim.

## Replace / upgrade path

- The library has been continuously maintained — current version is 1.10.x with breaking changes around module structure and pointer events. Upgrading would mean:
  1. Replace the classic-script load with `import interact from 'interactjs'` (TypeScript-friendly).
  2. Remove the `declare const interact: …` shim in `main/ui/index.ts`.
  3. Update the `.parts-drag` configuration for any 2.x API shifts.
- Out of scope of the brownfield docs pass. Leave the vendored copy unless we hit a real bug.

## Test coverage

Indirectly via E2E (the parts-list splitter is interacted with during the import flow), but no spec assertion that the splitter works. Manual.
