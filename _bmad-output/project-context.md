---
project_name: deepnest-next
user_name: Paperclip
date: 2026-04-26
sections_completed:
  [
    'technology_stack',
    'language_rules',
    'framework_rules',
    'testing_rules',
    'quality_rules',
    'workflow_rules',
    'anti_patterns',
  ]
status: complete
optimized_for_llm: true
generated_by: 'Paige (BMAD Tech Writer) — bmad-generate-project-context, headless mode'
source_doc_set: 'docs/index.md, architecture.md, project-overview.md, source-tree-analysis.md, component-inventory.md, development-guide.md, deployment-guide.md, asset-inventory.md, project-scan-report.json, deep-dive/<a..j>/'
---

# Project Context for AI Agents — `deepnest-next`

> Load-once-friendly distillation of `docs/` (DEE-11 deep-dive + DEE-45 DP). Scope: critical, **non-obvious** rules for code-touching agents. Read this file in full before editing code; defer to the linked doc only when you need details this file omits. Keep edits to this file lean — every line should prevent a real mistake.

---

## 1. What this codebase is (one paragraph for orientation)

`deepnest-next` is a community fork of the Deepnest 2D irregular bin-packing app for laser cutters / CNC / plotters. It is a **single Electron desktop app** (`appId: net.deepnest.app`, version `1.5.6`, MIT, `project_type_id: desktop`). Topology is **multi-process Electron with hidden background renderers** for compute offloading and a **native NFP add-on** (`@deepnest/calculate-nfp`). There is **no HTTP server, no database, no telemetry**. State lives in `userData/settings.json` + `userData/presets.json`; scratch in `os.tmpdir()/nest`. Outbound network: DXF→SVG conversion (`converter.deepnest.app`), notification poll, optional OAuth.

## 2. Technology stack (exact versions — pin when scaffolding)

| Category | Tech | Version | Notes |
|---|---|---|---|
| Runtime | Electron | `^40.0.0` | `nodeIntegration: true`, `contextIsolation: false`, `enableRemoteModule: true` (ADR-004) |
| Runtime | Node.js | `20.x` or `22.x` | CI matrix |
| Language | TypeScript | `^5.8.3` | strict mode, `target: es2023`, `lib: [ES2020, ES6, DOM]`, `outDir: ./build/` |
| Language | JavaScript (CommonJS) | — | Legacy core engine + worker code (no transpile) |
| UI templating | Ractive.js (0.x bundle) | vendored at `main/util/ractive.js` | Two-way bindings on `parts-view`, `nest-view` only |
| HTTP | axios | `1.13.2` | DXF converter round-trip only |
| Multipart | form-data | `4.0.5` | DXF converter upload |
| Filesystem | graceful-fs | `4.2.11` | drop-in `fs` |
| Markdown | marked | `17.0.1` | notification window only |
| Geometry (native) | `@deepnest/calculate-nfp` | `202503.13.155300` | NFP / Minkowski (C/C++ Node addon) |
| Geometry (native) | `@deepnest/svg-preprocessor` | `0.2.0` | SVG normalisation |
| IPC bridge | `@electron/remote` | `2.1.3` | exposes `remote.dialog`, `remote.getGlobal` to renderer |
| Packager | `@electron/packager` | `18.3.6` | `npm run dist` |
| Installer | `electron-builder` | `^26.4.0` | Win signing pipeline (Certum cert) |
| Test | `@playwright/test` | `^1.57.0` | Chromium-only, single E2E spec |
| Lint | ESLint + typescript-eslint | `^9.26.0` / `^8.32.0` | flat config (`eslint.config.mjs`) |
| Format | Prettier | `^3.5.3` | runs via lint-staged pre-commit |
| Hooks | husky + lint-staged | `^9.1.7` / `^15.5.2` | pre-commit hook runs Playwright too (per `docs/deep-dive/h/package.json.md`) |

**Compatibility constraints:**

- **Native modules must be rebuilt** against the active Electron ABI after every Electron upgrade. `npm run build` (= `tsc && electron-builder install-app-deps`) handles it; `postinstall` runs `electron-builder install-app-deps` automatically.
- Linux native build needs `apt-get install -yq libboost-dev`. macOS: `brew install boost`. Windows: VS 2022 with the *Desktop development with C++* workload + Python 3.7.9+ (disable the Windows App Installer Python alias).
- **No macOS CI runner.** macOS builds are local-only and **unsigned/unnotarised**.

## 3. Process / window topology — read before touching `main.js`

```
Electron Main Process  (main.js)
 ├── Main Renderer       — main/index.html → build/ui/index.js  (visible UI + GA orchestrator)
 ├── Background Renderer — main/background.html → build/background.js  (hidden, NFP placement, ×1)
 └── Notification Window — main/notification.html  (modal, on-demand)
```

- **Background worker count is currently hard-coded to 1** in `createBackgroundWindows()` (legacy was 8). To re-enable parallelism, also re-check the `background-start` round-robin matching in `main.js`.
- The notification window is created on demand and destroyed on close; it has **no shared CSS** with the main app (Arial only — webfont must be re-`<link>`-ed).
- All three renderers share `webPreferences: { contextIsolation: false, nodeIntegration: true, enableRemoteModule: true, nativeWindowOpen: true }`. **Any security hardening must touch every `BrowserWindow` constructor in `main.js`.**

## 4. Module boundaries — where new code goes vs. legacy

| Boundary | Path | Status | Touch policy |
|---|---|---|---|
| Main process | `main.js`, `presets.js`, `notification-service.js` | Legacy CommonJS at repo root | Edit, don't restructure. `notification-service.js` is at the **repo root**, not under `main/` (DEE-33 scope correction). |
| Modern UI | `main/ui/**/*.ts` | Strict TS, factory-function DI | **All new front-end code goes here.** |
| Legacy core engine | `main/deepnest.js`, `main/background.js`, `main/svgparser.js` | Legacy JS, no transpile, no unit tests | Edit carefully; verify with `npm test` + manual run. No tests below the UI. |
| Compiled TS engine | `main/nfpDb.ts` | Compiled TS, used by `main/background.js` via `build/` output | Compile-time-typed; preserve the `NfpCache` shape. |
| Vendored utilities | `main/util/clipper.js`, `simplify.js`, `interact.js`, `ractive.js`, `parallel.js`, `pathsegpolyfill.js`, `svgpanzoom.js` | Third-party ports | **Do not modify.** Update only by re-vendoring upstream. |
| First-party utils (typed) | `main/util/point.ts`, `vector.ts`, `matrix.ts`, `HullPolygon.ts`, `domparser.ts`, `eval.ts` | Strict TS | Extend here; don't extend the JS siblings. |
| First-party utils (untyped) | `main/util/geometryutil.js` | Legacy JS | Port-in-place to `.ts` if you have to change it. |
| Quarantine | `main/util/_unused/` | DEAD CODE | **Never import.** Re-importing requires a refactor + review. |
| Tests | `tests/index.spec.ts`, `tests/assets/` | Playwright E2E only | Single spec; assets coupled to literal counts (see §7). |
| Build helpers | `helper_scripts/` | Excluded from packaged app via `!{examples,helper_scripts}` in `build.files` | Do not import from runtime code. |

**Rule:** if a file is `.js` under `main/` (other than `main/ui/**`), assume it is loaded *directly* by Electron with no compile step. Stay on Node-supported syntax.

## 5. Composition root and DI pattern (UI side)

`main/ui/index.ts` is the **single seam** wiring services + components. There is **no DI container** — only plain factory functions:

- Services: `createConfigService`, `createPresetService`, `createImportService`, `createExportService`, `createNestingService`.
- Components: `createNavigationService`, `createPartsViewService`, `createNestViewService`, `createSheetDialogService`.
- Each takes its dependencies via the constructor object; tests today are E2E only because there is no stub layer.

**Rules:**

1. **Add new modules as `createX(deps)` factory functions** under `main/ui/services/` or `main/ui/components/`. Wire them in `main/ui/index.ts`.
2. **Do not introduce a DI container, decorators, or a class-based bootstrap.** The factory pattern is the convention.
3. Cross-module callbacks (`updatePartsCallback`, `displayNestFn`, `saveJsonFn`, `attachSortCallback`, `applyZoomCallback`, `resizeCallback`) are wired exclusively in `index.ts` — keep that file as the only seam.
4. **Services hold no DOM references.** Components hold DOM references and (for two only) Ractive instances.

## 6. IPC contract (`main/ui/types/index.ts` IPC_CHANNELS is canonical)

| Channel | Direction / kind | Payload | Persistence / notes |
|---|---|---|---|
| `background-start` | renderer → main → bg (`on`) | `{individual, sheets, ids, sources, children, filenames, sheetids, sheetsources, sheetchildren, config}` | Main routes to first idle bg window (`isBusy=false`) |
| `background-response` | bg → main → renderer (`on`) | placement result | Main matches sender; clears `isBusy` |
| `background-progress` | bg → main → renderer (`on`) | `{index, progress}` (negative = done) | Wrapped in try/catch — clean shutdown still TODO from cmidgley fork |
| `background-stop` | renderer → main (`on`) | none | Destroys all bg windows and recreates them |
| `read-config` | renderer → main (`handle`) | — → object | Reads `userData/settings.json`. **Rewrites legacy `convert.deepnest.io` → `converter.deepnest.app`** at read time. |
| `write-config` | renderer → main (`handle`) | stringified config | Verbatim write |
| `load-presets` / `save-preset` / `delete-preset` | renderer → main (`handle`) | preset CRUD | `userData/presets.json` (same URL rewrite) |
| `login-success` / `purchase-success` | renderer → main (`on`) | — | Forwarded to main window for cloud UI updates |
| `setPlacements` / `test` | renderer → main (`on`) | payload | Stashed on `global.exportedPlacements` / `global.test` for inspection |
| `get-notification-data` / `close-notification` | notification window only | — | Read content, mark seen, advance |

**Rules:**

1. **All IPC channel constants live in `main/ui/types/index.ts` (`IPC_CHANNELS`).** Adding a channel = touching both sides + adding the constant.
2. **`ConfigService` is the only sanctioned read/write path for user settings.** Never call `ipcRenderer.invoke('read-config'|'write-config')` from anywhere except `config.service.ts`.
3. **`NestingService` is the only module that talks to the background renderer.** Other services must not register `ipcRenderer.on('background-*')` handlers.
4. The `background-start` round-robin assumes `winCount = 1` today. If you add bg windows, re-verify the `isBusy` matching loop.

## 7. Data model invariants (`index.d.ts` is canonical)

- **`DeepNestConfig`** — algorithm + UX config (units, scale, spacing, rotations, populationSize, mutationRate, placementType, mergeLines, timeRatio, simplify, dxfImport/Export scale, endpointTolerance, conversionServer).
- **`UIConfig extends DeepNestConfig`** — adds `access_token`, `id_token`, `useSvgPreProcessor`, `useQuantityFromFileName`, `exportWithSheetBoundboarders` (typo is canonical), `exportWithSheetsSpace`, `exportWithSheetsSpaceValue`.
- **`Polygon extends Array<PolygonPoint>`** with `id`, `source`, `children` (holes/nested), `parent`, `filename`. **Polygons are arrays with extra props** — copying with `[...arr]` drops the metadata; use the explicit clone helpers.
- **`Part`** — `polygontree`, `svgelements`, `bounds`, `area`, `quantity`, `filename`, `sheet?`, `selected?`. A part with `sheet: true` is a bin, not a piece.
- **`NestingResult`** — `area`, `fitness`, `placements[]`. **Lower fitness is better** — the GA minimises.
- Globals on `window` (intentional, **do not add more** — ADR-005):
  - `window.config` — `ConfigObject` (UIConfig + sync getters)
  - `window.DeepNest` — `DeepNestInstance` (set by legacy `main/deepnest.js`)
  - `window.SvgParser` — `SvgParserInstance` (set by legacy `main/svgparser.js`)
  - `window.nest` — `RactiveInstance` (nest-view Ractive)
  - `window.loginWindow` — set by OAuth flow
- **Type gap**: `SvgParserInstance` is missing `transformParse` / `polygonifyPath` in `index.d.ts` even though `main/deepnest.js` calls them. Don't "fix" by removing the calls — extend the type instead (DEE-40 follow-up).

## 8. Cross-cutting behaviours that bite

1. **Internal store is inches.** `mm` is presented in the UI via `÷25.4` in `updateForm()` and `×25.4` on change. **Never double-convert.** Look at the existing guards in `initializeConfigForm()` before adding a new length field.
2. **Two scales coexist**: `config.scale` (SVG units) and `config.clipperScale` (`1e7`, for Clipper integer arithmetic). They are not interchangeable.
3. **NFP cache** (`main/nfpDb.ts`) lives **per background renderer** — adding a worker means adding a cache. Cache key shape: `{A,B,Arot,Brot,Aflip,Bflip}`. Reads/writes deep-clone defensively; don't bypass.
4. **Scratch dir** is `os.tmpdir()/nest` (override via `SAVE_PLACEMENTS_PATH`). Wiped on `app.before-quit`. NFP cache dir `os.tmpdir()/nfpcache` is also purged on quit; manual cleanup is needed if the app is killed.
5. **`EventEmitter.defaultMaxListeners = 30`** is set in `main.js`. If you wire many IPC listeners, stay under the cap or the warning will leak to users.
6. **Crash reporter is enabled but does NOT upload** (`uploadToServer: false`). Don't change without explicit privacy review.
7. **`mainWindow.webContents.setWindowOpenHandler(...)` rejects all `window.open`** and routes URLs to the OS shell. Rely on this — don't open new BrowserWindows for external URLs.

## 9. UI / asset binding invariants (from `docs/asset-inventory.md`)

1. **Icons are bound exclusively from `main/style.css`.** No JS/TS imports an icon URL. Renaming an icon = editing one CSS file.
2. **`spin.svg` is THE universal busy indicator.** Reuse it; don't add a second spinner glyph.
3. **`body.dark-mode` does NOT swap icon URLs.** It only repaints surrounding chrome. `_dark` / `_light` icon variants encode the **background surface**, not the theme — see `account_dark.svg` (top-nav, fixed dark surface) and `credits_light.svg` (`#nest` view, fixed light surface).
4. **Webfont family names are case-sensitive in `main/style.css`.** `LatoLatinWeb` ≠ `latolatinweb`; cascade silently degrades to OS fallback.
5. **`LatoLatinWeb` is a combined family** (Bold + Regular share one name with different `font-weight`s); **`LatoLatinWebLight` is a separate family**. Switching weight to Light requires changing `font-family`, not `font-weight`.
6. **Notification window is its own typography island.** Adding the webfont there requires a fresh `<link>` to `latolatinfonts.css` plus an explicit `font-family`.
7. **No icon font.** The earlier deepnest.io build had one; the current build uses individual SVG backgrounds. Reintroducing an icon font means rewriting every `background-image: url(img/...)` rule.
8. **`tests/assets/` is excluded from the installer** by `!test**` in `package.json` `build.files`. Keep test fixtures under `tests/`.
9. **Webfonts ship `woff2` + `woff` only.** Do not reintroduce `.eot` or `.ttf` `src:` URLs in `main/font/latolatinfonts.css` or sibling CSS. Electron is Chromium-only (ADR-001 + ADR-004); `.eot` was IE9 fallback, `.ttf` was secondary fallback — both removed in Story 1.1 (DEE-55). Adding a new webfont follows the same `{woff2, woff}` set: declare via `@font-face` in `main/font/`, listing both `format("woff2")` and `format("woff")` `src:` entries. Decision narrative + measurement in `docs/asset-inventory.md` §5 + §6 P4 + §8.

## 10. TypeScript / language rules

- **`tsconfig.json` is single-topology** (one config covers main, renderer, tests). No `tsconfig.app.json` / `tsconfig.node.json` / `tsconfig.test.json` exist (DEE-40 scope correction).
- `include: ["main/**/*.ts", "main/ui/**/*.ts"]` only. **The compiler does not touch `main.js`, `main/deepnest.js`, `main/background.js`, `main/svgparser.js`, or `main/util/*.js`.** Type info for those lives entirely in `index.d.ts` and `main/ui/types/index.ts` — keep them in sync when JS exports change.
- Strict bundle is on: `strict`, `noImplicitAny`, `strictNullChecks`, `strictFunctionTypes`, `noUnusedLocals`, `noUnusedParameters`, `noImplicitReturns`, `noFallthroughCasesInSwitch`. Don't `// @ts-ignore` — fix the type.
- `importHelpers: true` is set but `tslib` is **not** in `dependencies` — currently dormant under `target: es2023`. Don't lower the target without adding `tslib` (DEE-40 latent gotcha).
- `lib: ["ES2020", "ES6", "DOM"]` deliberately omits `ES2023` even though `target: es2023` — the lib/target mismatch is intentional; new ES2023+ runtime APIs need explicit type declarations.
- `experimentalDecorators: true` is on — use it sparingly; no transform pipeline for decorator metadata.
- **Imports**: ES module syntax in TS files; CommonJS `require()` in legacy JS. Don't mix in the same file.
- **Async**: prefer `async/await`. Wrap `ipcRenderer.invoke(...)` (request/response) calls; `ipcRenderer.send(...)` (fire-and-forget) for `on` channels.

## 11. ESLint / Prettier rules

- Flat config (`eslint.config.mjs`) — `@eslint/js` recommended + `typescript-eslint` recommended.
- **Load-bearing rule**: `**/*.js` is in the **global ignore** — this **grandfathers the legacy renderer and `main/util/*.js`**. Never remove the `**/*.js` ignore without a per-file migration plan.
- **Type-aware rules are off** (no `parserOptions.project`). Keep them off until the TS surface is significantly larger; turning them on will drown CI in legacy noise.
- Four in-tree `eslint-disable` sites — all documented in `docs/deep-dive/h/eslint.config.mjs.md`. Don't add new disables without checking that file first.
- **Prettier runs only via lint-staged.** `npm run lint` does **not exist**. Outside the staged set, run `npx eslint .` / `npx prettier --check .` manually.
- Pre-commit hook is `husky` → `lint-staged` → `prettier --write && eslint --fix && git add` over `**/*.{ts,html,css,scss,less,json}`. **The pre-commit hook also runs the full Playwright Electron E2E suite on every commit** (DEE-40 finding). Expect commits to take a while; never `--no-verify`.

## 12. Testing rules

- **E2E only.** Single spec: `tests/index.spec.ts` (`test("Nest", …)` — Config → Import → Sheet → Nest → Export).
- **Playwright config** (`playwright.config.ts`):
  - `headless: false` (Electron app launches via Playwright)
  - `video: 'on'` locally / `'retain-on-failure'` in CI; `screenshot: 'on'`; `trace: 'on-first-retry'`
  - CI: `forbidOnly`, `retries: 2`, `workers: 1`
  - Single `chromium` project
  - `webServer` and `dotenv` blocks are **commented out on purpose** — don't reintroduce without reading `docs/deep-dive/h/playwright.config.ts.md`.
- **Test-fixture coupling** (DEE-42 invariant): the `tests/assets/` directory is enumerated dynamically. Adding / removing / re-encoding a fixture requires re-deriving **two literal assertions** in the spec:
  - `#importsnav li` count (currently `2`, lines ~132)
  - placement count (currently `54/54`, lines ~185–186)
- **Add new tests via `npm run pw:codegen`** (or `node ./helper_scripts/playwright_codegen.js`), then prune boilerplate into `tests/`.
- **There is no unit-test runner.** Anything below the UI (NFP cache, SVG parsing, GA fitness, IPC payload shapes) is reachable only via E2E — treat as coverage debt; do not pretend it is covered.

## 13. Build, run, distribute

| Command | What it does |
|---|---|
| `npm install` | Installs deps + runs `electron-builder install-app-deps` (postinstall) — rebuilds native modules against Electron ABI |
| `npm run start` | `electron .` |
| `npm run build` | `tsc && electron-builder install-app-deps` |
| `npm test` | Playwright E2E (Chromium) |
| `npm run pw:codegen` | Launch Playwright codegen against running Electron |
| `npm run dist` | `@electron/packager` → `./deepnest-v${version}-win32-${arch}/` |
| `npm run build-dist` / `build-dist-signed` | `electron-builder build --win` (signed) |
| `npm run dist-all` / `dist-all-signed` | clean-all + install + build + dist |
| `npm run clean` / `clean-all` | **Windows-only `rmdir /s /q`** — on Linux/macOS use `rm -rf build dist [node_modules bin]` manually |

**Distribution facts:**

- Signed Windows installer requires the **Certum cert (SHA-1 thumbprint hard-coded in `helper_scripts/sign_windows.js`)** in the local Windows certificate store + signtool at `process.env.SIGNTOOL_PATH` or `C:\Program Files (x86)\Windows Kits\10\bin\10.0.22621.0\x64\signtool.exe`. The signer **only signs `.exe`/`.dll`/`.node`** despite `signExts` listing more.
- **macOS / Linux release binaries are unsigned.** Gatekeeper blocks macOS first-run; users must `xattr -d com.apple.quarantine` or right-click → Open.
- **No auto-update** is configured (no `electron-updater`).
- `package.json` `files` (npm-pack scope): `main.js, main/**/*, index.d.ts, node_modules, package.json, icon.icns, icon.ico`.
- `build.files` (electron-builder) excludes `!**/test*`, `!**/*.ts`, `!{examples,helper_scripts}`, dotfiles, dev configs.

## 14. Network surface (be explicit when adding new endpoints)

- Outbound HTTPS POST to `https://converter.deepnest.app/convert` for DXF↔SVG. Configurable via `config.conversionServer`. Multipart upload, response is converted SVG.
- Notification poll: `notification-service.js` checks the remote endpoint **every 30 minutes** (initial check after 3-second startup delay). Dedupes by UUID against `userData/seen-notifications.json`.
- OAuth login: opens an external browser window; receives `login-success` IPC payload from the redirect handler.
- **No telemetry, no crash upload, no analytics.** Don't add any without explicit privacy review.

## 15. Common workflows (cheat sheet — agent must follow)

### Add a new config option

1. Extend `DeepNestConfig` in `index.d.ts` (and `UIConfig` in `main/ui/types/index.ts` if UI-only).
2. Add the default in `main/ui/services/config.service.ts`.
3. Add the form input to `main/index.html` with `data-config="<key>"` (and `data-conversion="true"` if it's a length).
4. If the field is a checkbox, add the key to `BOOLEAN_CONFIG_KEYS` in `config.service.ts`.
5. Verify by toggling in the UI; reopen the app; `userData/settings.json` should round-trip.

### Add a new IPC channel

1. Decide who owns persistence (main) vs. fan-out (renderer ↔ background).
2. Add the channel name to `IPC_CHANNELS` in `main/ui/types/index.ts`.
3. Register `ipcMain.on(...)` (fire-and-forget) or `ipcMain.handle(...)` (request/response) in `main.js`.
4. Call from a service via `ipcRenderer.send(...)` / `await ipcRenderer.invoke(...)`. **Don't call from a component.**
5. For background fan-out, follow the existing `background-start` / `background-response` round-robin pattern.

### Add a new export format

1. Implement the producer in `main/ui/services/export.service.ts`.
2. Add a button in `main/index.html` with a unique id.
3. Bind it in `initializeExportButtons()` in `main/ui/index.ts`.

### Tune the placement algorithm

- Greedy core: `main/background.js`. GA outer loop: `main/deepnest.js`. **Treat them as a connected pair** — changes to one frequently require IPC contract edits.

### Add a new UI feature

- Read `docs/component-inventory.md`. Use the factory-function pattern (`createX(deps)` in `main/ui/services/` or `main/ui/components/`) and wire in `main/ui/index.ts`. Don't expand Ractive usage beyond the existing two views (ADR-006).

### PR merge gate (Copilot wait + revise)

**Scope:** every PR opened against `Dexus-Forks/deepnest-next` — feature PRs, BMad / planning-artifact auto-merge PRs, and TEA Phase-5 closer PRs alike. CEO policy DEE-113: no carve-outs.

**Why:** PRs #21–#28 merged with empty `reviewDecision` — Copilot review was either skipped or never landed. That destroys the review/revise feedback loop and lets broken changes ship. The §16 anti-pattern checklist alone is too narrow to substitute for substantive logic review.

**Observed Copilot bot behaviour on this repo (DEE-115 dogfood, 9-PR audit + multi-cycle review on the SOP PR itself + DEE-114 confirmation):**

- `copilot-pull-request-reviewer[bot]` (numeric user id `175728472`) **never emits `state == "APPROVED"` organically** — it only ever submits `COMMENTED` reviews, even when all threads are resolved and there is nothing further to flag. PRs #21–#30 + #32 + #33 all confirm. DEE-114's `Copilot review` status check accepts **any** review state for this reason.
- Copilot only re-reviews on **explicit trigger** (`@copilot review` PR comment) or on its own **"Potential fix for pull request finding" auto-push commits** — it does NOT auto-re-review on every push. Plan re-trigger explicitly after pushing fixes.
- Copilot may auto-push 1+ "Potential fix for pull request finding" commits to the PR branch in response to its own findings. These are co-authored "Copilot Autofix powered by AI" commits and may add new threads. Treat them like any other Copilot threads: validate → fix-or-accept → reply → resolve.

These behaviours shape the merge gate below (step 5). They are not aspirational — they are what the bot actually does, confirmed by both this SOP's dogfood audit and DEE-114's parallel investigation.

1. **Open the PR.** `gh pr create …` (or, for artifact PRs, after the auto-merge flip is queued).
2. **Poll for the Copilot review.** `gh pr view <n> --json reviews,reviewDecision` — repeat until a Copilot review record from `copilot-pull-request-reviewer[bot]` appears.
3. **Stall handling.** If Copilot has not posted **its first review** within ~30 min, post a stall comment on the PR **and** the parent issue, and escalate to the issue owner. Do not merge while waiting. (The 30-min threshold applies only to the *first* review — subsequent re-reviews require an explicit `@copilot review` trigger and are not on the same SLA.)
4. **Walk every Copilot comment thread.** Per the existing PR review-thread workflow (`validate → fix → reply → resolve`):
   - Validate the finding (VALID / INVALID / DEFER).
   - For VALID: push the fix on the same branch. After pushing fixes, post a `@copilot review` PR comment to explicitly request a re-review (Copilot does NOT re-review on push alone).
   - Reply on the specific thread (not just a top-level comment) citing the fix commit.
   - Resolve the thread when no further discussion is needed (`resolveReviewThread` GraphQL mutation or the "Resolve conversation" button).
   - For INVALID / DEFER: reply with the reasoning (cite source / out-of-scope rationale). Resolve the thread only on **one** of (a) reviewer acknowledgement (e.g. Copilot replies confirming, or a follow-up Copilot review no longer raises the point), (b) a 24 h SLA from the reply with no counter-response, or (c) a documented DEFER follow-up issue id linked in the resolving comment. Do not resolve INVALID/DEFER threads silently — the resolving comment must name the basis (a/b/c). This rule prevents the merge gate (step 5) from deadlocking on standing INVALID threads.
   - For **Copilot "Potential fix" auto-push commits** that landed on the branch: review the diff like any other commit; if acceptable, leave it; if it conflicts with intent, revert it in a follow-up commit and reply on the originating thread explaining why. Either way, the resulting threads must reach resolved per the rules above.
5. **Merge gate.** Merge is permitted **only** when **all three** conditions hold:
   - **DEE-114 `Copilot review` status check is `success`.** This is the canonical, server-enforced gate (`.github/workflows/copilot-review-gate.yml` re-pends on push and flips to success once Copilot posts a review on the current head SHA, **any state**). Verify via `gh pr view <n> --json statusCheckRollup --jq '.statusCheckRollup[] | select(.name == "Copilot review")'`. The branch-protection rule blocks the merge button until this is green; do not bypass via merge-queue or admin override.
   - **Every Copilot review thread is resolved** (per step 4 — including the explicit basis for any INVALID/DEFER resolutions, and including any threads added by Copilot "Potential fix" auto-pushes). DEE-114's status check does NOT enforce conversation-resolution (GitHub branch protection has no required-resolution mode for bot reviewers); this remains agent-side discipline.
   - **Quiet window: no new Copilot comment, review, or auto-push commit in the last 10 min.** Guards against merging mid-stream while Copilot is still posting follow-up findings or "Potential fix" commits. Verify with the timestamp of the most recent Copilot review, comment, or Copilot-authored commit on the PR branch (e.g. `gh pr view <n> --json commits --jq '.commits[] | select(.authors[].login == "copilot-pull-request-reviewer[bot]") | .committedDate'`).

   **Review state is NOT checked.** `copilot-pull-request-reviewer[bot]` returns `COMMENTED` even when satisfied (see "Observed Copilot bot behaviour" above). DEE-114 explicitly accepts any review state for the same reason. Requiring `state == "APPROVED"` would be an unattainable gate (this was the round-2 bug surfaced by DEE-115's own dogfood and corrected here).
6. **No carve-outs.** Auto-merge for BMad / planning-artifact PRs spares **human** approval only — it does NOT skip the Copilot wait + revise loop. TEA closer PRs follow the same gate (see §19).

**Anti-pattern.** Direct-merging while the DEE-114 `Copilot review` status check on the PR head SHA is anything other than `success` (i.e., Copilot has not yet reviewed the current head SHA), or while any Copilot review thread is still unresolved, is a policy violation — even when the §16 anti-pattern checklist is fully ticked. The checklist is necessary, not sufficient.

**Cross-references.**
- Repo-side enforcement: `.github/branch-protection.json` (`Copilot review` required status check) + `.github/workflows/copilot-review-gate.yml` (status publisher) — landed as **DEE-114** (CTO / Cloud Dragonborn). The status check is the canonical gate; everything in step 5 above is the agent-side pre-flight discipline that mirrors it.
- Per-thread workflow detail: see the auto-memory entry "PR review-thread workflow (validate → fix → reply → resolve)".
- Copilot bot behaviour audit: see the auto-memory entry "Copilot PR Reviewer never APPROVES on this repo" (added by DEE-115 dogfood).
- §19 (Phase-5 SOP) — closer PRs follow this same gate.

## 16. Critical anti-patterns — DO NOT do these

1. **Do NOT** add a new global on `window` (only the four declared in `index.d.ts` are sanctioned — ADR-005).
2. **Do NOT** call `ipcRenderer.invoke('read-config'|'write-config')` outside `config.service.ts`. Use `ConfigService.getSync` / `setSync`.
3. **Do NOT** register `background-*` IPC handlers outside `nesting.service.ts`.
4. **Do NOT** add a new UI framework. Plain DOM + the existing service layer; Ractive stays on the existing two views.
5. **Do NOT** modify vendored utilities in `main/util/` (`clipper.js`, `simplify.js`, `interact.js`, `ractive.js`, `parallel.js`, `pathsegpolyfill.js`, `svgpanzoom.js`) — re-vendor instead.
6. **Do NOT** import from `main/util/_unused/`.
7. **Do NOT** introduce a TypeScript decorator transform pipeline; `experimentalDecorators` is on but no metadata transformer is wired.
8. **Do NOT** `// @ts-ignore` to silence strict-mode errors. Fix the type — the legacy ambient declarations are in `index.d.ts` / `main/ui/types/index.ts`.
9. **Do NOT** use `--no-verify` to skip the pre-commit hook. The hook runs lint-staged + the full Playwright suite; a failing commit is a real signal.
10. **Do NOT** drop or re-encode `tests/assets/*.svg` without re-deriving the two literal assertions in `tests/index.spec.ts`.
11. **Do NOT** double-convert mm/inch — internal store is inches. Use existing guards in `initializeConfigForm()`.
12. **Do NOT** open external URLs by spawning a `BrowserWindow`; the `setWindowOpenHandler` already routes them to the OS shell.
13. **Do NOT** add an HTTP server, telemetry, or persistent database — this is a desktop app with local JSON state.
14. **Do NOT** assume the Windows `clean` / `clean-all` scripts work on Linux/macOS — they use `rmdir /s /q`. Use `rm -rf` manually.
15. **Do NOT** remove `**/*.js` from the ESLint global ignore without a per-file migration plan.
16. **Do NOT** add a new spinner glyph; reuse `spin.svg`.
17. **Do NOT** force-push a closer PR with a no-op diff after `main` has advanced past its base — close the local branch as superseded instead (see §19).

## 17. Brownfield caveats (what AI agents repeatedly trip on)

- **Mixed module systems**: `main.js` + `main/deepnest.js` + `main/background.js` + `main/util/*.js` are CommonJS. `main/ui/**` is ES modules (TS output). They coexist via Electron's `nodeIntegration: true` + explicit `require()`.
- **Mixed style enforcement**: ESLint/Prettier only fire via lint-staged. Older files (especially `main/util/*.js`) are intentionally untouched — treat as vendored.
- **Active rewrites**: README announces ongoing migration of compute-heavy code from C/C++ to **Rust** in the `@deepnest/*` packages (out of this repo). Architecture boundaries with this repo will keep shifting; pin versions in `package.json` and re-verify after each `@deepnest/*` bump.
- **README claims `npm test` is Playwright** — confirmed; but no unit test layer exists below the UI.
- **`CHANGELOG.md` last updated 2023.** Current release notes live on GitHub Releases.
- **Worker shutdown TODOs** (×2) in `main.js` around `background-response` / `background-progress` — exceptions are swallowed on app close. Inherited from the cmidgley fork.

## 18. Open questions / known concerns to flag downstream (CP / CA / CE inputs)

These are **not blockers** for the GPC → CP → VP → CA → CE chain, but downstream skills should know about them:

1. **Asset-cleanup epic candidate** (DEE-45 follow-up): five unused icons (`auth0logo.svg`, `background.png`, `logo.svg`, `progress.svg`, `stop.svg`, ~32 KB) and the dead-weight Lato kit (`LatoLatin-BoldItalic.*`, demo specimen pages, `.eot`/`.ttf` for live weights, ~1.57–2.27 MB potential saving). Zero-to-low risk.
2. **Asset-licence paperwork**: `tests/assets/*.svg` are derived from Google Fonts (SIL Open Font License). No `tests/assets/README.md` or `LICENSES.md` entry records this — paperwork gap.
3. **Test-fixture integrity check**: `tests/assets/` ↔ `54/54` placement coupling is implicit. A checksum / snapshot would make it explicit.
4. **Background-worker shutdown** (`main.js` `// todo:` ×2): re-enabling parallelism (>1 bg window) is gated on this fix.
5. **`SvgParserInstance` type gap**: `transformParse` / `polygonifyPath` are called but not declared.
6. **Permissive renderer security** (ADR-004): `nodeIntegration: true` + `contextIsolation: false` + `enableRemoteModule: true` is intentional but every renderer entry point would need to change to harden — flag for any new feature that loads untrusted content.
7. **Re-skin pipeline for `icon.{icns,ico}`**: no committed source SVG; re-skinning is out-of-tree.

## 19. bmad Phase-5 SOP — TEA closer PR pre-flight (rebase before opening)

**Scope:** TEA agents (Murat, deputies) opening a Phase-5 closer PR (`tea/*` branch with traceability artefacts, gate decision, NFR evidence, sprint-status flips, or post-merge review-board reports).

> **Copilot wait + revise applies (no Phase-5 carve-out).** TEA closer PRs are NOT exempt from §15 "PR merge gate (Copilot wait + revise)". After the pre-flight rebase + `gh pr create`, the closer PR follows the same Copilot wait → walk threads → resolve → merge-only-on-APPROVED gate as feature PRs and BMad/artifact auto-merge PRs (CEO policy DEE-113). The "auto-merge convenience" for closer PRs spares human approval, not the Copilot review.

**Why this exists.** Phase-5 wakes can run >1 merge cycle. PRs opened against a stale `main` HEAD go DIRTY when sibling work lands first (Story 2.2 collision: `tea/DEE-101-story-2-2-trace` vs merged PR #26 — see `_bmad-output/bmad-phase-5-index.md` and DEE-102 / DEE-106). The pre-flight makes the rebase a deterministic step instead of a manual recovery.

### Pre-flight (mandatory before `gh pr create`)

1. `git fetch origin main` — refresh the merge base.
2. `git rebase origin/main` — replay the closer commits on the latest main.
3. Resolve conflicts:
   - **Substantive conflict** (real merge of work): resolve in-place, re-run the verification commands implied by the dispatching story's TASK / acceptance criteria (e.g. `npm test`, `bmad-testarch-trace` re-derive), then continue the rebase.
   - **Add/add on the same artefact path** (e.g. another wake already merged the same trace bundle): if the rebase reveals that the canonical artefact already landed in `main`, **close the local branch as superseded — do NOT force-push a no-op PR**. Document the supersession in the dispatching issue's comment thread with the merged PR number.

### Superseded-close branch (when the rebase reveals redundant work)

1. `git rebase --skip` past the redundant commit(s) until `git status` is clean.
2. Confirm the canonical artefacts already live on `main`: `git log origin/main -- <artefact-paths>`.
3. If the local branch carries no surviving commits, delete it: `git branch -D <branch>` + `git push origin --delete <branch>` (only when the branch was already pushed).
4. If a stale PR exists, close it via `gh pr close <n> --comment "superseded by #<canonical>"` — **do not** force-push a no-op revision.
5. Post a comment on the dispatching issue linking the canonical PR + noting the supersession; the issue moves to `done` on the canonical merge, not on the local branch.

**Anti-pattern.** Force-pushing a closer PR after `main` has advanced past its base, when the local diff is already in `main`, produces a no-op PR that drowns reviewer signal and re-triggers CI for nothing. Close as superseded instead.

### Cross-references

- Story 2.2 collision precedent: PR #25 (closed superseded) vs PR #26 (canonical, merged at `7f75bf9`).
- Routing-layer dedupe key (Fix #1, DEE-103) — runtime guard against twin wakes.
- Branch protection require-up-to-date (Fix #2, DEE-105) — repo-side enforcement once configured.
- Phase-5 dispatch filing-time guard (Fix #3, DEE-104) — prevents twin issues at filing time.
- This SOP (Fix #4, DEE-106) — agent-side pre-flight; complements but does not replace Fixes #1–#3.

### Index

The Phase-5 SOP set is indexed at `_bmad-output/bmad-phase-5-index.md` (see Reference map). Add new Phase-5 SOPs there alongside this section.

---

## Reference map (when this file is not enough)

| If you need… | Read |
|---|---|
| The big picture / where to start | `docs/index.md` |
| Architecture diagrams + ADRs | `docs/architecture.md` |
| Repo navigation / where things live | `docs/source-tree-analysis.md` |
| UI service / component surface | `docs/component-inventory.md` |
| Setup, build, debug, troubleshoot | `docs/development-guide.md` |
| Distribution + signing pipeline | `docs/deployment-guide.md` |
| Asset surface (icons / fonts / fixtures) | `docs/asset-inventory.md` |
| Per-file deep-dive | `docs/deep-dive/<a..j>/` (10 groups, all complete and merged) |
| File-level scan output (machine-readable) | `docs/project-scan-report.json` |
| bmad Phase-5 SOP set (TEA closer PR rules) | `_bmad-output/bmad-phase-5-index.md` |

---

## Usage Guidelines

**For AI Agents:**

- Read this file before implementing any code. Treat §16 (anti-patterns) as a hard veto list.
- When in doubt, prefer the more restrictive option (don't add globals, don't add IPC channels without `IPC_CHANNELS`, don't `--no-verify`).
- Update this file when a rule changes; do not duplicate the rule into individual stories.

**For Humans:**

- Keep this file lean. Every line should prevent a real mistake.
- Update when the technology stack, IPC contract, or composition pattern changes — those three sections are highest-value.
- Re-derive when DEE-44's downstream chain (CP / VP / CA / CE) lands material new constraints.

_Last updated: 2026-04-26 (Wes, DEE-115 follow-up — Path A revision: §15 step 5 NO LONGER requires `state == APPROVED` from Copilot since `copilot-pull-request-reviewer[bot]` only ever emits `COMMENTED` on this repo (DEE-115 dogfood + DEE-114 confirmation across PRs #18–#33). New gate: DEE-114 `Copilot review` server-enforced status check + all threads resolved + 10-min quiet window. Adds explicit `@copilot review` re-trigger requirement (Copilot does not re-review on push alone) and "Potential fix" auto-push handling. Now references DEE-114 (landed) instead of as planned. Prior: Wes, DEE-115 — added §15 SOP + §19 closer-PR clause; Murat, DEE-106 — Phase-5 SOP for TEA closer PR pre-flight + §16 #17 force-push veto.)._
