# Deep Dive — `playwright.config.ts`

> **Group**: H (build / config / quality) · **Issue**: [DEE-19](../../../) · **Parent**: [DEE-11](../../index.md) · **Author**: Paige · **Generated**: 2026-04-26
>
> Per-file deep dive following the [DEE-11 shared template](../b/README.md). Companion files in this group: [`package.json.md`](./package.json.md), [`tsconfig.json.md`](./tsconfig.json.md), [`eslint.config.mjs.md`](./eslint.config.mjs.md), [`index.d.ts.md`](./index.d.ts.md).

| Field | Value |
|---|---|
| Path | [`playwright.config.ts`](../../../playwright.config.ts) |
| Lines | 57 |
| Format | Playwright `defineConfig` export — TypeScript ES module |
| Driven by | `npm test` → `playwright test` |
| Test directory | `./tests/` |
| Active projects | 1 (`chromium` desktop preset) |
| Headed | yes (`headless: false`) |

---

## 1. Purpose

Single Playwright configuration for the project. Boots the Electron app via `_electron.launch({ args: ['main.js'] })` (in [`tests/index.spec.ts`](../../../tests/index.spec.ts)) and exercises the full UI from the visible main window. Defines:

- The single `chromium` project (only Electron's bundled Chromium is exercised).
- The CI-vs-local switching matrix for retries, workers, reporter, video, and console piping.
- Trace / video / screenshot capture defaults.
- Snapshot path template (`{testDir}/{testFilePath}-snapshots/{arg}{ext}`).
- A custom `metadata.pipeConsole` flag that the spec reads to decide whether to forward Electron renderer console messages to a per-test attachment.

The config does **not** spawn a dev server (no `webServer` block — the commented-out template is left as a hint). Tests own the lifecycle of the Electron app directly.

---

## 2. Public surface

The file's only export is the default `defineConfig({...})` object. Playwright reads it via its automatic config discovery (no path passed to `playwright test`).

```ts
export default defineConfig({
  testDir: "./tests",
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : undefined,
  reporter: [
    ["html", { open: process.env.CI ? "never" : "on-failure" }],
    [process.env.CI ? "github" : "list"],
  ],
  use: {
    trace: "on-first-retry",
    video: process.env.CI ? "retain-on-failure" : "on",
    screenshot: "on",
    headless: false,
  },
  metadata: { pipeConsole: !process.env.CI },
  snapshotPathTemplate: "{testDir}/{testFilePath}-snapshots/{arg}{ext}",
  projects: [{ name: "chromium", use: { ...devices["Desktop Chrome"] } }],
});
```

---

## 3. Top-level options

| Option | Value | Why |
|---|---|---|
| `testDir` | `"./tests"` | Single directory; only [`tests/index.spec.ts`](../../../tests/index.spec.ts) lives there today plus [`tests/assets/`](../../../tests/assets/) (two SVGs used as test fixtures). |
| `fullyParallel` | `true` | Tests run in parallel across files. There is currently exactly one test file with one test, so the flag is forward-looking. **Hazard**: the test boots a real Electron app — running ≥ 2 in parallel locally requires enough RAM for ≥ 2 Electron instances. |
| `forbidOnly` | `!!process.env.CI` | A `test.only(...)` left in source fails CI but is allowed locally for focus. |
| `retries` | `process.env.CI ? 2 : 0` | Two retries in CI for flake suppression; none locally. |
| `workers` | `process.env.CI ? 1 : undefined` | CI uses 1 worker (serial) to keep memory bounded; locally Playwright auto-detects (`undefined` → CPU count). With `fullyParallel: true` and `workers: undefined`, a multi-test future could spike RAM. |
| `reporter` | `[["html", { open: ... }], [CI ? "github" : "list"]]` | HTML report always emitted; second reporter is `github` annotations on CI, `list` (one line per test, live) locally. The HTML report opens automatically on failure when running locally (`"on-failure"`), never on CI. |
| `metadata` | `{ pipeConsole: !process.env.CI }` | **Custom field** read by [`tests/index.spec.ts:18`](../../../tests/index.spec.ts) (`testInfo.config.metadata.pipeConsole`). When `true`, the spec wires `mainWindow.on('console', ...)` to write every renderer console message to `console.txt` and attach it as `console.json` at test end. CI gets `pipeConsole: false` to keep CI artifacts compact. |
| `snapshotPathTemplate` | `"{testDir}/{testFilePath}-snapshots/{arg}{ext}"` | Snapshots co-located with the spec under a sibling `*-snapshots/` directory. Today no `toHaveScreenshot()` calls exist (the one in the spec is commented out at line 143–145), so this directory is not yet created. |

The commented-out `webServer` block (lines 51–56) is documentation only — the test launches Electron itself, so a separate web server would be wrong.

---

## 4. The `use` block (per-test defaults)

| Field | Value | Effect |
|---|---|---|
| `trace` | `"on-first-retry"` | Save Playwright trace on the first retry of a failing test. CI (`retries: 2`) gets traces on retry attempt 1; local (`retries: 0`) effectively never gets a trace because the test never retries. |
| `video` | `process.env.CI ? "retain-on-failure" : "on"` | CI keeps videos only for failures; locally every run is recorded. The spec also passes `recordVideo: { dir: testInfo.outputDir }` to `electron.launch` ([line 25](../../../tests/index.spec.ts)) — so the video is captured by Electron itself, not by Playwright's browser-context recorder. The `use.video` setting therefore controls only the per-test browser-context recording (which here is empty, since tests drive Electron windows, not pages). |
| `screenshot` | `"on"` | Capture a screenshot on every test (not just failures). Goes into the HTML report. |
| `headless` | `false` | Headed by default. Required for Electron tests — there is no headless Electron mode in `_electron.launch`. **Hazard**: this means CI runners must have an X server / `xvfb-run` shim. The CI workflow in [`.github/workflows/playwright.yml`](../../../.github/workflows/playwright.yml) is responsible for providing that. |
| `baseURL` | (commented out) | The Electron app is loaded from `file://` URLs by `main.js`; there is no HTTP base. |

---

## 5. The `projects` array

```ts
projects: [
  { name: "chromium", use: { ...devices["Desktop Chrome"] } },
]
```

- Only `chromium` is configured. Webkit / Firefox would fail to launch the Electron app anyway, so that is correct.
- `devices["Desktop Chrome"]` brings: viewport `1280×720`, `userAgent`, default geolocation. **For Electron these settings are mostly ignored** — the actual window size is set by `createMainWindow()` in [`main.js:88-146`](../../../main.js) (`0.9 × workAreaSize`).
- No `testMatch` / `testIgnore` per project — every spec under `testDir` runs in this one project.

---

## 6. Environment variables consumed

| Variable | Lines | Effect |
|---|---|---|
| `process.env.CI` | 19, 21, 23, 25 (×2), 33, 38 | The single switching axis. Treated as boolean — any truthy string flips `retries`, `workers`, `reporter[1]`, `video`, `metadata.pipeConsole`, and the HTML report's `open` mode. |

`playwright.config.ts` does **not** read `process.env.deepnest_debug`, `SAVE_PLACEMENTS_PATH`, `SIGNTOOL_PATH`, or any of the other env vars used by the main process. Those flow into `main.js` directly when Playwright spawns Electron.

The spec ([`tests/index.spec.ts`](../../../tests/index.spec.ts)) consumes `testInfo.config.metadata.pipeConsole` (set here at line 38) but reads no environment variables itself.

---

## 7. Invariants & gotchas

1. **`headless: false` + Electron = X server required.** On Linux CI the workflow must run via `xvfb-run -a npm test` (or set up Xvfb manually). If the workflow is changed to native headless, the test will hang at `electron.launch`.
2. **`fullyParallel: true` + Electron is dangerous if more specs are added.** Each spawned Electron consumes ≥ 200 MB RAM and a GPU context. Add a second `test('Nest 2', ...)` in `index.spec.ts` and CI's single worker is fine; add a second spec **file** locally and Playwright will run them in parallel — set `workers: 1` if you ever need to run from a small dev machine.
3. **`retries: 0` locally + `trace: "on-first-retry"`** means **no traces locally** — even on a failing run. To get a trace during local debugging, either bump `retries` to `1` or pass `--trace=on` on the CLI.
4. **`metadata.pipeConsole` is a custom field, not a Playwright API.** The spec reads it via `testInfo.config.metadata.pipeConsole`. Any future framework upgrade that disallows arbitrary metadata keys will silently turn off console capture. Touch with care.
5. **`testInfo.outputDir` directory check pattern in the spec is buggy.** [`tests/index.spec.ts:19`](../../../tests/index.spec.ts) does `if (existsSync(testInfo.outputDir)) { mkdir(testInfo.outputDir, { recursive: true }); }` — that creates the directory **only if it already exists**. Likely intended `if (!existsSync...)` . Inverted logic, but harmless because Playwright always creates the output dir before the test runs. Flagged for fix.
6. **No `globalSetup` / `globalTeardown`.** The Electron app is launched per-test; if multiple tests need the same booted Electron, a `globalSetup` would be needed (and Electron's IPC state would have to be reset between tests).
7. **No `expect.timeout` override** — defaults to 5 s. The spec uses `await expect(...).toPass()` for the long-running progress checks (waitForIteration), which uses the polling default. If nesting takes > 30 s in CI, the test will fail; bump `expect.timeout` here if you see flake.
8. **Snapshot template directory is not created.** Today no `toHaveScreenshot` is active. The commented-out call at [tests/index.spec.ts:143-145](../../../tests/index.spec.ts) is the only such reference. Activating it will require committing the baseline PNGs under `tests/index.spec.ts-snapshots/`.

---

## 8. Known TODOs / debt

- The commented-out `dotenv` block at lines 4–9 is dead code; either wire it up or delete it. Today there is no `.env` file in the repo and no env var that benefits from dotenv loading.
- The commented-out `webServer` block at lines 51–56 is also dead — Electron is launched by the spec, not by Playwright's web-server feature. Delete on cleanup.
- `expect` timeout / global timeout are unset. Add explicit values once flake patterns emerge.
- No `@playwright/test/reporter-junit` — CI reports via `github` annotations only; if a JUnit XML is needed for badge / dashboard ingestion it must be added here.

There are no `// todo:` / `// FIXME:` markers in the file itself.

---

## 9. Extension points

| Need | How to add it |
|---|---|
| Add a second test file | Drop `*.spec.ts` under `tests/`. `testDir` already covers it. Watch RAM with `fullyParallel: true`. |
| Add a second browser project | New entry in `projects[]`. Note that for Electron this is meaningless — `_electron.launch` ignores the project's browser. Useful only if a future test boots a vanilla Chromium against a separate UI surface. |
| Reduce CI flake | Bump `retries` to `3` and add `timeout: 60_000` at top level. Pair with stricter `forbidOnly` reporting. |
| Add JUnit output | Append `["junit", { outputFile: "playwright-report/junit.xml" }]` to the `reporter` array. Update the CI workflow to upload it. |
| Add code coverage | Use `coverage` from `@playwright/test` v1.42+ with `use.coverage = "v8"`. The Electron renderer needs `--enable-blink-features=BlinkPrivateImports` or similar — not currently exercised. |
| Add `globalSetup` to seed `userData` | New `globalSetup: "./tests/global-setup.ts"`. Useful if you need a known `settings.json` / `presets.json` baseline. |

---

## 10. Test coverage status

The config **drives** the test coverage rather than being covered by a test. The single spec file [`tests/index.spec.ts`](../../../tests/index.spec.ts) (230 lines) exercises:

- Config tab interactions (`#config_tab`, units, spacing, placement type, default reset).
- File import (drives `dialog.showOpenDialog` mock with `tests/assets/*.svg`).
- Sheet creation (`#addsheet`, `#sheetwidth`, `#sheetheight`, `#confirmsheet`).
- Nesting start/stop and progress polling.
- SVG export round-trip.
- Window globals: `window.config.getSync()` and `window.DeepNest.config()` / `.nests`.

That single spec is the entire E2E suite. Anything not asserted there is out of automated coverage — including the notification window, OAuth / cloud paths, and most of the import service's DXF branch.

The HTML report lives under `playwright-report/` (gitignored via `package.json#build.files["!**/playwright-*"]`). On CI it is uploaded as a workflow artifact (see [`.github/workflows/playwright.yml`](../../../.github/workflows/playwright.yml)).

---

## 11. Cross-references

- [`tests/index.spec.ts`](../../../tests/index.spec.ts) — the only consumer of this config; reads `testInfo.config.metadata.pipeConsole`.
- [`docs/deep-dive/h/package.json.md`](./package.json.md) §2 — the `npm test` script and the `.husky/pre-commit` hook that runs it on every commit.
- [`docs/deep-dive/a/main.js.md`](../a/main.js.md) — `createMainWindow()` defines the actual window size that Playwright drives; `devices["Desktop Chrome"]`'s viewport is overridden.
- [`docs/deep-dive/h/index.d.ts.md`](./index.d.ts.md) §"Used-by" — `window.config` and `window.DeepNest` (read in the spec) are typed here.
- [`docs/development-guide.md`](../../development-guide.md) — local test workflow.
- [`docs/architecture.md`](../../architecture.md) §6 — testing strategy (E2E only).
- [`.github/workflows/playwright.yml`](../../../.github/workflows/playwright.yml) — CI runner for `npm test`.
