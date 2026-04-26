# `eslint.config.mjs` — Deep Dive

**Generated:** 2026-04-26 by Paige (Tech Writer) for [DEE-40](/DEE/issues/DEE-40) (parent: [DEE-11](/DEE/issues/DEE-11), supersedes DEE-29).
**Group:** H — build / config / quality.
**File:** `eslint.config.mjs` (10 LOC, project root).
**Mode:** Exhaustive deep-dive.

## 1. Purpose

ESLint **flat-config** entry point. Loaded automatically by:

- `npm run precommit` → `lint-staged` → `eslint --fix` (per-staged-file, glob `**/*.{ts,html,css,scss,less,json}` — see [`package.json`](./package.json.md) §3.2).
- IDE / language-server integrations (VS Code's `dbaeumer.vscode-eslint`, etc.).
- Direct `npx eslint .` invocations during refactors.

The whole file:

```js
// @ts-check

import eslint from '@eslint/js';
import tseslint from 'typescript-eslint';

export default tseslint.config(
  eslint.configs.recommended,
  tseslint.configs.recommended,
  {ignores:['**/*.js', '**/node_modules/**']},
);
```

It composes two upstream presets — `@eslint/js`'s `recommended` and `typescript-eslint`'s `recommended` — and applies a single ignore list. There is no project-specific rule, no parser override, no per-file-glob rule, and no plugin beyond what `typescript-eslint` brings.

## 2. Module shape

The `.mjs` extension forces ESM evaluation regardless of the parent `package.json` `"type"` field (which is absent here, so Node would default to CommonJS — `.mjs` overrides that). The file therefore uses `import ... from` syntax directly.

The `// @ts-check` directive on line 1 turns on inline TypeScript type-checking for this file when opened in an editor. There is no `// @ts-expect-error` anywhere, and the imports are typed by `@types/node` (already in [`tsconfig.json`](./tsconfig.json.md) `types`) plus the upstream packages' own typings.

The exported value is the result of `tseslint.config(...)` — a helper that wraps an array of flat-config blocks, returning an array. Flat config (introduced in ESLint 9) replaces the legacy `.eslintrc.*` cascade with a single composable array.

## 3. Composed presets

### 3.1 `eslint.configs.recommended` (line 7)

The baseline `@eslint/js` recommended ruleset. Enables (selection of the most relevant):

- `no-undef`, `no-unused-vars` (later overridden by `typescript-eslint`).
- `no-cond-assign`, `no-constant-condition`, `no-debugger`, `no-dupe-args`, `no-dupe-keys`, `no-empty`, `no-extra-semi`, `no-fallthrough`, `no-func-assign`, `no-irregular-whitespace`, `no-redeclare`, `no-sparse-arrays`, `no-unreachable`, `use-isnan`, `valid-typeof`, etc.

These are the universal "don't write broken JavaScript" rules. None are customised here.

### 3.2 `tseslint.configs.recommended` (line 8)

The `typescript-eslint` recommended preset. Adds (selection):

- `@typescript-eslint/no-unused-vars` (replaces the base `no-unused-vars` for TS files).
- `@typescript-eslint/no-explicit-any` — flags `any` annotations.
- `@typescript-eslint/no-this-alias` — flags `const self = this`.
- `@typescript-eslint/ban-ts-comment` — flags `// @ts-ignore` etc.
- `@typescript-eslint/no-empty-object-type`, `@typescript-eslint/no-unsafe-function-type`, `@typescript-eslint/no-wrapper-object-types`, `@typescript-eslint/triple-slash-reference`.

This preset also installs the parser. Without it, ESLint would not understand `interface`, `type`, generics, etc.

**Important**: this is `recommended`, **not** `recommended-type-checked`. No type-aware rules are enabled. ESLint never invokes the TypeScript program — it only does syntactic analysis. Type-aware rules (`no-floating-promises`, `no-misused-promises`, `no-for-in-array`, `await-thenable`, `unbound-method`) are therefore inactive even though every file is `.ts`. Enabling them would require adding `parserOptions.project: './tsconfig.json'` to a `languageOptions` block — see §7.

### 3.3 The ignore block (line 9)

```js
{ignores:['**/*.js', '**/node_modules/**']}
```

This is **the most load-bearing line in the file.** Two patterns:

| Pattern | What it excludes |
|---|---|
| `**/*.js` | Every JavaScript file in the repo. Includes the legacy renderer (`main/deepnest.js`, `main/svgparser.js`), every `main/util/*.js` (clipper, geometryutil, interact, parallel, pathsegpolyfill, ractive, simplify, svgpanzoom), the helper scripts (`helper_scripts/*.js`), `main.js` itself, `main/background.js`, `main/notification-service.js`, the Playwright codegen helper. |
| `**/node_modules/**` | Vendor code. Standard exclusion — flat config does NOT auto-ignore `node_modules`, so this entry is required (unlike legacy `.eslintrc`). |

The consequence: **the linter is silent on every `.js` file in the project.** This is a deliberate scope decision — the legacy JS files predate the strict TypeScript surface and were grandfathered in. Re-enabling them would surface hundreds of warnings (mostly `no-unused-vars`, `no-undef` from globals, and the `no-redeclare` from the old `var` patterns).

The exclusion also means **`eslint.config.mjs` itself is never linted.** It is a `.mjs`, not `.js`, so the glob doesn't match — but there's also no rule that would meaningfully fire on a 10-line config. The `// @ts-check` directive at the top covers what static analysis is needed.

## 4. What ESLint actually targets

After the ignore block, the linted set is every file in the repo that:

1. Is a `.ts` file (the `typescript-eslint` parser handles this).
2. Is not under `node_modules/`.
3. Is staged for commit (when invoked through `lint-staged`).

That maps to:

- Everything under `main/ui/**/*.ts` (services, components, utils, types).
- `main/nfpDb.ts`, `main/util/*.ts` (HullPolygon, domparser, eval, matrix, point, vector — the modernised utility set).
- `tests/index.spec.ts`.
- `index.d.ts` and `playwright.config.ts` at root.

Notably **not** linted because they're `.js`: `main/deepnest.js`, `main/svgparser.js`, `main/background.js`, `main/notification-service.js`, every `main/util/*.js`, every `helper_scripts/*.js`. These are documented as the "legacy renderer" set across [Group B](../b/) and [Group A](../a/) deep-dives.

## 5. Inline disables in the codebase

A search for `eslint-disable` finds four sites — these are the rules that the recommended set actively flags but local code needs to override:

| File | Line | Disable | Reason |
|---|---|---|---|
| `tests/index.spec.ts` | 43 | `// eslint-disable-next-line @typescript-eslint/no-unused-vars` | The `error` arg in a `try/catch` is intentionally unused (the catch is just a fall-through). The header comment at line 1 also adds `/*eslint no-empty-pattern: ["error", { "allowObjectPatternsAsParameters": true }]*/` to allow `({}, testInfo)` as a Playwright test signature. |
| `main/util/matrix.ts` | 120 | `// eslint-disable-next-line @typescript-eslint/no-explicit-any` | Math matrix code that genuinely needs `any` for variadic signature unification. |
| `main/ui/utils/ui-helpers.ts` | 79 | `// eslint-disable-next-line @typescript-eslint/no-this-alias` | Throttle helper using the `var self = this` pattern intentionally. |
| `main/ui/utils/dom-utils.ts` | 331 | `// eslint-disable-next-line @typescript-eslint/no-explicit-any` | DOM-utility wrapper that types around legacy DOM APIs. |

There are no `// @ts-ignore` / `// @ts-expect-error` markers anywhere in the source — the codebase prefers explicit `any` (with disable comments) over silencing the compiler.

## 6. Invariants & gotchas

1. **Flat config does NOT auto-ignore `node_modules/`.** The explicit `**/node_modules/**` entry is required. Removing it would make every `eslint --fix` walk into `node_modules` and choke.
2. **`**/*.js` is load-bearing — losing it surfaces hundreds of warnings.** The legacy renderer files (`main/deepnest.js` etc.) have not been linted in years. Re-enabling them is a multi-PR effort, not a config tweak.
3. **No type-aware rules.** `recommended` (not `recommended-type-checked`) is used. Promise-related foot-guns (`no-floating-promises`, `no-misused-promises`) are NOT caught. The codebase's IPC + GA loop has several `await`-less promise calls; any of them could be a latent bug that this lint pass cannot find.
4. **Lint runs only on staged files via `lint-staged`.** A file edited but not staged escapes lint until the editor catches it. CI does not currently invoke `eslint .` standalone — the only enforcement is the pre-commit hook plus IDE feedback.
5. **No `.eslintignore` file exists.** All exclusions live in this file. Flat config has deprecated `.eslintignore` in favour of the inline `ignores` field.
6. **No project-specific rule customisation.** Anything that needs tuning (e.g. allowing `_`-prefixed unused vars, raising `no-explicit-any` from warning to error) requires editing this file. Currently every rule sits at the preset's default severity.
7. **`@ts-check` types this file at IDE-edit time but is not enforced by any build step.** A type error in `eslint.config.mjs` won't fail CI. `npm run build` doesn't touch `.mjs` files; `tsc` doesn't include them.
8. **`tseslint.config(...)` returns a plain array.** Anyone wanting to spread an additional preset can do so by appending to the call: `tseslint.config(..., myExtra, ...rest)`.
9. **No `globals` block.** Browser globals (`window`, `document`) and Node globals (`process`, `__dirname`) are recognised because the upstream presets pre-configure them via `globals.node` / `globals.browser` defaults transitively. The `// eslint-disable-next-line` for the `error` arg in `tests/index.spec.ts:43` is needed *not* because of globals but because `no-unused-vars` fires.
10. **The `// @ts-check` on line 1 means renaming the file to `.js` would lose IDE typing.** The file is `.mjs` specifically for ESM-by-default; an alternative would be to rename to `.js` after adding `"type": "module"` to [`package.json`](./package.json.md), but that would force every other `.js` in the repo to also be ESM — a much larger change.

## 7. Known TODOs

No inline `// TODO` markers (the file is too small). Implicit debt:

- **Type-aware rules are off.** Adding `parserOptions.project: './tsconfig.json'` would unlock the `recommended-type-checked` preset and catch promise / async footguns. Cost: full `tsc` parse on every lint, doubling lint times.
- **`.js` exclusion is a long-term bypass.** A staged migration would be: create a per-file allowlist (`overrides` in flat config), gradually convert `main/util/*.js` to TS, drop the `.js` glob.
- **No CI lint step.** `npm run lint` does not exist as a script. The Husky hook is the only path. Adding `"lint": "eslint ."` would make CI lint runs trivial.
- **No Prettier/ESLint integration.** Prettier is a separate `lint-staged` step (runs *before* ESLint). They don't share rules; conflicts are theoretically possible but, in practice, Prettier's formatting and the recommended rules don't overlap.

## 8. Extension points

| To add… | Touch this file | Also touch |
|---|---|---|
| A new `.ts` file in a not-yet-globbed dir | Nothing — `**/*.ts` outside `node_modules` is auto-included | None |
| Type-aware rules | Add `languageOptions: { parserOptions: { project: './tsconfig.json' } }` to a new block; swap `tseslint.configs.recommended` → `tseslint.configs.recommendedTypeChecked` | None at first; downstream lint failures will then need fixing |
| A custom rule (e.g. `'no-console': 'error'`) | Add `{ rules: { 'no-console': 'error' } }` as a new block in the array | Use `// eslint-disable` on intentional `console.*` calls |
| Lint a subset of `.js` files | Replace `**/*.js` ignore with a more specific allowlist | Also add a parser block for the JS files: `{ files: ['main/util/*.js'], languageOptions: { ecmaVersion: 'latest', sourceType: 'module' } }` |
| Per-test rule relaxation | `{ files: ['tests/**'], rules: { '@typescript-eslint/no-floating-promises': 'off' } }` | None |
| A new ESLint plugin (e.g. `eslint-plugin-import`) | Add it to [`package.json`](./package.json.md) `devDependencies`, import it here, push it into the preset chain | Watch for rule overlap |
| Ignore generated files (`build/**`) | Append to the `ignores` array | The current ignore already covers `.js`, which catches `build/**/*.js` after `tsc` runs. The `.d.ts` files would slip through — add `'build/**'` to be safe. |

## 9. Test coverage

The config is data — no Playwright spec asserts on it. **Indirect coverage**:

- The Husky pre-commit hook runs `lint-staged` → `eslint --fix`, which evaluates this config on every commit. A broken config (typo, missing import) fails the commit.
- The four inline disable comments listed in §5 act as "canaries" — if a future config change disables a rule globally, those disables become unnecessary. There is no automated unused-disable detection in this config (the `--report-unused-disable-directives` flag is not set).

There is no `tests/eslint-config.spec.ts` or schema validation. Quality gates rely on commit hooks + PR review.

## 10. Cross-references

- [`package.json.md`](./package.json.md) §3 — the `lint-staged` block that drives `eslint --fix` against this config.
- [`tsconfig.json.md`](./tsconfig.json.md) — the type config that `recommended-type-checked` rules would consume if enabled.
- [`docs/deep-dive/b/main__deepnest.js.md`](../b/main__deepnest.js.md), [`docs/deep-dive/b/main__svgparser.js.md`](../b/main__svgparser.js.md), [`docs/deep-dive/b/main__util__*.md`](../b/) — the legacy `.js` files that this config explicitly excludes from linting.
- [`docs/deep-dive/c/main__ui__index.ts.md`](../c/main__ui__index.ts.md), [`docs/deep-dive/d/`](../d/), [`docs/deep-dive/e/`](../e/), [`docs/deep-dive/f/`](../f/) — the `main/ui/**/*.ts` surface that **is** linted.
- [`docs/deep-dive/j/tests__index.spec.ts.md`](../j/tests__index.spec.ts.md) — uses one of the four inline `eslint-disable` directives.
