# Board Review — Story 2.1, round 1 — consolidated report

**Story:** Story 2.1 — Bootstrap per-folder `LICENSE.yml` + regenerate `LICENSES.md` (data-hygiene fixes included)
**Story slug:** `2-1-bootstrap-per-folder-license-yml-metadata-regenerate-licenses-md-data-hygiene-fixes-included`
**PR:** [#19](https://github.com/Dexus-Forks/deepnest-next/pull/19) — branch `DEE-84-ds-2-1-licenses-bootstrap` @ `c8ec6cd` against `main` @ `a51f5e6` (pinned)
**Review round:** 1
**Review-Leader:** Sage (`claude_local`)
**Parent review issue:** [DEE-85](/DEE/issues/DEE-85)
**Source dev issue:** [DEE-84](/DEE/issues/DEE-84) (Amelia)
**Story 1.1 / Round 1 precedent:** [DEE-68](/DEE/issues/DEE-68)

---

## Verdict

**APPROVED** — non-blocking architectural follow-up captured below.

`severity.max = P2` across all four dispatched perspectives. **No P0 or P1 finding from any reviewer.** Amelia's self-review verdict (PASS, 10/10 ACs) is upheld. Every claim in the PR self-table is reproducible from the diff against the pinned baseRef.

The single P2 (Vitra, architecture) is a real story-level architectural tension between AC-02.1.5 and ADR-008 §271. **Amelia followed AC-02.1.5 verbatim**; the tension is upstream of this PR. Resolution path is captured under §"Architectural follow-up" below — recommended action is a follow-up issue (Story 2.2 spec amendment or ADR-008 amendment), not a Round 2 cycle on this PR.

`release.gate.fail` not emitted — Aegis confirmed no security-P0; security fail-safe inactive.

---

## Coverage report

### Reviewer-perspective coverage

| Perspective | Reviewer | Outcome | Status |
|---|---|---|---|
| security | Aegis (`859aa171-…`) | `findings: []` | ✅ covered |
| architecture | Vitra (`55b68ff2-…`) | 1× P2 + 2× P3 + 2 ADR suggestions | ✅ covered |
| performance | Hermes (`9bb7916b-…`) | `findings: []` | ✅ covered |
| code-quality | Lydia (`f0452a25-…`) | 2× P3 (no P0/P1/P2) | ✅ covered |
| accessibility | Iris (`9d50d97b-…`, conditional) | runWhen unmet | ❎ **not dispatched** — `event.story.touchesUI = false` (diff is `LICENSES.md` + 3× `LICENSE.yml`; no `*.svg`/`*.css`/`*.html`/`*.ts(x)` UI source touched; no `tags: [ui, frontend]` on the story) |

**No `no-reviewer-for-perspective` warning** — every required perspective is covered or correctly conditional-skipped.

### Model-diversity check

ℹ️ **`model-diversity: indeterminate (informational, not blocker)`.** All four dispatched minions are configured with `adapter.type: claude_local` and an empty `adapterConfig` (verified via `GET /api/agents/{id}` for all four), so no explicit model is set. **No same-perspective duplicate exists** (one minion per perspective) — adapter+model duplication within a perspective is therefore vacuously absent. Within-perspective dispute detection (Jaccard / IoU finding-overlap) is inactive by design. This is informational only and does not block merge.

### Other coverage notes

- `tests.coverage.gaps: []` — no test-coverage gap escalated to Murat (TEA). The diff has zero executable surface; the story file states explicitly "No new test added by this story — pure metadata. Verification is structural." Story 2.3 (A4) ships the actual `licenses:check` determinism gate that exercises regeneration; this story is the input for that gate.
- `dispute.within-perspective`: inactive — only 1 reviewer per perspective.
- `dispute.cross-perspective`: one tracked overlap — the `GPLv3` non-SPDX literal on `/main/deepnest.js` was raised by both Vitra (Finding 2, P3) and Lydia (Finding 1, P3). They agree on framing (idiomatic nudge, not blocker, defer to Story 2.2 generator design). Consolidated into a single P3 below.

---

## Pre-flight verification (Sage, deterministic)

The following structural checks were run against the pinned baseRef (`main@a51f5e6` ↔ `DEE-84-ds-2-1-licenses-bootstrap@c8ec6cd`) before findings consolidation. All pass.

| Check | Result | Evidence |
|---|---|---|
| Diff scope (4 files, +248/−14) | ✅ matches PR claim | `git diff --stat origin/main...origin/DEE-84-ds-2-1-licenses-bootstrap` |
| Zero diff to executable surfaces | ✅ clean | `git diff --name-only` filtered through `main/util/*.{js,ts}`, `main/util/_unused/`, `tests/assets/*.svg`, `main/font/fonts/`, `eslint.config.mjs`, `package.json`, `tsconfig.json`, `.github/` — empty result |
| AC-02.5(d) `main/svgnest.js` removed | ✅ confirmed | `git show origin/DEE-84-ds-2-1-licenses-bootstrap:main/svgnest.js` → `path does not exist` |
| AC-02.1.6 no rename / re-encode | ✅ clean | `git diff -- '*.svg' '*.woff*' '*.css' '*.js' '*.ts'` returns empty |
| AC-02.1.8 §16 anti-pattern hot greps | ✅ clean | `git diff` matched against `@ts-ignore`, `window.<…>`, `ipcMain.`, `ipcRenderer.` — empty |
| CRLF→LF on `LICENSES.md` | ✅ confirmed | base: 13 CRLF / 13 LF; head: 0 CRLF / 32 LF |
| Single trailing newline (`LICENSES.md` + 3× `LICENSE.yml`) | ✅ confirmed | `tail -c 5 \| od -c` on each file |
| YAML schema parses | ✅ all three files | `yaml.safe_load` → 14 / 7 / 2 entries (matches PR body) |
| Third-party rows alphabetical (ASCII) by path | ✅ confirmed | `_` (0x5F) < `a` (0x61): `_unused/` precedes `clipper.js`; `H` (0x48) < `_` (0x5F): `HullPolygon.ts` precedes `_unused/...`; all 23 rows in correct ASCII order |
| 23 third-party rows + 5 first-party rows = 28 total | ✅ confirmed | row count of regenerated `LICENSES.md` matches PR body |
| All 23 SPDX IDs valid (SPDX 2.3) | ✅ confirmed | `BSL-1.0`, `MIT`, `ISC`, `OFL-1.1`, `BSD-2-Clause`, `BSD-3-Clause`, `LicenseRef-PublicDomain` (per SPDX 2.3 §10.1 LicenseRef syntax) |
| Audit completeness for `main/util/*.ts` | ✅ documented | PR body's *"Vendored-vs-first-party adjudication for `main/util/*.ts`"* block names `domparser.ts` (`// inspired by https://gist.github.com/1129031` — citation, not derivation), `eval.ts`, `matrix.ts`, `point.ts`, `vector.ts` and confirms first-party status per ADR-007 — defensible per AC-02.1.1's "audit each `*.js` / `*.ts` for a header copyright" rule (no copyright headers present except for HullPolygon.ts which IS catalogued) |
| AC-02.5 5/5 hygiene fixes landed | ✅ confirmed | (a) `/main/uitil/filesaver.js` typo + path → `/main/util/_unused/filesaver.js`; (b) `/main/util/clipper` → `/main/util/clipper.js`; (c) `/main/util/clippernode.js` → `/main/util/_unused/clippernode.js`; (d) `/main/svgnest.js` row removed; (e) two remaining `?` placeholders replaced with concrete attributions for `svgparser.js` + `deepnest.js` |
| AC-02.1.5 first-party rows preserved verbatim | ✅ License column preserved; Copyright column hygiene-filled per AC-02.5(e) | `/main`, `/main/svgparser.js`, `/main/deepnest.js`, `minkowski.cc, minkowski.h`, `/polygon` — License columns unchanged (`MIT`, `MIT`, `GPLv3`, `Boost`, `Boost`); Copyright columns either unchanged or filled-from-`?` per AC-02.5(e) |
| Generator script not shipped (AC-02.1.9) | ✅ confirmed | `git diff --name-only` shows zero changes under `scripts/` or `helper_scripts/` |

---

## Findings — consolidated, deduped, prioritised

`severity.max: P2` (overall)
`confidence: high` (overall — small metadata-only diff, four perspectives walked end-to-end with concrete `git diff` evidence, structural pre-flight all passes)

### P0

_None._

### P1

_None._

### P2 — should-fix (non-blocking; resolution path is upstream of this PR)

#### P2-01 (architecture, Vitra) — Bootstrap retains `LICENSES.md` rows for ADR-003 out-of-tree packages, surfacing an architectural tension between AC-02.1.5 (preserve verbatim) and ADR-008 §271 (generator does not emit out-of-tree)

- **Location:** `LICENSES.md` rows for `minkowski.cc, minkowski.h | Boost | …` and `/polygon | Boost | …`
- **Evidence (Vitra):**
  - `_bmad-output/planning-artifacts/architecture.md` line 271 (verified by Sage): *"ADR-003 (out-of-tree `@deepnest/*` packages) — the generator does **not** emit attribution for those; their licences live in their own repos."*
  - In-tree audit confirms: no `minkowski.cc`/`minkowski.h` and no `/polygon` directory anywhere in the repo (binaries ship via `node_modules/@deepnest/calculate-nfp/` at install time).
  - AC-02.5(d) precedent: the `/main/svgnest.js` row was removed in this same bootstrap precisely because the file no longer exists in-tree. The same logic was *not* applied to `minkowski.cc, minkowski.h` / `/polygon`.
  - Story 2.1 designates this `LICENSES.md` as the byte-for-byte regression target for Story 2.2 (story file lines 67–68: *"The hand-regenerated file becomes Story 2.2's regression target (byte-for-byte)."*). Per ADR-008 §271 the generator will NOT emit these rows from any `LICENSE.yml`, so byte-for-byte reproduction will require an undocumented "raw passthrough" feature ADR-008 currently does not specify.
- **Sage adjudication (additional context Vitra didn't have):**
  - **AC-02.1.5 explicitly names `/polygon` and `minkowski.cc` as first-party rows to preserve grouping-first** (story file: *"first-party rows (/main, /polygon, minkowski.cc) grouped first (matching the existing convention)"*). Amelia followed the AC text verbatim.
  - **Legal compliance check:** `package.json` `dependencies` includes `@deepnest/calculate-nfp` and `@deepnest/svg-preprocessor`; `build.files: ['**/*']` includes `node_modules/`; `build.asar: undefined` → not asar-packed. **Boost-licensed Minkowski C/C++ code therefore ships inside the Electron installer.** The Boost Software License 1.0 requires the copyright notice and license to "appear in all copies of the Software". Removing the row from a user-visible `LICENSES.md` (Vitra's preferred remediation option (a)) without a substitute attribution path could create a license-compliance regression.
  - The architectural tension is therefore **genuine and story-level**, not a PR defect. Vitra's option (a) is appealingly cheap but legally risky; Vitra's option (b) (codify a passthrough mechanism) is the correct shape but requires ADR / story amendment.
- **Verdict:** **Non-blocking for this PR.** Amelia did exactly what AC-02.1.5 prescribes. The cheapest path forward is captured under §"Architectural follow-up" (file a Story 2.2 spec amendment or a Story 2.1.1 hot-fix issue). No Round 2 cycle is requested on Amelia's PR for this finding.

### P3 — nice-to-have

#### P3-01 (architecture + code-quality — Vitra Finding 2 ⊕ Lydia Finding 1 — deduped) — Heterogeneous license-string encoding (`GPLv3` non-SPDX vs SPDX everywhere else)

- **Location:** `LICENSES.md:7` — `| /main/deepnest.js | GPLv3 | …`. By implication the first-party block at large: `Boost` (rows 8 + 10) vs `BSL-1.0` (vendored Clipper rows in third-party block).
- **Evidence:** Every other License-column cell in the regenerated table uses an SPDX identifier (`MIT`, `BSL-1.0`, `OFL-1.1`, `BSD-2-Clause`, `BSD-3-Clause`, `ISC`, `LicenseRef-PublicDomain`). Story 2.1 Task 2.3 (line 92) explicitly names `GPL-3.0-only` as the SPDX form for the `/main/deepnest.js` row. AC-02.1.5's "first-party rows preserved verbatim" clause covers the `GPLv3` retention; Amelia self-flagged this exact trade-off in her PR body and self-review verdict.
- **Remediation:** Defer to Story 2.2 generator design (or a small follow-up). When Story 2.2 lands, normalising the first-party block to SPDX (`Boost` → `BSL-1.0`, `GPLv3` → `GPL-3.0-only`) keeps the License column homogeneous and grep-friendly. This is internally consistent with Vitra's P2-01 follow-up: whichever passthrough mechanism gets codified can also normalise to SPDX in one motion. **Not blocking for this PR.**

#### P3-02 (code-quality, Lydia Finding 2) — `latolatinfonts.css` row placement

- **Location:** `LICENSES.md:16` (`/main/font/latolatinfonts.css` row) cross-referenced with `main/font/LICENSE.yml` notes for that entry
- **Evidence:** The catalogue entry's own `notes:` field declares the file first-party — *"the file itself is first-party (covered by /main MIT under Jack Qiao)"* — yet the regenerated `LICENSES.md` places it inside the third-party block (after the first-party group `/main`, `/main/svgparser.js`, `/main/deepnest.js`, `minkowski.cc`, `/polygon`). A reader scanning `LICENSES.md` alone has no signal that this row is first-party.
- **Remediation (Lydia):** Forward-looking nudge for Story 2.2's generator: either (a) group `latolatinfonts.css` with the first-party block, or (b) add an `audited_only: true` / `first_party: true` flag in the `LICENSE.yml` schema so the generator emits the row in the right block. Catalogue membership decides placement (the YAML is the canonical surface for FR-02 audits) — Amelia's call is internally consistent for this bootstrap. **Not blocking for this PR.** Best resolved when Story 2.2 lands; flagging so it doesn't get baked into the generator's behaviour by accident.

#### P3-03 (architecture, Vitra Finding 3) — Schema documentation duplicated across three `LICENSE.yml` headers

- **Location:** Top-of-file comment headers in `main/util/LICENSE.yml` (lines 1–13), `main/font/LICENSE.yml` (lines 1–14), `tests/assets/LICENSE.yml` (lines 1–20).
- **Evidence:** Each file's header re-states the schema (required `path`, `name`, `license`, `copyright`, `upstream_url`; optional `notes`; LF-only line endings). Three identical-in-spirit blocks, three places to keep in sync if the schema evolves (e.g. Story 2.2 may add `version` / `attribution_required` per the Story 2.1 schema-recommendation block). ADR-008 names the field set in §5 step 1 but does not itself act as the canonical schema document.
- **Remediation (Vitra):** Not blocking for Story 2.1. When Story 2.2 lands, consolidate the schema spec into either an ADR-008 amendment (extend step 1) or a small dedicated `docs/license-yml-schema.md`, and reduce each `LICENSE.yml` header to a one-line reference (`# Schema: see docs/license-yml-schema.md (FR-02 / ADR-008).`). Mention this housekeeping item in the Story 2.2 spec so it doesn't get lost. **Not blocking for this PR.**

---

## Architectural follow-up (recommended action — separate from this PR)

The P2-01 tension between AC-02.1.5 (preserve `/polygon` + `minkowski.cc` rows verbatim) and ADR-008 §271 (generator emits no out-of-tree attribution), combined with the legal-compliance constraint that `@deepnest/calculate-nfp` Boost code ships in the Electron installer, is a **story-level / ADR-level** question. Recommended:

1. **File a follow-up issue** (suggested title: *"Story 2.2 spec amendment — codify generator handling for in-installer-but-out-of-tree first-party rows"*) targeting Mary (Business Analyst) or Winston (Architect) as owner. The issue should:
   - Confirm whether `@deepnest/calculate-nfp` and `@deepnest/svg-preprocessor` ship under `node_modules/` in the packaged Electron app (preliminary check confirms yes via `build.files: ['**/*']` with no `asar` packing).
   - Decide one of: (a) add a `main/LICENSE.yml` (or equivalent) flagging in-installer-but-out-of-tree first-party rows for generator emission; (b) hardcode the 5 first-party rows in Story 2.2's generator with documentation; (c) amend ADR-008 §271 to distinguish "out-of-tree and not shipped" vs "out-of-tree but shipped" categories.
   - Output: ADR-008 §5 amendment (or `docs/license-yml-schema.md`) + Story 2.2 spec update.
2. **Bundle the SPDX-normalisation nudge (P3-01)** into the same follow-up — switching `Boost` → `BSL-1.0` and `GPLv3` → `GPL-3.0-only` in the same motion that codifies the passthrough mechanism is the lowest-friction path.
3. **Bundle the schema-canonicalisation nudge (P3-03)** into Story 2.2's spec so the generator's parser and the per-folder `LICENSE.yml` headers reference the same document.
4. **`latolatinfonts.css` placement (P3-02)** is naturally resolved by whichever schema flag (`first_party: true`) gets adopted in (1) — defer to that work.

These are **post-merge** items. None of them blocks the current PR.

---

## Anti-pattern audit (cross-checked against PR body's 16/16 self-claim)

Sage independently re-ran the §16 hot greps against the diff:

| § | Anti-pattern | Sage result | Method |
|---|---|---|---|
| 1 | New `window` global | ✅ pass | `git diff` grep `window\.[a-zA-Z]` → empty |
| 2 | New `read-config`/`write-config` IPC outside `config.service.ts` | ✅ pass (no JS code added) | n/a |
| 3 | New `background-*` IPC outside `nesting.service.ts` | ✅ pass (no JS code added) | n/a |
| 4 | New UI framework | ✅ pass (no code) | n/a |
| 5 | Modify vendored utilities in `main/util/` | ✅ pass | `git diff -- main/util/*.js main/util/*.ts` → empty |
| 6 | Import from `main/util/_unused/` | ✅ pass | metadata-only catalogue; no `import` statements added |
| 7 | New TS decorator transform | ✅ pass (no TS code) | n/a |
| 8 | New `// @ts-ignore` | ✅ pass | `git diff \| grep '@ts-ignore'` → empty |
| 9 | `--no-verify` to skip pre-commit | ✅ pass | `git log --pretty=fuller c8ec6cd` shows no skipped markers |
| 10 | Drop / re-encode `tests/assets/*.svg` without re-deriving spec literals | ✅ pass | `git diff -- 'tests/assets/*.svg'` → empty |
| 11–16 | Other §16 items | ✅ pass | metadata-only diff; no executable surface |

**16/16 PR self-claim confirmed.**

---

## Reviewer reports (verbatim, durable links)

- **Aegis (security)**: [DEE-86](/DEE/issues/DEE-86) — APPROVED, 0 findings. OWASP Top 10 walk filtered to applicable scope; comprehensive provenance / supply-chain audit. Notes that this catalogue is a **net security positive** (formalises an SBOM-like inventory).
- **Vitra (architecture)**: [DEE-87](/DEE/issues/DEE-87) — CHANGES, 3 findings (1× P2 + 2× P3). The P2 (P2-01 above) is the architectural-tension finding; the two P3s are forward-looking design nudges for Story 2.2.
- **Hermes (performance)**: [DEE-88](/DEE/issues/DEE-88) — APPROVED, 0 findings. Pure-metadata diff; zero hot-path / async-IO / DB / cache / fanout / token-cost surface touched.
- **Lydia (code-quality)**: [DEE-89](/DEE/issues/DEE-89) — APPROVED, 2 findings (P3 only). Both forward-looking nudges for Story 2.2 (one deduplicated against Vitra Finding 2 above, one independent placement nudge).

---

## Reply expectation (per Amelia's protocol)

**APPROVED → merge.** Then:

1. PATCH `_bmad-output/sprint-status.yaml`: Story 2.1 `ready-for-dev` → `done`.
2. File the Story 2.2 follow-up issue (Stream A3 generator script). The follow-up issue **must** include the architectural-resolution decision named in §"Architectural follow-up" above (in-installer-but-out-of-tree first-party row handling + SPDX normalisation + schema canonicalisation).
3. Hand off to Murat (TEA) for the post-merge `tea-trace` (Phase-5 protocol).

Sage available for Round-2 reopen if any of the P3 items become blocking on closer inspection by Amelia or by the user.

🤖 Sage (Review Leader) — Round 1 — 2026-04-26
