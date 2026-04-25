# Deep dive — `main/ui/utils/dom-utils.ts`

> Group F · `DEE-38` (replaces DEE-27/DEE-1f) · parent issue [DEE-11](../../../). Authored fresh from source per the board's full-redo directive.

## Purpose

Type-safe wrappers around the browser DOM API used everywhere in `main/ui/**`. The module is a **pure leaf** — it imports nothing — and centralises the conventions the rest of the renderer relies on:

- One canonical `SVG_NAMESPACE` constant so callers never embed the raw XMLNS string.
- Generic helpers (`getElement<T>`, `createSvgElement<K>`, `addListener<K>`) that propagate the right element / event subtype to the call site, eliminating most `as` casts in components.
- A small surface for class/attribute/style mutation that mirrors the underscore-DOM idioms the JS modules used pre-migration, so TS components can be ported with mechanical refactors.

The whole file is ~500 lines; every export is a one-to-three-line wrapper. It's not a framework — it's a **convention layer**.

## Public surface

`main/ui/utils/dom-utils.ts` exports one constant and 30 functions. Categorised:

| Group | Symbols (line) |
|---|---|
| Constant | `SVG_NAMESPACE` (10) |
| Document lifecycle | `documentReady` (16) |
| Selectors | `getElement<T>` (34), `getElements<T>` (51), `getElementById<T>` (66) |
| Element creation | `createSvgElement<K>` (87, with overloaded signatures at 83 and 86), `createHtmlElement<K>` (100) |
| Class manipulation | `addClass` (114), `removeClass` (126), `toggleClass` (141), `hasClass` (158) |
| Attribute manipulation | `setAttributes` (175), `removeAttribute` (192), `getDataAttribute` (208), `setDataAttribute` (224) |
| SVG-specific | `serializeSvg` (241), `cloneSvgElement<T>` (282), `cloneSvgElementDeep<T>` (294), `createViewBox` (458), `createTranslate` (476), `createCssTransform` (490) |
| Tree mutation | `clearChildren` (252), `removeFromParent` (266) |
| Visibility / styles | `setVisible` (308), `setStyle` (326), `setStyles` (347), `getComputedStyleValue` (440) |
| Events | `addListener<K>` (365), `removeListener<K>` (383), `preventEvent` (401) |
| Inner content | `setInnerHtml` (415), `setInnerText` (427) |

The signatures the rest of the codebase relies on most:

- `getElement<T extends Element = Element>(selector, parent = document): T | null` — every call site MUST guard the return value (see "Invariants").
- `createSvgElement<K extends keyof SVGElementTagNameMap>(tagName: K): SVGElementTagNameMap[K]` — the overload (lines 83-86) preserves the concrete subtype (`SVGRectElement`, `SVGGElement`, …) when the tag is a string literal.
- `addListener<K extends keyof HTMLElementEventMap>(element, eventType: K, handler: (event: HTMLElementEventMap[K]) => void, options?)` — handler parameter is precisely typed via the `K` lookup.

## IPC / global side-effects

None directly — there is no `ipcRenderer` access in this file.

Module-scope side-effect on import: **none.** All exports are pure functions; no top-level statements other than the `SVG_NAMESPACE` constant.

Runtime side-effects when the functions are *called*:

| Function | Side-effect surface |
|---|---|
| `documentReady` | Adds a `DOMContentLoaded` listener on `document` (line 20). Does **not** track-or-remove the listener, so multiple calls register multiple handlers. |
| `serializeSvg` | Instantiates a fresh `XMLSerializer()` per call (line 242). Cheap — but worth knowing for hot loops. |
| `getComputedStyleValue` | Calls `window.getComputedStyle(...)` (line 444), which forces layout if the page has pending DOM mutations. |
| `setInnerHtml` | Writes `element.innerHTML = html` (line 416). HTML is parsed and replaces children; **XSS-vulnerable** if `html` is user-controlled (see Invariants). |
| `setStyle` / `setStyles` | Mutate `element.style.*`. `setStyles` uses `Object.assign(element.style, styles)` (line 351), which silently ignores invalid property names. |
| `addListener` / `removeListener` | Wrap `addEventListener` / `removeEventListener` 1:1 — the same handler reference must be passed to both for removal. |

Globals read: `document`, `window`, `XMLSerializer`. The module assumes a renderer-process Electron context — would not run in the main process or a Node-only worker.

## Dependencies

**None.** Zero `import` statements. The module is the bottom of the dependency graph for `main/ui/**`.

## Used-by

Imported by exactly five TypeScript files in the live tree (importer search executed in this worktree against `main/**/*.ts`):

| Importer | Line of `import { … } from "../utils/dom-utils.js"` (or `./utils/...`) | Symbols pulled in |
|---|---|---|
| [`main/ui/index.ts`](../../../main/ui/index.ts) | 35 | `getElement`, `getElements` |
| [`main/ui/components/parts-view.ts`](../../../main/ui/components/parts-view.ts) | 15-22 | `getElement`, `getElements`, `createSvgElement`, `serializeSvg`, `removeFromParent`, `setAttributes` |
| [`main/ui/components/nest-view.ts`](../../../main/ui/components/nest-view.ts) | 15-24 | `getElement`, `getElements`, `createSvgElement`, `setAttributes`, `serializeSvg`, `setInnerHtml`, `createTranslate`, `createCssTransform` |
| [`main/ui/components/navigation.ts`](../../../main/ui/components/navigation.ts) | 7-14 | `getElements`, `getElement`, `addClass`, `removeClass`, `toggleClass`, `hasClass` |
| [`main/ui/components/sheet-dialog.ts`](../../../main/ui/components/sheet-dialog.ts) | 13-19 | `getElement`, `createSvgElement`, `setAttributes`, `addClass`, `removeClass` |

That's 19 total named-import references. **No service** under `main/ui/services/**` imports `dom-utils` — services (`import.service.ts`, `export.service.ts`, `nesting.service.ts`, `config.service.ts`) talk to the DOM through bypasses (see "Bypasses & gotchas").

Coverage of the export list: ~21 of the 30 exported functions are *unused* outside the file itself. They are kept as a complete convention layer; the unused ones (e.g. `getElementById`, `createHtmlElement`, `setVisible`, `setStyle`, `setStyles`, `addListener`, `removeListener`, `preventEvent`, `setInnerText`, `getComputedStyleValue`, `cloneSvgElement`, `cloneSvgElementDeep`, `getDataAttribute`, `setDataAttribute`, `removeAttribute`, `clearChildren`, `documentReady`, `createHtmlElement`, the `SVG_NAMESPACE` constant) are part of the documented contract for future migrations of the legacy JS modules.

## Invariants & gotchas

1. **All `getElement*` helpers return `null` on miss** — callers MUST guard. There is no overload that throws or asserts. Idiomatic guards in the codebase look like:
   ```ts
   const el = getElement<HTMLInputElement>('#sheetwidth');
   if (!el) return;
   ```
   The `getElementById` wrapper on line 66 uses an `as T | null` cast on `document.getElementById(...)` — note the cast happens unconditionally, so passing the wrong `T` produces a typed `null` rather than a runtime guard. Type-only soundness.

2. **`SVG_NAMESPACE` MUST be used for SVG creation.** A bare `document.createElement("svg")` produces an `HTMLUnknownElement` that does not render. The constant exists so callers cannot mistype the URL. Despite that, three call sites in `main/ui/services/export.service.ts` (lines 494, 508, 532) embed the raw `"http://www.w3.org/2000/svg"` string instead of importing `createSvgElement`/`SVG_NAMESPACE` — see "Bypasses".

3. **`createSvgElement` overload order matters.** The two overload signatures (83-86) must list the typed-tag overload **first** so the compiler picks `SVGRectElement` for `createSvgElement('rect')`. The implementation (line 87) accepts `string` and is unreachable from typed call sites.

4. **`setInnerHtml` is XSS-prone by design.** The JSDoc on lines 407-417 spells this out ("Be cautious about XSS when using innerHTML with user input"). The single in-tree consumer (`nest-view.ts`) feeds it strings built from numeric utilisation values, so it is safe today; any future caller that interpolates filename or part metadata MUST sanitise.

5. **`setStyle` uses `(element.style as any)[property] = value` (line 332)** with an inline `eslint-disable-next-line @typescript-eslint/no-explicit-any` (line 331). The cast is necessary because TS's `CSSStyleDeclaration` has read-only properties for some keys. Don't "clean it up" — the disable comment is load-bearing.

6. **`cloneSvgElement` is shallow, `cloneSvgElementDeep` is deep.** Line 283 calls `cloneNode(false)`; line 295 calls `cloneNode(true)`. The naming is the only signal — pick correctly. Neither helper clones event listeners (DOM `cloneNode` never does).

7. **`removeFromParent` returns a `boolean`** (line 271-272) — `true` if removed, `false` if the node had no parent. Useful for idempotent cleanup; the rest of the helpers return `void`.

8. **`addListener` does not track handlers.** Pairing `addListener(el, 'click', h)` with `removeListener(el, 'click', h)` works only if `h` is the *same* function reference — passing `bind`-ed or arrow-wrapped handlers to `removeListener` silently fails. There is no auto-disposal helper here.

9. **`getDataAttribute(el, "config")` reads `data-config`** (line 212) — the function prefixes `data-`. Don't pass `"data-config"` (you'd get `data-data-config`). Same for `setDataAttribute`. Only one in-tree call needs this attribute API and it lives in [Group G's HTML deep-dive](../g/main__index.html.md) — `main/ui/index.ts` reads `data-config` / `data-conversion` directly via `getAttribute(...)` instead of through these helpers.

10. **`createCssTransform` skips `rotate(0)`.** The check on line 496 (`rotation !== undefined && rotation !== 0`) elides the rotation segment for the no-op case. Useful for compositing — `rotate(0deg)` would still create a stacking context.

## Known TODOs

`grep -n "TODO\|FIXME"` against this file returns **no matches**. The module has no in-source debt markers.

## Extension points

- **Adding a helper.** The convention is one wrapper per browser API call — generic over `Element` or `HTMLElement` where the call site benefits, no business logic. Add it next to its sibling (e.g. an `appendChildren(parent, ...nodes)` helper would slot next to `clearChildren` on line 252).
- **Tightening the SVG creation overloads.** If a new SVG element appears in the codebase (e.g. `<foreignObject>`), the `SVGElementTagNameMap` lookup picks it up automatically — no edit needed.
- **Migrating raw `document.querySelector` callers.** The bypasses in `ui-helpers.ts` (`message()`), `services/export.service.ts`, and `services/nesting.service.ts` should be migrated to `getElement<T>` to recover the type guarantee. See [`main__ui__utils__ui-helpers.ts.md`](./main__ui__utils__ui-helpers.ts.md) and the service deep-dives in [Group D](../d/README.md).
- **A type-asserted `getElementOrThrow<T>(selector)`** would eliminate the boilerplate `if (!el) return;` guards. Not currently exported — would need a single chokepoint design decision before adding.

## Test coverage status

- **No dedicated unit tests.** `tests/index.spec.ts` (Playwright E2E, single file) is the only test in the tree. It exercises the Config tab, which routes through `getElement` indirectly via [`main/ui/index.ts`](../../../main/ui/index.ts) — see [Group J's `tests__index.spec.ts.md`](../j/tests__index.spec.ts.md) for the full IPC/DOM path.
- Effective coverage of this file is therefore **integration only** — every E2E click goes through `getElement`/`getElements`, but type contracts (the generic parameters) are validated only by `tsc`.
- A dedicated unit-test file at `tests/unit/dom-utils.spec.ts` would be cheap to add (functions are pure wrappers + `jsdom`); none exists today.

## Bypasses & gotchas worth knowing for refactors

- [`main/ui/utils/ui-helpers.ts:14-16`](../../../main/ui/utils/ui-helpers.ts) — `message()` calls `document.querySelector("#message")` directly instead of `getElement`. Pre-dates this helper by one migration step. Cross-file gotcha is documented in [`main__ui__utils__ui-helpers.ts.md`](./main__ui__utils__ui-helpers.ts.md).
- [`main/ui/services/export.service.ts:494, 508, 532`](../../../main/ui/services/export.service.ts) — three `document.createElementNS("http://www.w3.org/2000/svg", ...)` calls duplicate the namespace string instead of importing `createSvgElement` / `SVG_NAMESPACE`.
- [`main/ui/services/nesting.service.ts`](../../../main/ui/services/nesting.service.ts) — uses raw `querySelector` in places (importer search hit). A migration story would consolidate these.

## Cross-references

- Importing components live in [Group E](../e/README.md): [`navigation`](../e/main__ui__components__navigation.md), [`nest-view`](../e/main__ui__components__nest-view.md), [`parts-view`](../e/main__ui__components__parts-view.md), [`sheet-dialog`](../e/main__ui__components__sheet-dialog.md).
- The bootstrap that pulls `getElement`/`getElements` is [Group C's `main__ui__index.ts.md`](../c/main__ui__index.ts.md).
- The `data-*` attribute contract that `getDataAttribute`/`setDataAttribute` are designed to address is documented in [Group G's `main__index.html.md`](../g/main__index.html.md).
- Sibling utilities in the same directory: [`conversion.ts`](./main__ui__utils__conversion.ts.md), [`ui-helpers.ts`](./main__ui__utils__ui-helpers.ts.md).
