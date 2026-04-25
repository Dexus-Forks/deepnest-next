# `playwright.config.ts` — Deep Dive

**Generated:** 2026-04-26 by Paige (Tech Writer) for [DEE-40](/DEE/issues/DEE-40) (parent: [DEE-11](/DEE/issues/DEE-11), supersedes DEE-29).
**Group:** H — build / config / quality.
**File:** `playwright.config.ts` (57 LOC, project root).
**Mode:** Exhaustive deep-dive.

## 1. Purpose

Single source of truth for the Playwright Electron E2E pipeline. Loaded automatically by:

- `npm test` (`playwright test`, see [`package.json`](./package.json.md) line 18).
- `.husky/pre-commit` (chains `npx lint-staged && npm test`, so **every commit** runs this config).
- The CI matrix (out of scope here — see Group A's CI deep-dives).

The config sets:

1. The test directory (`./tests`).
2. CI-vs-local switching for retries, parallelism, reporters, video, console-piping.
3. The single Playwright `project` (`chromium`, `Desktop Chrome` device).
4. Trace / video / screenshot capture defaults.
5. A custom `metadata.pipeConsole` flag that the spec reads at runtime to decide whether to forward Chromium console output to the test's attachments.

The file is intentionally minimal — there is no `globalSetup` / `globalTeardown`, no fixture overrides, no `webServer`, and no `dotenv` integration (the `dotenv` block in lines 7–9 is commented out).

## 2. The exported config object

The whole module is a single `defineConfig({...})` call (line 14). Each top-level key:

| Key | Value | Source line | Effect |
|---|---|---|---|
| `testDir` | `"./tests"` | 15 | Playwright walks this dir for `*.spec.ts` (the only file is `tests/index.spec.ts`). |
| `fullyParallel` | `true` | 17 | Each `test(...)` block runs in its own worker. With one test (`"Nest"` in `tests/index.spec.ts:17`), this only matters when more tests are added. |
| `forbidOnly` | `!!process.env.CI` | 19 | A leftover `test.only(...)` in the source fails the run on CI. Local runs allow `.only` for focused debugging. |
| `retries` | `process.env.CI ? 2 : 0` | 21 | CI retries each failing test twice (so up to 3 attempts). Local runs do not retry — failures surface immediately. |
| `workers` | `process.env.CI ? 1 : undefined` | 23 | CI runs one worker (serialised). Local runs use the Playwright default (`os.cpus().length / 2`, capped). The CI single-worker mode is required because the Electron launch + native NFP rebuild eats memory and parallel CI runners are tight on RAM. |
| `reporter` | `[["html", { open: process.env.CI ? "never" : "on-failure" }], [process.env.CI ? "github" : "list"]]` | 25 | Always emits an HTML report. Local runs auto-open the HTML report on failure; CI never opens it. The second reporter is `github` on CI (annotates PR check runs) and `list` locally (terminal-friendly). |
| `use` | `{ trace, video, screenshot, headless }` | 27–36 | Shared per-test options — see §3. |
| `metadata` | `{ pipeConsole: !process.env.CI }` | 37–39 | **Custom** — not a built-in Playwright field. Read at runtime by the spec to decide whether to dump Chromium console output. |
| `snapshotPathTemplate` | `"{testDir}/{testFilePath}-snapshots/{arg}{ext}"` | 41 | Where image / text snapshots go. Standard layout — colocated with the spec under `tests/index.spec.ts-snapshots/`. **No snapshots currently exist** — the spec has the `toHaveScreenshot` call commented out (`tests/index.spec.ts:143-145`). |
| `projects` | `[{ name: "chromium", use: { ...devices["Desktop Chrome"] } }]` | 44–49 | Single project — see §4. |
| `webServer` | (commented out) | 52–56 | Was meant to start `npm run start` before each run. Disabled because the Electron app launches inside the spec via `electron.launch({ args: ["main.js"] })` (`tests/index.spec.ts:23-26`). Leaving the commented block in shows the intent. |

## 3. Shared `use` options (lines 27–36)

```ts
use: {
  // baseURL: 'http://127.0.0.1:3000',
  trace: "on-first-retry",
  video: process.env.CI ? "retain-on-failure" : "on",
  screenshot: "on",
  headless: false,
},
```

| Option | CI value | Local value | Note |
|---|---|---|---|
| `baseURL` | (commented out) | (commented out) | Not used — the spec drives the Electron renderer directly via `electronApp.firstWindow()`. |
| `trace` | `on-first-retry` | `on-first-retry` | Trace zip is captured only when a test is retried after failure. Reduces overhead on the happy path. |
| `video` | `retain-on-failure` | `on` | CI keeps videos only for failed runs (saves storage in artefacts). Local runs always produce a video — useful for "wait, what just happened" rewinds during dev. |
| `screenshot` | `on` | `on` | Always capture screenshots at every action / failure. The spec attaches the directory under `tests/index.spec.ts-snapshots/` paths. |
| `headless` | `false` | `false` | **The Electron app cannot run headless under Playwright's `_electron` launcher in this configuration** — the renderer needs a visible Chromium window for many of the click-driven steps. CI must therefore run with a virtual display (`xvfb-run`, etc.) on Linux. |

## 4. The single `chromium` project

```ts
projects: [
  {
    name: "chromium",
    use: { ...devices["Desktop Chrome"] },
  },
],
```

There is **only one project**. `devices["Desktop Chrome"]` provides a 1280×720 viewport, Chrome user-agent, and standard locale. The Electron renderer launched by the spec inherits these via the `_electron.launch({...})` call inside `tests/index.spec.ts:23-26`.

There are **no Firefox or WebKit projects**. The runtime is Electron-on-Chromium — the cross-browser test surface that Playwright is famous for is intentionally not used here. Running this spec on a non-Chromium device set would not exercise anything new; the production app is Chromium-only.

## 5. Environment variables consumed

| Variable | Where read | Effect |
|---|---|---|
| `CI` | lines 19, 21, 23, 25 (twice), 33, 38 | The single switch that flips the config from "developer" to "CI" mode. Standard Playwright/CI convention — most CI runners (GitHub Actions, GitLab, CircleCI) set `CI=true` automatically. |

The commented-out `dotenv` block (lines 7–9) shows the historical pattern — the project chose **not** to depend on `.env` files for test config. Any environment variable that the spec needs must come from the shell or CI definition.

## 6. The `metadata.pipeConsole` channel

Lines 37–39:

```ts
metadata: {
  pipeConsole: !process.env.CI,
},
```

`metadata` is an arbitrary object that Playwright preserves on the resolved config and exposes to specs as `testInfo.config.metadata`. The spec at `tests/index.spec.ts:18` reads:

```ts
const { pipeConsole } = testInfo.config.metadata;
```

…and uses `pipeConsole` to decide whether to attach a `ConsoleMessage` listener that streams every Chromium-side `console.log` into a per-test `console.txt` file (later attached as `console.json` — see `tests/index.spec.ts:31-71, 202-211`).

The default flips with `!process.env.CI`:

- **Local** (`!CI`): pipeConsole = true → console output is captured and attached to every test run.
- **CI**: pipeConsole = false → console output is NOT captured. This was a deliberate choice: capturing the full console of a multi-minute nesting run produces tens of MB per CI run, which inflates artefact storage and slows uploads.

This is the **only custom metadata key** in the file. There is no other `metadata.*` reader anywhere in the codebase.

## 7. Reporters

The reporter chain (line 25):

```ts
reporter: [
  ["html", { open: process.env.CI ? "never" : "on-failure" }],
  [process.env.CI ? "github" : "list"]
],
```

Always two reporters. Concretely:

| Mode | Reporters |
|---|---|
| Local | `html` (auto-opens on failure) + `list` (terminal) |
| CI | `html` (output saved to `playwright-report/`, never auto-opens) + `github` (annotates PR checks) |

The HTML report dir is the default `playwright-report/` (overridden via the `PLAYWRIGHT_HTML_REPORT` env var if needed). It is excluded from the electron-builder package via [`package.json`](./package.json.md) `build.files` (`!**/playwright-*` and `!**/playwright-report/**` patterns at line 94, 98).

The `github` reporter writes `::error::` / `::warning::` annotations to stdout that GitHub Actions surfaces inline on the PR diff.

## 8. What `playwright.config.ts` does NOT do

These are visible by their absence:

- **No `globalSetup` / `globalTeardown`.** The spec opens its own Electron app inside `test(...)`. There is no shared setup outside the test body.
- **No `expect.toHaveScreenshot` config (`expect.toHaveScreenshot.threshold`, `pixelRatio`, etc.)**. Snapshot tests are not in active use; the only `toHaveScreenshot` call in the spec is commented out.
- **No `outputDir` override.** Test output lands in the Playwright default `test-results/` dir, which is excluded from electron-builder via `!**/test*` (line 95 of [`package.json`](./package.json.md)).
- **No `timeout` override.** Defaults are `30s` per test. The Nest test runs for several minutes — the only reason it doesn't time out is that every meaningful step is wrapped in `test.step(...)` and `expect(...).toPass()` poll loops, each of which has its own implicit timeout. If the spec's GA loop ever stalls without progress, Playwright's per-step polling timeout fires before the per-test 30s limit becomes relevant.
- **No `globalTimeout`.** No upper bound on the entire run.

## 9. Invariants & gotchas

1. **The `webServer` block is commented out *because the Electron app launches inside the spec*.** Anyone uncommenting it would double-launch (Playwright would `npm run start` *and* the spec would `electron.launch(...)`) — two app windows fight for ports / file locks. Don't uncomment without migrating the launch out of the spec.
2. **`fullyParallel: true` plus `workers: 1` on CI is contradictory but safe.** `fullyParallel` describes the *intent* (each test could run independently); `workers: 1` describes the *budget*. CI honours the budget (serial), but the option still acts as a forward-compat marker for when a second test is added.
3. **The `metadata.pipeConsole` channel is custom and undocumented in Playwright's own typings.** TypeScript accepts it because `metadata: { [key: string]: unknown }` (loose). The spec accesses it via `testInfo.config.metadata` — if anyone renames the key here, the spec will silently get `undefined` and stop dumping console output (no error). Update both sides together.
4. **`headless: false` is mandatory for the Electron launcher in this config.** Setting `headless: true` here would not propagate to the `_electron.launch(...)` call (Playwright's `_electron` is its own world), but it would mislead readers. The CI environment must provide a virtual display.
5. **No `expect`-level config means snapshot pixel-diff tolerances default to 0.** If snapshot testing is enabled in the future, expect a wall of failures from sub-pixel font rendering differences between dev and CI machines.
6. **`reporter` must always be an array of `[name, options]` tuples.** A single-name string would also work, but the array form here is required because the second reporter is dynamic (`process.env.CI ? "github" : "list"`).
7. **`forbidOnly: !!process.env.CI` is the only enforcement against `test.only`.** If `CI` is unset on a CI runner (rare but possible — GitHub Actions does set it; some self-hosted runners don't), a `.only` could land and silently mask other failures.
8. **No `retries` for the webServer / Electron launch step.** If `electronApp.firstWindow()` flakes (e.g. the renderer crashes during the boot script in [`main/index.html`](../g/main__index.html.md)), the test fails permanently. Retries cover post-launch flake only.
9. **The single chromium project is *also* what runs the Electron app.** Playwright's `_electron` launcher uses Electron's bundled Chromium — not the chromium binary downloaded by `playwright install`. The `projects` declaration is therefore mostly a label; the actual browser engine is whatever ships with `electron` in [`package.json`](./package.json.md) (currently `^40.0.0`).

## 10. Known TODOs

No inline `// TODO` / `// FIXME` markers. Implicit debt:

- The `dotenv` block (lines 7–9) is commented out but kept. Either delete it or wire it up.
- The `webServer` block (lines 52–56) is commented out but kept. Same.
- The `baseURL` line inside `use` (line 29) is commented out but kept. Same — there is no HTTP server in this project, so `baseURL` will never apply.
- No `expect` config — pixel snapshot testing isn't viable until thresholds are set.

## 11. Extension points

| To add… | Touch this file | Also touch |
|---|---|---|
| A second test file | Drop it into `tests/` matching `*.spec.ts` | Possibly bump `workers` for parallelism |
| Cross-browser smoke (firefox / webkit) | Add to `projects` | Most of the spec is Electron-specific — would have to be its own spec file |
| A `globalSetup` that pre-builds the Electron app | Add `globalSetup: "./tests/global-setup.ts"` | The spec currently calls `electron.launch({ args: ["main.js"] })` — that will keep working unless you also rip the launch out |
| Tighter video / screenshot retention on CI | Flip `video` to `off` or `retain-on-failure` (already there) | Just flip the values |
| Capture video on local runs only when failing | Change `video: "on"` → `video: "retain-on-failure"` | One-line change |
| Allure / Junit reporter for CI | Add `["allure-playwright"]` or `["junit", { outputFile: "..." }]` to the `reporter` chain | Add the reporter dep to [`package.json`](./package.json.md) `devDependencies` |
| CI-only `expect.toHaveScreenshot` threshold | Add `expect: { toHaveScreenshot: { threshold: 0.2 } }` | Activate the commented call in the spec |
| Trace on every run for forensic debugging | Change `trace` to `"on"` | Disk usage will balloon on CI |

## 12. Test coverage

The config itself is exercised on every `npm test` run. The single test file it loads is `tests/index.spec.ts` — deep-dived in [Group J](../j/tests__index.spec.ts.md). That spec covers:

- Config defaults (`window.config.getSync()` / `window.DeepNest.config()` round-trip — see [`index.d.ts.md`](./index.d.ts.md) §3).
- The full nesting happy path (import SVG → add sheet → start nest → stop → export → attach JSON).

There is no spec that asserts on this config file's own structure (no `tests/playwright-config.spec.ts`). The config's behaviour is validated by every test that depends on its options.

## 13. Cross-references

- [`package.json.md`](./package.json.md) — `npm test` script + `.husky/pre-commit` hook + `pw:codegen` helper that uses `helper_scripts/playwright_codegen.js`.
- [`tsconfig.json.md`](./tsconfig.json.md) — TypeScript options consumed by Playwright when transpiling this file and the spec.
- [`docs/deep-dive/j/tests__index.spec.ts.md`](../j/tests__index.spec.ts.md) — the sole spec loaded by `testDir: "./tests"`.
- [`docs/deep-dive/j/tests__assets.md`](../j/tests__assets.md) — fixtures consumed by the spec.
- [`docs/deep-dive/a/helper_scripts__playwright_codegen.js.md`](../a/helper_scripts__playwright_codegen.js.md) — the inspector-launching helper invoked by `npm run pw:codegen`.
- [`index.d.ts.md`](./index.d.ts.md) — declares the `Window` types that the spec reads via `mainWindow.evaluate(() => window.config / window.DeepNest)`.
