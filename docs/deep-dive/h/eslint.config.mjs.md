# Deep Dive — `eslint.config.mjs`

> **Group**: H (build / config / quality) · **Issue**: [DEE-19](../../../) · **Parent**: [DEE-11](../../index.md) · **Author**: Paige · **Generated**: 2026-04-26
>
> Per-file deep dive following the [DEE-11 shared template](../b/README.md). Companion files in this group: [`package.json.md`](./package.json.md), [`tsconfig.json.md`](./tsconfig.json.md), [`playwright.config.ts.md`](./playwright.config.ts.md), [`index.d.ts.md`](./index.d.ts.md).

| Field | Value |
|---|---|
| Path | [`eslint.config.mjs`](../../../eslint.config.mjs) |
| Lines | 10 |
| Format | ESLint **flat config** (ESLint v9+) — ES module |
| Driven by | `lint-staged` (via `.husky/pre-commit`) and any direct `npx eslint` invocation |
| Rule layers | 2 — `@eslint/js` recommended + `typescript-eslint` recommended |
| Custom rules | none |

---

## 1. Purpose

Project-level ESLint configuration. The whole file is ten lines:

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

Two responsibilities:

1. **Apply two recommended rule sets** — `@eslint/js`'s baseline JS rules and `typescript-eslint`'s baseline TypeScript rules — as a flat-config array.
2. **Globally ignore all `.js` files** and `node_modules`. This is the load-bearing decision in the file: every legacy file under `main/` (`deepnest.js`, `background.js`, `svgparser.js`, `util/*.js`, `main.js`, `presets.js`, `notification-service.js`) is excluded from lint by virtue of being `.js`.

The `// @ts-check` comment at line 1 means VS Code (and `tsc --allowJs`) will type-check this file against the bundled type definitions of `@eslint/js` and `typescript-eslint`. There are no other type artifacts.

---

## 2. Public surface

The file's only export is the default flat-config array produced by `tseslint.config(...)`. ESLint's autodiscovery (when invoked from any directory at or below the repo root) loads it; no `--config` flag is needed.

```js
export default tseslint.config(
  eslint.configs.recommended,        // layer 1
  tseslint.configs.recommended,      // layer 2
  { ignores: ['**/*.js', '**/node_modules/**'] }, // layer 3
);
```

`tseslint.config(...)` is a typed builder that returns a `FlatConfigArray`. It performs the same role as wrapping the layers in a top-level `[ ... ]` array and is the recommended invocation per `typescript-eslint` v8 docs.

---

## 3. The three layers

### 3.1 `@eslint/js` `configs.recommended`

The ESLint built-in baseline. Includes rules like `no-undef`, `no-unused-vars`, `no-empty`, `no-cond-assign`, `no-irregular-whitespace`, `no-useless-escape`, `no-self-assign`, `prefer-const`, `no-var`, `no-prototype-builtins`, etc. Full set documented at [eslint.org/docs/latest/rules](https://eslint.org/docs/latest/rules) (filtered by "recommended").

### 3.2 `typescript-eslint` `configs.recommended`

Adds the TypeScript-aware companion: `@typescript-eslint/no-explicit-any`, `@typescript-eslint/no-unused-vars` (which **shadows** the JS variant), `@typescript-eslint/no-empty-function`, `@typescript-eslint/ban-ts-comment`, etc. **Does not** include type-checked rules (`recommended-type-checked`) — those would require pointing the parser at [`tsconfig.json`](./tsconfig.json.md), which the config does not do.

> ⚠ **Note.** Without `recommended-type-checked`, rules like `@typescript-eslint/no-unsafe-*` are inactive. The renderer's many `as unknown as ...` casts (see [`main/ui/index.ts`](../../../main/ui/index.ts)) would otherwise be flagged as unsafe. This is an **intentional** loosening — ADR-005 in [`docs/architecture.md`](../../architecture.md) accepts the renderer's cast soup as the cost of `contextIsolation: false`.

### 3.3 Ignore layer

```js
{ ignores: ['**/*.js', '**/node_modules/**'] }
```

- **`**/*.js`** — the **load-bearing exclusion**. Every legacy CommonJS / ES-module-script file in the project is `.js`. ESLint sees none of them. This is deliberate: `main/util/clipper.js` is vendored with `var`-based UMD code that would generate hundreds of warnings; rewriting it would obliterate blame.
- **`**/node_modules/**`** — defensive. ESLint's default already ignores `node_modules`; this is belt-and-braces in case the default ever changes.

The ignore object is a **separate config block** (per flat-config semantics, an object with only `ignores` is a global ignore). It is not scoped to a specific files glob.

> ⚠ **Hazard — `eslint.config.mjs` is itself `.js`-shaped (`.mjs`).** `**/*.js` does not match `.mjs`, so the config does not self-ignore. Good. But it also means **no `*.cjs` is ignored** — if a future contributor adds `something.cjs` they get full lint. Today there are no `.cjs` files in the source tree.

> ⚠ **Hazard — `*.json` is included in `lint-staged` but not in this config.** [`package.json` `lint-staged`](./package.json.md) globs JSON through `eslint --fix`, but ESLint only lints JSON if a JSON parser plugin is installed. None is. The JSON files therefore go through Prettier only; the ESLint pass is a no-op (silent). Either drop JSON from the `lint-staged` glob or add `eslint-plugin-jsonc`.

---

## 4. What is **not** configured

| Concept | Status | Why it matters |
|---|---|---|
| `languageOptions.parserOptions.project` | **unset** | Disables type-checked rules. The `recommended-type-checked` ruleset would require this. See §3.2. |
| `languageOptions.globals` | **unset** | The renderer uses `Ractive`, `interact`, `svgPanZoom`, `ClipperLib`, `GeometryUtil`, `Parallel`, `simplify` as globals. `tsconfig.json` covers the type side; ESLint doesn't see them today because all consumer files are `.js` and excluded. As soon as a `.ts` file under `main/ui/` does `(window as any).Ractive`, ESLint will flag it. |
| `rules` overrides | **none** | Nothing is silenced or upgraded. Rule severity is whatever the recommended sets ship. |
| `files` scoping | **none** (one ignore block, two universal layers) | The two recommended layers apply to every non-ignored file (`*.ts`, `*.tsx`, `*.mjs`, `*.cjs`, `*.mts`, `*.cts`). For this project that is essentially `main/ui/**/*.ts`, `main/util/*.ts`, and `tests/index.spec.ts`. |
| `linterOptions.reportUnusedDisableDirectives` | **unset** | `// eslint-disable-next-line` directives are not validated. Stale ones survive. |
| Plugin-specific configs | **none** | No `eslint-plugin-import`, `eslint-plugin-promise`, `eslint-plugin-prefer-arrow`, `eslint-plugin-jsdoc`, etc. Intentionally minimal. |

---

## 5. Files actually linted (today)

Computed from `tsconfig.json#include` minus the `.js` ignore plus `tests/`:

- `main/ui/**/*.ts` — every UI service / component / util. ([`main/ui/index.ts`](../../../main/ui/index.ts), [`main/ui/services/*.ts`](../../../main/ui/services/), [`main/ui/components/*.ts`](../../../main/ui/components/), [`main/ui/utils/*.ts`](../../../main/ui/utils/), [`main/ui/types/index.ts`](../../../main/ui/types/index.ts).)
- `main/util/*.ts` — first-party TS utils only (`HullPolygon.ts`, `point.ts`, `vector.ts`, `matrix.ts`, `domparser.ts`, `eval.ts`).
- `main/nfpDb.ts` — NFP cache layer.
- `index.d.ts` — root type spec (the file currently triggers no rules because it is type-only).
- `tests/index.spec.ts` — the E2E spec.
- `playwright.config.ts` — this group's other config.
- `eslint.config.mjs` — this file (not ignored by `**/*.js`).

Files **not** linted:

- Everything under `main/util/` that is `.js` (Clipper, Ractive, simplify, svgpanzoom, parallel, geometryutil, interact, pathsegpolyfill).
- `main.js`, `presets.js`, `notification-service.js`, `helper_scripts/*.js` (root + script JS).
- `main/index.html`, `main/background.html`, `main/notification.html` — HTML files; ESLint has no HTML parser configured.
- Anything under `node_modules/`.

---

## 6. Invariants & gotchas

1. **Excluding `**/*.js` is a contract, not an oversight.** Removing the ignore re-exposes every legacy module to lint and would generate hundreds of warnings (especially in the vendored utils). Don't simplify the ignore.
2. **Flat config is required.** ESLint v9 dropped `.eslintrc` support unless `ESLINT_USE_FLAT_CONFIG=false` is set. The CI shell does **not** export that variable, so reverting to `.eslintrc` would silently fail.
3. **No `parserOptions.project`** — type-aware rules are off. If you ever add `@typescript-eslint/no-floating-promises`, you must also wire `project: true` (or a path to [`tsconfig.json`](./tsconfig.json.md)). Without it, the rule errors at config-load time.
4. **`tests/index.spec.ts` is linted.** The spec uses `eslint-disable` directives at line 1 and 43; those are honoured. `lint-staged`'s `eslint --fix` will rewrite the spec's autofixable issues — be careful when editing the spec to not accidentally have eslint reformat fixture data.
5. **Pre-commit runs only on staged files.** A bulk lint run of the whole project (`npx eslint .`) is **never** automated. CI workflows do not run ESLint either (they run `npm run build` and `npm test`). So a stale rule violation in an un-touched file lives forever.
6. **`@ts-check` does not affect lint behaviour.** It only enables in-editor type checking for this `.mjs` file. ESLint ignores it.

---

## 7. Known TODOs / debt

- **No `lint` npm script.** Adding `"lint": "eslint ."` to [`package.json`](./package.json.md) would let CI run a full project lint pass without `lint-staged`. Today CI does not lint at all.
- **No `eslint-plugin-jsonc`** despite `lint-staged` running `eslint --fix` on `*.json`. Either install + configure the plugin or drop JSON from the staged glob.
- **No `reportUnusedDisableDirectives`.** Add `linterOptions: { reportUnusedDisableDirectives: 'warn' }` to surface stale `// eslint-disable-next-line` comments.
- **Recommended-type-checked is not enabled.** A future stricter pass would benefit from it but requires per-file scoping (cost: parser must read `tsconfig.json` for every file).
- **`globals` for renderer-injected window globals** — once a `.ts` file references `Ractive` / `interact` / `svgPanZoom` directly, ESLint will flag them as `no-undef`. Either declare them here under `languageOptions.globals` or keep wrapping access in `(window as any).X`.

There are no `// FIXME:` / `// todo:` markers in the file.

---

## 8. Extension points

| Need | How to add it |
|---|---|
| Per-file overrides | Append a flat-config block: `{ files: ['main/ui/services/*.ts'], rules: { '@typescript-eslint/explicit-function-return-type': 'error' } }`. |
| Stricter type-checked rules | Replace `tseslint.configs.recommended` with `tseslint.configs.recommendedTypeChecked` and add `languageOptions: { parserOptions: { project: true, tsconfigRootDir: import.meta.dirname } }`. |
| Stylistic rules | Add `@stylistic/eslint-plugin` or wait for typescript-eslint's stylistic preset. Today Prettier owns formatting. |
| HTML linting | Add `@html-eslint/eslint-plugin` and a per-file block scoping `*.html`. |
| JSON linting | `eslint-plugin-jsonc` + a per-file block. Pairs with the existing `lint-staged` JSON glob. |
| Project-wide `lint` script | Add `"lint": "eslint ."` to `package.json#scripts`. Add a `lint` job to [`.github/workflows/build.yml`](../../../.github/workflows/build.yml). |
| Surface stale disables | `linterOptions: { reportUnusedDisableDirectives: 'warn' }` at the top of the array. |
| Re-enable `.js` linting | Remove `'**/*.js'` from `ignores`. Expect dozens of warnings in `main/util/*.js`; either accept them (downgrade rules) or migrate the files to TS. |

---

## 9. Test coverage status

There is no automated test for the lint config itself. Coverage is by side effect:

- **`.husky/pre-commit`** runs `npx lint-staged` which runs `eslint --fix` on staged files matching the [`package.json` `lint-staged`](./package.json.md) globs. Every commit therefore exercises this config against whatever was changed.
- **CI does not run ESLint** (verified against the workflow files in [`.github/workflows/`](../../../.github/workflows/)). This means a contributor who bypasses pre-commit (`git commit --no-verify`) can land code that fails lint.
- **Manual verification**: `npx eslint .` from the repo root runs the full project lint pass. There is no npm shortcut.

---

## 10. Cross-references

- [`docs/deep-dive/h/package.json.md`](./package.json.md) §2.2 — `lint-staged` glob and the pre-commit hook flow.
- [`docs/deep-dive/h/tsconfig.json.md`](./tsconfig.json.md) — list of files this config can see (intersection: `*.ts` minus `*.test.ts` minus the `.js` ignore).
- [`docs/architecture.md`](../../architecture.md) ADR-005 — accepts the renderer's `as unknown as ...` cast soup; explains why type-checked rules are off.
- [`docs/development-guide.md`](../../development-guide.md) — developer commands including manual lint run.
- [`.husky/pre-commit`](../../../.husky/pre-commit) — the only consumer of this config in the standard workflow.
