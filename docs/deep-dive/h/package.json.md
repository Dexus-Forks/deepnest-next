# `package.json` — Deep Dive

**Generated:** 2026-04-26 by Paige (Tech Writer) for [DEE-40](/DEE/issues/DEE-40) (parent: [DEE-11](/DEE/issues/DEE-11), supersedes DEE-29).
**Group:** H — build / config / quality.
**File:** `package.json` (153 LOC, project root).
**Mode:** Exhaustive deep-dive.

## 0. Scope corrections (verified vs DEE-11)

The DEE-11 parent inventory expects a separate `electron-builder.json`. **It does not exist.** The full electron-builder configuration lives in this file's `build` block (lines 85–146) and is fully reproduced in §4 below. Any future deep-dive sweep that adds a top-level `electron-builder.json` to its file list must remove that entry until such a file is actually introduced.

There is also no `.npmrc`, no `.nvmrc`, no `engines` block, and no `packageManager` field. Node-version selection is left to the developer; CI relies on its own GitHub Actions matrix (out of scope here — see Group A's CI write-ups for that side).

## 1. Purpose

Single source of truth for:

1. **NPM scripts** that drive every developer flow (`start`, `test`, `build`, `dist*`).
2. **Direct dependency declarations** for both runtime (`dependencies`) and tooling (`devDependencies`).
3. The **electron-builder distribution config** (the `build` block) — which artefacts ship, where they go, how they get signed, and which OS targets are emitted.
4. The **Husky / lint-staged pre-commit pipeline** that enforces formatting and linting before any commit lands.
5. The metadata that `main.js`, the about box and electron-builder all read at runtime: `name`, `version` (1.5.6), `description`, `main` (`main.js`), `types` (`index.d.ts`), `license` (MIT), `repository`, `funding`, `contributors`.

Everything in this file is intentionally flat — there is no `workspaces`, no `private` monorepo layout (the `"private": true` flag is purely to block accidental `npm publish`). The runtime entry is `main.js` (line 6); the type entry is `index.d.ts` (line 7, deep-dived in [`index.d.ts.md`](./index.d.ts.md)).

## 2. NPM scripts

The `scripts` block (lines 15–31) covers ten entry points. Pre/post hooks are spelled out so future readers can predict what `npm install` actually triggers.

| Script | Command | When to use it | Pre/post |
|---|---|---|---|
| `start` | `electron .` | Local launch against the source tree (no build needed — Electron loads `main.js` directly and the renderer transpiles via `tsc` under `npm run build`). | none |
| `printenv` | `cross-replace node -e "console.log(process.env)"` | Debug helper; prints the full env at the time of invocation. The `cross-replace` wrapper normalises Windows-vs-POSIX env-var syntax inside the embedded Node one-liner. | none |
| `test` | `playwright test` | Run the Playwright Electron E2E suite. Picks up [`playwright.config.ts`](./playwright.config.ts.md) automatically. Also invoked by the [Husky pre-commit hook](#5-husky--lint-staged-pre-commit-pipeline) — every commit runs the full test suite. | none |
| `build` | `tsc && electron-builder install-app-deps` | Standard developer build. Runs the TypeScript compiler with [`tsconfig.json`](./tsconfig.json.md) (output → `./build`), then has electron-builder rebuild any native modules against the active Electron ABI. Required after dependency changes; otherwise `tsc` alone is enough. | none |
| `clean` | `rmdir /s /q build dist >nul 2>&1\|echo . >nul` | **Windows-only.** Deletes `build/` and `dist/`. The `\|echo . >nul` swallow is the cmd.exe equivalent of `\|\| true`. POSIX users have to delete the dirs manually. | none |
| `clean-all` | `rmdir /s /q build dist node_modules bin >nul 2>&1\|echo . >nul` | **Windows-only.** Same as `clean` but also wipes `node_modules` and `bin`. Used by `dist-all*` scripts. | none |
| `dist` | `cross-replace npx @electron/packager . deepnest-v$npm_package_version --overwrite --ignore=...` | Pack the app via `@electron/packager` into `deepnest-v<version>` (no installer; just a packaged dir). The long `--ignore` chain excludes dev-only paths (`.github`, `.vscode`, `.husky`, prior pack outputs, examples, helper scripts, playwright reports, `test.log`). `cross-replace` rewrites `$npm_package_version` so the same script works on Windows. | none |
| `build-dist` | `electron-builder build --win` | Run electron-builder using the `build` block in this file. Targets only Windows (`--win`). Output dir resolves from the `build.directories.output` template — `deepnest-v<version>-win32-<arch>`. | none |
| `build-dist-signed` | `electron-builder build --win --publish never` | Same as `build-dist` but explicitly disables auto-publish. Use this when iterating locally on signed builds without uploading to a release channel. | none |
| `dist-all` | `npm run clean-all && npm install && npm run build && npm run dist` | Full reproducible packager build from a clean tree. **Requires Windows** (chains `clean-all`). | none |
| `dist-all-signed` | `npm run clean-all && npm install && npm run build && npm run build-dist-signed` | Full reproducible signed electron-builder build from a clean tree. **Requires Windows.** | none |
| `prepare` | `husky \|\| true` | Auto-runs after `npm install` (npm lifecycle hook). Installs the `.husky` git hooks. The `\|\| true` is a guard for fresh clones where Husky isn't yet on disk. | npm-managed `prepare` lifecycle |
| `precommit` | `lint-staged` | Invoked by `.husky/pre-commit`. Runs `lint-staged` against the staged files only (rules in lines 37–43). | runs from git pre-commit hook |
| `postinstall` | `electron-builder install-app-deps` | Auto-runs after `npm install` (npm lifecycle hook). Rebuilds native modules against the installed Electron ABI. **This is why `npm install` is sometimes much slower than expected** — native rebuilds for `@deepnest/calculate-nfp` etc. can take minutes. | npm-managed `postinstall` lifecycle |
| `pw:codegen` | `node helper_scripts/playwright_codegen.js` | Launch the Playwright Inspector for manual recording of new E2E spec scaffolding. Wraps the `_electron` launcher and pauses with `.pause()` so the inspector window appears. | none |

### 2.1 Script dependency graph

```
npm install
  ├─► prepare    : husky install
  └─► postinstall: electron-builder install-app-deps   (native rebuild)

git commit
  └─► .husky/pre-commit
        ├─► npx lint-staged   (prettier --write + eslint --fix on **/*.{ts,html,css,scss,less,json})
        └─► npm test          (full Playwright E2E suite — see §5 for the surprise)

npm run dist-all-signed
  └─► clean-all → install → build → build-dist-signed
                  └─► tsc + install-app-deps
                                   └─► electron-builder build --win --publish never
```

### 2.2 Cross-platform notes

- `clean`, `clean-all`, `dist-all`, `dist-all-signed` use cmd.exe builtins (`rmdir /s /q`, `>nul 2>&1`) and **are not portable to bash/zsh.** Linux/macOS contributors must do the cleanup by hand or write a local replacement.
- `dist`, `printenv` use `cross-replace` to translate `$VAR` into the right per-platform syntax. These stay portable.
- `build`, `test`, `start`, `pw:codegen`, `build-dist*` all run identically on every OS.

## 3. Husky + lint-staged pre-commit pipeline

Three blocks combine to form the pre-commit pipeline:

### 3.1 `husky` block (lines 32–36)

```json
"husky": {
  "hooks": {
    "pre-commit": "lint-staged"
  }
}
```

This is **legacy Husky v4 config** that newer Husky versions (>= 9, declared at `^9.1.7`) ignore in favour of files inside `.husky/`. The actual hook on disk is `.husky/pre-commit`, which contains:

```
npx lint-staged
npm test
```

The literal `npm test` line means **every commit attempts to run the full Playwright E2E suite**. This is significantly heavier than typical pre-commit pipelines and is documented as a known gotcha in §6.

### 3.2 `lint-staged` block (lines 37–43)

```json
"lint-staged": {
  "**/*.{ts,html,css,scss,less,json}": [
    "prettier --write",
    "eslint --fix",
    "git add"
  ]
}
```

Runs Prettier (no project-level `.prettierrc` exists — Prettier falls back to its defaults plus `.editorconfig` overrides for `indent_size = 2`, `end_of_line = lf`, `charset = utf-8`, `trim_trailing_whitespace = true`, `insert_final_newline = true`) and then ESLint (using [`eslint.config.mjs`](./eslint.config.mjs.md)) on every staged file matching the glob. The `git add` step at the end re-stages files modified by `prettier --write` / `eslint --fix` so the committed snapshot already includes the auto-fixes.

The glob notably **excludes `.js` and `.mjs`** — the eslint flat config explicitly ignores those (`{ignores:['**/*.js', '**/node_modules/**']}` in [`eslint.config.mjs`](./eslint.config.mjs.md) line 9), and Prettier doesn't get a chance to touch JS either. That keeps `main/util/*.js` and the legacy `main/deepnest.js` / `main/svgparser.js` outside the auto-format pipeline.

## 4. electron-builder `build` block (lines 85–146)

There is no separate `electron-builder.json`. The whole config lives here.

```json
"build": {
  "appId": "net.deepnest.app",
  "copyright": "2026 deepnest-next Community",
  "nodeGypRebuild": false,
  "files": [
    "**/*",
    "build/**/*.js",
    "!**/deepnest-v*",
    "!**/out",
    "!**/playwright-*",
    "!**/test*",
    "!**/*.ts",
    "!**/node_modules/*/{CHANGELOG.md,README.md,README,readme.md,readme}",
    "!**/node_modules/*/{test,__tests__,tests,powered-test,example,examples}",
    "!**/node_modules/*.d.ts",
    "!**/node_modules/.bin",
    "!**/*.{iml,o,hprof,orig,pyc,pyo,rbc,swp,csproj,sln,xproj}",
    "!.editorconfig",
    "!**/package-lock.json",
    "!test**",
    "!.readthedocs.yaml",
    "!**/._*",
    "!{examples,helper_scripts}",
    "!**/{.DS_Store,.git,.hg,.svn,CVS,RCS,SCCS,.gitignore,.gitattributes}",
    "!**/{__pycache__,thumbs.db,.flowconfig,.idea,.vs,.vscode,.husky,.nyc_output}",
    "!**/{appveyor.yml,.travis.yml,circle.yml}",
    "!**/{npm-debug.log,yarn.lock,.yarn-integrity,.yarn-metadata.json}"
  ],
  "directories": {
    "app": ".",
    "output": "deepnest-v${version}-win32-${arch}"
  },
  "win": {
    "target": ["dir", "zip"],
    "icon": "icon.ico",
    "artifactName": "${name}-v${version}-win32-${arch}.${ext}",
    "signAndEditExecutable": true,
    "forceCodeSigning": true,
    "signExts": [".node", ".exe", ".dll", ".sys", ".msi", ".appx", ".appxbundle"],
    "signtoolOptions": {
      "sign": "./helper_scripts/sign_windows.js",
      "signingHashAlgorithms": ["sha256"]
    }
  },
  "mac": {
    "category": "public.app-category.utilities",
    "icon": "icon.icns"
  }
}
```

### 4.1 Top-level fields

| Field | Value | Effect |
|---|---|---|
| `appId` | `net.deepnest.app` | macOS bundle identifier, Windows AppUserModelID. Survives renames of the `name` field. |
| `copyright` | `2026 deepnest-next Community` | Embedded in the Win32 file metadata via electron-builder. |
| `nodeGypRebuild` | `false` | Disables electron-builder's automatic node-gyp rebuild step — the `postinstall` script already runs `electron-builder install-app-deps` for native deps. Keeping both on would double-rebuild. |
| `files` | see listing above | The whitelist + exclusion chain that decides what ends up in the packaged ASAR. |
| `directories.app` | `.` | Source root for the app payload is the project root. |
| `directories.output` | `deepnest-v${version}-win32-${arch}` | Output dir is templated with the version + arch — every build lands in its own folder, no overwrite of prior artefacts. |

### 4.2 The `files` whitelist — what actually ships

The `files` array is electron-builder's content filter — anything not matching is excluded. Only Windows-relevant excludes are listed; the principles:

1. **Includes**: the entire repo (`**/*`) plus the build output (`build/**/*.js` — the TypeScript-emitted files that `tsc` writes during `npm run build`).
2. **Excludes the prior packager outputs** (`!**/deepnest-v*`, `!**/out`) so a re-pack doesn't recursively swallow itself.
3. **Excludes the test surface** (`!**/playwright-*`, `!**/test*`, `!test**`). Playwright reports, fixtures, and the `tests/` directory itself never ship.
4. **Excludes TypeScript sources** (`!**/*.ts`). Only the compiled `build/**/*.js` ships — the runtime never re-parses `.ts` at app start.
5. **Excludes node_modules cruft** (per-module READMEs, test fixtures, `.d.ts` files, `.bin` shims).
6. **Excludes editor / VCS / CI metadata** (`.git`, `.editorconfig`, `.husky`, `.vscode`, `.idea`, `appveyor.yml`, `.travis.yml`, `circle.yml`).
7. **Excludes helper scripts that are dev-only**: `!{examples,helper_scripts}`. The Windows signing script is *also* under `helper_scripts/`, but electron-builder reads it via `signtoolOptions.sign` before the exclusion takes effect — see §4.4.

### 4.3 The top-level `files` array (lines 76–84)

This is **a different list** from the electron-builder `build.files`. It is the **npm `files` whitelist** — what ends up in the npm tarball if anyone ever ran `npm publish`. The list is `main.js`, `main/**/*`, `index.d.ts`, `node_modules`, `package.json`, `icon.icns`, `icon.ico`. The `"private": true` flag (line 5) means `npm publish` is blocked anyway, so this list is mostly defensive.

### 4.4 Windows signing (`win.signtoolOptions.sign`)

The signing flow is delegated to [`helper_scripts/sign_windows.js`](../a/helper_scripts__sign_windows.js.md) (Group A). Key invariants:

- `signAndEditExecutable: true` — electron-builder edits the resource section of the EXE before signing, so the embedded version/icon/copyright are correct at sign time.
- `forceCodeSigning: true` — the build **fails hard** if any candidate file (`signExts`: `.node`, `.exe`, `.dll`, `.sys`, `.msi`, `.appx`, `.appxbundle`) fails to sign. There is no warn-only mode.
- `signingHashAlgorithms: ["sha256"]` — only SHA-256, no SHA-1 fallback.
- `sign: "./helper_scripts/sign_windows.js"` — module path relative to project root. The script reads the certificate fingerprint from a hard-coded value (`e0cdd96f315959b8d333807585c4868f22d4f396`) and uses `signtool.exe` from `SIGNTOOL_PATH` env var (default `C:\Program Files (x86)\Windows Kits\10\bin\10.0.22621.0\x64\signtool.exe`) plus the timestamp server `http://time.certum.pl`. See [`helper_scripts/sign_windows.js`](../a/helper_scripts__sign_windows.js.md) for the full flow.

### 4.5 Targets

- **Windows**: `target: ["dir", "zip"]` — produces both an unpacked dir (`directories.output`) and a `.zip`. Artefact name is `deepnest-v<version>-win32-<arch>.zip` per the `artifactName` template. **No installer (`nsis`, `msi`) is built** — distribution is by zip + portable dir only.
- **macOS**: `category: public.app-category.utilities`, `icon: icon.icns`. **No `target` declared** — electron-builder defaults apply (would emit `dmg` + `zip` if `--mac` was used). Currently no `npm run build-dist-mac` script exists, so the macOS branch is reachable only by direct `electron-builder build --mac` invocation.
- **Linux**: not configured. No `linux` block.

## 5. Dependencies

### 5.1 Runtime dependencies (lines 67–75) — every line has a "why"

| Dep | Version | Why this is here |
|---|---|---|
| `@deepnest/calculate-nfp` | `202503.13.155300` | Native binding for No-Fit-Polygon computation. The hot path of the genetic algorithm in [`main/deepnest.js`](../b/main__deepnest.js.md). Gets rebuilt against the local Electron ABI by `electron-builder install-app-deps`. |
| `@deepnest/svg-preprocessor` | `0.2.0` | Optional SVG pre-cleaning pass invoked from [`main/svgparser.js`](../b/main__svgparser.js.md). Sibling-org module, kept on a tight version pin. |
| `@electron/remote` | `2.1.3` | Bridges renderer → main IPC for legacy remote-style APIs. Required because parts of [`main/deepnest.js`](../b/main__deepnest.js.md) and [`main/index.html`](../g/main__index.html.md) still reach for `remote.dialog`. Should not be added to in new code. |
| `axios` | `1.13.2` | HTTP client used by [`main/notification-service.js`](../a/main__notification-service.js.md) (GitHub release polling) and the conversion-server upload path in [`main/svgparser.js`](../b/main__svgparser.js.md). |
| `form-data` | `4.0.5` | Multipart payload builder for the conversion-server upload (DXF/DWG → SVG). |
| `graceful-fs` | `4.2.11` | Drop-in `fs` replacement that retries on `EMFILE` / `ENFILE`. Used by the import path that may open many SVGs at once. |
| `marked` | `17.0.1` | Markdown → HTML used by the notification renderer to format release notes (consumed indirectly via `notification-service.js`). |

### 5.2 Dev dependencies (lines 51–66)

| Dep | Version | Role |
|---|---|---|
| `@electron/packager` | `18.3.6` | Used by `npm run dist`. Older but supported; the project intentionally keeps both packager (for the `dist` script) and electron-builder (for `build-dist*`). |
| `@electron/rebuild` | `^4.0.2` | Transitive helper for native module rebuilds. Triggered by `electron-builder install-app-deps`. |
| `@eslint/js` | `^9.26.0` | ESLint base recommended config — composed in [`eslint.config.mjs`](./eslint.config.mjs.md). |
| `@playwright/test` | `^1.57.0` | Test runner. Configured in [`playwright.config.ts`](./playwright.config.ts.md). |
| `@types/node` | `22.15.17` | Node typings — consumed via the `types: ["node"]` entry in [`tsconfig.json`](./tsconfig.json.md). Pinned exact version. |
| `cross-replace` | `0.2.0` | Cross-platform shell-var rewriter used by `printenv` and `dist`. |
| `electron` | `^40.0.0` | Runtime. The version drives the ABI that native deps must match. |
| `electron-builder` | `^26.4.0` | Distribution build tool — consumes the `build` block above. |
| `eslint` | `^9.26.0` | Linter. Configured in [`eslint.config.mjs`](./eslint.config.mjs.md). |
| `husky` | `^9.1.7` | Git hooks runner. Hook file lives at `.husky/pre-commit`. |
| `lint-staged` | `^15.5.2` | Per-staged-file runner. Config in lines 37–43. |
| `prettier` | `^3.5.3` | Formatter. No project-level config — uses defaults plus `.editorconfig`. |
| `typescript` | `^5.8.3` | Compiler. Driven by `npm run build` (`tsc`) and configured in [`tsconfig.json`](./tsconfig.json.md). |
| `typescript-eslint` | `^8.32.0` | Adds `tseslint.configs.recommended` to the ESLint flat config. |

### 5.3 What's *not* here

- No `electron-builder` plugins (no `dmg-license`, no `app-builder-bin` overrides, no `electron-updater`).
- No bundlers (no Webpack, no esbuild, no Vite). The renderer ships raw transpiled output from `tsc`; ESM-style modules are loaded directly by Electron.
- No `concurrently` / `npm-run-all` — every script chain uses `&&` directly.
- No `nodemon` or watcher — `npm run start` always reloads from disk.

## 6. Invariants & gotchas

1. **`npm test` runs on every commit.** The `.husky/pre-commit` hook chains `npx lint-staged && npm test`, so a single-character typo fix triggers the full Playwright Electron E2E suite (which launches a real Chromium-on-Electron window and exercises the full nesting pipeline). On a slow machine this is several minutes per commit. There is no `--no-verify` exception built in; bypass is opt-in per commit.
2. **`postinstall` rebuilds native modules every time you run `npm install`.** Don't be surprised when `npm install` takes minutes — `electron-builder install-app-deps` is rebuilding `@deepnest/calculate-nfp` against the active Electron ABI. If you change Electron versions, you must re-run `npm install` (or `electron-builder install-app-deps` directly) before `npm start` works.
3. **`clean*` scripts are Windows-only.** They use cmd.exe builtins. Linux/macOS users running `npm run clean` will see the literal command echoed and nothing actually deleted (the `\|echo . >nul` is the only thing that succeeds). If you're on POSIX, do `rm -rf build dist` manually.
4. **The `build` field collides with the npm `build` script name.** This is a common point of confusion: `npm run build` runs `tsc && electron-builder install-app-deps` (the **script**), while electron-builder's `--config` resolution reads the **`build`** key (the **field**). They share the word "build" but are entirely separate.
5. **No `electron-builder.json` exists.** Anyone grepping for `"appId"` or build-config fields must look in `package.json`, not in a sibling JSON. The DEE-11 description previously implied a separate file; that file was never added.
6. **`forceCodeSigning: true` makes signed builds fail-fast on missing certs.** A developer trying `npm run build-dist-signed` without `SIGNTOOL_PATH` correctly set or without the cert installed will see a hard error from [`helper_scripts/sign_windows.js`](../a/helper_scripts__sign_windows.js.md). Use `npm run build-dist` (no `-signed`) for unsigned local builds.
7. **`cross-replace` is wrapper-style — only on the scripts that need it.** Most scripts run identically on every OS without it. Adding it gratuitously to a portable script (`build`, `test`) hurts startup time without value.
8. **`@electron/packager` and `electron-builder` coexist on purpose.** `npm run dist` uses the packager for portable unpacked dirs; `npm run build-dist*` uses the builder for signed zip artefacts. Different output shapes — pick by use case, not by preference.
9. **`prepare` runs `husky \|\| true` to survive fresh clones.** A first `npm install` in a non-git tree (e.g. inside an extracted tarball) won't error — Husky silently no-ops.
10. **The npm `files` array (lines 76–84) is dead code.** With `"private": true`, `npm publish` is blocked, and electron-builder uses its own `build.files` whitelist. The npm `files` list is preserved only as a defence-in-depth marker.

## 7. Known TODOs

The file has no inline `// TODO` / `// FIXME` markers (it's pure JSON; comments aren't supported). However, the configuration encodes several known weak points:

- **No `engines` block.** Node version is unconstrained — CI is the only enforcement. Adding `"engines": { "node": ">=20" }` would surface mismatches at `npm install`.
- **No macOS `target`.** Mac builds fall through to electron-builder defaults (`dmg`, `zip`). If macOS is ever a release target, an explicit `target` list belongs here.
- **No Linux block at all.** Same story.
- **Husky v4-style `husky.hooks` is dead.** The block at lines 32–36 is a no-op under Husky v9. Either remove it or move the source of truth into here and have a generation step write `.husky/pre-commit`.
- **The `clean*` scripts could be made cross-platform** with `rimraf` (not currently a dep) or by replacing `rmdir /s /q` with a Node-based `fs.rm`.

## 8. Extension points

| To add… | Touch this file | Also touch |
|---|---|---|
| A new top-level npm script (e.g. `npm run dev`) | Append to `scripts` block | None if standalone; otherwise the calling docs / CI |
| A new `lint-staged` glob (e.g. `*.md` → `prettier`) | Add a key under `lint-staged` | Make sure ESLint or Prettier actually has rules for it |
| A macOS / Linux target | Add `mac.target` and/or `linux: { target: [...] }` to `build` | `npm run build-dist-mac` / `-linux` scripts; CI matrix |
| A new runtime dep | Add to `dependencies` (not `devDependencies`); document its "why" in §5.1 here | If native: verify `postinstall` rebuilds it |
| Retire `@electron/remote` | Remove from `dependencies` | Burn down every `require('@electron/remote')` in `main/` first; otherwise the renderer crashes at boot |
| Switch to a single dist tool | Pick `dist` or `build-dist*`, remove the other; update CI | Drop the unused `@electron/packager` or `electron-builder` from devDeps |

## 9. Test coverage

`package.json` is data. There is no direct test asserting on its fields. **Indirect** coverage:

- `npm test` itself is invoked by the Husky hook on every commit, so the `scripts.test` key is exercised constantly.
- `tests/index.spec.ts` reads `npm_package_version` indirectly via `electron.app.getVersion()` (deep-dived in [Group J](../j/tests__index.spec.ts.md)) — a wrong `version` field would surface in test attachments.
- The `build` block is exercised by every release pipeline (out-of-scope CI workflows).

There is no Playwright spec that asserts on `package.json` content directly. Manual review on PR is the only quality gate for the JSON itself.

## 10. Cross-references

- [`tsconfig.json.md`](./tsconfig.json.md) — what `npm run build` actually compiles (`include`, `outDir → ./build`).
- [`playwright.config.ts.md`](./playwright.config.ts.md) — what `npm test` (and the Husky hook) actually runs.
- [`eslint.config.mjs.md`](./eslint.config.mjs.md) — what `lint-staged` invokes after Prettier.
- [`index.d.ts.md`](./index.d.ts.md) — the file referenced by `"types": "index.d.ts"`.
- [`docs/deep-dive/a/main.js.md`](../a/main.js.md) — the runtime entry referenced by `"main": "main.js"`.
- [`docs/deep-dive/a/helper_scripts__sign_windows.js.md`](../a/helper_scripts__sign_windows.js.md) — Windows signing flow invoked by `build.win.signtoolOptions.sign`.
- [`docs/deep-dive/a/helper_scripts__playwright_codegen.js.md`](../a/helper_scripts__playwright_codegen.js.md) — what `npm run pw:codegen` launches.
- [`docs/deep-dive/b/main__deepnest.js.md`](../b/main__deepnest.js.md), [`docs/deep-dive/b/main__svgparser.js.md`](../b/main__svgparser.js.md) — primary consumers of the `dependencies` listed in §5.1.
