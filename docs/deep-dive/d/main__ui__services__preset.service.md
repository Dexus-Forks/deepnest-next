# `main/ui/services/preset.service.ts` — Deep Dive

**Generated:** 2026-04-26 by Paige (Tech Writer) for [DEE-36](/DEE/issues/DEE-36) (parent: [DEE-11](/DEE/issues/DEE-11)).
**Group:** D — UI services.
**Surface:** Renderer-side wrapper around the `load-presets` / `save-preset` / `delete-preset` IPC trio.

## 1. Purpose

`PresetService` is a thin renderer-side façade over the [`presets.js`](../../../presets.js) main-process module. It exposes a typed CRUD interface for **named, JSON-stringified `UIConfig` snapshots** persisted at `<userData>/presets.json`. The service:

1. Caches a single `PresetConfig` map (`{ [name]: stringifiedConfig }`) in memory after the first `load-presets` call (`preset.service.ts:65-89`).
2. Invalidates the cache after every successful `save-preset` / `delete-preset` (`preset.service.ts:152, 180`).
3. **Migrates legacy `convert.deepnest.io` URLs to the current `converter.deepnest.app/convert` host** at *read* time, before parsing the preset string (`preset.service.ts:52-59, 115`). This is the third place this rewrite happens — see config.service §7 and `main.js:355` / `presets.js:9`.

## 2. Public surface

| Member | Lines | Purpose |
| --- | --- | --- |
| `class PresetService` | 28-215 | The service class. |
| `constructor(ipcRenderer?)` | 42-44 | Stores the IPC renderer; `null` is allowed for tests. |
| `loadPresets(): Promise<PresetConfig>` | 65-89 | Cache-aware fetch via `IPC_CHANNELS.LOAD_PRESETS`. Returns `{}` on missing IPC, on null/non-object response, or on caught error. **Never throws.** |
| `getPresetNames(): Promise<string[]>` | 95-98 | `Object.keys(loadPresets())`. |
| `getPreset(name): Promise<Partial<UIConfig> \| null>` | 105-121 | Retrieve, migrate URLs, `JSON.parse`. Returns `null` if unknown name or parse failure. **Swallows parse errors silently** (line 117). |
| `savePreset(name, config): Promise<void>` | 130-158 | Trims the name, rejects empty names, accepts either `UIConfig` (auto-stringified) or a pre-stringified `string`. Throws on missing IPC or any IPC error (wrapped). |
| `deletePreset(name): Promise<void>` | 166-186 | Trims, rejects empty, sends `delete-preset`. Throws on missing IPC or IPC error (wrapped). |
| `hasPreset(name): Promise<boolean>` | 193-196 | Membership check via the cache. |
| `invalidateCache(): void` | 202-205 | Public manual invalidation hook. |
| `static create(ipcRenderer)` / `createPresetService(ipcRenderer)` | 212-224 | Sync factories. No `initialize()` needed because the cache is loaded lazily on first read. |

The `PresetConfig` type is `{ [name: string]: string }` (`main/ui/types/index.ts:260-262`) — the value is a JSON-stringified `UIConfig`, **not** a parsed object. That's the on-disk shape the main-process `presets.js` produces.

## 3. IPC contract

Three channels, all `invoke`/`handle` (request/reply):

| Channel | Direction | Sender (renderer) | Handler (main) | Payload in | Payload out |
| --- | --- | --- | --- | --- | --- |
| `load-presets` | renderer → main | `preset.service.ts:75` | [`main.js:378-380`](../../../main.js) → [`presets.js:7-12`](../../../presets.js) | (none) | `PresetConfig` (or `{}` if `presets.json` missing) |
| `save-preset` | renderer → main | `preset.service.ts:145-149` | [`main.js:382-384`](../../../main.js) → [`presets.js:14-18`](../../../presets.js) | `(name: string, configString: string)` | `void` |
| `delete-preset` | renderer → main | `preset.service.ts:177` | [`main.js:386-388`](../../../main.js) → [`presets.js:20-24`](../../../presets.js) | `(name: string)` | `void` |

The constants are declared in `main/ui/types/index.ts:268-270`.

The persisted file lives at `app.getPath("userData") + "/presets.json"` (resolved in [`presets.js:5`](../../../presets.js)). The whole map is rewritten on every save/delete (read-modify-write — see [`presets.js:14-23`](../../../presets.js)), so concurrent saves from multiple windows would race. The renderer is the only writer in practice (the app is single-window).

## 4. Dependencies

**Imports** (`preset.service.ts:1-8`):

- `UIConfig`, `PresetConfig` — type-only from `../types/index.js`.
- `IPC_CHANNELS`, `DEFAULT_CONVERSION_SERVER` — values from `../types/index.js`.

**Runtime dependencies** (injected via `IpcRenderer` interface, `preset.service.ts:11-13`):

- An object exposing `invoke(channel, ...args): Promise<unknown>`. Production: Electron's `ipcRenderer`.

**Reverse dependencies**:

| Consumer | How it uses the service |
| --- | --- |
| [`main/ui/index.ts:597`](../../../main/ui/index.ts) | Created via `createPresetService(ipcRenderer)` once at startup. |
| [`main/ui/index.ts:218-238` (`loadPresetList`)](../../../main/ui/index.ts) | Fetches `loadPresets()` to populate the `<select id="presetSelect">` dropdown. |
| [`main/ui/index.ts:291-313` (Save modal)](../../../main/ui/index.ts) | `savePreset(name, configService.getSync())` after the user enters a name in the modal. |
| [`main/ui/index.ts:316-357` (Load button)](../../../main/ui/index.ts) | `getPreset(name)`, then `configService.setSync(presetConfig)` plus the access/id token preservation pattern. |
| [`main/ui/index.ts:360-382` (Delete button)](../../../main/ui/index.ts) | Confirms via `window.confirm`, then `deletePreset(name)`. |

The service is **not** consumed by any of the four UI components (`navigation`, `parts-view`, `nest-view`, `sheet-dialog`) — preset management lives entirely in the index.ts composition root, behind the `#preset-modal` DOM and the dropdown.

## 5. Caching invariants

The cache is a simple two-field invariant: `cachedPresets: PresetConfig | null` + `cacheValid: boolean` (`preset.service.ts:33-36`). Rules:

1. **First read populates** (`preset.service.ts:79-82`).
2. **Save/delete invalidates** (`preset.service.ts:152, 180`). The next `loadPresets()` re-fetches.
3. **Errors don't populate**. Both the `null`-response branch (line 84) and the catch branch (line 85) return `{}` *without* setting `cacheValid = true`, so the next call still hits IPC.
4. **External cache sync is the caller's job.** If a future feature lets a different process write `presets.json`, callers must invoke `invalidateCache()` themselves; the service does not watch the file.

## 6. URL migration

The same legacy-host migration that lives in `main.js:355` (config) and `presets.js:9` (preset *load*) is **also implemented in this service** at read time:

```ts
// preset.service.ts:18-21
const LEGACY_CONVERSION_SERVERS = [
  "http://convert.deepnest.io",
  "https://convert.deepnest.io",
] as const;

// preset.service.ts:52-59 (private migrateConversionServer)
for (const legacyUrl of LEGACY_CONVERSION_SERVERS) {
  migrated = migrated.split(legacyUrl).join(DEFAULT_CONVERSION_SERVER);
}
```

The result: `getPreset(name)` returns a config in which `conversionServer` has already been rewritten — even if the on-disk preset string still contained the legacy host. Note this is a **belt-and-braces** layer: `presets.js:9` already rewrites at IPC-read time. If `presets.js` ever stops doing so, this service still produces a clean value. If `preset.service.ts` ever stops doing so, the main-process layer still does. Either layer is sufficient on its own.

The migration is *not* propagated back to disk — it happens read-side only. To physically clean up `presets.json`, the user must load and re-save each preset. (`savePreset` calls `JSON.stringify(config)` on the parsed object, which writes the migrated value.)

## 7. Invariants & gotchas

1. **Empty-string names are rejected after `trim()`** at lines 132 and 168. A name of `"   "` (whitespace only) raises `"Preset name cannot be empty"`. This is enforced in `savePreset` and `deletePreset`, not in `loadPresets` / `getPreset` — those still tolerate empty keys (they would just return `null`/`undefined` from the map).
2. **`savePreset` and `deletePreset` rewrap thrown errors** (lines 153-156, 181-184). The original error message is preserved but the stack is lost. UI callers in `main/ui/index.ts:308-310, 376-378` swallow the rewrapped error and show a generic `message("Error saving preset", true)` toast. The actual reason isn't surfaced.
3. **`loadPresets` and `getPreset` *never throw*.** Both swallow IPC and parse errors and return `{}` / `null`. This is deliberate — the dropdown should still render even if `presets.json` is broken. But it means a callsite cannot distinguish "file missing" from "file unreadable" from "JSON corrupt". That's only acceptable because there are no recovery actions the UI can offer.
4. **The cache is per-instance, not per-process.** Two `PresetService` instances would have independent caches and could disagree until both are invalidated. In practice there is only one instance (created in `main/ui/index.ts:597`), so this is a non-issue.
5. **`hasPreset` walks through `loadPresets()`** (line 194). It's not a separate IPC call — it just hits the cache (or refreshes it). Safe to call freely after the first load.
6. **Saving with an object also stringifies fields *not* in `UIConfig`.** `JSON.stringify(config)` (line 142) serializes everything own-enumerable. Because `ConfigService` exposes `access_token` and `id_token` as instance properties (`config.service.ts:99-100`), saving `configService.getSync()` would persist tokens into the preset. The composition root in `main/ui/index.ts:301` does call `getSync()` without a key — meaning **tokens may end up in saved presets on disk**. The load path then restores tokens from the *current* config (lines 330-342), but the on-disk preset still contains them. This is a (minor) information leak worth knowing about. See TODOs §8.
7. **Round-trip is asymmetric.** Save takes `UIConfig | string`, load returns `Partial<UIConfig> | null`. The parse can drop fields silently (a corrupt JSON returns `null`, but a valid JSON that's missing keys just returns a partial). Callers must merge with current config (which `setSync` does correctly via `Object.assign` semantics).

## 8. Known TODOs / smells

No `// TODO` / `// FIXME` comments exist in `preset.service.ts`. Worth surfacing for follow-up:

1. **Token leak into presets.** The save path doesn't filter out `access_token` / `id_token`. A `sanitizeForPersistence(config)` helper applied before `JSON.stringify` would close this. (Low impact: tokens in `presets.json` are scoped to the same userData directory as `settings.json`, which already has them — but the file is *not* a token store and shouldn't grow into one.)
2. **Generic error toasts.** `main/ui/index.ts:308-310, 376-378` collapse rich error messages from `savePreset` / `deletePreset` into a single string. Bubbling the real error (e.g. "permission denied") would help debugging.
3. **Triple-redundant URL migration.** As noted in `config.service.md` §7 — three sites perform the same `convert.deepnest.io → converter.deepnest.app/convert` rewrite. Centralising into one helper (e.g. `main/util/conversion-server.ts`) would shrink the surface.
4. **No "rename preset" affordance.** There's only save/load/delete. Rename = save-as-new + delete-old, which is two IPC round-trips. Not on the roadmap; noting it because it occasionally surfaces in user feedback.

## 9. Extension points

- **Add a "rename" verb** — extend the IPC trio to a quartet (`rename-preset`); the renderer service can implement it as save+delete in the meantime without changing main-process code.
- **Pre-save sanitiser** — insert before line 141 (`const configString = …`) to strip secret fields.
- **Subscribe to external changes** — the service has no `on` events; if multi-window is ever introduced, an IPC `presets-changed` broadcast plus an `invalidateCache()` listener would suffice.
- **Schema migration on save** — if `UIConfig` shape evolves, `savePreset` is the natural place to up-version the stringified payload (e.g. add a `__schema: 2` field). The legacy URL migration is the prototype for this pattern.

## 10. Test coverage status

- **No unit tests** for `PresetService`. Same gap as `ConfigService` — the constructor's optional `ipcRenderer?` argument is shaped to accept a mock, but no fixture exists.
- **No E2E coverage either.** `tests/index.spec.ts` doesn't open the preset modal or interact with `#presetSelect`. The save/load/delete buttons are uncovered. (See [`docs/deep-dive/j/tests__index.spec.ts.md`](../j/tests__index.spec.ts.md).)
- **The `presets.js` main-process module is also untested.** There is no Jest/Mocha harness in this repo for main-process modules.

A unit test fixture for `PresetService` plus a thin integration test against an in-memory `presets.json` would close this gap with low effort.

## 11. Cross-references

- [`docs/deep-dive/d/main__ui__services__config.service.md`](./main__ui__services__config.service.md) — peer service. Presets are stringified copies of its state.
- [`docs/deep-dive/c/main__ui__index.ts.md`](../c/main__ui__index.ts.md) §"Preset modal" — the composition root that wires this service into the UI.
- [`docs/deep-dive/c/main__ui__types__index.ts.md`](../c/main__ui__types__index.ts.md) — `PresetConfig`, `IPC_CHANNELS.{LOAD,SAVE,DELETE}_PRESETS`, `DEFAULT_CONVERSION_SERVER`.
- [`docs/deep-dive/a/presets.js.md`](../a/presets.js.md) — the main-process counterpart that owns `presets.json`.
- [`docs/deep-dive/a/main.js.md`](../a/main.js.md) — `ipcMain.handle` registrations for the three channels (`main.js:378-388`).
- [`docs/deep-dive/g/main__index.html.md`](../g/main__index.html.md) — the `#preset-modal` and `#presetSelect` DOM that consumers bind to.
