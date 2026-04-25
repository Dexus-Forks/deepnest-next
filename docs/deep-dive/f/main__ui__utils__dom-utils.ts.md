# `main/ui/utils/dom-utils.ts` — Deep Dive

**Generated:** 2026-04-25 by Paige (Tech Writer) for [DEE-17](/DEE/issues/DEE-17) (parent: [DEE-11](/DEE/issues/DEE-11)).
**Group:** F — UI utilities.
**File:** `main/ui/utils/dom-utils.ts` (500 LOC, TypeScript, strict).
**Mode:** Exhaustive deep-dive.

## Overview

Type-safe wrapper layer over the browser DOM API used by every TypeScript module in `main/ui/`. The module is a leaf in the renderer dependency graph — it imports nothing from this codebase and depends only on the standard `Document`/`Element`/`SVGElement` lib types.

It is a **pure helper module**: every export is a stand-alone function, every function is side-effect-only against the element it receives, and there is no shared state. The module exists so that components can swap raw `document.querySelector` / `setAttribute` calls for typed wrappers and avoid the legacy `page.js` jQuery-via-window pattern.

The module also intentionally does **not** wrap or know about Ractive — components that render with Ractive still go through Ractive APIs, and only reach for `dom-utils` when they need to touch DOM that Ractive does not own (modals outside the template root, the side nav, IPC-driven snapshots).

## Public surface

The module has 30 exports. Grouped by purpose:

| Group | Exports |
|---|---|
| Constants | `SVG_NAMESPACE` |
| Lifecycle | `documentReady` |
| Selection | `getElement`, `getElements`, `getElementById` |
| Element creation | `createSvgElement` (overloaded), `createHtmlElement` |
| Class manipulation | `addClass`, `removeClass`, `toggleClass`, `hasClass` |
| Attributes | `setAttributes`, `removeAttribute`, `getDataAttribute`, `setDataAttribute` |
| SVG serialization / cloning | `serializeSvg`, `cloneSvgElement`, `cloneSvgElementDeep` |
| Tree mutation | `clearChildren`, `removeFromParent` |
| Visibility / style | `setVisible`, `setStyle`, `setStyles`, `getComputedStyleValue` |
| Events | `addListener`, `removeListener`, `preventEvent` |
| Inner content | `setInnerHtml`, `setInnerText` |
| SVG transform / viewBox helpers | `createViewBox`, `createTranslate`, `createCssTransform` |

### Selection helpers (most-used)

```ts
function getElement<T extends Element = Element>(
  selector: string,
  parent?: Document | Element
): T | null;

function getElements<T extends Element = Element>(
  selector: string,
  parent?: Document | Element
): NodeListOf<T>;

function getElementById<T extends HTMLElement = HTMLElement>(
  id: string
): T | null;
```

- `getElement` and `getElements` accept an **optional parent**; default is `document`. Components that want scoped queries (Group E nest-view, parts-view) pass an SVG `<g>` root or a modal element.
- `getElementById` is a thin wrapper that always queries `document`. Currently **unused outside the module** — every importer goes through `getElement('#…')` instead.
- All three return `null` (or an empty NodeList) when no match exists; nothing throws. Call sites are expected to null-check, and most do (see `navigation.ts` lines 156–198).

### When selectors return null

`getElement` returns `null` whenever `parent.querySelector` would. The wrapper does **not** validate the selector or log misses. Common reasons for `null` in this codebase:

- The renderer fired before the DOM was fully populated (`window.config` IPC bridge had not yet replaced placeholder markup).
- A modal’s root was removed from `document.body` after dialog close. `getElement` against the detached root still works as long as the caller kept the reference; against `document` it returns `null`.
- The id/class is wrong (typo, or the HTML in `main/index.html` was renamed without updating the selector). The wrapper has no protection against this — silent `null` is the worst-case outcome and the reason every component double-guards (`if (!el) return;`).

### `createSvgElement` overloads

```ts
function createSvgElement<K extends keyof SVGElementTagNameMap>(
  tagName: K
): SVGElementTagNameMap[K];
function createSvgElement(tagName: string): SVGElement;
```

The string overload is the SVG escape-hatch. Pass `"foreignObject"`, `"use"`, `"symbol"`, or any custom-namespaced element and the wrapper still binds the SVG namespace via `document.createElementNS(SVG_NAMESPACE, tagName)`. The typed overload is preferred — `createSvgElement("rect")` infers `SVGRectElement`.

The DOM API requires SVG elements to be created with `createElementNS` (not `createElement`); using the wrong factory silently produces an HTML element that **renders blank inside an `<svg>`**. This is the core reason this helper exists.

### Class helpers

```ts
function addClass(element: Element, className: string): void;
function removeClass(element: Element, className: string): void;
function toggleClass(element: Element, className: string, force?: boolean): boolean;
function hasClass(element: Element, className: string): boolean;
```

All four are 1:1 wrappers around `element.classList`. They are preferred over direct `className` writes because `className = "active"` clears every other class on the element (see the deliberate use in `navigation.ts` — that file mixes both styles and is documented in [main__ui__components__navigation.md](../e/main__ui__components__navigation.md)).

### Attributes

`setAttributes(el, { foo: '1', bar: '2' })` is the bulk setter; useful for fresh SVG nodes (`createSvgElement('rect')` followed by `setAttributes(rect, { x: '0', y: '0', width: '10', height: '10' })`).

`getDataAttribute(el, 'config')` returns the value of `data-config` (with the prefix prepended internally — pass the bare key). `setDataAttribute(el, 'config', 'units')` likewise. **Currently unused outside the module** — `index.ts` reads `data-config` and `data-conversion` via the native `getAttribute("data-config")` directly, not through this helper. Adopting the helper consistently is a low-risk follow-up.

### SVG serialization & clone

```ts
function serializeSvg(svg: SVGElement): string;          // XMLSerializer
function cloneSvgElement<T extends SVGElement>(el: T): T;       // shallow
function cloneSvgElementDeep<T extends SVGElement>(el: T): T;   // deep
```

`serializeSvg` is the canonical SVG → string path used by `parts-view.ts` and `nest-view.ts` for export. It uses the browser’s `XMLSerializer`, so the output may include the `xmlns` attribute the browser adds for the root element only.

The two clone helpers cast the `Node` returned by `cloneNode` back to the original `T`. They are exported but **not used outside the module**. Prefer the deep variant for SVG groups that wrap geometry — shallow clones drop child paths.

### Style / visibility

`setVisible(el, true|false, displayValue?)` toggles `style.display` between `displayValue` (default `"block"`) and `"none"`. **Currently unused** — modals in this codebase toggle a visibility class instead.

`setStyle` / `setStyles` are typed wrappers over `element.style.*` writes. `setStyle` uses an `as any` cast so it accepts both camelCase (`backgroundColor`) and kebab-via-camel (`backgroundColor`) keys — the underlying `CSSStyleDeclaration` only accepts camelCase, so don’t pass `"background-color"`. Both are **unused outside the module** today.

### Event helpers

`addListener` / `removeListener` are typed pass-throughs to `addEventListener` / `removeEventListener`, with a third `AddEventListenerOptions` arg on `addListener`. **Both currently unused outside the module** — every importer uses `element.addEventListener` directly.

`preventEvent(event)` does both `preventDefault()` AND `stopPropagation()` in a single call. **Currently unused outside the module.**

### Inner content

`setInnerHtml(el, html)` is a thin wrapper. It is **not** sanitized — the JSDoc on line 408 explicitly warns about XSS. The single in-tree caller is `nest-view.ts` line 226-ish, which embeds nested SVG markup that originated from local files (not network input). If a future code path pipes user input through this helper, it must sanitize first.

`setInnerText(el, text)` uses `innerText` (not `textContent`) and is XSS-safe. **Currently unused outside the module.**

### Transform / viewBox helpers

```ts
function createViewBox(x: number, y: number, w: number, h: number): string;
function createTranslate(x: number, y: number): string;          // SVG transform=
function createCssTransform(x: number, y: number, rot?: number): string;  // CSS transform:
```

`createViewBox` is **unused outside the module**.
`createTranslate` produces `"translate(50 100)"` (space-separated, SVG flavor) — used by `nest-view.ts` to position part copies in the result SVG.
`createCssTransform` produces `"translate(50px, 100px) rotate(45deg)"` (CSS flavor with `px` and a comma) — used by `nest-view.ts` for hover-preview overlays.

These two helpers exist because SVG `transform=""` and CSS `transform:` use different number syntax — confusing them produces transforms that silently no-op.

## Used-by

Verified with `rg -nU --type ts "from\\s+['\"][^'\"]*dom-utils[^'\"]*['\"]"`.

| Importer | Symbols pulled | Notes |
|---|---|---|
| `main/ui/index.ts:35` | `getElement`, `getElements` | Composition root — uses helpers for top-level mounting. |
| `main/ui/components/navigation.ts:7` | `getElements`, `getElement`, `addClass`, `removeClass`, `toggleClass`, `hasClass` | Side nav state machine. |
| `main/ui/components/parts-view.ts:15` | `getElement`, `getElements`, `createSvgElement`, `serializeSvg`, `removeFromParent`, `setAttributes` | Parts list and SVG preview. |
| `main/ui/components/nest-view.ts:15` | `getElement`, `getElements`, `createSvgElement`, `setAttributes`, `serializeSvg`, `setInnerHtml`, `createTranslate`, `createCssTransform` | Result viewer. |
| `main/ui/components/sheet-dialog.ts:13` | `getElement`, `createSvgElement`, `setAttributes`, `addClass`, `removeClass` | New-sheet dialog. |

No service in `main/ui/services/` imports from `dom-utils.ts`. Services own DOM-free business logic; renderer side-effects are routed through components (the inverted-dependency rule documented in `architecture.md` §3).

### Exports never imported anywhere

The following exports are reachable but unused in the current tree. They are **not** dead-code-elimination candidates yet (the module is not tree-shaken — see "Build & loading" below), but they are not load-bearing for any feature today:

- `documentReady`
- `getElementById`
- `createHtmlElement`
- `removeAttribute` (the wrapper — native `Element.removeAttribute` is called directly five times across services and components)
- `getDataAttribute`, `setDataAttribute`
- `clearChildren`
- `cloneSvgElement`, `cloneSvgElementDeep`
- `setVisible`
- `setStyle`, `setStyles`, `getComputedStyleValue`
- `addListener`, `removeListener`, `preventEvent`
- `setInnerText`
- `createViewBox`

If a future change deletes these, no in-tree consumer breaks. Treat any external dependency on the module (e.g., a downstream plugin or fork) as out of scope for this audit.

## Build & loading

`main/ui/utils/dom-utils.ts` is compiled by `tsc` to `build/ui/utils/dom-utils.js` (see `tsconfig.json`’s `outDir`) and loaded via the renderer module graph rooted at `main/ui/index.ts`. It is **not** loaded as a classic `<script>` and does **not** install anything on `window`. There is no `globalThis` mutation anywhere in the file.

Imports in `.ts` files use the `.js` extension (`from "./utils/dom-utils.js"`) per the project's NodeNext module resolution — this is intentional and required, not a typo.

## Side effects

None at module load time. Every export is a function that, when called, mutates only the element passed in. No timers, no IPC, no console output, no network.

## Error handling

The module deliberately propagates browser-native behavior:

- Selectors return `null` when nothing matches; callers must null-check.
- `setAttribute` on a removed (orphan) element is silently accepted by the DOM.
- `XMLSerializer().serializeToString` will throw `DOMException` only if the input is not a node — this is impossible from TypeScript because the parameter is typed `SVGElement`.
- Class-list operations on `null` would throw `TypeError`, but the typed signature (`element: Element`) prevents that at compile time.

There is no logging, no `message()` banner, no telemetry. This is correct for a leaf util but means **misuse is silent** — the wrapper buys you types, not safety.

## Testing

- **Unit tests:** none in repo for this file (UI test surface is Playwright E2E, per `architecture.md` §6).
- **E2E coverage:** every test that loads the renderer exercises this module transitively. There is no isolated coverage of, e.g., `cloneSvgElementDeep`. The unused exports listed above are not exercised at all.
- **Manual verification:** import the module in a one-off script:
  ```ts
  import { getElement } from "./utils/dom-utils.js";
  console.log(getElement<HTMLElement>("#sidenav"));
  ```

## Comments / TODOs in source

The file has full JSDoc on every export and a single intentional `eslint-disable-next-line @typescript-eslint/no-explicit-any` on line 331 inside `setStyle`. There are no `TODO`, `FIXME`, `HACK`, or `XXX` markers.

## Contributor checklist

**Risks & gotchas:**

- `setInnerHtml` is **not** XSS-safe. Never feed user-controlled strings through it. The current sole caller (`nest-view.ts`) consumes locally-loaded SVG content.
- `setStyle` casts to `any` to allow camelCase strings; passing kebab-case (`"background-color"`) silently no-ops. Use camelCase.
- `createTranslate` and `createCssTransform` look interchangeable — they are not. SVG `transform="..."` and CSS `transform: ...` use different syntax (space-vs-comma, no `px`-suffix vs. `px`-suffix). Picking the wrong one will make the element silently fail to translate.
- The unused exports listed in **"Exports never imported anywhere"** are not part of any contract today. Adding a new caller is fine; refactoring their signatures is a free move (no consumer breaks).
- `getElement<T>` is a *cast*, not a check. Passing the wrong generic returns `null` or the wrong type at runtime without warning. Match `T` to the selector’s actual element class.

**Pre-change verification:**

- `npm run build` (TypeScript strict catches selector-arg/type drift on every importer).
- For UI-visible changes, launch the app: `npm start`, click through every tab, drag a part around the parts view, open the sheet dialog. The five components in **Used-by** cover the full surface.

**Suggested tests before PR:**

- `npm test` — Playwright E2E. Any regression in selection/class helpers will surface in `tests/specs/config-tab.spec.ts` (relies on tab class state) or `tests/specs/import.spec.ts` (relies on parts-view DOM).
- If you change the SVG path (`createSvgElement`, `serializeSvg`, transform helpers) re-run the export flow manually — Playwright does not currently snapshot the serialized SVG output.

## Cross-references

- **Group D (services):** none consume this directly. Services delegate DOM access to their owning component.
- **Group E (UI components):** all five components in [docs/deep-dive/e/](../e/) consume `dom-utils`. See each component's "Dependencies" section for the exact symbol set.
- **Group G (`main/index.html`):** the markup these helpers operate on. Selectors used by the importers (`#sidenav li`, `.page.active`, `.parts li`, `#nest svg`, etc.) all originate in `main/index.html`. A doc audit of the HTML/selector contract is filed under DEE-19 (Group G).
- **Component inventory:** `docs/component-inventory.md` row "DOM utilities" (`main/ui/utils/dom-utils.ts`).
- **Architecture:** `docs/architecture.md` §3 (renderer composition); §4 (TypeScript module conventions and the `.js` extension on imports).

---

_Generated by Paige for the Group F deep-dive on 2026-04-25. Sources: `main/ui/utils/dom-utils.ts`, all importers under `main/ui/`, `main/index.html`._
