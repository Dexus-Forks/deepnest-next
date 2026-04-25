# Deep dive — Group F: UI utilities

> Per-file deep dives for the leaf utility modules under `main/ui/utils/`. Authored fresh against current source per the DEE-38 full-redo directive (replaces DEE-27 and the original DEE-1f-era attempt). Sibling of [DEE-11](../../../) parent issue.

## Files in this group

| File | Role | Deep dive |
|---|---|---|
| `main/ui/utils/dom-utils.ts` | Type-safe wrappers around the browser DOM API. ~30 generic helpers used by every Ractive component. Pure leaf — no imports. | [main__ui__utils__dom-utils.ts.md](./main__ui__utils__dom-utils.ts.md) |
| `main/ui/utils/conversion.ts` | Pure functions for SVG-units ↔ inches ↔ mm conversion plus formatting. **Currently unused** — three sites duplicate the math inline. | [main__ui__utils__conversion.ts.md](./main__ui__utils__conversion.ts.md) |
| `main/ui/utils/ui-helpers.ts` | Three loosely-related helpers: `message()` banner, `throttle()` (Underscore port), `millisecondsToStr()`. Highest fan-in of the three. | [main__ui__utils__ui-helpers.ts.md](./main__ui__utils__ui-helpers.ts.md) |

## Group character

These three files are the **bottom of the dependency graph** for `main/ui/**`. Two of them (`dom-utils`, `conversion`) import nothing at all; `ui-helpers` imports a single type alias. None reach into IPC, persistence, or the Node side.

That makes the **Used-by** lens the most important one for this group — and the picture each file paints is different:

| File | Importers | Coverage |
|---|---|---|
| `dom-utils.ts` | 5 (one bootstrap + four components). 19 named-import references. | ~9 of 30 exports actually consumed. The rest is a documented convention layer for future migration. |
| `conversion.ts` | **0**. The math is duplicated inline three times instead of imported. | 0% of exports consumed. Spec is canonical, implementation dormant. |
| `ui-helpers.ts` | 6 (one bootstrap + three services + two components). 25+ call sites for `message`. | All three exports consumed. |

## Cross-cutting findings

The full-redo surfaced three load-bearing observations that span multiple files, not visible from any single deep-dive:

### 1. `INCHES_TO_MM = 25.4` lives in four places

The canonical constant is at [`main/ui/utils/conversion.ts:17`](../../../main/ui/utils/conversion.ts), but three additional copies exist:

- [`main/ui/services/config.service.ts`](../../../main/ui/services/config.service.ts) lines 325, 354, 366 — three numeric literals.
- [`main/ui/components/sheet-dialog.ts:54`](../../../main/ui/components/sheet-dialog.ts) — a private `const INCHES_TO_MM = 25.4`.
- [`main/ui/index.ts:411, 424`](../../../main/ui/index.ts) — two numeric literals embedded in the `data-conversion` form glue.

Convergence on the `conversion.ts` exports is a near-zero-risk cleanup; documented as the headline extension point in the [conversion deep-dive](./main__ui__utils__conversion.ts.md#extension-points).

### 2. The `data-conversion` HTML attribute → `getConversionFactor` contract

The "contract" called out in the DEE-38 group-specific guidance:

- HTML attribute `data-conversion="true"` (only `=== "true"` matches; missing or `"false"` both mean "no conversion") tags an `<input>` whose displayed value is in the user's chosen unit but whose persisted value is in SVG units.
- The conversion factor is exactly `getConversionFactor(scale, units)` from [`conversion.ts:71`](../../../main/ui/utils/conversion.ts).
- The five inputs that carry the attribute are inventoried in [Group G §3.2](../g/main__index.html.md).
- The math is currently inline at [`main/ui/index.ts:204-206`](../../../main/ui/index.ts) (DOM → config) and [`main/ui/index.ts:421-426`](../../../main/ui/index.ts) (config → DOM).

The contract is documented; the implementation that *should* enforce it is dormant.

### 3. Three direct DOM bypasses of `dom-utils.ts`

- [`main/ui/utils/ui-helpers.ts:14-16`](../../../main/ui/utils/ui-helpers.ts) — `message()` calls `document.querySelector("#message")` etc. directly instead of `getElement<T>`.
- [`main/ui/services/export.service.ts:494, 508, 532`](../../../main/ui/services/export.service.ts) — three `document.createElementNS("http://www.w3.org/2000/svg", ...)` calls embed the namespace string instead of importing `createSvgElement`.
- [`main/ui/services/nesting.service.ts`](../../../main/ui/services/nesting.service.ts) — uses raw `querySelector` (importer search hit). Not yet migrated.

None are bugs; all are pre-migration debt.

## Per-doc structure

Each per-file doc follows the [DEE-11 shared template](../../../) — Purpose · Public surface · IPC / global side-effects · Dependencies · Used-by · Invariants & gotchas · Known TODOs · Extension points · Test coverage status · Cross-references.

For this group the **Used-by** section carries most of the weight (utils are leaves), and **Invariants** is where the bypasses, duplications, and Underscore-port quirks are flagged.

## Scope corrections vs. DEE-11

None. The DEE-11 parent issue lists these three files exactly; all three exist on disk at the listed paths and are documented one-to-one.

## Test coverage at a glance

- **No dedicated unit tests** for any of the three files (`tests/unit/` does not exist; the only test in the tree is `tests/index.spec.ts`).
- E2E coverage:
  - `dom-utils.ts` — exercised indirectly on every Playwright click via component imports. Type contracts validated only by `tsc`.
  - `conversion.ts` — its **functions** are 0% covered (no importer); the **math** is proved end-to-end through the inline duplications by the Config-tab assertion `10 mm × 72 ÷ 25.4 = 28.34645669291339` ([Group J's `tests__index.spec.ts.md`](../j/tests__index.spec.ts.md)).
  - `ui-helpers.ts` — `message` runs only on error paths the E2E spec doesn't currently drive; `throttle` runs only at module-load wrap; `millisecondsToStr` requires a completed nest the spec doesn't reach. Effective coverage: near-zero automated.

A unit-test follow-up for all three files (`tests/unit/{dom-utils,conversion,ui-helpers}.spec.ts`) would be cheap (~150 lines total) — none exist today.

## Cross-references (group-level)

- Importing components: [Group E](../e/README.md).
- Importing services: [Group D](../d/README.md).
- Bootstrap importer: [Group C's `main__ui__index.ts.md`](../c/main__ui__index.ts.md).
- Static-surface contract (`data-conversion`, `#message` markup, `data-config`): [Group G's `main__index.html.md`](../g/main__index.html.md).
- E2E proof of conversion math: [Group J's `tests__index.spec.ts.md`](../j/tests__index.spec.ts.md).
- Type definitions (`UnitType`, `ThrottleOptions`): [Group C's `main__ui__types__index.ts.md`](../c/main__ui__types__index.ts.md).

## Completion

| Field | Value |
|---|---|
| Issue | [DEE-38](../../../) (Paperclip-isolated full redo; replaces DEE-27 and the original DEE-1f-era attempt) |
| Branch | `chore/dee-11-iso/group-f` |
| Files documented | 3 / 3 (cover sheet + per-file deep-dives) |
| Scope corrections | None |
| Bypasses & duplications surfaced | 3 (see "Cross-cutting findings") |
| Authored | 2026-04-26 |
