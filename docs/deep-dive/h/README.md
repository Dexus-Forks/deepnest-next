# Deep dive — Group H: build / config / quality

> Per-file deep dives for every build / config / quality file at the project root. Sibling of [DEE-11](/DEE/issues/DEE-11) parent issue and [DEE-40](/DEE/issues/DEE-40) tracking issue (full-redo path, supersedes DEE-29).

**Completed:** 2026-04-26 by Paige (Tech Writer).
**Branch:** `chore/dee-11-iso/group-h` (Paperclip-isolated worktree).
**Mode:** Full redo from current source — prior text not consulted.

## Files in this group

| File | Deep dive | What it documents |
|---|---|---|
| `package.json` | [package.json.md](./package.json.md) | Scripts table with pre/post hooks, husky/lint-staged pipeline, full electron-builder `build` block (since no `electron-builder.json` exists), runtime + dev dependency rationale. |
| `tsconfig.json` | [tsconfig.json.md](./tsconfig.json.md) | Single-tsconfig topology, every compiler flag, strict-mode bundle, latent `importHelpers`/`tslib` gotcha, lib-vs-target mismatch, what `tsc` actually produces. |
| `playwright.config.ts` | [playwright.config.ts.md](./playwright.config.ts.md) | CI-vs-local matrix, single chromium project, custom `metadata.pipeConsole` channel, reporter chain, env-var reads, why `webServer` and `dotenv` blocks stay commented out. |
| `eslint.config.mjs` | [eslint.config.mjs.md](./eslint.config.mjs.md) | Flat-config composition (`@eslint/js` + `typescript-eslint`), the load-bearing `**/*.js` global ignore that grandfathers the legacy renderer, four in-tree `eslint-disable` sites, why type-aware rules are off. |
| `index.d.ts` | [index.d.ts.md](./index.d.ts.md) | Engine type contract (`DeepNestConfig`, `NestingResult`, `Part`, `Polygon`, `*Instance` interfaces) + `Window` augmentation. Includes a Used-by table mapping every `window.*` access in the codebase. |

## Scope corrections (verified vs DEE-11 description)

The DEE-11 parent inventory referenced two artefacts that **do not exist** in the repo:

1. **`electron-builder.json`** — does not exist. The full electron-builder configuration lives in `package.json`'s `build` block (lines 85–146). Documented in [`package.json.md` §0 + §4](./package.json.md). The block is reproduced verbatim there and walked field by field.
2. **`tsconfig.app.json` / `tsconfig.node.json` / `tsconfig.test.json`** — none exist. The repo runs the entire main process, renderer, and tests against a single `tsconfig.json` at the root. Documented in [`tsconfig.json.md` §0](./tsconfig.json.md). The single-tsconfig topology is treated as a deliberate (if costly) choice and the costs are spelled out under §6 Gotchas.

These callouts are repeated inline in the relevant per-file write-ups so future readers cannot miss them.

## How these files relate

```
┌───────────────────────────────────────────────────────────────────────┐
│ package.json                                                          │
│  ├─ scripts.build → tsc           ─────► tsconfig.json                │
│  ├─ scripts.test  → playwright    ─────► playwright.config.ts         │
│  ├─ lint-staged   → eslint --fix  ─────► eslint.config.mjs            │
│  ├─ build (block) → electron-builder    (windows signing via          │
│  │                                       helper_scripts/sign_windows) │
│  └─ "types": "index.d.ts"         ─────► index.d.ts                   │
│                                                                       │
│ tsconfig.json ─────► auto-discovers index.d.ts (root .d.ts rule)      │
│                                                                       │
│ index.d.ts ────────► declares window.* slots used by:                 │
│                       · main/index.html  (assigns SvgParser/DeepNest) │
│                       · main/ui/index.ts (assigns config/nest/login)  │
│                       · main/deepnest.js (8× SvgParser, 1× config)    │
│                       · tests/index.spec.ts (DeepNest, config)        │
│                                                                       │
│ playwright.config.ts ► loads tests/index.spec.ts                      │
│                                                                       │
│ eslint.config.mjs    ► lints **/*.ts; ignores **/*.js (legacy)        │
└───────────────────────────────────────────────────────────────────────┘
```

## Per-file template

Each deep dive follows the [DEE-11 shared template](/DEE/issues/DEE-11#document-template):

1. **Purpose** — one paragraph
2. **Public surface** — exports / globals / IPC
3. **IPC / global side-effects** — what touches `window` or `ipcRenderer`
4. **Dependencies (in / out)** — who imports this; who this imports
5. **Invariants & gotchas** — load order, hidden contracts, footguns
6. **Known TODOs** — `// TODO`, `// FIXME`, debt
7. **Extension points** — where future work plugs in
8. **Test coverage** — Playwright spec lines that exercise this; otherwise "manual / not covered"

For `package.json` the template is reordered to put **Scripts → Husky pipeline → electron-builder block → Dependency rationale** first, per the DEE-40 group-specific guidance ("the most useful section is scripts").

For `index.d.ts` the template is augmented with a **Used-by** table (§3) that maps every `window.*` access in the codebase, per the DEE-40 group-specific guidance ("mirror the structure of `main/ui/types/index.ts` — this is the canonical place where renderer globals are typed").

For `playwright.config.ts` the deep dive lists every project + test directory + the env vars it consumes, per DEE-40 group-specific guidance.

## Cross-group references

- **Group A** (privileged main process): [`main.js`](../a/main.js.md), [`presets.js`](../a/presets.js.md), [`helper_scripts/sign_windows.js`](../a/helper_scripts__sign_windows.js.md), [`helper_scripts/playwright_codegen.js`](../a/helper_scripts__playwright_codegen.js.md), [`main/notification-service.js`](../a/main__notification-service.js.md) — consumers / hooks of `package.json#main`, `package.json#build`, `npm run dist*`, `npm run pw:codegen`.
- **Group B** (legacy renderer): [`main/deepnest.js`](../b/main__deepnest.js.md), [`main/svgparser.js`](../b/main__svgparser.js.md), [`main/util/*`](../b/) — chief consumers of the `Window` augmentation declared in `index.d.ts`. The `**/*.js` ignore in `eslint.config.mjs` grandfathers all of these.
- **Group C** (UI renderer composition): [`main/ui/types/index.ts`](../c/main__ui__types__index.ts.md) — re-imports / extends every type from `index.d.ts`; companion read. [`main/ui/index.ts`](../c/main__ui__index.ts.md) — assigns `window.config` (line 594), `window.nest` (629), `window.loginWindow` (803).
- **Group D** (UI services): [`main/ui/services/config.service.ts`](../d/main__ui__services__config.service.md) — the implementation behind `ConfigObject` (assigned to `window.config`).
- **Group E** (UI components): [`main/ui/components/parts-view.ts`](../e/main__ui__components__parts-view.md), [`nest-view.ts`](../e/main__ui__components__nest-view.md), [`sheet-dialog.ts`](../e/main__ui__components__sheet-dialog.md) — consume `DeepNestInstance` and `ConfigObject`.
- **Group G** (static surfaces): [`main/index.html`](../g/main__index.html.md) — assigns `window.SvgParser` and `window.DeepNest` via the inline boot script.
- **Group J** (test suite): [`tests/index.spec.ts`](../j/tests__index.spec.ts.md) — the single spec loaded by `playwright.config.ts` `testDir: "./tests"`. Asserts on `DeepNestConfig` and `NestingResult` shapes from `index.d.ts`.

## File count & verification

5 deep dives + 1 README = **6 files** under `docs/deep-dive/h/`. All six are committed to `chore/dee-11-iso/group-h`. No edits outside `docs/deep-dive/h/`.

| Commit | Subject |
|---|---|
| `docs(deep-dive-h): wipe before full redo (DEE-40)` | Cleared the prior salvage baseline. |
| `docs(deep-dive-h): add package.json deep dive (DEE-40)` | New write-up. |
| `docs(deep-dive-h): add tsconfig.json deep dive (DEE-40)` | New write-up. |
| `docs(deep-dive-h): add playwright.config.ts deep dive (DEE-40)` | New write-up. |
| `docs(deep-dive-h): add eslint.config.mjs deep dive (DEE-40)` | New write-up. |
| `docs(deep-dive-h): add index.d.ts deep dive (DEE-40)` | New write-up. |
| `docs(deep-dive-h): add Group H cover sheet (DEE-40)` | This README. |

DEE-11 will pick up this branch and integrate; `docs/index.md` and `docs/project-scan-report.json` are authored centrally.
