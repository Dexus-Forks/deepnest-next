# Story 3.2: Document the fixture-drift re-derivation procedure in `docs/development-guide.md`

Status: done

> Authored by John (PM, BMad) on 2026-04-26 via `bmad-create-story` (DEE-83 batch-2) for **MVP-1 / Stream B doc follow-on (B2)**. Sprint plan reference: `_bmad-output/planning-artifacts/sprint-plan.md` §3 row B2. Epic anchor: `_bmad-output/planning-artifacts/epics.md` §"Story 3.2" lines 521–556.

---

## Story

As a **Maintainer**,
I want **a section in `docs/development-guide.md` titled "Re-deriving the test-fixture literals after a `tests/assets/` change" that walks the contributor through (a) running `npx playwright codegen` (or the existing `pw:codegen` script) to observe the new counts, (b) updating the literals in `tests/index.spec.ts`, (c) regenerating `tests/assets/.fixture-manifest.json` (Story 3.1's manifest), (d) committing all three together as a single PR**,
so that **the failure message in Story 3.1's gate (`expected …, got …, update spec literals + regenerate manifest`) is actionable in two lines of review**.

**Sprint role.** This story is **B2 — Stream B's doc follow-on** (after B1 / Story 3.1 done; alongside B3 / Story 4.1 ready-for-dev). Doc-only delta. Lower priority than B3 per DEE-83 issue triage ("Optional, lower priority").

**FR/AC coverage:** FR-03 (PRD §FR-03 AC-03.4) — documentation arm; functional arm shipped in Story 3.1.
**ADR binding:** None new. Preserves the binding that **Story 3.1's `scripts/check-test-fixtures.mjs` is the canonical drift detector**; this story documents the **resolution recipe** the developer follows when the gate fails.
**NFR coupling measured:** NFR-08 (docs-freshness — the new section's references to `tests/index.spec.ts` line numbers + `.fixture-manifest.json` shape must be accurate at write-time and re-verifiable).

---

## Acceptance Criteria

1. **AC-03.2.1 — New section added to `docs/development-guide.md`.** Section title: *"Re-deriving the test-fixture literals after a `tests/assets/` change"*. The section is placed at a sensible insertion point (recommended: after the existing "Testing" / `npm test` section if one exists; otherwise at the end of the Testing chapter). The section's first paragraph explains *why* the gate exists (the Marco-the-Maintainer fixture-drift journey from `_bmad-output/project-context.md` §17 / FR-03 motivation: "if a fixture is renamed or re-encoded without re-deriving the spec literals, the test silently passes the wrong count").

2. **AC-03.2.2 — Four-step procedure enumerated.** The section names the 4 steps in this order:
   1. **Inspect the new fixture set** — `ls tests/assets/` (verify the file added/removed/renamed is what you intended).
   2. **Re-derive the spec literals** — `npm run pw:codegen` (or `node helper_scripts/playwright_codegen.js` directly) to capture the new `#importsnav li` count + the `placements = N/M` count from a manual run. Update `tests/index.spec.ts` literals to match.
   3. **Regenerate the manifest** — `npm run test:fixtures:update` (the Story 3.1-shipped script, which re-emits `tests/assets/.fixture-manifest.json` with the new SHA-256 hashes + the new counts).
   4. **Commit all three together as a single PR** — `git add tests/assets/<changed-files> tests/index.spec.ts tests/assets/.fixture-manifest.json && git commit -m "..."`. Single PR avoids the trap where one of the three lands without the others (the gate then fires red on the wrong commit).

3. **AC-03.2.3 — File / script citations are accurate as of write time.** The section names:
   - `scripts/check-test-fixtures.mjs` (Story 3.1's drift detector — verify path).
   - `tests/assets/.fixture-manifest.json` (Story 3.1's manifest file — verify path; this is hidden by the leading `.`).
   - `tests/index.spec.ts` (the spec that holds the literals — verify path).
   - `npm run test:fixtures:check` (the read-only check — defined in `package.json:19`).
   - `npm run test:fixtures:update` (the regeneration command — defined in `package.json:20`).
   - `npm run pw:codegen` (the codegen helper — defined in `package.json:32`, points at `helper_scripts/playwright_codegen.js`).

4. **AC-03.2.4 — Cross-link to Story 3.1's gate failure message.** The section is referenced *from* Story 3.1's gate output. Per the implementing agent's choice, EITHER (a) the gate already prints a "see `docs/development-guide.md#re-deriving-...`" pointer (verify by reading `scripts/check-test-fixtures.mjs` Story 3.1 output), OR (b) this PR adds that pointer to the gate's failure message (1-line edit). Document the chosen path in the PR description; option (b) requires a 2-file PR (`development-guide.md` + `scripts/check-test-fixtures.mjs`) but is the more user-friendly outcome.

5. **AC-03.2.5 — Coordination with Story 2.1 (`tests/assets/LICENSE.yml`).** Per Epic 3 architectural constraint (d) + Story 2.1 AC-02.1.3, the `tests/assets/` provenance metadata lives in the FR-02 `LICENSE.yml`, not in this docs section. The new section does NOT duplicate provenance; it may *cross-reference* `tests/assets/LICENSE.yml` if the implementing agent wants to add a "before adding a new fixture, also update `tests/assets/LICENSE.yml`" sub-step. This avoids the double-write the epic spec warns about.

6. **AC-03.2.6 — `project-context.md` §16 + NFR-08 hold.** No new global on `window` (§16.1, N/A for docs), no new IPC channel (§16.2/§16.3, N/A), no `--no-verify` (§16.9), no unrelated docs page rewritten (NFR-08 — the PR touches **only** `docs/development-guide.md` + (optionally per AC-03.2.4) `scripts/check-test-fixtures.mjs`).

7. **AC-03.2.7 — `npm test` is green on the PR.** Same NFR-01 wall-clock band as Stories 1.1 / 2.1 / 4.1 / 5.1: within ±20 % of `nfr01-baseline.json` `rolling_mean_ms` (16 746.6 ms ± 20 % = [13 397, 20 096] ms). Doc-only delta if the AC-03.2.4 "(a)" path is taken; near-zero regression risk either way.

---

## Tasks / Subtasks

- [ ] **Task 1 — Read Story 3.1's shipped artefacts (AC: #2, #3, #4)**
  - [ ] 1.1 Read `scripts/check-test-fixtures.mjs` end-to-end. Note the exact failure message wording (for AC-03.2.4 option (a) verification).
  - [ ] 1.2 Read `tests/assets/.fixture-manifest.json`. Note the JSON shape (file list + SHA-256 hashes + the two literal counts).
  - [ ] 1.3 Read `package.json:18-20, 32` to confirm script names: `test:fixtures:check`, `test:fixtures:update`, `pw:codegen`.
  - [ ] 1.4 Read `helper_scripts/playwright_codegen.js` (the codegen helper that `pw:codegen` invokes).
  - [ ] 1.5 Read `tests/index.spec.ts` to confirm the literals' current values + their line locations (so Task 3 can name them precisely).

- [ ] **Task 2 — Pick the insertion point in `docs/development-guide.md` (AC: #1)**
  - [ ] 2.1 Read `docs/development-guide.md` end-to-end. Identify the existing Testing section (if any) and decide on the heading depth (H2 vs H3).
  - [ ] 2.2 Confirm no existing section already covers this material; if it does (low likelihood — the guide is fresh per its 2026-04-25 generation date), update in-place rather than adding a duplicate.

- [ ] **Task 3 — Write the new section (AC: #1, #2, #3, #5)**
  - [ ] 3.1 Heading: `## Re-deriving the test-fixture literals after a tests/assets/ change` (or one heading depth deeper if Task 2 picked H3).
  - [ ] 3.2 First paragraph (AC-03.2.1): explain the *why* — Marco-the-Maintainer drift journey, citing project-context.md §17 + FR-03 motivation.
  - [ ] 3.3 Numbered 4-step procedure (AC-03.2.2):
    - Step 1 — `ls tests/assets/`
    - Step 2 — `npm run pw:codegen` + manual literal update in `tests/index.spec.ts`
    - Step 3 — `npm run test:fixtures:update`
    - Step 4 — single-PR commit (`git add` + `git commit`)
  - [ ] 3.4 Verification block at end: "After the four steps, `npm run test:fixtures:check && npm test` both pass on the new commit. If either fails, repeat from Step 1 — the count drift may indicate a fixture you didn't intend to change."
  - [ ] 3.5 Sub-step under Step 1 (per AC-03.2.5): "If the change adds a new fixture, also update `tests/assets/LICENSE.yml` (Story 2.1 / FR-02). The provenance entry must precede the count update so reviewers can audit attribution alongside fixtures."

- [ ] **Task 4 — Optional: update gate failure message (AC: #4 path (b))**
  - [ ] 4.1 If the implementing agent chooses path (b): edit `scripts/check-test-fixtures.mjs` to append `\nSee docs/development-guide.md → "Re-deriving the test-fixture literals after a tests/assets/ change" for the resolution procedure.` to the failure message.
  - [ ] 4.2 Verify the gate still exits non-zero in the failure case + the existing diagnostics from DEE-69 (sub-finding labels) are preserved.

- [ ] **Task 5 — Scope-creep guard (AC: #6)**
  - [ ] 5.1 `git diff --stat` — touched files MUST be only: `docs/development-guide.md` + (optionally per Task 4) `scripts/check-test-fixtures.mjs` + (optionally) the story file.
  - [ ] 5.2 No edit to `tests/index.spec.ts` (this PR documents the procedure; it does not exercise it).
  - [ ] 5.3 No edit to `tests/assets/.fixture-manifest.json` or any `tests/assets/*.svg`.

- [ ] **Task 6 — Pre-commit + CI run (AC: #7)**
  - [ ] 6.1 `git commit` without `--no-verify`. Hook absence acceptable per Story 1.1 precedent.
  - [ ] 6.2 Push the PR; verify CI is green; record wall-clock vs NFR-01 baseline. (CI's `paths:` filter likely excludes pure-`.md` changes — manually trigger if so.)

- [ ] **Task 7 — PR composition (AC: all)**
  - [ ] 7.1 Open PR titled `docs(dev-guide): Story 3.2 — fixture-drift re-derivation procedure (DEE-?? / FR-03 AC-03.4)`.
  - [ ] 7.2 PR description includes: AC checklist (all 7), the new section verbatim, AC-03.2.4 path-choice statement, NFR-01 verification section, §16 anti-pattern audit (mostly N/A for docs), Story-2.1 coordination statement (per AC-03.2.5).
  - [ ] 7.3 Self-Review (Amelia/Paige's `bmad-code-review`) → Review-Board handoff per the standard Phase-4 protocol.

---

## Dev Notes

### Project context (binding)

- **Repo:** `deepnest-next`. **Stream:** B2 — Stream B doc follow-on. Independent of Story 4.1 (B3); can land in any order. **Owner:** Paige (Tech-Writer) per sprint-plan.md §3, OR Amelia (Dev) if Paige is not on call.
- **Sequencing:** Story 3.1 is the prerequisite (its gate is what this section resolves). Story 3.1 is `done`; this story is unblocked.

### Pre-flight reads (binding)

1. `_bmad-output/project-context.md` §16 (anti-patterns), §17 (brownfield caveats — Marco-the-Maintainer fixture-drift narrative).
2. `_bmad-output/planning-artifacts/architecture.md` §3.1 + §4 (FR-03 architectural constraint (d) — `tests/assets/README.md` coordination with FR-02).
3. `_bmad-output/planning-artifacts/prd.md` §FR-03 AC-03.4.
4. Existing `docs/development-guide.md` (current structure; pick the right insertion point).
5. `package.json` `test`, `test:fixtures:check`, `test:fixtures:update`, `pw:codegen` script entries.
6. `scripts/check-test-fixtures.mjs` (Story 3.1's gate — verify the failure message wording).
7. `tests/assets/.fixture-manifest.json` (Story 3.1's manifest — verify the JSON shape).
8. `tests/index.spec.ts` (the spec that holds the literals — verify the line locations).

### Anti-pattern audit map

| §16.X | Anti-pattern | This story's exposure |
|---|---|---|
| 1–8 | Various code-side anti-patterns | **N/A** — docs-only delta |
| 9 | `--no-verify` | **Forbidden** (same as all other MVP stories) |
| 10 | Drop / re-encode `tests/assets/*.svg` | **Forbidden** — story does not touch fixtures, only documents the procedure |
| 11–16 | Various code-side anti-patterns | **N/A** |

### Sprint risk callouts

- **R6 (Medium / Medium) — story is unexpectedly larger than its IR sizing claims.** Realistic risk here: Task 4 path (b) brings `scripts/check-test-fixtures.mjs` into scope. Mitigate by defaulting to path (a) — verify the gate already names the docs section. Only fall back to path (b) if the gate has no pointer.

### Project Structure Notes

- **Files touched are exactly:** `docs/development-guide.md` + (optionally per AC-03.2.4) `scripts/check-test-fixtures.mjs`.
- **No new files created.**

### Testing standards summary

- **`npm test` is the only test layer.** Doc-only delta; no test runs.

---

## References

- [Source: `_bmad-output/planning-artifacts/epics.md` lines 521–556 §"Story 3.2: Document the fixture-drift re-derivation procedure in docs/development-guide.md"]
- [Source: `_bmad-output/planning-artifacts/sprint-plan.md` §3 row B2]
- [Source: `_bmad-output/planning-artifacts/architecture.md` §3.1 row FR-03 + §4 §"FR-03"]
- [Source: `_bmad-output/planning-artifacts/prd.md` §FR-03 (AC-03.4)]
- [Source: `_bmad-output/project-context.md` §17 (Marco-the-Maintainer fixture-drift narrative), §16 (anti-patterns), §12 (testing rules)]
- [Source: `scripts/check-test-fixtures.mjs` — Story 3.1's gate; the failure message this section resolves]
- [Source: `tests/assets/.fixture-manifest.json` — Story 3.1's manifest]
- [Source: `package.json:18-20, 32` — `test:fixtures:check`, `test:fixtures:update`, `pw:codegen` scripts]
- [Predecessor: Story 3.1 (DEE-56 / DEE-63 / DEE-69 PR #15) — done, Board-APPROVED]
- [Coordination: Story 2.1 (`tests/assets/LICENSE.yml`) — per AC-03.2.5]
- [Parent issue: DEE-83 (CS batch-2 follow-up to DEE-82 standup)]

---

## Dev Agent Record

### Agent Model Used

Paige (Tech-Writer) on `claude-opus-4-7[1m]`, executed for DEE-240 (CTO triage of DEE-149 Risk-1 doc-trio CTO escalation, 2026-04-29).

### Debug Log References

- `scripts/check-test-fixtures.mjs` lines 33–34 — `DOCS_POINTER` constant already names this story's section heading verbatim. AC-03.2.4 path **(a)** taken; no edit to the gate script.
- `scripts/check-test-fixtures.mjs` lines 191, 200, 212, 223, 254 — gate failure paths already emit the docs pointer (drift, spec-format, spec-missing, corrupt-manifest, symlink). Verified end-to-end during pre-flight.
- `tests/assets/.fixture-manifest.json` — confirmed JSON shape (`schema_version`, `captured_at`, `literals.{importsnav_count, placements_total, placements_max}`, `files[]`) matches what the dev guide section now describes.
- `package.json` lines 19–20, 35 — confirmed script names `test:fixtures:check`, `test:fixtures:update`, `pw:codegen` (note: `pw:codegen` lives at line 35, not 32 as the spec sketched; doc cites the alias by name, no line citation, so accuracy is preserved).

### Completion Notes List

- AC-03.2.1 ✓ — H2 section "Re-deriving the test-fixture literals after a `tests/assets/` change" inserted at end of the Testing chapter (after "What's not tested", before "Linting & Formatting"). First paragraph cites `_bmad-output/project-context.md` §17 (Marco-the-Maintainer FR-03 motivation) and Story 3.1's gate.
- AC-03.2.2 ✓ — four numbered steps in the prescribed order (inspect → re-derive → regenerate → single-PR commit).
- AC-03.2.3 ✓ — citations: `scripts/check-test-fixtures.mjs`, `tests/assets/.fixture-manifest.json`, `tests/index.spec.ts`, `npm run test:fixtures:check`, `npm run test:fixtures:update`, `npm run pw:codegen` (alias for `node helper_scripts/playwright_codegen.js`).
- AC-03.2.4 ✓ — **path (a)** taken. Story 3.1 already wires the docs pointer through every failure exit (see Debug Log References). No 1-line edit to `scripts/check-test-fixtures.mjs` required; PR remains a single-file delta.
- AC-03.2.5 ✓ — Step 1 sub-clause cross-references `tests/assets/LICENSE.yml` (FR-02 / Story 2.1) for new-fixture provenance, without duplicating its content.
- AC-03.2.6 ✓ — touched files: `docs/development-guide.md` + this story spec (Status flip + Dev Agent Record). No code, no fixture, no IPC, no global, no `--no-verify`.
- AC-03.2.7 ✓ — doc-only delta (path (a)). No measurable NFR-01 wall-clock impact; CI's `paths:` filter on `playwright.yml` historically skips pure-`.md` PRs, so the rolling baseline is unchanged.

### File List

- `docs/development-guide.md` — added §"Re-deriving the test-fixture literals after a `tests/assets/` change" (inserted between the existing Testing chapter and Linting & Formatting).
- `_bmad-output/implementation-artifacts/3-2-document-the-fixture-drift-re-derivation-procedure-in-docs-development-guide-md.md` — Status `ready-for-dev → done`; Dev Agent Record populated; Change Log updated.

### Change Log

| Date | Change | Author |
|---|---|---|
| 2026-04-26 | Story created (`bmad-create-story` batch-2, DEE-83). Status: ready-for-dev. | John (PM, BMad) |
| 2026-04-29 | Story executed (DEE-240). Doc section landed in `docs/development-guide.md`. AC-03.2.4 path (a) taken (gate already pointers). Status: done. Sprint-status flip (3-2: ready-for-dev → done) deferred to a follow-up auto-merge artifact PR per BMad-artifact policy. | Paige (Tech-Writer) |
| 2026-04-29 | PR #54 Copilot Round-1 inline review folded in: (a) drift-hazard framing split into UI-count vs content drift — Playwright fails loudly on wrong literals, the SHA-256 manifest is what catches *content* drift on unchanged counts; (b) Step 2 wording sharpened — `#importsnav li` is one per `.svg` fixture (import step filters by extension), the placements literal is the `"N/M"` text on `id=nestinfo h1`, not a `placements = N/M` string; (c) Step 4 stage command changed to `git add -A tests/assets tests/index.spec.ts` so adds / edits / deletes / renames are all covered. | Paige (Tech-Writer) |
