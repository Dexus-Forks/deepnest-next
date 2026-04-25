# Deep dive — Group J: test suite

> **Issue**: [DEE-42](../../../) (replaces superseded DEE-21 / DEE-31) · **Parent**: [DEE-11](../../index.md) · **Author**: Paige · **Completed**: 2026-04-26
>
> Per-file deep dives for the Playwright test suite under `tests/`. Group J's write-up is the **source of truth** for "covered by `tests/index.spec.ts`" / "not covered" claims that appear in every other group's `Test coverage status` section.

## Files in this group

| Path | Role | Deep dive |
|---|---|---|
| `tests/index.spec.ts` | The single Playwright E2E spec. Boots Electron, drives Config → Import → Sheet → Nest → Export, attaches video / SVG / JSON / console artefacts. | [`tests__index.spec.ts.md`](./tests__index.spec.ts.md) |
| `tests/assets/` (2 SVGs: `henny-penny.svg`, `mrs-saint-delafield.svg`) | Static input fixtures consumed by the spec's `Upload files` step. Glyph-derived multi-subpath SVGs that exercise the SVG parser and produce `54/54` placements. | [`tests__assets.md`](./tests__assets.md) |

## File inventory verification

The on-disk inventory of `tests/assets/` was verified during this deep dive:

```
tests/
├── index.spec.ts            230 lines, single test "Nest"
└── assets/
    ├── henny-penny.svg          70 200 bytes, 1 <path>, 36 closed sub-paths
    └── mrs-saint-delafield.svg  26 281 bytes, 1 <path>, 44 closed sub-paths
```

No other files exist under `tests/`. No subdirectories beyond `assets/`.

## Scope corrections vs. DEE-42

| DEE-42 said | Reality | Resolved by |
|---|---|---|
| `tests/assets/*` "(inventory)" with verified contents `henny-penny.svg`, `mrs-saint-delafield.svg`. | Confirmed exact match. Both SVGs present, no extras, no missing. | Documented as a single inventory + usage doc at [`tests__assets.md`](./tests__assets.md) — same shape as Group G's `main__img.md` / `main__font.md` write-ups. |
| The spec is "the single Playwright E2E spec". | Confirmed — one `test("Nest", …)` plus a `test.afterAll`. No other `*.spec.ts` files anywhere in the repo. | Documented as such in [`tests__index.spec.ts.md`](./tests__index.spec.ts.md) §1. |

No discrepancies, no out-of-scope discoveries, no files re-named or moved.

## Test surface authority for sibling groups

When a deep dive in groups A–I says "covered by `tests/index.spec.ts`", they refer to the step map in [`tests__index.spec.ts.md` §4](./tests__index.spec.ts.md#4-step-by-step-map). The authoritative answer is:

| Surface area | Group | Covered? | Step in `index.spec.ts` |
|---|---|---|---|
| Electron app boot, BrowserWindow lifecycle | A — [`main.js`](../a/main.js.md) | ✅ Boot only (close path is implicit Playwright teardown) | `_electron.launch` ([:23](../../../tests/index.spec.ts)) |
| `notification-service.js` | A — [`main__notification-service.js`](../a/main__notification-service.js.md) | ❌ Not covered | — |
| Preset CRUD | A — [`presets.js`](../a/presets.js.md) | ❌ Not covered | — |
| Helper scripts | A — `helper_scripts/*.js` | ❌ Not covered (build / codegen tools) | — |
| `main/deepnest.js` GA loop | B | ✅ One iteration through `54/54` placements + stop | Steps 4 → 5 → 7 |
| `main/background.js` NFP renderer | B | ✅ Indirectly, through `background-progress` ticks until iteration 1 | Steps 4 → 5 |
| `main/svgparser.js` | B | ✅ Indirectly via `DeepNest.importsvg(svg)` for the two assets | Step 2 |
| `main/util/clipper.js`, `geometryutil.js`, `parallel.js`, `simplify.js` etc. | B | ✅ Transitively via the GA / NFP path | Steps 4 → 5 |
| `main/util/{interact, ractive, svgpanzoom, pathsegpolyfill}` | B | ⚠ Partially — Ractive runs (UI updates), interact/svgpanzoom not actively driven | — |
| `main/nfpDb.ts` | B | ✅ Indirectly via background NFP cache lookups | Steps 4 → 5 |
| `main/ui/index.ts` composition root | C | ✅ Implicitly — `window.config`, `window.DeepNest` are observed | Step 1d |
| `main/ui/types/index.ts` | C | ⚠ Type-only; runtime constants (`IPC_CHANNELS`, `DEFAULT_CONVERSION_SERVER`) are exercised via the URL rewrite assertion | Step 1d |
| `main/ui/services/config.service.ts` | D | ✅ Reset, change, persist, mm conversion all exercised | Steps 1, 1a–1d |
| `main/ui/services/preset.service.ts` | D | ❌ Not covered | — |
| `main/ui/services/import.service.ts` | D | ✅ SVG path only — DXF/DWG/EPS/PS not exercised | Step 2 |
| `main/ui/services/export.service.ts` | D | ✅ SVG export only — DXF/JSON not exercised | Step 6 |
| `main/ui/services/nesting.service.ts` | D | ✅ Start, stop, view switching all exercised | Steps 4 → 7 |
| `main/ui/components/navigation` | E | ✅ `#config_tab`, `#home_tab` clicked | Step 1 + Step 1d |
| `main/ui/components/parts-view` | E | ✅ `#importsnav li` count read | Step 2 |
| `main/ui/components/nest-view` | E | ✅ `#nestlist`, `#nestinfo`, `#progressbar` read | Step 5 |
| `main/ui/components/sheet-dialog` | E | ✅ Add-sheet flow exercised | Step 3 |
| `main/ui/utils/{conversion, dom-utils, ui-helpers}.ts` | F | ⚠ Indirectly via service calls | — |
| `main/index.html` (`data-config`, ids) | G | ✅ All clicked ids exercised; `data-config="units"`/`spacing`/`placementType` round-tripped | Steps 1–6 |
| `main/notification.html` | G | ❌ Not covered | — |
| `main/img/*` | G | ❌ Static; not test-bound | — |
| `main/font/*` | G | ❌ Static; not test-bound | — |
| `playwright.config.ts` | H | ✅ Trivially — the spec runs under it | Whole test |
| `index.d.ts` | H | ✅ Type-only; `DeepNestConfig` / `NestingResult` are imported and asserted against | Steps 1d, 6 |
| `tsconfig.json`, `eslint.config.mjs`, `package.json` | H | ⚠ Build / lint surfaces, not runtime-tested | — |
| Top-level docs / scripts | I | ❌ Static / build-time | — |

⚠ entries are "exercised by happenstance" — the GA loop or UI rendering touches the surface but no assertion locks behaviour.

## Per-doc structure

Each doc follows the [`DEE-11` shared template](../b/README.md#per-file-template) — the same eight-section structure as every other group's deep dives:

1. Purpose
2. Public surface
3. IPC / global side-effects
4. Dependencies (in / out)
5. Invariants & gotchas
6. Known TODOs
7. Extension points
8. Test coverage status

For the spec, sections 4 (the step-by-step map) and 5 (magic-number / asset-coupled constants) are the headline deliverables — the table at §4 is what every other group's "covered by `tests/index.spec.ts`" reference resolves to.

## Cross-references

- [`docs/deep-dive/h/playwright.config.ts.md`](../h/playwright.config.ts.md) — runner config; defines `metadata.pipeConsole` consumed by [`tests__index.spec.ts.md` §3](./tests__index.spec.ts.md#3-ipc--global-side-effects).
- [`docs/deep-dive/h/index.d.ts.md`](../h/index.d.ts.md) — `DeepNestConfig` and `NestingResult` types asserted against at [`tests/index.spec.ts:13`](../../../tests/index.spec.ts), `:105-116`, `:191`.
- [`docs/deep-dive/a/main.js.md`](../a/main.js.md) — `_electron.launch({ args: ["main.js"] })` target; the `read-config` URL rewrite asserted in step 1d lives there.
- [`docs/deep-dive/c/main__ui__index.ts.md`](../c/main__ui__index.ts.md) — composition root that publishes `window.config` / `window.DeepNest`, both read by the spec via `mainWindow.evaluate`.
- [`docs/deep-dive/d/`](../d/README.md) — all five renderer services exercised by the test, with the IPC channel summary the test implicitly covers.
- [`docs/deep-dive/e/`](../e/) — UI components that own every element id the spec clicks.
- [`docs/deep-dive/g/main__index.html.md`](../g/main__index.html.md) — element-id contract.
- [`docs/deep-dive/b/main__svgparser.js.md`](../b/main__svgparser.js.md) — subpath decomposition that converts the 36 + 44 closed paths in the assets into the asserted `54` placements.

## Acceptance criteria coverage

- ✅ Every file in scope has a complete write-up under `docs/deep-dive/j/<file>.md` per the template.
- ✅ `docs/deep-dive/j/README.md` (this file) exists and lists scope, file inventory, scope corrections, completion timestamp.
- ✅ The spec deep dive cites exact line numbers for every IPC handler, magic number, invariant, and dead-code marker.
- ✅ The asset deep dive lists every file by name with verified bytes, sub-path counts, and per-asset usage notes.
- ✅ All work is committed to `chore/dee-11-iso/group-j` with the `docs(deep-dive-j):` commit-message prefix.
- ✅ No edits outside `docs/deep-dive/j/`.
