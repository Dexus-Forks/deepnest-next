# Deep dive — Group J: deep-dive tests

> Per-file deep dives for everything under `tests/`. Currently this is
> the single Playwright Electron E2E spec and its two SVG fixtures.
> Sibling of [DEE-11](../../../) parent issue and tracked as
> [DEE-21](../../../).

This group is the **source of truth** for the "Test coverage" section
of every other group's deep-dive. When another doc says "covered by
`tests/index.spec.ts`", it is referencing the test surface enumerated
in [tests__index.spec.ts.md](./tests__index.spec.ts.md). When it
says "not covered", it means that path is not exercised by the single
test described here.

## Files in this group

| File | Role | Deep dive |
|---|---|---|
| `tests/index.spec.ts` | The single Playwright Electron E2E spec. Drives the Electron app through the import → configure → add-sheet → start-nest → export → stop happy path and asserts on `window.config`, `window.DeepNest`, `#importsnav`, `#progressbar`, `#nestlist`, `#nestinfo`. | [tests__index.spec.ts.md](./tests__index.spec.ts.md) |
| `tests/assets/*.svg` | Two SVG fixtures (`henny-penny.svg`, `mrs-saint-delafield.svg`) consumed by the `Upload files` step. Together they produce 54 polygon-tree parts after parse. | [tests__assets.md](./tests__assets.md) |

## How the spec is loaded

[`playwright.config.ts`](../../../playwright.config.ts) sets:

- `testDir: "./tests"` — Playwright globs `**/*.spec.ts` under this
  directory.
- `projects: [{ name: "chromium", use: { ...devices["Desktop Chrome"] } }]`
  — single project. Playwright still uses the chromium driver to
  speak to the Electron renderer (via `_electron.launch`).
- `use: { headless: false, video: process.env.CI ? "retain-on-failure" : "on", screenshot: "on", trace: "on-first-retry" }`
  — the test cannot run headless because Electron's `main.js` opens
  visible windows.
- `metadata: { pipeConsole: !process.env.CI }` — read by
  `tests/index.spec.ts:18` to decide whether to pipe renderer console
  messages to disk for the report.
- `retries: process.env.CI ? 2 : 0`, `workers: process.env.CI ? 1 : undefined`,
  `forbidOnly: !!process.env.CI` — standard CI-vs-local toggles.
- `reporter: [["html", { open: process.env.CI ? "never" : "on-failure" }], [process.env.CI ? "github" : "list"]]`
  — HTML always, plus `github` annotations on CI / pretty `list`
  output locally.
- `snapshotPathTemplate: "{testDir}/{testFilePath}-snapshots/{arg}{ext}"`
  — there are no committed snapshots; this is in place for a future
  visual baseline (the spec has a commented-out
  `toHaveScreenshot("loaded.png", ...)`).

There is no `webServer`, no global setup / teardown, no project
dependencies. The spec self-contains everything it needs.

## Dependencies (inbound to this group)

```
                 +-- Playwright runner ---> tests/index.spec.ts
                 |
playwright.config.ts -- testDir: "./tests"
                 |
                 +-- testInfo.outputDir / outputPath / attach
                              |
                              v
                 tests/index.spec.ts -+-> _electron.launch(args:["main.js"])
                                      |
                                      +-> dialog.showOpenDialog (stubbed) ->
                                      |       reads tests/assets/*.svg
                                      |
                                      +-> dialog.showSaveDialogSync (stubbed) ->
                                              writes testInfo.outputDir/output.svg
```

`tests/index.spec.ts` consumes the rest of the codebase **only**
through:

- The Electron entry [`main.js`](../../../main.js) (passed as `args`
  to `electron.launch`).
- The renderer DOM rendered from
  [`main/index.html`](../../../main/index.html).
- The renderer globals `window.config` (from
  [`main/ui/services/config.service.ts`](../../../main/ui/services/config.service.ts))
  and `window.DeepNest` (from
  [`main/deepnest.js`](../../../main/deepnest.js)).
- Type-only imports from [`index.d.ts`](../../../index.d.ts)
  (`DeepNestConfig`, `NestingResult`).

Nothing in the rest of the codebase imports `tests/`.

## Dependencies (outbound from this group)

| File | Imports |
|---|---|
| `tests/index.spec.ts` | `@playwright/test` (`ConsoleMessage`, `_electron as electron`, `expect`, `test`); `electron` (type-only `OpenDialogReturnValue`); `node:fs` (`existsSync`), `node:fs/promises` (`appendFile`, `mkdir`, `readdir`, `readFile`); `node:url` (`fileURLToPath`); `node:path`; type-only `DeepNestConfig`, `NestingResult` from `../index`. |
| `tests/assets/*.svg` | _none_ — static fixture files. |

The spec deliberately does **not** import any code from `main/`. All
interaction goes through the Electron app surface (DOM, IPC,
`window` globals) — keeping the test honest about what a black-box
external observer can see.

## Selectors used by the spec

This is the cheat-sheet for "if I rename a DOM id, will the E2E test
fail?". Every selector below is read by
[`tests/index.spec.ts`](../../../tests/index.spec.ts) and must match
its definition site.

| Selector | Defined in | Owner |
|---|---|---|
| `#config_tab`, `#home_tab` | [`main/index.html:124-125`](../../../main/index.html) | navigation component |
| `#config a:has-text("set all to default")` (`#setdefault`) | [`main/index.html:504`](../../../main/index.html) | reset-to-defaults handler in `main/ui/index.ts` |
| `#config input[type=radio]:nth(1)` (mm) | [`main/index.html:225`](../../../main/index.html) | `data-config="units"` form binding |
| `#config input[type=number]:first` (spacing) | [`main/index.html:231-239`](../../../main/index.html) | `data-config="spacing"` form binding |
| `#config select[name="placementType"]` | [`main/index.html:272`](../../../main/index.html) | `data-config="placementType"` form binding |
| `#import` | [`main/index.html:136`](../../../main/index.html) | `ImportService` button handler |
| `#importsnav li` | [`main/index.html:185-192`](../../../main/index.html) | parts-view Ractive `{{#each imports}}` |
| `#addsheet`, `#sheetwidth`, `#sheetheight`, `#confirmsheet` | [`main/index.html:167-176`](../../../main/index.html) | `sheet-dialog` component |
| `#startnest`, `#stopnest` | [`main/index.html:37, 137`](../../../main/index.html) | `NestingService` button handlers |
| `#progressbar` | [`main/index.html:87`](../../../main/index.html) | `initializeBackgroundProgress()` in `main/ui/index.ts` |
| `#nestlist span` | [`main/index.html:100-110`](../../../main/index.html) | nest-view Ractive `{{#each nests}}` |
| `#nestinfo h1` | [`main/index.html:94-99`](../../../main/index.html) | nest-view Ractive (`getPartsPlaced()` etc., see [`main/ui/components/nest-view.ts:387-414`](../../../main/ui/components/nest-view.ts)) |
| `#export`, `#exportsvg` | [`main/index.html:41`](../../../main/index.html) | `ExportService` |

If you rename any of these, search this file plus
[tests__index.spec.ts.md](./tests__index.spec.ts.md) for the literal
selector string.

## Per-file template

Each deep dive uses the `DEE-11` shared template (see
[group B README](../b/README.md#per-file-template) for the canonical
list):

1. **Purpose** — opening paragraph
2. **Public surface** — for the spec, the public surface is the
   selectors / globals it reads from the renderer (see "Public
   surface" table in [tests__index.spec.ts.md](./tests__index.spec.ts.md));
   for the assets, the SVG envelope.
3. **IPC / global side-effects** — the spec mutates the Electron
   main-process globals `dialog.showOpenDialog` and
   `dialog.showSaveDialogSync` via `electronApp.evaluate(...)`.
4. **Dependencies (in / out)** — covered in the inbound / outbound
   tables above.
5. **Invariants & gotchas** — covered per-file. The big ones: the
   `54/54` literal is asset-derived; `mkdir(outputDir, { recursive: true })`
   under an `existsSync` guard is a no-op cleanup candidate; the
   `Stop nesting` button-text round-trip can flake under slow CI.
6. **Known TODOs** — `tests/index.spec.ts:15` and `:143-145` carry
   commented-out hints (`slowMo`, `toHaveScreenshot`); no `// FIXME` /
   `// HACK` markers.
7. **Extension points** — adding `*.spec.ts` files under `tests/` is
   the supported extension surface; new fixtures dropped in
   `tests/assets/` are auto-discovered (see "Why the assets live
   under `tests/assets/`" in
   [tests__assets.md](./tests__assets.md#why-the-assets-live-under-testsassets)).
8. **Test coverage** — this group **is** the coverage source of
   truth. See the "What this spec implicitly tests in the rest of
   the codebase" table in
   [tests__index.spec.ts.md](./tests__index.spec.ts.md).

## Coverage source of truth

For convenience, the canonical "covered vs. not covered by
`tests/index.spec.ts`" mapping that other groups reference:

| Module / area | Covered by `tests/index.spec.ts`? |
|---|---|
| `main/ui/services/config.service.ts` | **yes** (read at boot, defaults reset, mm/inch round-trip via `spacing`) |
| `main/ui/services/import.service.ts` | **partial** — SVG path only; conversion-server (DXF/DWG/EPS/PS) untested; `loadInitialFiles` untested |
| `main/ui/services/export.service.ts` | **partial** — `#exportsvg` only; `#exportdxf`, `#exportjson` untested |
| `main/ui/services/nesting.service.ts` | **yes** for `startNesting()` / `stopNesting()`; `goBack()` untested |
| `main/ui/services/preset.service.ts` | **no** |
| `main/ui/components/parts-view.ts` | indirectly (parts are imported, not asserted) |
| `main/ui/components/nest-view.ts` | **yes** (`getPartsPlaced()` / sheets-used computation asserted via `#nestinfo h1`) |
| `main/ui/components/sheet-dialog.ts` | **yes** (`#addsheet` flow) |
| `main/ui/components/navigation.ts` | **yes** (tab switching) |
| `main/deepnest.js` | **yes** (config / start / nests round-trip) |
| `main/background.js` | **yes** smoke (first iteration arrives) |
| `main/svgparser.js` | **yes** (54-part assertion is the only acceptance signal) |
| `main/util/clipper.js`, `geometryutil.js`, `HullPolygon.ts`, `matrix.ts`, `vector.ts`, `point.ts` | indirectly (via the GA loop) |
| `main.js` IPC handlers | **yes** (`read-config`, `write-config`, `background-*`, `setPlacements`) |
| `presets.js` | **no** |
| `notification-service.js` | **no** |
| Auth0 / `access_token` / `id_token` | **no** |

Anywhere this table says "no" or "partial", the corresponding deep
dive's `Test surface` section should reflect the same.

## Acceptance criteria coverage

For both files in scope (`tests/index.spec.ts` and `tests/assets/*`),
the corresponding doc covers:

- ✅ Purpose, role, and how the file is loaded
- ✅ Public / observable surface (DOM selectors and renderer globals
  for the spec; SVG envelope for the assets)
- ✅ IPC / global side-effects (`dialog.*` stubs)
- ✅ In/out dependencies
- ✅ Invariants and gotchas
- ✅ Known TODOs (or explicit "none")
- ✅ Extension points
- ✅ Test coverage status (this group **is** the coverage source of
  truth)
- ✅ Cross-references to sibling deep-dive docs (Group D for
  services, Group B for `main/deepnest.js` / `main/svgparser.js` /
  utilities, Group C for `main/ui/index.ts` / types)
