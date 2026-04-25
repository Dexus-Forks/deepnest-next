# `tsconfig.json` — Deep Dive

**Generated:** 2026-04-26 by Paige (Tech Writer) for [DEE-40](/DEE/issues/DEE-40) (parent: [DEE-11](/DEE/issues/DEE-11), supersedes DEE-29).
**Group:** H — build / config / quality.
**File:** `tsconfig.json` (27 LOC, project root).
**Mode:** Exhaustive deep-dive.

## 0. Scope correction (vs DEE-11)

The DEE-11 parent inventory mentions `tsconfig.app.json`, `tsconfig.node.json`, `tsconfig.test.json` as additional targets. **None of those files exist in this repo.** A single `tsconfig.json` at the project root drives every TypeScript path:

- `npm run build` → `tsc` (no `-p` argument; defaults to `./tsconfig.json`).
- `npm test` → `playwright test` → ts-node-style transpilation of `tests/*.ts` against the same root `tsconfig.json` (Playwright loads it implicitly).
- IDE / language-server type checking on `main/**/*.ts`, `tests/**/*.ts`.
- ESLint type-aware rules (currently not enabled — see [`eslint.config.mjs.md`](./eslint.config.mjs.md)).

This single-tsconfig topology is intentional. There is no `references` array, no project-graph composition, and no separate browser/Node split — the renderer and main process share the same compiler options (see §6 for why this is a *gotcha* in itself).

## 1. Purpose

Compiler configuration for the `tsc` invocation in `npm run build` (`package.json:19`) and for every editor / language server that opens this project. The file:

1. Sets the **language target** to ES2023 with module interop bridging CommonJS and ES.
2. Turns on **strict mode plus four extra strict flags** (`noImplicitAny`, `strictNullChecks`, `strictFunctionTypes`, `noUnusedLocals`, `noUnusedParameters`, `noImplicitReturns`, `noFallthroughCasesInSwitch`).
3. Emits **declarations + sourcemaps** to `./build`.
4. Pulls in **Node typings** plus a curated `lib` (`ES2020`, `ES6`, `DOM`).
5. Restricts the input set to `main/**/*.ts` and `main/ui/**/*.ts`.
6. Excludes `node_modules` and `**/*.test.ts`.

It is the **type contract** that every downstream tool (Playwright, ESLint, the editor) reads.

## 2. Compiler options

The full block (lines 2–24):

```jsonc
{
  "compilerOptions": {
    "target": "es2023",
    "esModuleInterop": true,
    "sourceMap": true,
    "outDir": "./build",
    "strict": true,
    "forceConsistentCasingInFileNames": true,
    "skipLibCheck": true,
    "declaration": true,
    "noImplicitAny": true,
    "strictNullChecks": true,
    "strictFunctionTypes": true,
    "noUnusedLocals": true,
    "noUnusedParameters": true,
    "noImplicitReturns": true,
    "noFallthroughCasesInSwitch": true,
    "importHelpers": true,
    "allowSyntheticDefaultImports": true,
    "allowJs": true,
    "experimentalDecorators": true,
    "types": ["node"],
    "lib": ["ES2020", "ES6", "DOM"]
  },
  "include": ["main/**/*.ts", "main/ui/**/*.ts"],
  "exclude": ["node_modules", "**/*.test.ts"]
}
```

Key flag walkthrough — every option in this file, what it does, and why it matters here.

### 2.1 Output shape

| Option | Value | Effect |
|---|---|---|
| `target` | `es2023` | Output JavaScript is ES2023. Aligned with Electron 40's bundled Chromium / V8 ABI declared in [`package.json`](./package.json.md#52-dev-dependencies). The renderer and main process both run V8 — no down-leveling needed. |
| `outDir` | `./build` | All emitted JS lands under `build/`. Mirrors the source tree (`build/main/...`). The `build` directory is referenced by [`package.json`](./package.json.md) `build.files` (`"build/**/*.js"`) and by the Windows clean script. |
| `sourceMap` | `true` | Emits `.map` files alongside every `.js`. Used by Electron's DevTools when stepping through renderer code. |
| `declaration` | `true` | Emits `.d.ts` files alongside `.js`. **Currently unused at runtime** — no published package consumes them — but kept on for IDE consistency when importing from the `build/` output (which never happens in the source tree). |
| `importHelpers` | `true` | `tsc` emits calls into `tslib` helpers instead of inlining `__extends`, `__awaiter`, etc. **There is no `tslib` dependency declared.** This is a latent bug — see §5 Gotcha #2. |

### 2.2 Strict-mode bundle

`strict: true` already turns on the seven strict-family flags. The file then **redundantly** lists four of them (`noImplicitAny`, `strictNullChecks`, `strictFunctionTypes`) plus separately enables three more that are *not* part of `strict` (`noUnusedLocals`, `noUnusedParameters`, `noImplicitReturns`, `noFallthroughCasesInSwitch`).

| Flag | Already in `strict`? | Effect |
|---|---|---|
| `noImplicitAny` | yes | Error on parameters / returns where the type cannot be inferred. |
| `strictNullChecks` | yes | `null` and `undefined` are not assignable to other types without a guard. |
| `strictFunctionTypes` | yes | Function parameters are checked contravariantly. |
| `noUnusedLocals` | **no** | Local variables that are declared but never read are errors. Trips on partially-refactored code. |
| `noUnusedParameters` | **no** | Function params that are never read are errors. The codebase works around this in places by prefixing `_` (e.g. the `event` arg pattern in IPC handlers). |
| `noImplicitReturns` | **no** | Every code path in a function with a non-`void` return must return. Forces explicit `return undefined` in branchy code. |
| `noFallthroughCasesInSwitch` | **no** | Switch cases must `break` / `return` / `throw`. No implicit fall-through. |

Notably **NOT enabled**: `exactOptionalPropertyTypes`, `noImplicitOverride`, `noPropertyAccessFromIndexSignature`, `noUncheckedIndexedAccess`. The codebase relies on lenient indexed access (`obj[key]` returns `T` instead of `T | undefined`) — a global enable of `noUncheckedIndexedAccess` would surface dozens of new errors in [`main/ui/services/`](../d/) and [`main/ui/components/`](../e/).

### 2.3 Module / interop

| Option | Value | Effect |
|---|---|---|
| `esModuleInterop` | `true` | `import x from 'commonjs-mod'` works against modules without a default export — `tsc` synthesises one. Critical for `main/` interop with CommonJS deps (`graceful-fs`, `axios` in some shapes). |
| `allowSyntheticDefaultImports` | `true` | Editor-time companion to `esModuleInterop`. Suppresses "module has no default export" errors before the synthesis kicks in. |
| `allowJs` | `true` | `tsc` will *type-check* `.js` files inside `include` patterns. **In this repo it has no effect** because `include` only matches `*.ts` — but the flag would activate `.js` checking if a future `include` glob were to broaden. The legacy renderer (`main/deepnest.js`, `main/svgparser.js`) is therefore **not** type-checked despite this flag. |
| `experimentalDecorators` | `true` | Enables the legacy decorators proposal. **Currently unused** (no `@Decorator(...)` syntax appears anywhere in `main/**`). Kept as a defensive default for future Ractive-style annotations. |

There is **no `module` field**. `tsc` defaults to `commonjs` because `target` is below `esnext` and no `module` override is given. So:

- The emitted `build/**/*.js` files use `require(...)` / `module.exports`, not `import`.
- The `module` resolution is `node` (also a default).
- This is consistent with Electron 40's CommonJS-by-default loader for both main and renderer (renderer ESM loading is opt-in via `<script type="module">` in [`main/index.html`](../g/main__index.html.md)).

### 2.4 File discovery

| Option | Value | Effect |
|---|---|---|
| `forceConsistentCasingInFileNames` | `true` | `import './foo'` and `import './Foo'` resolve to different errors. Catches case-mismatches on macOS / Windows that would otherwise break Linux CI. |
| `skipLibCheck` | `true` | `*.d.ts` files in `node_modules` are **not** checked. Speeds up incremental compiles dramatically. The inline JSON comment (line 9) flags this as "worth disabling for release" — currently untouched. |
| `types` | `["node"]` | Only `@types/node` is auto-included. Other `@types/*` packages would have to be referenced explicitly via `///<reference types="..." />` or added to this array. |
| `lib` | `["ES2020", "ES6", "DOM"]` | Available stdlib type definitions. `ES2020` + `ES6` is duplicative (ES2020 already includes ES6). `DOM` adds `Window`, `Document`, `HTMLElement`, etc. — required because the renderer code lives in TS files inside `main/ui/**`. **Note**: `target: es2023` does NOT auto-add the `lib` for ES2023 features when an explicit `lib` array is set — so `.findLast` / `.findLastIndex` on Array is intentionally outside the typed surface. See §5 Gotcha #1. |

### 2.5 Inputs / outputs

```json
"include": ["main/**/*.ts", "main/ui/**/*.ts"],
"exclude": ["node_modules", "**/*.test.ts"]
```

- `main/**/*.ts` already covers `main/ui/**/*.ts`. The second entry is redundant but harmless. (Removing it would not change the file set.)
- **`tests/*.ts` is *not* included.** The test spec at `tests/index.spec.ts` is compiled by Playwright's own transpiler (which still consults this file for `compilerOptions`) — but `tsc` itself never emits files for it.
- `**/*.test.ts` is excluded — but no `*.test.ts` files exist in the repo (the Playwright spec is named `*.spec.ts`). The exclude is defensive.
- `index.d.ts` (project root) is **not** in `include`. `tsc` discovers it implicitly via the `package.json` `"types"` entry and the auto-discovery of root `.d.ts` files. See [`index.d.ts.md`](./index.d.ts.md) for how the `Window` augmentation gets loaded.

## 3. What `tsc` produces under `npm run build`

Running `tsc` (no flags) with this config:

1. Reads every `.ts` matched by `include`.
2. Type-checks against the strict bundle in §2.2.
3. Emits to `./build`:
   - `build/main/<...>.js` — CommonJS-style transpiled output for every `main/**/*.ts`.
   - `build/main/<...>.js.map` — sourcemap.
   - `build/main/<...>.d.ts` — declaration.
4. Exits non-zero on any type or syntax error.

It does **not** emit anything for the legacy `.js` files (`main/deepnest.js`, `main/svgparser.js`, `main/util/*.js`). Those are loaded by Electron at runtime as-is (the renderer reads them via `<script>` tags in [`main/index.html`](../g/main__index.html.md), and the main process's `require(...)` hits them directly).

The `build/` directory is then included in the electron-builder package payload via the `"build/**/*.js"` line in [`package.json`](./package.json.md#42-the-files-whitelist--what-actually-ships) `build.files` (line 91).

## 4. Inline JSON comments

The file uses **JSON-with-comments** syntax. Standard `JSON.parse` would reject it; `tsc` accepts it because it parses tsconfig as JSONC.

The five inline comments (lines 4, 5, 7, 8, 9, 11–17) carry intent:

| Line | Comment | Note |
|---|---|---|
| 4 | `// Enables emit interoperability between CommonJS and ES` | Describes `esModuleInterop`. |
| 5 | `// Generates corresponding '.map' file.` | Describes `sourceMap`. |
| 7 | `// Enable all strict type-checking options.` | Describes `strict`. |
| 8 | `// Disallow inconsistently-cased references to the same file.` | Describes `forceConsistentCasingInFileNames`. |
| 9 | `// Skip type checking of all declaration files (*.d.ts). Good for development compile speed, but worth disabling for release.` | **Standing TODO** — author marked this as worth flipping for release builds. Never actioned. |
| 11–17 | `/* Raise error on… */` etc. (block-style) | Describe each redundant strict flag. |

## 5. Invariants & gotchas

1. **`lib: ["ES2020", "ES6", "DOM"]` does NOT match `target: es2023`.** With an explicit `lib`, the compiler does not auto-add the lib that corresponds to `target`. So `Array.prototype.findLast` (ES2023) compiles syntactically but the types are missing; calls to it would be `unknown`-typed in strict mode. To use ES2023 lib types, the `lib` array would need `"ES2023"` added (or removed entirely to fall back to `target`-driven defaults). This is currently a non-issue because no source uses ES2023-only APIs.
2. **`importHelpers: true` requires `tslib`** — and `tslib` is **not** in `package.json` `dependencies`. If `tsc` ever needs to emit a helper (`__extends`, `__awaiter`, etc.) for code that uses async/await with downlevel, it will produce `import { __awaiter } from 'tslib'` and the runtime will crash with `Cannot find module 'tslib'`. Today this is dormant because `target: es2023` covers async/await and decorators natively, so no helpers get emitted. The flag is a footgun if `target` is ever lowered to `es2017` or below. Fix: either drop `importHelpers` or add `tslib` to `dependencies`.
3. **`include` does not list `index.d.ts`.** It is picked up by auto-discovery (root `.d.ts` files with no `include` match are still consumed for ambient declarations). If `include` is ever tightened to a non-glob whitelist, the `Window` augmentation declared in [`index.d.ts`](./index.d.ts.md) would silently disappear from the type graph — every `window.DeepNest`, `window.config`, etc. would become `any`.
4. **`allowJs: true` is misleading.** It only takes effect for `.js` files matched by `include`. Since `include` only globs `*.ts`, no JavaScript is type-checked. Reading the config the obvious way ("oh, JS is allowed") leads to wrong assumptions about whether `main/deepnest.js` gets type-checked (it does not).
5. **No `paths` mapping, no `baseUrl`.** Every import is filesystem-relative. The renderer code uses long `../../../` chains (e.g. `main/ui/types/index.ts:20` imports `../../../index.d.ts`). Refactoring file locations is therefore expensive — there is no path alias to update centrally.
6. **Single tsconfig serves main + renderer + tests.** The renderer needs `DOM`; the main process does not. Because the lib is shared, main-process code can accidentally reference `window` / `document` and only fail at runtime, not at compile time. This is the most concrete cost of the single-tsconfig topology.
7. **`skipLibCheck: true` hides type errors in `node_modules/@types/*`**. Upgrades that introduce conflicting `@types` packages (a recurring problem before TypeScript 5.x) won't surface as errors. Trade-off: keep on for compile speed, accept that `*.d.ts` regressions need PR review to catch.
8. **No `incremental` / `tsBuildInfoFile`.** Every `npm run build` is a clean rebuild. On a slow machine this is several seconds of unnecessary work. Adding `"incremental": true` would unlock `--watch`-style incremental TS compiles.
9. **Comments inside JSON are non-standard.** Tools that parse `tsconfig.json` with a strict JSON parser (some scripts, some IDE plugins) will choke. Standard `tsc`, `eslint`, Playwright, and VS Code handle them. Don't introduce trailing commas or other JSON5-style features beyond what `tsc` accepts.

## 6. Known TODOs

The only inline marker is the embedded note on `skipLibCheck` (line 9): *"worth disabling for release."* This has not been actioned. The cost of flipping it is a noticeably slower CI (full lib-check on `node_modules`).

Other latent debt (not marked but apparent):

- Drop `importHelpers` or add `tslib` (§5 #2).
- Drop the redundant strict flags (`noImplicitAny`, `strictNullChecks`, `strictFunctionTypes` — already in `strict`) for clarity.
- Drop the redundant `main/ui/**/*.ts` from `include` (already covered by `main/**/*.ts`).
- Decide whether the project needs a real renderer-vs-main split (separate `lib` arrays). The single-tsconfig pattern works but masks renderer-only API misuse on the main side.

## 7. Extension points

| To add… | Touch this file | Also touch |
|---|---|---|
| `*.test.ts` test files compiled by `tsc` | Remove `**/*.test.ts` from `exclude`; add `tests/**/*.ts` to `include` | Probably nothing else — Playwright uses its own pipeline, so removing the exclude is purely about IDE coverage. |
| Path aliases (`@ui/*`) | Add `baseUrl` + `paths` to `compilerOptions` | Every `tsc`-driven build still uses the relative paths emitted by the compiler — there is **no** runtime path resolver. Switching to aliases requires a bundler or a Node import-map shim. |
| Separate browser-only renderer config | Add a `tsconfig.renderer.json` with `extends: "./tsconfig.json"` and `lib: ["ES2020", "DOM"]`; keep main on a `tsconfig.main.json` with `lib: ["ES2020"]` | `npm run build` script (`tsc -b`); IDE multi-project workspace settings. |
| Type-aware ESLint rules | Add `"compilerOptions.composite": true` (or expose `parserOptions.project: ./tsconfig.json` in ESLint) | [`eslint.config.mjs`](./eslint.config.mjs.md) — currently uses `recommended` rules that do not require type info. |
| Module resolution mode change | Add `"moduleResolution": "bundler"` or `"node16"` | Likely cascades into changes in every relative import (extension required vs. omitted). |

## 8. Test coverage

`tsconfig.json` is data; no Playwright spec asserts on it. **Indirect coverage**:

- Every CI run's `npm run build` step exercises `tsc` against the include set. Any compile error fails CI.
- The Husky pre-commit hook does **not** run `tsc` directly — it runs ESLint via lint-staged (no type-aware rules) and the Playwright spec. So local commits can land with a TypeScript error that only surfaces in CI.

There is no schema validation of the file (no `ajv` rule, no JSON-schema reference). Editing it incorrectly fails at the next `tsc` invocation rather than at edit time.

## 9. Cross-references

- [`package.json.md`](./package.json.md) — `npm run build` entry point that drives `tsc` against this config; the `build/**/*.js` line in `build.files` ships the compiled output.
- [`index.d.ts.md`](./index.d.ts.md) — the root declaration file picked up by auto-discovery. Critical to the compiler's view of `Window` augmentations.
- [`eslint.config.mjs.md`](./eslint.config.mjs.md) — the linter that **could** be made type-aware against this config but currently is not.
- [`playwright.config.ts.md`](./playwright.config.ts.md) — Playwright's own TS pipeline that consumes this config implicitly when transpiling `tests/index.spec.ts`.
- [`docs/deep-dive/c/main__ui__index.ts.md`](../c/main__ui__index.ts.md), [`docs/deep-dive/c/main__ui__types__index.ts.md`](../c/main__ui__types__index.ts.md) — chief examples of `main/ui/**/*.ts` consumers covered by `include`.
- [`docs/deep-dive/b/main__deepnest.js.md`](../b/main__deepnest.js.md), [`docs/deep-dive/b/main__svgparser.js.md`](../b/main__svgparser.js.md) — the legacy `.js` files **not** covered by `tsc` (because `include` only matches `*.ts`).
