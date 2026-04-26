# Deep dive — Group D: UI services

> Per-file deep dives for the five services under `main/ui/services/`. Sibling of [DEE-11](../../../) parent issue and [DEE-36](../../../) tracking issue (full redo of DEE-15/DEE-25 in a Paperclip-isolated worktree).

## Files in this group

| Service | Role | Deep dive |
|---|---|---|
| `main/ui/services/config.service.ts` | Owns the persisted `UIConfig` for the renderer. Round-trips through `read-config` / `write-config` IPC and is the source-of-truth bound to `data-config` form elements in `main/index.html`. | [main__ui__services__config.service.md](./main__ui__services__config.service.md) |
| `main/ui/services/preset.service.ts` | Wraps the `load-presets` / `save-preset` / `delete-preset` IPC trio. Caches the preset map, migrates legacy `convert.deepnest.io` URLs at read time. | [main__ui__services__preset.service.md](./main__ui__services__preset.service.md) |
| `main/ui/services/import.service.ts` | SVG / EPS / PS / DXF / DWG ingestion, conversion-server round-trip, hand-off to `DeepNest.importsvg(...)`. | [main__ui__services__import.service.md](./main__ui__services__import.service.md) |
| `main/ui/services/export.service.ts` | SVG / DXF / JSON export of nesting results. Builds the SVG document in DOM, optionally line-merges via `SvgParser`, optionally POSTs to the conversion server for DXF. | [main__ui__services__export.service.md](./main__ui__services__export.service.md) |
| `main/ui/services/nesting.service.ts` | Bridge between UI and the GA / NFP background pipeline. Owns view-switch, NFP cache wipe, `background-stop` IPC, and the result-focus heuristic. | [main__ui__services__nesting.service.md](./main__ui__services__nesting.service.md) |

## Group scope (5 files)

The DEE-36 issue scope is exactly what landed: 5 service files, no scope corrections. The directory `main/ui/services/` contains nothing else (only a `.gitkeep` and the five `.ts` files). Verified via `ls main/ui/services/` at write time.

## IPC channel map

The Group D services interact with five IPC channels (declared in `main/ui/types/index.ts:267-278`). The table below summarises *which service uses which channel* — a deeper per-channel description lives in each service's deep dive.

| Channel | Direction | Used by | Purpose |
|---|---|---|---|
| `read-config` | renderer → main (invoke) | `ConfigService` | Bootstrap from `<userData>/settings.json`. |
| `write-config` | renderer → main (invoke) | `ConfigService` | Persist on every `setSync`. |
| `load-presets` | renderer → main (invoke) | `PresetService` | Fetch the `<userData>/presets.json` map. |
| `save-preset` | renderer → main (invoke) | `PresetService` | Add or overwrite a named preset. |
| `delete-preset` | renderer → main (invoke) | `PresetService` | Remove a named preset. |
| `background-stop` | renderer → main (send) | `NestingService` | Tear down all NFP-worker `BrowserWindow`s and recreate the pool. |

The remaining `IPC_CHANNELS` constants — `BACKGROUND_START`, `BACKGROUND_PROGRESS`, `BACKGROUND_RESPONSE`, `SET_PLACEMENTS` — are **not** used by any Group D service. They flow between `main/deepnest.js` (renderer) and `main.js` (main process) directly, with the renderer-side handler in `main/ui/index.ts:514-522` reading `BACKGROUND_PROGRESS` to update `#progressbar`. See [`main__ui__services__nesting.service.md`](./main__ui__services__nesting.service.md) §3 for the full ladder.

## Used-by graph (composition root view)

The composition root is [`main/ui/index.ts`](../../../main/ui/index.ts). It is the **only** place where these services are instantiated and the only direct consumer of most of them.

```
main/ui/index.ts
├── createConfigService(ipcRenderer)         ← bootstraps + assigns to window.config
│   └── consumed by: ImportService, ExportService, parts-view, nest-view, sheet-dialog
├── createPresetService(ipcRenderer)
│   └── consumed by: index.ts only (preset modal handlers)
├── createImportService({deps...})
│   └── triggered by: #import button onclick (initializeImportButton)
│   └── triggered by: loadInitialFiles() at startup
├── createExportService({deps...})
│   └── triggered by: #exportjson, #exportsvg, #exportdxf onclicks
│   └── triggered by: nestingService.stopNesting() via saveJsonFn callback
└── createNestingService({fs, ipcRenderer, deepNest, ...})
    └── triggered by: #startnest, #stopnest, #back onclicks (bindEventHandlers)
    └── displayCallback registered with: deepNest.start(progressCb, displayCb)
```

Three of the five services have a constructor with a *bag of optional deps* (`ImportService`, `ExportService`, `NestingService`) — this is the deliberate DI shape that makes them mockable without an Electron harness. None of them have a unit-test fixture yet; that is the most-valuable testing gap surfaced by this deep-dive pass.

## Cross-service dependencies

Within Group D itself:

- `ImportService` and `ExportService` both read from `ConfigService` (`getSync` for `conversionServer`, `scale`, `units`, plus their format-specific keys).
- `PresetService` produces `Partial<UIConfig>` instances that `index.ts` feeds back into `ConfigService.setSync`.
- `NestingService` is wired with `() => exportService.exportToJson()` as its `saveJsonFn` — that's the only inter-service direct call.

Outside Group D, the services interact with:

- `DeepNest` (in `main/deepnest.js`, Group B) — `ImportService` calls `importsvg`; `ExportService` reads `parts` and `nests`; `NestingService` calls `start`, `stop`, `reset`.
- `SvgParser` (in `main/svgparser.js`, Group B) — `ExportService` only, for the line-merging pass.
- `@deepnest/svg-preprocessor` — `ImportService` only, optional, gated by `useSvgPreProcessor`.
- The `axios` HTTP client — `ImportService` and `ExportService` for conversion-server round-trips.
- The DOM (`main/index.html`, Group G) — every service except `PresetService` directly queries DOM elements.

## Security / "should this live in main?" assessment

The task spec asked us to surface **services doing work in the renderer that arguably belong in main** (since `nodeIntegration: true` makes the renderer a fully-trusted Node process). Two callouts:

1. **Conversion-server HTTP** is performed by the renderer in both `ImportService` (POST to convert DXF → SVG) and `ExportService` (POST to convert SVG → DXF). The renderer holds Node fs + axios. A compromised renderer (via a malicious SVG/DXF) could exfiltrate `<userData>` content. Routing the POST through main would shrink the renderer's attack surface. Trade-off: an extra IPC round-trip per import/export.
2. **`fs.writeFileSync` from the renderer** is used by `ExportService` (SVG, DXF, JSON output) and by `NestingService.stopNesting` (the JSON sidecar via `saveJsonFn`). Same security observation. Less load-bearing than the HTTP case because the path comes from a save dialog (user-mediated).

Neither is filed as a TODO in source — they are ambient consequences of the `nodeIntegration: true` choice. Both surface in the per-file deep dives' "Known TODOs / smells" sections for follow-up tickets.

## Test coverage state

Across all five services:

| Service | Unit tests | E2E coverage |
|---|---|---|
| `ConfigService` | 0 | Indirectly via `tests/index.spec.ts` Config Tab (selector fix in `ece5ed7`). |
| `PresetService` | 0 | Not exercised. |
| `ImportService` | 0 | `#import` click + parts-list assertion. Conversion path uncovered. |
| `ExportService` | 0 | `#exportsvg` click + dialog assertion. DXF and JSON paths uncovered. |
| `NestingService` | 0 | `#startnest` and `#stopnest` clicks. `goBack` and `displayCallback` uncovered. |

Every service is constructor-DI-shaped specifically for unit testing. The fixture work is small and high-value — see each per-file "Test coverage status" §.

## Acceptance criteria status (DEE-36)

- [x] Every file in scope has a complete write-up at `docs/deep-dive/d/<file>.md` per the [DEE-11 shared template](../../../) (Purpose · Public surface · IPC / global side-effects · Dependencies · Invariants & gotchas · Known TODOs · Extension points · Test coverage · Cross-references).
- [x] `docs/deep-dive/d/README.md` exists (this file).
- [x] All work committed to `chore/dee-11-iso/group-d`. **Not pushed, not merged** — DEE-11 picks up the branch.
- [x] No edits outside `docs/deep-dive/d/`.
- [x] Group cover sheet documents scope, file inventory, and notes that no scope corrections were needed.

## Completion timestamp

Authored by Paige (Tech Writer) for DEE-36 on **2026-04-26** in Paperclip-isolated worktree on branch `chore/dee-11-iso/group-d` (branched from `chore/bmad-method-setup`). All prior write-ups (DEE-15 on this branch, DEE-25 on `chore/dee-11/group-d`) were wiped before authoring per board directive.
