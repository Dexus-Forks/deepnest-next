# Deep dive — Group F: UI utilities

> Per-file deep dives for the renderer-side utility helpers in
> `main/ui/utils/`. These are stateless leaf modules consumed by every
> Group E component and most Group D services. Sibling of [DEE-11](../../../) parent
> issue and [DEE-17](../../../) tracking issue.

## Files in this group

| File | Role | Deep dive |
|---|---|---|
| `main/ui/utils/dom-utils.ts` | Type-safe wrappers over the browser DOM API: selection, class manipulation, SVG element creation, transform/viewBox formatting. 30 exports; ~half are currently unused outside the module. | [main__ui__utils__dom-utils.ts.md](./main__ui__utils__dom-utils.ts.md) |
| `main/ui/utils/conversion.ts` | Unit/scale conversion helpers (`mm ↔ inch ↔ SVG units`) and dimension formatting. **Currently dead code** — no in-tree importers; logic is duplicated in `config.service.ts`, `sheet-dialog.ts`, `parts-view.ts`, and `index.ts`. | [main__ui__utils__conversion.ts.md](./main__ui__utils__conversion.ts.md) |
| `main/ui/utils/ui-helpers.ts` | Three unrelated helpers: `message()` (the renderer's only user-facing toast/error channel), `throttle()` (Underscore-style), `millisecondsToStr()` (humanized duration). | [main__ui__utils__ui-helpers.ts.md](./main__ui__utils__ui-helpers.ts.md) |

## How these files are loaded

All three files are TypeScript leaves. `tsc` (configured in
[`tsconfig.json`](../../../tsconfig.json)) compiles them into the
renderer module bundle (`build/ui/utils/*.js`); the renderer pulls them
in via the ESM graph rooted at
[`main/ui/index.ts`](../../../main/ui/index.ts).

None of the three files installs anything on `window`, opens an IPC
channel, or registers a global event handler at module load. They are
**pure helper modules**: every export is a stand-alone function (or
exported `const`), every function operates only on values passed in
through its arguments, and there is no shared state between calls.

This is intentional — the project's renderer architecture (see
[`docs/architecture.md`](../../architecture.md) §3) treats utilities as
leaves of the dependency graph so that any service or component can
consume them without circular-import risk.

## Dependencies (inbound to this group)

```
                +--- main/ui/index.ts (composition root)
                +--- main/ui/components/navigation.ts
dom-utils.ts ---+--- main/ui/components/parts-view.ts
                +--- main/ui/components/nest-view.ts
                +--- main/ui/components/sheet-dialog.ts

                +--- main/ui/index.ts            (message)
                +--- main/ui/services/export.service.ts   (message)
                +--- main/ui/services/import.service.ts   (message)
ui-helpers.ts --+--- main/ui/services/nesting.service.ts  (message)
                +--- main/ui/components/parts-view.ts     (throttle)
                +--- main/ui/components/nest-view.ts      (millisecondsToStr)

conversion.ts -- (zero importers — see "Dead code" below)
```

Verified with `rg --type ts "from\\s+['\"][^'\"]*<util-name>['\"]"`. The
`Used-by` table inside each per-file deep dive enumerates the exact
symbols pulled by each importer.

## Dependencies (outbound from this group)

| File | Imports |
|---|---|
| `dom-utils.ts` | None. Pure browser DOM API consumers (`Document`, `Element`, `SVGElement`, `XMLSerializer`, `window.getComputedStyle`). |
| `conversion.ts` | `UnitType` from `../types/index.js` (type-only). |
| `ui-helpers.ts` | `ThrottleOptions` from `../types/index.js` (type-only). |

The group has zero runtime dependencies on other modules in this
codebase. This is what makes them suitable as leaves and unit-testable
without any host environment beyond a JSDOM-ish DOM (which is why the
`message()` toast queries `#message`, `#messagewrapper`, and
`#messagecontent` defensively rather than asserting their existence).

## Dead code and duplication summary

The biggest cross-cutting finding in this group is **drift between the
helper modules and their actual consumers**:

| Module | Exports defined | Used in tree | Notes |
|---|---:|---:|---|
| `dom-utils.ts` | 30 | 13 | 17 unused: `documentReady`, `getElementById`, `createHtmlElement`, `removeAttribute` (helper variant — native is called directly 5×), `getDataAttribute`/`setDataAttribute`, `clearChildren`, `cloneSvgElement`/`cloneSvgElementDeep`, `setVisible`, `setStyle`/`setStyles`/`getComputedStyleValue`, `addListener`/`removeListener`/`preventEvent`, `setInnerText`, `createViewBox`. |
| `conversion.ts` | 12 functions + 1 const | 0 | Entire module is dead. The same math is duplicated in `config.service.ts:322-369`, `sheet-dialog.ts:54,175-185`, `parts-view.ts:230-246`, and `main/ui/index.ts:204,421-426`. The `INCHES_TO_MM = 25.4` constant is shadowed by a local `const` in `sheet-dialog.ts:54`. |
| `ui-helpers.ts` | 3 functions | 3 | All three exports have at least one consumer. `message()` is the heaviest (~30 call sites across services + `index.ts`); `throttle()` and `millisecondsToStr()` each have one call site. |

The follow-up triage (left for the parent epic, see DEE-17 closing
comment):

1. **Adopt `conversion.ts` as the single source of truth.** Replace the
   four duplicates so a future change to the conversion math doesn't
   silently drift between caller sites. Land in two PRs: first the
   `ConfigService` adoption (which is the canonical "current truth"),
   then the component / `index.ts` cleanup.
2. **Either prune the unused `dom-utils` exports or land their
   consumers.** Routing `index.ts`'s `getAttribute("data-config")` and
   `getAttribute("data-conversion")` reads through `getDataAttribute` is
   the most obvious low-risk consumer.

Neither follow-up is in scope for the deep-dive itself; they are doc
artifacts for the parent epic to triage.

## DOM contracts surfaced (Group G)

The deep dives in this group reference the following selectors / IDs in
[`main/index.html`](../../../main/index.html). Group G (DEE-19) owns the
HTML side of these contracts; the table is reproduced here so that
changes to the markup can be cross-referenced quickly:

| Surface | Selector(s) | Owner | Source |
|---|---|---|---|
| Toast wrapper | `#messagewrapper` | `ui-helpers.message()` | `main/index.html:115` |
| Toast root | `#message` | `ui-helpers.message()` | `main/index.html:116` |
| Toast content | `#messagecontent` | `ui-helpers.message()` | `main/index.html:118` |
| Unit-bearing inputs (read/write conversion) | `[data-config="spacing"]`, `[data-config="curveTolerance"]`, `[data-config="endpointTolerance"]`, `[data-config="exportWithSheetsSpaceValue"]` | `main/ui/index.ts:204,421` (open-coded; will be `conversion.ts:toSvgUnits/fromSvgUnits` when adopted) | `main/index.html:236, 250, 332, 396` (each marked `data-conversion="true"`) |
| Scale input | `#inputscale` | `main/ui/index.ts:411` (open-coded `setScaleFromUnits`) | `main/index.html:314-321` |

`dom-utils.ts` itself does not pin any selector — it is a pure helper
layer. Selectors only appear in the importing components and services.

## Per-file template

Each deep dive uses the `DEE-11` shared template (see
[group B README](../b/README.md#per-file-template) for the canonical
list):

1. **Purpose** — `Overview` paragraph
2. **Public surface** — `Public surface` table grouped by category, plus
   per-helper subsections
3. **IPC / global side-effects** — `Side effects` section. **Always
   `None.`** for this group; these utilities never touch IPC, network,
   or `globalThis`.
4. **Dependencies (in / out)** — `Used-by` (in) and the inbound /
   outbound tables in this README (out)
5. **Invariants & gotchas** — `Contributor checklist → Risks & gotchas`
6. **Known TODOs** — `Comments / TODOs in source`. None present in any
   of the 3 files at the time of this scan.
7. **Extension points** — none of the three modules has DI; extension is
   "add a new exported function" or "adopt this module from a new
   consumer". For `conversion.ts` the primary extension point today is
   adopting it from `config.service.ts`.
8. **Test coverage** — `Testing` section. None of these utilities have a
   dedicated unit test in the repo (the project's testing model is
   Playwright E2E, per `architecture.md` §6); each is exercised
   indirectly via the importer's E2E coverage.

## Acceptance criteria coverage

For each of the 3 files in scope, the corresponding doc covers:

- ✅ Purpose, public API, and per-export contract
- ✅ Used-by table anchored on every in-tree importer (verified with
  `rg`)
- ✅ Side-effect surface (always `None.` at module load; per-function
  effects documented inline)
- ✅ DOM / HTML / `data-conversion` contracts cross-referenced to
  `main/index.html` (Group G) where applicable
- ✅ Dead-code and duplication findings (most prominent for
  `conversion.ts`, also surfaced for `dom-utils.ts`)
- ✅ Risks, gotchas, and pre-PR verification steps
- ✅ Cross-references to sibling deep-dive docs (Group D services,
  Group E components, Group G HTML)
