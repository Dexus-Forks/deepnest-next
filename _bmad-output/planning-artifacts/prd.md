---
stepsCompleted:
  - step-01-init
  - step-02-discovery
  - step-02b-vision
  - step-02c-executive-summary
  - step-03-success
  - step-04-journeys
  - step-05-domain
  - step-06-innovation-skipped
  - step-07-project-type
  - step-08-scoping
  - step-09-functional
  - step-10-nonfunctional
  - step-11-polish
  - step-12-complete
releaseMode: phased
inputDocuments:
  - _bmad-output/project-context.md
  - docs/index.md
  - docs/architecture.md
  - docs/project-overview.md
  - docs/source-tree-analysis.md
  - docs/component-inventory.md
  - docs/development-guide.md
  - docs/deployment-guide.md
  - docs/asset-inventory.md
documentCounts:
  briefCount: 0
  researchCount: 0
  brainstormingCount: 0
  projectDocsCount: 8
classification:
  projectType: desktop-app
  domain: manufacturing-cam
  complexity: high
  projectContext: brownfield
workflowType: 'prd'
generated_by: 'John (BMad PM) — bmad-create-prd, headless mode'
date: 2026-04-26
---

# Product Requirements Document - deepnest-next

**Author:** Paperclip
**Date:** 2026-04-26

> **Brownfield PRD.** This document scopes the next slice of work on `deepnest-next` — the community-maintained fork of Deepnest. It does **not** redesign the application. It captures what the existing app should *become* in a way that the downstream BMad chain (CA → CE → dev stories) can split into work without re-litigating decisions already made in `_bmad-output/project-context.md`.

## Executive Summary

`deepnest-next` is a single-process Electron desktop app (v1.5.6, MIT) that does 2D irregular bin-packing for laser cutters, CNC routers, and plotters. It targets makers, small fabrication shops, and hobbyists who need to nest SVG/DXF parts onto sheet stock without sending their designs to a cloud service. The product is a community fork of the now-dormant cmidgley/Deepnest line; its job is to keep the lights on while modernising the codebase incrementally — not to invent a new product. The scope of this PRD is the **post-DEE-44-planning maintenance + modernisation slice**: clean up the documented carry-over concerns (assets, licences, type gaps, security flags, worker shutdown), tighten the test-fixture contract, and decide on a UX-design pass before architecture work starts.

### What Makes This Special

- **Local-first, zero-telemetry.** No HTTP server, no database, no analytics, no auto-update — settings live in `userData/settings.json`. Workshop machines stay on the workshop network.
- **Native NFP + GA in one binary.** `@deepnest/calculate-nfp` (C/C++ → Rust migration in flight upstream) plus the legacy GA loop in `main/deepnest.js` ship together; no external compute service required.
- **Permissive licence, MIT.** Forkable, vendorable, embeddable — explicit choice over the upstream's drift.
- **Brownfield discipline.** A full DEE-11 deep-dive + DEE-45 DP + DEE-46 GPC have been done; every modernisation slice has a documented anti-pattern list (`project-context.md` §16) protecting it from accidental scope creep.

## Project Classification

| Attribute | Value |
|---|---|
| Project type | Desktop app (Electron multi-renderer + native add-on) |
| Domain | Manufacturing / CAM tooling (2D nesting for sheet-cut workflows) |
| Domain complexity | High — geometry algorithms, native modules, GA convergence, multi-renderer IPC |
| Project context | **Brownfield** — production codebase, fork of cmidgley/Deepnest, deep-dive + DP + GPC artefacts already in tree |
| Authoritative context | `_bmad-output/project-context.md` (DEE-46 GPC) |

## Success Criteria

### User Success

- An operator can install `deepnest-next` on Windows / macOS / Linux, import a representative SVG/DXF parts kit, define one or more sheets, run the nester, and export a placed SVG **without consulting external documentation** for the happy path.
- Existing 1.5.x users can upgrade in place — `userData/settings.json` and `userData/presets.json` from prior versions are read without manual migration (the legacy `convert.deepnest.io` → `converter.deepnest.app` rewrite remains transparent).
- The notification window continues to surface upstream announcements without being mistaken for telemetry — its 30-minute poll is documented and disable-able.

### Business Success

The "business" here is **continued community trust in the fork**. Concretely:

- Releases ship from `main` with a green CI matrix (Node 20.x and 22.x, Linux + Windows, native rebuild succeeds).
- Each modernisation slice is contained in a single epic with reviewer-comprehensible scope (the 7 carry-over concerns become 1–2 epics each, max — see §Product Scope).
- Zero regressions in the canonical Playwright spec (`tests/index.spec.ts`, `54/54` placement count, `#importsnav li` count `2`) per merge to integration.
- Asset-licence paperwork is complete: `tests/assets/*.svg` SIL OFL provenance is recorded in `LICENSES.md` (closes a known compliance gap).

### Technical Success

- Background-worker shutdown TODOs in `main.js` are resolved so the hard-coded `winCount = 1` cap can be lifted without races on app close.
- `SvgParserInstance` type surface in `index.d.ts` covers every method `main/deepnest.js` actually calls (`transformParse`, `polygonifyPath` minimum).
- Test-fixture integrity is enforced by an explicit checksum/snapshot mechanism so future `tests/assets/` edits cannot silently drift from the literal counts in the spec.
- Asset surface shrinks by removing the five documented unused icons + Lato dead-weight kit (~1.57–2.27 MB), with the saving recorded in `docs/asset-inventory.md`.
- No new globals on `window` (ADR-005), no new IPC channel outside `IPC_CHANNELS`, no new vendor-fork — anti-pattern list (`project-context.md` §16) holds.

### Measurable Outcomes

| Outcome | Measurement | Target |
|---|---|---|
| Regression freedom | `npm test` (Playwright E2E) on each PR | 100% pass, no flakes; placement count stays `54/54` until a fixture epic explicitly re-derives it |
| Native build portability | CI matrix (Linux + Windows × Node 20/22) | All four cells green per release |
| Asset weight | Bytes shipped in installer (`build.files` scope) | `≥ 1.57 MB` removed from the renderer asset surface |
| Background worker shutdown safety | Manual repro: kill app while nest running, restart, no NFP-cache corruption | Reproducible green state in 5 consecutive runs |
| Type coverage on UI seam | `tsc --noEmit` over `main/**/*.ts` + `main/ui/**/*.ts` | Zero errors; zero new `// @ts-ignore` |
| Documentation freshness | `_bmad-output/project-context.md` `Last updated` date | Refreshed within 7 days of any change to §2 (stack), §6 (IPC), or §16 (anti-patterns) |

## Product Scope

### MVP — Minimum Viable Product (this PRD's slice)

The MVP is the **carry-over-concerns cleanup epic set**. It is what ships next; everything else is post-MVP.

1. **Asset hygiene** — remove the five unused icons + Lato dead-weight kit; update `docs/asset-inventory.md`.
2. **Asset-licence paperwork** — add `tests/assets/` SIL OFL attribution to `LICENSES.md` (and a short `tests/assets/README.md` if the team prefers per-folder provenance).
3. **Test-fixture integrity** — add a checksum or snapshot guarding the `tests/assets/` ↔ `54/54` coupling so spec drift is caught at CI.
4. **Background-worker shutdown** — resolve the two `// todo:` sites in `main.js` so the bg-window count can be raised without exception leaks.
5. **`SvgParserInstance` type-gap** — extend `index.d.ts` to cover the missing methods.

### Growth Features (post-MVP, named-for-later)

6. **Re-enable bg-worker parallelism** (>1 background renderer). Gated on the shutdown work above; opens the door to multi-sheet GA throughput improvements.
7. **Re-skin pipeline for `icon.{icns,ico}`** — commit a source SVG and a script so contributors can re-skin without out-of-tree tooling.

### Vision (future / out-of-scope here)

8. **Renderer-security hardening** — moving off `nodeIntegration: true` + `contextIsolation: false` (ADR-004). High-impact, high-risk; only triggered when a feature lands that loads untrusted content. Until then the permissive renderer is **intentional**, not tech debt.
9. **Continued Rust migration** of `@deepnest/*` packages (out-of-tree). This PRD only commits to **pinning + re-verifying** after each upstream bump.
10. **Unit-test layer below the UI** (NFP cache, SVG parsing, GA fitness, IPC payload shapes). Currently coverage debt; not in this slice.

## User Journeys

### Persona — "Riya the Maker"  (primary user, happy path)

Riya runs a one-person laser-cutting side business out of her garage. She has a stack of customer orders that all cut from 3 mm birch ply. Her workflow: design a few bracket variants in Inkscape, export SVG, drop them into DeepNest, set the sheet to her stock size, hit Nest, run for ten minutes, export the placement, send to LightBurn.

- **Opening scene.** It's Saturday morning. She has 12 SVG files on her desktop and one 600 × 400 mm sheet in the laser. She launches `deepnest-next` (offline — her workshop has no Wi-Fi).
- **Rising action.** She drags the 12 SVGs onto the import area, sets quantities from filename, defines one sheet, clicks **Nest**. Background renderer chews through GA generations; the progress bar crawls right.
- **Climax.** Fitness stops improving. She inspects the placement preview (Ractive `nest-view`) — 84% sheet utilisation, no part collisions, no overhangs. She exports SVG with the sheet boundary box.
- **Resolution.** She opens the export in LightBurn, runs the job. No surprises. **DeepNest stays out of her way.** This is exactly the journey we must not regress.

> **Capabilities revealed:** SVG/DXF import, quantity-from-filename, sheet definition, GA-driven nesting, placement preview, SVG export with sheet boundary. **All already present** — this PRD's job is to keep them working through the modernisation slice.

### Persona — "Riya the Maker"  (edge case — interrupted nest)

Same Riya, different evening. Halfway through a long nest she realises she imported the wrong revision of one part. She clicks **Stop**, removes the part, re-imports, hits **Nest** again.

- **What happens today.** `background-stop` IPC fires; main destroys all bg windows and recreates them. The two `// todo:` shutdown sites in `main.js` swallow exceptions; if she had killed the app instead, the NFP cache dir under `os.tmpdir()/nfpcache` would be left dirty and the next run would re-do work.
- **What MVP must guarantee.** The shutdown TODOs are resolved so cancel-and-restart, kill-and-relaunch, and quit-during-nest all leave a clean cache state. Riya never has to know `nfpcache` exists.

> **Capabilities revealed:** background-worker shutdown safety; NFP cache lifecycle; renderer recreation. **Today partially broken** — directly drives FR-04 below.

### Persona — "Marco the Maintainer"  (contributor, brownfield modernisation)

Marco maintains the fork in his spare time. He's the actual reader of this PRD. He wants to land the carry-over-concern epics without spending a weekend re-deriving Playwright literal counts every time someone touches `tests/assets/`.

- **Opening scene.** A new contributor opens a PR re-encoding `tests/assets/foo.svg` to fix a path issue. Today the spec breaks silently because the placement count drifts from `54/54` and the literal in `tests/index.spec.ts` is now wrong.
- **Climax.** With FR-03 in place (test-fixture integrity check), CI fails fast with **"fixture set changed — re-derive `54/54` and `2` literals"**. Marco's review is two lines: "ack, please re-run codegen and update the assertions, link the new counts in the PR description."
- **Resolution.** No more silent fixture drift. Reviewers can trust the spec.

> **Capabilities revealed:** explicit test-fixture integrity check; CI-side enforcement; documented re-derivation procedure. **Drives FR-03.**

### Persona — "Sam the Sceptic"  (security-conscious adopter)

Sam is an IT manager at a small fab shop evaluating `deepnest-next` for shop floor PCs. He reads `LICENSES.md`, the README, and `docs/architecture.md` ADR-004 before installing anything.

- **Opening scene.** Sam needs to confirm: (a) no telemetry, (b) all third-party assets are correctly attributed, (c) the renderer-security posture is documented and intentional.
- **Today's gap.** `tests/assets/*.svg` are SIL OFL (Google Fonts derivatives) but `LICENSES.md` doesn't say so. Sam can't sign off until the paperwork matches what's in the tree.
- **Climax.** With FR-02 in place (asset-licence paperwork), `LICENSES.md` enumerates every third-party derivative under `tests/assets/`. Sam ticks the box and approves the install.
- **Resolution.** The fork passes its first OSS-supply-chain review. Future Sams don't have to ask.

> **Capabilities revealed:** licence/provenance documentation. **Drives FR-02.**

### Journey Requirements Summary

| Journey | Drives requirement(s) |
|---|---|
| Riya — happy path | Regression freedom (NFR-01); no journey-level new FRs — the existing capabilities must keep working |
| Riya — interrupted nest | FR-04 (background-worker shutdown), NFR-04 (NFP cache lifecycle) |
| Marco — fixture drift | FR-03 (test-fixture integrity), NFR-05 (CI gate) |
| Sam — supply-chain review | FR-02 (asset-licence paperwork) |

## Domain-Specific Requirements

> The "domain" here is **manufacturing-grade desktop tooling** — workshop / shop-floor PCs running an Electron app that drives a downstream CAM toolchain (LightBurn, gcode senders, plotter drivers). The constraints below shape every requirement that follows.

### Compliance & Provenance

- **MIT licence preserved.** The fork relicensing risk is real (cmidgley fork, derivative chain) — every new third-party asset must be licence-checked **before commit**, recorded in `LICENSES.md`. The `tests/assets/*.svg` SIL OFL gap (FR-02) is the open instance.
- **No telemetry** is a product promise, not just a default. Anything that adds an outbound HTTP call must be (a) optional, (b) named in `docs/architecture.md`, and (c) reviewed under §14 of `project-context.md` before merge.
- **Notification window** outbound poll is the only background HTTPS today. It must remain documented and auditable.

### Technical Constraints

- **Electron ABI fragility.** Native modules (`@deepnest/calculate-nfp`, `@deepnest/svg-preprocessor`) are rebuilt on `npm install` via `electron-builder install-app-deps`. Any change to Electron version, native module version, or build toolchain must run the full CI matrix (Linux + Windows × Node 20/22).
- **Permissive renderer (ADR-004).** `nodeIntegration: true` + `contextIsolation: false` + `enableRemoteModule: true` is intentional and load-bearing. Every new feature is reviewed against §16.6 of `project-context.md` — if it loads untrusted content, it is **out of scope** for this PRD and must escalate to the renderer-hardening epic (Vision item 8).
- **Mixed module systems.** `main.js` + `main/deepnest.js` + `main/background.js` + `main/util/*.js` are CommonJS; `main/ui/**` is ES modules. Stories that touch both must respect the boundary (no mixing within a single file).
- **Internal store is inches.** Any new length-typed config field must respect `÷25.4` / `×25.4` guards in `initializeConfigForm()` (§8.1 of `project-context.md`). Double-conversion bugs are a regression class we must not reintroduce.

### Integration Requirements

- **Zero new integrations** in this slice. The existing converter (`converter.deepnest.app`), notification poll, and OAuth surfaces are stable and out of scope.
- **Downstream toolchain (LightBurn, gcode senders) consumes our SVG export.** The export contract — sheet boundary box, coordinate system, units — must not change without a deliberate epic + migration note.

### Risks & Mitigations

| Risk | Likelihood | Impact | Mitigation |
|---|---|---|---|
| Test-fixture drift breaks `54/54` placement count silently | Medium | Medium (false-green CI) | FR-03 — explicit checksum/snapshot gate |
| Background-worker exception leak crashes UI on shutdown | Low | High (data loss in `nfpcache`) | FR-04 — resolve `// todo:` shutdown sites in `main.js` |
| Asset-licence audit fails (SIL OFL not attributed) | High | Low–Medium (compliance, not functional) | FR-02 — `LICENSES.md` update |
| Native rebuild fails on a new contributor's machine (boost / VS toolchain mismatch) | Medium | Low (developer friction, not user-facing) | Keep `docs/development-guide.md` in sync; do not commit to expanding platform support in this slice |
| Re-skin pipeline gap (`icon.{icns,ico}` no source SVG) blocks branding work | Low | Low | Deferred to Growth item 7 — not MVP |
| Adding a new global on `window` (ADR-005 violation) during modernisation | Medium | Medium (precedent risk) | Anti-pattern enforcement via PR review; explicit veto in `project-context.md` §16.1 |

## Desktop-App Specific Requirements

> Per project-type guidance for `desktop_app`: cover platform support, system integration, update strategy, offline capabilities. Skip web SEO and mobile-feature sections — not relevant.

### Project-Type Overview

`deepnest-next` is an Electron-packaged desktop application distributed as platform-native installers. There is no web build, no PWA, no mobile build. Users install once and run offline; settings persist in the OS-standard `userData` directory. CI builds Linux + Windows; macOS is local-only and unsigned. Native modules are rebuilt against Electron's ABI on every install — this is the single most fragile aspect of the build pipeline.

### Platform Support

| Platform | Distribution | Signing | CI |
|---|---|---|---|
| Windows | `electron-builder` installer (.exe) + `@electron/packager` portable folder | Certum cert (SHA-1 thumbprint hard-coded in `helper_scripts/sign_windows.js`); only `.exe`/`.dll`/`.node` are signed | ✅ Linux + Windows CI matrix |
| macOS | `@electron/packager` output | **Unsigned, unnotarised**; users must `xattr -d com.apple.quarantine` or right-click → Open | ❌ No macOS runner; local-only builds |
| Linux | `@electron/packager` output | Unsigned (norm for Linux distribution) | ✅ CI |

- **Build-toolchain prerequisites are non-trivial.** Linux requires `apt-get install -yq libboost-dev`; macOS requires `brew install boost`; Windows requires VS 2022 *Desktop development with C++* + Python 3.7.9+ (with the Windows App Installer Python alias **disabled**). These are documented in `docs/development-guide.md` and must stay in sync.
- **No new platform support** is committed in this PRD. macOS CI signing is a vision-tier item; Linux flavour-specific packaging (deb/rpm/AppImage) is out of scope.

### System Integration

- **OS shell handoff for external URLs.** `mainWindow.webContents.setWindowOpenHandler(...)` rejects all `window.open` calls and routes URLs to the OS shell. Anti-pattern §16.12 in `project-context.md` forbids spawning new `BrowserWindow` instances for external links — preserved.
- **Crash reporter is enabled but does NOT upload.** `uploadToServer: false` in `main.js`. Anti-pattern §16: any change to the upload flag is a **privacy review trigger**, not a code change.
- **Native add-on integration.** `@deepnest/calculate-nfp` (NFP / Minkowski) and `@deepnest/svg-preprocessor` (SVG normalisation) are loaded as Node addons in renderer processes via `nodeIntegration: true`. Story-level work that touches these must run `npm run build` end-to-end (compiles TS + rebuilds native via `electron-builder install-app-deps`) on at least one OS in the CI matrix before merge.
- **No system tray, no shell-extension, no file-association registration.** Out of scope for this PRD.

### Update Strategy

- **No auto-update.** `electron-updater` is **not** wired and is not in scope for this PRD. Users update by downloading new installers from GitHub Releases.
- **Settings round-trip.** `userData/settings.json` and `userData/presets.json` are read at start; the legacy `convert.deepnest.io` → `converter.deepnest.app` URL rewrite happens transparently at read time. This contract must not change in this slice.
- **Native rebuild on install.** `postinstall` hook runs `electron-builder install-app-deps`. Story-level work must NOT bypass this hook.

### Offline Capabilities

- **Default offline.** The app is fully usable without a network. No login, no telemetry, no cloud nesting compute.
- **Network-touching features and their behaviour offline:**
  - **DXF→SVG conversion** (`converter.deepnest.app`) — fails gracefully; user sees an error and can supply pre-converted SVG instead. This contract is preserved.
  - **Notification poll** (30 minutes after a 3-second startup delay) — fails silently; no user-visible error. This contract is preserved.
  - **OAuth login** — opens external browser; no offline fallback (user simply doesn't log in). Cloud features are optional.

### Implementation Considerations

- **`EventEmitter.defaultMaxListeners = 30`** is set in `main.js`. New IPC listeners must stay under the cap — leaks surface as user-visible warnings.
- **Background-worker count is hard-coded to 1** today (legacy was 8). Re-enabling parallelism requires both the shutdown-TODO fix (FR-04) **and** re-verifying the `background-start` round-robin matching in `main.js`. This is sequencing the architect needs to know.
- **Test pre-commit cost.** The pre-commit hook runs Playwright Electron E2E on every commit. Stories in this slice must accept commit latency; never `--no-verify` (anti-pattern §16.9).
- **`npm run lint` does NOT exist.** Stories that want to lint outside the staged set run `npx eslint .` / `npx prettier --check .` manually.
- **`tsconfig.json` is single-topology.** No `tsconfig.app.json` / `tsconfig.node.json` / `tsconfig.test.json` — and adding them is **out of scope** (DEE-40 scope correction).

## Project Scoping & Phased Development

> Phased delivery is the explicit ask in DEE-44. The 7 carry-over concerns from DEE-46 GPC §18 are **each addressed below** — none are silently dropped.

### MVP Strategy & Philosophy

**MVP Approach:** *"Brownfield maintenance MVP."* The minimum that ships next is what closes the documented compliance, integrity, and stability gaps in the existing app — without expanding feature surface. The fastest path to validated learning is **a clean Playwright-green release that ships from `main` after the cleanup epics merge**, proving the maintenance discipline actually holds under the new BMad chain.

**Resource Requirements:** One contributor (Marco-the-Maintainer profile), part-time. Each carry-over concern is sized to **single-PR review** so cycle time stays tight. No new hires assumed.

### Carry-Over Concern Disposition (DEE-46 GPC §18)

The 7 concerns carried forward from the GPC are each given an explicit disposition. **No concern is silently deferred.**

| # | Concern (from GPC §18) | Disposition | Phase | Drives |
|---|---|---|---|---|
| 1 | Asset-cleanup epic candidate (5 unused icons + Lato dead-weight kit, ~1.57–2.27 MB) | **In scope** | MVP | FR-01 |
| 2 | Asset-licence paperwork (`tests/assets/*.svg` SIL OFL not recorded in `LICENSES.md`) | **In scope** | MVP | FR-02 |
| 3 | Test-fixture integrity coupling (`tests/assets/` ↔ literal counts) | **In scope** | MVP | FR-03 |
| 4 | Background-worker shutdown TODOs (×2 in `main.js`) | **In scope** | MVP | FR-04 |
| 5 | `SvgParserInstance` type gap (`transformParse`, `polygonifyPath` missing in `index.d.ts`) | **In scope** | MVP | FR-05 |
| 6 | Permissive renderer security (ADR-004: `nodeIntegration: true`, etc.) | **Out of scope** — *intentional posture* | Vision (epic 8) | NFR-06 (preservation rule), no FR |
| 7 | Re-skin pipeline for `icon.{icns,ico}` (no committed source SVG) | **Deferred** to Growth (epic 7) | Growth | Named-for-later, no MVP FR |

### MVP Feature Set (Phase 1)

**Core User Journeys Supported:** Riya-happy-path (regression freedom), Riya-interrupted-nest (FR-04), Marco-fixture-drift (FR-03), Sam-supply-chain (FR-02). **All four** journeys must be green at the end of MVP.

**Must-Have Capabilities:** FR-01 through FR-05 (see §Functional Requirements). NFR-01 through NFR-05 (see §Non-Functional Requirements).

### Post-MVP Features

**Phase 2 (Growth):**

- **Re-enable bg-worker parallelism** (>1 background renderer). **Hard sequencing:** depends on FR-04 shipping in MVP. Adds throughput on multi-sheet nests; opens the door to GA tuning epics.
- **Re-skin pipeline for `icon.{icns,ico}`.** Commit a source SVG and a re-skinning script. Unblocks community fork-reskins.

**Phase 3 (Vision):**

- **Renderer-security hardening** — moving off `nodeIntegration: true` + `contextIsolation: false` (ADR-004). Triggered by the first feature that loads untrusted content; until then, the permissive posture is intentional and **NFR-06 forbids drift**.
- **Continued Rust migration** of `@deepnest/*` packages (out of this repo). PRD only commits to **pinning + re-verifying** after each upstream bump.
- **Unit-test layer below the UI** (NFP cache, SVG parsing, GA fitness, IPC payload shapes). Coverage debt acknowledged; not in this slice.

### Risk Mitigation Strategy

**Technical Risks:**

- *Native rebuild fragility on PR CI* — mitigated by keeping the Linux + Windows × Node 20/22 matrix mandatory on every release. Stories that touch native modules must include a "ran `npm run build` on at least one of those four cells" item in the PR description.
- *Background-worker shutdown fix introduces a regression in the hot-path NFP cache* — mitigated by keeping `winCount = 1` (today's value) until the parallelism epic in Phase 2 explicitly raises it. **FR-04 fixes shutdown only**; it does **not** raise the worker count.
- *Test-fixture integrity check produces false-positives on legitimate fixture edits* — mitigated by an explicit re-derivation procedure (see FR-03 acceptance criteria) and by emitting the new expected counts when the check fails, so the dev sees "expected `54/54`, got `60/60`, update spec literals" rather than just a red CI.

**Market Risks:** Effectively *community trust risk*. Mitigated by tight PR scope (one carry-over concern per epic, max), green CI as the merge gate, and visible release notes showing the asset/licence/integrity gains.

**Resource Risks:** If contributor capacity drops, the carry-over concerns can be merged independently — they have no inter-epic dependencies inside MVP. The only intra-MVP-to-Growth dependency is **FR-04 must ship before bg-worker parallelism (Growth epic 6)**. Everything else can land in any order.

## Functional Requirements

> **Capability contract.** Each FR is a testable capability with at least one acceptance criterion (AC). Implementation choices live in CA (architecture); these FRs are implementation-agnostic. Phase tags reflect the §Project Scoping decisions above.

### Asset Hygiene & Provenance

#### FR-01 — Remove unused renderer-side assets [Phase 1 / MVP]

- **Statement.** A Maintainer can remove the documented dead-weight assets (five unused icons + the Lato dead-weight kit) from the repository so they no longer ship in the installer.
- **AC-01.1.** The five icons listed in `docs/asset-inventory.md` (`auth0logo.svg`, `background.png`, `logo.svg`, `progress.svg`, `stop.svg`) are removed from the working tree and not re-introduced.
- **AC-01.2.** The Lato dead-weight items listed in `docs/asset-inventory.md` (`LatoLatin-BoldItalic.*`, demo specimen pages, `.eot`/`.ttf` for live weights) are removed.
- **AC-01.3.** `docs/asset-inventory.md` is updated to record the removals and the resulting installer size reduction (target ≥ 1.57 MB; ≤ 2.27 MB upper bound).
- **AC-01.4.** `npm test` (Playwright E2E) remains green after removal — no UI element silently depended on a removed asset.
- **AC-01.5.** No new `// @ts-ignore`, no new entry on `window`, no new IPC channel introduced as a side effect (anti-patterns §16.1, §16.8 hold).

#### FR-02 — Record SIL OFL provenance for `tests/assets/` [Phase 1 / MVP]

- **Statement.** A Sceptic auditing the project's supply chain can read `LICENSES.md` and find a complete record of the SIL OFL provenance of every Google-Fonts-derived SVG under `tests/assets/`.
- **AC-02.1.** `LICENSES.md` enumerates every SIL OFL-derived SVG under `tests/assets/` (or a folder-scoped attribution that links from `LICENSES.md`).
- **AC-02.2.** The attribution names the upstream font family, the SIL OFL 1.1 licence, and the project URL, matching the format already used elsewhere in `LICENSES.md`.
- **AC-02.3.** A `tests/assets/README.md` is added (or updated) cross-referencing `LICENSES.md`.
- **AC-02.4.** No actual asset file under `tests/assets/` is renamed or re-encoded as part of this FR (avoids triggering FR-03 churn pre-emptively).

#### FR-03 — Enforce test-fixture integrity in CI [Phase 1 / MVP]

- **Statement.** A Maintainer can rely on CI to fail fast when `tests/assets/` content drifts from what the literal assertions in `tests/index.spec.ts` expect.
- **AC-03.1.** A check (checksum manifest, content-snapshot, or equivalent) exists in the repo that captures the current `tests/assets/` set and the literal counts the spec depends on (`#importsnav li` count, placement count).
- **AC-03.2.** The check runs as part of the existing `npm test` invocation (no new CI job required) and exits non-zero when the fixture set changes without the literals being updated in the same change.
- **AC-03.3.** When the check fails, its output names the expected and observed values for *both* literals and points the developer at the section in `docs/development-guide.md` (or equivalent) that documents the re-derivation procedure.
- **AC-03.4.** The re-derivation procedure (re-run codegen, update spec literals, update the manifest) is documented in `docs/development-guide.md`.
- **AC-03.5.** Existing fixture set + spec literal pair (`54/54` placements, `2` import nav items) passes the check on first commit (no false-positive on day one).

### Background-Worker Stability

#### FR-04 — Background-worker shutdown safety [Phase 1 / MVP]

- **Statement.** A primary user (Riya) can cancel a running nest, kill the app mid-nest, or quit normally during a nest, and the application leaves the NFP cache and renderer state in a consistent state across all three exit paths.
- **AC-04.1.** The two `// todo:` shutdown sites in `main.js` (around `background-response` and `background-progress`) are resolved — exceptions on app close are handled, not swallowed silently.
- **AC-04.2.** Manually killing the app while a nest is running and relaunching does not surface NFP-cache corruption (the next nest computes correctly, no orphaned scratch dirs under `os.tmpdir()/nfpcache` accumulate beyond the one cleared on `app.before-quit`).
- **AC-04.3.** A `background-stop` IPC during an active nest destroys and recreates the background renderer cleanly (existing behaviour preserved — no listener leak; `EventEmitter.defaultMaxListeners = 30` cap is respected).
- **AC-04.4.** Worker count remains hard-coded to **1** in `createBackgroundWindows()` after this FR ships — raising the count is the explicit job of Phase 2 (Growth epic 6), not this FR.
- **AC-04.5.** `npm test` remains green; no new flakiness in the canonical Playwright spec.

### Type-System Coverage

#### FR-05 — Close `SvgParserInstance` type gap [Phase 1 / MVP]

- **Statement.** A Maintainer working on `main/deepnest.js` can rely on `index.d.ts` to type-check every method actually called on `window.SvgParser`.
- **AC-05.1.** `SvgParserInstance` in `index.d.ts` declares `transformParse` and `polygonifyPath` with signatures matching the call sites in `main/deepnest.js`.
- **AC-05.2.** `tsc --noEmit` over `main/**/*.ts` + `main/ui/**/*.ts` passes with zero new errors and zero new `// @ts-ignore` directives (anti-pattern §16.8).
- **AC-05.3.** No call site in `main/deepnest.js` is removed or "fixed" to side-step the type extension (the gap is closed by extending the type, not by deleting the call — explicit guard in §7 of `project-context.md`).

### Process Hygiene (cross-cutting, applies to every MVP FR)

#### FR-06 — Anti-pattern preservation across MVP epics [Phase 1 / MVP]

- **Statement.** A reviewer of any MVP-phase PR can verify that none of the anti-patterns listed in `_bmad-output/project-context.md` §16 has been re-introduced.
- **AC-06.1.** No new global on `window` outside the four declared in `index.d.ts` (ADR-005).
- **AC-06.2.** No new IPC channel outside `IPC_CHANNELS` in `main/ui/types/index.ts`.
- **AC-06.3.** No new `// @ts-ignore` directives.
- **AC-06.4.** No `--no-verify` commits; the pre-commit hook (lint-staged + Playwright) ran successfully on every commit in the PR.
- **AC-06.5.** No edits to `main/util/_unused/`, no edits to vendored utilities (`clipper.js`, `simplify.js`, `interact.js`, `ractive.js`, `parallel.js`, `pathsegpolyfill.js`, `svgpanzoom.js`).
- **AC-06.6.** No mm/inch double-conversion regressions (`÷25.4` / `×25.4` guards in `initializeConfigForm()` preserved if any length field is touched).

### Phase 2 Capabilities (Growth — for sequencing visibility only)

These are listed for traceability so CA/CE can plan around them. They are **not in MVP** and have no MVP-blocking AC.

#### FR-07 — Multiple background renderers (parallelism) [Phase 2 / Growth]

- **Statement.** A primary user can run nests with more than one background renderer to accelerate multi-sheet workflows.
- **Hard dependency.** FR-04 must ship first.
- **MVP impact.** None — `winCount = 1` stays in MVP per FR-04 AC-04.4.

#### FR-08 — Re-skinnable application icons [Phase 2 / Growth]

- **Statement.** A community contributor can re-skin `icon.icns` / `icon.ico` from a committed source SVG using a documented script, without out-of-tree tooling.
- **MVP impact.** None.

### Phase 3 Capabilities (Vision — preserved as anti-regression rules in NFR-06, no MVP FR)

- Renderer-security hardening (ADR-004 reversal), Rust-backed `@deepnest/*` migrations, sub-UI unit-test layer. **None in MVP.**

## Non-Functional Requirements

> **Each NFR has a measurable goal so that TEA's `bmad-testarch-nfr` (`NR`) workflow downstream can evaluate it.** Categories not relevant to this brownfield maintenance slice (scalability, accessibility-as-a-new-feature) are intentionally omitted to avoid bloat. Accessibility-as-preservation is implicit in NFR-01 (no regression).

### NFR-01 — Performance / Regression Freedom

- **Goal.** No measurable degradation in nest convergence time on the canonical Playwright fixture set vs. the pre-MVP baseline on the same hardware.
- **Measurement.** `npm test` (Playwright E2E) records per-test wall-clock duration on every CI run. After each MVP epic merges to integration, the duration of the canonical `tests/index.spec.ts` test must be **within ±20% of the rolling 5-run mean of the pre-MVP baseline** captured at PRD sign-off.
- **Tolerance source.** ±20% reflects expected CI-runner noise; tighter bounds would produce false-positive flakes given the GA's stochastic nature.
- **Failure response.** A regression beyond the bound blocks merge; the epic owner profiles before re-submission.

### NFR-02 — Reliability / Worker Shutdown

- **Goal.** Across all three exit paths (graceful quit, in-app cancel, OS-level kill) during an active nest, the application leaves the NFP cache and renderer state consistent.
- **Measurement.** Manual repro script: launch app, start nest, trigger exit path; relaunch, run nest again, verify completion and no orphaned `os.tmpdir()/nfpcache` directories. Run **5 consecutive iterations per path × 3 paths = 15 trials**; **15/15 must pass** before FR-04 is accepted.
- **Long-running guard.** No `EventEmitter` listener-cap warning (>30 listeners) appears in console output across the 15 trials.

### NFR-03 — Maintainability / Anti-Pattern Preservation

- **Goal.** Every PR merged in MVP preserves the anti-pattern list in `_bmad-output/project-context.md` §16.
- **Measurement.** PR-template checklist (or equivalent) requires the reviewer to tick each of the 16 anti-patterns as "not violated" before approval. **Zero ticked-as-violated** allowed in merged PRs. Reviewer can cite the GPC §16 section number for any concern.
- **Tooling support.** No new lint rule is committed for this NFR — the cost/benefit of type-aware lint rules has been evaluated and rejected (see `project-context.md` §11). The check stays human-in-the-loop.

### NFR-04 — Reliability / Native Build Portability

- **Goal.** `npm install && npm run build` succeeds on every cell of the Linux + Windows × Node 20.x + 22.x CI matrix at every release.
- **Measurement.** GitHub Actions matrix run (4 cells); **all 4 green** required for a release tag.
- **macOS exemption.** macOS builds are local-only and unsigned; they are explicitly **not** in the gate. Documenting this here so a future contributor doesn't accidentally make it MVP-blocking.

### NFR-05 — Maintainability / Test-Fixture Integrity Gate

- **Goal.** A change to `tests/assets/` that drifts the Playwright spec literals fails CI within the same change.
- **Measurement.** FR-03 implements this. NFR-side measurement: **zero `tests/assets/`-only commits land on integration without either (a) the manifest updated or (b) CI failing red on the literal-drift check.** Audited per release by sampling commits since the previous tag.

### NFR-06 — Security / Posture Preservation

- **Goal.** The intentional permissive renderer posture (ADR-004) is preserved in MVP — *no creep toward partial hardening that would break the existing app while not actually hardening anything*.
- **Measurement.** Every `BrowserWindow` constructor in `main.js` retains `nodeIntegration: true`, `contextIsolation: false`, `enableRemoteModule: true`, `nativeWindowOpen: true`. Verified by a one-time grep at MVP sign-off. **3 BrowserWindow constructors today; 3 expected at sign-off.**
- **Why preservation, not hardening.** Hardening is the Phase-3 epic and requires every renderer to migrate. Partial hardening produces a worst-of-both-worlds posture (broken app, no security gain). NFR-06 forbids the partial state.
- **Privacy preservation.** `crashReporter.uploadToServer` remains `false`. No new outbound HTTPS endpoint added beyond the documented three (DXF converter, notification poll, OAuth login).

### NFR-07 — Compatibility / Settings Round-Trip

- **Goal.** A `userData/settings.json` file written by deepnest-next 1.5.6 is read without manual migration after MVP merges.
- **Measurement.** Manual test: copy a 1.5.6 `settings.json` (containing the legacy `convert.deepnest.io` URL) into the test profile, launch post-MVP build, verify (a) no error dialog, (b) URL is rewritten transparently to `converter.deepnest.app` on read, (c) all UI form fields populate correctly. **Pass = silent migration on first run.**

### NFR-08 — Documentation Freshness

- **Goal.** `_bmad-output/project-context.md` is the canonical context file. It must reflect MVP changes that affect §2 (stack), §6 (IPC), or §16 (anti-patterns).
- **Measurement.** Post-MVP audit: any PR that touched `package.json` `dependencies` / `devDependencies`, `IPC_CHANNELS`, or added a new constraint must have **either** updated `project-context.md` in the same PR, **or** filed a follow-up issue updating it within **7 days** of merge. Audited per release.

## UX Scope (Decision for DEE-44 Step 4 — Sally / `bmad-create-ux-design`)

> **DEE-47 charter requires CP to make the run/skip call for CU explicitly.** Below is the recommendation, the rationale, and the surfaces Winston should re-evaluate if the call is overridden.

### Recommendation: **Skip CU**

DeepNest is a brownfield Electron desktop app with a substantial existing UI (`main/index.html`, the modern UI service layer in `main/ui/**`, two Ractive views — `parts-view` and `nest-view`). Every FR in this PRD is a **maintenance, integrity, type-system, asset-hygiene, or process-hygiene** requirement. None of FR-01 through FR-06 introduces a new user-facing flow, a new screen, a new dialog, or a new interaction pattern that doesn't already exist.

The only surface where users see anything different post-MVP is **error/console messaging** for FR-03 (test-fixture integrity check) and **internal robustness** for FR-04 (worker shutdown) — neither calls for UX design work. The asset-hygiene FR-01 is a *removal*; the licence-paperwork FR-02 is documentation; FR-05 is invisible to end-users.

### Rationale

- **No UX-shaped requirement.** The capability contract introduces zero new user-facing flows.
- **Existing UI is sufficient.** The current screens already carry the operator through the canonical journey (Riya-happy-path) without modification.
- **Adding CU here is theatre.** Running Sally on a slice with no UX surface dilutes the discipline of the BMad chain. Save CU for the slice that genuinely needs it (renderer-security hardening, multi-bg-worker visibility, or any new feature that lands a screen).

### Conditions That Would Flip This to "Run CU"

If Winston (CA) or the board adds **any** of the following to MVP scope before architecture lands, this recommendation should be re-evaluated:

- A user-visible UI for selecting / configuring multiple background workers (Phase-2 epic 6 — when it's promoted).
- A licence/attribution viewer in-app (e.g., "About → Licences" surfacing `LICENSES.md`).
- A user-visible notification of CI fixture-drift (rather than CI-only).
- Any new dialog, panel, or settings surface introduced by an architecture decision.

If none of the above is added: **proceed straight from VP to CA**, as planned. Winston creates DEE-48 (VP) directly; no CU child issue is needed for this slice.

## Polish — What Was Reduced / Consolidated

This section is included for traceability. The polish pass:

- **Did not** rewrite any prior content — the document was written densely on first pass and the duplication was already structurally constrained (e.g., the `Product Scope` overview list and the `Project Scoping & Phased Development` table intentionally cover the same 7 concerns at different altitudes — overview vs. binding disposition).
- **Added** the `UX Scope` section above (mandatory per DEE-47).
- **Added** the `References & Handoff` section below (the workflow doesn't have a dedicated step for this, but VP and CA both need it).

## References & Handoff

### Source-of-truth documents

- **Primary context.** `_bmad-output/project-context.md` (DEE-46 GPC) — load this **before** reading individual deep-dives.
- **Anti-patterns (binding).** `_bmad-output/project-context.md` §16 — every PR in MVP is checked against this.
- **DP artefacts.** `docs/index.md`, `docs/architecture.md`, `docs/asset-inventory.md`, etc. (DEE-45 outputs).
- **Deep dives.** `docs/deep-dive/<a..j>/` — file-level granularity; only consult via the GPC Reference map.

### BMad chain status (post this PRD)

| Step | Skill | Owner | Output | Status |
|---|---|---|---|---|
| 1 | DP — `bmad-document-project` | Paige | `docs/` corpus | **Done** (DEE-45, merged) |
| 2 | GPC — `bmad-generate-project-context` | Paige | `_bmad-output/project-context.md` | **Done** (DEE-46, merged) |
| 3 | **CP — `bmad-create-prd`** | **John** | **`_bmad-output/planning-artifacts/prd.md`** | **This document** |
| 4 | CU — `bmad-create-ux-design` | Sally | `planning_artifacts/ux-design.md` | **Recommend SKIP** (see §UX Scope) |
| 5 | VP — `bmad-validate-prd` | John | PRD validation report | **Next** (DEE-48 will be created by Winston) |
| 6 | CA — `bmad-create-architecture` | Winston | architecture decision record | After VP green |
| 7 | CE — `bmad-create-epics-and-stories` | John | epic + story files | After CA |
| 8 | IR — `bmad-check-implementation-readiness` | John + Winston | PASS / CONCERNS / FAIL | Final gate |

### Open questions for VP / CA

These do **not** block the PRD; they are flagged for the next-step skills.

1. **VP — quantitative baseline for NFR-01.** The ±20% performance bound references "the rolling 5-run mean of the pre-MVP baseline captured at PRD sign-off." Sign-off is the moment to capture that baseline (5 runs of `npm test` on a CI runner). VP should validate the procedure exists and is recorded.
2. **VP — `LICENSES.md` audit completeness.** FR-02 lists `tests/assets/*.svg` as the open SIL OFL gap. VP should grep the rest of the tree for any other un-attributed third-party assets to confirm that's the *only* gap.
3. **CA — sequencing FR-04 vs. anything that touches `main.js`.** FR-04 modifies `main.js` shutdown sites. Any architecture change that also touches `main.js` (e.g., new IPC handler) should land in the same epic or strictly after FR-04, to keep merges trivial.
4. **CA — re-evaluate `winCount` change procedure.** When Phase-2 epic 6 lifts the cap, CA should specify the rollback path (revert `winCount` change is a one-liner; revert FR-04 changes is not — they should be independently revertible).
5. **CE — epic granularity.** Recommended one epic per FR (six epics: FR-01 through FR-06). Smaller stories (1–3 per epic) sized for single-PR review. CE should validate that this granularity matches the contributor capacity assumption in §Project Scoping.

### Anti-patterns the dev agent (Amelia) should re-read before each MVP story

- `_bmad-output/project-context.md` §16 (full anti-pattern list — 16 items)
- §8 (cross-cutting behaviours that bite — esp. mm/inch internal store)
- §11 (ESLint/Prettier — pre-commit hook runs full Playwright; never `--no-verify`)
- §17 (brownfield caveats — mixed module systems, vendored utilities, active Rust migration)

