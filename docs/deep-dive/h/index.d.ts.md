# `index.d.ts` — Deep Dive

**Generated:** 2026-04-26 by Paige (Tech Writer) for [DEE-40](/DEE/issues/DEE-40) (parent: [DEE-11](/DEE/issues/DEE-11), supersedes DEE-29).
**Group:** H — build / config / quality.
**File:** `index.d.ts` (306 LOC, project root).
**Mode:** Exhaustive deep-dive.

## 1. Purpose

Two roles in one file:

1. **Engine type contract** — the canonical TypeScript declarations for every value that crosses the legacy-renderer ↔ modern-UI seam. Defines `DeepNestConfig`, `NestingResult`, `Part`, `Polygon`, `PolygonPoint`, `Bounds`, `SheetPlacement`, the discriminator unions `PlacementType` and `UnitType`, plus the `*Instance` interfaces (`ConfigObject`, `DeepNestInstance`, `RactiveInstance`, `SvgParserInstance`).
2. **Global `Window` augmentation** — declares the five `window.*` slots that the renderer code populates and reads: `window.config`, `window.DeepNest`, `window.nest`, `window.SvgParser`, `window.loginWindow`. Without this augmentation, every `window.X` access in `main/deepnest.js` (8 sites), `tests/index.spec.ts` (3 sites), `main/ui/index.ts` (3 assignments), and `main/ui/components/*.ts` (multiple) would be `any`.

The file is referenced from [`package.json`](./package.json.md) line 7 as `"types": "index.d.ts"` and is auto-discovered by `tsc` even though [`tsconfig.json`](./tsconfig.json.md) does not list it in `include` (root `.d.ts` files are picked up implicitly for ambient declarations).

The header comment (lines 1–6) explicitly carves out scope:

> Core type definitions for DeepNest. These types define the fundamental data structures used throughout the application. **UI-specific extensions are defined in `main/ui/types/index.ts`.**

That distinction is load-bearing — see §6 for how `main/ui/types/index.ts` mirrors and extends the structures here.

## 2. Public surface (re-export inventory)

### 2.1 Type aliases

| Name | Lines | Shape | Used where |
|---|---|---|---|
| `PlacementType` | 14 | `"gravity" \| "box" \| "convexhull"` | `DeepNestConfig.placementType`; consumed by [`main/deepnest.js`](../b/main__deepnest.js.md) GA placement strategy. |
| `UnitType` | 19 | `"mm" \| "inch"` | `DeepNestConfig.units`; mirrored in [`main/ui/types/index.ts`](../c/main__ui__types__index.ts.md) and consumed by [`main/ui/utils/conversion.ts`](../f/main__ui__utils__conversion.ts.md). |
| `DeepNestConfig` | 24–62 | 18-property config record | The canonical engine config. Read by `tests/index.spec.ts:90` (`window.DeepNest.config()`) and asserted against `sharedConfig` (`tests/index.spec.ts:113-116`). Also imported as `import type { DeepNestConfig } from "../../../index.d.ts"` by [`main/ui/types/index.ts:20`](../c/main__ui__types__index.ts.md). |
| `SheetPlacement` | 67–80 | `{filename, id, rotation, source, x, y}` | Inner element of `NestingResult.placements[].sheetplacements`. |
| `NestingResult` | 85–105 | `{area, fitness, index, mergedLength, selected, placements: {sheet, sheetid, sheetplacements: SheetPlacement[]}[]}` | Read by `tests/index.spec.ts:192` (`window.DeepNest.nests`); attached as JSON to test results. |
| `Bounds` | 110–115 | `{x, y, width, height}` | `Part.bounds`; passed back from `Part.area = bounds.width * bounds.height` (per the comment at line 158). |
| `PolygonPoint` | 120–127 | `{x, y, marked?, exact?}` | Inner element of `Polygon`. The `marked` flag is set during NFP generation; `exact` flags points that lie exactly on the original polygon edge. |

### 2.2 Interfaces (object types, declaration-merging-aware)

| Name | Lines | Notes |
|---|---|---|
| `Polygon extends Array<PolygonPoint>` | 133–144 | Array-with-properties pattern. Optional `id`, `source`, `children: Polygon[]` (holes / nested), `parent: Polygon`, `filename`. The interface form (not type alias) allows downstream code to merge in additional properties if needed. |
| `Part` | 149–166 | `{polygontree, svgelements, bounds, area, quantity, filename, sheet?, selected?}`. Note `filename: string \| null` — programmatically created parts have `null`. |
| `ConfigObject` | 172–190 | The synchronous `electron-settings`-style façade exposed on `window.config`. Methods: `getSync<K>`, `setSync<K>`, `resetToDefaultsSync()`. The conditional return type on `getSync` (`K extends keyof DeepNestConfig ? DeepNestConfig[K] : DeepNestConfig`) lets callers do both `getSync()` (full config) and `getSync("scale")` (single value) with correct typing. |
| `DeepNestInstance` | 196–247 | The `window.DeepNest` API. Properties: `parts`, `nests`, `working`. Methods: `importsvg(...)`, `config(c?)`, `start(progressCb, displayCb)`, `stop()`, `reset()`. |
| `RactiveInstance` | 252–255 | **Minimal** — only declares `update(keypath?: string): Promise<void>`. The renderer needs more (`get`, `set`, `on`), but those are typed in the **richer** `RactiveInstance<T>` declared in [`main/ui/types/index.ts`](../c/main__ui__types__index.ts.md). The two declarations coexist; renderer code that imports the generic version shadows this one. |
| `SvgParserInstance` | 260–273 | Eight methods + one property. Notably **does not declare** `transformParse` or `polygonifyPath`, even though [`main/deepnest.js:902,916`](../b/main__deepnest.js.md) calls them. Those methods exist on `main/svgparser.js:946,1460` and on the richer `main/ui/types/index.ts:294-295` `SvgParserInstance` definition. See §7 Gotcha #4. |

### 2.3 The `Window` augmentation (lines 275–305)

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

This is the **only `declare global`** block in the file, and the only place in the entire project that augments the standard `Window` type at the root level. The companion [`main/ui/types/index.ts`](../c/main__ui__types__index.ts.md) defines an `ExtendedWindow` interface (lines 309–315) but does **not** re-augment `Window` — it intentionally provides a *parallel* typed view (`ExtendedWindow`) rather than a second declaration-merge.

### 2.4 What this file does NOT export

- No runtime values. Pure `.d.ts`.
- No `IPC_CHANNELS` constant. That lives in [`main/ui/types/index.ts`](../c/main__ui__types__index.ts.md).
- No `NestViewData`, `ExtendedWindow`, `UIConfig`, `PresetConfig`, `ThrottleOptions`. Those are renderer-side and live in [`main/ui/types/index.ts`](../c/main__ui__types__index.ts.md).

## 3. `Window` augmentation — Used-by table

Every `window.X` access in the codebase, mapped to the slot it consumes from this file. **This is the canonical source of truth for "who reaches into the window object."**

### 3.1 `window.SvgParser`

| Site | Method called | Note |
|---|---|---|
| [`main/index.html:25`](../g/main__index.html.md) | `window.SvgParser = new SvgParser()` | The **producer**. Boot-script assignment from `main/svgparser.js`. |
| [`main/deepnest.js:65`](../b/main__deepnest.js.md) | `.load(dirpath, svgstring, config.scale, scalingFactor)` | First step of `importsvg` pipeline. |
| [`main/deepnest.js:66`](../b/main__deepnest.js.md) | `.cleanInput(dxfFlag)` | Second step of `importsvg` pipeline. |
| [`main/deepnest.js:559`](../b/main__deepnest.js.md) | `.config({ tolerance, endpointTolerance, scale })` | Pushes a subset of `DeepNestConfig` into the parser. |
| [`main/deepnest.js:679`](../b/main__deepnest.js.md) | `.polygonElements.indexOf(paths[i].tagName)` | Reads the `polygonElements` array property. |
| [`main/deepnest.js:684`](../b/main__deepnest.js.md) | `.isClosed(paths[i], 2 * config.curveTolerance)` | Closed-path test. |
| [`main/deepnest.js:688`](../b/main__deepnest.js.md) | `.polygonify(paths[i])` | Converts SVG element → `PolygonPoint[]`. |
| [`main/deepnest.js:902`](../b/main__deepnest.js.md) | `.transformParse(transformString)` | **Not declared on `SvgParserInstance` in this file** — see §7 Gotcha #4. Compiles only because [`main/deepnest.js`](../b/main__deepnest.js.md) is `.js` and not type-checked (per [`tsconfig.json`](./tsconfig.json.md) `include`). |
| [`main/deepnest.js:916`](../b/main__deepnest.js.md) | `.polygonifyPath(el)` | Same — not declared on the root `SvgParserInstance`. |

### 3.2 `window.DeepNest`

| Site | Operation | Note |
|---|---|---|
| [`main/index.html:27`](../g/main__index.html.md) | `window.DeepNest = new DeepNest(require("electron").ipcRenderer)` | The **producer**. Boot-script assignment from `main/deepnest.js`. |
| [`tests/index.spec.ts:90`](../j/tests__index.spec.ts.md) | `window.DeepNest.config()` | Reads back the merged config under E2E. |
| [`tests/index.spec.ts:192`](../j/tests__index.spec.ts.md) | `window.DeepNest.nests` | Asserts the `nests` array is populated after a full nesting run; attached to test artefacts. |
| [`main/ui/index.ts:602`](../c/main__ui__index.ts.md) (via `getDeepNest()`) | `getDeepNest().config(cfgValues)` | Pushes the persisted config into the engine on UI boot. |
| [`main/ui/components/parts-view.ts:737`](../e/main__ui__components__parts-view.md) | Constructor arg | `initializePartsView(window.DeepNest, window.config, resize)` — typed via `DeepNestInstance`. |
| [`main/ui/components/nest-view.ts:551`](../e/main__ui__components__nest-view.md) | Constructor arg | `initializeNestView(window.DeepNest, window.config)`. |
| [`main/ui/components/sheet-dialog.ts:410`](../e/main__ui__components__sheet-dialog.md) | Constructor arg | `(window.DeepNest, window.config, ...)`. |

### 3.3 `window.config`

| Site | Operation | Note |
|---|---|---|
| [`main/ui/index.ts:594`](../c/main__ui__index.ts.md) | `window.config = configService` | The **producer**. Done after `createConfigService()` resolves. The cast is `(window as unknown as {...}).config = ...` because the `Window.config` slot is typed as `ConfigObject` here, but the implementation is the `ConfigService` class — the cast bridges them. |
| [`tests/index.spec.ts:87`](../j/tests__index.spec.ts.md) | `window.config.getSync()` | Reads back the persisted config under E2E. |
| [`main/deepnest.js:814`](../b/main__deepnest.js.md) | `window.config.getSync("useQuantityFromFileName")` | Cross-file: legacy renderer reads a config value via the modern `ConfigObject`. The `useQuantityFromFileName` key is **not** in `DeepNestConfig` (it's a UI-only flag) — `getSync<K>` returns `unknown` here because the conditional type narrows to `DeepNestConfig[K]` only when `K extends keyof DeepNestConfig`. |

### 3.4 `window.nest`

| Site | Operation | Note |
|---|---|---|
| [`main/ui/index.ts:629`](../c/main__ui__index.ts.md) | `window.nest = nestViewService.getRactive()` | The **producer**. The Ractive returned by `getRactive()` is the rich generic `RactiveInstance<NestViewData>`, but it gets stored into a slot typed as the minimal `RactiveInstance` — see §7 Gotcha #2. |
| **(no readers)** | — | No code in the current tree reads `window.nest` after assignment. The slot is preserved for backwards-compat with template / inline-handler call sites that may yet exist. |

### 3.5 `window.loginWindow`

| Site | Operation | Note |
|---|---|---|
| [`main/ui/index.ts:803`](../c/main__ui__index.ts.md) | `window.loginWindow = null` | The **producer**. Initialised at the end of `initialize()`. |
| **(no readers in source)** | — | The OAuth flow is the intended consumer (the type is `Window \| null` — meant to hold a popup). The actual login flow's open-popup logic lives elsewhere; in the current source the slot is set to `null` and never updated. |

## 4. IPC / global side-effects

`index.d.ts` itself has none (it's a declaration file — no runtime). The slots it declares are populated and consumed by:

- **Producers**: [`main/index.html`](../g/main__index.html.md) for `SvgParser` and `DeepNest`; [`main/ui/index.ts`](../c/main__ui__index.ts.md) for `config`, `nest`, `loginWindow`.
- **Consumers**: [`main/deepnest.js`](../b/main__deepnest.js.md), [`tests/index.spec.ts`](../j/tests__index.spec.ts.md), every renderer component under [`main/ui/components/`](../e/), the renderer services under [`main/ui/services/`](../d/).

There is no IPC declaration in this file. The IPC channel constants live in [`main/ui/types/index.ts`](../c/main__ui__types__index.ts.md) (`IPC_CHANNELS` enum-like object).

## 5. Dependencies

### 5.1 What depends on `index.d.ts`

| Site | Import | Symbols |
|---|---|---|
| [`tests/index.spec.ts:13`](../j/tests__index.spec.ts.md) | `import { DeepNestConfig, NestingResult } from "../index";` | Asserts on E2E config and nesting result shape. |
| [`main/ui/types/index.ts:20`](../c/main__ui__types__index.ts.md) | `import type { DeepNestConfig, NestingResult, PolygonPoint, Part } from "../../../index.d.ts";` | Re-exports / extends in the renderer-side type module. |
| **(implicit)** | Auto-discovered ambient declarations | `Window` augmentation is consumed wherever `window.X` is accessed — implicitly across `main/ui/**/*.ts` and `tests/index.spec.ts`. |

### 5.2 What `index.d.ts` depends on

- `SVGElement`, `SVGSVGElement`, `SVGPathElement`, `Window` — DOM lib types, available because [`tsconfig.json`](./tsconfig.json.md) `lib` includes `"DOM"`.
- Nothing else. No imports.

## 6. Mirror with `main/ui/types/index.ts`

The renderer-side type module at [`main/ui/types/index.ts`](../c/main__ui__types__index.ts.md) intentionally **mirrors and extends** this file. Mapping table:

| Concept | Defined here | Re-defined / extended in `main/ui/types/index.ts` |
|---|---|---|
| `DeepNestConfig` | lines 24–62 | Re-imported (line 20); `UIConfig` extends with `darkMode`, `useQuantityFromFileName`, etc. |
| `NestingResult` | lines 85–105 | Re-imported (line 20); used in `NestViewData`. |
| `PolygonPoint` | lines 120–127 | Re-imported (line 20); used in service signatures. |
| `Part` | lines 149–166 | Re-imported (line 20); not extended. |
| `ConfigObject` | lines 172–190 | Re-declared with extra setters and `UIConfig` typing. The renderer's actual `ConfigService` implements the richer version; `window.config` is typed as the minimal one here. |
| `DeepNestInstance` | lines 196–247 | Re-declared as `DeepNestInstance` (line 121) — same shape but renderer-typed. |
| `RactiveInstance` | lines 252–255 (non-generic, only `update`) | Re-declared as `RactiveInstance<T>` (generic, with `get`/`set`/`on`). |
| `SvgParserInstance` | lines 260–273 (8 methods, missing `transformParse` / `polygonifyPath`) | Re-declared (line 288) **with** `polygonifyPath` (line 294), `transformParse` (line 295), `applyTransform`, `flatten`, `splitLines`, `mergeOverlap`, `mergeLines` (lines 296–300). The renderer surface knows about more `SvgParser` methods than the root. |
| `Window` augmentation | lines 275–305 (`declare global`) | NOT re-augmented. Defines a parallel `ExtendedWindow` interface (lines 309–315) instead. |

This duplication is **deliberate** — the root file is the ABI seen by legacy renderer (`main/deepnest.js`, etc.) and by external consumers (anyone who installs the package and reads `"types": "index.d.ts"`); the renderer module is the wider internal surface.

## 7. Invariants & gotchas

1. **Auto-discovery, not explicit `include`.** [`tsconfig.json`](./tsconfig.json.md) `include` is `["main/**/*.ts", "main/ui/**/*.ts"]` — `index.d.ts` is **not** in the list. It is picked up because root `.d.ts` files are auto-loaded for ambient declarations and because [`package.json`](./package.json.md) `"types": "index.d.ts"` advertises it as the type entry. If `include` is ever tightened to a non-glob whitelist, the `Window` augmentation would silently disappear and every `window.X` access in the renderer would degrade to `any` — without a single compile error in this file.
2. **`RactiveInstance` shadowing.** This file declares a non-generic `RactiveInstance` with only `update()`. [`main/ui/types/index.ts`](../c/main__ui__types__index.ts.md) declares a generic `RactiveInstance<T>` with `get`, `set`, `on`. Renderer code that imports the generic version gets the wider API; legacy renderer code that touches `window.nest` sees only `update()`. The two are not declaration-merged — they coexist.
3. **`SvgParserInstance` is incomplete here.** Eight methods are declared; the actual `SvgParser` class in `main/svgparser.js` exposes more (the renderer-side `main/ui/types/index.ts:288-302` lists 11). The two methods that [`main/deepnest.js:902,916`](../b/main__deepnest.js.md) calls — `transformParse` and `polygonifyPath` — are NOT declared on the root interface. This is silent because [`main/deepnest.js`](../b/main__deepnest.js.md) is `.js` and excluded from type-checking (per [`tsconfig.json`](./tsconfig.json.md) `allowJs: true` only matters when `include` matches the file, and `include` only globs `*.ts`). If anyone migrates `main/deepnest.js` → `.ts`, those calls would error until the root `SvgParserInstance` is widened or the renderer-side definition is made the canonical one.
4. **`getSync<K>` overload trickery.** The conditional type `K extends keyof DeepNestConfig ? DeepNestConfig[K] : DeepNestConfig` lets callers do both `getSync()` (returns full `DeepNestConfig`) and `getSync("scale")` (returns `number`). But: `getSync("useQuantityFromFileName")` (a UI-only key not in `DeepNestConfig`) compiles because TypeScript accepts the string literal as a `K` and resolves to the false branch — returning `DeepNestConfig` (the whole record), which is **wrong**. The runtime value is the boolean stored under that key. Every caller treats it as `boolean`. This works because [`main/deepnest.js:814`](../b/main__deepnest.js.md) is JS-untyped; if it migrates to TS, the type signature here needs widening to a union with the UI keys.
5. **`Window.loginWindow: Window | null` is unusual.** TypeScript's `Window` interface is normally treated as a singleton-ish global; storing another `Window` reference on it is rare. The shape is correct (an OAuth popup is genuinely a `Window`), but anyone reading the type without context might assume a typo for `BrowserWindow` (Electron's).
6. **`Polygon extends Array<PolygonPoint>` with extra props.** The interface form preserves declaration-merging compatibility but breaks `JSON.stringify` round-trips — the extra `id`, `source`, `children`, `parent`, `filename` properties are not enumerable on plain arrays. Code that does `JSON.parse(JSON.stringify(polygon))` will lose them silently. This is a known constraint that `main/deepnest.js` and `main/svgparser.js` work around by manually re-attaching props after deserialisation.
7. **`Part.svgelements: SVGElement[]`** holds live DOM nodes, not serialisable data. Like the polygon arrays, these don't survive structured-clone or JSON round-trips. They are local to the renderer and never cross IPC — the `background-start` payload (built in [`main/deepnest.js`](../b/main__deepnest.js.md)) sends only the polygon trees, not the SVG nodes.
8. **`DeepNestConfig.threads` is typed `number`** but the implementation in `main/deepnest.js` reads `config.threads` and may treat it as a worker count or as `0` for "auto." There is no `0 \| number` discriminator here; readers should not assume `>= 1`.
9. **JSDoc is the only documentation.** Every type and property has a `/** ... */` block (the file is heavy on JSDoc — about a third of the LOC). These render in IDE tooltips and the TS LSP. Keeping them in sync with the renderer-side mirror is a manual exercise.
10. **No `export {}` at the bottom.** The `declare global { ... }` block only requires the file to be a module if it has top-level `import` / `export` statements. Since this file has top-level `export type` declarations, it is automatically a module — `declare global` works. If someone refactors to remove all the `export`s, the `declare global` would silently become a *script*-level declaration and the augmentation would no longer scope correctly.

## 8. Known TODOs

No inline `// TODO` / `// FIXME` markers. Implicit debt:

- Add `transformParse` and `polygonifyPath` to `SvgParserInstance` so the type signature matches the runtime surface (see §7 Gotcha #3).
- Widen `ConfigObject.getSync<K>` to accept UI-only keys, or factor those into a separate interface (see §7 Gotcha #4).
- Decide whether `RactiveInstance` should be the generic or the minimal version (see §7 Gotcha #2). One source of truth is preferable.
- Consider whether `window.nest` and `window.loginWindow` should be removed — both have **producers but no readers** in the current source (see §3.4 / §3.5). Either delete the slots (and the assignments in [`main/ui/index.ts:629,803`](../c/main__ui__index.ts.md)) or document the historical readers if they're load-bearing for legacy templates.

## 9. Extension points

| To add… | Touch this file | Also touch |
|---|---|---|
| A new `DeepNestConfig` field (e.g. `gridSnap: boolean`) | Add to the type alias | [`main/ui/types/index.ts`](../c/main__ui__types__index.ts.md) `UIConfig` if it's UI-side; default constants in [`main/ui/services/config.service.ts`](../d/main__ui__services__config.service.md); persistence in [`main/notification-service.js`](../a/main__notification-service.js.md) (if it ever rides IPC) |
| A new method on `DeepNestInstance` | Add the signature here | The actual implementation in [`main/deepnest.js`](../b/main__deepnest.js.md); the renderer-side mirror in [`main/ui/types/index.ts`](../c/main__ui__types__index.ts.md) |
| A new global on `Window` (e.g. `window.exporter`) | Append to the `interface Window {}` block | The producer (assignment site, usually [`main/ui/index.ts`](../c/main__ui__index.ts.md) or [`main/index.html`](../g/main__index.html.md)); the readers |
| A new shape that crosses IPC | Define here as a `type` | Add the IPC channel name to [`main/ui/types/index.ts`](../c/main__ui__types__index.ts.md) `IPC_CHANNELS`; wire the handler in [`main.js`](../a/main.js.md) |
| Move `RactiveInstance` to a single source | Pick generic or minimal | Update both this file and [`main/ui/types/index.ts`](../c/main__ui__types__index.ts.md) — they currently coexist by accident |

## 10. Test coverage

| Site | What it asserts |
|---|---|
| [`tests/index.spec.ts:13`](../j/tests__index.spec.ts.md) | Imports `DeepNestConfig` and `NestingResult` — a compile-time test that the type entry exists at `../index` (i.e. resolves to `index.d.ts`). If the file is renamed or removed, this import breaks. |
| [`tests/index.spec.ts:87`](../j/tests__index.spec.ts.md) | `window.config.getSync()` — implicit assertion that `Window.config: ConfigObject` is honoured. The returned value is destructured against `Partial<DeepNestConfig>` at line 92. |
| [`tests/index.spec.ts:90`](../j/tests__index.spec.ts.md) | `window.DeepNest.config()` — implicit assertion that `Window.DeepNest: DeepNestInstance` is honoured. |
| [`tests/index.spec.ts:113-116`](../j/tests__index.spec.ts.md) | Asserts the engine's `DeepNestConfig` matches a known `sharedConfig` shape — exercises every numeric / boolean / enum field declared at lines 24–62 here. |
| [`tests/index.spec.ts:192`](../j/tests__index.spec.ts.md) | `window.DeepNest.nests` — the JSON snapshot is shaped against `NestingResult`. |

There is no test that asserts on the `Polygon`, `Part`, `Bounds`, `SheetPlacement`, `PolygonPoint`, `RactiveInstance`, `SvgParserInstance` shapes — those are exercised only via the renderer flow (their misuse would surface as runtime errors during nesting, not as failed type assertions).

## 11. Cross-references

- [`docs/deep-dive/c/main__ui__types__index.ts.md`](../c/main__ui__types__index.ts.md) — companion read. Re-imports `DeepNestConfig`, `NestingResult`, `PolygonPoint`, `Part`. Defines `ExtendedWindow`, `RactiveInstance<T>`, the richer `SvgParserInstance`, `IPC_CHANNELS`, `DEFAULT_CONVERSION_SERVER`, `UIConfig`, `PresetConfig`, `NestViewData`, `ThrottleOptions`.
- [`docs/deep-dive/c/main__ui__index.ts.md`](../c/main__ui__index.ts.md) — assigns `window.config` (line 594), `window.nest` (line 629), `window.loginWindow` (line 803). The composition root that activates this file's `Window` augmentation.
- [`docs/deep-dive/g/main__index.html.md`](../g/main__index.html.md) — assigns `window.SvgParser` (line 25) and `window.DeepNest` (line 27) via the inline boot script.
- [`docs/deep-dive/b/main__deepnest.js.md`](../b/main__deepnest.js.md) — the chief reader of `window.SvgParser` and the producer of `DeepNestInstance`.
- [`docs/deep-dive/b/main__svgparser.js.md`](../b/main__svgparser.js.md) — the implementation behind `SvgParserInstance`. Notably defines `transformParse` (line 946) and `polygonifyPath` (line 1460), neither of which the root `SvgParserInstance` declares.
- [`docs/deep-dive/d/main__ui__services__config.service.md`](../d/main__ui__services__config.service.md) — the implementation behind `ConfigObject` (assigned to `window.config`).
- [`docs/deep-dive/e/main__ui__components__nest-view.md`](../e/main__ui__components__nest-view.md), [`docs/deep-dive/e/main__ui__components__parts-view.md`](../e/main__ui__components__parts-view.md), [`docs/deep-dive/e/main__ui__components__sheet-dialog.md`](../e/main__ui__components__sheet-dialog.md) — renderer components that consume `DeepNestInstance` and `ConfigObject`.
- [`docs/deep-dive/j/tests__index.spec.ts.md`](../j/tests__index.spec.ts.md) — the only test that asserts directly on types from this file.
- [`tsconfig.json.md`](./tsconfig.json.md) — auto-discovers this file via root `.d.ts` rules.
- [`package.json.md`](./package.json.md) — references this file as `"types": "index.d.ts"` (line 7).
