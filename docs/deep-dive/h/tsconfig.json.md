# Deep Dive — `tsconfig.json`

> **Group**: H (build / config / quality) · **Issue**: [DEE-19](../../../) · **Parent**: [DEE-11](../../index.md) · **Author**: Paige · **Generated**: 2026-04-26
>
> Per-file deep dive following the [DEE-11 shared template](../b/README.md). Companion files in this group: [`package.json.md`](./package.json.md), [`playwright.config.ts.md`](./playwright.config.ts.md), [`eslint.config.mjs.md`](./eslint.config.mjs.md), [`index.d.ts.md`](./index.d.ts.md).

| Field | Value |
|---|---|
| Path | [`tsconfig.json`](../../../tsconfig.json) |
| Lines | 27 |
| Format | TypeScript compiler config (single file — no project references) |
| Driven by | `tsc` (invoked via `npm run build`) |
| `outDir` | `./build` |
| `target` | `es2023` |
| `strict` | `true` (full strict-mode bundle) |

---

## 0. Scope discrepancy callout

The DEE-11 file list mentions `tsconfig.app.json`, `tsconfig.node.json`, and `tsconfig.test.json` as variants to deep-dive. **None of those files exist.** A search for `tsconfig*.json` at any depth in the repo (excluding `node_modules`) returns exactly one match: this file.

The repo uses a **single-tsconfig topology** — one compiler invocation produces the renderer's `build/ui/...` output and the small amount of TypeScript outside `main/ui/` (notably `main/nfpDb.ts`, `main/util/*.ts`). There are no project references, no `tsconfig.test.json` for Playwright (Playwright runs `.ts` files directly via its bundled compiler — see [`playwright.config.ts.md`](./playwright.config.ts.md)), and no separate Node-process tsconfig (the main process is plain JavaScript: `main.js`, `presets.js`, `notification-service.js`).

If a future split (e.g. separating the renderer from the background renderer, or adding a `main/main-process/` TS tree) introduces variant configs, **start with this file and use `extends`** rather than copy-pasting — strict-mode flags must stay aligned across compiler invocations or the renderer will type-check inconsistently.

---

## 1. Purpose

Single source of truth for the TypeScript compile that produces the renderer (`build/ui/**/*.js`) and the handful of TS modules outside `main/ui/`. Sets:

- **Output target** = ES2023 + DOM lib, written under `./build/`.
- **Strictness baseline** = full `strict: true` plus six additional explicit strict flags (`noImplicitAny`, `strictNullChecks`, `strictFunctionTypes`, `noUnusedLocals`, `noUnusedParameters`, `noImplicitReturns`, `noFallthroughCasesInSwitch`). These are redundant with `strict: true` but documented explicitly so a future contributor cannot silently relax one of them by editing only the `strict` flag.
- **Inputs** = `main/**/*.ts` and `main/ui/**/*.ts` (overlap is intentional — the second pattern is documentation, not a delta).
- **Exclusions** = `node_modules` and `**/*.test.ts` (no `*.test.ts` files exist today; the exclusion is forward-looking).

The compiler emits `.js` + `.js.map` + `.d.ts` per `declaration: true` and `sourceMap: true`. Declaration files are emitted but **not consumed** anywhere in this repo — they are generated only because `declaration: true` is the safest default for a library-shaped output.

---

## 2. Public surface — what `tsc` emits

| Source pattern | Output | Loaded by |
|---|---|---|
| `main/ui/**/*.ts` | `build/ui/**/*.js` | [`main/index.html:30`](../../../main/index.html) (`<script type="module" src="../build/ui/index.js">`) |
| `main/ui/types/index.ts` | `build/ui/types/index.js` | Renderer module graph rooted at `build/ui/index.js`. Only `IPC_CHANNELS` survives compilation; the rest is type-only. |
| `main/nfpDb.ts` | `build/nfpDb.js` | [`main/background.js:37`](../../../main/background.js) — the hidden background renderer imports this as `NfpCache`. |
| `main/util/*.ts` (HullPolygon, point, vector, matrix, domparser, eval) | `build/util/*.js` | Imported by `main/deepnest.js`, `main/svgparser.js`, `main/background.js`, and `main/util/parallel.js`-spawned workers via relative paths like `../build/util/HullPolygon.js`. See [`docs/deep-dive/b/README.md`](../b/README.md) for the load topology. |

There is no `tsc --watch` script. Watching is done via the IDE.

---

## 3. `compilerOptions` — line-by-line annotation

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

| Option | Value | Why |
|---|---|---|
| `target` | `"es2023"` | Electron 40 ships Node 22 + Chromium 134, both of which support ES2023 natively. No down-leveling needed; `tsc` becomes (mostly) a type-stripper. |
| `esModuleInterop` | `true` | Needed because `axios` and `form-data` ship CJS modules that the renderer imports via `import * as` in legacy snippets and via `require()` in [`main/ui/index.ts`](../../../main/ui/index.ts). |
| `sourceMap` | `true` | Emit `.js.map` so the DevTools shows TS sources. Required because the renderer loads compiled JS, not TS. |
| `outDir` | `"./build"` | All emitted JS lands here. Mirrors the input tree's relative structure (`main/ui/foo.ts` → `build/ui/foo.js` — note the `main/` prefix is **stripped** because `outDir` is a sibling of the inputs and `rootDir` is auto-inferred to `main/`). |
| `strict` | `true` | Enables the strict bundle: `noImplicitAny`, `strictNullChecks`, `strictFunctionTypes`, `strictBindCallApply`, `strictPropertyInitialization`, `noImplicitThis`, `useUnknownInCatchVariables`, `alwaysStrict`. **All seven of those are inherited from this single flag.** |
| `forceConsistentCasingInFileNames` | `true` | Catch import path case-mismatches before they break on case-sensitive filesystems (Linux CI). |
| `skipLibCheck` | `true` | Documented in source as "Good for development compile speed, but worth disabling for release." Currently it is on for both — release builds are not stricter than dev. |
| `declaration` | `true` | Emit `.d.ts` next to each `.js`. Not consumed; see §1. |
| `noImplicitAny` | `true` | Redundant with `strict`. Kept as explicit documentation. |
| `strictNullChecks` | `true` | Redundant with `strict`. Kept as explicit documentation. |
| `strictFunctionTypes` | `true` | Redundant with `strict`. Kept as explicit documentation. |
| `noUnusedLocals` | `true` | **Stricter than `strict`** — fails compile on unused locals. This is why `// eslint-disable-next-line @typescript-eslint/no-unused-vars` appears at [`tests/index.spec.ts:43`](../../../tests/index.spec.ts) inside a `try/catch` that wants to swallow `error`. |
| `noUnusedParameters` | `true` | **Stricter than `strict`** — fails compile on unused parameters. Service factory signatures often want a `_` prefix to opt out. |
| `noImplicitReturns` | `true` | Every code path in a function must return a value (or all paths must implicitly return undefined). |
| `noFallthroughCasesInSwitch` | `true` | Switch fall-through requires explicit `// fallthrough` comments. |
| `importHelpers` | `true` | Imports `tslib` helpers (`__extends`, `__awaiter`, etc.) instead of inlining them per-file. **Hazard**: `tslib` is **not** in `package.json` — see §6. |
| `allowSyntheticDefaultImports` | `true` | Lets `import x from 'cjs-module'` work in `tsc` even when the CJS module has no `default` export. Pairs with `esModuleInterop`. |
| `allowJs` | `true` | Permits `.js` files in `include` patterns to participate in compile (mostly for type-checking purposes). Today no `.js` matches `main/**/*.ts` or `main/ui/**/*.ts`, so the flag is dormant — but `noEmit` is off, so a stray `.js` in those trees would be **rewritten** to `build/`. Watch for this. |
| `experimentalDecorators` | `true` | Enabled although **no decorators are currently used** in the project. Likely inherited from a Ractive.js scaffold. Safe to remove if you can confirm no `@decorator` syntax is in use; check `main/ui/**/*.ts` first. |
| `types` | `["node"]` | Restrict ambient types to `@types/node`. Without this, every `@types/*` package in `node_modules/@types` would be auto-included and the global namespace would balloon. |
| `lib` | `["ES2020", "ES6", "DOM"]` | The renderer talks to the DOM (`window`, `document`, `Element`, `SVGSVGElement`); the `lib` keeps the standard-library surface narrower than `target` would allow by default. **`ES6` is redundant** with `ES2020` (which is a superset) — kept for backward-clarity. **`ES2023` is missing from `lib`** even though `target` is `es2023`; this means `tsc` will emit ES2023 syntax but type-check against an ES2020 stdlib (e.g. `Array.prototype.findLast` is ES2023, available in the runtime but **not in the type system**, so `arr.findLast` would error). |

> ⚠ **Hazard — `lib` ≠ `target` mismatch.** If you write `arr.findLast(...)` (ES2023) the runtime accepts it but `tsc` does not. Either bump `lib` to `["ES2023", "DOM"]` or stick to ES2020 stdlib semantics in source. The current project does not use ES2023 stdlib additions, so this hasn't bitten yet.

> ⚠ **Hazard — `importHelpers` without `tslib`.** `importHelpers: true` rewrites helper inlining to `import { __extends } from "tslib"`. `tslib` is **not** in [`package.json`](./package.json.md)'s `dependencies` or `devDependencies`. Today no helper is needed (target ES2023 ≥ source — TS doesn't down-level), so the flag is silently dormant. **The first feature that requires a helper (e.g. async iterator targeting an older runtime) will fail at runtime with `Cannot find module 'tslib'`.** Either drop `importHelpers` or add `tslib` to `dependencies`.

---

## 4. `include` / `exclude`

```jsonc
"include": ["main/**/*.ts", "main/ui/**/*.ts"],
"exclude": ["node_modules", "**/*.test.ts"]
```

- **`include` is overlapping.** `main/**/*.ts` already covers `main/ui/**/*.ts`. The second pattern is **documentation**, not behaviour: it advertises that the UI renderer is the primary consumer.
- **`tests/` is not included.** Playwright compiles `.ts` files in `tests/` itself — `tsc` ignores them.
- **`*.test.ts` is excluded** even though no such files exist. This is the project's signpost: "if you ever add unit tests as `*.test.ts`, they will be ignored by the production tsc compile by default — set up a separate config." See `docs/index.md` Tests section.
- **`index.d.ts` (root) is not in `include`.** That file is consumed via `tsconfig`'s default discovery of root `.d.ts` files (since `noImplicitAny` is on, the renderer's `declare global { interface Window }` augmentation needs to be visible). It works because `tsc` automatically picks up `.d.ts` files in the project root; if `include` is ever rewritten to be more restrictive, `index.d.ts` must be added explicitly. See [`index.d.ts.md`](./index.d.ts.md) §4.

---

## 5. Invariants & gotchas

1. **`outDir: ./build` is load-bearing for the renderer.** [`main/index.html:30`](../../../main/index.html) and `main/background.html:8` reference `../build/...`. Renaming `outDir` requires editing both HTML files plus `main/svgparser.js`, `main/deepnest.js`, `main/background.js`, and `main/util/parallel.js` (worker bootstrap path).
2. **No `rootDir` is set.** `tsc` infers it from the longest common prefix of the `include` patterns — currently `main/`. So `main/foo.ts` → `build/foo.js`, `main/ui/x.ts` → `build/ui/x.js`. If anyone adds a TS file outside `main/` (e.g. `helper_scripts/foo.ts`), the inferred rootDir collapses to `.` and **every existing output path shifts** (`main/ui/x.ts` → `build/main/ui/x.js`). All HTML references break silently. **Mitigation**: explicitly set `"rootDir": "main"` if you ever extend `include` past `main/`.
3. **`declaration: true` writes `.d.ts` files no one reads.** Harmless, but the `build/` tree is ~2× as many files as it needs to be. Toggle off if build size matters.
4. **`skipLibCheck: true`** masks errors in third-party type definitions. The source comment hints at disabling for release; nobody currently does.
5. **`experimentalDecorators` is on but unused.** Removing it is a low-risk cleanup that would catch any future decorator misuse before it ships.
6. **Pre-commit does not run `tsc`.** [`lint-staged`](./package.json.md) only runs Prettier + ESLint on the staged files. Type errors are caught only at `npm run build` time. This makes the CI workflows the actual gate. See [`docs/deployment-guide.md`](../../deployment-guide.md).
7. **There is no `composite: true`** — project references would only matter if there were ≥ 2 tsconfigs, and the discrepancy callout above explains why there is only one.

---

## 6. Known TODOs / debt

- `lib` should be widened to ES2023 (or `target` should be lowered to match ES2020) — see hazard in §3.
- `importHelpers` + missing `tslib` — see hazard in §3.
- Inline comments in the file (`// Generates corresponding '.map' file.` etc.) duplicate the official TS handbook descriptions; they are kept as breadcrumbs for offline reading.
- The `"experimentalDecorators": true` line is the strongest candidate for "remove if not actually used."
- `skipLibCheck` for release: source comment says "worth disabling"; nobody has tried, so we don't know what would break.

There are **no `// FIXME:` / `// todo:` markers** inside `tsconfig.json` itself — only the explanatory comments noted above.

---

## 7. Extension points

| Need | How to add it |
|---|---|
| Add a separate Node tsconfig | New `tsconfig.node.json` with `extends: "./tsconfig.json"` and a narrower `include` (e.g. `main.js` once it migrates to TS). Add an `npm run build:node` script. Update §0's discrepancy callout. |
| Add a separate test tsconfig | New `tsconfig.test.json` with `extends: "./tsconfig.json"` and `include: ["tests/**/*.ts"]`. Useful if Playwright's compile diverges. |
| Project references | Add `composite: true` here and `references: [{path: "..."}]` in the new variants. Only justified once there are ≥ 2 configs. |
| Stricter ESLint integration | Set `noEmit: true` in a wrapper `tsconfig.lint.json` and run `tsc -p tsconfig.lint.json` from CI (`build_release.yml`). Currently CI does the full `npm run build` so type errors are caught, but a no-emit pass would be faster. |
| Path aliases | Add `paths` + `baseUrl: "."`. Today there are zero path aliases — every import is relative. Adding them requires also configuring ESLint resolver and the Playwright runtime separately, so it is non-trivial. |
| Drop unused decorators flag | Remove `"experimentalDecorators": true`, then run `npm run build`. If it still passes, delete. |

---

## 8. Test coverage status

`tsconfig.json` has no direct test. Coverage is implicit:

- **`npm run build`** — runs `tsc` end-to-end. CI workflows in [`.github/workflows/build.yml`](../../../.github/workflows/build.yml) and `playwright.yml` execute this on every PR. A misconfigured tsconfig fails the build.
- **`npm test`** — exercises the compiled output. If `outDir` is wrong or `include` is missing a critical file, the renderer fails to load and the Playwright test ([`tests/index.spec.ts`](../../../tests/index.spec.ts)) hangs at `mainWindow = await electronApp.firstWindow()`.
- **Manual verification**: after changing this file, run `npm run build && npm test` in that order. There is no sub-second feedback loop.

---

## 9. Cross-references

- [`docs/deep-dive/h/package.json.md`](./package.json.md) §2 — `npm run build` command (`tsc && electron-builder install-app-deps`).
- [`docs/deep-dive/h/index.d.ts.md`](./index.d.ts.md) — the root `.d.ts` consumed by this compile via TypeScript's automatic root-`.d.ts` discovery.
- [`docs/deep-dive/c/main__ui__index.ts.md`](../c/main__ui__index.ts.md) — the renderer composition root, the largest single TypeScript file under `include`.
- [`docs/deep-dive/c/main__ui__types__index.ts.md`](../c/main__ui__types__index.ts.md) — UI-only type extensions; `IPC_CHANNELS` is the only runtime export.
- [`docs/deep-dive/b/main__nfpDb.ts.md`](../b/main__nfpDb.ts.md) — the only TS file outside `main/ui/` that ends up loaded by the background renderer.
- [`docs/deep-dive/b/README.md`](../b/README.md) §"How these files are loaded" — narrative on `build/util/*.js` consumers.
- [`docs/architecture.md`](../../architecture.md) §3 — module boundary between legacy JS and TS-compiled UI.
