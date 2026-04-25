# Deep Dive — `tests/index.spec.ts`

> **Group**: J (test suite) · **Issue**: [DEE-42](../../../) · **Parent**: [DEE-11](../../index.md) · **Author**: Paige · **Generated**: 2026-04-26
>
> Per-file deep dive following the [DEE-11 shared template](../b/README.md#per-file-template). Companion file in this group: [`tests__assets.md`](./tests__assets.md). Configured by [`playwright.config.ts`](../h/playwright.config.ts.md).

| Field | Value |
|---|---|
| Path | [`tests/index.spec.ts`](../../../tests/index.spec.ts) |
| Lines | 230 |
| Format | Playwright TypeScript spec (ESM-style imports, CommonJS interop) |
| Driven by | `npm test` → `playwright test` (auto-discovered from `testDir: "./tests"`) |
| Test count | 1 (`test("Nest", …)`) plus a `test.afterAll` hook |
| Browser project | `chromium` only — Electron's bundled Chromium, headed |

---

## 1. Purpose

The single end-to-end smoke test for the visible Electron app. Boots Electron via `_electron.launch({ args: ["main.js"] })`, drives the renderer through the **full happy-path nesting flow** — config form, file import, sheet creation, GA placement, SVG export — and attaches every artefact (output SVG, raw nest result JSON, console dump, video, screenshots) to the Playwright report. It is the **only** Playwright spec in the project; every other group's deep dive that says "covered by `tests/index.spec.ts`" means a step in this file exercises that surface.

The test does not assert nesting *quality* — only that the GA reaches at least one iteration and that placement progress reads `"54/54"` for the two seeded SVG glyphs (see [`tests__assets.md`](./tests__assets.md)). Quality regressions slip through; integration regressions do not.

---

## 2. Public surface

The file has no module exports — Playwright discovers it by directory and registers the `test()` calls.

| Symbol (line) | Kind | Notes |
|---|---|---|
| `test("Nest", async ({}, testInfo) => { … })` ([:17](../../../tests/index.spec.ts)) | Playwright test | Empty fixture object pattern; the file-top ESLint override at `:1` allows this idiom. |
| `test.afterAll(async ({}, testInfo) => { … })` ([:221](../../../tests/index.spec.ts)) | Playwright hook | Attaches every file under `testInfo.outputDir` to the report regardless of pass/fail. |
| Inline `test.step(...)` calls | Step builders | See [§4 step map](#4-step-by-step-map) for the table. |
| Local helpers `stopNesting` ([:148](../../../tests/index.spec.ts)), `downloadSvg` ([:155](../../../tests/index.spec.ts)), `waitForIteration` ([:167](../../../tests/index.spec.ts)) | Closures | Each wraps its body in a `test.step`. |

**Configuration / environment contract**:

| Surface | Source | Effect |
|---|---|---|
| `testInfo.config.metadata.pipeConsole` | `playwright.config.ts metadata` ([config :44](../../../playwright.config.ts)) → `!process.env.CI` | When `true`, registers `mainWindow.on("console", ...)` listeners and writes a per-message JSON record to `console.txt`. |
| `testInfo.outputDir` | Playwright per-test temp dir | Holds video (`recordVideo`), `console.txt` (if pipe enabled), and any `testInfo.outputPath(...)` files (currently `output.svg`). |
| `testInfo.outputPath("console.txt")` ([:30](../../../tests/index.spec.ts)) | Computed | Console JSONL accumulator. |
| `testInfo.outputPath("output.svg")` ([:157](../../../tests/index.spec.ts)) | Computed | Target file for the export step's monkeypatched `showSaveDialogSync`. |
| `process.env.CI` | OS env | Only referenced indirectly via the commented-out `slowMo` line `:15` and through `metadata.pipeConsole`. The spec body itself does not branch on `CI`. |

---

## 3. IPC / global side-effects

The spec is a renderer-driver — every "side effect" is a deliberate hook into Electron / Playwright surfaces:

| Mechanism | Site | Direction | Purpose |
|---|---|---|---|
| `_electron.launch({ args: ["main.js"], recordVideo: { dir: testInfo.outputDir } })` ([:23](../../../tests/index.spec.ts)) | spec → main process | Spawn the app under test. The `args` array passes `main.js` as the entry; `recordVideo` makes Playwright capture every BrowserWindow video into the per-test outputDir. See [`docs/deep-dive/a/main.js.md`](../a/main.js.md). |
| `electronApp.firstWindow()` ([:28](../../../tests/index.spec.ts)) | spec → main → first BrowserWindow | Returns the visible renderer; the rest of the spec drives it as `mainWindow`. There are also up to four **background** BrowserWindows created by `main.js` for the GA workers — the test never touches them but they spawn during `#startnest`. |
| `mainWindow.on("console", logMessage)` and `electronApp.on("window", win => win.on("console", logMessage))` ([:66-67](../../../tests/index.spec.ts)) | renderer → spec | Captures console messages from the main window **and every subsequent window** (i.e. background workers) when `pipeConsole` is on. `logMessage` flattens the message via `message.args().map(x => x.jsonValue())` and appends to `console.txt`. |
| `mainWindow.evaluate(() => window.config.getSync())` ([:86-87](../../../tests/index.spec.ts)) | spec → renderer (eval in page) | Reads the live `ConfigService` snapshot — works because [`main.js`](../a/main.js.md) sets `nodeIntegration: true` + `contextIsolation: false`, which exposes `window.config` (assigned by [`main/ui/index.ts`](../c/main__ui__index.ts.md)) to evaluate. See [`docs/deep-dive/d/main__ui__services__config.service.md`](../d/main__ui__services__config.service.md). |
| `mainWindow.evaluate(() => window.DeepNest.config())` ([:89-91](../../../tests/index.spec.ts)) | spec → renderer | Reads the GA-side config copy. Source: [`docs/deep-dive/b/main__deepnest.js.md`](../b/main__deepnest.js.md) — `DeepNest.config()` returns a superset that adds `clipperScale: 10000000`. |
| `mainWindow.evaluate(() => window.DeepNest.nests)` ([:191-192](../../../tests/index.spec.ts)) | spec → renderer | Pulls the structured `NestingResult[]` (typed in [`index.d.ts`](../h/index.d.ts.md)) for the JSON attachment. |
| `electronApp.evaluate(({ dialog }, paths) => { dialog.showOpenDialog = … }, files)` ([:125-130](../../../tests/index.spec.ts)) | spec → main process | **Monkeypatches** the Electron `dialog` so the renderer-side `#import` button receives the two SVG paths without a real file picker. Note: the file-open dialog is the **async** variant (`showOpenDialog`, returns a `Promise<OpenDialogReturnValue>`) — used by [`main/ui/services/import.service.ts`](../d/main__ui__services__import.service.md). |
| `electronApp.evaluate(({ dialog }, path) => { dialog.showSaveDialogSync = () => path; }, file)` ([:158-160](../../../tests/index.spec.ts)) | spec → main process | Monkeypatches the **sync** save dialog used by [`main/ui/services/export.service.ts`](../d/main__ui__services__export.service.md). The promise from `evaluate` is **not awaited** — see §6. |
| `appendFile(consoleDump, …, ",\n\n")` ([:47-60](../../../tests/index.spec.ts)) | spec → fs | Writes a comma-and-blank-line-separated stream of pretty-printed JSON records. The `afterAll` re-parses by splitting on `",\n\n"` and `JSON.parse`-ing each chunk. |
| `testInfo.attach("nesting.svg" / "nesting.json" / "console.json", …)` ([:194-214](../../../tests/index.spec.ts)) | spec → Playwright report | Three primary report attachments. The `console.json` attachment is conditional on `existsSync(consoleDump)` — i.e. only when `pipeConsole` was enabled. |
| `mkdir(testInfo.outputDir, { recursive: true })` ([:20](../../../tests/index.spec.ts)) | spec → fs | **Inverted condition** (see §6). Even if the path were correct, this `mkdir` is **not awaited** — fire-and-forget. |

The renderer-side IPC the spec implicitly exercises (via clicks and dialog mocks) covers: `read-config`, `write-config`, `background-start`, `background-progress`, `background-response`, `background-stop`, `setPlacements` — everything documented in [Group D's IPC channel summary](../d/README.md#ipc-channel-summary).

---

## 4. Step-by-step map

Single test, called `Nest`. The table below is the source of truth for what every other group's deep dive means by "covered by `tests/index.spec.ts`":

| # | Step name (line) | Preconditions | Actions | Assertions | Surface exercised | Flake risk |
|---|---|---|---|---|---|---|
| 0 | `Pipe browser console logs` ([:32](../../../tests/index.spec.ts)) | `metadata.pipeConsole === true` (i.e. local, not CI). | Registers `console` listeners on `mainWindow` and on every later window; appends each message as JSON to `console.txt`. | None — pure data capture. | Renderer / background-window console output. | None — write-only. `appendFile` failures swallowed because logs are best-effort. |
| 1 | `Config` parent ([:72](../../../tests/index.spec.ts)) | `mainWindow` ready. | Click `#config_tab` → click "set all to default" link inside `#config`. | Config tab opens; reset link is present. | [`main/index.html`](../g/main__index.html.md) (`#config_tab`, `#config`); [`main/ui/components/navigation.md`](../e/main__ui__components__navigation.md); [`config.service.md`](../d/main__ui__services__config.service.md) reset path. | Low. The `set all to default` link uses `getByRole("link", { name: "set all to default" })` — text-based, fragile to copy changes. |
| 1a | `units mm` ([:76-77](../../../tests/index.spec.ts)) | Inside `Config`. | `configTab.getByRole("radio").nth(1).check()`. | Radio at index 1 is now checked. | `data-config="units"` radio group in [`main/index.html`](../g/main__index.html.md). | **Medium** — index-based selector. Adding a radio above it (or reordering) silently breaks the test by selecting the wrong unit. |
| 1b | `spacing 10mm` ([:78-81](../../../tests/index.spec.ts)) | `units` already set to mm. | `getByRole("spinbutton").first().fill("10")` then `.blur()`. | None inline — implicit through later `expect(config).toMatchObject({ spacing: 28.34645669291339, … })`. | `data-config="spacing"` spinbutton; `change` handler in [`main/ui/index.ts`](../c/main__ui__index.ts.md) (`initializeConfigForm`); mm→inches conversion in [`config.service.md`](../d/main__ui__services__config.service.md). | **Medium** — index-based selector (`first()`); same fragility as 1a. The `.blur()` is required because `change` only fires on blur for `<input type="number">`. |
| 1c | `placement type gravity` ([:82-85](../../../tests/index.spec.ts)) | Inside `Config`. | `<select name="placementType">` → option `"gravity"`. | None inline — implicit through `placementType: "gravity"` in `toMatchObject`. | `data-config="placementType"` `<select>` in [`main/index.html`](../g/main__index.html.md). | Low — selector keys on `name` attribute, stable. |
| 1d | (anonymous, after 1a–1c) ([:86-117](../../../tests/index.spec.ts)) | All three writes complete. | Two `evaluate()` calls reading `window.config.getSync()` and `window.DeepNest.config()`; click `#home_tab`. | `expect(config).toMatchObject({ …sharedConfig, conversionServer: "https://converter.deepnest.app/convert", dxfExportScale: 1, dxfImportScale: 1, endpointTolerance: 0.36, units: "mm" })`. `expect(deepNestConfig).toMatchObject({ …sharedConfig, clipperScale: 10000000 })`. | Asserts the legacy URL rewrite and the field-by-field defaults documented in [`config.service.md`](../d/main__ui__services__config.service.md). | Low. **But**: any defaults change (e.g. bumping `endpointTolerance` from `0.36`) needs this assertion updated in lockstep. |
| 2 | `Upload files` ([:120-133](../../../tests/index.spec.ts)) | On home tab. | Read `tests/assets/*.svg` via `node:fs/promises.readdir`; monkeypatch `dialog.showOpenDialog` to return them; click `#import`. | `expect(mainWindow.locator("#importsnav li")).toHaveCount(2)`. | [`main/ui/services/import.service.ts`](../d/main__ui__services__import.service.md) SVG path; [`main/ui/components/parts-view.md`](../e/main__ui__components__parts-view.md) (`#importsnav`). | Low if assets count stays at 2. **High** if a third asset is added — the literal `2` would have to be updated. |
| 3 | `Add sheet` ([:135-141](../../../tests/index.spec.ts)) | Files imported. | Click `#addsheet`; fill `#sheetwidth=300`, `#sheetheight=200`; click `#confirmsheet`. | None inline. | [`main/ui/components/sheet-dialog.md`](../e/main__ui__components__sheet-dialog.md). | Low. Sheet dimensions are implicit constants in the test. |
| 4 | (no step wrapper) ([:146](../../../tests/index.spec.ts)) | One sheet present, two parts imported. | Click `#startnest`. | None inline. | [`main/ui/services/nesting.service.md`](../d/main__ui__services__nesting.service.md) → [`main/deepnest.js`](../b/main__deepnest.js.md) `DeepNest.start()` → [`main/background.js`](../b/main__background.js.md). | None at click-time. |
| 5 | (no step wrapper) ([:178-187](../../../tests/index.spec.ts)) | GA running. | `expect(#progressbar).toBeVisible()`; `waitForIteration(1)`; `expect(nestinfo h1[0]).toHaveText("1")`; `expect(nestinfo h1[1]).toHaveText("54/54")` wrapped in `toPass()`. | Iteration 1 reached and 54 of 54 placements completed. | `#progressbar`, `#nestlist`, `#nestinfo` rendered by [`main/ui/components/nest-view.md`](../e/main__ui__components__nest-view.md). | **High** for the `54/54` — the count is asset-derived (see [`tests__assets.md`](./tests__assets.md)). Editing either SVG, the spacing, the sheet size, or the GA defaults can flip the placement count. The `toPass()` retry hides timing flake but not count drift. |
| 6 | `Attachments` ([:189-216](../../../tests/index.spec.ts)) | At least one iteration done. | Call `downloadSvg()` helper; read `window.DeepNest.nests`; attach `nesting.svg`, `nesting.json`, and conditionally `console.json`. | `downloadSvg` asserts `#exportsvg` visible. | [`main/ui/services/export.service.md`](../d/main__ui__services__export.service.md); [`main/index.html`](../g/main__index.html.md) (`#export`, `#exportsvg`). | Medium. The unawaited `electronApp.evaluate(...)` in `downloadSvg` (`:158-160`) races the click — see §6. |
| 7 | `Stop nesting` ([:148-153](../../../tests/index.spec.ts), called at `:218`) | GA running and iteration captured. | Click `#stopnest`; wait for the same button to read `"Start nest"`. | Button label flips. | [`nesting.service.md`](../d/main__ui__services__nesting.service.md) `stopNesting`; `background-stop` IPC in [`main.js`](../a/main.js.md). | Low — `toPass` retries. |
| 8 | `test.afterAll` ([:221-230](../../../tests/index.spec.ts)) | Test concluded. | `readdir(outputDir)` → attach every file by path. | None. | Captures the Playwright video file written by `recordVideo`, plus `console.txt` and `output.svg`. | Low. Files added by `testInfo.attach(name, { body })` may already be in the report; this re-attaches the on-disk twin by path. |

`testInfo.config.metadata.pipeConsole` is the only branch in the spec body. Every other branch (`process.env.CI`-driven) lives in [`playwright.config.ts`](../h/playwright.config.ts.md).

---

## 5. Magic numbers and asset-coupled constants

The spec encodes several numbers that link the test to the seeded fixtures or the default config. Any change to these requires a paired update:

| Constant | Where | Derivation / coupling |
|---|---|---|
| `28.34645669291339` ([:101](../../../tests/index.spec.ts)) | `sharedConfig.spacing` | `10 mm × (72 / 25.4)` — converts the user-typed `10` to internal SVG units. Must change in lockstep with `scale` (default `72`) or the unit conversion in [`config.service.md`](../d/main__ui__services__config.service.md) (`setSync` for `spacing` when `units === "mm"`). |
| `0.72` ([:96](../../../tests/index.spec.ts)) | `sharedConfig.curveTolerance` | `DEFAULT_CONFIG.curveTolerance` from [`config.service.md`](../d/main__ui__services__config.service.md). |
| `4` (`rotations`, `threads`) ([:98, :102](../../../tests/index.spec.ts)) | `sharedConfig` | Both default; `threads: 4` also drives the number of background BrowserWindows started by `main.js`. |
| `10` (`mutationRate`, `populationSize`) ([:97, :99](../../../tests/index.spec.ts)) | `sharedConfig` | GA defaults. |
| `72` ([:100](../../../tests/index.spec.ts)) | `sharedConfig.scale` | DEFAULT scale; the `28.34645…` derivation depends on it. |
| `0.5` ([:103](../../../tests/index.spec.ts)) | `sharedConfig.timeRatio` | Default. |
| `https://converter.deepnest.app/convert` ([:107](../../../tests/index.spec.ts)) | `conversionServer` assertion | Asserts the legacy `convert.deepnest.io` → `converter.deepnest.app/convert` rewrite performed by `ipcMain.handle("read-config")` in [`main.js`](../a/main.js.md). |
| `0.36` ([:110](../../../tests/index.spec.ts)) | `endpointTolerance` | Default. |
| `10000000` ([:115](../../../tests/index.spec.ts)) | `clipperScale` | Default; only present in the `DeepNest.config()` shape, not in the persisted UI config. |
| `(width: 300, height: 200)` ([:136](../../../tests/index.spec.ts)) | Sheet dimensions | Arbitrary mm dimensions. The combined glyph parts must fit inside this sheet to make `54/54` placements achievable. |
| `2` ([:132](../../../tests/index.spec.ts)) | `#importsnav li` count | 1 per imported SVG file → equal to `tests/assets/*.svg` file count. |
| `54/54` ([:185-186](../../../tests/index.spec.ts)) | `#nestinfo h1[1]` text | Total polygon parts produced by importing `henny-penny.svg` + `mrs-saint-delafield.svg` (asset glyphs decompose into `54` distinct nest-able sub-polygons combined). See [`tests__assets.md`](./tests__assets.md) for the per-file breakdown. |

---

## 6. Invariants & gotchas

1. **Inverted `mkdir` guard** ([:19-21](../../../tests/index.spec.ts)) — `if (existsSync(testInfo.outputDir)) { mkdir(testInfo.outputDir, { recursive: true }); }` only `mkdir`s when the directory **already exists**. Likely a bug — the intended guard was the negation. Today this is harmless because Playwright pre-creates `testInfo.outputDir` before the test body runs, but the line is misleading.
2. **`mkdir` is not awaited** ([:20](../../../tests/index.spec.ts)) — fire-and-forget Promise. If the directory ever did need to be created here, later `appendFile` calls could race the create.
3. **`electronApp.evaluate(...)` for the save dialog mock is not awaited** ([:158-160](../../../tests/index.spec.ts)) — the mock injection races the very next line's `await mainWindow.click("id=export")`. In practice the click dispatches event-loop work that the eval likely wins, but this is timing-dependent. **Flake hazard** if the export click ever shrinks its async chain.
4. **Empty fixture pattern** ([:17, :221](../../../tests/index.spec.ts)) — `async ({}, testInfo) => …` violates `no-empty-pattern` by default; the file's first line `/*eslint no-empty-pattern: ["error", { "allowObjectPatternsAsParameters": true }]*/` is required and must stay or ESLint will fail the file.
5. **Console pipe is asymmetric** ([:32-71](../../../tests/index.spec.ts)) — inside the `Pipe browser console logs` step, the listener wiring is performed but the step itself is **not awaited** in the parent body. The listener registrations execute synchronously in the step body, so this works, but the lack of `await test.step(...)` is unusual and means the step is "orphan" in the trace.
6. **`pipeConsole` defaults `true` locally** — every local run accumulates a `console.txt` per test; they live under Playwright's `test-results/` and are attached as `console.json`. CI runs (`pipeConsole: false`) skip the listener wiring entirely — locally-only flake hidden by the CI matrix is therefore not impossible.
7. **The legacy URL rewrite assertion is one-way** ([:107](../../../tests/index.spec.ts)) — the test passes regardless of whether `settings.json` previously contained the legacy URL or the new one. It only documents the *expected* shape.
8. **No `electronApp.close()`** — Playwright tears down the spawned Electron at test end via the launch handle, but there is no explicit `await electronApp.close()`. If the GA loop is still running at `Stop nesting`, background BrowserWindows linger until Playwright kills the process tree.
9. **`fileURLToPath` swallow** ([:41-46](../../../tests/index.spec.ts)) — wraps the conversion in a try/catch with `// ignore`. Console messages whose `url` is not a `file://` URL fall back to the raw URL string. Required because Chromium reports renderer-process URLs (e.g. `devtools://`, blob URLs) that `fileURLToPath` rejects.
10. **`fullyParallel: true` × single test** — set in [`playwright.config.ts`](../h/playwright.config.ts.md). The flag is forward-looking; today there is one test, so no parallelism happens. Adding a second test would spawn a second Electron in parallel locally (RAM hazard).
11. **Background workers print to the same console pipe** ([:67](../../../tests/index.spec.ts)) — `electronApp.on("window", win => win.on("console", logMessage))` covers every later window, including the `threads` background renderers. Their output is interleaved into `console.txt` — caller has to disambiguate by `location.url`.

---

## 7. Known TODOs

No `// TODO` or `// FIXME` markers exist in this file. Two pieces of dead-but-illustrative code remain:

| Line | Snippet | Note |
|---|---|---|
| `:15` | `// !process.env.CI && test.use({ launchOptions: { slowMo: 500 } });` | Opt-in slow-motion for local debugging. Commented out so default runs are fast. |
| `:143-145` | `// await expect(window).toHaveScreenshot("loaded.png", { clip: { x: 100, y: 100, width: 2000, height: 1000 } });` | The intended visual-regression checkpoint after sheet creation. Disabled — would require committed snapshot baselines under the path templated by `snapshotPathTemplate` in [`playwright.config.ts`](../h/playwright.config.ts.md). |

The first inverted-`existsSync`/non-awaited-`mkdir` issue (§6 #1, #2) is implicitly a bug to address but not flagged in the source.

---

## 8. Extension points

| Extension | How |
|---|---|
| Add another fixture file | Drop the `*.svg` into [`tests/assets/`](../../../tests/assets/) and update the literal `2` at `:132`. The expected `54/54` placement count will also change — re-derive from a fresh run and update `:186`. |
| Different sheet dimensions | Edit the `sheet` constant at `:136`. The placement count will change with sheet area. |
| Skip the console pipe locally | Override the metadata flag for a single run: `playwright test --grep Nest -j 1` cannot do this directly; the cleanest route is `CI=1 npm test`. |
| Re-enable visual regression | Uncomment `:143-145`, run `npx playwright test --update-snapshots`, commit the produced PNG under the template path. |
| Drive the test from JS rather than TS | Not possible without a TS transpile step — `playwright.config.ts` is itself TS, so the project is locked to `tsx`-style runtime resolution. |
| Run multiple browsers | Add another entry to `projects` in [`playwright.config.ts`](../h/playwright.config.ts.md). The spec is not actually browser-portable: `_electron.launch` only works under the Chromium project. |
| Capture more attachments | The `Attachments` step is the natural splice point; `testInfo.attach(name, { body, contentType })` is already used three times. |
| Test individual services in isolation | Out of scope here — the renderer services in [Group D](../d/README.md) are dependency-injected and unit-testable without Electron, but no unit-test framework is currently wired up. |

---

## 9. Test coverage status

This **is** the test surface. It exercises:

- ✅ Config tab: open, reset, change units / spacing / placement type, verify defaults round-trip.
- ✅ SVG file import (the only file type tested — DXF/DWG/EPS/PS conversion paths are **not** exercised).
- ✅ Sheet creation via the sheet dialog.
- ✅ GA `start` → first iteration → `stop` lifecycle.
- ✅ SVG export via the save dialog (the JSON / DXF export paths are **not** exercised — only the SVG button is clicked).
- ✅ Console + video + report attachments.

It does **not** exercise (the source of "not covered" claims in other groups):

- ❌ Preset CRUD (`load-presets` / `save-preset` / `delete-preset` IPC).
- ❌ DXF / DWG / EPS / PS import (no conversion-server round-trip is tested).
- ❌ DXF / JSON export buttons.
- ❌ Multi-sheet export (only one sheet is added).
- ❌ The notification window ([`docs/deep-dive/g/main__notification.html.md`](../g/main__notification.html.md)).
- ❌ OAuth login flow (`window.loginWindow`).
- ❌ Rotation-count effects beyond the default `4`.
- ❌ Error / cancellation paths (cancelling the file picker, GA failure modes, conversion-server unavailability).
- ❌ `useSvgPreProcessor`, `useQuantityFromFileName`, `exportWithSheetBoundboarders`, `exportWithSheetsSpace*` configuration toggles.

---

## 10. References

- [`tests/index.spec.ts`](../../../tests/index.spec.ts) — this file
- [`tests/assets/`](../../../tests/assets/) inventory — [`tests__assets.md`](./tests__assets.md)
- [`playwright.config.ts`](../../../playwright.config.ts) — runner config; deep dive [`docs/deep-dive/h/playwright.config.ts.md`](../h/playwright.config.ts.md)
- [`index.d.ts`](../../../index.d.ts) — `DeepNestConfig`, `NestingResult` types imported at `:13`; deep dive [`docs/deep-dive/h/index.d.ts.md`](../h/index.d.ts.md)
- [`main.js`](../../../main.js) — `_electron.launch` target; deep dive [`docs/deep-dive/a/main.js.md`](../a/main.js.md)
- [`main/ui/index.ts`](../../../main/ui/index.ts) — composition root; deep dive [`docs/deep-dive/c/main__ui__index.ts.md`](../c/main__ui__index.ts.md)
- [`main/ui/services/config.service.ts`](../../../main/ui/services/config.service.ts) — `window.config` source; deep dive [`docs/deep-dive/d/main__ui__services__config.service.md`](../d/main__ui__services__config.service.md)
- [`main/ui/services/import.service.ts`](../../../main/ui/services/import.service.ts) — `#import` handler; deep dive [`docs/deep-dive/d/main__ui__services__import.service.md`](../d/main__ui__services__import.service.md)
- [`main/ui/services/export.service.ts`](../../../main/ui/services/export.service.ts) — `#export` / `#exportsvg` handler; deep dive [`docs/deep-dive/d/main__ui__services__export.service.md`](../d/main__ui__services__export.service.md)
- [`main/ui/services/nesting.service.ts`](../../../main/ui/services/nesting.service.ts) — `#startnest` / `#stopnest` lifecycle; deep dive [`docs/deep-dive/d/main__ui__services__nesting.service.md`](../d/main__ui__services__nesting.service.md)
- [`main/deepnest.js`](../../../main/deepnest.js) — GA loop; deep dive [`docs/deep-dive/b/main__deepnest.js.md`](../b/main__deepnest.js.md)
- [`main/background.js`](../../../main/background.js) — background NFP renderer; deep dive [`docs/deep-dive/b/main__background.js.md`](../b/main__background.js.md)
- [`main/index.html`](../../../main/index.html) — every element id targeted by the spec; deep dive [`docs/deep-dive/g/main__index.html.md`](../g/main__index.html.md)
