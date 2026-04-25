# Deep Dive — `package.json`

> **Group**: H (build / config / quality) · **Issue**: [DEE-19](../../../) · **Parent**: [DEE-11](../../index.md) · **Author**: Paige · **Generated**: 2026-04-26
>
> Per-file deep dive following the [DEE-11 shared template](../b/README.md). Companion files in this group: [`tsconfig.json.md`](./tsconfig.json.md), [`playwright.config.ts.md`](./playwright.config.ts.md), [`eslint.config.mjs.md`](./eslint.config.mjs.md), [`index.d.ts.md`](./index.d.ts.md).

| Field | Value |
|---|---|
| Path | [`package.json`](../../../package.json) |
| Lines | 153 |
| Format | npm package manifest + electron-builder `build` block |
| Layer | Build / packaging / dependency manifest — touches every other tier |
| `main` | `main.js` (Group A) |
| `types` | `index.d.ts` (Group H — see [`index.d.ts.md`](./index.d.ts.md)) |
| `private` | `true` — never published to the npm registry |

---

## 0. Scope discrepancy callout

The DEE-11 file list mentions `electron-builder.json`. **No such file exists in the repository.** The full electron-builder configuration lives inside the `build` block of this `package.json` (lines 85–146). This is the canonical location and the only place to edit Windows / mac packaging settings. See §4 for a full reproduction of that block.

If a future contributor adds a standalone `electron-builder.json` or `electron-builder.yml`, **delete the `build` block here first** — electron-builder reads only one source and the precedence rules are easy to get wrong (file > `build` block in `package.json`).

---

## 1. Purpose

`package.json` is the project root manifest. It declares:

1. **Identity** — name `deepnest`, version `1.5.6`, license MIT, `private: true`, `main: "main.js"`, `types: "index.d.ts"`.
2. **Scripts** (15 entries) — the entire developer + release workflow. See §2.
3. **Dependencies** — 7 runtime, 14 dev. Each runtime dependency has a single, identifiable consumer; this file is the rationale registry. See §3.
4. **Electron-builder configuration** — appId, files glob, Windows code-signing wiring, mac category. See §4.
5. **Husky + lint-staged hooks** — pre-commit chain. See §5.
6. **`files` whitelist** — what `npm pack` would include if this package were ever publishable. Currently double-duty as documentation of what should ship inside the Electron app bundle. See §6.

There is **no** `engines` block, **no** `packageManager` field, **no** `volta` pin. Node version is not constrained at the manifest level — it is constrained transitively by `electron@^40.0.0` (Node 22 ABI) and `@types/node@22.15.17`.

---

## 2. Scripts (the day-to-day surface)

> **Convention:** every script is invoked as `npm run <name>` unless it is one of the npm built-ins (`start`, `test`, `prepare`, `precommit`, `postinstall`).

| Script | Command | When to run | Pre/post hooks | Source line |
|---|---|---|---|---|
| `start` | `electron .` | Local dev — boots the app from source. Loads `main.js`, opens DevTools when `deepnest_debug=1`. | none | 16 |
| `printenv` | `cross-replace node -e "console.log(process.env)"` | Diagnostic — verifies what the npm script env looks like (Windows vs *nix). `cross-replace` rewrites `$VAR` → `%VAR%` on Windows. | none | 17 |
| `test` | `playwright test` | E2E run. Single Chromium project, headed, see [`playwright.config.ts.md`](./playwright.config.ts.md). | none | 18 |
| `build` | `tsc && electron-builder install-app-deps` | Required after **any** TypeScript change and after **any** Electron version bump. `tsc` writes to `build/` per [`tsconfig.json`](./tsconfig.json.md); `install-app-deps` rebuilds the two native addons (`@deepnest/calculate-nfp`, `@deepnest/svg-preprocessor`) against the bundled Electron ABI. | none | 19 |
| `clean` | `rmdir /s /q build dist >nul 2>&1\|echo . >nul` | Wipe `build/` (tsc output) and `dist/` (electron-builder output). **Windows-only syntax** — `rmdir /s /q` is `cmd.exe`. | none | 20 |
| `clean-all` | `rmdir /s /q build dist node_modules bin >nul 2>&1\|echo . >nul` | Nuclear option — also drops `node_modules` and `bin`. Same Windows-only constraint. | none | 21 |
| `dist` | `cross-replace npx @electron/packager . deepnest-v$npm_package_version --overwrite --ignore=...` | Unsigned tree build via `@electron/packager` (NOT electron-builder). Produces `deepnest-v<version>-<platform>-<arch>/`. The `--ignore` list duplicates intent of `package.json#build.files` because packager has its own ignore semantics. | none | 22 |
| `build-dist` | `electron-builder build --win` | Windows installer build, **signed via [`helper_scripts/sign_windows.js`](../a/helper_scripts__sign_windows.js.md)**. Reads the `build` block in this file. | none | 23 |
| `build-dist-signed` | `electron-builder build --win --publish never` | Identical to `build-dist` but explicitly opts out of GitHub publishing (CI uses this script — see [`docs/deployment-guide.md`](../../deployment-guide.md)). | none | 24 |
| `dist-all` | `npm run clean-all && npm install && npm run build && npm run dist` | Full reproducible **unsigned** build. Useful for one-off local snapshots. | composes 4 scripts | 25 |
| `dist-all-signed` | `npm run clean-all && npm install && npm run build && npm run build-dist-signed` | Full reproducible **signed** Windows build. The release SOP. | composes 4 scripts | 26 |
| `prepare` | `husky \|\| true` | npm lifecycle hook — runs after `npm install`. Installs `.husky/` git hooks. `\|\| true` swallows the failure when `husky` is not installed (e.g. in a tarball install). | npm built-in (`prepare`) | 27 |
| `precommit` | `lint-staged` | Triggered indirectly by the `.husky/pre-commit` hook (which calls `npx lint-staged && npm test`). Not invoked directly. | husky-driven | 28 |
| `postinstall` | `electron-builder install-app-deps` | npm lifecycle — runs after every `npm install`. Rebuilds native addons against the local Electron version. **This is what makes `npm install` slow.** | npm built-in (`postinstall`) | 29 |
| `pw:codegen` | `node helper_scripts/playwright_codegen.js` | Launches the Playwright codegen recorder against the running Electron app — see [`helper_scripts/playwright_codegen.js.md`](../a/helper_scripts__playwright_codegen.js.md). | none | 30 |

### 2.1 Hidden script chain — `.husky/pre-commit`

```
npx lint-staged
npm test
```

> ⚠ **Hazard.** The pre-commit hook runs **`npm test` (Playwright E2E)** on every commit. That is ~30 s minimum and requires a working Electron build. Contributors with a broken local build cannot commit. If `npm test` is intentionally bypassed (e.g. WIP commits), `git commit --no-verify` is the only escape — there is no `--no-test` toggle. This is unusual and is a deliberate quality gate; do not silently downgrade it.

The hook does **not** run `npm run build` first, so commits with stale TypeScript output may pass lint-staged (which only edits the staged files via Prettier + ESLint) but fail E2E because `build/` is out of date.

### 2.2 `lint-staged` config

```json
"lint-staged": {
  "**/*.{ts,html,css,scss,less,json}": [
    "prettier --write",
    "eslint --fix",
    "git add"
  ]
}
```

- **Glob coverage**: TypeScript, HTML, CSS / SCSS / LESS, JSON. Note the absence of `.js` and `.mjs` — **legacy `*.js` files in `main/` are exempt from auto-format** (see ADR-005 in [`docs/architecture.md`](../../architecture.md)). This is intentional: rewriting whitespace inside `main/deepnest.js` would obliterate the cmidgley-fork blame history.
- **`git add` after fix** is the lint-staged v15 convention; v16 dropped it (handled implicitly). Bumping `lint-staged` will require deleting that line.

### 2.3 `husky` block (legacy)

```json
"husky": { "hooks": { "pre-commit": "lint-staged" } }
```

This block is **dead** under husky v9. Husky v9 reads hooks from `.husky/<name>` files, not from `package.json`. The block is preserved as documentation but has no runtime effect. **Do not edit this expecting it to change anything**; edit [`.husky/pre-commit`](../../../.husky/pre-commit) instead.

---

## 3. Dependency rationale

> **Convention:** one line of "why" per direct dep. Every entry below is a load-bearing import that, if removed, breaks a documented code path.

### 3.1 `dependencies` (runtime, ship inside the Electron app)

| Package | Version | Why we depend on it | Primary consumer |
|---|---|---|---|
| `@deepnest/calculate-nfp` | `202503.13.155300` | Native No-Fit-Polygon precompute addon. The whole nesting algorithm is built on this. Pinned exact because it is a native ABI bound to the Electron version. | [`main/background.js:43`](../../../main/background.js) (`window.addon = require('@deepnest/calculate-nfp')`) |
| `@deepnest/svg-preprocessor` | `0.2.0` | Native polygon simplifier (`simplifyPolygon`). Replaces an in-tree implementation that was too slow on dense SVGs. | [`main/deepnest.js:9`](../../../main/deepnest.js); also imported in [`main/ui/index.ts:774`](../../../main/ui/index.ts) for the import path |
| `@electron/remote` | `2.1.3` | Renderer access to the main process's `dialog`, `Menu`, `app`, etc. without writing IPC plumbing. Used by import / export services. Modern apps prefer `contextBridge` + IPC; we keep `@electron/remote` because the renderer already runs with `contextIsolation:false` (ADR-004). | [`main/ui/index.ts:769`](../../../main/ui/index.ts), and `main.js` registers it via `require('@electron/remote/main').initialize()` |
| `axios` | `1.13.2` | HTTP client used to POST DXF → SVG conversion uploads to `https://converter.deepnest.app/convert`. Also handles binary download. Chosen over `fetch` because the renderer side of the import service was written before the renderer was guaranteed Node 18+. | [`main/ui/index.ts:772`](../../../main/ui/index.ts), `import.service.ts` |
| `form-data` | `4.0.5` | `multipart/form-data` body builder for the conversion upload. Pairs with `axios` (axios's built-in form support is browser-only). | [`main/ui/index.ts:771`](../../../main/ui/index.ts), `import.service.ts` |
| `graceful-fs` | `4.2.11` | Drop-in `fs` replacement that retries on `EBUSY` / `EMFILE`. Important on Windows where AV scanners briefly lock files. Used in the main process and in the renderer for config / preset reads. | [`main.js:3`](../../../main.js), [`notification-service.js:2`](../../../notification-service.js), [`main/background.js:47`](../../../main/background.js), [`main/ui/index.ts:770`](../../../main/ui/index.ts) |
| `marked` | `17.0.1` | Renders the in-app notification body (markdown → HTML) before injection into the notification window. | [`notification-service.js:5`](../../../notification-service.js) |

> ⚠ **Hazard — `presets.js` uses raw `fs`.** `presets.js` (Group A) imports the Node built-in `fs` rather than `graceful-fs`. Inconsistent with the rest of the main process and a known minor risk on Windows. See [`presets.js.md`](../a/presets.js.md) §8.

### 3.2 `devDependencies` (build / quality / test)

| Package | Version | Why | Used by |
|---|---|---|---|
| `@electron/packager` | `18.3.6` | Powers the **unsigned** `npm run dist` script. Different tool from electron-builder; chosen because `dist` predates the move to electron-builder. Kept as a fallback for quick local snapshots. | `npm run dist` |
| `@electron/rebuild` | `^4.0.2` | Native-module rebuilder. Indirectly invoked by `electron-builder install-app-deps` (`postinstall` and `npm run build`). Not invoked directly from any script. | electron-builder |
| `@eslint/js` | `^9.26.0` | Provides ESLint v9's built-in `recommended` config. | [`eslint.config.mjs`](./eslint.config.mjs.md) |
| `@playwright/test` | `^1.57.0` | E2E test runner. | `npm test`, [`playwright.config.ts`](./playwright.config.ts.md), [`tests/index.spec.ts`](../../../tests/index.spec.ts) |
| `@types/node` | `22.15.17` | Node 22 type definitions for the renderer's `require()` calls and the main process. Pinned (no caret) — this version determines `lib` widening for `tsc`. | TypeScript compile (`types: ["node"]` in [`tsconfig.json`](./tsconfig.json.md)) |
| `cross-replace` | `0.2.0` | Cross-platform shell variable interpolation for npm scripts (handles `$VAR` ↔ `%VAR%`). | `npm run printenv`, `npm run dist` |
| `electron` | `^40.0.0` | The runtime. Caret-locked to major 40 (Node 22 ABI, Chromium 134-ish). Bumping the major requires re-pinning `@types/node` and validating the renderer's deprecated APIs (`@electron/remote`, `nodeIntegration`). | runtime (`npm start`), packagers |
| `electron-builder` | `^26.4.0` | Production packager + signer for Windows. Reads the `build` block (§4). | `build-dist`, `build-dist-signed`, `postinstall`, `npm run build` |
| `eslint` | `^9.26.0` | Linter, flat-config mode. | `lint-staged`, manual `eslint --fix` |
| `husky` | `^9.1.7` | Git hook installer (v9 reads `.husky/<name>` files). | `prepare` script |
| `lint-staged` | `^15.5.2` | Runs Prettier + ESLint on staged files only. | `.husky/pre-commit` → `precommit` script |
| `prettier` | `^3.5.3` | Formatter. No `.prettierrc` — uses defaults except for the file globs in `lint-staged`. | `lint-staged` |
| `typescript` | `^5.8.3` | Compiler. Drives [`tsconfig.json`](./tsconfig.json.md) settings. | `npm run build`, IDE |
| `typescript-eslint` | `^8.32.0` | TS-aware ESLint plugin / parser. Provides `tseslint.configs.recommended`. | [`eslint.config.mjs`](./eslint.config.mjs.md) |

> **Note on lockfile.** `package-lock.json` is committed (`.npmrc` is absent — npm defaults). The lock pins `@types/node` exactly to `22.15.17` and `electron` resolves to whatever the latest 40.x is at install time.

---

## 4. The `electron-builder` config block (`package.json:85-146`)

Reproduced verbatim:

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

### 4.1 Block-by-block

| Field | Value | Why |
|---|---|---|
| `appId` | `net.deepnest.app` | Used as the OS-level identity (Windows AppUserModelID, macOS bundle id). Changing it would orphan existing installs. |
| `copyright` | `2026 deepnest-next Community` | Embedded in Windows file properties. Update annually. |
| `nodeGypRebuild` | `false` | Suppress electron-builder's own `node-gyp rebuild` pass. We rely on `@electron/rebuild` via `install-app-deps` instead — single source of truth for native rebuild. |
| `files` | (long glob) | Whitelist + blacklist of files included in the asar. The first two entries (`**/*`, `build/**/*.js`) opt-in everything; the `!`-prefixed entries strip dev cruft, `*.ts` source, husky, helper_scripts, etc. The exclusion of `helper_scripts` means `sign_windows.js` runs at build time but is not shipped. |
| `directories.app` | `.` | App root is the repo root. |
| `directories.output` | `deepnest-v${version}-win32-${arch}` | Output dir gets the version baked in. **Hard-codes `win32`** — porting to mac/linux release would require either templating this differently or accepting the misnamed dir. |
| `win.target` | `["dir", "zip"]` | Produces an unpackaged `.dir` and a `.zip`. **No installer** (no NSIS / MSI / appx). Distribution is the zip. |
| `win.icon` | `icon.ico` | Repo root. |
| `win.artifactName` | `${name}-v${version}-win32-${arch}.${ext}` | E.g. `deepnest-v1.5.6-win32-x64.zip`. |
| `win.signAndEditExecutable` | `true` | Modify the EXE in place to add the signature. Without this, the EXE would only be signed if it were generated by electron-builder itself (we use `--target dir` + `zip`, so the EXE is already there). |
| `win.forceCodeSigning` | `true` | An unsigned build is a build failure. Pair with `sign_windows.js` returning `false` on any signing error. See [`helper_scripts/sign_windows.js.md`](../a/helper_scripts__sign_windows.js.md). |
| `win.signExts` | `[".node", ".exe", ".dll", ".sys", ".msi", ".appx", ".appxbundle"]` | Per-file signing list. **Includes `.node`** — the native NFP and svg-preprocessor addons get signed. |
| `win.signtoolOptions.sign` | `./helper_scripts/sign_windows.js` | Per-file signer callback. Receives `{path, hash, isNest}`, returns `Promise<boolean>`. |
| `win.signtoolOptions.signingHashAlgorithms` | `["sha256"]` | SHA-1 dropped — Windows accepts SHA-256 only as of Windows 10. |
| `mac.category` | `public.app-category.utilities` | App Store category metadata. |
| `mac.icon` | `icon.icns` | Repo root. |

> ⚠ **Hazard — `signExts` vs `sign_windows.js` skip-list mismatch.** electron-builder will hand `.sys` / `.msi` / `.appx` / `.appxbundle` files to `sign_windows.js`, but the script's branch table only handles `.exe / .dll / .node`. Anything else is logged as `"Skipping non-EXE/DLL"` and returned as `true` (success) — i.e. silently unsigned. Today the repo produces no `.sys/.msi/.appx*` files so it's harmless, but adding any would silently ship unsigned. See [`sign_windows.js.md`](../a/helper_scripts__sign_windows.js.md) §3.3.

### 4.2 What the block does **not** specify

- **No `linux` block** — Linux builds are not produced by this manifest. The `mac` block exists but is also not exercised by any current npm script (no `--mac` flag in any `build-dist*` script).
- **No `publish` block** — releases happen via GitHub Actions uploading the artifacts directly; electron-builder's auto-publish is unused.
- **No `extraResources` / `extraFiles`** — everything ships through the asar.
- **No `asarUnpack`** — implies the two native `.node` addons must be loadable from inside the asar. electron-builder generally unpacks `.node` files automatically (`asar.smartUnpack`), but this is implicit, not declared.
- **No `protocols`** — no custom URL scheme registration.
- **No `fileAssociations`** — no `.svg` / `.dxf` open-with-deepnest registration.

---

## 5. Husky / lint-staged interplay (consolidated)

| Layer | File | What it does |
|---|---|---|
| Hook installer | `package.json` `scripts.prepare` → `husky \|\| true` | Runs after `npm install`. Husky v9 installs git hooks from `.husky/`. |
| Hook script | [`.husky/pre-commit`](../../../.husky/pre-commit) | Two lines: `npx lint-staged` then `npm test`. |
| Lint-staged config | `package.json` `lint-staged` block (line 37) | Globs + actions per glob. |
| ESLint config | [`eslint.config.mjs`](./eslint.config.mjs.md) | Flat config, JS recommended + tseslint recommended. Ignores all `**/*.js`. |
| Prettier config | none (defaults) | No `.prettierrc`; Prettier defaults rule formatting. |
| Husky-v8 config | `package.json` `husky.hooks.pre-commit` (line 32) | **Dead** under husky v9. Documentation only. |

---

## 6. The `files` whitelist (line 76–84)

```json
"files": [
  "main.js",
  "main/**/*",
  "index.d.ts",
  "node_modules",
  "package.json",
  "icon.icns",
  "icon.ico"
]
```

`private: true` means npm `publish` is forbidden, so this block is functionally redundant for publish. It survives because some tools (electron-packager among them) read `package.json#files` as a shipping hint, and because it documents intent: only the seven entries above are part of the shipped surface. **`build/` is conspicuously absent**, but is included via `package.json#build.files["build/**/*.js"]` for electron-builder. If you switch packagers, recheck this.

---

## 7. Invariants & gotchas

1. **Native rebuild is `postinstall`.** Every `npm install` triggers `electron-builder install-app-deps`. If `electron` fails to install (corporate proxy, SSL), the postinstall errors and you are left with an unusable tree. Workaround: `npm install --ignore-scripts && npx electron-builder install-app-deps` once the proxy issue is fixed.
2. **`tsc` writes to `build/`, not the source tree.** The renderer entry [`main/index.html:30`](../../../main/index.html) loads `../build/ui/index.js`, not `main/ui/index.js`. Forgetting `npm run build` after editing TS gives you a stale UI without any error message. See [`tsconfig.json.md`](./tsconfig.json.md) §3.
3. **`clean` and `clean-all` are Windows-only.** They use `rmdir /s /q` which `cmd.exe` understands and POSIX shells do not. On macOS / Linux use `rm -rf build dist` (and `node_modules bin` for `clean-all`) by hand.
4. **Pre-commit runs Playwright.** Plan for ≥30 s per commit and ensure `build/` is current. CI runs the same hook because `prepare` runs on CI installs, but CI installs typically use `npm ci --ignore-scripts`.
5. **Electron major bump = manual checklist.** Bumping `electron@^40.0.0` requires (a) re-pinning `@types/node` to the matching Node ABI, (b) re-running `npm run build`, (c) re-validating `nodeIntegration` / `enableRemoteModule` still work, (d) re-signing the new EXE if Windows.
6. **`@deepnest/calculate-nfp` is exact-pinned.** No caret. Bumping it requires confirming the new wheel is built against the same Electron ABI; otherwise the renderer crash-loops on `require()`.
7. **`marked@17` is a major version that dropped legacy sync API**. The notification renderer uses the modern `marked.parse(string)` API — verify before bumping major.
8. **Inconsistent `axios.default` import.** Renderer-side code does `axios.default as unknown as { post: ... }` because `axios@1.x` exports differ between CJS and ESM. If you ever convert the renderer to pure ESM, drop the `.default`.

---

## 8. Known TODOs / debt

- **Husky v8 block at line 32** is dead code — should be removed when someone is touching this file (`MEMO: husky-v9-cleanup`).
- **Output-dir naming hard-codes `win32`** (line 115). Re-enabling mac / linux release builds will hit this.
- **`mac` block exists but no `--mac` script does** — either add `npm run build-dist-mac` or delete the block.
- **`@electron/packager` (`npm run dist`) and `electron-builder` (`build-dist`) duplicate intent.** The repo should pick one and delete the other; both are maintained today only because `dist` is faster for unsigned snapshots.
- **No `engines.node` constraint** — relying on Electron's bundled Node. This silently allows wildly-wrong system Node versions to run `npm run build`.
- **No `prepare-commit-msg` / `commit-msg` hooks** — commit message style is not enforced.

---

## 9. Extension points

| Need | Where to add it |
|---|---|
| New runtime dep | `dependencies` block (§3.1). Add a one-line "why" in the table above and identify the consumer. |
| New build script | `scripts` block (§2). Document in §2 here and update [`docs/development-guide.md`](../../development-guide.md). |
| Mac signing | New `mac.identity` + `notarize` keys under the `build` block (§4). Will require an Apple Developer ID and a separate signer callback — `sign_windows.js` is Windows-only. |
| Linux release | Add `linux.target: ["AppImage"]` etc. under `build`, plus a `build-dist-linux` script. |
| App-store metadata | `build.win.publisherName`, `build.mac.identity`, `build.appx.applicationId` — none currently set. |
| New file type association | `build.fileAssociations` (top-level under `build`). Today there are none. |
| Add `engines.node` pin | Top-level `engines` block. Recommend `>=22.0.0 <23` to mirror Electron 40's bundled Node. |
| Switch from `husky`v8 dead block to native git hooks | Delete the `husky` block at line 32 — keep `.husky/pre-commit` as the source of truth. |

---

## 10. Test coverage status

`package.json` itself has **no automated test**. The behaviours that depend on it are exercised at the pipeline level:

- **`npm test`** ([`tests/index.spec.ts`](../../../tests/index.spec.ts)) — boots Electron via `_electron.launch({ args: ["main.js"] })`. This indirectly verifies that `main` and the runtime deps load. If a runtime dep is broken, the test crashes at line 23 (`electron.launch`).
- **`npm run build`** is a smoke-check for `tsc` config and electron-builder native rebuild — failing here is the canonical first-touch CI failure.
- **CI workflows** under [`.github/workflows/`](../../../.github/workflows/) (`build.yml`, `build_release.yml`, `playwright.yml`) re-run all of the above on push / PR / tag.

There is no schema validator for the manifest. JSON-syntax errors are caught only at install time, when npm itself fails to parse it.

---

## 11. Cross-references

- [`docs/architecture.md`](../../architecture.md) §1 (process topology), §10 (ADR-001 worker count, ADR-004 renderer security posture).
- [`docs/component-inventory.md`](../../component-inventory.md) — full module graph that the runtime deps service.
- [`docs/development-guide.md`](../../development-guide.md) — script-by-script developer workflow.
- [`docs/deployment-guide.md`](../../deployment-guide.md) — full release SOP including the signed Windows path.
- [`docs/deep-dive/a/main.js.md`](../a/main.js.md) — the entry pointed at by `package.json#main`.
- [`docs/deep-dive/a/helper_scripts__sign_windows.js.md`](../a/helper_scripts__sign_windows.js.md) — the per-file signer wired by `package.json#build.win.signtoolOptions.sign`.
- [`docs/deep-dive/h/tsconfig.json.md`](./tsconfig.json.md) — what `npm run build`'s `tsc` step does.
- [`docs/deep-dive/h/playwright.config.ts.md`](./playwright.config.ts.md) — what `npm test` does.
- [`docs/deep-dive/h/eslint.config.mjs.md`](./eslint.config.mjs.md) — what `lint-staged`'s `eslint --fix` runs.
- [`docs/deep-dive/h/index.d.ts.md`](./index.d.ts.md) — the file pointed at by `package.json#types`.
