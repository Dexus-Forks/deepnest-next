---
project_name: deepnest-next
user_name: Paperclip
date: 2026-04-26
workflowType: 'sprint-planning'
documentShape: 'sprint-plan'
inputDocuments:
  - _bmad-output/planning-artifacts/prd.md
  - _bmad-output/planning-artifacts/architecture.md
  - _bmad-output/planning-artifacts/epics.md
  - _bmad-output/planning-artifacts/implementation-readiness-report.md
  - _bmad-output/planning-artifacts/nfr01-baseline.json
trackingArtifact: _bmad-output/implementation-artifacts/sprint-status.yaml
sprint_label: MVP-1
sprint_scope: Epics 1–6 (all six MVP epics, 12 stories)
sprint_start_gate: OPEN
sprint_start_gate_signoff: 'CTO — DEE-53'
ir_verdict_inherited: 'CONCERNS (7 PASS / 1 CONCERNS / 1 FAIL across CA §9; both non-PASS items have named, satisfied/in-sprint mitigations)'
named_mitigations_status:
  nfr01_baseline: 'SATISFIED — nfr01-baseline.json captured 2026-04-26T09:54:42Z on ubuntu-22.04 / node-22.x, 5 runs, mean 16746.6 ms, stddev 3066.7 ms (DEE-52)'
  pr_template: 'IN-SPRINT — Epic 6 Story 6.1 ships .github/pull_request_template.md'
generated_by: 'CTO — bmad-sprint-planning, headless mode'
---

# deepnest-next — Sprint Plan (MVP-1)

**Date:** 2026-04-26
**Sprint label:** MVP-1
**Scope:** Epics 1–6 (all six MVP epics, 12 stories)
**CTO sign-off:** Sprint-Start gate **OPEN** (this document)
**Tracking:** `_bmad-output/implementation-artifacts/sprint-status.yaml`

---

## 1. Sprint Goal

Ship the six MVP epics that close FR-01..06 against the deepnest-next brownfield codebase, governed by the architecture overlay (DEE-49), the epic breakdown (DEE-50), and the IR gate (DEE-51), with the NFR-01 wall-clock baseline (DEE-52) as the canonical performance reference for every PR's regression check.

**Definition of Done (sprint-level).**

- All 12 stories reach `done` in `sprint-status.yaml`.
- All six epics' retrospectives are at minimum `optional` (run-or-skip is the team's call per epic; CTO requires retros for any epic that hits CONCERNS or FAIL during execution).
- `npm test` (full Playwright pre-commit + CI) is green on `main` at sprint close.
- `licenses:check` (Epic 2 ship) is in `npm test`'s default path and green.
- `tests/assets/` integrity check (Epic 3 ship) is in `npm test`'s default path and green.
- `.github/pull_request_template.md` (Epic 6 ship) is anchored on `project-context.md` §16 and live for all PRs.
- NFR-01 wall-clock is within ±20% of the baseline `rolling_mean_ms` (16746.6 ms) on the canonical CI cell at sprint close.

---

## 2. Sprint-Start Gate — CTO decision

| Pre-condition (CA §9) | IR-time verdict | State at Sprint-Start (today) | Mitigation source | Status |
|---|---|---|---|---|
| #1 architecture.md present + open questions tracked | PASS | unchanged | — | ✅ PASS |
| #2 ADRs documented (ADR-008, ADR-009) | PASS | unchanged | — | ✅ PASS |
| #3 NFR-01 baseline file present, well-formed | **FAIL** | **PRESENT** — 5 runs, mean 16746.6 ms, spread (max−min)=8115 ms = 48.5% of mean (under the 50% CONCERNS threshold) | DEE-52 (TEA / Murat) shipped `nfr01-baseline.json` | ✅ **PASS now** |
| #4 PRD FR/NFR coverage complete | PASS | unchanged | — | ✅ PASS |
| #5 epics.md cites every FR/NFR | PASS | unchanged | — | ✅ PASS |
| #6 every story has pre-flight reads + ACs + risk callouts | PASS | unchanged | — | ✅ PASS |
| #7 PR template anchored on project-context.md §16 | **CONCERNS** | absent in repo; **scheduled in-sprint** as Epic 6 Story 6.1 | Epic 6 (Amelia / Dev) | 🟡 IN-SPRINT (acceptable) |
| #8 Sprint-Start gate references G-1 + G-2 | PASS | unchanged (this plan re-affirms it) | — | ✅ PASS |
| #9 backlog wired to FRs with no orphan epics | PASS | unchanged | — | ✅ PASS |

**CTO verdict:** Sprint-Start gate is **OPEN**. The single FAIL at IR time (#3) is now PASS via DEE-52; the single CONCERNS (#7) is consumed in-sprint by Epic 6 Story 6.1, which lands inside MVP-1. No remaining blocker for Sprint-Start.

**Escalation owner during sprint:** CTO — any per-epic gate that flips to CONCERNS or FAIL during execution escalates here, per the agent contract (Eskalations-Pfade row "TEA meldet P0-NFR-Verletzung" and "Architektur-Konflikt").

---

## 3. Epic sequencing & parallel streams

The 12 stories sequence into three execution streams. Streams are independent at the source-edit level **except for two known shared edit points**:

1. **`docs/development-guide.md`** — collects per-stream doc additions by append (not by section overwrite). All three streams append independent sections; no merge conflict expected.
2. **`package.json`** — both Story 2.3 (Stream A, adds `npm run licenses:check`) and Story 3.1 (Stream B, adds `npm run test:fixtures:check`) extend the `scripts.test` chain. **Treat `package.json` as an ordered merge point:** Stream A's Story 2.3 lands the initial `licenses:check` wiring first; Stream B's Story 3.1 then rebases and **appends** its `test:fixtures:check` to the existing chain rather than replacing it (target shape: `"test": "npm run licenses:check && npm run test:fixtures:check && playwright test"`, which is the canonical form already cited in `epics.md` Story 3.1's "Files to edit" section). Two PRs in flight is fine; the merge order on `main` is what matters.

Streams otherwise run in parallel; per-epic ordering is sequential within a stream. **Implication for Stream B:** Story 3.1's `package.json` wire-in step is gated on Story 2.3 having merged. Stream B can begin Story 3.1's non-`package.json` work (the `check-test-fixtures.mjs` script + the `.fixture-manifest.json`) in parallel with Stream A; only the final wire-in commit needs the rebase.

### Stream A — Hygiene & assets (sequential)

| Order | Item | Owner | Why this order |
|---|---|---|---|
| A1 | Epic 1 / Story 1.1 — Remove dead-weight renderer assets, record saving in `docs/asset-inventory.md` | Amelia (Dev) | Smallest, highest-confidence change; warms the sprint with a green PR pattern. |
| A2 | Epic 2 / Story 2.1 — Bootstrap per-folder `LICENSE.yml` metadata + regenerate `LICENSES.md` (data-hygiene fixes included) | Amelia (Dev) | Establishes the metadata schema before the generator script consumes it. |
| A3 | Epic 2 / Story 2.2 — Implement `scripts/build-licenses.mjs` generator script | Amelia (Dev) | Generator depends on A2's metadata. |
| A4 | Epic 2 / Story 2.3 — Wire `licenses:check` into `npm test` (CI drift gate) | Amelia (Dev) | Gate depends on the generator (A3) being deterministic. |
| A5 | Epic 2 / Story 2.4 — Document the "add a new vendored library" workflow | Paige (Tech-Writer) or Amelia | Doc; lands after A4 so the documented workflow matches what's in CI. |

### Stream B — Test-fixture + worker safety (sequential)

| Order | Item | Owner | Why this order |
|---|---|---|---|
| B1 | Epic 3 / Story 3.1 — `tests/assets/` integrity check + manifest, wire into `npm test` | Amelia (Dev) + Murat (TEA) | Standalone; only depends on Sprint-Start pre-conditions. |
| B2 | Epic 3 / Story 3.2 — Document the fixture-drift re-derivation procedure | Paige (Tech-Writer) | Doc; lands after B1 so the procedure matches the implemented manifest format. |
| B3 | Epic 4 / Story 4.1 — `app.shuttingDown` sentinel + bounded try/catch boundary in `main.js` | Amelia (Dev) | Code change; B1's integrity gate must be green to detect any regression here. |
| B4 | Epic 4 / Story 4.2 — NFR-02 manual-repro evidence (15/15 trials, 3 exit paths) | Murat (TEA) | Validates B3 against NFR-02; gates Epic 4's `done` transition. |

### Stream C — Type-gap + governance rails (sequential)

| Order | Item | Owner | Why this order |
|---|---|---|---|
| C1 | Epic 6 / Story 6.1 — `.github/pull_request_template.md` anchored on `project-context.md` §16 | Amelia (Dev) | **Pulled to the front of stream C** because the IR CONCERNS for Pre-condition #7 should land as early in the sprint as possible — every subsequent PR in this sprint then reviews itself against the §16 checklist. |
| C2 | Epic 5 / Story 5.1 — Add `transformParse` and `polygonifyPath` to `SvgParserInstance` in `index.d.ts` | Amelia (Dev) | Type-only; lands once the §16 PR template (C1) is governing reviews. |
| C3 | Epic 6 / Story 6.2 — Document the "cite the §16 item number" reviewer workflow | Paige (Tech-Writer) | Doc; lands last — closes the loop on C1 by codifying the reviewer-side workflow. |

**Parallelism note.** A1 (Story 1.1, asset removal) and C1 (Story 6.1, PR template) share no files with each other or with B1 — they can land in any order or simultaneously. **B1 (Story 3.1)** can also start in parallel (its `scripts/check-test-fixtures.mjs` + `tests/assets/.fixture-manifest.json` work is independent), but its `package.json` wire-in step is **gated on Stream A reaching Story 2.3** (per §3 shared-edit-point #2). In practice: B1's PR can be opened in parallel; merging B1 just waits for A1→A2→A3→A4 (Story 2.3) to land first, then B1 rebases and merges. After the heads land, each stream serializes internally.

**Critical-path note.** The sprint's critical path is **Stream A** (5 items) — Stream A is also the longest stream and gates Stream B's first merge. Stream C (3 items) has full slack against Stream A.

---

## 4. Per-story Sprint-readiness check

Each row inherits the CA §9 #6 verdict from IR (PASS) plus this sprint's pre-flight reads (per epics.md §"Per-MVP-Story Pre-Flight Read List").

| Story | Status now | Pre-flight reads loaded? | Pre-flight reads (story-specific) | Sprint-Start ready? |
|---|---|---|---|---|
| 1.1 | backlog | ✅ canonical 5-item list embedded in story | `docs/asset-inventory.md` | ✅ Ready |
| 2.1 | backlog | ✅ canonical | `LICENSES.md` (current), all `node_modules/<vendor>/LICENSE` files in scope | ✅ Ready |
| 2.2 | backlog | ✅ canonical | `package-lock.json`, `LICENSES.md` (post-2.1) | ✅ Ready |
| 2.3 | backlog | ✅ canonical | `package.json` `scripts.test` chain | ✅ Ready |
| 2.4 | backlog | ✅ canonical | `docs/development-guide.md` (current) | ✅ Ready |
| 3.1 | backlog | ✅ canonical | `tests/assets/` (entire tree), `tests/electron-app.spec.ts` placement counts | ✅ Ready |
| 3.2 | backlog | ✅ canonical | `docs/development-guide.md`, manifest format from 3.1 | ✅ Ready |
| 4.1 | backlog | ✅ canonical | `main.js` `// todo:` shutdown sites; ADR-009 in `architecture.md` §5 | ✅ Ready |
| 4.2 | backlog | ✅ canonical | NFR-02 procedure in `prd.md`, 4.1 implementation | ✅ Ready |
| 5.1 | backlog | ✅ canonical | `index.d.ts`, call-site signatures in `main/deepnest.js`; ADR-007 in anchor `docs/architecture.md` | ✅ Ready |
| 6.1 | backlog | ✅ canonical | `_bmad-output/project-context.md` §16 (16-item anti-pattern list) | ✅ Ready |
| 6.2 | backlog | ✅ canonical | 6.1 PR template, `docs/development-guide.md` | ✅ Ready |

All 12 stories are ready for `bmad-create-story` (the next step that promotes a story from `backlog` → `ready-for-dev` by creating a story file under `_bmad-output/implementation-artifacts/`).

---

## 5. Sprint risks & escalation hooks

| # | Risk | Likelihood | Impact | Mitigation | Owner | Escalation if hit |
|---|---|---|---|---|---|---|
| R1 | NFR-01 wall-clock regresses >20% mid-sprint (e.g. Epic 4's sentinel adds latency, Epic 3's manifest read slows test boot) | Low | High | Each PR re-runs `npm test` on the canonical CI cell; rolling-mean delta vs. `nfr01-baseline.json` is reviewer-checked | TEA (Murat) | CTO — block merge, run `bmad-correct-course` |
| R2 | `licenses:check` (Epic 2) flakes on platform-dependent line endings | Medium | Medium | Generator emits LF only; CI runs on Linux only; spec includes a `git config core.autocrlf` test | Amelia (Dev) | CTO — if recurs after one fix-cycle |
| R3 | `tests/assets/` manifest false-positive on legitimate fixture edit | Medium | Low | 3.2 documents the two-line re-derivation; failure mode is "PR adds a 1-line manifest update", not a hard block | Amelia (Dev) | None (self-resolving) |
| R4 | NFR-02 manual-repro (4.2) cannot reach 15/15 because of host-OS variance (Linux vs macOS vs Windows tray behaviour) | Low | Medium | Repro script targets all three exit paths on each runner OS; "15/15" is per-OS | TEA (Murat) | CTO — if any OS fails to converge after 3 retry batches, scope-cut the OS via `bmad-correct-course` |
| R5 | Epic 6 PR template (C1) is contested on wording and blocks review of A1/B1 PRs that land before C1 | Medium | Low | C1 is sequenced as head of Stream C and lands within the first wave (A1/B1/C1 are interchangeable); reviewer notes track §16 items even pre-C1 | Amelia (Dev) | None — fallback is reviewer notes by hand |
| R6 | One of the 12 stories is unexpectedly larger than its IR sizing claims | Medium | Medium | `bmad-create-story` re-checks sizing at story-file creation; oversized stories trigger split via `bmad-correct-course` | PM (John) | CTO + PM — `bmad-correct-course` |
| R7 | Sprint runs over capacity (sprint label MVP-1 → MVP-1 + spillover) | Medium | Low | Spillover is acceptable as long as Epic 6 Story 6.1 lands in MVP-1 (clears IR Pre-condition #7) | PM (John) | None unless 6.1 spills |

---

## 6. Out of scope for MVP-1

- Phase 2 work (`winCount > 1` migration, FR-07) — explicitly deferred per architecture overlay §6 / ADR-009; preserved as `winCount = 1` invariant in Epic 4.
- Code-author migration of vendored utilities — preserved per ADR-007.
- Any UX work (no UX-shaped requirement per PRD §UX Scope; CU step deliberately skipped, confirmed by CA + CE + IR).
- Any new ADRs — no new architecture decisions are scheduled in MVP-1; if a story surfaces a need for one, it escalates to the CTO via `bmad-correct-course`.

---

## 7. Next actions

1. **PM (John)** runs `bmad-create-story` per the sequencing in §3 to promote each story `backlog` → `ready-for-dev`. Stream heads (A1, B1, C1) first; remaining items in stream order.
2. **Amelia (Dev)** picks up `ready-for-dev` stories via `bmad-dev-story` per the per-stream sequencing.
3. **Murat (TEA)** owns the cross-cutting NFR checks: NFR-01 regression on every PR (against `nfr01-baseline.json`), NFR-02 evidence for Story 4.2.
4. **CTO** holds the weekly Quality Sync with TEA per the agent contract; issues a fresh CTO sign-off on this plan if Sprint-Start gate state changes.
5. **PM + CTO** trigger `bmad-correct-course` if any of risks R1, R4, R6, R7 fires.

---

## 8. Tracking

The canonical sprint tracking artifact is `_bmad-output/implementation-artifacts/sprint-status.yaml` (generated alongside this plan). Status transitions during the sprint flow through that file; this plan is read-mostly and updates only on Sprint-Start-gate state changes or sprint-scope changes (per `bmad-correct-course`).
