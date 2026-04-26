---
validationTarget: '_bmad-output/planning-artifacts/prd.md'
validationDate: 2026-04-26
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
validationStepsCompleted:
  - step-v-01-discovery
  - step-v-02-format-detection
  - step-v-03-density-validation
  - step-v-04-brief-coverage-validation
  - step-v-05-measurability-validation
  - step-v-06-traceability-validation
  - step-v-07-implementation-leakage-validation
  - step-v-08-domain-compliance-validation
  - step-v-09-project-type-validation
  - step-v-10-smart-validation
  - step-v-11-holistic-quality-validation
  - step-v-12-completeness-validation
  - step-v-13-report-complete
validationStatus: COMPLETE
holisticQualityRating: '5/5 — Excellent'
overallStatus: CONCERNS
overallStatusReason: 'PRD structurally exemplary (5/5 holistic, 0 critical); two scoped concerns surfaced — NFR-01 baseline number not yet captured (deferred to first integration-CI run), FR-02 scope too narrow (LICENSES.md gaps beyond `tests/assets/*.svg`).'
findingsSummary:
  critical: 0
  major: 1   # FR-02 scope narrow (re-edit recommended pre-CA)
  medium: 1  # NFR-01 baseline deferred
  minor: 1   # §Polish section is admin-meta (cosmetic)
generated_by: 'John (BMad PM) — bmad-validate-prd, headless mode'
---

# PRD Validation Report

**PRD Being Validated:** `_bmad-output/planning-artifacts/prd.md`
**Validation Date:** 2026-04-26

## Input Documents

- **Primary context (loaded first):** `_bmad-output/project-context.md` (DEE-46 GPC, complete, 17 sections + reference map)
- **PRD under validation:** `_bmad-output/planning-artifacts/prd.md` (525 lines, 13 L2 sections, FR-01..06 + FR-07..08 sequencing-only, NFR-01..08, frontmatter tracks 12/12 steps)
- **DP corpus from PRD frontmatter:** `docs/index.md`, `docs/architecture.md`, `docs/project-overview.md`, `docs/source-tree-analysis.md`, `docs/component-inventory.md`, `docs/development-guide.md`, `docs/deployment-guide.md`, `docs/asset-inventory.md`

## Validation Findings

## Format Detection

**PRD Structure (Level 2 headers, in order):**

1. Executive Summary
2. Project Classification
3. Success Criteria
4. Product Scope
5. User Journeys
6. Domain-Specific Requirements
7. Desktop-App Specific Requirements
8. Project Scoping & Phased Development
9. Functional Requirements
10. Non-Functional Requirements
11. UX Scope (Decision for DEE-44 Step 4 — Sally / `bmad-create-ux-design`)
12. Polish — What Was Reduced / Consolidated
13. References & Handoff

**BMAD Core Sections Present:**

- Executive Summary: Present
- Success Criteria: Present
- Product Scope: Present
- User Journeys: Present
- Functional Requirements: Present
- Non-Functional Requirements: Present

**Format Classification:** BMAD Standard
**Core Sections Present:** 6/6

**Frontmatter:** complete (`stepsCompleted` lists 12/12 workflow steps; `classification` populated with `projectType: desktop-app`, `domain: manufacturing-cam`, `complexity: high`, `projectContext: brownfield`).

## Information Density Validation

**Anti-Pattern Violations:**

- **Conversational Filler** (`The system will allow users to`, `It is important to note that`, `In order to`, `For the purpose of`, `With regard to`): **0** occurrences.
- **Wordy Phrases** (`Due to the fact that`, `In the event of`, `At this point in time`, `In a manner that`, `In terms of`, `By means of`, `A number of`): **0** occurrences.
- **Redundant Phrases** (`Future plans`, `Past history`, `Absolutely essential`, `Completely finish`): **0** occurrences.

**Total Violations:** 0
**Severity Assessment:** Pass

**Recommendation:** PRD demonstrates strong information density. Capability statements use direct active-voice (`A Maintainer can…`, `A primary user can…`) instead of "the system will allow". No filler detected on a 525-line document with 13 L2 sections — high signal-to-noise across the board.

## Product Brief Coverage

**Status:** N/A — No Product Brief was provided as input.

PRD frontmatter declares `documentCounts.briefCount: 0`. This is a brownfield maintenance PRD; the upstream input is the GPC (`_bmad-output/project-context.md`), not a brief. The PRD's `Executive Summary` and `Project Classification` together perform the brief-equivalent role (vision, users, differentiator, classification table) — that coverage is validated under §Brownfield Context Coverage (custom finding) below in step v-12 (Completeness).

## Measurability Validation

### Functional Requirements

**Total FRs Analyzed:** 8 (FR-01..06 in MVP, FR-07..08 listed for sequencing visibility)

| FR | Statement format | Subjective adjectives | Vague quantifiers | Implementation leakage | ACs |
|---|---|---|---|---|---|
| FR-01 | `A Maintainer can remove…` ✓ | none | none — counts named (5 icons; ≥1.57 MB / ≤2.27 MB) | none | 5 |
| FR-02 | `A Sceptic … can read … and find…` ✓ | none | none — names SIL OFL 1.1, font family, project URL | none | 4 |
| FR-03 | `A Maintainer can rely on CI to fail fast…` ✓ | "fail fast" is a CI semantic, not a speed claim | none — names the two literals (`#importsnav li`, placement count `54/54`) | none — speaks of "checksum manifest, content-snapshot, or equivalent" (capability, not specific tool) | 5 |
| FR-04 | `A primary user (Riya) can cancel … kill … quit…` ✓ | none | none — three exit paths × 5 trials = 15 named | none — names `// todo:` sites in `main.js` as scope, but that is **brownfield code anchoring**, not implementation prescription | 5 |
| FR-05 | `A Maintainer … can rely on `index.d.ts`…` ✓ | none | none — names two missing methods (`transformParse`, `polygonifyPath`) | none | 3 |
| FR-06 | `A reviewer of any MVP-phase PR can verify…` ✓ | none | none — six AC sub-rules | none | 6 |
| FR-07 | `A primary user can run nests with more than one background renderer…` ✓ (Phase 2, sequencing-only) | none | none ("more than one") | none | n/a — Hard dependency named (FR-04 first) |
| FR-08 | `A community contributor can re-skin…` ✓ (Phase 2, sequencing-only) | none | none | none | n/a |

**Format Violations:** 0
**Subjective Adjectives:** 0
**Vague Quantifiers:** 0 (all "multiple"/"some" instances scanned at lines 134, 386, 472 are either persona narrative or the literal feature title "Multiple background renderers")
**Implementation Leakage:** 0 (file paths under `main.js`, `index.d.ts`, `tests/assets/` etc. are **brownfield anchoring** — naming the existing code surface to be modified is required for a brownfield PRD, not leakage)
**FR Violations Total:** 0

### Non-Functional Requirements

**Total NFRs Analyzed:** 8 (NFR-01..08)

| NFR | Goal stated | Measurement method | Numeric target | Notes |
|---|---|---|---|---|
| NFR-01 Performance / Regression Freedom | ✓ | `npm test` per-run wall-clock | ±20% of pre-MVP rolling 5-run mean | **Baseline-capture step is referenced but not yet executed** — see §John's Open Questions, item 1 |
| NFR-02 Reliability / Worker Shutdown | ✓ | Manual repro × 5 runs × 3 paths | 15/15 pass; 0 listener-cap warnings | Strong |
| NFR-03 Maintainability / Anti-Pattern Preservation | ✓ | PR-template checklist | 0 violations merged | Strong; explicitly rejects new lint rule, citing `project-context.md` §11 |
| NFR-04 Reliability / Native Build Portability | ✓ | GitHub Actions matrix (4 cells) | 4/4 green per release tag | macOS exemption explicitly named |
| NFR-05 Maintainability / Test-Fixture Integrity Gate | ✓ | Per-release commit sampling | 0 fixture-only commits without manifest update or red CI | Strong |
| NFR-06 Security / Posture Preservation | ✓ | Grep at MVP sign-off | 3 BrowserWindow constructors, all with `nodeIntegration: true`, `contextIsolation: false`, `enableRemoteModule: true`, `nativeWindowOpen: true` | Strong; rationale (Phase-3 dep) clearly stated |
| NFR-07 Compatibility / Settings Round-Trip | ✓ | Manual test with 1.5.6 settings.json | Silent migration on first run | Strong |
| NFR-08 Documentation Freshness | ✓ | Per-release audit | GPC update in same PR or follow-up within 7 days | Strong |

**Missing Metrics:** 0
**Incomplete Template:** 0
**Missing Context:** 0
**NFR Violations Total:** 0

### Overall Assessment

**Total Requirements:** 16 (8 FR + 8 NFR)
**Total Violations:** 0
**Severity:** Pass

**Recommendation:** Requirements demonstrate good measurability. NFR-01 carries one **CONCERN** — the ±20% bound depends on a 5-run baseline that is referenced but has not yet been captured. This is tracked as a finding under §John's Open Questions and resolved in step v-13.

## Traceability Validation

### Chain Validation

**Executive Summary → Success Criteria:** Intact. Vision is "post-DEE-44-planning maintenance + modernisation slice" addressing 7 carry-over concerns; Success Criteria splits into User Success (happy-path preservation), Business Success (community trust, green CI, single-epic scope, asset-licence paperwork), Technical Success (bg-worker shutdown, type surface, fixture integrity, asset shrink), and a Measurable Outcomes table that quantifies each.

**Success Criteria → User Journeys:** Intact. Four named personas (Riya happy-path, Riya interrupted-nest, Marco maintainer, Sam sceptic) collectively cover all four success-criteria buckets:
- User Success → Riya happy-path
- Technical Success (shutdown) → Riya interrupted-nest
- Business Success (regression freedom) → Marco fixture-drift
- Business Success (licence paperwork) → Sam supply-chain

**User Journeys → Functional Requirements:** Intact. PRD §Journey Requirements Summary (lines 173–180) explicitly maps each journey to its drivers; cross-validated below.

**Scope → FR Alignment:** Intact. PRD §Carry-Over Concern Disposition table (lines 277–286) explicitly maps each of the 7 GPC §18 carry-over concerns to a Disposition, Phase and Drives column. None silently dropped.

### Traceability Matrix (FRs)

| FR | Source(s) | Phase | Status |
|---|---|---|---|
| FR-01 Asset hygiene | GPC §18.1 (carry-over #1) → Measurable Outcome "Asset weight ≥ 1.57 MB removed" | MVP | Traced |
| FR-02 SIL OFL provenance | GPC §18.2 (carry-over #2) → Sam-Sceptic journey → Business Success "Asset-licence paperwork is complete" | MVP | Traced |
| FR-03 Test-fixture integrity | GPC §18.3 (carry-over #3) → Marco-Maintainer journey → Business Success "Zero regressions" | MVP | Traced |
| FR-04 Bg-worker shutdown | GPC §18.4 (carry-over #4) → Riya-interrupted journey → Technical Success bullet | MVP | Traced |
| FR-05 SvgParserInstance type gap | GPC §18.5 (carry-over #5) → Technical Success "Type coverage on UI seam" | MVP | Traced |
| FR-06 Anti-pattern preservation | Cross-cutting; sources `project-context.md` §16 anti-pattern list (16 items) → Technical Success "anti-pattern list holds" | MVP | Traced (cross-cutting) |
| FR-07 >1 bg renderer | GPC §3 worker-count cap → Product Scope Growth #6; **hard dep on FR-04** | Growth (Phase 2) | Traced + hard-dep declared; no MVP AC required |
| FR-08 Re-skinnable icons | GPC §18.7 (carry-over #7) → Product Scope Growth #7 | Growth (Phase 2) | Traced; no MVP AC required |

### Traceability Matrix (NFRs)

| NFR | Source / Why | Status |
|---|---|---|
| NFR-01 Performance / Regression | Riya-happy-path → Measurable Outcome "Regression freedom" | Traced |
| NFR-02 Reliability / Worker shutdown | FR-04 (capability ↔ NFR pair) | Traced |
| NFR-03 Maintainability / Anti-patterns | FR-06 (capability ↔ NFR pair); GPC §16 | Traced |
| NFR-04 Reliability / Native build matrix | Measurable Outcome "Native build portability"; GPC §2 compatibility constraints | Traced |
| NFR-05 Maintainability / Fixture gate | FR-03 (capability ↔ NFR pair) | Traced |
| NFR-06 Security / Posture preservation | GPC §18.6 (carry-over #6, intentionally **out of scope as posture**); ADR-004 | Traced |
| NFR-07 Compatibility / Settings round-trip | User Success "1.5.x users upgrade in place"; GPC §6 read-config rewrite | Traced |
| NFR-08 Documentation freshness | Measurable Outcome "Documentation freshness ≤ 7 days"; GPC §1, §16 | Traced |

### Carry-Over Concern Coverage (custom — brownfield PRD)

| GPC §18 # | Concern | PRD disposition | Status |
|---|---|---|---|
| 1 | Asset cleanup | FR-01 (MVP) | Covered |
| 2 | Asset-licence paperwork | FR-02 (MVP) | Covered |
| 3 | Test-fixture integrity | FR-03 (MVP) | Covered |
| 4 | Bg-worker shutdown | FR-04 (MVP) | Covered |
| 5 | `SvgParserInstance` type gap | FR-05 (MVP) | Covered |
| 6 | Permissive renderer (ADR-004) | NFR-06 (preservation rule, intentional) | Covered (out-of-scope decision is named, not silent) |
| 7 | Re-skin pipeline | FR-08 (Growth) | Covered (deferred, named-for-later) |

**No GPC §18 concern is silently deferred or dropped.**

### Orphan Elements

**Orphan Functional Requirements:** 0
**Unsupported Success Criteria:** 0
**User Journeys Without FRs / NFRs:** 0 (Riya-happy-path correctly maps to no new FRs and to NFR-01 + NFR-07; the PRD names this explicitly to prevent the journey from being read as orphan)

**Total Traceability Issues:** 0
**Severity:** Pass

**Recommendation:** Traceability chain is fully intact. The PRD's brownfield discipline is visible — instead of a generic "vision → FR" tree, it threads the GPC §18 carry-over concerns through Success Criteria → Journeys → FR/NFR pairs and explicitly closes each one (covered or deferred-with-disposition). This is the correct shape for a brownfield maintenance PRD.

## Implementation Leakage Validation

### Greenfield-style leakage scan (FRs and NFRs)

| Category | Generic terms scanned | Hits in FR/NFR statements |
|---|---|---|
| Frontend frameworks (React, Vue, Angular, Svelte, Solid, Next.js, Nuxt) | yes | 0 |
| Backend frameworks (Express, Django, Rails, Spring, Laravel, FastAPI) | yes | 0 |
| Databases (PostgreSQL, MySQL, MongoDB, Redis, DynamoDB, Cassandra) | yes | 0 |
| Cloud platforms (AWS, GCP, Azure, Cloudflare, Vercel, Netlify) | yes | 0 |
| Infrastructure (Docker, Kubernetes, Terraform, Ansible) | yes | 0 |
| Generic libraries (Redux, Zustand, axios, fetch, lodash, jQuery) | yes | 0 |

### Brownfield-context anchoring (acceptable)

The PRD references the *existing* stack — Electron, Node, TypeScript, Playwright, electron-builder, Ractive, `@deepnest/calculate-nfp`, `@deepnest/svg-preprocessor` — and the existing in-tree code (`main.js`, `main/deepnest.js`, `main/ui/types/index.ts`, `index.d.ts`, `tests/assets/`, `tests/index.spec.ts`).

These references are **brownfield anchoring, not implementation leakage**:

- The Project Classification table and Domain-Specific Requirements section state the existing stack as **constraint** ("Electron ABI fragility", "no macOS CI runner", "permissive renderer is intentional"), not as prescription.
- The FR statements themselves stay capability-shaped (`A Maintainer can…`, `A primary user can…`); file paths appear in **Acceptance Criteria** to anchor the concrete code surface to be modified, which is the correct depth for an existing-code modification PRD. AC-04.1 ("the two `// todo:` shutdown sites in `main.js`") names the literal in-scope code; that is *what* the work is, not *how* to do it.
- The NFR-04 native-build matrix metric reads as "succeeds on every cell of the Linux + Windows × Node 20/22 CI matrix" — that is the existing CI contract being preserved, not a new build-stack prescription.

### Summary

**Total Implementation Leakage Violations:** 0
**Severity:** Pass

**Recommendation:** The PRD passes the implementation-leakage check. Brownfield anchoring (existing stack named as constraint; existing code paths named in ACs to scope the change) is correctly distinguished from leakage (prescribing a new stack or library). Architecture decisions (CA / DEE-49) remain free.

## Domain Compliance Validation

**Domain (PRD frontmatter):** `manufacturing-cam` (`complexity: high`)

**CSV match:** No exact row in `data/domain-complexity.csv`. Closest comparable rows:
- `process_control` (high) — covers PLC / SCADA / DCS / HMI / OT cyberphysical control systems
- `building_automation` (high) — covers BMS / HVAC / fire / life-safety
- `general` (low) — fallback for standard software

**Disposition:** Neither regulated row applies. `deepnest-next` is a **desktop CAM-preparation tool** for makers / small fab shops — it produces nested SVG output that downstream CAM toolchains (LightBurn, gcode senders, plotter drivers) consume. It does not control any machinery, does not handle PII / PHI / PCI data, does not have a regulated certification path (no DO-178C / ISO 26262 / IEC 62443 / NERC CIP / WCAG-AA-as-a-regulatory-trigger), and does not meet any of the high-complexity domain triggers in the CSV.

The `complexity: high` flag in the PRD frontmatter is correctly an **engineering-complexity** claim (geometry algorithms, native NFP add-on, GA convergence, multi-renderer IPC, native ABI fragility) — not a regulatory-complexity claim. The PRD does not over-claim regulatory compliance.

### What "domain compliance" actually means here (and is it covered?)

The binding compliance surface for this brownfield slice is **OSS supply-chain / licence**, not industry regulation. The PRD addresses it explicitly in §Domain-Specific Requirements (lines 184–213):

| Requirement | Status | Notes |
|---|---|---|
| MIT licence preservation across the fork chain | Covered | §Compliance & Provenance, line 188 |
| `LICENSES.md` records every third-party derivative | **Open gap → driven by FR-02** | The known SIL OFL gap for `tests/assets/*.svg`. Audit completeness covered under §John's Open Questions, item 2 |
| No telemetry as a product promise (not just a default) | Covered | line 189; reinforced by NFR-06 (no new outbound HTTPS) |
| Existing outbound HTTPS surface (DXF converter, notification poll, OAuth) auditable | Covered | line 190; cross-referenced to GPC §14 |
| Permissive renderer is a **named, intentional** posture, not a silent compliance debt | Covered | NFR-06 + GPC §18.6, ADR-004 |
| Crash reporter `uploadToServer: false` invariant | Covered | NFR-06, GPC §8.6 |
| Native build / ABI fragility documented as a constraint | Covered | §Technical Constraints, line 194 |
| `÷25.4` / `×25.4` mm/inch double-conversion guard preserved | Covered | §Technical Constraints, line 197; AC-06.6 |
| Downstream toolchain SVG-export contract preserved | Covered | §Integration Requirements, line 202 |

### Required Special Sections (CSV rule applied as best-fit)

Treating `manufacturing-cam` under the closest-comparable row only as a sanity check (not as a binding rule, since the actual project sits outside the regulated band):

| Section (process_control row) | Required for deepnest-next? | Present? |
|---|---|---|
| Functional safety | No — no machinery control loop | N/A |
| OT cybersecurity | No — no OT network attached | N/A |
| Process requirements | No — no real-time process | N/A |
| Engineering authority / PE | No — community fork, not credentialed engineering work | N/A |

### Summary

**Required Sections Present:** 9/9 of what's *actually* binding (OSS-supply-chain / licence / no-telemetry / native-build / mm-inch invariant / downstream-export contract / permissive-renderer-posture / crash-reporter / outbound-network surface).
**Compliance Gaps:** 0 in regulatory sense; 1 known **work item gap** — `tests/assets/*.svg` SIL OFL paperwork — already named as FR-02 with binding ACs.

**Severity:** Pass

**Recommendation:** Domain coverage is correct and not over-claimed. The PRD does not invoke regulatory compliance frameworks that don't apply, and it does name the actual compliance surface (OSS supply-chain) with a binding FR.

## Project-Type Compliance Validation

**Project Type (PRD frontmatter):** `desktop-app`

CSV row (`project-types.csv`, line 9):
- Required sections: `platform_support`, `system_integration`, `update_strategy`, `offline_capabilities`
- Skip sections: `web_seo`, `mobile_features`

### Required Sections

| Required section | Mapped to PRD subsection | Status |
|---|---|---|
| `platform_support` | §Desktop-App Specific Requirements → Platform Support (line 224) | Present — Windows / macOS / Linux table with distribution, signing, CI cells |
| `system_integration` | §Desktop-App Specific Requirements → System Integration (line 235) | Present — `setWindowOpenHandler` policy, `crashReporter.uploadToServer: false` flag rule, native add-on integration, scope guards (no tray, no shell-extension) |
| `update_strategy` | §Desktop-App Specific Requirements → Update Strategy (line 242) | Present — explicitly "no auto-update", settings round-trip preserved, native rebuild on install |
| `offline_capabilities` | §Desktop-App Specific Requirements → Offline Capabilities (line 248) | Present — default-offline; per-feature offline behaviour for the 3 outbound endpoints |

### Excluded Sections (must NOT be present)

| Excluded section | Status |
|---|---|
| `web_seo` | Absent — only mention is the deliberate exclusion note at PRD line 217 ("Skip web SEO and mobile-feature sections — not relevant"). No SEO requirements anywhere. |
| `mobile_features` | Absent — no mobile / iOS / Android / push / App Store sections. PRD line 221 explicitly states "There is no web build, no PWA, no mobile build." |

### Compliance Summary

**Required Sections:** 4/4 present
**Excluded Sections Present:** 0 (correct — should be 0)
**Compliance Score:** 100%

**Severity:** Pass

**Recommendation:** All required `desktop_app` sections are present and well-scoped to deepnest-next's actual posture (no auto-update, default-offline, three platforms with explicit signing matrix, ABI-fragile native modules called out as a gate). No excluded sections appear. The §Implementation Considerations sub-block (line 256) goes further than the CSV's minimum, naming `EventEmitter.defaultMaxListeners = 30`, the `winCount = 1` cap and FR-04 sequencing, the `npm run lint` non-existence, and the single-topology tsconfig — these are exactly the things the architect (CA / DEE-49) needs to know.

## SMART Requirements Validation

**Total Functional Requirements:** 8 (FR-01..06 in MVP; FR-07..08 in Growth, sequencing-only)

### Scoring Table

Legend: 1=Poor, 3=Acceptable, 5=Excellent. Flag = `✗` if any category < 3, `–` otherwise.

| FR # | Specific | Measurable | Attainable | Relevant | Traceable | Average | Flag |
|---|---|---|---|---|---|---|---|
| FR-01 Asset hygiene | 5 | 5 | 5 | 5 | 5 | 5.0 | – |
| FR-02 SIL OFL provenance | 5 | 4 | 5 | 5 | 5 | 4.8 | – |
| FR-03 Test-fixture integrity | 5 | 5 | 4 | 5 | 5 | 4.8 | – |
| FR-04 Bg-worker shutdown | 5 | 5 | 4 | 5 | 5 | 4.8 | – |
| FR-05 SvgParserInstance type gap | 5 | 5 | 5 | 4 | 5 | 4.8 | – |
| FR-06 Anti-pattern preservation | 5 | 5 | 5 | 5 | 5 | 5.0 | – |
| FR-07 >1 bg renderer (Growth) | 5 | 4 | 4 | 4 | 5 | 4.4 | – |
| FR-08 Re-skinnable icons (Growth) | 4 | 3 | 5 | 3 | 5 | 4.0 | – |

### Scoring Summary

- **All scores ≥ 3:** 100% (8/8)
- **All scores ≥ 4:** 87.5% (7/8) — FR-08 falls to 3 in `Measurable` and `Relevant` because it is named-for-later (Phase 2 / Growth, no MVP AC by design); this is correct phase-appropriate framing, not a defect.
- **Overall Average Score:** 4.7 / 5.0

### Score Rationale (per FR)

- **FR-01 Asset hygiene** — names exact assets (`auth0logo.svg`, `background.png`, `logo.svg`, `progress.svg`, `stop.svg` + Lato kit) and a quantitative target (≥1.57 MB removed).
- **FR-02 SIL OFL provenance** — Specific (font family, licence URL, file scope), Measurable docked one point because *audit completeness* relies on John's open question item 2 (covered in §John's Open Questions).
- **FR-03 Fixture integrity** — Attainable docked one for the false-positive risk acknowledged in §Risk Mitigation, mitigated by the explicit re-derivation procedure in AC-03.4.
- **FR-04 Bg-worker shutdown** — Attainable docked one for concurrency complexity (multi-renderer + IPC + cache lifecycle), but mitigated by NFR-02's 15/15 trial gate and `winCount = 1` invariant.
- **FR-05 Type gap** — Relevant docked one because the change is invisible to end-users; correctly named in Technical Success and Marco-Maintainer journey.
- **FR-06 Anti-pattern preservation** — perfect across all five SMART axes (six concrete ACs anchored in GPC §16).
- **FR-07 / FR-08** — Growth-phase, sequencing-only entries. Correctly sized: explicit hard-dep on FR-04 (for FR-07) and explicit "no MVP impact" rider (both). Slightly lower scores reflect their Growth-phase status, not a defect.

### Improvement Suggestions

None blocking. FR-08 is the only sub-4.5 entry; before it is promoted from Growth to MVP it should re-score with a script-name and a measurable AC ("re-skin completes from `icon-source.svg` in N commands without out-of-tree dependencies").

### Overall Assessment

**Flagged FRs:** 0 (zero `✗`)
**Severity:** Pass

**Recommendation:** Functional Requirements demonstrate strong SMART quality across the board. No FR is below the acceptable bar, and the two Growth-phase entries are correctly framed as sequencing-visibility entries, not as MVP-binding requirements.

## Holistic Quality Assessment

### Document Flow & Coherence

**Assessment:** Good (4/5).

**Strengths:**
- The vision-to-FR thread is unbroken: Executive Summary → Project Classification → Success Criteria → Journeys → Domain → Project-Type → Phased Scoping → FR → NFR → UX-Scope-decision → Polish → References. A reviewer can read top-to-bottom without backtracking.
- Brownfield-specific touches: §Carry-Over Concern Disposition table forces every GPC §18 concern to a binding row; §UX Scope contains the explicit run/skip CU recommendation rather than burying it; §References & Handoff lists open questions for VP / CA / CE so each downstream skill knows its inputs.
- Persona narrative is restrained (4 personas, each driving a specific FR/NFR pair) — does not bloat into a journeys-of-the-week catalogue.

**Areas for Improvement:**
- The Polish section (§lines 481–486) is admin-meta and could fold into the frontmatter / a release note. It does not weaken the document but is the lowest-information-density section.
- Two sub-headers inside §Functional Requirements (`Asset Hygiene & Provenance`, `Background-Worker Stability`, `Type-System Coverage`, `Process Hygiene`) are H4 group headers under H3 FR-IDs — readable but slightly mixed depth. Optional cleanup, not a defect.

### Dual Audience Effectiveness

**For Humans:**
- Executive-friendly: Strong. Executive Summary plus the §What Makes This Special bulleted list deliver vision in under 200 words. Project Classification table is glanceable.
- Developer clarity: Strong. FRs name file paths and exact code surfaces; ACs are testable and bounded; anti-pattern preservation (FR-06) folds in the GPC §16 list by reference.
- Designer clarity: Adequate (and intentionally so). §UX Scope explicitly recommends SKIP CU because there is no new UI; the rationale is named, and reversal triggers are listed.
- Stakeholder decision-making: Strong. §Project Scoping & Phased Development plus §Carry-Over Concern Disposition give a stakeholder a one-table view of what ships now, what ships later, and what is intentionally out of scope.

**For LLMs:**
- Machine-readable structure: Strong. 13 L2 headers; consistent FR-NN / NFR-NN identifiers; tables use header rows; no orphan free-form prose between sections.
- UX readiness: N/A by deliberate scope (CU skipped).
- Architecture readiness: Strong. Per-FR file-path anchoring, hard-dependency declarations (FR-04 → FR-07), sequencing notes (`winCount = 1` invariant), and ADR-cross-references (ADR-004, ADR-005, ADR-006) give Winston unambiguous inputs.
- Epic/Story readiness: Strong. CE can land one epic per FR (FR-01..06 → 6 epics) per the §References & Handoff Open-Question item 5; AC counts (3..6 per FR) match the recommended 1-3-stories-per-epic ratio.

**Dual Audience Score:** 5/5

### BMAD PRD Principles Compliance

| Principle | Status | Notes |
|---|---|---|
| Information Density | Met | 0 filler/wordy/redundant matches across 525 lines (step v-3) |
| Measurability | Met | All 8 FRs have ACs, all 8 NFRs have Goal + Measurement (step v-5) |
| Traceability | Met | Every FR + NFR traces to a journey, success-criterion, or GPC §18 concern (step v-6) |
| Domain Awareness | Met | Domain framing accurate (manufacturing-CAM-prep, OSS-supply-chain compliance), no over-claiming (step v-8) |
| Zero Anti-Patterns | Met | No subjective adjectives, no vague quantifiers, no implementation leakage (steps v-3, v-5, v-7) |
| Dual Audience | Met | Both human-readable (executive flow, persona narrative) and LLM-consumable (table-heavy, ID-anchored, cross-reffed) |
| Markdown Format | Met | Consistent ## L2 headers, ### L3 NFR/FR headers, fenced code, tables with header rows; no broken links observed |

**Principles Met:** 7/7

### Overall Quality Rating

**Rating:** 5/5 — Excellent.

The PRD is exemplary for a brownfield maintenance slice. It does the unusual-but-correct thing of *not* inventing FRs that don't exist (existing happy-path is preserved as NFR-01, not invented as a new FR), it makes the run/skip decision for CU in the document itself rather than deferring it, it includes a binding-disposition table for every documented carry-over concern, and it carries forward the GPC §16 anti-pattern list by reference rather than re-stating it. Information density is high, traceability is clean, and the open questions for VP/CA/CE are explicitly listed.

### Top 3 Improvements

These are **enhancements**, not blockers, and are flagged for awareness:

1. **Capture the NFR-01 baseline now.** The ±20% performance bound depends on a 5-run baseline that the PRD references but does not yet anchor to a specific number. VP captures or schedules this in §John's Open Questions below; doing it on a CI runner at PRD sign-off (rather than later, on a different machine) prevents apples-to-oranges comparisons. **Outcome under this VP run: see §John's Open Questions item 1.**

2. **Verify FR-02's licence-audit scope is the only gap.** FR-02 names `tests/assets/*.svg` SIL OFL as the open paperwork item. A grep over the rest of the tree for un-attributed third-party assets lets us either (a) confirm FR-02's scope is complete or (b) expand it before architecture work starts. **Outcome under this VP run: see §John's Open Questions item 2.**

3. **Polish section can fold into a release note or be removed.** §Polish (lines 481–486) is admin-meta and not load-bearing. Optional — does not block sign-off; flagged as a cosmetic future-edit candidate.

### Summary

**This PRD is:** an exemplary brownfield-maintenance PRD that closes 7 documented carry-over concerns with binding dispositions, threads each FR/NFR back to the GPC, and makes the CU run/skip decision explicit instead of deferring it.

**To make it great:** Focus on the top 3 improvements above — items 1 and 2 are addressed during this VP run; item 3 is cosmetic.

## Completeness Validation

### Template Completeness

**Template Variables Found:** 0

The grep for `{var}` / `{{var}}` / `[placeholder]` / `LOREM` / `IPSUM` / generic `{ALL_CAPS}` markers returns no matches. Hits for the literal string `TODO` / `// todo:` (lines 90, 116, 147, 148, 209, 258, 282, 355) all reference the **two existing `// todo:` shutdown sites in `main.js`** as bound by FR-04 — these are factual brownfield-code references, not unfilled template variables.

### Content Completeness by Section

| Section | Required content | Status |
|---|---|---|
| Executive Summary | Vision + differentiator + target users | Complete (lines 50–60) |
| Project Classification | Project type / domain / complexity / context | Complete (lines 62–69, 5-row table) |
| Success Criteria | User / Business / Technical Success + Measurable Outcomes table | Complete (lines 72–106) |
| Product Scope | MVP / Growth / Vision split | Complete (lines 108–129) |
| User Journeys | Personas + flows + driving requirements | Complete (4 personas, lines 132–180; explicit Journey-Requirement Summary table) |
| Domain-Specific Requirements | Compliance / technical / integration / risk | Complete (lines 184–213) |
| Desktop-App Specific Requirements | platform_support, system_integration, update_strategy, offline_capabilities | Complete (lines 217–262) |
| Project Scoping & Phased Development | MVP / Growth / Vision dispositions, carry-over coverage | Complete (lines 265–316) |
| Functional Requirements | FR statements + ACs | Complete (8 FRs, lines 320–399) |
| Non-Functional Requirements | NFR Goal + Measurement | Complete (8 NFRs, lines 405–450) |
| UX Scope | Run/Skip CU decision + rationale + reversal triggers | Complete (lines 454–477) |
| Polish | Reduction / consolidation log | Complete (lines 481–486) |
| References & Handoff | Source-of-truth pointers + chain-status table + open Qs | Complete (lines 489–524) |

### Section-Specific Completeness

- **Success Criteria measurability:** All — every Measurable Outcome table row has a measurement method and target.
- **User Journeys coverage:** Yes — primary user (Riya happy-path), edge user (Riya interrupted), maintainer (Marco), security-conscious adopter (Sam) all covered. Each driving FR is named in the Journey-Requirement Summary table.
- **FRs cover MVP scope:** Yes — every MVP-flagged carry-over concern (#1–5 from GPC §18) maps to FR-01..05; cross-cutting hygiene maps to FR-06; out-of-scope concerns (#6 permissive renderer; #7 re-skin pipeline) are explicitly named (NFR-06 and FR-08-Growth respectively).
- **NFRs have specific criteria:** All — every NFR-01..08 has a Goal line and a Measurement line with quantified target / counted trials / named tools or methods.

### Frontmatter Completeness

| Field | Present | Notes |
|---|---|---|
| `stepsCompleted` | Yes | 12/12 workflow steps tracked |
| `classification` | Yes | `projectType`, `domain`, `complexity`, `projectContext` populated |
| `inputDocuments` | Yes | 9 entries (project-context.md + 8 docs/) |
| `date` | Yes | 2026-04-26 |
| `releaseMode` | Yes | `phased` (consistent with §Project Scoping) |
| `documentCounts` | Yes | briefCount/researchCount/brainstormingCount/projectDocsCount populated |

**Frontmatter Completeness:** 6/4 required (and bonus fields present, all consistent).

### Completeness Summary

**Overall Completeness:** 100% (13/13 sections complete)
**Critical Gaps:** 0
**Minor Gaps:** 0
**Severity:** Pass

**Recommendation:** PRD is complete with all required sections and content present. No template artefacts remain.

## John's Open Questions (from PRD §References & Handoff, items 1–2)

### Open Q1 — NFR-01 baseline capture

**PRD claim:** NFR-01's ±20% bound references "the rolling 5-run mean of the pre-MVP baseline of `npm test` on a CI runner captured at PRD sign-off." The PRD asks VP to validate that the procedure exists and is recorded.

**Procedure exists in the PRD?** Yes. NFR-01 lines 405–411 specify: instrument `npm test` per-test wall-clock duration, record 5 runs on the same CI hardware, take rolling mean, gate per-merge runs at ±20% of that mean. The procedure is fully named.

**Has the baseline number itself been captured yet?** No.

**Did VP capture it during this run?** No — and explicitly so. Constraints on the Paperclip worker:
- `libboost-dev` is not installed (`dpkg -l libboost-dev` returns `Kein Paket gefunden`); the native module `@deepnest/calculate-nfp` cannot rebuild without it (`docs/development-guide.md` requires `apt-get install -yq libboost-dev` on Linux).
- Without `npm install` succeeding, `npm test` cannot run at all.
- Even with prerequisites met, 5 Playwright Electron E2E runs (each is a multi-minute GA-convergence cycle) would consume the heartbeat budget; the issue description's contingency clause explicitly authorises VP to defer this if the run is not cheap.

**Disposition:** **CONCERNS — schedule, do not block**.

**Recommendation:** The right place to anchor this baseline is the **first green CI run on the integration branch** (existing GitHub Actions matrix Linux + Windows × Node 20/22) **immediately after this VP merges and before the first MVP epic lands**. Concretely:

- **Owner:** TEA (Murat) — responsible for NFR-tracking via `bmad-testarch-nfr` (`NR`) workflow downstream. CTO sign-off acceptable in the interim.
- **Action (single PR):**
  1. Add a tiny shim that captures `tests/index.spec.ts` test-duration to a JSON file in `playwright-report/`.
  2. Run the Linux × Node 22 cell of the CI matrix 5 times (rerun-on-success, no code changes between runs) — these are the canonical "pre-MVP" durations.
  3. Commit the rolling 5-run mean and standard deviation as a literal in `_bmad-output/planning-artifacts/nfr01-baseline.json` (or equivalent).
  4. Update NFR-01 to reference that file as the authoritative baseline.
- **When:** After Winston merges this VP report, before DEE-49 (CA) opens — i.e., as a sub-task of the integration-branch readiness check, not blocking VP itself.
- **Why not now:** Doing it on this Paperclip worker would produce a number on the wrong hardware, inviting apples-to-oranges comparisons later. Better deferred to the actual CI runner where every future merge will be measured.

### Open Q2 — `LICENSES.md` audit completeness

**PRD claim:** FR-02 names `tests/assets/*.svg` (SIL OFL) as the open paperwork gap. The PRD asks VP to grep the rest of the tree to confirm that's the *only* gap.

**Audit method:** VP listed every committed third-party-looking asset/library, read each file's header for licence/copyright text, and cross-referenced against the existing 13-line `LICENSES.md`.

**Audit finding:** **FR-02's scope is too narrow.** `tests/assets/*.svg` is one of *several* un-attributed third-party items. The known gap is the tip of a structural problem with `LICENSES.md`. **CONCERNS — re-scope FR-02 before CA opens.**

#### Gaps found beyond `tests/assets/*.svg`

**1. SIL OFL — Lato webfont kit (`main/font/`)**

The Lato webfonts (Font Squirrel-generated kit) are SIL Open Font License 1.1 by Łukasz Dziedzic. None of these files are enumerated in `LICENSES.md`:

| File / pattern | Notes |
|---|---|
| `main/font/lato-hai-webfont.{eot,ttf,svg,woff}` (4 files) | Lato Hairline; `stylesheet.css` declares `@font-face family="latohairline"` |
| `main/font/lato-lig-webfont.{eot,ttf,svg,woff}` (4 files) | Lato Light; `@font-face family="latolight"` |
| `main/font/fonts/LatoLatin-{Bold,BoldItalic,Light,Regular,…}.{eot,ttf,woff,woff2}` (16+ files) | Lato Latin subset; `latolatinfonts.css` declares two `@font-face` families (`LatoLatinWeb`, `LatoLatinWebLight`) |
| `main/font/latolatinfonts.css`, `main/font/stylesheet.css` | Font Squirrel-generated `@font-face` stylesheets |
| `main/font/specimen_files/easytabs.js` | jQuery easyTabs (Steve Schwartz, GPL/MIT dual) |
| `main/font/specimen_files/specimen_stylesheet.css` | Font Squirrel specimen sheet (embeds Eric Meyer Public-Domain CSS Reset) |
| `main/font/specimen_files/grid_12-825-55-15.css` | grid system, origin TBD |
| `main/font/lato-{hai,lig}-demo.html` | Font Squirrel demo pages |
| `main/font/generator_config.txt` | Font Squirrel generator metadata |

GPC §18.1 already notes some of the Lato kit (`LatoLatin-BoldItalic.*`, demo HTML, `.eot`/`.ttf` for live weights) is **dead weight** that FR-01 will *remove*. The remaining live Lato files (`LatoLatin-{Bold,Regular,Light}.{woff,woff2}`, `lato-hai-webfont.*`, `lato-lig-webfont.*`) **stay** in the tree and need SIL OFL attribution.

**2. Vendored third-party libraries with no LICENSES.md entry**

| File | Likely origin / licence | LICENSES.md entry? |
|---|---|---|
| `main/util/ractive.js` | Ractive.js v0.8.1 (header: "Released under the MIT License", twitter @RactiveJS) | Missing |
| `main/util/pathsegpolyfill.js` | `progers/pathseg` SVGPathSeg API polyfill (typically MIT) | Missing |
| `main/util/parallel.js` | `parallel.js` / paralleljs (BSD/MIT — header lacks attribution; needs upstream verification) | Missing |
| `main/util/simplify.js` | `mourner/simplify-js` (header: "(c) 2013, Vladimir Agafonkin … modified by Jack Qiao"; upstream is BSD-2-Clause) | Missing |
| `main/util/svgpanzoom.js` | `bumbu/svg-pan-zoom` v3.6.2 (BSD-2-Clause) | Missing |
| `main/util/HullPolygon.ts` | derived from `d3-polygon` v1.0.2 (BSD-3-Clause) | Missing — derivative not attributed |
| `main/util/_unused/hull.js` | "Graham's Scan Convex Hull" by Brian Barnett (likely MIT) | Missing |
| `main/util/_unused/json.js` | Douglas Crockford `json2.js` (Public Domain) | Missing |
| `main/util/_unused/placementworker.js` | jsClipper-derived placement worker; origin unclear | Missing |
| `main/img/auth0logo.svg` | Auth0 brand logo (trademark; courtesy use) | Missing — **FR-01 removes this; resolves naturally** |
| `main/img/spin.svg` | Generic UIL spinner (animated SVG) — origin unclear | Missing |

**3. `LICENSES.md` data-hygiene issues** (independent of additions)

| Issue | Line | Notes |
|---|---|---|
| Path typo | 9 | `/main/uitil/filesaver.js` → should be `/main/util/_unused/filesaver.js` |
| Wrong path | 11 | `/main/util/clipper` → file is `/main/util/clipper.js` |
| Wrong path | 12 | `/main/util/clippernode.js` → file is `/main/util/_unused/clippernode.js` |
| Stale entry | 6 | `/main/svgnest.js` does not exist in the current tree (verified `ls main/svgnest.js` → not found) |
| `?` placeholder | 6, 7, 8 | `svgnest.js`, `svgparser.js`, `deepnest.js` show `?` for copyright. `svgparser.js` and `deepnest.js` exist; their attribution is genuinely missing. |

#### Recommended re-scope of FR-02

**Original FR-02:** "A Sceptic auditing the project's supply chain can read `LICENSES.md` and find a complete record of the SIL OFL provenance of every Google-Fonts-derived SVG under `tests/assets/`."

**Proposed expanded FR-02 (action for John via `bmad-edit-prd`, before CA opens):**

> A Sceptic auditing the project's supply chain can read `LICENSES.md` and find a complete, current record of every committed third-party asset under `main/`, `tests/`, and `helper_scripts/`, with correct file paths, licence identifier (SPDX-style if possible), upstream project URL, and copyright holder.

Concretely the expanded ACs should cover:
1. The known SIL OFL gap for `tests/assets/*.svg` (current AC-02.1, retain).
2. SIL OFL attribution for the Lato webfont kit retained after FR-01 (live `LatoLatin-{Bold,Regular,Light}` weights, plus `lato-hai-webfont.*`, `lato-lig-webfont.*` if these survive a re-evaluation by FR-01's owner).
3. MIT / BSD-2-Clause / BSD-3-Clause / Public-Domain entries for the eight vendored libraries listed in table 2 above.
4. Path corrections and `?`-resolution for the existing five lines (table 3 above).
5. Removal of the stale `/main/svgnest.js` entry.

**Risk of leaving FR-02 narrow:** Sam-the-Sceptic ticks the SIL OFL box, then trips on the next gap (Ractive, simplify, svgpanzoom, Lato kit) and the supply-chain review fails for a reason FR-02 didn't anticipate. The PRD's stated success criterion ("the fork passes its first OSS-supply-chain review") is materially under-specified.

**Disposition:** **CONCERNS — recommend re-edit of PRD via `bmad-edit-prd` before CA (DEE-49) opens.** Alternatively, CA can land first and CE expands FR-02 into a multi-story epic; either is acceptable, but the expansion is mandatory.

**Owner:** John (PM), via `bmad-edit-prd` skill or a CP re-run targeting only §Functional Requirements → FR-02.

## Final Verdict

**Overall status:** **CONCERNS**

**Findings tally:** 0 critical · 1 major · 1 medium · 1 minor.

| Severity | Finding | Owner | Unblock action |
|---|---|---|---|
| Major | FR-02 scope is too narrow — `LICENSES.md` audit reveals SIL OFL gaps beyond `tests/assets/` (the entire Lato kit), plus 8 vendored MIT/BSD libraries with no entry, plus 5 data-hygiene issues in the existing 13-line file | John (PM) | Run `bmad-edit-prd` on `prd.md` §Functional Requirements → FR-02 before CA (DEE-49) opens, **or** instruct CE to expand FR-02 into a multi-story epic |
| Medium | NFR-01 baseline number not yet captured (procedure recorded, but the 5-run mean is not anchored to a specific value) | TEA / CTO | Capture on the first green CI run on integration after this VP merges, before any MVP epic ships. Persist as `_bmad-output/planning-artifacts/nfr01-baseline.json` |
| Minor | §Polish section (lines 481–486) is admin-meta and could fold into release notes | John (PM) | Cosmetic; non-blocking |
| (no critical) | — | — | — |

**Quick results table (per validation step):**

| Step | Subject | Result |
|---|---|---|
| 2 | Format Detection | BMAD Standard (6/6) |
| 3 | Information Density | Pass (0 violations on 525 lines) |
| 4 | Product Brief Coverage | N/A (no brief; brownfield) |
| 5 | Measurability | Pass (8 FRs + 8 NFRs, 0 violations) |
| 6 | Traceability | Pass (0 orphans; carry-over coverage 7/7) |
| 7 | Implementation Leakage | Pass (brownfield anchoring correctly distinguished) |
| 8 | Domain Compliance | Pass (no over-claiming; OSS-supply-chain surface covered) |
| 9 | Project-Type Compliance | 100% (4/4 required, 0 excluded violations) |
| 10 | SMART | Pass (avg 4.7/5; 100% all-categories ≥3, 87.5% ≥4) |
| 11 | Holistic Quality | 5/5 — Excellent |
| 12 | Completeness | Pass (13/13 sections, 0 template artefacts) |

**Strengths:**

- Vision → success criteria → journeys → FR/NFR chain is unbroken; brownfield carry-over coverage is binding-tabled, not narrative.
- Each FR has a measurable acceptance criterion; each NFR has a numeric target with a named measurement method.
- The CU run/skip decision is made *in* the document (with reversal triggers spelled out), not deferred.
- File-path anchoring on FRs (`main.js`, `index.d.ts`, `tests/assets/`, `_bmad-output/project-context.md`) keeps the work concretely scoped without prescribing a stack.
- Anti-pattern preservation (FR-06) folds the GPC §16 list in by reference rather than re-stating it.
- Phase boundaries are explicit: `winCount = 1` invariant in MVP; FR-04 → FR-07 hard dep; ADR-004 explicitly named as Phase-3, with NFR-06 forbidding partial drift in MVP.

**Recommendation for Winston (DEE-49 CA):**

The PRD is ready for architecture work for FR-01, FR-03, FR-04, FR-05, FR-06 and the NFR set as authored. **FR-02 should be re-edited before the architecture for it lands** — the existing AC set is a strict subset of the actual licence-gap surface, and Sam-the-Sceptic's success criterion ("the fork passes its first OSS-supply-chain review") is materially under-specified by the current FR-02. Two acceptable paths:

1. **Recommended:** John runs `bmad-edit-prd` on §FR-02 before CA opens. CA then proceeds against the corrected scope.
2. **Acceptable:** CA opens against the current PRD, then CE expands FR-02 into a multi-story epic (one story per gap class — SIL OFL Lato kit; vendored MIT/BSD libs; data-hygiene fixes). This shifts the cost from PM-edit to epic-breakdown but does not change the work surface.

**Open questions for CA (DEE-49) — beyond what the PRD already lists:**

- (already in PRD §References & Handoff item 3) FR-04 vs. anything that touches `main.js` — sequencing.
- (already in PRD §References & Handoff item 4) `winCount` change rollback path.
- (new from this VP) Architecture for FR-02 (expanded) — does the audit + paperwork live as a single PR, or as a manifest-generation script that emits `LICENSES.md` from per-folder metadata? CA should choose.

**Validation report saved:** `_bmad-output/planning-artifacts/prd-validation-report.md`

