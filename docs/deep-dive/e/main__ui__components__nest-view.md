# `main/ui/components/nest-view.ts` — Deep Dive

**Generated:** 2026-04-25 by Paige (Tech Writer) for [DEE-16](/DEE/issues/DEE-16) (parent: [DEE-11](/DEE/issues/DEE-11)).
**Group:** E — UI components.
**File:** `main/ui/components/nest-view.ts` (564 LOC, TypeScript, strict).
**Mode:** Exhaustive deep-dive.

## Overview

The nesting workspace and progress visualisation. Two distinct rendering responsibilities, one DOM root each:

1. **Ractive-driven nest list** at `#nestcontent` (template `#nest-template`). Shows the per-iteration list of best nests, plus headline stats (sheets used, parts placed, utilisation %, laser time saved).
2. **Imperative SVG renderer** at `#nestdisplay` → `#nestsvg`. Built directly with `dom-utils.createSvgElement` calls inside `displayNest()` — there is **no Ractive template** for the SVG. The component constructs/updates `<g id="sheet{n}">` and `<g id="part{n}">` nodes, hatch patterns, and laser-merge `<line class="merged">` markers itself.

`NestViewService` does not subscribe to IPC. Progress and result fan-in is owned by **`NestingService`** (Group D, `main/ui/services/nesting.service.ts`), which calls back into this component via `getDisplayNestCallback()` (the `displayNest` method bound to the instance). The composition root also exposes the Ractive instance to `NestingService` via `setNestRactive(...)` so the service can `update("nests")` after each background iteration.

Originally extracted from `page.js` lines 1463–1697.

## Ractive contract (Group G)

| Surface | Selector | Role |
|---|---|---|
| Mount root | `#nestcontent` | Ractive `el` — content replaced on init. |
| Template | `#nest-template` (inline `<script type="text/ractive">`, lines 93–112 of `main/index.html`) | Source of `#nestinfo`, `#nestlist`, the four headline `<h1>` stat blocks. |
| SVG container | `#nestdisplay` | Sibling div, **NOT** managed by Ractive. `displayNest` writes `<svg id="nestsvg">` here. |
| Selection target | `<span class="nest" on-click="selectnest:{{this}}">` | Each nest in `nests` array. |

```mermaid
graph TB
    subgraph "Ractive root: #nestcontent"
        T[#nest-template]
        T --> Stats[#nestinfo + 4 stat groups]
        T --> List[#nestlist span.nest x N]
    end
    subgraph "Imperative SVG root: #nestdisplay"
        SVG[#nestsvg]
        SVG --> Sheets[<g id='sheet{n}'>]
        SVG --> Parts[<g id='part{n}'>]
        SVG --> Merged[<line class='merged'>]
    end
    List -. selectnest event .-> displayNest
    displayNest --> SVG
```

## Public surface

```ts
class NestViewService {
  constructor(options: NestViewOptions);
  displayNest(n: SelectableNestingResult): void;   // imperative SVG paint
  update(): void;                                   // ractive.update("nests")
  initialize(): void;                               // idempotent
  getRactive(): NestViewRactiveInstance | null;
  getDisplayNestCallback(): (n: SelectableNestingResult) => void;
  static create(options): NestViewService;
}
export function createNestViewService(options): NestViewService;
export function initializeNestView(deepNest, config): NestViewService;
```

`NestViewOptions`:

```ts
interface NestViewOptions {
  deepNest: DeepNestInstance;     // window.DeepNest
  config: ConfigObject;
}
```

Note: there is **no `resizeCallback`** option. The SVG renderer fits via `viewBox = "0 0 ${svgWidth} ${svgHeight}"` plus `width/height = 100%`.

## Ractive view model

The `data` block of `new Ractive(...)` (lines 363–447):

| Key | Source | Purpose |
|---|---|---|
| `nests` | `deepNest.nests` (live ref) | The `{{#each nests:i}}` loop in the template. |
| `getSelected()` | data fn | `nests.filter(n => n.selected)`. |
| `getNestedPartSources(n)` | data fn | Flattens all `placement.sheetplacements[*].source` ids — used to colour the dotted preview inside each `.nest` span. |
| `getColorBySource(id)` | data fn | `hsl(${360*(id/parts.length)}, 100%, 80%)`. Stable per part-source-id. |
| `getPartsPlaced()` | data fn | `"placed/total"` summary. `total` excludes parts where `sheet === true`. |
| `getUtilisation()` | data fn | `selected[0].utilisation.toFixed(2)` or `"-"`. |
| `getTimeSaved()` | data fn | `mergedLength / scale / 2` inches per second; rendered with `millisecondsToStr`. |

There are no computed-property entries (the `computed` block is omitted), no sub-components, and no special config beyond the data fns.

## Events emitted by the template

Wired in `bindRactiveEvents()` (lines 453–479):

| Event | Trigger | Behaviour |
|---|---|---|
| `selectnest` | `<span class="nest" on-click="selectnest:{{this}}">` | Iterates `deepNest.nests`, sets all `selected = false`, then sets the clicked nest's `selected = true`. Calls `this.update()` then `this.displayNest(n)`. |

That is the **only** template event. All other state mutation comes from outside (NestingService pushing in new nests).

## `displayNest()` — imperative SVG renderer

The most consequential method in the file. ~190 lines of direct DOM construction (lines 167–353). High-level flow:

1. Ensure `#nestsvg` exists. If not, build it via `createSvgElement("svg")` and inject HTML into `#nestdisplay` via `setInnerHtml(serializeSvg(newSvg))` (uses XMLSerializer in `dom-utils`).
2. Iterate existing `.part`, `.sheet`, and `.merged` SVG elements, **resetting their class** so they are "hidden" (only the `.active` ones in the upcoming pass will render).
3. For each placement in `n.placements`:
   - Create or look up `<g id="sheet{sheetid}">`. On first creation, clone the sheet's `svgelements` into the group (white stroke, no fill).
   - Set `transform = translate(-sheetBounds.x, svgHeight - sheetBounds.y)` so multiple sheets stack vertically with 10% gap (`svgHeight += 1.1 * sheetBounds.height`).
   - For each part placement: create or look up `<g id="part{p.id}">`. On first creation, clone the source part's SVG nodes, paint them with a hatch fill referenced via `url(#part{source}hatch)` (50% opacity), build the `<pattern>` itself if missing, and stroke white.
   - Position parts via CSS `transform` (`createCssTransform(x, y, rotation)`) on the `style` attribute — **not** an SVG `transform` attribute. This is intentional: CSS transforms compose with the parent SVG `transform` attribute.
   - For each `mergedSegments` pair, append a `<line class="merged">` to the root SVG.
4. After 1500 ms, add `.active` to all `.merged` lines so they fade in (animation lives in CSS).
5. Set `width=100% height=100% viewBox="0 0 svgWidth svgHeight"`.

This method is **idempotent across iterations**: re-runs reuse existing `<g>` nodes by id and only update class + transform. Parts that are no longer placed retain the bare `class="part"` (without `.active`) and remain hidden but in the DOM.

## Direct DOM manipulation that bypasses Ractive

Effectively all of `displayNest()` — Ractive does not own any node under `#nestdisplay`. Specific gotchas:

- **`#nestsvg` is built lazily** (lines 169–179). If `#nestdisplay` is wiped/replaced by something else (it isn't today), the next `displayNest` call rebuilds. Don't add Ractive bindings to `#nestdisplay` — they will be destroyed.
- **`setInnerHtml(nestDisplay, serializeSvg(newSvg))`** (line 176) — yes, this serialises an empty SVG to a string and injects it as HTML. The reason: Ractive bindings under `#nestdisplay` would be wiped, but more importantly, `XMLSerializer` is needed because `appendChild` of a brand-new SVG element doesn't always render in Electron's Chromium without the round-trip on first paint. Don't "fix" by switching to `appendChild` without browser-testing.
- **CSS `transform` on parts** (lines 308–313) — set as inline style, not as the SVG `transform` attribute. Hardware-accelerated, but means tools that read `transform` via DOM will see `""`. Read `style.transform` instead.
- **Hatch patterns leak across `displayNest` calls** (lines 267–293). Once created, patterns are not removed; subsequent renders reuse `#part{source}hatch` by id check. If parts are re-imported with a different total `parts.length`, hue colours **are recomputed** for new pattern creation but old patterns retain stale hues. This is currently fine because patterns are short-lived per session.
- **`setTimeout(..., 1500)` for merged-line animation** (lines 340–344) — fires unconditionally even if `displayNest` is called again within 1.5 seconds. Multiple in-flight timers can apply `.active` to elements that have since been removed; the `.merged` element is unconditionally re-classed so this is benign in practice.

## Dependencies

| Import | Why |
|---|---|
| `../types/index.js` | `Part`, `Bounds`, `DeepNestInstance`, `ConfigObject`, `SelectableNestingResult`, `SheetPlacementWithMerged`. |
| `../utils/dom-utils.js` | `getElement`, `getElements`, `createSvgElement`, `setAttributes`, `serializeSvg`, `setInnerHtml`, `createTranslate`, `createCssTransform`. |
| `../utils/ui-helpers.js` | `millisecondsToStr` for the "time saved" stat. |
| Globals | `Ractive`, `XMLSerializer` (used inside `dom-utils.serializeSvg`). |

No service consumed.

## Wired-in dependencies (from composition root)

`main/ui/index.ts:622`:

```ts
nestViewService = createNestViewService({
  deepNest: getDeepNest(),
  config: configService as unknown as ConfigObject,
});
nestViewService.initialize();
(window as ...).nest = nestViewService.getRactive();   // ADR-005 global
```

Then `NestingService` is wired with the bound display callback (`index.ts:684`):

```ts
nestingService = createNestingService({
  ...
  displayNestFn: nestViewService.getDisplayNestCallback(),
  saveJsonFn: () => exportService.exportToJson(),
});
const nestRactive = nestViewService.getRactive();
if (nestRactive) {
  nestingService.setNestRactive(nestRactive as unknown as RactiveInstance<NestViewData>);
}
```

So **Group D ➜ E** flows two ways:

- `NestingService.handleBackgroundResponse` (`nesting.service.ts` ~line 409) calls `displayNestFn(latestNest)` after each successful background iteration when no nest was previously selected (or when iteration 1 was selected — preserves user choice).
- `NestingService.handleBackgroundResponse` also calls `nestRactive.update("nests")` directly to refresh the list.

`window.nest` is the `NestViewRactiveInstance`; ADR-005 documents the deliberate global. Code outside the renderer should never touch it.

## Side effects

| Trigger | Effect |
|---|---|
| `initialize()` | Builds Ractive tree under `#nestcontent`, replacing existing markup. No SVG yet. |
| `displayNest(n)` | Builds/updates `#nestsvg` + child `<g>`s + hatch patterns + merged lines. Schedules a `setTimeout(1500)` to add `.active` to merged lines. |
| `update()` | Single Ractive re-render of the `nests` keypath. |
| `selectnest` event | Mutates `nests[*].selected`, triggers `update()` and `displayNest(n)`. |

No IPC, no network, no `localStorage`.

## Error handling

Defensive on missing DOM: every `getElement<SVGSVGElement>(...)` is null-checked (lines 178, 181, 215, 228). If `#nestsvg` cannot be built, `displayNest` returns early — the function never throws. Comparator/array operations assume the shape returned by the legacy `deepnest.js` orchestrator; if a placement lacks `sheetplacements` or `mergedSegments`, the missing-array branches simply skip.

## Testing

- **Unit tests**: none.
- **E2E**: Playwright runs end-to-end nesting flows in headed Chromium; the visual SVG is rendered but not snapshot-asserted. Manually verify hatch colours / sheet stacking when changing `displayNest`.

## Comments / TODOs in source

None. The file is JSDoc-annotated throughout with no `TODO`/`FIXME` markers.

## Contributor checklist

**Risks & gotchas:**

- **Two render systems share a panel.** Ractive owns `#nestcontent` (stats + nest list); imperative code owns `#nestdisplay` (SVG). Don't move DOM between them or merge templates without rewriting `displayNest`.
- **`setInnerHtml(nestDisplay, serializeSvg(newSvg))`** is a deliberate XMLSerializer round-trip. Replacing it with a plain `appendChild` regressed rendering in earlier prototypes (hence the pattern survives). Test in Electron, not just in JSDOM.
- **Hatch patterns persist.** They live inside the first `<g id="sheet{sheetid}">` they were appended to; if you change which sheet a pattern attaches to, also remove the old one or you will get duplicates.
- **Time-saved math is hard-coded** to 2 inches/second cut speed (line 443). Anyone configuring a faster/slower laser will see misleading stats.
- **`window.nest` is set once** to the Ractive instance returned by `getRactive()`. Code outside this module should never call `window.nest.set(...)` — anything outside the data fns will desynchronise the view from `deepNest.nests`.
- **`selectnest` does not check disabled state** — if a nest result somehow lacks `selected: false` initially, it will still be selectable. Trust the legacy core to set up the array correctly.
- **`displayNest` is O(parts × placements)** with DOM mutation per part. Large nests (>1000 placements) can stutter. Don't call it from a tight progress callback.

**Pre-change verification:**

- `npm run build`.
- `npm start`, import a multi-part SVG, mark one as the sheet, click "Start nest", and watch the panel: stats should update, hatch colours should be unique per source, and merged lines should fade in after a beat.
- Multi-sheet placement: configure parts large enough to need 2+ sheets and confirm the second sheet stacks below the first (1.1× spacing).

**Suggested tests before PR:**

- `npm test` (Playwright).
- Manual: trigger 3+ background iterations and verify the auto-display logic — newest nest is selected unless the user already clicked one.

## Cross-references

- **Group D (services consumed):** none directly. **Services that consume it:** `NestingService` calls `displayNestFn` and `nestRactive.update("nests")`.
- **Group F (composition root):** wired in `main/ui/index.ts:622`. Sets `window.nest` (ADR-005). The two-step `setNestRactive` is intentional — the type cast happens here to avoid a circular type dep.
- **Group G (`main/index.html`):** owns selectors `#nestcontent` (Ractive root), `#nest-template` (template), `#nestdisplay`, `#nestsvg`, `#nestinfo`, `#nestlist`. Hatch + merged elements are dynamic.
- **Component inventory:** `docs/component-inventory.md` row "NestViewService".
- **Architecture:** `docs/architecture.md` §3.2 (background renderer), ADR-005 (deliberate globals).

---

_Generated by Paige for the Group E deep-dive on 2026-04-25. Sources: `main/ui/components/nest-view.ts`, `main/ui/services/nesting.service.ts`, `main/ui/index.ts`, `main/index.html`._
