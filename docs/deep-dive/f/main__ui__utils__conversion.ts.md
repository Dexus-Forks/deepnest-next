# `main/ui/utils/conversion.ts` — Deep Dive

**Generated:** 2026-04-25 by Paige (Tech Writer) for [DEE-17](/DEE/issues/DEE-17) (parent: [DEE-11](/DEE/issues/DEE-11)).
**Group:** F — UI utilities.
**File:** `main/ui/utils/conversion.ts` (263 LOC, TypeScript, strict).
**Mode:** Exhaustive deep-dive.

## Overview

Free-function unit/scale conversion helpers for the renderer: `mm ↔ inch ↔ SVG-units` and dimension-formatting. Stateless. Imports only one TypeScript type (`UnitType`) from `main/ui/types/index.ts`.

> **Critical finding — this file is currently dead code.** No `.ts` or `.js` file in the repo imports anything from `conversion.ts`. The same logic is **duplicated** in three places that ship to production:
>
> - `main/ui/services/config.service.ts` — methods `getConversionFactor()`, `toSvgUnits()`, `fromSvgUnits()`, `getScaleInUnits()`, `setScaleFromUnits()` (lines 322–369).
> - `main/ui/components/sheet-dialog.ts` — local `INCHES_TO_MM = 25.4` (line 54) and a private `getConversionFactor()` (lines 175–185).
> - `main/ui/components/parts-view.ts` — inline `25.4 * width / conversion` (lines 230–246).
>
> The constant `25.4` and the unit-branching logic appear independently in each of the four locations. This is a known refactoring debt — see "Contributor checklist" below.

The intended role of this module is to be the single source of truth for unit math; treat any future component or service that needs unit conversion as the consumer this module was built for.

## Public surface

```ts
export const INCHES_TO_MM = 25.4;

export function getScaleInUnits(scale: number, units: UnitType): number;
export function setScaleFromUnits(value: number, units: UnitType): number;
export function getConversionFactor(scale: number, units: UnitType): number;
export function toSvgUnits(value: number, scale: number, units: UnitType): number;
export function fromSvgUnits(value: number, scale: number, units: UnitType): number;
export function formatDimension(
  value: number, scale: number, units: UnitType, precision?: number
): string;
export function formatBounds(
  width: number, height: number, scale: number, units: UnitType, precision?: number
): string;
export function getUnitSuffix(units: UnitType): string;
export function getExportScale(
  scale: number, units: UnitType, dxfExportScale?: number
): number;
export function toExportDimension(
  svgValue: number, scale: number, units: UnitType, dxfExportScale?: number
): number;
export function toInches(svgLength: number, scale: number): number;
export function fromInches(inches: number, scale: number): number;
```

`UnitType` is `"mm" | "inch"` and is re-exported via `main/ui/types/index.ts` from the project root `index.d.ts`.

### The conversion model

Three coordinate systems coexist in the renderer:

1. **Stored scale** — `config.scale` is **always units-per-inch** regardless of the user's display unit. Default `72` (the SVG/CSS de-facto pixels-per-inch).
2. **Display unit** — `config.units` is `"inch"` or `"mm"`; controls labels and how the user types numbers in the form.
3. **SVG units** — what `<svg width="…">` and path coordinates use.

The conversion factor is the single number that translates user-typed values into SVG units:

```
conversion = config.units === "mm"  ?  scale / 25.4  :  scale
```

Every helper in this module is a thin algebraic identity over that single rule:

| Helper | Formula |
|---|---|
| `getScaleInUnits(scale, units)` | `units === "mm" ? scale/25.4 : scale` |
| `setScaleFromUnits(value, units)` | `units === "mm" ? value*25.4 : value` |
| `getConversionFactor(scale, units)` | same as `getScaleInUnits` |
| `toSvgUnits(value, scale, units)` | `value * conversion` |
| `fromSvgUnits(value, scale, units)` | `value / conversion` |
| `formatDimension(value, scale, units, p=1)` | `fromSvgUnits(...).toFixed(p) + (mm|in)` |
| `formatBounds(w, h, scale, units, p=1)` | `formatDimension(w,...) + " x " + formatDimension(h,...)` |
| `getUnitSuffix(units)` | `units === "mm" ? "mm" : "in"` |
| `getExportScale(scale, units, dxfExportScale?)` | see below |
| `toExportDimension(svgValue, ...)` | `svgValue / getExportScale(...)` |
| `toInches(svgLength, scale)` | `svgLength / scale` |
| `fromInches(inches, scale)` | `inches * scale` |

`getScaleInUnits` and `getConversionFactor` are **the same function with two names**. Both exist for naming clarity at call sites (one for the form's scale display, the other for everywhere else). If this module is ever adopted, consider keeping both names as exports but pointing one at the other to make that explicit.

### `getExportScale` — the only multi-branch helper

```ts
function getExportScale(scale, units, dxfExportScale?): number {
  let exportScale = scale;
  if (dxfExportScale !== undefined && dxfExportScale !== 0) {
    exportScale = scale / dxfExportScale;
  }
  if (units === "mm") {
    exportScale = exportScale / INCHES_TO_MM;
  }
  return exportScale;
}
```

Order of operations is fixed: DXF scale is applied before mm conversion. The `dxfExportScale === 0` guard prevents divide-by-zero — `0` is a sentinel that means "no DXF scale specified" (caller-side semantics, not the math's). The legacy DXF UI control offers values `1, 6, 25.4, 2.54, 72` (see `main/index.html` lines 350–358); zero is never produced by the form, only by callers that bypass it.

`toExportDimension` is the inverse of `toSvgUnits` parameterized for export — divides by the export scale.

### `toInches` / `fromInches`

These bypass `units` entirely. They convert SVG length to inches assuming `scale` is already units-per-inch. Used historically for time-based math (laser cut time) where the unit system is irrelevant — see the placement engine's path-length cost.

## The `data-conversion` HTML contract

The form in `main/index.html` marks unit-bearing inputs with the attribute `data-conversion="true"`. The runtime path that reads/writes those values lives in `main/ui/index.ts`, **not** in this file — but the math is the same as `toSvgUnits` / `fromSvgUnits` open-coded.

| Input (in `main/index.html`) | `data-config` key | `data-conversion` | Conversion |
|---|---|---|---|
| Space between parts | `spacing` | `"true"` | user value × conversion-factor → stored SVG units |
| Curve tolerance | `curveTolerance` | `"true"` | user value × conversion-factor → stored SVG units |
| Endpoint tolerance | `endpointTolerance` | `"true"` | user value × conversion-factor → stored SVG units |
| Distance between sheets | `exportWithSheetsSpaceValue` | `"true"` | user value × conversion-factor → stored SVG units |
| SVG scale (`#inputscale`) | `scale` | _absent_ | scale itself; multiply by `25.4` if user is in mm (via `setScaleFromUnits` logic, open-coded in `index.ts:411`) |
| Units | `units` | _absent_ | radio: `"inch"` / `"mm"` |
| Rotations / threads / placement / boolean toggles | various | _absent_ | passthrough; no unit math |

Read path (form populated from config), `index.ts:204-206`:

```ts
if (inputElement.getAttribute("data-conversion") === "true") {
  const scaleValue = scaleInput ? Number(scaleInput.value) : c.scale;
  inputElement.value = String((value as number) / scaleValue);
}
```

Write path (form change → config), `index.ts:421-426`:

```ts
if (inputElement.getAttribute("data-conversion") === "true") {
  let conversion = configService.getSync("scale");
  if (configService.getSync("units") === "mm") {
    conversion /= 25.4;
  }
  val = Number(val) * conversion;
}
```

The read path uses the **scale alone** (not the mm-adjusted conversion) because the same input is also bound to the user's typed unit; the write path adjusts for mm because the value has to be stored in SVG units. This asymmetry is intentional but easy to misread.

> If/when `index.ts` adopts `conversion.ts`, the read path becomes `inputElement.value = String(toInches(value, scaleValue))` and the write path becomes `val = toSvgUnits(Number(val), scaleValue, units)`.

The contract: **inputs marked `data-conversion="true"` are stored in SVG units and displayed in the user's current unit.** Inputs without the marker are stored verbatim. Adding `data-conversion="true"` to a new input means committing to that contract.

## Used-by

```bash
$ rg -nU --type ts --type js "from\\s+['\"][^'\"]*conversion[^'\"]*['\"]"
# (no matches)
```

**Zero importers.** This is the most important Used-by finding in Group F: the module is structurally complete and unit-tested-by-construction (it’s pure math), but it is not wired into the dependency graph.

The `INCHES_TO_MM` constant is also exported but currently shadowed by local declarations:

- `main/ui/components/sheet-dialog.ts:54` — `const INCHES_TO_MM = 25.4;`

`config.service.ts` does not use a named constant at all — it inlines the literal `25.4` six times.

### Where the same logic lives today

| Location | Form |
|---|---|
| `main/ui/services/config.service.ts:322-369` | Class methods on `ConfigService`. |
| `main/ui/components/sheet-dialog.ts:175-185, 253-255` | Private method + inline arithmetic. |
| `main/ui/components/parts-view.ts:230-246` | Inline `(25.4 * width / conversion).toFixed(1) + "mm"` (open-coded `formatBounds`). |
| `main/ui/index.ts:204-206, 421-426` | Inline read/write paths for `data-conversion` form fields. |

## Build & loading

Compiled by `tsc` to `build/ui/utils/conversion.js`. Currently emitted into the build output but never imported, so it is dead weight in the bundle. The Electron renderer ESM loader does not perform tree-shaking on this code — the file is present on disk after `npm run build`.

## Side effects

None. Pure functions, no module-load side effects, no `globalThis` writes, no IPC. Safe to import from any context including unit tests.

## Error handling

None. The functions accept `number` and return `number`; passing `NaN` propagates `NaN`. Passing `0` for `scale` produces `Infinity` from `fromSvgUnits` (divide-by-zero) — the caller is expected to ensure `scale > 0`. The form's `min="1"` on `#inputscale` (see `main/index.html:317`) enforces this in the UI; programmatic callers must enforce it themselves.

## Testing

- **Unit tests:** none in repo. Because the module has no consumers, there is no E2E coverage either.
- **Manual verification of the active math** (in `config.service.ts` and friends): switch units in the Config tab, change a `data-conversion` field, reload the app — the displayed value should be consistent with the stored value × conversion factor.

## Comments / TODOs in source

The module has full JSDoc on every export. No `TODO` / `FIXME` markers. The header comment (lines 5–10) describes the conversion model accurately.

## Contributor checklist

**Risks & gotchas:**

- **Dead code today.** A change here will not affect runtime behavior. If you're fixing a unit-conversion bug observed in the app, the bug is in `config.service.ts`, `sheet-dialog.ts`, `parts-view.ts`, or `index.ts` — not here.
- The `data-conversion` HTML attribute is the runtime contract. Adopting this module from `index.ts` requires preserving that contract exactly: read = `value / scale`; write = `value * conversion` (where `conversion` is mm-adjusted).
- `getScaleInUnits === getConversionFactor` numerically. They are intentionally separate names; keep both as exports if you refactor.
- `getExportScale` returns `0` when called with `dxfExportScale === scale` and `units === "inch"` — that is, when caller passes a DXF scale equal to the document's units-per-inch. The branch math is correct but the result of `1` is right and `0` is impossible from the form. Programmatic callers must avoid `dxfExportScale === scale` if they don't want the unit branch to take over.
- `INCHES_TO_MM` is a `const` with the value `25.4` — exact for this magic number, but if anyone later switches to a more precise definition (`25.4` is exact by definition since 1959, so this is unlikely), all four duplicated copies must be updated.

**Pre-change verification:**

- `npm run build` (TypeScript strict — purely type-driven for this module).
- If you adopt this module from a consumer, run the Config tab E2E (`tests/specs/config-tab.spec.ts`) and any sheet-dialog E2E to confirm the unit display matches before/after.

**Suggested tests before PR:**

- A consolidation refactor (replace the four duplicated copies with calls into `conversion.ts`) is the natural follow-up. Land it in two PRs:
  1. Wire `config.service.ts` to delegate to this module. Verify with E2E.
  2. Wire `sheet-dialog.ts`, `parts-view.ts`, and the `index.ts` form-binding path. Verify with E2E + manual switch between mm and inch.
- Add unit tests for `conversion.ts` once it has a consumer — pure-function tests are cheap and the module would benefit from explicit coverage of the mm/inch branches.

## Cross-references

- **Group D (services):** `config.service.ts` re-implements every helper in this module as instance methods. See [main__ui__services__config.service.md](../d/main__ui__services__config.service.md) for the consumed-by-the-app variant.
- **Group E (UI components):** `sheet-dialog.ts` and `parts-view.ts` open-code the same math. See [main__ui__components__sheet-dialog.md](../e/main__ui__components__sheet-dialog.md) and [main__ui__components__parts-view.md](../e/main__ui__components__parts-view.md).
- **Group G (`main/index.html`):** owns the `data-conversion="true"` attribute on `#spacing`, `#curveTolerance`, `#endpointTolerance`, `#exportWithSheetsSpaceValue` (lines 237, 251, 333, 397). The composition root in `main/ui/index.ts:204` and `:421` is the runtime translator — it open-codes the math today.
- **Component inventory:** `docs/component-inventory.md` row "Conversion utilities".
- **Architecture:** `docs/architecture.md` §3 (renderer composition); the unit-conversion contract is summarized there but not exhaustively documented.

---

_Generated by Paige for the Group F deep-dive on 2026-04-25. Sources: `main/ui/utils/conversion.ts`, `main/ui/services/config.service.ts`, `main/ui/components/sheet-dialog.ts`, `main/ui/components/parts-view.ts`, `main/ui/index.ts`, `main/index.html`._
