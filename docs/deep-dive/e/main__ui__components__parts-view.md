# `main/ui/components/parts-view.ts` — Deep Dive

**Generated:** 2026-04-26 by Paige (Tech Writer) for [DEE-37](/DEE/issues/DEE-37) (parent: [DEE-11](/DEE/issues/DEE-11)).
**Group:** E — UI components.
**File:** `main/ui/components/parts-view.ts` (750 LOC, TypeScript, strict).
**Mode:** Exhaustive deep-dive (full redo from source).

## 1. Purpose

The renderer's **parts-list controller** for the home tab. Owns:

1. The **Ractive instance** that binds the imported-parts table
   (`#homecontent` / `#template-part-list`) to `DeepNest.parts` and the
   import-tabs surface to `DeepNest.imports`.
2. **Selection** (click + drag-mouseover, plus the "Select all" / "Deselect
   all" toggle and `Backspace` / `Delete` keyboard shortcut).
3. **Sort** (column header clicks on the table head).
4. **SVG pan/zoom** for the imported-file preview (`svgPanZoom`).
5. **Unit-aware dimension labels** via the inline `dimensionLabel`
   Ractive sub-component.

The implementation is a 1:1 port of `page.js` lines 421–714 (legacy);
the JSDoc header at line 4 names the source. Behaviour parity is
intentional, so any divergence from the legacy renderer is a bug.

## 2. Public surface

```ts
export type ResizeCallback = (event?: { rect: { width: number } }) => void;

export interface PartsViewOptions {
  deepNest: DeepNestInstance;        // window.DeepNest
  config: ConfigObject;              // window.config (= ConfigService)
  resizeCallback?: ResizeCallback;   // re-measure parts panel
}

export class PartsViewService {
  constructor(options: PartsViewOptions);

  setResizeCallback(callback: ResizeCallback): void;
  applyZoom(): void;                  // (re-)bind svgPanZoom to selected import
  deleteParts(): void;                // delete every part where part.selected
  attachSort(): void;                 // bind column-header click handlers
  update(): void;                     // re-render `parts` keypath
  updateImports(): void;              // re-render `imports` keypath
  updateUnits(): void;                // re-render `getUnits` computed
  initialize(): void;                 // idempotent — full set-up
  getRactive(): PartsViewRactiveInstance | null;
  refresh(): void;                    // update + updateImports + attachSort + applyZoom
  static create(options: PartsViewOptions): PartsViewService;
}

export function createPartsViewService(options: PartsViewOptions): PartsViewService;
export function initializePartsView(
  deepNest: DeepNestInstance,
  config: ConfigObject,
  resizeCallback?: ResizeCallback
): PartsViewService;
```

The factory `createPartsViewService(...)` is the one used by the
composition root (`main/ui/index.ts:614`); `initializePartsView(...)`
is the one-liner helper for ad-hoc consumers and is currently not
referenced in-tree.

### 2.1 DOM contract (Group G)

| Surface | Selector / id | HTML line(s) | Notes |
|---|---|---|---|
| Container | `#homecontent` | 132 | Ractive `el`. The Ractive template lives in the inline `<script id="template-part-list" type="text/ractive">` tag. |
| Template | `#template-part-list` | 134 | The Ractive `template` attr names the same id; Ractive reads the inline script contents at construction time. |
| Parts table | `#parts table` | 140–162 | Renders one `<tr>` per `parts[i]`. The `<tr>` is the click target for `selecthandler:{{this}}`. |
| Sort headers | `#parts table thead th[data-sort-field]` | 147–149 | `area`, `sheet`, `quantity` columns. `<th>` without `data-sort-field` (line 146) is the row-checkbox column and is unsortable. |
| `dimensionLabel` Ractive sub-component | `<dimensionLabel/>` | 156 | Inline Ractive component declared in `components: { dimensionLabel }` (`parts-view.ts:533`). Renders `bounds.width × bounds.height` formatted in current units. |
| `partrenderer(this)` | inline | 155 | Triple-mustache; emits the SVG preview for the part as a serialised `<svg>…</svg>` string. |
| `partstools` | `#partstools` | 165 | Container that hosts the toolbar buttons (`#addsheet`, the delete button, `#selectall`) and the sheet-dialog form (handed off to [`SheetDialogService`](./main__ui__components__sheet-dialog.md)). |
| Imports tabs | `#imports`, `#importsnav`, `#import-{{i}}` | 183–206 | Tab switcher across `DeepNest.imports`. Each tab embeds the imported SVG via `serializeSvg(svg)` (triple-mustache) so `svg-pan-zoom` can attach. |
| Zoom controls | `.zoomin`, `.zoomout`, `.zoomreset` (per-import) | 199–203 | Native `<a>` elements; `event.preventDefault()` is called in `setupZoomControls()` lines 336/346/356. |

### 2.2 Ractive data and computed shape

```ts
interface PartsViewData {
  parts:    Part[];               // direct alias of deepNest.parts
  imports:  ImportedFile[];       // direct alias of deepNest.imports
  getSelected(): Part[];          // parts.filter(p => p.selected)
  getSheets():   Part[];          // parts.filter(p => p.sheet)
  serializeSvg(svg): string;      // wraps utils/dom-utils.serializeSvg
  partrenderer(part): string;     // builds the SVG preview
}
```

Plus a top-level Ractive `computed`:

| Computed | Returns | Used by |
|---|---|---|
| `getUnits` | `"mm"` or `"in"` from `config.getSync("units")` | template `{{ getUnits }}` rows in the sheet form (HTML lines 173–174) and the `dimensionLabel` chain (`parts-view.ts:233`). |

The `dimensionLabel` Ractive sub-component (`Ractive.extend(...)` at
line 220) computes a per-row label string and reads `getUnits` for
its dependency chain. **The unit math is duplicated** in this
component (lines 235–249) — see §5.

### 2.3 Ractive events emitted by the template

| Event | Argument | Handler line |
|---|---|---|
| `selecthandler` | `Part` (the row's `this`) | 573 |
| `selectall` | none | 591 |
| `importselecthandler` | `ImportedFile` | 611 |
| `importdelete` | `ImportedFile` | 628 |
| `delete` | none (toolbar `Delete` button) | 648 |

The on-DOM listener for `Backspace` / `Delete` is registered at line
657 (independent of Ractive events).

## 3. IPC / global side-effects

| Trigger | Effect |
|---|---|
| `togglePart(part)` (line 259) | Mutates `part.selected` and `part.svgelements[].class` to apply or strip `active`. The SVG node mutation has no Ractive binding; it is a direct DOM write that survives template re-renders. |
| `applyZoom()` (line 276) | Disposes/recreates the `svg-pan-zoom` instance for the currently-selected import. State (`pan`, `zoom`) is preserved across re-binds (lines 285–309). The `zoom` controller is stored back on the `ImportedFile.zoom` (mutating the `DeepNest.imports[i]` row). |
| `setupZoomControls(i)` (line 321) | Registers click listeners on `#import-{i} .zoomin/.zoomout/.zoomreset`. Listeners are added on every `applyZoom()` call — see §5. |
| `deleteParts()` (line 368) | Splices selected parts out of `deepNest.parts` and removes their SVG nodes from the document via `removeFromParent()`. Triggers `update()`, `updateImports()`, `applyZoom()`, and `resizeCallback?.()`. |
| `attachSort()` (line 398) | Sorts `deepNest.parts` in place. Mutates the source array, then re-renders. |
| `setupMouseTracking()` (line 540) | Replaces `document.body.onmousedown` and `onmouseup` (note: assignment, not `addEventListener`). Any previously-bound `onmousedown` / `onmouseup` handler is overwritten. |
| `createThrottledUpdate()` (line 552) | Wraps `updateImports()` + `applyZoom()` in `throttle(..., 500)` from `utils/ui-helpers`. The throttled function is what runs during drag-select (line 583). |
| `setupKeyboardEvents()` (line 656) | `document.body.addEventListener("keydown", …)` listens for `keyCode === 8` (Backspace) and `keyCode === 46` (Delete) and calls `deleteParts()`. |
| Composition root (`index.ts:629`) | After the nest-view ractive is created, the whole nest ractive is exposed on `window.nest` for backwards compatibility — the parts-view ractive is **not** exposed globally. |
| Unit change | `index.ts:446-448` calls `partsViewService.updateUnits()` whenever `config.units` is saved — this re-evaluates the `getUnits` computed and the dependent `dimensionLabel` rows. |

**No** IPC channels and **no** network access. Reads
`config.getSync("units")` and `config.getSync("scale")` synchronously
(lines 229–230) — those are in-memory cache hits in `ConfigService`,
not IPC round-trips.

## 4. Dependencies

| Import | Why |
|---|---|
| `../types/index.js` (`Part`, `ImportedFile`, `Bounds`, `DeepNestInstance`, `ConfigObject`, `SvgPanZoomInstance`) | Type-only imports for the data model. |
| `../utils/dom-utils.js` (`getElement`, `getElements`, `createSvgElement`, `serializeSvg`, `removeFromParent`, `setAttributes`) | All DOM access. |
| `../utils/ui-helpers.js` (`throttle`) | Drag-select throttle. |
| Vendored `Ractive` (declared globally in `main/index.html`'s classic `<script>` block) | Templated rendering. The `.extend()` API is used to declare `dimensionLabel`. |
| Vendored `svgPanZoom` (declared globally) | Pan/zoom controller for the imported-file preview. |

The component reaches `DeepNest` and `ConfigService` only through the
constructor-injected `options.deepNest` / `options.config`. There is
**no** direct `window.DeepNest` / `window.config` read inside this file
— that is a deliberate seam from the composition root.

### 4.1 Inbound dependencies (composition root)

`main/ui/index.ts:614-619`:

```ts
partsViewService = createPartsViewService({
  deepNest: getDeepNest(),
  config: configService as unknown as ConfigObject,
  resizeCallback: resize,
});
partsViewService.initialize();
```

The same `partsViewService` instance is then surfaced to other
modules via three callbacks (`index.ts:636/653/654`): the sheet-dialog
calls `partsViewService.update()` after adding a sheet; the import
service uses `getRactive()` and `attachSort()` / `applyZoom()` to
re-bind after each import. `index.ts:818-820` re-exports the service
as a named binding.

### 4.2 Used-by

| Caller | Method | Line |
|---|---|---|
| `main/ui/index.ts` (config-form change) | `updateUnits()` | 447 |
| `main/ui/index.ts` (composition root) | `update()` (via `updatePartsCallback`) | 636 |
| `main/ui/index.ts` → `ImportService` | `getRactive()`, `attachSort()`, `applyZoom()` | 652–654 |

## 5. Invariants & gotchas

- **`document.body.onmousedown` and `onmouseup` are replaced wholesale**
  (lines 541–546). Any previously-installed body-level mousedown/up
  handler is wiped. If you need to track another global mouse state,
  switch to `addEventListener` and remove these `on*` assignments.
- **`document.body` keydown listener uses `keyCode`** (line 659).
  `KeyboardEvent.keyCode` is deprecated; behaviour-equivalent today
  but earmark for `event.key === "Backspace" | "Delete"` migration.
- **Drag-select can fire mid-input.** The handler returns early when
  `e.original.target.nodeName === "INPUT"` (line 576) so editing the
  quantity field doesn't toggle row selection. Don't change the row
  template to wrap inputs in custom elements without preserving
  `nodeName === "INPUT"` somewhere up the bubble path.
- **Unit math is duplicated.** Lines 235–249 in this file reimplement
  what already exists in `main/ui/utils/conversion.ts`
  (`formatBounds`, `INCHES_TO_MM`). The constant `25.4` appears twice
  (lines 237, 239). Same duplication exists in
  [`sheet-dialog.ts:54/175-185`](./main__ui__components__sheet-dialog.md)
  and `ConfigService` — see [`docs/deep-dive/f/main__ui__utils__conversion.ts.md`](../f/main__ui__utils__conversion.ts.md).
  Refactor target: pass `formatBounds(width, height, scale, units, 1)`
  instead of inlining.
- **`applyZoom()` recreates `svg-pan-zoom` on every call** but never
  destroys the prior instance. The library does dispose-on-recreate
  when the same SVG element is used, but if the import re-renders
  with a different DOM node the old controller leaks. The previous
  pan/zoom is captured and re-applied (lines 285–309), so visual
  state survives.
- **`setupZoomControls(i)` rebinds listeners on every `applyZoom()`**
  — there is no `removeEventListener`. Selecting the same import
  three times stacks three click handlers on `.zoomin`. Each
  individual handler is idempotent (`zoomIn()` is safe to call
  multiple times) but the redundancy is a memory smell; refactor to
  bind once at initialisation, or to use `node.replaceWith(node.cloneNode(true))`.
- **`Ractive.DEBUG = false` is a global mutation.** Set at line 478,
  this disables Ractive warnings *application-wide* (Ractive is a
  shared global). Tests that need warnings have to flip it back.
- **Sort comparator returns `0` on `null` / `undefined` either side**
  (line 420). Stable-equal pairs preserve the previous order, so
  re-sorting after most parts have a missing field is a no-op.
- **`reverse` is decided by `header.className === "asc"`** (line 413)
  — if any other code mutates `<th>` classes, the sort direction
  inverts on the next click.
- **`partrenderer()`** clones every SVG element in the part with
  `cloneNode(false)` (line 521, **shallow** clone). Children are
  intentionally dropped because the legacy parts list only renders
  outer paths/rects. Don't switch to deep-clone without auditing the
  output — DXF-imported parts can carry hundreds of nested
  decorative nodes.
- **Listener registration is partly idempotent.** `bindEventHandlers`
  in this file is split across `bindRactiveEvents`,
  `setupMouseTracking`, `setupKeyboardEvents`. `initialize()` guards
  with `this.initialized` (line 670), but no method tears down — the
  service is single-use per renderer lifetime.
- **`refresh()` calls `attachSort()` every time**, which adds
  another set of click handlers on every column header. Don't call
  `refresh()` in a hot loop; the same idempotency caveat applies.

## 6. Known TODOs

None in source. No `// TODO` or `// FIXME` markers. The JSDoc header
at line 4 references the legacy origin (`page.js` lines 421–714) but
is not actionable.

Implicit TODOs surfaced by this deep dive (not in source):

- Replace inline unit math (lines 235–249) with `formatBounds(...)`
  from `main/ui/utils/conversion.ts`.
- Switch the Backspace/Delete listener from `keyCode` to `event.key`
  before any Electron upgrade that drops `keyCode`.

## 7. Extension points

- **Add a sort column.** Add `data-sort-field="<key>"` to a `<th>`
  in `main/index.html` (lines 147–149). The handler at line 405 reads
  the attr and indexes `Part[<key>]`. The key must be a comparable
  primitive on `Part` — non-primitive values fall through the
  comparator and stable-no-op the sort.
- **Add a Ractive event.** Declare it in the inline template
  (`on-<event>="<name>:{{...}}"`) and bind it in
  `bindRactiveEvents()` (lines 564–650).
- **Add a new field to the `dimensionLabel` component.** Edit the
  `Ractive.extend({...})` block at line 220. The `computed.label`
  function has access to the row context via `this.get("bounds")`.
- **Generalise the resize callback.** Today the only consumer is the
  `resize()` hook in the composition root. To run more work post-
  selection / post-delete, route it through `resizeCallback` rather
  than reaching into the service.
- **Support a different keyboard shortcut.** Edit the keydown
  listener at line 657. Today only Backspace and Delete are bound;
  there is no key combo support.
- **Replace `svg-pan-zoom`.** The whole zoom path is encapsulated in
  `applyZoom()` and `setupZoomControls()`. A drop-in replacement only
  needs to expose `getPan()`, `getZoom()`, `pan(...)`, `zoom(...)`,
  `zoomIn()`, `zoomOut()`, `resetZoom()`, `resetPan()`, plus accept
  the options object at line 294.

## 8. Test coverage

- **Unit tests:** none in repo. Renderer UI is covered exclusively by
  Playwright E2E tests; see
  [`docs/deep-dive/j/tests__index.spec.ts.md`](../j/tests__index.spec.ts.md)
  and `docs/architecture.md` §6.
- **E2E coverage:** `tests/specs/` exercises import → select → sort →
  delete → re-nest. The most relevant smoke tests are the import-flow
  and parts-table sort spec.
- **Manual verification checklist:**
  1. Import an SVG and confirm the part appears in the table.
  2. Click a row → background highlights; the SVG element gets the
     `active` class.
  3. Click+drag down across rows → multi-select via the throttled
     mouseover handler.
  4. Click "Select all" (HTML line 169) twice → toggles select/deselect.
  5. Press `Delete` or `Backspace` → selected rows go; the parts panel
     re-measures (resize callback).
  6. Toggle the sheet checkbox in a row (HTML line 157) → confirm the
     part is re-classified as a sheet (re-renders via Ractive two-way
     binding).
  7. Switch units in `#config` → row labels reformat (drives
     `updateUnits()`).
  8. Switch import tabs (HTML line 187) → `svg-pan-zoom` rebinds and
     pan/zoom state persists.

## 9. Cross-references

- **Group D (services):** consumes `ConfigService.getSync("units" | "scale")`
  (no other service). Inbound: `ImportService` calls `applyZoom()`,
  `attachSort()`, `getRactive()` after each import. See
  [`docs/deep-dive/d/main__ui__services__import.service.ts.md`](../d/main__ui__services__import.service.ts.md).
- **Group E peers:**
  - [`sheet-dialog.ts`](./main__ui__components__sheet-dialog.md) hands its
    confirm flow back into `partsViewService.update()` via
    `updatePartsCallback`.
  - [`navigation.ts`](./main__ui__components__navigation.md) drives
    `resize()` via the same `resizeCallback` seam.
- **Group F (utilities):**
  [`dom-utils.ts`](../f/main__ui__utils__dom-utils.ts.md),
  [`ui-helpers.ts`](../f/main__ui__utils__ui-helpers.ts.md) (`throttle`),
  [`conversion.ts`](../f/main__ui__utils__conversion.ts.md) (the
  refactor target for inline unit math).
- **Group G (`main/index.html`):** owner of `#homecontent`,
  `#template-part-list`, `#parts table`, `#partstools`, `#imports`. See
  [`docs/deep-dive/g/main__index.html.md`](../g/main__index.html.md)
  §3.4 (`data-sort-field`).
- **Composition root:** [`main/ui/index.ts`](../c/main__ui__index.ts.md) §6.
- **Component inventory:** [`docs/component-inventory.md`](../../component-inventory.md)
  row "PartsViewService".
- **Architecture:** [`docs/architecture.md`](../../architecture.md) §3
  (renderer composition).
