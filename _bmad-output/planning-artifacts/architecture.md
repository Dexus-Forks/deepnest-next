---
project_name: deepnest-next
user_name: Paperclip
date: 2026-04-26
workflowType: 'architecture'
documentShape: 'brownfield-revision-overlay'
anchorDocument: 'docs/architecture.md'
anchorADRs: ['ADR-001', 'ADR-002', 'ADR-003', 'ADR-004', 'ADR-005', 'ADR-006', 'ADR-007']
newADRs: ['ADR-008', 'ADR-009']
inputDocuments:
  - _bmad-output/project-context.md
  - _bmad-output/planning-artifacts/prd.md
  - _bmad-output/planning-artifacts/prd-validation-report.md
  - docs/architecture.md
sections_completed:
  - executive_summary
  - anchor_and_preservation_rules
  - context_analysis
  - per_fr_architecture
  - per_nfr_architecture
  - new_adrs
  - open_questions_resolved
  - nfr01_baseline_gate
  - implementation_readiness_preconditions
  - references
status: complete
addresses_open_questions:
  - main_js_sequencing
  - wincount_rollback_path
  - fr02_expanded_scope
absorbs_vp_findings:
  - major_fr02_scope_expansion
  - medium_nfr01_baseline_deferred
generated_by: 'Winston (BMAD Architect) — bmad-create-architecture, headless mode'
---

# deepnest-next — Architecture (MVP Revision Overlay)

> **Brownfield revision overlay.** This document is **not** a rewrite of `docs/architecture.md`. It is the architectural delta required to land the PRD's MVP slice (FR-01..06 + the expanded FR-02 scope per the VP report) on top of the existing system. `docs/architecture.md` (with ADR-001..007) remains the canonical current state. Read that file first; this overlay is consumed alongside it.
>
> Author: Winston. Date: 2026-04-26. Inputs: `_bmad-output/project-context.md` (DEE-46 GPC), `_bmad-output/planning-artifacts/prd.md` (DEE-47 CP), `_bmad-output/planning-artifacts/prd-validation-report.md` (DEE-48 VP), `docs/architecture.md` (DEE-45 DP).

---

## 1. Executive Summary — what this overlay does and does not do

### Does

- Anchors every MVP requirement (FR-01..06, NFR-01..08) onto a concrete **component touchpoint** in the existing system.
- Adds **two new ADRs** that decide architecture-shaped questions raised by the PRD and absorbed from the VP report:
  - **ADR-008** — strategy for closing the expanded `LICENSES.md` audit gap (FR-02): manifest-generated, CI-gated.
  - **ADR-009** — background-worker shutdown sequence (FR-04): an `app.shuttingDown` sentinel + bounded try/catch boundary, anchored on `app.before-quit`.
- Resolves the three open questions raised by CP and VP for CA: `main.js` sequencing, `winCount` rollback path, and the FR-02 expanded scope.
- Names the **NFR-01 baseline** as a pre-MVP-sprint **Implementation-Readiness gate**, with owner, persistence path and acceptance procedure.

### Does not

- Rewrite or supersede `docs/architecture.md`. ADR-001..007 are preserved verbatim.
- Introduce new globals on `window` (ADR-005), new IPC channels (`IPC_CHANNELS`), new UI frameworks (ADR-006), new vendored utilities, or new outbound HTTPS endpoints.
- Reverse the permissive renderer posture (ADR-004). NFR-06 forbids partial drift.
- Lift `winCount = 1` (FR-04 explicitly preserves the cap; lifting is FR-07 / Phase 2).
- Touch the GA / NFP / placement engine (`main/deepnest.js`, `main/background.js`, `@deepnest/calculate-nfp`).

### Top-line shape

The MVP slice is **a maintenance + compliance + integrity slice**. Five of six MVP FRs touch **paperwork, types, build-time scripts, and test infrastructure** — surfaces that do not change the runtime architecture diagram. The only FR that touches the runtime is **FR-04** (bg-worker shutdown), which is constrained to the two `// todo:` sites in `main.js` and the `app.before-quit` lifecycle. After this overlay ships, the process / window topology in `docs/architecture.md` §2 is unchanged.

---

## 2. Anchor & Preservation Rules

The following from `docs/architecture.md` is **load-bearing and preserved verbatim** in MVP. These are the architectural invariants that this overlay must not violate.

| Anchor | Preserved as | Enforcement |
|---|---|---|
| `docs/architecture.md` §2 — process / window topology (1 main + 1 bg + 1 notification window) | NFR-06; FR-04 AC-04.4 (`winCount = 1` invariant) | Grep at MVP sign-off (3 BrowserWindow constructors with documented `webPreferences`) |
| `docs/architecture.md` §3 — module boundaries (legacy CommonJS at root + modular TS under `main/ui/`) | `project-context.md` §4 touch policy | PR-template anti-pattern checklist (FR-06 / NFR-03) |
| `docs/architecture.md` §5 — IPC contract (`IPC_CHANNELS` is canonical) | FR-06 AC-06.2 (no new IPC channel outside `IPC_CHANNELS`) | PR-template checklist; grep on `ipcMain.on` / `ipcRenderer.invoke` |
| ADR-001 — multi-process compute via hidden BrowserWindows | Preserved | FR-04 must not change topology |
| ADR-002 — GA in main renderer, placement in bg | Preserved | Out of MVP scope |
| ADR-003 — native NFP / Minkowski as out-of-tree npm packages | Preserved | NFR-04 (native build matrix) gates per release |
| ADR-004 — `nodeIntegration: true` + `contextIsolation: false` | Preserved (NFR-06) | Grep on every `BrowserWindow` constructor; **no partial hardening** |
| ADR-005 — globals on `window` (DeepNest, SvgParser, config, nest) | Preserved (no new globals) | FR-06 AC-06.1; `index.d.ts` is the only legitimate growth surface (FR-05) |
| ADR-006 — Ractive only on `parts-view` and `nest-view` | Preserved | No new Ractive instances added in MVP |
| ADR-007 — strict TS only on `main/**/*.ts` | Preserved (FR-05 extends `index.d.ts`, not `tsconfig.json`'s `include`) | `tsc --noEmit` zero new errors / zero new `// @ts-ignore` |

**Anti-pattern list binding.** `_bmad-output/project-context.md` §16 (16 anti-patterns) is binding for every PR in MVP. FR-06 codifies the gate; NFR-03 measures it. This overlay re-states the binding here for traceability, not as a new rule.

---

## 3. Project Context Analysis — Requirements → Architectural Surfaces

### 3.1 Functional Requirement Map

| FR | Capability | Architectural surface (existing component) | Architectural delta |
|---|---|---|---|
| **FR-01** | Remove unused renderer-side assets | `main/img/`, `main/font/`, `docs/asset-inventory.md` | **Removal-only.** No new component, no contract change. Verified by `npm test` regression (NFR-01) and asset-inventory doc update. |
| **FR-02** | Record full third-party-asset / vendored-library provenance in `LICENSES.md` (expanded scope per VP) | `LICENSES.md`, `main/util/`, `main/font/`, `tests/assets/`, **new** `helper_scripts/` (or `scripts/`) entry | **New build-time tooling** — see ADR-008. Manifest-generated, CI-gated. Excluded from packaged app via `build.files` rule. |
| **FR-03** | Enforce test-fixture integrity in CI | `tests/assets/`, `tests/index.spec.ts`, `package.json` `test` script, `docs/development-guide.md` | **New build-time check** wired into `npm test`. No new CI job (per AC-03.2). Failure mode names expected vs observed for both literals and points at re-derivation procedure. |
| **FR-04** | Background-worker shutdown safety | `main.js` (the two `// todo:` sites around `background-response` / `background-progress`, and `app.before-quit`) | **Runtime delta** — see ADR-009. Sentinel flag + bounded try/catch boundary; preserves `winCount = 1`. |
| **FR-05** | Close `SvgParserInstance` type gap | `index.d.ts` (and `main/ui/types/index.ts` if shared) | **Type-only delta.** Add `transformParse` and `polygonifyPath` signatures matching the existing call sites in `main/deepnest.js`. No runtime change. |
| **FR-06** | Anti-pattern preservation across MVP epics | PR template / review checklist; cross-cutting | **Process delta.** No code surface; documented as a reviewer's checklist anchored on `_bmad-output/project-context.md` §16. |

### 3.2 Non-Functional Requirement Map

| NFR | Goal | Architectural surface | Notes |
|---|---|---|---|
| **NFR-01** | Performance / regression freedom (±20% wall-clock) | Playwright JSON reporter on canonical CI cell (Linux × Node 22) | **Pre-MVP gate** — see §8. |
| **NFR-02** | Bg-worker shutdown reliability (15/15 trials × 3 exit paths) | FR-04 + ADR-009 | Manual repro per FR-04 AC-04.2 / AC-04.3. |
| **NFR-03** | Anti-pattern preservation | FR-06 + PR template | Human-in-the-loop. No new lint rule (per `project-context.md` §11). |
| **NFR-04** | Native build portability (4-cell CI matrix green per release) | `.github/workflows/build.yml`, `package.json` `postinstall` | Already in place; this overlay does not change the matrix. |
| **NFR-05** | Test-fixture integrity gate | FR-03 (capability ↔ NFR pair) | Same surface; NFR-05 is the audit, FR-03 is the implementation. |
| **NFR-06** | Permissive renderer posture preservation | Every `BrowserWindow` constructor in `main.js` | **Hard veto** on partial hardening. |
| **NFR-07** | Settings round-trip | `read-config` IPC handler + `userData/settings.json` | No change in MVP. The legacy `convert.deepnest.io` → `converter.deepnest.app` rewrite is preserved. |
| **NFR-08** | Documentation freshness | `_bmad-output/project-context.md` §2 / §6 / §16 | Documented per-PR rule, audited per release. |

### 3.3 Cross-cutting concerns identified

| Concern | Where it shows up | Mitigation |
|---|---|---|
| **`main.js` is the only runtime delta surface** in MVP | FR-04 only | See §6 (Open Q1) — sequencing rule. |
| **Build-time vs runtime split** | FR-02 (manifest script), FR-03 (fixture check) both add **build-time** code | Confine to `helper_scripts/` (or `scripts/`); ensure `build.files` exclusion (`!{examples,helper_scripts}`) covers them. |
| **Test latency** | FR-02 (CI gate) + FR-03 (CI gate) both add to `npm test` cost | Both checks must be **fast** (sub-second deterministic file walks); Playwright dominance is preserved. |
| **Drift resistance** | LICENSES.md drift (VP finding); `tests/assets/` drift (FR-03 motivation) | Both addressed via the same pattern — generated artefact + CI verification. ADR-008 explicitly cross-references the FR-03 enforcement style. |
| **Independent revertibility** | FR-04 vs FR-07 (Phase 2 worker-count lift) | See §6 (Open Q2). |

### 3.4 Scale & complexity assessment

- **Project complexity:** High *engineering* complexity (geometry, native modules, GA, multi-renderer IPC) but **low MVP-slice complexity** — the slice is paperwork + integrity + a single runtime fix.
- **Architectural deltas in MVP:** 2 ADRs (ADR-008, ADR-009). 1 runtime change (`main.js` shutdown). 2 new build-time scripts (`scripts/build-licenses.*`, `scripts/check-test-fixtures.*` or equivalent). 1 type-only change (`index.d.ts`).
- **Implementation surface:** confined. No new IPC channel, no new global, no new UI framework, no new outbound endpoint.

---

## 4. Per-FR Architecture (one-line summary + the binding constraints)

> One paragraph per FR. Each names the touched components, the **hard architectural constraints**, and the **independent-revertibility** posture. CE will split each into stories per `prd.md` §References & Handoff item 5.

### FR-01 — Remove unused renderer-side assets

**Touched components:** `main/img/auth0logo.svg`, `main/img/background.png`, `main/img/logo.svg`, `main/img/progress.svg`, `main/img/stop.svg`; `main/font/` dead-weight subset (`LatoLatin-BoldItalic.*`, demo HTML, `.eot`/`.ttf` for live weights); `docs/asset-inventory.md`.

**Architectural constraints:**
- (a) Removals must precede or be coordinated with FR-02 (LICENSES) so removed assets are also dropped from the manifest input — see ADR-008 for the dependency note.
- (b) Asset-binding rule (`project-context.md` §9.1): icons are bound exclusively from `main/style.css`. Verify by grep that no JS/TS imports an icon URL before deletion.
- (c) `tests/index.spec.ts` literals (`#importsnav li = 2`, `54/54` placements) are **independent of `main/img` and `main/font` removals**. FR-01 must not require re-deriving them; if it does, scope expansion has occurred and FR-03's gate must catch it.
- (d) Notification-window typography island (`project-context.md` §9.6) — verify Lato webfont removal does not break the notification window's `<link>` to `latolatinfonts.css`.

**Independent revertibility:** Each asset removal is a single `git rm` + a `docs/asset-inventory.md` edit. Trivially revertible per asset.

### FR-02 — `LICENSES.md` paperwork (expanded per VP)

**Touched components:** `LICENSES.md` (canonical output); per-folder metadata files (e.g. `LICENSE.yml`) under `main/util/`, `main/font/`, `tests/assets/`; new `scripts/build-licenses.{ts,mjs}` (Node, build-time only); `package.json` (script wiring + `test` integration); `helper_scripts/` exclusion preserved via `build.files`.

**Architectural constraints (binding via ADR-008):**
- (a) `LICENSES.md` is **generated**, not hand-edited, after first commit. CI verifies generated == committed.
- (b) Per-folder metadata files (e.g. `main/util/LICENSE.yml`) are the **single source of truth** for third-party attribution within that folder.
- (c) Generator script lives in `scripts/` (or `helper_scripts/` to reuse the existing exclusion rule). Confirm via the exclusion grep at sign-off that the script is not packaged into the installer.
- (d) Drift detection runs as part of `npm test` (per AC-02 inheritance from PRD pattern + FR-03 precedent), failing CI if `LICENSES.md` is stale.
- (e) Data-hygiene fixes from VP (path typos, `?` placeholders, stale `/main/svgnest.js` entry) are landed **as part of the bootstrap commit** that introduces the metadata files, so the first generator run produces a canonical artefact with no carry-over.

**Independent revertibility:** The generator script is independently revertible from the metadata files. If the generator is reverted, the committed `LICENSES.md` from the last generator run remains valid — no compliance gap. If a single metadata file is reverted, the generator's CI gate catches the drift.

### FR-03 — Test-fixture integrity in CI

**Touched components:** `tests/assets/` (read-only inputs); `tests/index.spec.ts` (the literals `54/54` and `2`); new `scripts/check-test-fixtures.{ts,mjs}` (Node, build-time only) **OR** an inline pre-test step in `package.json`; `docs/development-guide.md` (re-derivation procedure).

**Architectural constraints:**
- (a) Check runs **inside** the existing `npm test` invocation (no new GitHub Actions job per AC-03.2).
- (b) Failure mode names **both** the expected and observed values for **both** literals (`#importsnav li = X (expected 2)`, `placements = N/M (expected 54/54)`).
- (c) Implementation choice between (i) checksum manifest, (ii) directory snapshot, (iii) name-list + size-list — left to story-level implementation. Architecture only mandates **deterministic, fast, single-process** (no Playwright spawn for the integrity check).
- (d) `tests/assets/README.md` (FR-02 AC-02.3) is in the same set of files but referenced from a different concern (provenance vs. integrity). Coordinate with FR-02 to land both edits without trampling.

**Independent revertibility:** The check script is one file. The manifest / snapshot file is one file. Both can be reverted independently of each other and of the spec literals.

### FR-04 — Background-worker shutdown safety

**Touched components:** `main.js` only — the two `// todo:` sites around `background-response` (line marker per `docs/architecture.md` §5.1) and `background-progress`; the `app.before-quit` handler.

**Architectural constraints (binding via ADR-009):**
- (a) `winCount = 1` invariant **preserved** (AC-04.4). No change to `createBackgroundWindows()`.
- (b) IPC contract preserved — `background-response` / `background-progress` / `background-stop` channel names and payloads are unchanged.
- (c) Sentinel flag (`app.shuttingDown` or equivalent on the main-process module scope) is read **before** any IPC reply forwarding or window-renderer-callback invocation. No new IPC channel.
- (d) `EventEmitter.defaultMaxListeners = 30` cap (`project-context.md` §8.5) must remain respected — counted across all 15 NFR-02 trials.
- (e) `os.tmpdir()/nfpcache` and `os.tmpdir()/nest` cleanup paths (`project-context.md` §8.4) are **not modified** by FR-04 — the existing `app.before-quit` purge stands. FR-04 only ensures the worker tear-down does not leave behind unhandled exceptions that would prevent the purge from running.

**Independent revertibility:** Sentinel + try/catch is a localised diff in `main.js`. Reverting it restores the swallow-silently behaviour without touching anything else (no IPC contract change, no module-boundary change). Phase 2's FR-07 (`winCount > 1`) is a **separate one-line edit** in a separate function — see §6 Open Q2.

### FR-05 — Close `SvgParserInstance` type gap

**Touched components:** `index.d.ts` (canonical); `main/ui/types/index.ts` (if `SvgParserInstance` is also referenced there — verify before edit).

**Architectural constraints:**
- (a) Types must match the **actual call-site signatures** in `main/deepnest.js` (per AC-05.3 — the gap is closed by extending the type, not by deleting the call). Read each call site before authoring the signature.
- (b) `tsc --noEmit` zero new errors, zero new `// @ts-ignore` (AC-05.2; anti-pattern §16.8).
- (c) `lib`/`target` mismatch invariant (`project-context.md` §10) holds — no need to extend `lib` to declare these signatures; they are project-internal.
- (d) Preserve the single-topology `tsconfig.json` (`project-context.md` §10) — no new `tsconfig.app.json` / `tsconfig.test.json`.

**Independent revertibility:** Type-only edit. Reverting it restores the type gap; no runtime impact.

### FR-06 — Anti-pattern preservation across MVP epics

**Touched components:** PR template (or `.github/pull_request_template.md` if not yet present); `_bmad-output/project-context.md` §16 (referenced, not edited).

**Architectural constraints:**
- (a) PR-template item per anti-pattern OR a single "I have read `_bmad-output/project-context.md` §16 and verified none of the 16 items is violated" checkbox with reviewer-citable section numbers.
- (b) No new lint rule, no new test (per `project-context.md` §11 — type-aware lint deferred).
- (c) Reviewer can cite the exact §16 item number for any concern raised, so contributors can resolve via a single-line lookup.

**Independent revertibility:** Template-only. Trivially reverted; the underlying anti-pattern list lives in the GPC.

---

## 5. New ADRs

> ADR-001..007 live in `docs/architecture.md` §10 and are preserved. The two ADRs below are added by this overlay.

### ADR-008 — `LICENSES.md` is generated from per-folder metadata, CI-verified

**Status:** Accepted (this overlay).

**Date:** 2026-04-26.

**Context.**

The VP report (`prd-validation-report.md` §Open Q2) found FR-02's original scope (`tests/assets/*.svg` SIL OFL gap) was a strict subset of the actual licence-paperwork surface. A tree-wide audit identified:

- **SIL OFL gaps in `main/font/`** — the entire live Lato webfont kit (`LatoLatin-{Bold,Regular,Light}.{woff,woff2}`, `lato-hai-webfont.*`, `lato-lig-webfont.*`) plus the two `@font-face` stylesheets, none attributed.
- **Eight vendored MIT/BSD libraries** under `main/util/` with no `LICENSES.md` entry (`ractive.js`, `pathsegpolyfill.js`, `parallel.js`, `simplify.js`, `svgpanzoom.js`, `HullPolygon.ts`, `_unused/hull.js`, `_unused/json.js`).
- **Five data-hygiene issues** in the existing 13-line `LICENSES.md`: a path typo (`/main/uitil/filesaver.js`), two wrong paths (`/main/util/clipper`, `/main/util/clippernode.js`), one stale entry (`/main/svgnest.js` — file deleted), three `?` copyright placeholders.

CP raised a third question explicitly for CA: should the expanded FR-02 land as **one hand-edited PR**, or as **a generator script** that emits `LICENSES.md` deterministically from per-folder metadata, with a CI gate verifying the committed file matches the script's output?

**Decision.**

**Generator + per-folder metadata + CI gate.** Concretely:

1. Add per-folder metadata files (e.g. `main/util/LICENSE.yml`, `main/font/LICENSE.yml`, `tests/assets/LICENSE.yml`) describing each third-party item: `path`, `name`, `license` (SPDX-style), `copyright`, `upstream_url`, optional `notes`.

   **Schema reference (canonical, amended by Story 2.2 / DEE-92 — resolves Sage Story 2.1 Round-1 P3-03).** Each `LICENSE.yml` is a top-level YAML array of entry maps. Per-entry fields:

   | Field | Required? | Type | Meaning |
   |---|---|---|---|
   | `path` | required | string | In per-folder files (`main/util/`, `main/font/`, `tests/assets/`): folder-relative path; the generator derives Unit = `/<containing folder>/<path>`. **Folder-relative MUST mean no leading `/` and no `..` segments** — the parser is expected to schema-fail an entry whose per-folder `path:` is absolute or escapes the containing folder; codifies the parser's existing rule (closes [PR #23](https://github.com/Dexus-Forks/deepnest-next/pull/23) Copilot inline #2). In the root `main/LICENSE.yml` first-party-passthrough file: literal Unit-column value (e.g. `/main`, `minkowski.cc, minkowski.h`, `/polygon`) — special-cased by the generator because some passthrough rows refer to in-installer-but-out-of-tree paths under `node_modules/@deepnest/calculate-nfp/`. |
   | `name` | required | string | Human-readable component name (used for provenance; not rendered in `LICENSES.md`). |
   | `license` | required | string | **SPDX-canonical** identifier (e.g. `MIT`, `BSL-1.0`, `GPL-3.0-only`, `OFL-1.1`, `BSD-2-Clause`, `BSD-3-Clause`, `ISC`, `LicenseRef-PublicDomain`). Resolves Sage Story 2.1 Round-1 P3-01 first-party SPDX normalisation; matches SPDX 2.3 §10.1. |
   | `copyright` | required | string | Verbatim copyright line(s) for the License + Copyright cell of `LICENSES.md`. |
   | `upstream_url` | required | string | Provenance URL (not rendered; audit-only). |
   | `notes` | optional | string | Free-text provenance / audit context (not rendered; audit-only). |
   | `first_party` | optional | boolean | When `true`, the entry is rendered into the **first-party block** at the top of the `LICENSES.md` table regardless of source folder. Resolves Sage Story 2.1 Round-1 P3-02 (`latolatinfonts.css` placement). Default: `false`. |

   **Rendering rule (canonical, resolves Sage Story 2.2 Round-1 P2-01).** The generator emits `LICENSES.md` with a deterministic two-block ordering:

   - (a) **First-party block precedes third-party.** Any entry with `first_party: true` (regardless of source folder) is rendered into the first-party block at the top of the table; everything else is rendered into the third-party block below.
   - (b) **First-party order = `LICENSE_YML_FILES` walk-order, then YAML insertion order within each file.** No alphabetic sort inside the first-party block; the order is whatever the curated metadata files specify, in the order step 2 below walks them. This is intentional — first-party rows are author-curated for reading order (e.g. `/main`, `/main/svgparser.js`, `minkowski.cc, minkowski.h`, `/polygon` follows the project's own narrative).
   - (c) **Third-party order = ASCII byte sort by Unit column.** Stable, locale-independent, reproducible across platforms. (The Unit column is the value derived per row 1 of the schema table above — folder-relative `path` for per-folder files, literal `path` value for the root passthrough file.)

   The **Cross-references** subsection's out-of-tree `@deepnest/*` clause stands (resolves Sage Story 2.2 Round-1 P3-01 — fragile `§271` line-anchor replaced with subsection cross-reference): `@deepnest/svg-preprocessor` (out-of-tree, NOT shipped in the installer beyond its own `LICENSE` file) is not catalogued. `@deepnest/calculate-nfp` is the explicit exception (out-of-tree but **shipped** under `node_modules/` per `build.files: ['**/*']` no-asar; Boost legal-compliance requires attribution); it is catalogued via `main/LICENSE.yml` as the named passthrough mechanism.
2. Add `scripts/build-licenses.mjs` (Node stdlib only — no transitive deps; no `experimental` APIs; resolves Sage Story 2.2 Round-1 P3-02, which previously read narrowly as "no runtime deps beyond `fs` / `path`"). The script walks the **configured-roots list** — the script's `LICENSE_YML_FILES` constant — currently the root `main/LICENSE.yml` first-party-passthrough file followed by `main/util/LICENSE.yml`, `main/font/LICENSE.yml`, `tests/assets/LICENSE.yml` (root-first walk order is what makes Rendering rule (b)'s example block render `/main`, `/main/svgparser.js`, `minkowski.cc, minkowski.h`, `/polygon` as the first four first-party rows; cross-checked against `LICENSE_YML_FILES` at `scripts/build-licenses.mjs:28-33`). The constant **is** the configured-roots list (intentional narrowing for review-surface clarity over auto-discovery; resolves Sage Story 2.2 Round-1 P2-02). It reads each `LICENSE.yml` and emits a canonical, deterministically-ordered `LICENSES.md` per the rendering rule above (header preserved verbatim).
3. Wire `npm run licenses:build` (regenerates) and `npm run licenses:check` (regenerates to a temp string, diffs against committed). Add `licenses:check` to the `npm test` chain (or a pre-test hook) so CI fails when the committed file is stale.
4. Bootstrap commit lands the metadata files **and** the regenerated `LICENSES.md` as the new canonical source. Existing five data-hygiene issues from VP §Open Q2 table 3 are resolved as part of the bootstrap (path corrections, `?` resolutions, stale entry removed).
5. The generator script lives under `scripts/` (or `helper_scripts/` to reuse the existing `build.files` exclusion `!{examples,helper_scripts}`). Confirm at MVP sign-off via grep that the script is not in the packaged installer.

**Alternatives considered.**

- **Option A — single hand-edited PR.** Lowest immediate code surface; ships fastest. **Rejected** because the VP-found gaps prove the implicit "remember to update `LICENSES.md`" contract does not hold — a 13-line file that ought to have ~25 entries is the structural failure mode. Hand-editing fixes today's audit but bakes in tomorrow's drift, especially under the active Rust migration which keeps cycling vendored / native dependencies.
- **Option B — type-aware lint rule that reads file headers.** Considered and rejected: requires `parserOptions.project` (turned off per `project-context.md` §11), is brittle on non-JS file types (fonts, SVG), and adds a CI dimension (lint vs. test).
- **Option C — embed metadata in package.json under a custom key.** Rejected for clutter: `package.json` already pulls double-duty for npm + Electron + electron-builder; introducing a third schema slice fragments review surfaces.
- **Option D — externalise to a `.licenses.json` at repo root.** Considered. Equivalent to per-folder metadata in mechanics but less locality — folder-local metadata makes adding a new vendored library a single-folder PR (file + LICENSE.yml entry side-by-side), which matches `project-context.md` §4 module-boundary discipline.

**Consequences.**

- (+) Drift resistance — adding a new vendored library **inside an already-configured root** without a `LICENSE.yml` entry produces a CI failure on the next commit. The drift gate is **closed-set** by `LICENSE_YML_FILES` (see step 2): adding a third-party asset under a *new* root is a deliberate two-file PR (the new `LICENSE.yml` + the matching extension to the script's constant). The closed-set posture is intentional (review-surface clarity over auto-discovery) and resolves Sage Story 2.2 Round-1 P2-03; an optional companion `find . -name LICENSE.yml` cross-check inside the script is a future polish, not in this ADR's scope.
- (+) Aligns with FR-03's CI-side enforcement pattern — same review story for fixture drift and licence drift, reducing reviewer cognitive cost.
- (+) Anchored on existing `helper_scripts/` precedent (build helpers excluded from packaged app).
- (+) Bootstrapping cost is **bounded** (~25–30 metadata entries one-off; subsequent additions are 1 entry per new third-party item).
- (−) Adds a new build-time tool — small ongoing maintenance cost (Node script under 200 lines, no transitive deps).
- (−) Per-folder metadata files add visual clutter to `ls main/util/` etc. — accepted; offset by the locality benefit.
- (−) Data-hygiene bootstrap is non-trivial (resolve 3× `?` placeholders, fix 3× wrong paths) — counted against FR-02's story budget rather than deferred.

**Compensating control.** If the generator script breaks during MVP work (e.g. a malformed `LICENSE.yml`), `LICENSES.md` is **already committed** in canonical form — compliance is not lost. Recovery is fixing the metadata; the committed artefact remains valid in the interim.

**Independent revertibility.**

- Reverting the generator: leaves the last canonical `LICENSES.md` in place; CI gate degrades to "no-op" until restored. Compliance preserved.
- Reverting a single `LICENSE.yml`: CI catches drift on the next commit; `LICENSES.md` is regenerated by hand or via the script.
- Reverting `LICENSES.md` itself: CI catches drift on the next commit (committed != generated).

**Affects.** FR-02 implementation; CE story granularity (recommend 3–4 stories: bootstrap metadata, generator script, CI integration, data-hygiene fixes — or fold last two together).

**Cross-references.** ADR-003 (out-of-tree `@deepnest/*` packages) — the generator does **not** emit attribution for those; their licences live in their own repos. ADR-007 (strict TS only on `main/**/*.ts`) — generator is `.mjs` (not under `main/`), so the strict-TS surface is unchanged.

---

### ADR-009 — Background-worker shutdown sentinel + bounded try/catch boundary

**Status:** Accepted (this overlay).

**Date:** 2026-04-26.

**Context.**

`main.js` carries two `// todo:` markers (cmidgley fork inheritance) at the IPC handlers for `background-response` and `background-progress`. Today, exceptions thrown when forwarding those replies during app close are swallowed inside an outer try/catch — the symptoms are inconsistent NFP-cache state in `os.tmpdir()/nfpcache` after kill-during-nest, and (latently) a listener leak risk if `EventEmitter.defaultMaxListeners = 30` is approached.

The PRD (FR-04) requires that **all three exit paths** — graceful quit, in-app `background-stop` cancel, OS-level kill — leave a consistent NFP-cache and renderer state. NFR-02 codifies this as 15/15 trials across 5 runs × 3 paths. CP raised the sequencing question for CA: how should the shutdown sequence be structured so it is independently revertible from a future Phase-2 lift of `winCount > 1` (FR-07)?

**Decision.**

**Sentinel flag + bounded try/catch boundary, anchored on `app.before-quit`.** Concretely:

1. Introduce a single module-scoped boolean (`app.shuttingDown` or equivalent on the main-process module — naming finalised at story authoring time) initialised to `false`.
2. In `app.on('before-quit', ...)`, set the sentinel to `true` **before** any other shutdown work runs. Existing scratch-dir / nfpcache purge happens after the sentinel is set.
3. In each of the two `// todo:` IPC handlers (`background-response`, `background-progress`), check the sentinel as the first statement: if `app.shuttingDown === true`, return without forwarding. This is the **bounded try/catch boundary** — the existing outer try/catch becomes redundant for the shutdown case, and any genuine non-shutdown exception will surface to a top-level error handler instead of being swallowed.
4. `background-stop` (in-app cancel) keeps its existing destroy + recreate semantics; the sentinel does not apply (the app is not shutting down — only the workers are). Verify by repro that `background-stop` followed by a fresh `Nest` button click produces a clean run.
5. **Do not** introduce a new IPC channel. **Do not** change the `IPC_CHANNELS` constants in `main/ui/types/index.ts`. **Do not** change the `winCount` value or the `createBackgroundWindows()` round-robin matching.

**Alternatives considered.**

- **Option A — `webContents.destroy()` inside a Promise.allSettled on `app.before-quit`.** More elaborate; provides "drain pending work" semantics. Rejected: the PRD's contract is "leave a consistent state on exit", not "complete any in-flight nest". Drain semantics add complexity without buying anything FR-04 requires.
- **Option B — new `background-shutdown` IPC channel with ack from each bg window.** Rejected: adds an IPC channel (FR-06 AC-06.2 violation), and is overkill for `winCount = 1`. Phase 2 (FR-07) may want this once `winCount > 1`, but that is a separate decision under a separate ADR.
- **Option C — global `try/catch` in every `ipcMain.on` handler.** Rejected as a pattern: it does not solve the swallow-silently problem (FR-04 wants exceptions surfaced, not re-swallowed at the top level), and broadcasting try/catch bloats `main.js` reviewability.

**Consequences.**

- (+) Localised diff in `main.js` — three short edits (sentinel declaration, `app.before-quit` early-set, two-statement-check at each IPC handler).
- (+) `winCount = 1` invariant preserved without conditional logic.
- (+) Genuine (non-shutdown) exceptions now surface — improves debug-ability for future MVP work.
- (+) Independently revertible from FR-07 (Phase 2 worker-count lift) — see §6 Open Q2.
- (−) The sentinel is module-state — a small testability cost (the manual-repro acceptance per NFR-02 is the contract; no unit test exists below the UI per `project-context.md` §12).
- (−) If a future story ever adds a third `// todo:` site under similar shutdown semantics, the sentinel pattern should be reused — codified in this ADR as the **shutdown idiom for `main.js`**.

**Independent revertibility.**

- Reverting ADR-009: restore the original swallow-silently behaviour at the two `// todo:` sites; remove the sentinel + the `app.before-quit` early-set. NFR-02 fails again, but no other code is affected.
- Reverting ADR-009 **does not** affect `winCount` or `createBackgroundWindows()`. Conversely, reverting a Phase-2 `winCount > 1` change (FR-07) **does not** affect the sentinel or `app.before-quit` early-set. The two changes are in different functions and revertible by separate commits.

**Affects.** FR-04 implementation; NFR-02 verification procedure; FR-07 sequencing (Phase 2). Story-level note: the FR-04 implementation PR must include the manual-repro 15/15 evidence in its PR description (per AC-04.2).

**Cross-references.** ADR-001 (multi-process compute) — preserved. `project-context.md` §6 (`background-stop` semantics) — preserved. `project-context.md` §8.4 (scratch-dir cleanup on `app.before-quit`) — preserved; the sentinel is set before the existing purge runs, not after.

---

## 6. Open Questions Resolved

> The PRD §References & Handoff and the VP report each carried specific open questions to CA. They are answered here, with concrete sequencing rules for CE and Amelia.

### Open Q1 — `main.js` sequencing (CP)

**Question (verbatim from PRD §References & Handoff item 3 and the issue description).** "Architecture changes touching `main.js` should land in the same epic as FR-04 or strictly after it, to keep merges trivial. Confirm or replace."

**Answer.** **Confirmed, with a stronger and concrete rule.**

**Sequencing rule.**

1. **In MVP**, only **FR-04** touches `main.js`. Verified by mapping each MVP FR to its component touchpoints in §3.1 of this overlay:
   - FR-01: `main/img/`, `main/font/`, `docs/asset-inventory.md` — no `main.js`.
   - FR-02: `LICENSES.md`, per-folder metadata, `scripts/`, `package.json` — no `main.js`.
   - FR-03: `tests/`, `package.json`, `scripts/`, `docs/development-guide.md` — no `main.js`.
   - FR-04: `main.js` only.
   - FR-05: `index.d.ts`, optionally `main/ui/types/index.ts` — no `main.js`.
   - FR-06: PR template only — no `main.js`.

2. **Therefore, no MVP epic competes with FR-04 for `main.js`.** The sequencing rule "FR-04 or strictly after" is **vacuously satisfied** in MVP; CE may schedule MVP epics in any order without merge churn. (This frees CE from a sequencing constraint that no longer binds.)

3. **In Phase 2**, **FR-07** (re-enable bg-worker parallelism, `winCount > 1`) **does** touch `main.js` (specifically `createBackgroundWindows()` and the `background-start` round-robin in the same file). Per the PRD's hard-dep declaration, FR-07 lands strictly after FR-04 — preserved here as a binding rule.

4. **Future-proofing.** Any new epic (Phase-3 hardening, new feature, etc.) that touches `main.js` must declare that fact in its epic description. CE and Winston's IR gate are the enforcement points. The rule on the next epic is: if it touches `main.js` and is concurrent with another `main.js`-touching epic, **bundle them or strictly sequence them**. Concurrent open PRs on `main.js` are forbidden.

### Open Q2 — `winCount` rollback path (CP)

**Question (verbatim from PRD §References & Handoff item 4 and the issue description).** "When Phase-2 lifts the cap (re-enables parallelism > 1 bg window), document the independent-revert path so the `winCount` change is revertible without reverting FR-04."

**Answer.** **Independent revertibility is preserved by code-locality + commit-locality discipline.**

**The revert recipe.**

- **FR-04 (ADR-009) lives at three sites in `main.js`:**
  1. Sentinel declaration (top of `main.js` — before any handler bindings).
  2. `app.on('before-quit', ...)` early-set of the sentinel (`app.shuttingDown = true` first statement of the existing `before-quit` handler).
  3. Two `// todo:` sites (now `// fr-04:` after the fix) in the `background-response` and `background-progress` `ipcMain.on` handlers — first statement of each is the sentinel check.

- **FR-07 (Phase 2 worker-count lift) lives at two sites in `main.js`:**
  1. `createBackgroundWindows()` — the literal `winCount = 1` (or whatever the constant is named at story-authoring time) becomes `winCount = N` (or a config-derived value).
  2. `background-start` round-robin in `main.js` — re-verify the `isBusy` matching loop. Today it short-circuits because `winCount = 1`; lifting the cap requires the loop to actually iterate. Per `project-context.md` §6 rule 4, this is the explicit re-verification point.

- **The two changes never touch the same function or the same lines.** ADR-009 changes the **shutdown** path (`before-quit`, response/progress handlers); FR-07 changes the **startup** path (`createBackgroundWindows`) and the **dispatch** path (`background-start` round-robin).

**Revert procedure.**

- **Revert FR-07 only:** `git revert <commit-of-FR-07>`. Restores `winCount = 1` and the short-circuited round-robin. ADR-009's shutdown work is untouched and continues to satisfy NFR-02 with `winCount = 1`.
- **Revert ADR-009 only:** `git revert <commit-of-ADR-009>`. Restores the swallow-silently behaviour. FR-07's worker-count lift remains, but **the combination is unsafe** (a parallel-bg-window crash on shutdown was the original failure mode that motivated FR-04). **Do not revert ADR-009 while FR-07 is live.** Codified as a single line in this overlay; flagged in the FR-07 PR-template at story authoring.

**Sequencing constraint for FR-07's PR.** FR-07's PR must include: (a) the `winCount` literal change, (b) the round-robin re-verification, (c) regression evidence that NFR-02 (15/15 trials) still passes with `winCount > 1`. These three items go in **separate commits inside the same PR** so a partial revert can drop (a) without dropping (b) and (c). This keeps the rollback path independent at the commit level even though the changes share a PR.

### Open Q3 — FR-02 expanded scope (VP, new for CA)

**Question (verbatim from VP report §Final Verdict, "Open questions for CA — beyond what the PRD already lists").** "Architecture for FR-02 (expanded) — does the audit + paperwork live as a single PR, or as a manifest-generation script that emits `LICENSES.md` from per-folder metadata? CA should choose."

**Answer.** **Manifest-generation script + per-folder metadata + CI gate.** See **ADR-008** above.

**Implication for CE.** FR-02's epic is a **multi-story** epic (3–4 stories), not a single PR:

| Story (suggested) | Surface | Notes |
|---|---|---|
| FR-02-S1 — Bootstrap metadata + data-hygiene | `main/util/LICENSE.yml`, `main/font/LICENSE.yml`, `tests/assets/LICENSE.yml`, fix typos / placeholders / stale entries | Single big paperwork PR; all VP-found gaps closed. |
| FR-02-S2 — Generator script | `scripts/build-licenses.mjs` (or `helper_scripts/`) | Script + `npm run licenses:build` wiring. |
| FR-02-S3 — CI gate | `npm run licenses:check` + `npm test` integration | Verifies generated == committed. |
| FR-02-S4 *(optional, may fold into S3)* — Documentation | `docs/development-guide.md` "How to add a new vendored library" section | Drift-resistance handover doc. |

**Acceptable alternative (per VP):** If CE wants to consolidate, S2 + S3 may merge into one PR. S1 should remain its own PR for review surface (~25–30 metadata entries deserves a focused review).

---

## 7. Risk & Mitigation Summary (overlay-specific)

> Risks introduced or amplified by this overlay (beyond the PRD §Risks & Mitigations table). Existing risks from the PRD remain in force.

| Risk | Likelihood | Impact | Mitigation |
|---|---|---|---|
| ADR-008 generator script drift across `node` versions in CI matrix (Node 20.x vs 22.x) | Low | Low | Script uses Node-stdlib only (`fs` / `path` / `url` plus zero-dep YAML parser) — no transitive deps, no `experimental` APIs; CI matrix already gates this. (Wording widened from the original `fs` / `path` formulation per Sage Story 2.2 Round-1 P3-02.) |
| ADR-009 sentinel race during in-flight `background-stop` followed by `before-quit` in quick succession | Low | Medium (false-positive 15/15 failure) | NFR-02's manual-repro procedure already covers all three exit paths. Implementation should also include a comment at the sentinel declaration noting this race is bounded by single-process `EventLoop` ordering — no extra synchronisation needed. |
| FR-02 metadata file (`LICENSE.yml`) becomes stale because a vendored library upgrades silently | Medium | Low (out-of-date version, not absent attribution) | Documented in `docs/development-guide.md` (per FR-02 S4 if landed). Acceptable trade-off — version-currency is not the binding compliance contract; **presence of attribution** is. |
| Contributor adds a new vendored library without per-folder `LICENSE.yml` **inside an already-configured root** | Medium | Low (caught by CI on next commit) | ADR-008 CI gate is the explicit catch. Failure mode names the missing file path. |
| Contributor adds a new vendored library under a *new* root not in `LICENSE_YML_FILES` | Low | Medium (silent gap until reviewer notices) | The drift gate is closed-set by `LICENSE_YML_FILES` (per ADR-008 step 2 / Consequences); a new root requires a deliberate two-file PR (new `LICENSE.yml` + extension to the script's constant). Mitigated by the PR template's vendored-library checklist (FR-06). Resolves Sage Story 2.2 Round-1 P2-03. |
| FR-04's sentinel pattern is misunderstood as a general-purpose suppression flag and applied to non-shutdown handlers | Low | Medium (silent bug) | ADR-009 names the **shutdown idiom for `main.js`**; cross-referenced from `project-context.md` once the change lands (NFR-08 docs-freshness gate). |
| Phase-2 FR-07 ships before its NFR-02 re-verification (item (c) in its PR) | Low | High (regression of FR-04 invariant) | FR-07's PR template must include the 15/15 trial evidence; IR gate at FR-07 promotion is the enforcement. |

---

## 8. NFR-01 Baseline — Pre-MVP-Sprint Implementation-Readiness Gate

> The PRD's NFR-01 references "the rolling 5-run mean of the pre-MVP baseline of `npm test` on a CI runner captured at PRD sign-off." VP did not capture the number itself (Paperclip worker lacks `libboost-dev`; 5× Playwright Electron E2E runs would blow the heartbeat budget). VP recommended deferring to the first integration-CI run, before any MVP epic ships. CA confirms.

### Decision

**The NFR-01 baseline number is captured as a pre-MVP-sprint gate, owned by TEA (Murat), via a small pre-MVP CE story that lives outside the FR-01..06 epics but is enforced by the IR gate.**

### Owner

- **Primary:** **TEA (Murat)** via `bmad-testarch-nfr` (`NR`) workflow downstream. CTO / Winston sign-off acceptable as fallback if TEA is unavailable.

### Persistence

- **`_bmad-output/planning-artifacts/nfr01-baseline.json`**.
- Schema (canonical, as implemented in DEE-52):
  ```json
  {
    "captured_at": "<iso8601>",
    "runner_cell": "ubuntu-22.04 / node-22.x",
    "git_sha": "<sha>",
    "runs": [
      { "ms": <wall-clock-ms>, "exit_code": <int> },
      ... 5 entries total ...
    ],
    "rolling_mean_ms": <number, 1 decimal>,
    "stddev_ms": <number, 1 decimal, population stddev>,
    "tolerance_pct": 20
  }
  ```
  Per-run objects (rather than bare numbers) preserve the `npm test` `exit_code` so the IR gate can verify acceptance #1 ("all 5 `runs[].exit_code` equal 0"). Population stddev (`statistics.pstdev`) is the persisted formula; informational only — the regression check is `tolerance_pct`-based, not stddev-based.
- Future merge regressions are evaluated as `abs(observed_ms - rolling_mean_ms) / rolling_mean_ms <= tolerance_pct/100`, where `observed_ms` is the wall-clock duration of the `npm test` invocation on the canonical cell.

### Procedure (single PR, pre-MVP)

1. Add a Playwright JSON reporter to `playwright.config.ts` (`reporter: [['html'], ['json', { outputFile: 'playwright-report/results.json' }]]` or equivalent), guarded so it does not slow non-CI local runs. Reuse existing reporter wiring; no new test dependency. The JSON reporter is wired for diagnostic evidence (uploaded as a workflow artifact); it is **not** the timing source for the baseline.
2. Run the **canonical CI cell** (Linux / Ubuntu-22.04 × Node 22.x) **5 times** (rerun-on-success on the same SHA, no code changes between runs). The exact cell + node version is pinned by the capture workflow `.github/workflows/nfr01-baseline.yml`.
3. Time each run as the wall-clock duration of the `xvfb-run npm test` invocation (`(date +%s%N)` end − start, divided to ms). This includes node startup, electron-builder install-app-deps verification, and Playwright config load — all real-world overhead a future `npm test` regression would also experience. Capture the npm process `exit_code` alongside the duration.
4. Commit the 5 `{ms, exit_code}` records, the rolling mean, and the population standard deviation as `_bmad-output/planning-artifacts/nfr01-baseline.json`.
5. Update PRD §NFR-01 to reference the file as the authoritative baseline (a one-line edit; can land in the same PR).

### IR-gate enforcement

- The IR (Implementation-Readiness) check at DEE-51 (or wherever IR runs after CE) **MUST** verify `_bmad-output/planning-artifacts/nfr01-baseline.json` exists, has the schema above, and has 5 runs recorded.
- IR verdict: **PASS** if the file is present and well-formed. **CONCERNS** if file is present but the rolling-mean spread (max − min) exceeds 50% of the mean (indicates flaky baseline; recommend re-capture). **FAIL** if file is absent.
- A FAIL IR verdict on this gate blocks Sprint-Start for FR-01..06.

### Why not now

Capturing this baseline on the Paperclip worker, or on a developer laptop, would produce a number on the wrong hardware — every future merge is measured on a CI runner, and apples-to-oranges baselines compound the GA's stochastic noise. Better deferred to the actual CI runner one time, before any MVP epic ships.

---

## 9. Implementation-Readiness Pre-Conditions (input to IR gate)

> Winston (Phase-3 IR check) consumes this list. Each item is binary (present / absent) at IR time.

| # | Pre-condition | Source | Gate verdict on absence |
|---|---|---|---|
| 1 | `_bmad-output/planning-artifacts/architecture.md` exists and tracks the addressed open questions in frontmatter | This document | FAIL |
| 2 | ADR-008 and ADR-009 are documented in this overlay (or in sidecar files) | §5 of this document | FAIL |
| 3 | `_bmad-output/planning-artifacts/nfr01-baseline.json` exists with 5 runs | §8 of this document | FAIL |
| 4 | CE has split FR-01..06 into one-or-more stories per FR | DEE-50 (CE) output | FAIL |
| 5 | Each MVP story file references the relevant ADR(s) and the §16 anti-pattern list | DEE-50 (CE) output | CONCERNS (advisable but mitigatable) |
| 6 | FR-02 epic is split into ≥3 stories per ADR-008 | DEE-50 (CE) output | CONCERNS (single-PR FR-02 acceptable per VP fallback) |
| 7 | PR template / `.github/pull_request_template.md` references `_bmad-output/project-context.md` §16 | FR-06 / NFR-03 implementation | CONCERNS |
| 8 | FR-07 is **explicitly absent** from MVP scope (`winCount = 1` invariant intact) | CE's MVP story plan | FAIL |
| 9 | No new IPC channel or new `window` global is proposed in MVP stories | DEE-50 (CE) output | FAIL |

---

## 10. Per-FR Architecture One-Liners (final-comment ready)

For Winston's final summary comment / handoff to CE.

| FR | One-line architecture summary |
|---|---|
| **FR-01** | **Removal-only delta** in `main/img/` + `main/font/` + `docs/asset-inventory.md`. No runtime change. Independent per asset. |
| **FR-02** | **Generator + per-folder metadata + CI gate** (ADR-008). New `scripts/build-licenses.*`; multi-story epic (bootstrap + generator + CI). Excluded from packaged installer via `build.files`. |
| **FR-03** | **Build-time integrity check** wired into `npm test` (no new CI job). Names expected/observed on failure; re-derivation procedure documented in `docs/development-guide.md`. |
| **FR-04** | **Sentinel + bounded try/catch boundary** at the two `// todo:` sites in `main.js` and `app.before-quit` (ADR-009). Preserves `winCount = 1`; preserves IPC contract; independent of FR-07. |
| **FR-05** | **Type-only delta** in `index.d.ts` — add `transformParse` and `polygonifyPath` matching the existing call-site signatures in `main/deepnest.js`. No runtime change. |
| **FR-06** | **PR-template / reviewer-checklist process delta** anchored on `_bmad-output/project-context.md` §16. No code surface; cross-cutting enforcement for every MVP PR. |

---

## 11. References

### Source-of-truth (anchor)

- `docs/architecture.md` — the canonical current state. ADR-001..007 live here.
- `_bmad-output/project-context.md` (DEE-46 GPC) — the anti-pattern list (§16) is binding for every PR.
- `_bmad-output/planning-artifacts/prd.md` (DEE-47 CP) — capability contract.
- `_bmad-output/planning-artifacts/prd-validation-report.md` (DEE-48 VP) — must-absorb findings (FR-02 expansion, NFR-01 deferral).

### BMad chain status (post this overlay)

| Step | Skill | Owner | Output | Status |
|---|---|---|---|---|
| 1 | DP — `bmad-document-project` | Paige | `docs/` corpus | **Done** (DEE-45, merged) |
| 2 | GPC — `bmad-generate-project-context` | Paige | `_bmad-output/project-context.md` | **Done** (DEE-46, merged) |
| 3 | CP — `bmad-create-prd` | John | `_bmad-output/planning-artifacts/prd.md` | **Done** (DEE-47, merged) |
| 4 | VP — `bmad-validate-prd` | John | `prd-validation-report.md` (CONCERNS) | **Done** (DEE-48, merged) |
| 5 | **CA — `bmad-create-architecture`** | **Winston** | **This document** | **This step** (DEE-49) |
| 6 | CE — `bmad-create-epics-and-stories` | Winston (assigned to me per DEE-44) | epic + story files | **Next** (DEE-50, to be created) |
| 7 | IR — `bmad-check-implementation-readiness` | Winston + John | PASS / CONCERNS / FAIL | After CE; gates Sprint-Start |
| Pre-MVP-sprint gate | NFR-01 baseline capture | TEA (Murat) | `nfr01-baseline.json` | **Sub-task before MVP epic ships** (see §8) |

### Open questions handed off

- **For CE (DEE-50):** Confirm one-epic-per-FR sizing (recommended in PRD; affirmed by this overlay's per-FR breakdown). FR-02 should be 3–4 stories per ADR-008's recommended split. Each MVP story must reference relevant ADRs (008, 009) and `_bmad-output/project-context.md` §16.
- **For IR (DEE-51 or equivalent):** Pre-condition #3 (NFR-01 baseline) is the load-bearing one. Pre-condition #8 (`winCount = 1` intact) is the invariant guard.
- **For TEA (Murat):** Capture `nfr01-baseline.json` per §8 procedure. Single-PR job; not blocked on this overlay merging.
- **For Amelia (Dev):** Re-read `_bmad-output/project-context.md` §16 anti-pattern list, §8 (cross-cutting behaviours), §11 (ESLint/Prettier — pre-commit hook runs full Playwright; never `--no-verify`), §17 (brownfield caveats), and §6 (IPC contract) before each MVP story.

### Architecture document scope (for next CA invocation)

If a future change requires re-opening CA (Phase 2 / Phase 3 work), the next overlay should anchor on **both** `docs/architecture.md` (current state) **and** this overlay (MVP delta). Subsequent ADRs continue from ADR-010.

---

*End of `_bmad-output/planning-artifacts/architecture.md`. Authored by Winston (BMAD Architect) on 2026-04-26.*
