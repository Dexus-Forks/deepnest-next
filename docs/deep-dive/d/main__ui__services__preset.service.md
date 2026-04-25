# `main/ui/services/preset.service.ts` — PresetService

Wraps **named-preset CRUD** for the renderer. A preset is a user-saved snapshot
of the configuration object, persisted as a JSON-stringified value under a
human-readable name. The service is a thin IPC client that proxies to the
preset store implemented in [`presets.js`](../../../presets.js) on the main
process side.

- File: [`main/ui/services/preset.service.ts`](../../../main/ui/services/preset.service.ts)
- Public API: `PresetService` class + `createPresetService()` factory.

## Role in the architecture

```
+---------------------------+   IPC (invoke)        +----------------------------+
| PresetService (renderer)  |  load-presets    -->  | ipcMain.handle("...")      |
|  - cache: PresetConfig    |  save-preset     -->  | -> presets.js              |
|                           |  delete-preset   -->  | -> presets.json (userData) |
+---------------------------+                       +----------------------------+
             ^
             |
   #savePresetBtn / #loadPresetBtn / #deletePresetBtn  (main/index.html)
   handlers wired in main/ui/index.ts initializePresetModal()
```

## Public API surface

| Member | Purpose |
| --- | --- |
| `constructor(ipcRenderer?)` | IPC is optional for tests. |
| `loadPresets(): Promise<PresetConfig>` | Cache-aware. Returns a `{ [name]: stringifiedConfig }` map. Errors → `{}`. |
| `getPresetNames(): Promise<string[]>` | `Object.keys(loadPresets())`. |
| `getPreset(name): Promise<Partial<UIConfig> \| null>` | Looks up the named preset, runs `migrateConversionServer` on the JSON string, returns parsed object. Returns `null` on miss or parse failure. |
| `savePreset(name, config: UIConfig \| string): Promise<void>` | Trims the name, rejects empty. Stringifies if needed. Invalidates cache after success. |
| `deletePreset(name): Promise<void>` | Trims the name, rejects empty. Invalidates cache after success. |
| `hasPreset(name): Promise<boolean>` | Existence check via `loadPresets`. |
| `invalidateCache(): void` | External cache reset (for cases where another window mutated `presets.json`). |
| `static create(ipc)` / `createPresetService(ipc)` | Synchronous factory. |

## IPC channels

All channel names come from [`main/ui/types/index.ts` `IPC_CHANNELS`](../../../main/ui/types/index.ts).

| Channel | Direction | Payload sent | Payload received |
| --- | --- | --- | --- |
| `load-presets` | renderer → main (`invoke`) | _none_ | `PresetConfig` (`{ [name: string]: string }` — values are JSON strings of `UIConfig`). [`main.js:378`](../../../main.js) → `presets.loadPresets()` ([`presets.js:7-12`](../../../presets.js)). The handler also rewrites legacy `convert.deepnest.io` URLs while reading. |
| `save-preset` | renderer → main (`invoke`) | `name: string`, `config: string` | `void`. [`main.js:382`](../../../main.js) → `presets.savePreset()` ([`presets.js:14-18`](../../../presets.js)). Writes to `userData/presets.json`. |
| `delete-preset` | renderer → main (`invoke`) | `name: string` | `void`. [`main.js:386`](../../../main.js) → `presets.deletePreset()` ([`presets.js:20-24`](../../../presets.js)). |

## Data shapes

```ts
// main/ui/types/index.ts
export interface PresetConfig {
  [presetName: string]: string; // JSON.stringify(UIConfig)
}
```

A single preset value is the raw `JSON.stringify(configService.getSync())` — see
[`main/ui/services/config.service.ts`](./main__ui__services__config.service.md)
for the `UIConfig` field list. Note: nothing in the renderer guarantees a preset
contains every field — `getPreset()` returns `Partial<UIConfig>`, and the load
flow in `main/ui/index.ts` calls `configService.setSync(presetConfig)` which
merges only the keys present in the preset.

### Legacy URL migration

The hardcoded list `LEGACY_CONVERSION_SERVERS` in
[`preset.service.ts:18-21`](../../../main/ui/services/preset.service.ts) covers:

- `http://convert.deepnest.io`
- `https://convert.deepnest.io`

`getPreset()` rewrites these to `DEFAULT_CONVERSION_SERVER`
(`https://converter.deepnest.app/convert`) before parsing. The same migration
also runs on the **main** side inside the `load-presets` handler ([`main.js:378-380`](../../../main.js))
and in `presets.loadPresets()` ([`presets.js:9`](../../../presets.js)). The
double-migration is intentional defense-in-depth — either layer alone is
enough to keep old presets working.

## Cache semantics

- `cachedPresets` is set on first successful `loadPresets()` and re-used until
  invalidated.
- `savePreset` and `deletePreset` invalidate the cache after the IPC settles.
- `getPreset` re-uses `loadPresets` so any successful save/delete in this
  service is consistent within the renderer.
- The cache **is not** invalidated automatically when another renderer
  (e.g. a spawned background window) mutates `presets.json`. Call
  `invalidateCache()` manually if cross-window writes are added.

## Used by

The only direct consumer is the composition root
[`main/ui/index.ts`](../../../main/ui/index.ts) inside three places:

| Hook | What it does |
| --- | --- |
| `loadPresetList()` (`index.ts:218`) | `presetService.loadPresets()` to populate `#presetSelect`. Called once on boot and after every save / delete. |
| `initializePresetModal()` → "Save preset" handler (`index.ts:291-313`) | `presetService.savePreset(name, configService.getSync())`. On success, refreshes the dropdown and selects the new entry. |
| `initializePresetModal()` → "Load preset" handler (`index.ts:316-357`) | `presetService.getPreset(name)`, then preserves OAuth tokens and pushes the parsed `Partial<UIConfig>` into `configService.setSync(presetConfig)`. Triggers `DeepNest.config()` and `updateForm()`. |
| `initializePresetModal()` → "Delete preset" handler (`index.ts:360-382`) | Confirmed via `confirm(...)`, then `presetService.deletePreset(name)` and refresh the dropdown. |

No component (`parts-view`, `nest-view`, `sheet-dialog`, `navigation`) consumes
the preset service directly.

## DOM contract

| Selector (`main/index.html`) | Wired in `index.ts` |
| --- | --- |
| `#presetSelect` | Dropdown populated by `loadPresetList()`. |
| `#savePresetBtn` | Opens `#preset-modal`. |
| `#confirmSavePreset` | Calls `savePreset`. |
| `#presetName` | Textbox for new preset name. |
| `#loadPresetBtn` | Calls `getPreset` + `setSync`. |
| `#deletePresetBtn` | Calls `deletePreset` after `confirm()`. |
| `#preset-modal` | Modal container (close via `.close` or outside click). |

## Security and architecture smells

- All preset I/O is mediated through IPC, which is correct. The legacy URL
  rewrite is duplicated on both renderer and main sides; if one is dropped, keep
  the **main-side** rewrite (`presets.js:9`) — it covers other renderers and
  any future external-write scenario.
- `savePreset` accepts `UIConfig | string`. Renderer call sites currently pass
  the live `configService.getSync()` (a `UIConfig` instance) and rely on the
  service to stringify. Avoid passing pre-stringified payloads with embedded
  legacy URLs — the migration only runs on **read**.
- Errors are surfaced via thrown `Error` (not silently swallowed like
  `ConfigService.persist()`); call sites must `try/catch` (`index.ts:309`,
  `:353`, `:377` already do).
- `name.trim()` is the only validation. Names containing `/`, NUL bytes, or
  prototype-pollution keys (`__proto__`, `constructor`) round-trip into the JSON
  object on the main side. Not currently a known exploit (renderer is trusted
  with full `nodeIntegration`), but worth tightening if the IPC boundary is
  hardened.

## Test surface

- Unit-testable without Electron: pass `{ invoke: jest.fn() }`.
- Should cover: cache hit/miss flow, legacy URL migration on `getPreset`,
  trimming + empty-name rejection, error wrapping, cache invalidation after
  mutations.

## References

- [`main/ui/services/preset.service.ts`](../../../main/ui/services/preset.service.ts)
- [`main/ui/types/index.ts`](../../../main/ui/types/index.ts) — `PresetConfig`, `IPC_CHANNELS`
- [`presets.js`](../../../presets.js) — main-side store
- [`main.js`](../../../main.js) — `load-presets` / `save-preset` / `delete-preset` handlers
- [`main/ui/index.ts`](../../../main/ui/index.ts) — modal wiring (`initializePresetModal`)
