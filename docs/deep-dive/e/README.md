# Deep dive — Group E: UI components

> Per-file deep dives for the renderer-side components in
> `main/ui/components/`. Sibling of [DEE-11](../../../) parent issue and
> [DEE-37](../../../) tracking issue (full-redo replacement of DEE-26).

## Files in this group

| File | Role | Deep dive |
|---|---|---|
| `main/ui/components/navigation.ts` | Side-nav controller. Tab switching across `#home` / `#config` / `#info` and dark-mode toggle persisted in `localStorage`. Ractive-free — direct DOM-class manipulation only. | [main__ui__components__navigation.md](./main__ui__components__navigation.md) |
| `main/ui/components/parts-view.ts` | Imported-parts list (`#homecontent`). Owns the Ractive table over `DeepNest.parts`, drag-select, sort, `svg-pan-zoom`, and the inline `dimensionLabel` Ractive sub-component. | [main__ui__components__parts-view.md](./main__ui__components__parts-view.md) |
| `main/ui/components/nest-view.ts` | Nest-result viewer (`#nestcontent` / `#nestdisplay`). Owns the Ractive summary bindings and the imperative SVG renderer for sheets, parts, hatch patterns, and merged-line laser markers. | [main__ui__components__nest-view.md](./main__ui__components__nest-view.md) |
| `main/ui/components/sheet-dialog.ts` | Add-sheet modal. Toggles `#partstools.active`, validates width/height inputs, synthesises a `<svg><rect/></svg>` of the right size, and routes it through `DeepNest.importsvg(...)` so it appears as a sheet in the parts list. | [main__ui__components__sheet-dialog.md](./main__ui__components__sheet-dialog.md) |

## Scope corrections vs. DEE-11

DEE-11 lists this group's scope as exactly four files; the
`main/ui/components/` directory at the time of this deep dive contains
exactly those four. **No new files** were discovered — no
`### Discovered files` callout is needed in `docs/index.md`.

| DEE-11 said | Reality |
|---|---|
| `navigation.ts` | Present at 365 LOC. |
| `parts-view.ts` | Present at 750 LOC. |
| `nest-view.ts` | Present at 563 LOC. |
| `sheet-dialog.ts` | Present at 436 LOC. |

## Group-specific guidance

- For each component, the deep dive states **which Ractive template
  (or DOM root) it owns** as its contract with `main/index.html`
  ([Group G](../g/main__index.html.md)).
- Each deep dive flags **direct DOM manipulation that bypasses
  Ractive** — a known foot-gun in the legacy renderer code.
  Notable cases:
  - `navigation.ts` writes `tab.className = "..."` directly (not via
    `addClass`/`removeClass`) so any other class is wiped on tab
    switch.
  - `parts-view.ts` mutates `part.svgelements[].class` outside Ractive
    so the highlight survives template re-renders.
  - `nest-view.ts` rebuilds `#nestsvg` imperatively on every render
    rather than driving it through Ractive.
- **`Used-by` is intentionally empty for components** — they are the
  leaves of the dependency graph. Each deep dive instead documents
  **which services it consumes** (today: `ConfigService` only — and
  only via `getSync("units" | "scale")`) and **which composition-root
  callbacks tie it to the rest of the renderer**.

## Cross-cutting findings

The four deep dives surfaced three implicit refactor targets:

1. **Unit math is duplicated four times** — in
   [`parts-view.ts:235-249`](./main__ui__components__parts-view.md#5-invariants--gotchas),
   [`sheet-dialog.ts:54/175-185`](./main__ui__components__sheet-dialog.md#5-invariants--gotchas),
   `ConfigService` (Group D), and the canonical
   [`main/ui/utils/conversion.ts`](../f/main__ui__utils__conversion.ts.md).
   The `INCHES_TO_MM = 25.4` constant appears in every component file
   independently. Refactor target: collapse to `formatBounds(...)` /
   `getConversionFactor(...)` from `utils/conversion`.
2. **Listener registration is additive in two components.**
   `parts-view.ts`'s `setupZoomControls()` and `attachSort()` do not
   `removeEventListener` before re-binding, so repeated calls stack
   handlers. The behaviour is idempotent today (each handler is
   itself idempotent), but represents a memory smell for long
   sessions.
3. **Ractive 0.8 implicit-binding quirk** —
   [`nest-view.ts`](./main__ui__components__nest-view.md#24-svg-render-pipeline)
   uses functions inside the `data` block whose `this` resolves to
   the Ractive instance. This is a Ractive 0.8 quirk; any future
   migration must move them to `computed` first.

## Cross-references

- [`docs/deep-dive/c/main__ui__index.ts.md`](../c/main__ui__index.ts.md)
  — composition root that wires every component into the renderer
  (lines 610–639).
- [`docs/deep-dive/d/main__ui__services__config.service.md`](../d/main__ui__services__config.service.md)
  — the only service the components consume (only via `getSync`).
- [`docs/deep-dive/d/main__ui__services__import.service.ts.md`](../d/main__ui__services__import.service.ts.md)
  — calls `partsViewService.applyZoom()` / `attachSort()` after each
  import.
- [`docs/deep-dive/d/main__ui__services__nesting.service.ts.md`](../d/main__ui__services__nesting.service.ts.md)
  — calls `nestViewService.displayNest(...)` (via the bound
  `displayNestFn`) on every nest improvement.
- [`docs/deep-dive/f/`](../f/README.md) — utilities used by every
  component (`dom-utils.ts`, `ui-helpers.ts` for `throttle` and
  `millisecondsToStr`, `conversion.ts` as the refactor target).
- [`docs/deep-dive/g/main__index.html.md`](../g/main__index.html.md)
  — the static surface that owns every selector / id consumed by
  this group.
- [`docs/component-inventory.md`](../../component-inventory.md)
  §"Components" — the canonical inventory row for each service.
- [`docs/architecture.md`](../../architecture.md) §3 — renderer
  composition diagram.

## Completion

- **Generated:** 2026-04-26 by Paige (Tech Writer).
- **Tracking issue:** [DEE-37](/DEE/issues/DEE-37) (parent:
  [DEE-11](/DEE/issues/DEE-11)).
- **Branch:** `chore/dee-11-iso/group-e` (Paperclip-managed isolated
  worktree).
- **File count:** 4 deep dives + this README.
