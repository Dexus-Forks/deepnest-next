---
stepsCompleted:
  - step-01-load-context
  - step-02-discover-tests
  - step-03-map-criteria
  - step-04-analyze-gaps
  - step-05-gate-decision
lastStep: step-05-gate-decision
lastSaved: '2026-04-26'
workflowType: testarch-trace
gate_type: story
decision_mode: deterministic
inputDocuments:
  - _bmad-output/implementation-artifacts/2-1-bootstrap-per-folder-license-yml-metadata-regenerate-licenses-md-data-hygiene-fixes-included.md
  - _bmad-output/planning-artifacts/prd.md
  - _bmad-output/planning-artifacts/prd-validation-report.md
  - _bmad-output/planning-artifacts/architecture.md
  - _bmad-output/planning-artifacts/sprint-plan.md
  - _bmad-output/planning-artifacts/nfr01-baseline.json
  - _bmad-output/project-context.md
  - projects/deepnest-next/reviews/2-1-bootstrap-per-folder-license-yml-metadata-regenerate-licenses-md-round-1.md
  - LICENSES.md (post-merge @ d66b8d5)
  - main/util/LICENSE.yml (post-merge @ d66b8d5)
  - main/font/LICENSE.yml (post-merge @ d66b8d5)
  - tests/assets/LICENSE.yml (post-merge @ d66b8d5)
  - tests/assets/.fixture-manifest.json (post-fix @ cf831f2)
coverageBasis: acceptance_criteria
oracleConfidence: high
oracleResolutionMode: formal_requirements
oracleSources:
  - _bmad-output/implementation-artifacts/2-1-bootstrap-per-folder-license-yml-metadata-regenerate-licenses-md-data-hygiene-fixes-included.md (AC-02.1.1..AC-02.1.9 + AC-02.5)
  - _bmad-output/planning-artifacts/prd.md §FR-02 (AC-02.1..AC-02.4)
  - _bmad-output/planning-artifacts/prd-validation-report.md §Open Q2 Table 3 (5 data-hygiene issues)
  - _bmad-output/planning-artifacts/architecture.md §3.1 (FR-02 row) + §4 (FR-02 constraints) + §5 ADR-008
  - _bmad-output/planning-artifacts/nfr01-baseline.json (rolling_mean_ms = 16746.6, tolerance ±20% → [13397, 20096] ms)
externalPointerStatus: not_used
trace_target:
  type: story
  id: 2.1
  slug: 2-1-bootstrap-per-folder-license-yml-metadata-regenerate-licenses-md-data-hygiene-fixes-included
  label: 'Story 2.1 — Bootstrap per-folder LICENSE.yml + regenerate LICENSES.md (data-hygiene fixes included)'
  merge_sha: d66b8d52eefd161fe3959fc38e6c0c8d4d0f9796
  pr_url: https://github.com/Dexus-Forks/deepnest-next/pull/19
  post_fix_sha: cf831f272f586691acfb891654992ce7316c5818
collection_mode: contract_static
collection_status: COLLECTED
allow_gate: true
gate_status: PASS
tempCoverageMatrixPath: '_bmad-output/test-artifacts/traceability/2-1-bootstrap-per-folder-license-yml-metadata-regenerate-licenses-md-data-hygiene-fixes-included-trace.matrix.json'
---

# Traceability Matrix & Gate Decision — Story 2.1 (LICENSE.yml bootstrap + LICENSES.md regen + 5 data-hygiene fixes)

**Target:** Story 2.1 (DEE-84 / FR-02 / ADR-008) — Stream A2 of MVP-1
**Merge:** `d66b8d52eefd161fe3959fc38e6c0c8d4d0f9796` on `main` (PR [#19](https://github.com/Dexus-Forks/deepnest-next/pull/19) — merged 2026-04-26T15:24:28Z by Dexus)
**Post-fix HEAD:** `cf831f272f586691acfb891654992ce7316c5818` (squashed into the merge — re-derived `.fixture-manifest.json` after AC-02.1.3 added `tests/assets/LICENSE.yml`)
**Date:** 2026-04-26
**Evaluator:** Murat (Test Architect, BMad TEA)
**Coverage Oracle:** acceptance_criteria (formal requirements — story file §Acceptance Criteria + PRD §FR-02 + prd-validation-report §Open Q2 Table 3 + architecture §3.1/§4/§5 ADR-008 + NFR-01)
**Oracle Confidence:** high
**Oracle Sources:** see frontmatter

---

> **Note on test surface.** Story 2.1 is a **pure-metadata** story. Story-file line 285 states verbatim: *"No new test added by this story — pure metadata. Verification is structural (file exists; entries enumerate the audit set; bootstrap LICENSES.md matches the convention) + CI green."* The diff has zero executable surface (`git diff a51f5e6..d66b8d5 -- 'main/util/*.{js,ts}' main/util/_unused/ 'tests/assets/*.svg' main/font/fonts/ eslint.config.mjs package.json tsconfig.json '.github/**'` returns empty — Sage Round-1 pre-flight + Murat re-verified). Coverage tracing here uses **document-based, git-based, YAML-parse, ASCII-sort, line-ending, and CI-step-wall-clock verifications** as the measurement surface. The single-file Playwright spec (`tests/index.spec.ts` — `Nest` test) provides the dynamic regression fence on AC-02.1.7 via two independent CI runs: PR run [`24960094498`](https://github.com/Dexus-Forks/deepnest-next/actions/runs/24960094498) (post-fix HEAD `cf831f2`) and push-to-main run [`24960135893`](https://github.com/Dexus-Forks/deepnest-next/actions/runs/24960135893) (squash-merge `d66b8d5`). The actual `licenses:check` determinism gate that exercises the regeneration logic ships in **Story 2.3** (Stream-A4); this story is the **input** for that gate.

---

## PHASE 1: REQUIREMENTS TRACEABILITY

### Coverage Summary

| Priority  | Total Criteria | FULL Coverage | Coverage % | Status      |
| --------- | -------------- | ------------- | ---------- | ----------- |
| P0        | 6              | 6             | 100%       | ✅ PASS     |
| P1        | 3              | 3             | 100%       | ✅ PASS     |
| P2        | 0              | 0             | n/a        | ✅ PASS     |
| P3        | 1              | 1             | 100%       | ✅ PASS     |
| **Total** | **10**         | **10**        | **100%**   | **✅ PASS** |

**Priority assignment rationale (risk-based, Probability × Impact):**

- **P0 (6)** — gate-bearing items that *define* whether FR-02's bootstrap + the 5 VP-found compliance fixes were delivered, OR enforce NFR-01:
  - AC-02.1.1 (`main/util/LICENSE.yml` enumerates every vendored item)
  - AC-02.1.2 (`main/font/LICENSE.yml` enumerates live Lato kit)
  - AC-02.1.3 (`tests/assets/LICENSE.yml` enumerates fixture SVGs)
  - AC-02.5 (the five data-hygiene fixes — legal-compliance defect closure)
  - AC-02.1.5 (regenerated `LICENSES.md` is Story 2.2's byte-for-byte regression target)
  - AC-02.1.7 (`npm test` regression-free against `nfr01-baseline.json`)
- **P1 (3)** — invariants surrounding the deliverable; if any silently regressed, the next reviewer or release would catch it but the merge itself would not:
  - AC-02.1.4 (empty/N-A folders explicitly handled — audit completeness verifiable from PR alone)
  - AC-02.1.6 (no fixture/asset rename or re-encode — FR-03 invariant guard, blocks scope creep into Story 2.3 territory)
  - AC-02.1.8 (`project-context.md` §16 anti-patterns hold — NFR-03 enforcement)
- **P3 (1)** — scope-creep-foreclosure, PR-description statement (no behavioural surface):
  - AC-02.1.9 (generator script delivery foreclosed; deferred to Story 2.2)

---

### Detailed Mapping

#### AC-02.1.1 — `main/util/LICENSE.yml` enumerates every vendored library under `main/util/` (P0)

- **Coverage:** FULL ✅
- **Test/Verification:**
  - `verify-util-license-yml-entry-count` — `git show d66b8d5:main/util/LICENSE.yml` parses as YAML and contains 14 entries.
    - **Given:** post-merge state of `main` at `d66b8d5`
    - **When:** `grep -c '^- path:' main/util/LICENSE.yml` is run
    - **Then:** returns 14 — 9 live (`HullPolygon.ts`, `clipper.js`, `geometryutil.js`, `interact.js`, `parallel.js`, `pathsegpolyfill.js`, `ractive.js`, `simplify.js`, `svgpanzoom.js`) + 5 `_unused/` (`clippernode.js`, `filesaver.js`, `hull.js`, `json.js`, `placementworker.js`). Matches PR body claim and Sage Round-1 pre-flight (`yaml.safe_load` → 14).
  - `verify-util-license-yml-spdx-ids` — All 14 entries carry valid SPDX-2.3 license IDs (`BSL-1.0`, `MIT`, `ISC`, `BSD-2-Clause`, `BSD-3-Clause`, `LicenseRef-PublicDomain`). Sage independently validated against SPDX 2.3 §10.1 for the `LicenseRef-PublicDomain` syntax.
  - `verify-util-folder-snapshot-matches-audit` — `ls main/util/` at `d66b8d5` returns the 14 audited files plus 6 first-party `*.ts` (`domparser.ts`, `eval.ts`, `matrix.ts`, `point.ts`, `vector.ts`, plus `HullPolygon.ts` which IS catalogued because its header attributes Mike Bostock / Hull.js port). PR body's "Vendored-vs-first-party adjudication for `main/util/*.ts`" block names each file's classification; Sage cross-checked.
- **Gaps:** none.
- **Recommendation:** none — 14 entries match the AC-02.1.1 audit list verbatim and satisfy the "any other file present under `main/util/` or `main/util/_unused/` that is not first-party" clause.

---

#### AC-02.1.2 — `main/font/LICENSE.yml` enumerates the post-Story-1.1 live Lato webfont kit (P0)

- **Coverage:** FULL ✅
- **Test/Verification:**
  - `verify-font-license-yml-entry-count` — `git show d66b8d5:main/font/LICENSE.yml` parses as YAML and contains 7 entries.
    - **Given:** post-merge state of `main` at `d66b8d5`
    - **When:** `grep -c '^- path:' main/font/LICENSE.yml` is run
    - **Then:** returns 7 — `LatoLatin-{Bold,Light,Regular}.{woff,woff2}` × 6 + `latolatinfonts.css` × 1. All six webfont entries carry SIL OFL-1.1 attribution to Łukasz Dziedzic / tyPoland Sp. z o.o. (matches Lato upstream Google Fonts metadata).
  - `verify-font-license-yml-no-deadweight` — Zero entries for any file removed in Story 1.1 (`BoldItalic` kit, `lato-{hai,lig}-*` demo kit, `*.eot`/`*.ttf` for live weights, `stylesheet.css`, `specimen_files/`, `generator_config.txt`). Cross-checked against `docs/asset-inventory.md` §6 "Status: removed in DEE-55 / Story 1.1".
- **Gaps:** none.
- **Recommendation:** none — entries match the AC-02.1.2 audit list verbatim; no dead-weight reintroduction risk.

---

#### AC-02.1.3 — `tests/assets/LICENSE.yml` enumerates every fixture SVG with provenance (P0)

- **Coverage:** FULL ✅
- **Test/Verification:**
  - `verify-tests-assets-license-yml-entry-count` — `git show d66b8d5:tests/assets/LICENSE.yml` parses as YAML and contains 2 entries.
    - **Given:** post-merge state of `main` at `d66b8d5`
    - **When:** `grep -c '^- path:' tests/assets/LICENSE.yml` is run
    - **Then:** returns 2 — `henny-penny.svg` (Brownfox / Sasha Tsarev, OFL-1.1) and `mrs-saint-delafield.svg` (Astigmatic / Brian J. Bonislawsky, OFL-1.1). Each entry carries upstream Google Fonts URL + provenance note. Per the story's coordination point with Epic 3 architectural constraint (d), this `LICENSE.yml` is the canonical provenance surface.
- **Gaps:** none.
- **Recommendation:** none. (Note: adding this file triggered Story 3.1's fixture-integrity gate as drift, requiring the `cf831f2` `.fixture-manifest.json` re-derivation. That follow-up scope decision — explicit allow-list of fixture extensions vs full-directory walk — is carried forward into Story 2.2 spec via DEE-90.)

---

#### AC-02.5 — Five VP-found data-hygiene fixes resolved in bootstrap `LICENSES.md` (P0)

- **Coverage:** FULL ✅
- **Test/Verification:**
  - `verify-ac025a-typo-and-path` — **(a)** `/main/uitil/filesaver.js` → `/main/util/_unused/filesaver.js`. Both the `uitil` typo AND the path correction (`_unused/` subdirectory) landed in a single edit. Verified by inspecting `LICENSES.md` row + `ls main/util/_unused/filesaver.js`.
  - `verify-ac025b-clipper-extension` — **(b)** `/main/util/clipper` → `/main/util/clipper.js`. Extension added to match live file.
  - `verify-ac025c-clippernode-path` — **(c)** `/main/util/clippernode.js` → `/main/util/_unused/clippernode.js`. Path corrected to `_unused/` subdirectory.
  - `verify-ac025d-svgnest-removed` — **(d)** `/main/svgnest.js` row removed (file does not exist in tree at `d66b8d5`; `ls main/svgnest.js` returns "No such file or directory"). Sage Round-1 pre-flight confirmed via `git show d66b8d5:main/svgnest.js → path does not exist`.
  - `verify-ac025e-no-question-placeholders` — **(e)** Three `?` copyright placeholders replaced with concrete attributions:
    - `/main/svgparser.js` → `Copyright (c) 2015 Jack Qiao (svgnest origin)`
    - `/main/deepnest.js` → `Copyright (c) 2018 Daniel Sagor and Deepnest contributors (deepnest.io); fork of SVGnest by Jack Qiao`
    - The third `?` placeholder was the `/main/svgnest.js` row, dropped via (d).
    - Verification: `grep -nE '\| \?' LICENSES.md` returns no row-level matches.
- **Gaps:** none.
- **Recommendation:** none. All 5/5 VP-found data-hygiene issues from `prd-validation-report.md` §Open Q2 Table 3 are closed in this single bootstrap commit, as the AC required.

---

#### AC-02.1.5 — Bootstrap `LICENSES.md` matches the convention (Story 2.2 byte-for-byte regression target) (P0)

- **Coverage:** FULL ✅
- **Test/Verification:**
  - `verify-licenses-md-header-preserved` — Top-of-file header sentence ("This software contains different units with different licenses, copyrights and authors.") preserved verbatim.
  - `verify-licenses-md-table-shape` — Existing markdown table shape `| Unit | License | Copyright |` preserved (column-rename-only nit: trailing space normalisation in the `| Copyright|` → `| Copyright |` header cell — Sage Round-1 acceptable trade-off given LF-only conversion in same edit).
  - `verify-licenses-md-row-count-and-grouping` — 28 data rows total: 5 first-party (`/main`, `/main/svgparser.js`, `/main/deepnest.js`, `minkowski.cc, minkowski.h`, `/polygon`) grouped first, then 23 third-party rows alphabetical by Unit path. Sage Round-1 pre-flight verified ASCII sort: `_` (0x5F) < `a` (0x61) so `_unused/` precedes `clipper.js`; `H` (0x48) < `_` so `HullPolygon.ts` precedes `_unused/...`; all 23 rows in correct ASCII order.
  - `verify-licenses-md-line-endings` — LF-only (32 LF, 0 CRLF), single trailing newline. Sage Round-1 pre-flight: `tail -c 5 | od -c` confirms.
  - `verify-licenses-md-yaml-md-coherence` — Every entry across the 3 `LICENSE.yml` files (14 + 7 + 2 = 23) appears exactly once as a row in `LICENSES.md` (third-party block); the 5 first-party rows are preserved (with hygiene-filled Copyright per AC-02.5(e)). This file is now Story 2.2's byte-for-byte regression target.
- **Gaps:** none functional. **Architectural-tension carry-forward:** Sage Round-1 P2-01 (Vitra) flagged that AC-02.1.5's "preserve `/polygon` + `minkowski.cc` rows verbatim" tension with ADR-008 §271 ("generator does not emit out-of-tree attribution") combined with the fact that `@deepnest/calculate-nfp` Boost-licensed code ships under `node_modules/` in the unpacked Electron installer (`build.files: ['**/*']`, `build.asar: undefined`) requires a generator passthrough mechanism that Story 2.2's spec must codify. Already carried forward into [DEE-90](/DEE/issues/DEE-90).
- **Recommendation:** **No backfill against this PR.** Resolution path is upstream of this merge (Story 2.2 spec amendment, owner: Mary / Winston). Bundle SPDX normalisation (P3-01: `Boost` → `BSL-1.0`, `GPLv3` → `GPL-3.0-only`), `latolatinfonts.css` placement (P3-02), and schema canonicalisation (P3-03) into the same DEE-90 scope.

---

#### AC-02.1.6 — No fixture/asset file renamed or re-encoded as side-effect (FR-03 invariant guard) (P1)

- **Coverage:** FULL ✅
- **Test/Verification:**
  - `verify-zero-executable-surface-diff` — `git diff a51f5e6..d66b8d5 -- 'main/util/*.{js,ts}' main/util/_unused/ 'tests/assets/*.svg' main/font/fonts/ eslint.config.mjs package.json tsconfig.json '.github/**'` returns empty. Sage Round-1 pre-flight + Murat re-verified post-merge.
  - `verify-fixture-svgs-byte-identical` — Both `tests/assets/henny-penny.svg` and `tests/assets/mrs-saint-delafield.svg` byte-identical at `d66b8d5` vs `a51f5e6`. Sage pre-flight `git diff -- *.svg` empty; `cf831f2` commit body explicitly preserves spec literals (`importsnav_count=2`, `placements_total/max=54/54`).
  - `verify-fixture-manifest-rederivation-allowed-class` — `cf831f2` re-derived `tests/assets/.fixture-manifest.json` after AC-02.1.3 added `tests/assets/LICENSE.yml` to the directory, triggering Story 3.1's `npm run test:fixtures:check` gate as drift. Per the `cf831f2` commit body: "AC-02.1.6 forbids modifications to `*.svg`/`*.woff`/`*.css`/`*.js`/`*.ts` fixture files; `.fixture-manifest.json` is none of those — it is fixture metadata, the same class as `LICENSE.yml`." Both fixture SVG sha256s in the manifest are unchanged; only the new `tests/assets/LICENSE.yml` entry is added. AC-02.1.6 prohibition does not apply to fixture-metadata files. Sage Round-1 implicitly endorsed this by verifying `git diff -- '*.svg' '*.woff*' '*.css' '*.js' '*.ts'` empty.
- **Gaps:** none. **Carry-forward (informational, P3):** Story 2.1 ↔ Story 3.1 manifest scope decision — explicit allow-list of fixture extensions vs full-directory walk — bundled into DEE-90 to prevent future LICENSE.yml-class file additions from triggering the integrity gate.
- **Recommendation:** none for this PR; surface the scope decision into Story 2.2 spec (DEE-90).

---

#### AC-02.1.7 — `npm test` is green on the PR within NFR-01 ±20% wall-clock band (P0)

- **Coverage:** FULL ✅
- **Test/Verification:**
  - `tests/index.spec.ts:Nest` — Playwright Electron Nest spec (Config → Import → Sheet → Nest → Export). Spec literally unchanged in this story (pure-metadata diff).
  - `verify-nfr01-postfix-pr-run` — CI run [`24960094498`](https://github.com/Dexus-Forks/deepnest-next/actions/runs/24960094498) (PR #19, post-fix HEAD `cf831f2`): "Run Playwright tests" step `2026-04-26T15:23:42Z → 15:24:00Z = 18000 ms` ∈ NFR-01 ±20% band `[13397, 20096] ms`. Δ vs `rolling_mean_ms = 16746.6 ms` is +1253.4 ms (well within tolerance — change is package-size-positive metadata-only).
  - `verify-nfr01-merge-commit-run` — CI run [`24960135893`](https://github.com/Dexus-Forks/deepnest-next/actions/runs/24960135893) (push-to-main, `d66b8d5` squash-merged): "Run Playwright tests" step `2026-04-26T15:25:36Z → 15:25:52Z = 16000 ms` ∈ NFR-01 ±20% band. Δ = -746.6 ms — second independent confirmation post-merge.
  - `verify-fixture-integrity-gate-green` — Story 3.1's `npm run test:fixtures:check` is part of the same CI job; both `24960094498` and `24960135893` report `conclusion: success` overall (the gate would have failed the job otherwise, which `c8ec6cd` did before `cf831f2` re-derived the manifest).
- **Gaps:** none.
- **Recommendation:** none — NFR-01 binding evidence captured at two independent SHAs (PR + post-merge), both in band.

---

#### AC-02.1.4 — Empty / not-applicable folders explicitly handled (P1)

- **Coverage:** FULL ✅
- **Test/Verification:**
  - `verify-pr-body-skipped-list` — PR #19 description includes the "considered and skipped" list with one-line reason per folder (`main/img/`, `main/ui/`, `tests/`). Sage Round-1: "audit completeness verifiable from the PR alone" (per AC-02.1.4 plain text).
  - `verify-no-stray-license-yml` — `git ls-tree -r d66b8d5 -- '**/LICENSE.yml'` returns exactly the 3 expected paths (`main/util/LICENSE.yml`, `main/font/LICENSE.yml`, `tests/assets/LICENSE.yml`); no `LICENSE.yml` under `main/img/`, `main/ui/`, `tests/`. Story-time invariant satisfied.
- **Gaps:** none.
- **Recommendation:** none.

---

#### AC-02.1.8 — `project-context.md` §16 anti-patterns hold (NFR-03 enforcement, 16/16) (P1)

- **Coverage:** FULL ✅
- **Test/Verification:**
  - `verify-anti-pattern-pr-self-table` — PR #19 description carries the §16 audit grid with 16/16 self-claim per AC-02.1.8 + the `.github/pull_request_template.md` 16-checkbox spine.
  - `verify-anti-pattern-sage-cross-check` — Sage Round-1 independently re-ran §16 hot greps against the diff, listed in §"Anti-pattern audit (cross-checked against PR body's 16/16 self-claim)" of the consolidated report:
    - §16.1 (no new `window.X` global) — `git diff | grep 'window\.[a-zA-Z]'` empty
    - §16.2/3 (no new IPC channels) — no JS code added
    - §16.5 (no modify vendored utilities) — `git diff -- main/util/*.js main/util/*.ts` empty
    - §16.6 (no import from `_unused/`) — metadata-only catalogue, no `import` statements added
    - §16.8 (no new `// @ts-ignore`) — `git diff | grep '@ts-ignore'` empty
    - §16.9 (no `--no-verify`) — `git log --pretty=fuller c8ec6cd cf831f2 d66b8d5` shows no `[skipped]` markers
    - §16.10 (no svg drop/re-encode) — `git diff -- 'tests/assets/*.svg'` empty
    - §16.15 (no eslint.config.mjs change) — `git diff eslint.config.mjs` empty
    - §16.4, §16.7, §16.11, §16.12, §16.13, §16.14, §16.16 — all n/a for metadata-only diff
    - **16/16 PR self-claim confirmed.**
  - `verify-no-no-verify-in-history` — `git log --pretty=fuller c8ec6cd cf831f2 d66b8d5` shows author Josef Fröhle / Amelia / Paperclip, no `--no-verify` markers, no skipped pre-commit hooks. §16.9 holds.
- **Gaps:** none.
- **Recommendation:** none — Round-1 Board (Sage / DEE-85) APPROVED with 16/16 §16 audit pass.

---

#### AC-02.1.9 — Generator-script delivery left to Story 2.2 (P3)

- **Coverage:** FULL ✅
- **Test/Verification:**
  - `verify-no-generator-script-shipped` — `git diff --name-only a51f5e6..d66b8d5 -- scripts/ helper_scripts/` returns empty. Sage Round-1 pre-flight: "Generator script not shipped (AC-02.1.9): `git diff --name-only` shows zero changes under `scripts/` or `helper_scripts/`". Scope-creep foreclosed.
  - `verify-pr-description-explicit-deferral` — PR #19 description includes the explicit deferral statement per AC-02.1.9 plain text: *"The bootstrap `LICENSES.md` is the regression target Story 2.2's `scripts/build-licenses.mjs` will reproduce byte-for-byte. No script is shipped in this PR."*
- **Gaps:** none.
- **Recommendation:** trivially satisfied. Carries forward to Story 2.2 (DEE-90 — Stream-A3 generator script).

---

### Gap Analysis

#### Critical Gaps (BLOCKER) ❌

**0 gaps found.** Story 2.1 has no P0/P1/P2 blocker against any acceptance criterion.

#### High Priority Gaps (PR BLOCKER) ⚠️

**0 gaps found.**

#### Medium Priority Gaps (Nightly) ⚠️

**0 gaps found.**

#### Low Priority Gaps (Optional) ℹ️

**0 gaps found.** All 5 carry-forwards are forward-looking architectural / generator-design work for Story 2.2, not coverage gaps for Story 2.1's deliverable.

---

### Coverage Heuristics Findings

#### Endpoint Coverage Gaps

- Endpoints without direct API tests: 0 (n/a — pure-metadata story; no API surface)

#### Auth/Authz Negative-Path Gaps

- Criteria missing denied/invalid-path tests: 0 (n/a — no auth surface)

#### Happy-Path-Only Criteria

- Criteria missing error/edge scenarios: 0 (n/a — no behavioural surface; the AC contract is structural + CI-green)

#### UI Journey / State Coverage

- n/a for this story (`event.story.touchesUI = false` per Sage Round-1 — Iris perspective correctly conditional-skipped)

---

### Quality Assessment

#### Tests with Issues

**BLOCKER Issues** ❌ — none.
**WARNING Issues** ⚠️ — none.
**INFO Issues** ℹ️ — none.

#### Tests Passing Quality Gates

**23/23 verifications (100%) meet all quality criteria** ✅ (1 e2e + 22 doc-verification, all enumerated in `*-trace.matrix.json` `test_inventory.tests`).

---

### Duplicate Coverage Analysis

#### Acceptable Overlap (Defense in Depth)

- AC-02.1.7 — NFR-01 wall-clock band confirmed at TWO independent CI runs (PR `cf831f2` 18000 ms + push-to-main `d66b8d5` 16000 ms). Defense-in-depth is appropriate here because the post-fix commit changed a fixture-manifest hash, so confirming both PR-time and post-merge wall-clock reduces the chance of a perf regression slipping past a single sample.
- AC-02.1.5 — `LICENSES.md` row count + grouping verified by both PR body's claim AND Sage Round-1 deterministic re-count (28 rows = 5 first-party + 23 third-party).

#### Unacceptable Duplication ⚠️ — none.

---

### Coverage by Test Level

| Test Level         | Tests   | Criteria Covered | Coverage % |
| ------------------ | ------- | ---------------- | ---------- |
| E2E                | 1       | 1                | 100%       |
| API                | 0       | 0                | n/a        |
| Component          | 0       | 0                | n/a        |
| Unit               | 0       | 0                | n/a        |
| doc-verification   | 22      | 9                | 100%       |
| **Total**          | **23**  | **10**           | **100%**   |

---

### Traceability Recommendations

#### Immediate Actions (Before PR Merge)

— none. PR is already merged at `d66b8d5` with Round-1 Board APPROVED.

#### Short-term Actions (This Milestone)

1. **Story 2.2 spec amendment (DEE-90)** — Murat hands off 5 carry-forward items to Mary / Winston / Amelia (DEE-90 owner mix):
   1. Codify generator handling for in-installer-but-out-of-tree first-party rows (P2-01 from Sage Round-1 — Vitra architectural-tension finding). Decide one of: (a) `main/LICENSE.yml` flagging in-installer-but-out-of-tree rows for emission; (b) hardcode 5 first-party rows in Story 2.2 generator with documentation; (c) amend ADR-008 §271 to distinguish "out-of-tree and not shipped" vs "out-of-tree but shipped". Output: ADR-008 §5 amendment + Story 2.2 spec update.
   2. SPDX normalisation (P3-01 deduped Vitra/Lydia): `Boost` → `BSL-1.0`, `GPLv3` → `GPL-3.0-only` across the first-party block. Bundle with the passthrough mechanism above.
   3. `latolatinfonts.css` row placement (P3-02 Lydia): adopt schema flag (`first_party: true` or `audited_only: true`) so the Story 2.2 generator emits the row in the first-party block instead of the third-party block.
   4. Schema canonicalisation (P3-03 Vitra): consolidate the per-folder LICENSE.yml schema spec into a single source (ADR-008 amendment or `docs/license-yml-schema.md`); reduce per-file LICENSE.yml header comments to one-line references.
   5. Fixture-manifest scope decision (Story 2.1↔3.1 interaction surfaced in `cf831f2` commit body): explicit allow-list of fixture file extensions vs full-directory walk for `tests/assets/.fixture-manifest.json`. Prevents future LICENSE.yml-class additions from re-triggering the integrity gate.

#### Long-term Actions (Backlog)

— none beyond the 5 above (all bundled into DEE-90).

---

## PHASE 2: QUALITY GATE DECISION

**Gate Type:** story
**Decision Mode:** deterministic

---

### Evidence Summary

#### Test Execution Results

- **Total verifications:** 23 (1 Playwright E2E + 22 doc-verification)
- **Passed:** 23 (100%)
- **Failed:** 0
- **Skipped:** 0
- **Duration (Playwright step):** 18000 ms (PR run on `cf831f2`) / 16000 ms (push-to-main on `d66b8d5`)

**Priority Breakdown:**

- **P0:** 6/6 covered (100%) ✅
- **P1:** 3/3 covered (100%) ✅
- **P2:** 0/0 (n/a)
- **P3:** 1/1 covered (100%) ✅

**Overall Coverage:** 10/10 = **100%** ✅

**Test Results Source:** GitHub Actions runs [`24960094498`](https://github.com/Dexus-Forks/deepnest-next/actions/runs/24960094498) (PR `cf831f2`) and [`24960135893`](https://github.com/Dexus-Forks/deepnest-next/actions/runs/24960135893) (push-to-main `d66b8d5`).

---

#### Coverage Summary (from Phase 1)

**Requirements Coverage:**

- **P0 Acceptance Criteria:** 6/6 covered (100%) ✅
- **P1 Acceptance Criteria:** 3/3 covered (100%) ✅
- **P2 Acceptance Criteria:** 0/0 (n/a)
- **Overall Coverage:** 100%

**Code Coverage:** n/a (pure-metadata story, zero executable surface)

**Coverage Source:** `_bmad-output/test-artifacts/traceability/2-1-bootstrap-per-folder-license-yml-metadata-regenerate-licenses-md-data-hygiene-fixes-included-trace.matrix.json`

---

#### Non-Functional Requirements (NFRs)

**Security:** PASS ✅ — Aegis (DEE-86) `findings: []` in Round-1. Net security positive (formalises an SBOM-like inventory).

**Performance:** PASS ✅ — Hermes (DEE-88) `findings: []`. NFR-01 wall-clock confirmed at two independent SHAs (cf831f2 = 18000 ms; d66b8d5 = 16000 ms; both ∈ [13397, 20096] ms band). Pure-metadata diff; zero hot-path / async-IO / DB / cache / fanout / token-cost surface touched.

**Reliability:** PASS ✅ — `tests/index.spec.ts:Nest` green at both CI runs; Story 3.1 fixture-integrity gate green post `cf831f2` manifest re-derivation.

**Maintainability:** CONCERNS ⚠️ — Sage Round-1 P2-01 (Vitra) flagged a story-level architectural tension (AC-02.1.5 ↔ ADR-008 §271 in-installer-but-out-of-tree first-party row handling). Resolution path is upstream of this PR (Story 2.2 spec amendment via DEE-90). **Not blocking** — resolution does not require touching the merged code.

**NFR Source:** Sage Round-1 consolidated report (`projects/deepnest-next/reviews/2-1-bootstrap-per-folder-license-yml-metadata-regenerate-licenses-md-round-1.md`), per-perspective sub-issues DEE-86..DEE-89.

---

#### Flakiness Validation

**Burn-in:** not run (single-spec Playwright suite; pure-metadata story; risk near-zero per sprint-plan §5 R1). NFR-01 baseline already encodes a 5-run burn-in (`nfr01-baseline.json` `runs: [...]`, `stddev_ms: 3066.7`).

**Flaky Tests Detected:** 0 ✅

**Burn-in Source:** n/a — confirmed via two independent CI runs at consecutive SHAs (`cf831f2` PR + `d66b8d5` push-to-main); both green.

---

### Decision Criteria Evaluation

#### P0 Criteria (Must ALL Pass)

| Criterion             | Threshold | Actual                | Status   |
| --------------------- | --------- | --------------------- | -------- |
| P0 Coverage           | 100%      | 100% (6/6)            | ✅ PASS  |
| P0 Test Pass Rate     | 100%      | 100%                  | ✅ PASS  |
| Security Issues       | 0         | 0 (Aegis APPROVED)    | ✅ PASS  |
| Critical NFR Failures | 0         | 0                     | ✅ PASS  |
| Flaky Tests           | 0         | 0                     | ✅ PASS  |

**P0 Evaluation:** ✅ ALL PASS

---

#### P1 Criteria (Required for PASS, May Accept for CONCERNS)

| Criterion              | Threshold | Actual               | Status   |
| ---------------------- | --------- | -------------------- | -------- |
| P1 Coverage            | ≥90%      | 100% (3/3)           | ✅ PASS  |
| P1 Test Pass Rate      | ≥95%      | 100%                 | ✅ PASS  |
| Overall Test Pass Rate | ≥95%      | 100%                 | ✅ PASS  |
| Overall Coverage       | ≥80%      | 100%                 | ✅ PASS  |

**P1 Evaluation:** ✅ ALL PASS

---

#### P2/P3 Criteria (Informational, Don't Block)

| Criterion         | Actual    | Notes                                                  |
| ----------------- | --------- | ------------------------------------------------------ |
| P2 Test Pass Rate | n/a (0/0) | No P2 ACs in this story                                |
| P3 Test Pass Rate | 100%      | AC-02.1.9 (generator-script deferral) trivially passed |

---

### GATE DECISION: ✅ **PASS**

---

### Rationale

All P0 criteria met with 100% coverage and pass rates across critical structural verifications (per-folder `LICENSE.yml` × 3 = 23 entries; 5/5 data-hygiene fixes landed cleanly; bootstrap `LICENSES.md` is a 28-row regression target with correct sort + line endings; `npm test` green within NFR-01 ±20% band at two independent SHAs). All P1 criteria met with 100% coverage (audit-completeness, FR-03 invariant, §16 anti-patterns 16/16). The single P3 (AC-02.1.9 generator-script deferral) is trivially satisfied.

Round-1 Review-Board (Sage / DEE-85) APPROVED with `severity.max = P2`. The single P2 finding (Vitra: architectural tension between AC-02.1.5 "preserve `/polygon` + `minkowski.cc` rows verbatim" and ADR-008 §271 "generator does not emit out-of-tree attribution") is explicitly **non-blocking** — Amelia followed AC-02.1.5 verbatim, the tension is upstream of this PR, and the legal-compliance angle (Boost-licensed `@deepnest/calculate-nfp` ships under unpacked `node_modules/`) makes Vitra's preferred remediation legally risky. Resolution path is captured in DEE-90 (Story 2.2 spec amendment) with three additional P3 nudges (SPDX normalisation, `latolatinfonts.css` placement, schema canonicalisation) bundled into the same scope. A fifth carry-forward (Story 2.1↔3.1 manifest scope decision) is also captured there.

NFR-01 binding evidence is recorded twice: PR run [`24960094498`](https://github.com/Dexus-Forks/deepnest-next/actions/runs/24960094498) on post-fix HEAD `cf831f2` = 18000 ms ∈ [13397, 20096] ms; push-to-main run [`24960135893`](https://github.com/Dexus-Forks/deepnest-next/actions/runs/24960135893) on `d66b8d5` = 16000 ms ∈ band. Defense-in-depth confirms no perf regression slipped past the manifest re-derivation.

Story 2.1 is the **input** for Story 2.3's `licenses:check` determinism gate (Stream-A4); the actual regeneration logic is Story 2.2 (Stream-A3, [DEE-90](/DEE/issues/DEE-90)). This trace closes Stream-A2 cleanly with zero blockers and zero coverage gaps.

---

### Residual Risks (informational)

The 5 carry-forward items live in DEE-90 (Story 2.2 spec amendment). None blocks Story 2.1's quality gate.

| # | Risk Description                                                                                          | Priority | Probability | Impact | Risk Score | Mitigation                                                                              | Remediation                  |
|---|-----------------------------------------------------------------------------------------------------------|----------|-------------|--------|------------|-----------------------------------------------------------------------------------------|------------------------------|
| 1 | In-installer-but-out-of-tree first-party row handling (Vitra P2-01 architectural tension)                 | P2       | High        | Low    | 2          | Story 2.2 generator authoring sees the tension in DEE-90 spec; Boost rows still in tree | DEE-90 (Story 2.2 spec)      |
| 2 | SPDX heterogeneity in first-party block (`GPLv3`, `Boost` non-SPDX)                                       | P3       | High        | Low    | 1          | Bundled into DEE-90 alongside passthrough decision                                       | DEE-90                       |
| 3 | `latolatinfonts.css` row placed in third-party block despite first-party catalogue note                   | P3       | Medium      | Low    | 1          | Schema flag (`first_party: true`) decided in DEE-90                                      | DEE-90                       |
| 4 | Per-LICENSE.yml schema duplication across 3 file headers                                                  | P3       | Medium      | Low    | 1          | Single-source spec adopted in DEE-90                                                     | DEE-90                       |
| 5 | `tests/assets/.fixture-manifest.json` drifts whenever a non-SVG file is added (Story 2.1↔3.1 interaction) | P3       | High        | Low    | 1          | Allow-list scope decided in DEE-90; current cf831f2 fix unblocks merge                   | DEE-90                       |

**Overall Residual Risk:** LOW

---

### Critical Issues (For FAIL or CONCERNS)

— n/a (PASS).

---

### Gate Recommendations

#### For PASS Decision ✅

1. **Stream-A continues:**
   - Story 2.2 (DEE-90) — Stream-A3 generator script — picks up with the 5 carry-forward decisions baked into the spec.
   - Story 2.3 (Stream-A4) — `licenses:check` CI determinism gate — consumes Story 2.2's generator output and Story 2.1's `LICENSES.md` as the regression target.
2. **Post-merge monitoring:**
   - NFR-01 wall-clock continues to be tracked on every Playwright CI run (within ±20% of `rolling_mean_ms = 16746.6 ms`); re-baseline if median drifts > 1 stddev (3066.7 ms) over a 10-run rolling window.
   - `npm run test:fixtures:check` green on every PR (Story 3.1 invariant); the `cf831f2` interaction confirms the gate is sensitive enough to catch fixture-set drift.
3. **Success criteria:**
   - Story 2.2 generator emits a `LICENSES.md` byte-for-byte identical to the file at `d66b8d5` (or to whichever file the Story 2.2 spec amendment names as the new regression target after the 5 carry-forwards land).
   - Story 2.3 `licenses:check` is wired into `npm test` and is the canonical drift gate.

---

### Next Steps

**Immediate Actions** (next 24-48 hours):

1. Cross-link this trace artefact in DEE-91 (this issue), DEE-84 (Story 2.1 DS parent), DEE-85 (Sage Round-1), and PR #19.
2. Confirm DEE-90 (Story 2.2 CS) carries all 5 carry-forward items (Sage Round-1 §"Architectural follow-up" + the Story 2.1↔3.1 manifest scope decision from `cf831f2`).
3. Hand off to John (PM) for Story 2.2 spec amendment scheduling.

**Follow-up Actions** (next milestone/release):

1. Re-trace at Story 2.2 merge (when DEE-90 lands) to verify the 5 carry-forwards are resolved AND the generator reproduces `LICENSES.md` byte-for-byte.
2. Re-trace at Story 2.3 merge (when `licenses:check` is wired into `npm test`) — that trace becomes the **release-gate** input for the FR-02 epic close-out.

**Stakeholder Communication:**

- Notify Mary (BA) / Winston (Architect): Story 2.1 closed PASS with 5 architectural-decision carry-forwards into DEE-90.
- Notify John (PM): Stream-A2 closed; Stream-A3 (DEE-90) is the next critical-path item.
- Notify Amelia (Dev): Story 2.1 trace is the input for Story 2.2's regression target.

---

## Integrated YAML Snippet (CI/CD)

```yaml
traceability_and_gate:
  traceability:
    story_id: "2.1"
    date: "2026-04-26"
    coverage:
      overall: 100
      p0: 100
      p1: 100
      p2: null
      p3: 100
    gaps:
      critical: 0
      high: 0
      medium: 0
      low: 0
    quality:
      passing_tests: 23
      total_tests: 23
      blocker_issues: 0
      warning_issues: 0
    recommendations:
      - "Story 2.2 spec amendment (DEE-90) absorbs 5 carry-forwards: passthrough mechanism + SPDX normalisation + latolatinfonts.css placement + schema canonicalisation + fixture-manifest scope decision"

  gate_decision:
    decision: "PASS"
    gate_type: "story"
    decision_mode: "deterministic"
    criteria:
      p0_coverage: 100
      p0_pass_rate: 100
      p1_coverage: 100
      p1_pass_rate: 100
      overall_pass_rate: 100
      overall_coverage: 100
      security_issues: 0
      critical_nfrs_fail: 0
      flaky_tests: 0
    thresholds:
      min_p0_coverage: 100
      min_p0_pass_rate: 100
      min_p1_coverage: 90
      min_p1_pass_rate: 95
      min_overall_pass_rate: 95
      min_coverage: 80
    evidence:
      test_results_pr: "https://github.com/Dexus-Forks/deepnest-next/actions/runs/24960094498"
      test_results_push: "https://github.com/Dexus-Forks/deepnest-next/actions/runs/24960135893"
      traceability: "_bmad-output/test-artifacts/traceability/2-1-bootstrap-per-folder-license-yml-metadata-regenerate-licenses-md-data-hygiene-fixes-included-trace.md"
      board_report: "projects/deepnest-next/reviews/2-1-bootstrap-per-folder-license-yml-metadata-regenerate-licenses-md-round-1.md"
    next_steps: "Cross-link DEE-91/DEE-84/DEE-85/PR#19; confirm DEE-90 carries 5 follow-ups; hand off Story 2.2 scheduling to John (PM)."
```

---

## Related Artifacts

- **Story File:** `_bmad-output/implementation-artifacts/2-1-bootstrap-per-folder-license-yml-metadata-regenerate-licenses-md-data-hygiene-fixes-included.md`
- **Round-1 Board Report:** `projects/deepnest-next/reviews/2-1-bootstrap-per-folder-license-yml-metadata-regenerate-licenses-md-round-1.md` (Sage / [DEE-85](/DEE/issues/DEE-85))
- **Per-perspective sub-issues:** Aegis [DEE-86](/DEE/issues/DEE-86), Vitra [DEE-87](/DEE/issues/DEE-87), Hermes [DEE-88](/DEE/issues/DEE-88), Lydia [DEE-89](/DEE/issues/DEE-89)
- **Carry-forward issue:** [DEE-90](/DEE/issues/DEE-90) (Story 2.2 CS, captures all 5 follow-ups)
- **Test Results (PR run):** https://github.com/Dexus-Forks/deepnest-next/actions/runs/24960094498
- **Test Results (push-to-main):** https://github.com/Dexus-Forks/deepnest-next/actions/runs/24960135893
- **NFR-01 Baseline:** `_bmad-output/planning-artifacts/nfr01-baseline.json`
- **PRD § FR-02:** `_bmad-output/planning-artifacts/prd.md`
- **Architecture § ADR-008:** `_bmad-output/planning-artifacts/architecture.md` §5
- **Test Files:** `tests/index.spec.ts` (single Playwright spec, unchanged in this story)

---

## Sign-Off

**Phase 1 — Traceability Assessment:**

- Overall Coverage: 100% (10/10)
- P0 Coverage: 100% (6/6) ✅ PASS
- P1 Coverage: 100% (3/3) ✅ PASS
- P3 Coverage: 100% (1/1) ✅ PASS
- Critical Gaps: 0
- High Priority Gaps: 0

**Phase 2 — Gate Decision:**

- **Decision:** ✅ **PASS**
- **P0 Evaluation:** ✅ ALL PASS
- **P1 Evaluation:** ✅ ALL PASS

**Overall Status:** PASS ✅

**Next Steps:**

- Stream-A continues with Story 2.2 (DEE-90) — Stream-A3 generator script. The 5 carry-forwards (Vitra P2-01 passthrough, SPDX normalisation, latolatinfonts.css placement, schema canonicalisation, fixture-manifest scope) are bundled into the Story 2.2 spec amendment scope.
- Story 2.3 (Stream-A4) `licenses:check` CI gate consumes Story 2.2's generator output; this `LICENSES.md` is its byte-for-byte regression target.

**Generated:** 2026-04-26
**Workflow:** testarch-trace v4.0 (post-merge)
**Evaluator:** Murat (TEA — `cb45a95b-ee30-49d2-ae12-8a15cdfb3886`)

---

<!-- Powered by BMAD-CORE™ -->
