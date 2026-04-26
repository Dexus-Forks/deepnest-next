# Deep dive — Group G: static surfaces

> Per-file deep dives for the static surfaces in `main/`: HTML entry points, icons, web-fonts.
>
> **Tracking**: parent issue [DEE-11](../../../); current Paperclip-isolated redo issue [DEE-39](/DEE/issues/DEE-39) (supersedes the earlier DEE-18 attempt and the DEE-28 redo, both of which failed workspace isolation). All four deep-dives plus this README have been re-verified against `HEAD` on 2026-04-26.

## Files in this group

| Surface | Role | Deep dive |
|---|---|---|
| `main/index.html` | The visible Electron renderer entry point. Hosts the contract surface (`data-config`, `data-conversion`, `data-page`, `data-sort-field`, element ids) consumed by `main/ui/`. | [main__index.html.md](./main__index.html.md) |
| `main/notification.html` | Self-contained renderer for the on-demand modal notification window. Three-channel IPC contract with `main.js`. | [main__notification.html.md](./main__notification.html.md) |
| `main/img/` | Icon set (35 files) consumed exclusively by `main/style.css`. Naming convention + per-icon usage + cleanup candidates. | [main__img.md](./main__img.md) |
| `main/font/` | Lato webfont package. Live binding via `latolatinfonts.css` is loaded by `main/index.html`; demo `stylesheet.css` and `lato-{hai,lig}-*` are unused. | [main__font.md](./main__font.md) |

## Scope corrections vs. DEE-11

The DEE-11 parent issue lists this group's scope as four directories. Two of them turned out to be single files on inspection:

| DEE-11 said | Reality | Resolved by |
|---|---|---|
| `main/notification/*` (HTML + assets directory) | Single file at `main/notification.html`. There is **no** `main/notification/` directory. | Documented as a one-file deep dive; discrepancy explicitly called out at the top of [main__notification.html.md](./main__notification.html.md). |
| `main/img/<35 icons>` per-file write-up | A single naming-convention + inventory write-up was more useful than 35 stubs. | Single doc at [main__img.md](./main__img.md). |
| `main/font/<n weights>` per-file write-up | Same as above — the value is in describing the binding graph, not each `.ttf`. | Single doc at [main__font.md](./main__font.md). |

## Per-doc structure

Each doc follows the `DEE-11` shared template (purpose, public surface, IPC / side-effects, dependencies, invariants, TODOs, extension points, test coverage, cross-refs). The G1 `index.html` deep dive treats the **`data-*` attribute table** as the headline deliverable — without it, the contract between the static HTML and `main/ui/services/config.service.ts` is undocumented.

## Cleanup candidates surfaced

The deep-dives identified five **unused icons** and a larger **demo-only font cluster**. **Resolved in Story 1.1 (DEE-55)** as a single PR — measured saving 1.85 MB:

| Surface | Candidate | Approximate saving | Status |
|---|---|---|---|
| `main/img/` | `auth0logo.svg`, `background.png`, `logo.svg`, `progress.svg`, `stop.svg` | ~32 KB measured | Removed in Story 1.1, DEE-55 |
| `main/font/fonts/` | `LatoLatin-BoldItalic.{eot,ttf,woff,woff2}` (no `@font-face` binding) | ~336 KB measured | Removed in Story 1.1, DEE-55 |
| `main/font/` | The `lato-{hai,lig}-*` cluster + `stylesheet.css` + `specimen_files/` + `generator_config.txt` (only loaded by demo HTML pages) | ~828 KB measured | Removed in Story 1.1, DEE-55 |
| `main/font/fonts/` | `.eot` + `.ttf` for the three live LatoLatin weights (Bold / Regular / Light) — kept woff2/woff only | ~650 KB measured | Removed in Story 1.1, DEE-55 |

Total realised footprint reduction: **1.85 MB** of static resources. None were load-bearing for the live app — `latolatinfonts.css` was simultaneously edited to drop the `.eot`/`.ttf` `src:` URLs (Chromium uses `woff2`/`woff` natively).

## Cross-references

- [`docs/deep-dive/c/main__ui__index.ts.md`](../c/main__ui__index.ts.md) — primary consumer of every `data-config` attribute documented in G1.
- [`docs/deep-dive/d/main__ui__services__config.service.md`](../d/main__ui__services__config.service.md) — the round-trip with the `data-config` form.
- [`docs/deep-dive/e/main__ui__components__navigation.md`](../e/main__ui__components__navigation.md) — `data-page` consumer.
- [`docs/deep-dive/e/main__ui__components__parts-view.md`](../e/main__ui__components__parts-view.md) — `data-sort-field` consumer.
- [`docs/deep-dive/e/main__ui__components__sheet-dialog.md`](../e/main__ui__components__sheet-dialog.md) — sheet-dialog id consumer (`#sheetwidth`, `#sheetheight`, etc.).
- [`docs/deep-dive/a/main.js.md`](../a/main.js.md) §3.3 — opens the notification BrowserWindow that loads G2's `notification.html`.
- [`docs/deep-dive/a/main__notification-service.js.md`](../a/main__notification-service.js.md) — payload builder for G2.

## Acceptance criteria status (DEE-11 / DEE-39)

| Criterion | Status | Where |
|---|---|---|
| Every file in scope has a complete write-up under `docs/deep-dive/g/<file>.md` | ✅ | The four files listed in §"Files in this group" above. |
| Group cover sheet (`README.md`) exists | ✅ | This file. |
| All work is committed to `chore/dee-11-iso/group-g`; not pushed, not merged | ✅ | `git log chore/dee-11-iso/group-g -- docs/deep-dive/g/`. |
| No edits outside `docs/deep-dive/g/` | ✅ | `git diff --name-only $(git merge-base HEAD chore/bmad-method-setup) HEAD -- ':!docs/deep-dive/g/'` returns empty. |
| Per-file template followed (purpose · public surface · IPC / side-effects · dependencies · invariants · TODOs · extension points · test coverage · cross-refs) | ✅ | Each of the four deep-dives has all sections; cross-refs verified to resolve. |
| Line citations are valid against `HEAD` | ✅ | Spot-checked on 2026-04-26 for `main/index.html`, `main/notification.html`, `main.js`, `main/style.css`, `main/font/latolatinfonts.css`. |
| Workspace isolation verified | ✅ | `pwd` = Paperclip-realised worktree; `git branch --show-current` = `chore/dee-11-iso/group-g`. Issue carries `executionWorkspaceSettings.mode: "isolated_workspace"` + `workspaceStrategy.type: "git_worktree"`. |
