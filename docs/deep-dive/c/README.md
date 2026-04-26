# Deep dive — Group C: UI renderer composition

> Per-file deep dives for the UI composition root and the UI type spec. Sibling of [DEE-11](../../../) parent issue and [DEE-35](../../../) tracking issue (full-redo, Paperclip-isolated).

## Files in this group

| File | Role | Deep dive |
|---|---|---|
| `main/ui/index.ts` | The composition root: a single `initialize()` function that loads Electron/Node modules, awaits `createConfigService`, builds nine service singletons in dependency order, wires every cross-service callback, and registers nine UI handler binders. The canonical entry-point map. | [main__ui__index.ts.md](./main__ui__index.ts.md) |
| `main/ui/types/index.ts` | The UI type spec. Extends `DeepNestConfig` with `UIConfig`; declares the typed shims for the four legacy globals (`window.DeepNest`, `window.SvgParser`, `window.config`, `window.nest`); declares every Ractive view-data shape; and — most importantly — owns `IPC_CHANNELS`, the only typed contract between the renderer and the Electron main process. | [main__ui__types__index.ts.md](./main__ui__types__index.ts.md) |

## Scope corrections vs. DEE-11

None. The DEE-11 parent issue lists this group as "two files", and on inspection it is exactly two files. No discoveries / re-scoping required.

## Per-doc structure

Both docs follow the [DEE-11 shared template](/DEE/issues/DEE-11) — Purpose · Public surface · IPC / global side-effects · Dependencies · Invariants & gotchas · Known TODOs · Extension points · Test coverage · Cross-references.

Group-specific deliverables (per DEE-35 brief):

- **`main__ui__index.ts.md` §2.2** — the boot sequence reproduced as a numbered list with each step tied to the source line. Every `initialize()` step from `require()` (line 766) through `loadInitialFiles()` (line 800) and the final `window.loginWindow = null` (line 803) is mapped. §4.2 reproduces the component-init dependency graph as ASCII with each cross-service callback (`updatePartsCallback`, `displayNestFn`, `saveJsonFn`, `attachSortCallback`, `applyZoomCallback`, `resizeCallback`) listed at its construction site.
- **`main__ui__types__index.ts.md` §3** — the IPC channel table presented as `channel name | direction | payload | sender (file:line) | handler (file:line) | consumer`, plus a directionality diagram and a list of channels that exist in `main.js` but are *not* surfaced in `IPC_CHANNELS` (the cleanup candidates).

## Notable gotchas surfaced

The deep-dives surfaced ten consumer-facing invariants in `index.ts` and ten in `types/index.ts` that are not enforced by the type system or any test, including:

| Surface | Gotcha | Doc reference |
|---|---|---|
| `index.ts` | The `data-conversion` comparator is `=== "true"` — `data-conversion="false"` does **not** disable conversion. | [§5.2](./main__ui__index.ts.md#52-data-conversion-comparator-is--true) |
| `index.ts` | Internal config store is **always inches**; mm display is computed at the boundary. The `key === "scale"` branch must not be folded into the generic `data-conversion` branch. | [§5.1](./main__ui__index.ts.md#51-internal-store-is-inches-mm-display-is-computed-at-the-boundary) |
| `index.ts` | User profile (`access_token`, `id_token`) is preserved by an inline pattern across **two** code paths (preset load + reset to defaults). Skipping the restore step logs the user out silently — no test covers this. | [§5.5](./main__ui__index.ts.md#55-user-profile-is-preserved-across-presetreset-operations) |
| `index.ts` | `BOOLEAN_CONFIG_KEYS` is the only switch that distinguishes checkbox keys from text-input keys. Skipping it on a new boolean key stores the literal `"true"`/`"false"` string and silently breaks every consumer. | [§5.6](./main__ui__index.ts.md#56-boolean-keys-are-typed-boolean-not-truefalse) |
| `index.ts` | The `#config input, #config select` query is duplicated in `updateForm` and `initializeConfigForm`; the `presetSelect`/`presetName` skip list has to be updated in **both** places. | [§5.7](./main__ui__index.ts.md#57-preset-and-config-form-share-the-same-input-set) |
| `types/index.ts` | `IPC_CHANNELS` values are kebab-case **except** `setPlacements`. | [§5.2](./main__ui__types__index.ts.md#52-ipc_channels-values-are-kebab-case-except-setplacements) |
| `types/index.ts` | `exportWithSheetBoundboarders` is misspelt and the typo is load-bearing across HTML, defaults, and persisted user `settings.json`. | [§5.3](./main__ui__types__index.ts.md#53-exportwithsheetboundboarders-is-misspelt) |
| `types/index.ts` | `PresetConfig` values are **double-encoded JSON** — the wrapping JSON file already represents the keys as JSON strings, and each value is itself a JSON-stringified `UIConfig`. | [§5.4](./main__ui__types__index.ts.md#54-presetconfig-values-are-json-stringified-uiconfig) |
| `types/index.ts` | No runtime IPC payload validators. `ipcRenderer.invoke`'s loose typing is the only safety net. | [§5.10](./main__ui__types__index.ts.md#510-no-runtime-validators) |
| `types/index.ts` | Four channels exist in `main.js` (`login-success`, `purchase-success`, `test`, `get-notification-data`/`close-notification`) but are **not** in `IPC_CHANNELS` and so are string-typed at the consumer site. | [§3.4](./main__ui__types__index.ts.md#34-channels-not-in-ipc_channels) |

## Cross-references

- [`docs/deep-dive/a/main.js.md`](../a/main.js.md) — Electron main process; every IPC handler has a matching renderer call here.
- [`docs/deep-dive/g/main__index.html.md`](../g/main__index.html.md) — every `data-config="<UIConfig key>"` attribute has a runtime consumer in `index.ts`. Group G's table and Group C's docs are mirrored.
- [`docs/deep-dive/d/main__ui__services__config.service.md`](../d/main__ui__services__config.service.md), [`preset.service.md`](../d/main__ui__services__preset.service.md), [`import.service.md`](../d/main__ui__services__import.service.md), [`export.service.md`](../d/main__ui__services__export.service.md), [`nesting.service.md`](../d/main__ui__services__nesting.service.md) — the five services constructed by `index.ts`.
- [`docs/deep-dive/e/main__ui__components__navigation.md`](../e/main__ui__components__navigation.md), [`parts-view.md`](../e/main__ui__components__parts-view.md), [`nest-view.md`](../e/main__ui__components__nest-view.md), [`sheet-dialog.md`](../e/main__ui__components__sheet-dialog.md) — the four UI components mounted by `index.ts`.
- [`docs/deep-dive/j/tests__index.spec.ts.md`](../j/tests__index.spec.ts.md) — the only e2e test that exercises the full boot path.
- [`docs/architecture.md`](../../architecture.md) §5 — IPC contract behaviour. §7 — cross-cutting concerns (units, scaling, configuration).

## Completion

Generated 2026-04-26 by Paige (Tech Writer) under [DEE-35](/DEE/issues/DEE-35). Branch: `chore/dee-11-iso/group-c`. File count: 2 source deep-dives + this README. No source files changed.
