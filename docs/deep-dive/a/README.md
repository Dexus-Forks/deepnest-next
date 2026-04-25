# Deep dive — Group A: privileged Node (main process & build helpers)

> Per-file deep dives for the privileged-Node surface that runs outside Electron's renderer sandbox. Sibling of the [DEE-11](../../../) parent issue and the [DEE-33](../../../) tracking issue (full-redo successor to DEE-22). Authored by Paige (Tech Writer).

## Files in this group

| File | Role | Deep dive |
|---|---|---|
| `main.js` | Electron app entry. Single-instance lock, `BrowserWindow` factory for the visible main window + the hidden background compute window + the on-demand notification modal, and host of every `ipcMain.on` / `ipcMain.handle` channel in the application. | [main.js.md](./main.js.md) |
| `presets.js` | Sync CRUD over `userData/presets.json`. Three exported functions wired to `load-presets` / `save-preset` / `delete-preset` IPC channels. | [presets.js.md](./presets.js.md) |
| `notification-service.js` | Pull-based notification fetcher. Polls `https://www.deepnest.net/app_notifications.json` and the GitHub releases API, dedupes by UUID against `userData/seen-notifications.json`, builds the `{ title, content, markAsSeen }` payload consumed by the notification window. | [main__notification-service.js.md](./main__notification-service.js.md) |
| `helper_scripts/sign_windows.js` | Per-file Authenticode signer registered as `electron-builder`'s `signtoolOptions.sign` callback. Wraps `signtool.exe` against the Certum hardware token (SHA-1 thumbprint hard-coded). | [helper_scripts__sign_windows.js.md](./helper_scripts__sign_windows.js.md) |
| `helper_scripts/playwright_codegen.js` | Local-only Playwright Inspector launcher for recording new E2E tests. Excluded from every shipped artefact. | [helper_scripts__playwright_codegen.js.md](./helper_scripts__playwright_codegen.js.md) |

## Per-doc structure

Each doc follows the [DEE-11 shared template](../../../) — Purpose · Public surface · IPC / global side-effects · Dependencies · Invariants & gotchas · Known TODOs · Extension points (cross-references) · Test coverage status. Every claim cites a source line number; in-source `// TODO` / `// FIXME` markers are quoted verbatim.

## Scope corrections vs. DEE-11 / DEE-33

| Issue says | Reality | Resolved by |
|---|---|---|
| `main/notification-service.js` | The file lives at the **repo root** (`./notification-service.js`), imported via `require('./notification-service')` from `main.js:8`. There is no `main/notification-service.js`. | Doc filename `main__notification-service.js.md` is preserved per the DEE-11 path-encoding contract; the location discrepancy is documented at the top of [main__notification-service.js.md](./main__notification-service.js.md) §0 and §11. |

No additional in-scope files were discovered. The five files in the table above are the entire Group A surface.

## Headline findings surfaced by the deep-dives

These are concrete, source-grounded observations that future stories can act on. Each is documented with line refs in the per-file deep dive — this list is the index.

| Finding | File | Why it matters |
|---|---|---|
| **`cleanupOldNotifications` early-return is broken.** Line 54 references `this.seenNotificationIds` (no `seenData.`), so the predicate is always truthy and pruning never runs. | `notification-service.js` | `seen-notifications.json` grows unbounded over years of use. See [main__notification-service.js.md §4.5](./main__notification-service.js.md). |
| **`sign_windows.js` skip-list mismatches `package.json#build.win.signExts`.** The script signs `.exe / .dll / .node`; the build config declares `.exe / .dll / .sys / .msi / .appx / .appxbundle`. Any future `nsis`/`msi`/`appx` target ships unsigned with `return true`. | `helper_scripts/sign_windows.js` | Latent signing bypass. See [helper_scripts__sign_windows.js.md §3.3](./helper_scripts__sign_windows.js.md). |
| **`presets.js` and `main.js write-config` perform non-atomic writes.** No temp-rename, no flock, no schema validation, no backup. A crash mid-write truncates the JSON. | `presets.js`, `main.js` | Realistic blast radius is small today (single renderer, serial IPC) but opens the moment any background writer is added. See [presets.js.md §6](./presets.js.md). |
| **`renderer-process-gone` listeners log but never restart.** Both the main window and each background window swallow the failure; a crashed background window leaves a dangling reference until `background-stop` rebuilds. | `main.js` | Background-worker restart story is unwritten. See [main.js.md §9](./main.js.md). |
| **Three windows still ship `nodeIntegration: true`.** Notification window is the most tractable hardening target — it only needs `ipcRenderer`. Main + background windows would require larger preload-bridge rewrites. | `main.js` | Security posture documented; see [main.js.md §6](./main.js.md). Cross-ref ADR-004. |
| **`notification.content` is HTML injected via `.innerHTML`** in a `nodeIntegration: true` window. Mitigation today is upstream trust (`deepnest.net`, `api.github.com`); no DOMPurify, no preload bridge. | `notification-service.js`, `main/notification.html` | Documents the trust boundary explicitly. See [main__notification-service.js.md §8](./main__notification-service.js.md). |
| **URL-rewrite migration runs in two places** (`main.js:355` for `settings.json`, `presets.js:9` for `presets.json`). Belt-and-braces with the renderer-side `PresetService.migrateConversionServer`. | `main.js`, `presets.js` | Any new code that reads either file must reproduce the migration. See [main.js.md §7](./main.js.md), [presets.js.md §5](./presets.js.md). |
| **`os` is imported but never used in `sign_windows.js`.** | `helper_scripts/sign_windows.js` | Trivial cleanup. See [helper_scripts__sign_windows.js.md §7](./helper_scripts__sign_windows.js.md). |

## Test coverage at a glance

| File | Automated coverage |
|---|---|
| `main.js` | Implicit only — `tests/index.spec.ts` launches Electron with `main.js` as entry; the nesting smoke test exercises the `background-start`/`background-response`/`background-progress` round-trip without asserting on the channels by name. Notification flow, preset CRUD, config IPC, and `before-quit` cleanup are uncovered. |
| `presets.js` | None. |
| `notification-service.js` | None automated. The constructor runs at module load during the spec, but the 3 s initial poll does not fire deterministically before the test exits. |
| `helper_scripts/sign_windows.js` | None. Only exercised by a real Windows-signed build. |
| `helper_scripts/playwright_codegen.js` | N/A — it *is* a developer testing aid (records selectors into the Inspector). |

See `docs/deep-dive/j/tests__index.spec.ts.md` for the spec-side perspective.

## Cross-references

- [`docs/deep-dive/b/main__background.js.md`](../b/main__background.js.md) — counterpart compute renderer that consumes `background-start` and emits `background-response`/`background-progress`.
- [`docs/deep-dive/b/main__deepnest.js.md`](../b/main__deepnest.js.md) — main-window producer of `background-start`.
- [`docs/deep-dive/d/main__ui__services__config.service.md`](../d/main__ui__services__config.service.md) — renderer-side caller of `read-config`/`write-config`.
- [`docs/deep-dive/d/main__ui__services__preset.service.md`](../d/main__ui__services__preset.service.md) — renderer-side caller of `load-presets`/`save-preset`/`delete-preset`.
- [`docs/deep-dive/d/main__ui__services__nesting.service.md`](../d/main__ui__services__nesting.service.md) — renderer-side caller of `background-stop`.
- [`docs/deep-dive/g/main__notification.html.md`](../g/main__notification.html.md) — renderer that consumes `{ title, content }` from `notification-service.js` and emits `get-notification-data`/`close-notification`.
- [`docs/deep-dive/g/main__index.html.md`](../g/main__index.html.md) — main-window renderer entry loaded by `main.js`.
- [`docs/deep-dive/h/package.json.md`](../h/package.json.md) — authoritative wiring for `electron-builder`'s `signtoolOptions.sign` and the `pw:codegen` script.
- [`docs/deep-dive/j/tests__index.spec.ts.md`](../j/tests__index.spec.ts.md) — the only Playwright spec that exercises this group's IPC paths.
- `docs/architecture.md` §2 (process & window topology), §3.1 (module table), §5 (IPC contract), §10 (ADRs — ADR-001 worker count, ADR-004 renderer security, ADR-005 window globals), §12 (deployment / signing).

## Completion

- All five files authored fresh from source on `chore/dee-11-iso/group-a` per the DEE-33 full-redo workflow.
- Per-file template (incl. Test coverage status) covered.
- README authored: 2026-04-26.
- No edits outside `docs/deep-dive/a/`.
