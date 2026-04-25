# Deep dive — Group H: build / config / quality

> Per-file deep dives for every build / config / quality file at the project root. Sibling of [DEE-11](../../../) parent issue and [DEE-19](../../../) tracking issue.

## Files in this group

| File | Deep dive | Topic |
|---|---|---|
| `package.json` | [package.json.md](./package.json.md) | npm scripts, dependency rationale, electron-builder `build` block, husky / lint-staged interplay |
| `tsconfig.json` | [tsconfig.json.md](./tsconfig.json.md) | Single-tsconfig topology, strict-mode bundle, `lib`/`target` mismatch, `outDir → ./build` invariant |
| `playwright.config.ts` | [playwright.config.ts.md](./playwright.config.ts.md) | Single `chromium` project, CI-vs-local switching matrix, custom `metadata.pipeConsole` |
| `eslint.config.mjs` | [eslint.config.mjs.md](./eslint.config.mjs.md) | Flat config, `**/*.js` global ignore (load-bearing), no type-aware rules |
| `index.d.ts` | [index.d.ts.md](./index.d.ts.md) | Engine type contract + `Window` augmentation; canonical for `window.config / DeepNest / nest / SvgParser / loginWindow` |

## Scope discrepancies (verified vs DEE-11 description)

The original DEE-11 file list mentioned two artefacts that **do not exist** in the repo:

1. **`electron-builder.json`** — does not exist. The full electron-builder configuration lives in [`package.json`](../../../package.json) lines 85–146 (the `build` block). Documented in [package.json.md §0 + §4](./package.json.md).
2. **`tsconfig.app.json` / `tsconfig.node.json` / `tsconfig.test.json`** — none exist. The repo uses a single-tsconfig topology. Documented in [tsconfig.json.md §0](./tsconfig.json.md).

These callouts are repeated inline in the relevant write-ups so future readers cannot miss them.

## How these files relate

```
┌───────────────────────────────────────────────────────────────────────┐
│ package.json                                                          │
│  ├─ scripts → npm run build → tsc (uses tsconfig.json) + install-app  │
│  ├─ scripts → npm test → playwright test (uses playwright.config.ts)  │
│  ├─ lint-staged → eslint --fix (uses eslint.config.mjs)               │
│  ├─ build block → electron-builder (Windows signing via sign_windows) │
│  └─ "types": "index.d.ts"                                             │
│                                                                       │
│ tsconfig.json ──────► reads index.d.ts (auto root-.d.ts discovery)    │
│                                                                       │
│ index.d.ts ──────────► declares window.* slots used by:               │
│                         · main/deepnest.js (8× SvgParser, 1× config)  │
│                         · tests/index.spec.ts (DeepNest, config)      │
│                         · main/ui/index.ts (assigns config/nest/login)│
└───────────────────────────────────────────────────────────────────────┘
```

## Per-file template

Each deep dive in this group uses the [DEE-11 shared template](../b/README.md):

1. **Purpose** — one paragraph
2. **Public surface** — exports / globals / IPC
3. **IPC / global side-effects** — what touches `window` or `ipcRenderer`
4. **Dependencies (in / out)** — who imports this; who this imports
5. **Invariants & gotchas** — load order, stale assumptions, hidden contracts
6. **Known TODOs** — `// todo:`, `// FIXME`, debt
7. **Extension points** — where future work plugs in
8. **Test coverage** — Playwright spec lines that exercise this; otherwise "manual / not covered"

For `package.json` the template is reordered to put **Scripts → electron-builder block → Dependency rationale** first (per the DEE-19 group-specific guidance). For `index.d.ts` the template is augmented with a **Used-by** section that maps every `window.*` access in the codebase, per the DEE-19 guidance to mirror the structure of [`main/ui/types/index.ts`](../../../main/ui/types/index.ts) (deep-dived in [Group C](../c/main__ui__types__index.ts.md)).

## Cross-group references

- **Group A** (privileged main process): [`main.js`](../a/main.js.md), [`presets.js`](../a/presets.js.md), [`helper_scripts/sign_windows.js`](../a/helper_scripts__sign_windows.js.md) — consumers / hooks of `package.json#main`, `package.json#build`, `npm run dist*`.
- **Group B** (legacy renderer): [`main/deepnest.js`](../b/main__deepnest.js.md), [`main/svgparser.js`](../b/main__svgparser.js.md) — chief consumers of the `Window` augmentation declared in `index.d.ts`.
- **Group C** (UI renderer composition): [`main/ui/types/index.ts`](../c/main__ui__types__index.ts.md) — re-exports / extends every type from `index.d.ts`; companion read.
