# Deep Dive — `index.d.ts`

> **Group**: H (build / config / quality) · **Issue**: [DEE-19](../../../) · **Parent**: [DEE-11](../../index.md) · **Author**: Paige · **Generated**: 2026-04-26
>
> Per-file deep dive following the [DEE-11 shared template](../b/README.md). Companion files in this group: [`package.json.md`](./package.json.md), [`tsconfig.json.md`](./tsconfig.json.md), [`playwright.config.ts.md`](./playwright.config.ts.md), [`eslint.config.mjs.md`](./eslint.config.mjs.md). Mirror file in Group C: [`main/ui/types/index.ts`](../c/main__ui__types__index.ts.md).

| Field | Value |
|---|---|
| Path | [`index.d.ts`](../../../index.d.ts) |
| Lines | 305 |
| Format | Ambient TypeScript declarations + `declare global { interface Window }` |
| Pointed at by | [`package.json#types`](./package.json.md) — `"types": "index.d.ts"` |
| Picked up by | [`tsconfig.json`](./tsconfig.json.md) automatically (root `.d.ts` discovery) |
| Layer | Type contract — engine core types **and** the canonical `Window` augmentation for renderer globals |

---

## 1. Purpose

This file is the **canonical type spec** for the project. Two roles:

1. **Engine contract** — defines the data structures that flow between `main/deepnest.js`, `main/background.js`, `main/svgparser.js`, and the UI services. Every type that crosses the renderer / engine boundary lives here as a `type` or `interface` export.
2. **Renderer global augmentation** — declares `window.config`, `window.DeepNest`, `window.nest`, `window.SvgParser`, `window.loginWindow` via `declare global { interface Window }`. This is the **only** place these properties are typed; without this declaration TypeScript would refuse to compile any access to `window.SvgParser` etc.

The file is also `package.json#types`, so any external consumer that ever did `import "deepnest"` would receive these types. The package is `private: true` so this is theoretical, but the field is harmless.

> **Convention**: structure mirrors [`main/ui/types/index.ts`](../c/main__ui__types__index.ts.md). The latter re-exports many of these types and adds UI-only extensions (`UIConfig`, `ConfigObject extends UIConfig`, view-data shapes, `RactiveInstance<T>` generic). Read the two side by side: this file is engine-shaped, the UI file is renderer-shaped.

---

## 2. Public surface — exported types & interfaces

### 2.1 Primitive aliases

| Symbol | Lines | Definition | Why |
|---|---|---|---|
| `PlacementType` | 14 | `"gravity" \| "box" \| "convexhull"` | Algorithm strategy. Read in [`main/deepnest.js`](../../../main/deepnest.js) and surfaced in the config UI. |
| `UnitType` | 19 | `"mm" \| "inch"` | UI display + DXF import scale switch. |

### 2.2 Engine config

| Symbol | Lines | Fields | Why |
|---|---|---|---|
| `DeepNestConfig` | 24-62 | `units`, `scale`, `spacing`, `curveTolerance`, `clipperScale`, `rotations`, `threads`, `populationSize`, `mutationRate`, `placementType`, `mergeLines`, `timeRatio`, `simplify`, `dxfImportScale`, `dxfExportScale`, `endpointTolerance`, `conversionServer` | 17 fields. Mirrors the `settings.json` keys (modulo UI-only extensions in `UIConfig`). |

> **Cross-reference.** `UIConfig` in [`main/ui/types/index.ts`](../c/main__ui__types__index.ts.md) **extends** `DeepNestConfig` with renderer-only keys (e.g. `useQuantityFromFileName`, dark-mode flag). The renderer reads/writes the union shape and the main process round-trips it via `read-config` / `write-config` IPC. See [`main.js.md`](../a/main.js.md) §5.2.

### 2.3 Geometry primitives

| Symbol | Lines | Shape | Used by |
|---|---|---|---|
| `Bounds` | 110-115 | `{x, y, width, height}` | `Part.bounds`, sheet bounds in placement output. |
| `PolygonPoint` | 120-127 | `{x, y, marked?, exact?}` | Vertex with two NFP-side annotations: `marked` for traversal, `exact` for "lies on the original edge". |
| `Polygon` | 133-144 | `Array<PolygonPoint>` extended with `id?, source?, children?, parent?, filename?` | Tree-shaped polygon — children represent holes / nested cutouts. **Hazard**: extending `Array` plus mutating `parent` makes JSON serialisation non-trivial; see ADR-006 in [`docs/architecture.md`](../../architecture.md). |

### 2.4 Part / placement / result

| Symbol | Lines | Shape | Used by |
|---|---|---|---|
| `Part` | 149-166 | `{polygontree, svgelements, bounds, area, quantity, filename, sheet?, selected?}` | One importable part. `sheet: true` repurposes a part as a bin. |
| `SheetPlacement` | 67-80 | `{filename, id, rotation, source, x, y}` | One placed copy. |
| `NestingResult` | 85-105 | `{area, fitness, index, mergedLength, selected, placements: [{sheet, sheetid, sheetplacements}]}` | Output of one GA individual. Mutated client-side: `selected` flips on user click. |

### 2.5 Renderer-global interfaces

These four interfaces describe the **shape of the singletons assigned to `window.*`**. They are referenced inside the `Window` augmentation in §3.

| Symbol | Lines | Singleton | Notes |
|---|---|---|---|
| `ConfigObject` | 172-190 | `window.config` | `getSync(key?)`, `setSync(keyOrObj, value?)`, `resetToDefaultsSync()`. The renderer reassigns this to a `ConfigService` instance via cast — see [`main/ui/services/config.service.ts`](../../../main/ui/services/config.service.ts) `createConfigObject()`. |
| `DeepNestInstance` | 196-247 | `window.DeepNest` | Methods: `importsvg`, `config`, `start`, `stop`, `reset`. State: `parts`, `nests`, `working`. Implemented by [`main/deepnest.js`](../../../main/deepnest.js) `class DeepNest`. |
| `RactiveInstance` | 252-255 | `window.nest` | **Minimal** — only `update(keypath?): Promise<void>`. The richer generic `RactiveInstance<T>` in [`main/ui/types/index.ts`](../c/main__ui__types__index.ts.md) is the one services should use. **Hazard**: same name in two files; see §6. |
| `SvgParserInstance` | 260-273 | `window.SvgParser` | Methods used by [`main/deepnest.js`](../../../main/deepnest.js): `load`, `cleanInput`, `polygonElements`, `isClosed`, `polygonify`, `config`. **Missing from this interface but called in source: `transformParse`, `polygonifyPath`** — see hazard in §4 used-by table. |

---

## 3. The `Window` augmentation (`index.d.ts:275-305`)

```ts
declare global {
  interface Window {
    config: ConfigObject;
    DeepNest: DeepNestInstance;
    nest: RactiveInstance;
    SvgParser: SvgParserInstance;
    loginWindow: Window | null;
  }
}
```

**Five slots.** Each maps to one renderer global. The augmentation is `declare global` (not `export {}`), which means TypeScript treats this `.d.ts` as a script, not a module — so the augmentation lands in the global scope automatically when [`tsconfig.json`](./tsconfig.json.md) picks the file up via root-`.d.ts` auto-inclusion.

> ⚠ **Hazard — module-vs-script promotion.** If anyone ever adds `export {}` to this file (or any top-level `import` / `export`), the file becomes a module and the global augmentation **silently stops applying**. Every renderer file that touches `window.SvgParser` etc. would then fail to type-check. There is no warning. **Don't add `export` statements here.** Put new types in [`main/ui/types/index.ts`](../c/main__ui__types__index.ts.md), which is already a module.

---

## 4. Used-by — every `window.*` access in the codebase

Computed from `grep -n 'window\.\(config\|DeepNest\|nest\|SvgParser\|loginWindow\)' main/ tests/ index.d.ts main/ui/`. Read sites are direct accesses; assignment sites mutate the slot.

### 4.1 `window.SvgParser`

| Site | Line | Access | Member |
|---|---|---|---|
| [`main/index.html`](../../../main/index.html) | 25 | **assignment** | `= new SvgParser()` (boot) |
| [`main/deepnest.js`](../../../main/deepnest.js) | 65 | read | `.load(dirpath, svgstring, scale, scalingFactor)` |
| [`main/deepnest.js`](../../../main/deepnest.js) | 66 | read | `.cleanInput(dxfFlag)` |
| [`main/deepnest.js`](../../../main/deepnest.js) | 559 | read | `.config({tolerance, endpointTolerance})` |
| [`main/deepnest.js`](../../../main/deepnest.js) | 679 | read | `.polygonElements` |
| [`main/deepnest.js`](../../../main/deepnest.js) | 684 | read | `.isClosed(el, 2*config.curveTolerance)` |
| [`main/deepnest.js`](../../../main/deepnest.js) | 688 | read | `.polygonify(el)` |
| [`main/deepnest.js`](../../../main/deepnest.js) | 902 | read | `.transformParse(transformString)` |
| [`main/deepnest.js`](../../../main/deepnest.js) | 916 | read | `.polygonifyPath(el)` |

> ⚠ **Hazard — interface gaps.** `transformParse` and `polygonifyPath` are called in source but **not declared on `SvgParserInstance`** (interface ends at line 273 with only `load / cleanInput / polygonElements / isClosed / polygonify / config`). Today this is invisible because the calling file (`main/deepnest.js`) is `.js` and not type-checked. Migrating `deepnest.js` to TypeScript will surface "Property 'transformParse' does not exist on type 'SvgParserInstance'." Fix is to add both methods to the interface here.

### 4.2 `window.DeepNest`

| Site | Line | Access | Member |
|---|---|---|---|
| [`main/index.html`](../../../main/index.html) | 27 | **assignment** | `= new DeepNest(require('electron').ipcRenderer)` |
| [`main/ui/index.ts`](../../../main/ui/index.ts) | 71 | declared | `declare let DeepNest: DeepNestInstance;` (typed handle) |
| [`main/ui/index.ts`](../../../main/ui/index.ts) | 81 | read (helper) | `function getDeepNest(): DeepNestInstance { return DeepNest; }` |
| [`main/ui/components/parts-view.ts`](../../../main/ui/components/parts-view.ts) | 737 | jsdoc only | `// const partsView = initializePartsView(window.DeepNest, ...)` |
| [`main/ui/components/sheet-dialog.ts`](../../../main/ui/components/sheet-dialog.ts) | 410 | jsdoc only | example in factory comment |
| [`main/ui/components/nest-view.ts`](../../../main/ui/components/nest-view.ts) | 551 | jsdoc only | example in factory comment |
| [`tests/index.spec.ts`](../../../tests/index.spec.ts) | 90 | read (in-page) | `window.DeepNest.config()` |
| [`tests/index.spec.ts`](../../../tests/index.spec.ts) | 192 | read (in-page) | `window.DeepNest.nests` |

The TS renderer never says `window.DeepNest` directly — it uses `getDeepNest()` so the local variable type kicks in. The Playwright test reaches into the renderer via `mainWindow.evaluate(() => window.DeepNest...)`, where the augmentation here makes the access type-safe.

### 4.3 `window.config`

| Site | Line | Access | Member |
|---|---|---|---|
| [`main/ui/index.ts`](../../../main/ui/index.ts) | 594 | **assignment** | `(window as unknown as ...).config = configService as unknown as ConfigObject` |
| [`main/deepnest.js`](../../../main/deepnest.js) | 814 | read | `window.config.getSync("useQuantityFromFileName")` |
| [`tests/index.spec.ts`](../../../tests/index.spec.ts) | 87 | read (in-page) | `window.config.getSync()` |
| [`main/ui/components/parts-view.ts`](../../../main/ui/components/parts-view.ts) | 737 | jsdoc only | factory example |
| [`main/ui/components/sheet-dialog.ts`](../../../main/ui/components/sheet-dialog.ts) | 411 | jsdoc only | factory example |
| [`main/ui/components/nest-view.ts`](../../../main/ui/components/nest-view.ts) | 551 | jsdoc only | factory example |

> ⚠ **Hazard — `getSync` key not in `DeepNestConfig`.** [`main/deepnest.js:814`](../../../main/deepnest.js) reads `useQuantityFromFileName`, which lives in `UIConfig` (Group C), **not** in `DeepNestConfig` (this file). The renderer reassigns `window.config` to a `ConfigService` whose runtime shape is `UIConfig`-wide; the `ConfigObject` interface here only types the engine subset. Today this is invisible because `deepnest.js` is `.js`. Migrating it surfaces "Property 'useQuantityFromFileName' is not assignable to parameter of type 'keyof DeepNestConfig'." Fix is to either extend `ConfigObject` to be UIConfig-shaped or to retype `window.config` to the richer interface (the latter is cleaner — see §8).

### 4.4 `window.nest`

| Site | Line | Access | Member |
|---|---|---|---|
| [`main/ui/index.ts`](../../../main/ui/index.ts) | 629 | **assignment** | `(window as unknown as ...).nest = nestViewService.getRactive()` |
| (no production reads) | — | — | The slot is **set but no source file currently reads it.** Documented in [`docs/deep-dive/c/main__ui__index.ts.md`](../c/main__ui__index.ts.md) §5 as "Legacy access pattern for the nest-view Ractive — still read by some exported functions" — but no current read site appears in the grep across `main/`, `tests/`, `index.d.ts`. The legacy reader was likely removed when `page.js` was deleted. |

> 🟡 **Stale typing? `window.nest`** is declared as `RactiveInstance` (a minimal `{ update }` interface) here, while the actual assigned value is `NestViewRactiveInstance` (richer). Today no reader, so the gap is harmless. If a future module reads `window.nest.set(...)` (a Ractive method), the minimal `RactiveInstance` here will reject it. The richer generic `RactiveInstance<T>` in [`main/ui/types/index.ts`](../c/main__ui__types__index.ts.md) is the better target — re-type the slot when the first reader appears. See discrepancy callout in §6.

### 4.5 `window.loginWindow`

| Site | Line | Access | Member |
|---|---|---|---|
| [`main/ui/index.ts`](../../../main/ui/index.ts) | 803 | **assignment** | `(window as unknown as ...).loginWindow = null` |
| (no production reads) | — | — | The OAuth popup that was supposed to populate this slot is documented in [`docs/deployment-guide.md`](../../deployment-guide.md) as "opens an external browser window; receives `login-success` IPC payload from the redirect handler." That is a different code path that does not touch `window.loginWindow`. **The slot is a dead reference** as of HEAD. |

> 🟡 **Discovery — `window.loginWindow` is dead.** The type, the assignment, and the IPC channels (`login-success`, `purchase-success` — see [`main.js.md`](../a/main.js.md) §5.4) all exist, but no read site populates or reads `window.loginWindow`. Either remove the slot from this augmentation or wire up the actual login window assignment. Flag for follow-up.

### 4.6 Summary table

| Slot | Assigned at | Read at (production) | Type today | Type ideal |
|---|---|---|---|---|
| `SvgParser` | `main/index.html:25` | 8 sites in `main/deepnest.js` | `SvgParserInstance` | extend with `transformParse`, `polygonifyPath` |
| `DeepNest` | `main/index.html:27` | `main/ui/index.ts:71/81`, 2 sites in `tests/index.spec.ts` | `DeepNestInstance` | OK |
| `config` | `main/ui/index.ts:594` | `main/deepnest.js:814`, `tests/index.spec.ts:87` | `ConfigObject` | retype to `UIConfig`-aware (see hazard §4.3) |
| `nest` | `main/ui/index.ts:629` | none | `RactiveInstance` (minimal) | retype to `RactiveInstance<NestViewData>` once a reader returns |
| `loginWindow` | `main/ui/index.ts:803` | none | `Window \| null` | remove until OAuth flow re-wires it |

---

## 5. Dependencies (in / out)

### In (consumers)

- **[`tsconfig.json`](./tsconfig.json.md)** — automatic root `.d.ts` discovery. The renderer compile depends on this file's global augmentation; without it `window.SvgParser` etc. would not type-check.
- **[`main/ui/types/index.ts`](../c/main__ui__types__index.ts.md)** — re-exports every type from this file (passthrough table at §2.1 there) and extends them. Renaming a type here is a two-file edit.
- **[`tests/index.spec.ts:13`](../../../tests/index.spec.ts)** — `import { DeepNestConfig, NestingResult } from "../index"` (path resolution: `../index.d.ts`, picked up because the spec is in `tests/`).
- **`package.json#types`** — points the npm tooling at this file. No runtime effect since the package is private.

### Out

This file imports nothing. It is pure declaration code. No runtime side effects. No top-level `import` / `export`.

---

## 6. Discrepancy callout — duplicate type names with `main/ui/types/index.ts`

Both this file and [`main/ui/types/index.ts`](../c/main__ui__types__index.ts.md) declare interfaces with overlapping names. The UI file re-exports the engine versions and **shadows** some with richer variants:

| Name | This file | `main/ui/types/index.ts` | Pick |
|---|---|---|---|
| `DeepNestInstance` | engine subset | re-export | engine version (single source) |
| `SvgParserInstance` | engine subset | extended | UI version when in renderer code |
| `ConfigObject` | engine subset (`getSync<K extends keyof DeepNestConfig>`) | UI extends `UIConfig` | UI version when in renderer code |
| `RactiveInstance` | minimal `{update}` | generic `RactiveInstance<T>` | UI version |
| All geometry primitives (`PolygonPoint`, `Polygon`, etc.) | canonical | re-export | engine version (single source) |

Treat this file as **engine-truth** and the UI file as **renderer-truth**. The Window augmentation here uses the engine variants — which is **why** the renderer ends up casting `configService as unknown as ConfigObject` when assigning `window.config`. Cleaning that up requires either widening this file's `ConfigObject` to be UIConfig-aware or moving the `Window` augmentation into [`main/ui/types/index.ts`](../c/main__ui__types__index.ts.md). The latter is the structurally cleaner option but breaks the "package types" semantics of `package.json#types`.

---

## 7. Invariants & gotchas

1. **No `import` / `export` allowed at top level** — see hazard in §3. The file must remain a script for `declare global` to apply automatically.
2. **`tsconfig.json#include` does not list this file.** It works because TypeScript auto-discovers `.d.ts` files at the project root. If `include` is ever rewritten more restrictively (e.g. `["main/**/*"]` only), this file must be added explicitly.
3. **`Polygon extends Array<PolygonPoint>`** — array-with-properties is JSON-serialisable but loses the extra props on `JSON.stringify` / `JSON.parse` round-trips unless a custom replacer is used. ADR-006 in [`docs/architecture.md`](../../architecture.md) covers the implications for IPC payloads.
4. **Type / runtime drift in `SvgParserInstance` and `ConfigObject`** — see §4 hazards. Both interfaces are subsets of the actual runtime surface. Migrating any consumer to TypeScript will surface gaps.
5. **`window.nest` is a misleading name.** It is the `Ractive` instance for the nest-view, not a nesting service. ADR-005 documents this. Renaming is a cross-cutting change.
6. **`loginWindow: Window | null`** — `Window` here is the global `Window` type, not a custom alias. So the slot is "another popup `Window` object" or `null`. See §4.5 — currently no reader.
7. **Engine vs UI shape leak.** `DeepNestConfig` deliberately omits UI-only keys (e.g. `useQuantityFromFileName`). If you add a config knob that the engine reads, add it here; if only the UI reads it, add it to `UIConfig` in the UI types file.

---

## 8. Known TODOs / debt

- **Add `transformParse` and `polygonifyPath` to `SvgParserInstance`** (§4.1 hazard). Required before `main/deepnest.js` can be migrated to TS.
- **Decide what `window.config`'s type should be.** Either widen `ConfigObject` here to UIConfig-shaped, or re-declare `window.config` to the richer interface in [`main/ui/types/index.ts`](../c/main__ui__types__index.ts.md). Today the cast in [`main/ui/index.ts:594`](../../../main/ui/index.ts) is the symptom of the gap.
- **Remove `window.nest` from this augmentation if no production reader appears**, or retype to `RactiveInstance<NestViewData>` if it does. See §4.4.
- **Remove `window.loginWindow` until the OAuth flow re-wires it.** See §4.5.
- **No version field in this file.** External consumers cannot detect breaking changes without diffing. (Acceptable today because the package is private.)
- **Inline JSDoc is comprehensive** — no `// FIXME` / `// todo:` markers. Documentation debt is exclusively in the gaps surfaced above.

---

## 9. Extension points

| Need | How to add it |
|---|---|
| New engine config field | Add to `DeepNestConfig` (§2.2). The renderer side via `UIConfig` will need the same field. Update `read-config` / `write-config` migrations in [`main.js`](../a/main.js.md) and `presets.js` if the field affects existing user data. |
| New `window.*` slot | Add to the `Window` interface inside `declare global` (§3). Document the assignment site and at least one reader. **Update ADR-005** in [`docs/architecture.md`](../../architecture.md) — adding window globals is an architectural decision. |
| New geometry primitive | Add the type next to existing primitives (§2.3). Re-export from [`main/ui/types/index.ts`](../c/main__ui__types__index.ts.md) so renderer code can import via the UI path. |
| Stricter `Part.filename` (currently `string \| null`) | If consumers can guarantee non-null, narrow it. Audit `import.service.ts` and `deepnest.js`'s `importsvg` first — programmatically created parts pass `null`. |
| New method on `DeepNestInstance` | Add to the interface (§2.5). Implement in `main/deepnest.js`. Verify Playwright spec at line 90 still passes. |
| Type-aware ESLint | Currently off (see [`eslint.config.mjs.md`](./eslint.config.mjs.md) §3.2). Once on, this file becomes the source for global type checks across all consumers. |

---

## 10. Test coverage status

The file is type-only — no runtime behaviour to test. Coverage is by side effect:

- **`npm run build`** ([`tsconfig.json`](./tsconfig.json.md)) — exercises the full augmentation chain. Compile-fail catches structural breaks.
- **`tests/index.spec.ts:90`, `:192`, `:87`** — runtime accesses to `window.DeepNest` and `window.config` from inside `mainWindow.evaluate(() => ...)`. The compiler accepts them because of the augmentation here; if the augmentation were removed, the spec would fail to type-check.
- **No standalone unit test** — there is no `*.d.test.ts`. The file is its own contract.

---

## 11. Cross-references

- [`docs/deep-dive/c/main__ui__types__index.ts.md`](../c/main__ui__types__index.ts.md) — the renderer-side companion. Re-exports / extends every engine type from this file.
- [`docs/deep-dive/h/tsconfig.json.md`](./tsconfig.json.md) — explains how this file is auto-discovered by `tsc` (root `.d.ts` rule).
- [`docs/deep-dive/h/package.json.md`](./package.json.md) — `"types": "index.d.ts"` field that points at this file.
- [`docs/deep-dive/a/main.js.md`](../a/main.js.md) §5 — IPC handlers that exchange `DeepNestConfig` shapes with the renderer.
- [`docs/deep-dive/b/main__deepnest.js.md`](../b/main__deepnest.js.md) — implements `DeepNestInstance`; calls `window.SvgParser.*` 8 times.
- [`docs/deep-dive/b/main__svgparser.js.md`](../b/main__svgparser.js.md) — implements `SvgParserInstance`; provides `transformParse` and `polygonifyPath` that aren't yet on the interface here.
- [`docs/deep-dive/c/main__ui__index.ts.md`](../c/main__ui__index.ts.md) §4-5 — assignment sites for `window.config`, `window.nest`, `window.loginWindow`.
- [`docs/architecture.md`](../../architecture.md) ADR-005 — accepts the renderer's deliberate window globals.
- [`docs/component-inventory.md`](../../component-inventory.md) §"Globals" — high-level summary of the same five slots.
