# `main/ui/services/config.service.ts` — Deep Dive

**Generated:** 2026-04-26 by Paige (Tech Writer) for [DEE-36](/DEE/issues/DEE-36) (parent: [DEE-11](/DEE/issues/DEE-11)).
**Group:** D — UI services.
**Surface:** Renderer-side configuration store. Round-trips JSON through `read-config` / `write-config` IPC and is the source-of-truth bound to `data-config` form elements.

## 1. Purpose

`ConfigService` is the renderer's configuration aggregate. It:

1. Holds the live `UIConfig` for the current process.
2. Bootstraps from the persisted `settings.json` via IPC `read-config` (`config.service.ts:140-161`).
3. Exposes a synchronous `getSync` / `setSync` interface that mimics the legacy [`electron-settings`](https://electron-settings.js.org/) API DeepNest used before the TypeScript port (`config.service.ts:226-264`).
4. Persists every change with a fire-and-forget `write-config` invoke (`config.service.ts:297-307`).
5. Doubles as a `ConfigObject` (the type implemented), so it can be assigned to `window.config` and consumed by callers that still treat config as a flat record (`config.service.ts:66`, wired in [`main/ui/index.ts:594`](../../../main/ui/index.ts)).

Two non-obvious responsibilities also live here:

- **Unit-aware scale conversion** — `getConversionFactor()`, `toSvgUnits()`, `fromSvgUnits()`, `getScaleInUnits()`, `setScaleFromUnits()` (`config.service.ts:319-369`). These exist because `scale` is *always stored in inches* (units/inch), but the UI lets the user think in mm; the conversions live next to the truth so callers never need to remember the inch invariant.
- **Token preservation on reset** — `resetToDefaultsSync()` snapshots `access_token` and `id_token` before wiping config so a "reset to defaults" doesn't log the user out of paid features (`config.service.ts:270-291`).

## 2. Public surface

| Member | Lines | Purpose |
| --- | --- | --- |
| `DEFAULT_CONFIG` (export const) | 24-47 | The frozen default `UIConfig`. Distance values are in inches (`curveTolerance: 0.72`, `endpointTolerance: 0.36`, `exportWithSheetsSpaceValue: 0.3937007874015748` ≡ 10 mm). |
| `BOOLEAN_CONFIG_KEYS` (export const) | 52-59 | The keys whose form binding is a checkbox. Used by `main/ui/index.ts:208,416` to decide whether to read `checked` vs `value`. |
| `class ConfigService` | 66-382 | Implements `ConfigObject` from `main/ui/types/index.ts:79`. |
| `constructor(ipcRenderer?)` | 106-133 | Seeds every instance property from `DEFAULT_CONFIG`. IPC is optional (testability). |
| `initialize(): Promise<void>` | 140-161 | One-shot bootstrap: `ipcRenderer.invoke(IPC_CHANNELS.READ_CONFIG)` → `mergeConfig`. Idempotent via `this.initialized`. Errors silently fall back to defaults. |
| `getSync<K>(key?)` | 226-231 | Single-key (typed) or whole-config (shallow copy) read. Matches the legacy electron-settings shape. |
| `setSync<K>(keyOrObject, value?)` | 239-264 | Accepts either a `(key, value)` pair or a `Partial<UIConfig>` object. Always re-syncs instance properties, then `persist()`. |
| `resetToDefaultsSync()` | 270-291 | Restores `DEFAULT_CONFIG`. Preserves `access_token` and `id_token` across the reset. Persists. |
| `getConversionFactor()` | 322-328 | `units === 'mm' ? scale / 25.4 : scale`. |
| `toSvgUnits(value)` / `fromSvgUnits(value)` | 335-346 | Multiply/divide by `getConversionFactor()`. |
| `getScaleInUnits()` / `setScaleFromUnits(scaleInUnits)` | 352-369 | Convert between display-units scale and stored (inch) scale. |
| `static isBooleanKey(key)` | 314-316 | Membership test for `BOOLEAN_CONFIG_KEYS`. |
| `static create(ipcRenderer)` / `createConfigService(ipcRenderer)` | 377-393 | Async factory that constructs and `initialize()`s before returning. Used by [`main/ui/index.ts:593`](../../../main/ui/index.ts). |
| `isValidPlacementType(value)` | 400-402 | Type guard — `"gravity" \| "box" \| "convexhull"`. |
| `isValidUnitType(value)` | 409-411 | Type guard — `"mm" \| "inch"`. |

The class also exposes every `UIConfig` field as an *instance property* (`config.service.ts:77-100`). They are kept in sync with the internal `this.config` record by `syncFromConfig()` (`config.service.ts:193-218`). That dual storage is what lets `window.config` behave like both a method bag (`config.getSync('scale')`) and a flat object (`config.scale`) — see Invariants §5 below.

## 3. IPC contract

Two channels, both `invoke`/`handle` (request/reply):

| Channel | Direction | Sender (renderer) | Handler (main) | Payload in | Payload out |
| --- | --- | --- | --- | --- | --- |
| `read-config` | renderer → main | `config.service.ts:147` | [`main.js:353-357`](../../../main.js) | (none) | parsed `Partial<UIConfig>` from `settings.json` (or `{}` if missing). The handler **transparently rewrites** legacy `convert.deepnest.io` URLs to the current `converter.deepnest.app/convert` host before parsing — same migration logic as `presets.js:9`. |
| `write-config` | renderer → main | `config.service.ts:301` | [`main.js:358-360`](../../../main.js) | `string` (JSON-stringified config, 2-space pretty-printed) | `void` |

The constants are declared in `main/ui/types/index.ts:268-269` (`IPC_CHANNELS.READ_CONFIG` / `IPC_CHANNELS.WRITE_CONFIG`).

The persisted file lives at `app.getPath("userData") + "/settings.json"` (resolved in [`main.js:352`](../../../main.js)).

## 4. Dependencies

**Imports** (`config.service.ts:1-13`):

- `UIConfig`, `ConfigObject`, `PlacementType`, `UnitType` — type-only from `../types/index.js`.
- `DEFAULT_CONVERSION_SERVER` — value (`https://converter.deepnest.app/convert`) from `../types/index.js:45`.
- `IPC_CHANNELS` — value record from `../types/index.js:267-278`.

**Runtime dependencies** (injected, see `IpcRenderer` interface at `config.service.ts:16-18`):

- An object exposing `invoke(channel, ...args): Promise<unknown>`. In production this is Electron's `ipcRenderer` from `require("electron")`. The minimal interface is duplicated locally to keep this file Electron-type-free for tests.

**Reverse dependencies** (who consumes `ConfigService`):

| Consumer | How it uses the service |
| --- | --- |
| [`main/ui/index.ts:593-602`](../../../main/ui/index.ts) | Creates the singleton via `createConfigService(ipcRenderer)`, assigns to `window.config`, snapshots into `DeepNest.config(values)` and `updateForm(values)`. |
| [`main/ui/index.ts:435,494`](../../../main/ui/index.ts) | The form-change handler and the "reset to defaults" button call `setSync` / `resetToDefaultsSync`. |
| [`main/ui/index.ts:300-345`](../../../main/ui/index.ts) | The preset modal uses it both as the source of `getSync()` (when saving) and as the sink for `setSync(presetConfig)` (when loading). |
| [`main/ui/services/import.service.ts:127-128, 175, 340, 530, 580, 688`](../../../main/ui/services/import.service.ts) | Pulled in as a `ConfigGetter` (only `getSync` needed): reads `conversionServer`, `dxfImportScale`, `useSvgPreProcessor`, `scale`. |
| [`main/ui/services/export.service.ts:88-89, 166, 289, 500-502, 609-619, 643-647`](../../../main/ui/services/export.service.ts) | Same `ConfigGetter` shape. Reads `conversionServer`, `exportWithSheetBoundboarders`, `exportWithSheetsSpace`, `exportWithSheetsSpaceValue`, `scale`, `dxfExportScale`, `units`, `mergeLines`, `curveTolerance`. |
| [`main/ui/components/parts-view.ts`](../../../main/ui/components/parts-view.ts), [`nest-view.ts`](../../../main/ui/components/nest-view.ts), [`sheet-dialog.ts`](../../../main/ui/components/sheet-dialog.ts) | Wired via `main/ui/index.ts` to share the same `ConfigObject` for unit/scale conversion display. |
| [`main/index.html`](../../../main/index.html) form elements with `data-config="<key>"` | Read via `updateForm()` (`main/ui/index.ts:152-213`); written back on `change` via `initializeConfigForm()` (`main/ui/index.ts:388-449`). The 22 input/select/checkbox elements bound this way are the *primary* consumer of `getSync()`. See §6. |

## 5. Invariants & gotchas

1. **Distances are stored in inches**, regardless of `units`. This is implicit in the docstring at `config.service.ts:23` (`Scale and distances are stored in native units (inches)`) and load-bearing for `getConversionFactor()` and the form's `data-conversion="true"` round-trip in `main/ui/index.ts:201-213, 421-426`. Anyone adding a new distance field must (a) put the inch value in `DEFAULT_CONFIG`, and (b) add `data-conversion="true"` to the form input in `main/index.html`. Forgetting the second step makes the field stick at the inch value when the user is viewing in mm. Existing examples: `spacing`, `curveTolerance`, `endpointTolerance`, `exportWithSheetsSpaceValue`.
2. **`scale` is *also* stored in inches** but with different semantics from distances — it's *units per inch* (default `72` ≈ SVG user-units per inch), and the UI form converts it through `setScaleFromUnits` (`config.service.ts:362-369`). The mm form value is `scale / 25.4`. The form-change handler at `main/ui/index.ts:409-413` does the inverse — multiplies by 25.4 when the user is in mm.
3. **Persistence is fire-and-forget.** `persist()` at line 297 calls `.invoke(...).catch(...)` and never propagates the rejection. If `write-config` fails (e.g. disk full), the in-memory state is already updated; the next read after a restart will lose the change. The class deliberately avoids exposing async errors to UI callers because the form re-renders synchronously after `setSync` (`main/ui/index.ts:435-443`).
4. **`initialize()` failure is silent.** The catch at `config.service.ts:154-157` swallows IPC errors; the service then operates on `DEFAULT_CONFIG`. There is **no** retry, no UI warning, no logging. A user with a corrupt `settings.json` will see "default" config every launch with no signal that the file exists. See TODOs §7.
5. **Two storage backings (`this.config` and instance properties) must stay in sync.** `setConfigValue` (line 184) writes both. `setSync` writes `this.config` and then calls `syncFromConfig()` (line 193). `resetToDefaultsSync` mutates `this.config` then `syncFromConfig()`. Skipping the sync drifts the instance properties from the record — and `getSync()` reads from the record (`config.service.ts:227-230`) while `window.config.scale` reads from the instance. **Never mutate `this.config[k]` directly without calling `syncFromConfig()`.**
6. **`UIConfig` is non-extensible at the type layer**. `setSync` accepts `K | Partial<UIConfig>`, so unknown keys are rejected by the compiler. But at runtime, `Object.assign(this.config, { [key]: value })` (line 256) and `mergeConfig` (line 167-177) accept anything — a corrupt `settings.json` with extra keys will land them in the in-memory record and on the instance. They will then be re-persisted on the next `setSync`. This is benign but worth knowing if you grep for unexpected fields in `settings.json`.
7. **The `read-config` handler URL-rewrites legacy hosts** (`main.js:355`). `convert.deepnest.io` (HTTP and HTTPS) is replaced with the current `converter.deepnest.app/convert` URL during deserialization. So a `ConfigService` instance never sees the legacy URLs — but the same logic is duplicated in [`presets.js:9`](../../../presets.js) and in `preset.service.ts:18-21,55-56` (see [`docs/deep-dive/d/main__ui__services__preset.service.md`](./main__ui__services__preset.service.md) §6). Three rewrite sites is a smell — see TODOs §7.
8. **`access_token` and `id_token` are *not* in `DEFAULT_CONFIG`** (lines 24-47 do not list them). They are declared as optional instance properties (`config.service.ts:99-100`) and only landed via `mergeConfig` from a previously-persisted config. `resetToDefaultsSync` explicitly snapshots them before the reset (lines 273-274) and restores them after. If you add a new "preserve across reset" field, you must extend that snapshot/restore block — it is hard-coded.
9. **No schema validation.** `mergeConfig` will accept any value from disk (including `null`, strings where numbers are expected). The fallback for the form is an unfortunate type coercion — for example `Number(this.config.dxfImportScale) || 1` is the pattern used downstream in `import.service.ts:530`. The service itself does no validation. A bad `settings.json` will *not* throw on read; it will misbehave on use.

## 6. The `data-config` round-trip

Form ↔ service is the highest-traffic path. Three pieces co-operate:

- **`main/index.html`** declares the input element with `data-config="<UIConfig key>"` and optionally `data-conversion="true"` if the value is a stored-in-inch distance that needs unit-aware display. Twenty-two such elements exist (see [`docs/deep-dive/g/main__index.html.md`](../g/main__index.html.md) for the full attribute table).
- **`main/ui/index.ts:152-213` (`updateForm`)** iterates them and pulls the current value from `configService.getSync(...)`. Boolean-keyed inputs use `.checked`; conversion-flagged inputs are divided by the current scale; everything else uses `.value`.
- **`main/ui/index.ts:388-449` (`initializeConfigForm`)** wires `change` listeners that do the reverse: convert mm-displayed values back to inches, then `configService.setSync(key, val)`. The handler also calls `getDeepNest().config(cfgValues)` to push the new state into `main/deepnest.js`.

This path is the reason `BOOLEAN_CONFIG_KEYS` and `data-conversion="true"` exist — without them the form-handler would have to introspect the input type and compare to a hard-coded list. The list is "lifted" into the service so other consumers (notably the preset apply at `main/ui/index.ts:333-342`) can use the same conventions.

## 7. Known TODOs / smells

No `// TODO` or `// FIXME` comments are present in `config.service.ts`. The smells worth surfacing for follow-up:

1. **Silent IPC failure modes.** `initialize()` swallows IO errors (line 154-157), and `persist()` swallows them too (302-305). A debug-mode logger would catch the corrupt-`settings.json` case without surfacing it to users.
2. **Triple-redundant URL migration logic.** `main.js:355` (config), `presets.js:9` (presets read), and `preset.service.ts:53-58` (preset migrate) all replace the same legacy hosts. A single migration helper somewhere shared would deduplicate the list. The `LEGACY_CONVERSION_SERVERS` constant in `preset.service.ts:18-21` is the only one that names the list — the other two inline it.
3. **No schema validation.** A future story adding [Zod](https://zod.dev/)-style validation could harden `mergeConfig` against bad disk state.
4. **Dual storage (record + instance properties).** This is intentional for legacy-API compatibility, but the next time `window.config` consumers can be migrated to method calls, the instance fields can go away — collapsing `setConfigValue` and `syncFromConfig` into one path.

## 8. Extension points

- **Add a config field** — extend `UIConfig` in `main/ui/types/index.ts:25-40`, add the default in `DEFAULT_CONFIG` (`config.service.ts:24-47`), and if it's a distance also add `data-conversion="true"` to the form. Boolean fields must be added to `BOOLEAN_CONFIG_KEYS` (`config.service.ts:52-59`).
- **Persist a non-config-tree value** (e.g. last-used file path) — this service is the wrong place. It mirrors a single object. Add a separate IPC channel.
- **Validate on read** — `mergeConfig` (line 167-177) is the right insertion point; replace the unconditional `setConfigValue` with a key-aware validator.
- **Reset semantics for new "user profile" fields** — extend the snapshot block in `resetToDefaultsSync` (`config.service.ts:273-285`).

## 9. Test coverage status

- **No unit tests** for this service. `tests/index.spec.ts` is the single Playwright E2E spec and exercises the form indirectly (it clicks tabs that read config, but does not validate any specific config-service path).
- **Form integration is implicitly tested** by `tests/index.spec.ts` — see [`docs/deep-dive/j/tests__index.spec.ts.md`](../j/tests__index.spec.ts.md) "Config Tab" sub-test (the test fix in commit `ece5ed7` re-asserted the form-element bindings exposed by this service).
- **Persistence path is not covered** in CI. A real `settings.json` round-trip would need an Electron harness; the current service is shaped (with the `IpcRenderer` interface at line 16) to allow a tested mock, but no test fixture exists yet.

A unit test fixture for this file is the obvious gap. The constructor's `ipcRenderer?` optional argument was put there for that purpose (`config.service.ts:106`).

## 10. Cross-references

- [`docs/deep-dive/d/main__ui__services__preset.service.md`](./main__ui__services__preset.service.md) — peer service that consumes `UIConfig` instances (presets are stringified configs).
- [`docs/deep-dive/d/main__ui__services__import.service.md`](./main__ui__services__import.service.md) §3 — uses `getSync` for `conversionServer`, `dxfImportScale`, `useSvgPreProcessor`, `scale`.
- [`docs/deep-dive/d/main__ui__services__export.service.md`](./main__ui__services__export.service.md) §3 — uses `getSync` for export-related and unit fields.
- [`docs/deep-dive/c/main__ui__index.ts.md`](../c/main__ui__index.ts.md) — the composition root that wires `ConfigService` into `window.config` and `DeepNest.config()`.
- [`docs/deep-dive/c/main__ui__types__index.ts.md`](../c/main__ui__types__index.ts.md) — `UIConfig`, `ConfigObject`, `IPC_CHANNELS`, `DEFAULT_CONVERSION_SERVER`.
- [`docs/deep-dive/g/main__index.html.md`](../g/main__index.html.md) — full `data-config` attribute table.
- [`docs/deep-dive/a/main.js.md`](../a/main.js.md) — the `read-config`/`write-config` handlers and the `settings.json` path resolution.
- [`docs/deep-dive/a/presets.js.md`](../a/presets.js.md) — sibling persistence module that shares the URL-migration logic.
- [`docs/deep-dive/b/main__deepnest.js.md`](../b/main__deepnest.js.md) — `DeepNest.config()` consumer of the snapshot.
