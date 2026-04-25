# Deep dive — `main/ui/utils/conversion.ts`

> Group F · `DEE-38` (replaces DEE-27/DEE-1f) · parent issue [DEE-11](../../../). Authored fresh from source per the board's full-redo directive.

## Purpose

Pure functions for converting between three coordinate spaces used throughout DeepNest:

| Space | Origin | Where it shows up |
|---|---|---|
| **SVG units** | The unit system inside the SVG document the user imports. Scale-free. | Geometry stored in `Part.polygontree`, sheets, placements. |
| **Inches** | The internal "real" unit. `scale` is stored as **SVG units / inch**. | Persisted config (`UIConfig.scale`); time/length calculations. |
| **mm** | A display-only alias for inches. Never persisted; converted at the IO boundary via the `INCHES_TO_MM` factor. | Whatever the user picks via `UIConfig.units`. |

The module's contract: callers hand it (a value, the persisted `scale`, the current `UnitType`) and get back the value in the other space, plus optional formatting helpers for UI strings.

It exists primarily as a **canonical reference** for that math. The runtime codebase has not yet migrated to use it — see "Used-by" — so the file currently functions as a documented spec that other places re-implement inline. Treating it as orphaned would be wrong: it is the source-of-truth for *what the math should be*, even where it is currently duplicated.

## Public surface

`main/ui/utils/conversion.ts` exports one constant and 12 functions.

| Symbol (line) | Signature | Role |
|---|---|---|
| `INCHES_TO_MM` (17) | `const = 25.4` | The single hardcoded conversion factor. Three other copies of `25.4` exist in the live tree (see Invariants). |
| `getScaleInUnits` (32) | `(scale, units) => number` | Convert a stored scale (units/inch) into the user's display unit. Divides by 25.4 for `"mm"`. |
| `setScaleFromUnits` (51) | `(value, units) => number` | Inverse of `getScaleInUnits`. Multiplies by 25.4 for `"mm"`. |
| `getConversionFactor` (71) | `(scale, units) => number` | The "SVG units per real unit" factor. Mathematically identical to `getScaleInUnits` — the second name exists for call-site readability. |
| `toSvgUnits` (92) | `(value, scale, units) => number` | Real-world value → SVG units. `value * getConversionFactor(scale, units)`. |
| `fromSvgUnits` (114) | `(value, scale, units) => number` | SVG units → real-world value. `value / getConversionFactor(scale, units)`. |
| `formatDimension` (136) | `(value, scale, units, precision = 1) => string` | Human-readable dimension with `mm` / `in` suffix. |
| `formatBounds` (161) | `(width, height, scale, units, precision = 1) => string` | `"<W> x <H>"` formatter for bounding boxes. Delegates to `formatDimension`. |
| `getUnitSuffix` (179) | `(units) => "mm" \| "in"` | Trivial label helper. |
| `getExportScale` (199) | `(scale, units, dxfExportScale?) => number` | Adjusted scale for DXF/SVG export. The DXF branch divides scale by `dxfExportScale` before unit adjustment. |
| `toExportDimension` (228) | `(svgValue, scale, units, dxfExportScale?) => number` | SVG value → real-world value at *export* scale. `svgValue / getExportScale(...)`. |
| `toInches` (250) | `(svgLength, scale) => number` | `svgLength / scale`. Used (or intended) for the cut-time estimator. |
| `fromInches` (261) | `(inches, scale) => number` | `inches * scale`. |

`UnitType` is a re-exported alias from [`main/ui/types/index.ts:12`](../../../main/ui/types/index.ts) (which itself re-exports it from the project root [`index.d.ts`](../../../index.d.ts)). It is `"mm" | "inch"`.

## IPC / global side-effects

**None.** Every function is pure. No `document`, `window`, IPC, persistence, or module-level side-effect on import. Test-friendly by construction.

## Dependencies

One type-only import:

```ts
import type { UnitType } from "../types/index.js"; // line 12
```

There is no value-level import. The module would compile against any `type UnitType = "mm" | "inch"` — no contract leaks beyond that string union.

## Used-by

**Zero importers in the live source tree.** Importer searches over `main/**/*.ts`, `main/**/*.js`, and the renderer entry confirm it: no file in `main/ui/**` (or anywhere else under `main/`) imports any symbol from `./utils/conversion.js`.

This is the most important fact about the module. The conversions documented here are duplicated as inline math or as private methods in three places:

| Re-implementation site | Lines | What it duplicates |
|---|---|---|
| [`main/ui/services/config.service.ts:322-369`](../../../main/ui/services/config.service.ts) | 322 (`getConversionFactor`), 335 (`toSvgUnits`), 344 (`fromSvgUnits`), 352 (`getScaleInUnits`), 363 (`setScaleFromUnits`) | Five of the eight core methods, re-typed as instance methods on `ConfigService` operating against `this.config.scale` / `this.config.units`. The literal `25.4` is hardcoded on lines 325, 354, 366. |
| [`main/ui/components/sheet-dialog.ts:54, 175, 253`](../../../main/ui/components/sheet-dialog.ts) | 54 (private `const INCHES_TO_MM = 25.4`), 175 (private `getConversionFactor`), 253 (call site) | A second copy of `INCHES_TO_MM` and a private re-implementation of `getConversionFactor`, scoped to the dialog. |
| [`main/ui/index.ts:198-211, 410-427`](../../../main/ui/index.ts) | 204-206, 411, 421-426 | The bidirectional `data-conversion="true"` math is open-coded — `value * (scale / 25.4)` on read, `value / scale * 25.4` on write. Doesn't use `getConversionFactor` even though `ConfigService` (which is in scope) exposes one. |

So the **contract** documented here is live; the **implementation** in this file is dormant. Migrating the three duplications to import from `./utils/conversion.js` is a clean follow-up task — see "Extension points".

## Contract with `main/index.html` `data-conversion`

The DEE-38 brief calls out the relationship between this file and the `data-conversion` attribute as a contract that needs documenting. The relationship is:

- The HTML attribute `data-conversion="true"` (only `=== "true"` matches; `"false"` and missing both mean "no conversion") tags an `<input>` whose value the user enters in the **current display unit** but whose persisted form is **SVG units**.
- The persistence math is exactly `getConversionFactor(scale, units)` from this module:
  - `scale` (from `UIConfig.scale`) — units/inch.
  - `units` (from `UIConfig.units`) — `"mm"` or `"inch"`.
  - For `"mm"`: factor = `scale / INCHES_TO_MM`.
  - For `"inch"`: factor = `scale`.
- Read path (DOM → `UIConfig`): the entered numeric value is `× factor` to land in SVG units. See [`main/ui/index.ts:421-426`](../../../main/ui/index.ts).
- Write path (`UIConfig` → DOM): the stored SVG-units value is `÷ factor` to display. See [`main/ui/index.ts:204-206`](../../../main/ui/index.ts).

The five attributes that carry `data-conversion="true"` are inventoried in [Group G's HTML deep-dive §3.2](../g/main__index.html.md): `spacing`, `curveTolerance`, `endpointTolerance`, `exportWithSheetsSpaceValue`, plus a fifth (see the Group G doc for the full table at line 91 of that file).

The `key === "scale"` branch is **separate** from the `data-conversion` branch — it's special-cased on `main/ui/index.ts:411` because `scale` itself is what defines the factor. Don't fold them. This invariant is also called out in [Group C's `main__ui__index.ts.md`](../c/main__ui__index.ts.md) §"Invariants".

## Invariants & gotchas

1. **`INCHES_TO_MM = 25.4` is the single canonical factor here**, but the live codebase contains **three additional unsynchronised copies** of `25.4`:
   - [`main/ui/services/config.service.ts:325, 354, 366`](../../../main/ui/services/config.service.ts) — three numeric literals.
   - [`main/ui/components/sheet-dialog.ts:54`](../../../main/ui/components/sheet-dialog.ts) — a private `const INCHES_TO_MM`.
   - [`main/ui/index.ts:411, 424`](../../../main/ui/index.ts) — two numeric literals.
   If the SI definition of an inch ever changes (it won't), six places need editing. This is the cleanup target.

2. **`getScaleInUnits` and `getConversionFactor` are mathematically identical** (compare lines 32-37 with 71-76). Both branch on `units === "mm"` and divide `scale` by `INCHES_TO_MM`. The duplication is *intentional* — the names communicate intent at the call site (`getScaleInUnits` reads as "for displaying the scale field"; `getConversionFactor` reads as "for converting another field's value"). Do not collapse one into the other.

3. **`setScaleFromUnits` and `toSvgUnits` are NOT the same operation.** `setScaleFromUnits(value, "mm")` returns `value × 25.4` (line 53); `toSvgUnits(value, scale, "mm")` returns `value × scale / 25.4` (line 98). The first reverses the unit conversion of the scale field itself; the second converts a length using the scale.

4. **`getExportScale`'s DXF branch treats `dxfExportScale === 0` as "not set"** (line 207: `if (dxfExportScale !== undefined && dxfExportScale !== 0)`). The check is paranoia — a zero DXF scale would divide-by-zero — but it also silently swallows a misconfigured `0`. Callers that want to know about a bad config must validate before calling.

5. **The DXF / unit adjustments compose, but order matters.** Lines 204-216 apply DXF first, then unit. Reordering produces a different result for `"mm"` mode with a non-1 DXF scale because the operations don't commute with the divide.

6. **`formatDimension` rounds via `toFixed(precision)`** (line 144) — `toFixed` is *banker's* rounding in some engines but in V8 it's "round half to even" except at extremes. Don't rely on the rounding mode; if a test pins on it, it's flaky on other JS hosts. The default precision of 1 is enough for the dimension chips in the UI.

7. **`getUnitSuffix("inch")` returns `"in"`, not `"inch"`** (line 180). The function maps the *enum* value to the *display* suffix; this is the only shorthand applied. `formatDimension` uses the same mapping inline (line 143).

8. **`fromSvgUnits(72, 72, "mm")` returns `25.4`, not `25.4 mm` as a length** — the result is a scalar, not a Quantity. Suffixing happens only in `formatDimension`. Don't pass the result of `fromSvgUnits` to a string concatenation expecting a unit.

## Known TODOs

`grep -n "TODO\|FIXME"` against this file returns **no matches**. No in-source debt markers.

The implicit follow-up — "make the live codebase actually call these helpers" — is not annotated here; the cleanup needs to happen in the three duplicate sites listed above.

## Extension points

- **Migrate `ConfigService` to delegate.** Replace [`main/ui/services/config.service.ts:322-369`](../../../main/ui/services/config.service.ts) bodies with `getConversionFactor(this.config.scale, this.config.units)` etc. Mechanical refactor; no behaviour change. Removes three of the four hardcoded `25.4`s.
- **Migrate the `data-conversion` form glue.** [`main/ui/index.ts:198-211`](../../../main/ui/index.ts) and [`main/ui/index.ts:410-427`](../../../main/ui/index.ts) both inline the math. Could be replaced with `toSvgUnits(...)` / `fromSvgUnits(...)`.
- **Drop `sheet-dialog`'s local `INCHES_TO_MM`.** Replace [`main/ui/components/sheet-dialog.ts:54, 175`](../../../main/ui/components/sheet-dialog.ts) with imports from this module.
- **New format helpers.** Adding `formatArea(svgArea, scale, units)` (returns `"123.4 mm²"`) is the obvious next helper; it has no consumers today, so add only when one materialises.
- **Unit unit tests.** Pure functions + `tsc` — `tests/unit/conversion.spec.ts` would be ~40 lines. None exist today.

## Test coverage status

- **No dedicated unit tests.** The only test file in the tree is `tests/index.spec.ts` (Playwright E2E, single file).
- E2E coverage of the *contract* this module documents is real but indirect: [Group J's `tests__index.spec.ts.md`](../j/tests__index.spec.ts.md) shows that the `config.spec` flow asserts `10 mm × 72 ÷ 25.4 = 28.34645669291339` for `spacing` — exactly `toSvgUnits(10, 72, "mm")` per this module. Same for `curveTolerance`. So the math is proved end-to-end through the inline duplications, not through this file's exports.
- Coverage of the actual functions in this file: **0%** (because nothing imports them).

## Cross-references

- Inline math duplications: [Group D's `main__ui__services__config.service.md`](../d/main__ui__services__config.service.md), [Group E's `main__ui__components__sheet-dialog.md`](../e/main__ui__components__sheet-dialog.md), [Group C's `main__ui__index.ts.md`](../c/main__ui__index.ts.md).
- HTML attribute contract (the `data-conversion` table): [Group G's `main__index.html.md`](../g/main__index.html.md) §3.2.
- E2E proof of the math: [Group J's `tests__index.spec.ts.md`](../j/tests__index.spec.ts.md) §"Config tab".
- `UnitType` definition: [Group C's `main__ui__types__index.ts.md`](../c/main__ui__types__index.ts.md) (the re-export point).
- Sibling utilities: [`dom-utils.ts`](./main__ui__utils__dom-utils.ts.md), [`ui-helpers.ts`](./main__ui__utils__ui-helpers.ts.md).
