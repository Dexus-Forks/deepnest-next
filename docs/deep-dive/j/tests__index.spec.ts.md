# `tests/index.spec.ts` — Playwright Electron E2E spec

The single end-to-end Playwright spec in this repository. Launches the
Electron app via `_electron.launch`, drives the renderer through the
"open the app → set config → import parts → add a sheet → start nest →
download SVG → stop nest" happy path, and attaches every produced
artifact (video, console log, output SVG, nesting JSON) to the test
report. This is the **only** automated coverage of the renderer: every
other deep-dive in the project that says "covered by `tests/index.spec.ts`"
points to the test described below.

- File: [`tests/index.spec.ts`](../../../tests/index.spec.ts)
- Runner config: [`playwright.config.ts`](../../../playwright.config.ts)
- Project under test: the unpackaged Electron app entry
  [`main.js`](../../../main.js) loading
  [`main/index.html`](../../../main/index.html).

## Role in the architecture

```
+-----------------------+   electron.launch(args:["main.js"])   +-------------------+
|  Playwright runner    | ------------------------------------> |  Electron main    |
|  (chromium project)   |                                       |  (main.js)        |
+-----------+-----------+                                       +---------+---------+
            |                                                             |
            | mainWindow = electronApp.firstWindow()                      |
            v                                                             v
+-----------------------+   DOM clicks / fills / locator queries   +-------------------+
|  Renderer #main       | <--------------------------------------- |  main/index.html  |
|  (page.js + ui/...)   |                                          |  + main/ui/*      |
+-----------+-----------+                                          +-------------------+
            |
            | mainWindow.evaluate(() => window.config | window.DeepNest)
            v
+--------------------------+
|  Assertions on:          |
|   - window.config         |
|   - window.DeepNest config|
|   - #importsnav li count  |
|   - #progressbar visible  |
|   - #nestlist span n=1    |
|   - #nestinfo h1[0] = "1" |
|   - #nestinfo h1[1]="54/54"|
+--------------------------+
```

## Test inventory

There is exactly **one** `test(...)` declaration plus an `afterAll` hook.
The single test is structured as a sequence of `test.step(...)` blocks
(steps appear as nested entries in the Playwright report and are
treated as a soft outline, not as separate Playwright tests).

| Test name | Preconditions | Actions (steps) | Assertions | Known flake risks |
| --- | --- | --- | --- | --- |
| `Nest` | Electron-runnable host with a display (`headless: false` in `playwright.config.ts:35`); `main.js` present in cwd; `tests/assets/*.svg` exists; runner has filesystem access to write `console.txt` and `output.svg` under `testInfo.outputDir`. | (1) Launch Electron with `args: ["main.js"]` and `recordVideo`. (2) Optional `Pipe browser console logs` step (only when `metadata.pipeConsole = true`, see "pipeConsole flag" below). (3) `Config` step — set defaults, `units = mm`, `spacing = 10`, `placementType = gravity`. (4) `Upload files` — stub `dialog.showOpenDialog` to return both `tests/assets/*.svg` paths, click `#import`. (5) `Add sheet` — open `#addsheet`, fill `#sheetwidth = 300`, `#sheetheight = 200`, confirm. (6) Click `#startnest`. (7) Wait for first GA iteration. (8) `Attachments` — stub `dialog.showSaveDialogSync`, download SVG via `#export` → `#exportsvg`, attach SVG / nesting JSON / piped console JSON. (9) `Stop nesting` — click `#stopnest`, assert button text returns to `Start nest`. | `window.config.getSync()` matches a `sharedConfig` shape **plus** main-process-only fields (`conversionServer`, `dxfExport/ImportScale`, `endpointTolerance`, `units: "mm"`). `window.DeepNest.config()` matches `sharedConfig` plus the GA-only `clipperScale: 10000000`. `#importsnav li` has count `2` (one entry per imported file). `#progressbar` is visible after `#startnest`. `#nestlist span:nth-child(1)` is visible (first GA iteration produced a nest). `#nestinfo h1:nth(0)` = `"1"` (one sheet used). `#nestinfo h1:nth(1)` = `"54/54"` (all 54 polygon-tree parts placed). After `#stopnest` is clicked, the same button shows text `Start nest`. | • **Long polling on `54/54`** — uses `expect.poll`/`.toPass()` waiting for the GA to converge to a 100 %-placed solution. On a slow CI runner the GA may need many seconds; default Playwright `expect` timeout (5 s × `toPass` retry budget) usually wins, but is the most likely flake source.<br>• **Iteration #1 visibility** — `waitForIteration(1)` polls `#nestlist span:nth(0)` for visibility. The first iteration arrives only after the NFP cache populates (parts × parts pairwise NFPs). With 54 parts, NFP generation takes several seconds.<br>• **Console pipe race** — `mainWindow.on("console", ...)` and `electronApp.on("window", ...)` are wired *after* `electronApp.firstWindow()` resolves; messages emitted between launch and listener attachment are lost. Only matters for log completeness, not pass/fail.<br>• **Dialog stubs** — `dialog.showOpenDialog` and `dialog.showSaveDialogSync` are replaced inside `electronApp.evaluate(...)`. The save-dialog stub uses **synchronous** `showSaveDialogSync` because that is what the renderer's export path calls; if a future refactor switches to `showSaveDialog` the stub silently fails and the test hangs.<br>• **Cwd assumptions** — `args: ["main.js"]` is resolved relative to Playwright's cwd. Running `npx playwright test` from a subdirectory will fail to launch.<br>• **Output dir collision** — `mkdir(testInfo.outputDir, { recursive: true })` is wrapped in an `existsSync` guard with inverted intent (the directory is `mkdir`'d only when it already exists). Harmless because Playwright pre-creates the output dir, but the guard does not do what it reads as. Worth flagging for cleanup. |
| `afterAll` hook | Test ran to completion (pass or fail). | Reads every file under `testInfo.outputDir` and re-attaches it to the test info. | None. | Attaches *all* files in `outputDir`, including the recorded video and the raw `console.txt`. On large/long runs this inflates the HTML report. Files are also re-attached after the test step has already attached them under different names — this is intentional duplication so artefacts survive in the report even if a step failed before its dedicated `attach()` ran. |

## Public surface

The spec has no exports. The relevant programmatic surface it exercises:

| Surface | Where read/written | Test interaction |
| --- | --- | --- |
| `window.config` (`ConfigService`) | [`main/ui/services/config.service.ts`](../../../main/ui/services/config.service.ts), assigned in [`main/ui/index.ts`](../../../main/ui/index.ts) | `mainWindow.evaluate(() => window.config.getSync())` after the Config step. |
| `window.DeepNest` (GA loop) | [`main/deepnest.js`](../../../main/deepnest.js) `DeepNest` class | `mainWindow.evaluate(() => window.DeepNest.config())` and `() => window.DeepNest.nests` for the JSON snapshot. |
| `dialog.showOpenDialog` (Electron) | [`main/ui/services/import.service.ts`](../../../main/ui/services/import.service.ts) → `@electron/remote.dialog` | `electronApp.evaluate(({ dialog }, paths) => { dialog.showOpenDialog = async () => ({ filePaths: paths, canceled: false }) }, files)`. |
| `dialog.showSaveDialogSync` (Electron) | [`main/ui/services/export.service.ts`](../../../main/ui/services/export.service.ts) → `@electron/remote.dialog` | `electronApp.evaluate(({ dialog }, path) => { dialog.showSaveDialogSync = () => path }, file)`. |
| `#config_tab`, `#home_tab` | [`main/index.html:124-125`](../../../main/index.html) | Tab switching via `.click()`. |
| `#config a:has-text("set all to default")` | [`main/index.html:504`](../../../main/index.html) `#setdefault` | Triggers `ConfigService.resetToDefaultsSync()`. |
| `#config input[type=radio]:nth(1)` | First radio after `inches` is `mm` (see `main/index.html:225`). | Sets `units = "mm"`. |
| `#config input[type=number]:first-of-kind` | First spinbutton is `data-config="spacing" data-conversion="true"` ([`main/index.html:231-239`](../../../main/index.html)). | Filled with `"10"` (mm). With `data-conversion="true"`: 10 mm × scale (72) ÷ 25.4 = **28.34645669291339** SVG units, asserted in `sharedConfig.spacing`. |
| `#config select[name="placementType"]` | [`main/index.html:272`](../../../main/index.html). | Set to `"gravity"`. |
| `#import` | [`main/index.html:136`](../../../main/index.html) `<li id="import">Import</li>`. | Click triggers `ImportService.handleImport(...)` which opens the (stubbed) `dialog.showOpenDialog`. |
| `#importsnav li` | Rendered by Ractive `{{#each imports}}` ([`main/index.html:185-192`](../../../main/index.html)). One `<li>` **per imported file**, not per part. | Asserted `toHaveCount(2)` after both `tests/assets/*.svg` are imported. |
| `#addsheet`, `#sheetwidth`, `#sheetheight`, `#confirmsheet` | [`main/index.html:167, 173-176`](../../../main/index.html) `sheet-dialog` template; backed by [`main/ui/components/sheet-dialog.ts`](../../../main/ui/components/sheet-dialog.ts). | Open dialog, fill `300`/`200` (mm), confirm. Sheet is added to `DeepNest.parts` with `sheet: true`. |
| `#startnest` | [`main/index.html:137`](../../../main/index.html). | Click triggers `NestingService.startNesting()` → `DeepNest.start(progressCb, displayCb)`. |
| `#progressbar` | [`main/index.html:87`](../../../main/index.html). Subscribed by `initializeBackgroundProgress()` in `main/ui/index.ts` to `background-progress` IPC. | Asserted visible after `#startnest`. |
| `#nestlist span:nth(n-1)` | [`main/index.html:100-110`](../../../main/index.html), Ractive `{{#each nests}}`. One span per "best nest so far". | `waitForIteration(n)` asserts the nth span is visible. |
| `#nestinfo h1` | [`main/index.html:94-99`](../../../main/index.html). `h1[0]` = sheets-used count, `h1[1]` = `getPartsPlaced()` formatted as `"placed/total"` (see [`main/ui/components/nest-view.ts:387-414`](../../../main/ui/components/nest-view.ts)). | Asserted `"1"` and `"54/54"`. |
| `#export`, `#exportsvg` | [`main/index.html:41`](../../../main/index.html). | Click `#export` opens the export menu, click `#exportsvg` triggers `ExportService.exportSvg()` which calls `dialog.showSaveDialogSync()` (stubbed) and writes to disk. |
| `#stopnest` | [`main/index.html:37`](../../../main/index.html). | Click triggers `NestingService.stopNesting()`. Button text returns to `"Start nest"` once the GA loop releases. |

## Fixtures and harness contracts

Playwright fixtures used (all from `@playwright/test` — no custom
fixtures are defined in this spec or repo):

| Fixture | Source | Usage in spec |
| --- | --- | --- |
| `test`, `expect` | `@playwright/test` | Standard. |
| `_electron as electron` | `@playwright/test` | `electron.launch({ args: ["main.js"], recordVideo: { dir: testInfo.outputDir } })`. The `electron` API is the official Playwright Electron driver, **not** the npm `electron` package. |
| `ConsoleMessage` | `@playwright/test` (type only) | Typed parameter for `logMessage`. |
| `OpenDialogReturnValue` | `electron` (type only) | Typed return for the `dialog.showOpenDialog` stub. |
| `testInfo` (second arg of test fn) | `@playwright/test` | Reads `outputDir`, `outputPath()`, `config.metadata`, `attach()`. |
| `existsSync`, `mkdir`, `appendFile`, `readdir`, `readFile` | `node:fs` / `node:fs/promises` | Output-dir bootstrap, console.txt write/read, asset enumeration, downloaded-SVG read. |
| `fileURLToPath` from `node:url`, `path` | Node | Resolve absolute paths for `tests/assets/` and convert console-log `file://` URLs to repo-relative paths for nicer logs. |
| `DeepNestConfig`, `NestingResult` | [`index.d.ts`](../../../index.d.ts) at the repo root | Type-only imports for the `evaluate` return values. |

The spec relies on the **Playwright Electron API** rather than the
plain Page fixture, so it does not use a `webServer`, base URL, or
storage-state fixture — these are commented out in
[`playwright.config.ts:7-9, 28-30, 51-56`](../../../playwright.config.ts).

## The Electron launch hook

```ts
const electronApp = await electron.launch({
  args: ["main.js"],
  recordVideo: { dir: testInfo.outputDir },
});
const mainWindow = await electronApp.firstWindow();
```

What this triggers:

1. Playwright spawns Electron with the `electron` npm dependency
   resolved from the test process's `node_modules`. The `args` array
   is passed to Electron as if `electron main.js` had been run from
   the project root.
2. `main.js` starts ([`main.js:1-200+`](../../../main.js)), creates
   the main `BrowserWindow` (`nodeIntegration: true`,
   `contextIsolation: false`, `enableRemoteModule: true`), and loads
   `main/index.html`.
3. `recordVideo: { dir: testInfo.outputDir }` writes a `*.webm` per
   page into the per-test output directory. Playwright's
   `playwright.config.ts:33` also sets `video: "on"` locally and
   `"retain-on-failure"` on CI; these settings cooperate, with the
   per-launch `recordVideo` taking precedence.
4. `electronApp.firstWindow()` resolves to the **first** BrowserWindow.
   `main.js` opens additional offscreen background renderers
   (`backgroundWindows[]`) for the GA / NFP workers; those windows
   are **not** the `mainWindow` and the spec deliberately ignores
   them, except via the optional `electronApp.on("window", ...)`
   subscription that pipes their console output too.

There is no explicit `electronApp.close()`. The Playwright runner
shuts the Electron process down at the end of the test by destroying
all pages and the Electron app context. This is intentional —
`#stopnest` only stops the GA loop, not the app.

## Environment variables

The spec itself does not read `process.env` directly. Indirect
behaviour driven by env vars:

| Env var | Read where | Effect |
| --- | --- | --- |
| `CI` | [`playwright.config.ts:19, 21, 23, 25, 33, 38`](../../../playwright.config.ts) | When set: `forbidOnly: true`, `retries: 2`, `workers: 1`, `reporter` includes `"github"`, `video: "retain-on-failure"`, `metadata.pipeConsole: false`. |
| `metadata.pipeConsole` | `tests/index.spec.ts:18`, derived from `!process.env.CI` in `playwright.config.ts:38` | If `true`, the renderer's `console.*` messages are appended to `console.txt`, then re-attached as a parsed `console.json`. **Disabled on CI** to avoid noisy logs in GitHub-Actions output. |
| Implicit via `process.env.CI` in commented `slowMo` line | [`tests/index.spec.ts:15`](../../../tests/index.spec.ts) (commented out) | The disabled line `!process.env.CI && test.use({ launchOptions: { slowMo: 500 } })` would slow Electron's interactions to 500 ms locally. Kept as a debugging hint. |

The spec does not read any `process.env.DEEPNEST_*` or app-specific
variables. Conversion-server, scale, and unit choices are driven
purely through the UI flow.

## Output dir contract

For each run Playwright provisions
`test-results/index-Nest/<retry-suffix>/` (path resolves through
`testInfo.outputDir`). The spec writes / attaches:

| Artefact | When | Source |
| --- | --- | --- |
| `*.webm` (video) | Always (locally `on`, on CI `retain-on-failure`) | Playwright's `recordVideo`. |
| `console.txt` | Locally only (`pipeConsole = !CI`) | Appended by `logMessage()` per console event, NDJSON-with-`,\n\n`-separator. |
| `console.json` | Locally only, attached during `Attachments` step | Re-parsed `console.txt`. |
| `output.svg` | Always | Written by `ExportService.exportSvg` via the stubbed `dialog.showSaveDialogSync`. |
| `nesting.svg` | Always, attached in `Attachments` step | The same content as `output.svg`, attached as `image/svg+xml`. |
| `nesting.json` | Always, attached in `Attachments` step | `JSON.stringify(window.DeepNest.nests, null, 2)`. |
| Re-attachments of all of the above | Always, in `afterAll` | `(await readdir(outputDir)).map(file => testInfo.attach(file, { path: ... }))`. |

The duplicated attachments in `afterAll` are intentional. They guarantee
the artefacts survive in the report when a step fails before its
`attach()` call.

## What this spec implicitly tests in the rest of the codebase

Because there is only one E2E test, **every** group's deep-dive
"Test coverage" section keys off this single happy path. The mapping
is:

| Module / area | Covered? | What this spec exercises |
| --- | --- | --- |
| `main/ui/services/config.service.ts` | Yes | `read-config` IPC at boot; `setSync` / `resetToDefaultsSync` on the form change handlers; mm ↔ inch conversion (`spacing` and `curveTolerance` round-trip through `data-conversion="true"` math). |
| `main/ui/services/import.service.ts` | Partially | SVG-only import path (no DXF/DWG/EPS/PS round-trip through the conversion server). `dialog.showOpenDialog` is stubbed; `loadInitialFiles()` is **not** exercised because the test does not drop files into `NEST_DIRECTORY` before launch. |
| `main/ui/services/export.service.ts` | Partially | SVG export only. DXF and JSON exports (`#exportdxf`, `#exportjson`) are **not** clicked. The conversion-server round-trip on DXF export is not covered. |
| `main/ui/services/nesting.service.ts` | Yes | `startNesting()` → first iteration; `stopNesting()` (via the button text round-trip). `goBack()` is **not** covered. |
| `main/ui/services/preset.service.ts` | **No** | The preset modal, `load-presets` / `save-preset` / `delete-preset` IPC are not touched. |
| `main/ui/components/parts-view.ts` | Indirectly | Parts are rendered after import (the spec does not assert against `#parts`). |
| `main/ui/components/nest-view.ts` | Yes via `#nestinfo` / `#nestlist` text | `getPartsPlaced()` / sheets-used computation is asserted. |
| `main/ui/components/sheet-dialog.ts` | Yes | The `#addsheet` → fill → `#confirmsheet` flow. |
| `main/ui/components/navigation.ts` | Yes via tab clicks | `#config_tab` / `#home_tab` switching. |
| `main/deepnest.js` (GA loop) | Yes | `DeepNest.config()`, `DeepNest.start()`, `DeepNest.nests`, the `background-response` → `nests` push path (asserted via `getPartsPlaced()` reaching `54/54`). |
| `main/background.js` (worker side) | Yes (smoke) | The fact that `#nestlist span:nth(0)` becomes visible proves at least one iteration produced a payload via `background-response` IPC. NFP correctness is not directly asserted. |
| `main/svgparser.js` | Yes via 54-part assertion | Polygon-tree extraction from the two glyph SVGs is implicitly correct only if it produces 54 outer letterforms. |
| `main/util/clipper.js`, `main/util/geometryutil.js`, `main/util/HullPolygon.ts`, `main/util/matrix.ts`, `main/util/vector.ts`, `main/util/point.ts` | Indirectly | Used by the GA loop to reach the placed solution. |
| `main.js` IPC handlers | Yes | `read-config`, `write-config`, `background-start`, `background-stop`, `background-progress`, `background-response`, `setPlacements`. |
| `presets.js` | **No** | Not exercised. |
| `notification-service.js` | **No** | Update-check / notification path not exercised. |
| Auth0 / `access_token` / `id_token` flow | **No** | Login modal not opened. |

## Invariants and gotchas

- The expected `sharedConfig` object pins exact float values that come
  from the `inch ↔ mm` conversion (`spacing: 28.34645669291339`,
  `curveTolerance: 0.72`). If `DEFAULT_CONFIG.scale` ever changes from
  `72`, this assertion will fail; if `25.4` is replaced by a higher-
  precision millimetres-per-inch constant, the spacing assertion needs
  the new exact value.
- `expect(config).toMatchObject(...)` is **partial** — extra keys in
  the live config are tolerated. Adding new persisted UI keys does not
  break this test, but **removing** an asserted key will.
- `mkdir(testInfo.outputDir, { recursive: true })` runs only when the
  directory **already** exists (`if (existsSync(...))`). This is a
  no-op in practice because Playwright pre-creates the dir; the
  inverted condition is misleading. Worth flagging as cleanup.
- The console-pipe `appendFile` calls are not awaited at the call
  site (each `logMessage` is itself awaited inside the `box`-wrapped
  step, but multiple `console` events can interleave concurrent
  writes to `console.txt`). The chosen separator `,\n\n` is robust to
  interleaving in practice, but parsing `console.json` will throw
  silently-truncated JSON if the test crashes mid-write.
- `electronApp.evaluate(...)` for the dialog stubs **mutates** the
  Electron main process's global `dialog` object. There is no cleanup
  after the test. This is fine because the Electron app is destroyed
  at end-of-test, but it means a future second test in the same file
  would inherit a broken `dialog` until launch.
- The `Stop nesting` step asserts `expect(button).toHaveText("Start nest")`
  inside `expect.poll`-style `.toPass()`. The GA loop has to
  acknowledge `background-stop` IPC and flush the in-flight worker
  responses before the button text flips. Slow CI may occasionally
  exceed the default 5 s polling budget.

## Known TODOs

Source markers grepped at the time of this scan:

- `tests/index.spec.ts:15` — commented-out `slowMo` line preserved as
  a manual-debug hint.
- `tests/index.spec.ts:143-145` — commented-out screenshot assertion
  (`window.toHaveScreenshot("loaded.png", ...)`). A visual baseline
  was considered and rejected (no committed snapshots under
  `tests/index.spec.ts-snapshots/` despite
  `playwright.config.ts:41` configuring the path).

No `// todo:` / `// FIXME` / `// HACK` markers in the spec source.

## Extension points

The spec is monolithic and uses no Playwright fixtures of its own.
Adding new test cases (e.g. DXF export, presets, login flow) means:

1. Adding a new top-level `test(...)` block in this file or a new
   `*.spec.ts` under `tests/`. The runner picks it up via
   [`playwright.config.ts:15` `testDir: "./tests"`](../../../playwright.config.ts).
2. Stubbing any new dialogs through
   `electronApp.evaluate(({ dialog }, ...) => { dialog.X = ... })`.
3. Mirroring the `Attachments` step if new artefacts need to land in
   the report.

## Test surface (this is it)

- This file is itself the test surface. There is no separate "this
  file is covered by ..." entry — every other group's `Test coverage`
  bullet either says "covered by `tests/index.spec.ts` happy path"
  (and points here) or "not covered" (and the entry above shows why).

## References

- [`tests/index.spec.ts`](../../../tests/index.spec.ts)
- [`playwright.config.ts`](../../../playwright.config.ts)
- [`tests/assets/`](../../../tests/assets/) — see
  [tests__assets.md](./tests__assets.md) for the asset inventory.
- [`main.js`](../../../main.js) — Electron entry, dialog globals,
  IPC handlers.
- [`main/index.html`](../../../main/index.html) — selectors used by
  the spec.
- [`main/ui/index.ts`](../../../main/ui/index.ts) — composition root
  that wires the services this test exercises.
- [`main/ui/services/config.service.ts`](../../../main/ui/services/config.service.ts) and
  [Group D README](../d/README.md) — config / preset / import / export /
  nesting service deep-dives.
- [`main/deepnest.js`](../../../main/deepnest.js) — GA loop reached
  via `window.DeepNest`.
- [`main/ui/components/nest-view.ts`](../../../main/ui/components/nest-view.ts)
  `getPartsPlaced()` — the `54/54` formatter.
- [`index.d.ts`](../../../index.d.ts) — `DeepNestConfig`, `NestingResult`
  type aliases used by `mainWindow.evaluate`.
