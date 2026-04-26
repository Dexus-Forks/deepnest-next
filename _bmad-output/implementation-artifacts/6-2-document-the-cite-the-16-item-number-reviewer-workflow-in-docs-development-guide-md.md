# Story 6.2: Document the "cite the §16 item number" reviewer workflow in `docs/development-guide.md`

Status: ready-for-dev

> Authored by John (PM, BMad) on 2026-04-26 via `bmad-create-story` (DEE-83 batch-2) for **MVP-1 / Stream C doc follow-on (C3)**. Sprint plan reference: `_bmad-output/planning-artifacts/sprint-plan.md` §3 row C3. Epic anchor: `_bmad-output/planning-artifacts/epics.md` §"Story 6.2" lines 820–854.

---

## Story

As a **new contributor whose PR was flagged for an anti-pattern violation**,
I want **a short section in `docs/development-guide.md` titled "Resolving an anti-pattern flag in PR review" that explains the reviewer's "cite the §16 item number" convention (e.g. *"§16.1 — no new globals on window"* → *"rename your `window.thing` to a local module export and re-request review"*)**,
so that **a contributor can resolve the flag in a single-line lookup, not a multi-thread back-and-forth**.

**Sprint role.** This story is **C3 — Stream C's third item** (after C1 / Story 6.1 done; alongside C2 / Story 5.1 ready-for-dev). Doc-only delta. Lower priority than C2 per DEE-83 issue triage ("Optional, lower priority"). Closes the Epic 6 loop on Story 6.1 (C1) by codifying the reviewer-side workflow.

**FR/AC coverage:** FR-06 (PRD §FR-06) — documentation arm; functional arm (PR template) shipped in Story 6.1.
**ADR binding:** None new. **Preserves the binding rule** that `_bmad-output/project-context.md` §16 is the canonical anti-pattern list.
**NFR coupling measured:** NFR-03 (anti-patterns — this story documents the resolution recipe so violations are easy to clear); NFR-08 (docs-freshness — the new section's §16 references must be accurate at write-time and re-verifiable).

---

## Acceptance Criteria

1. **AC-06.2.1 — New section added to `docs/development-guide.md`.** Section title: *"Resolving an anti-pattern flag in PR review"*. The section is placed at a sensible insertion point (recommended: after the "Adding a new vendored library" section from Story 2.4 if it exists at write-time; otherwise inside the existing "Contributing" / "Reviews" chapter; otherwise at the end of the guide). Document the chosen placement in the PR description.

2. **AC-06.2.2 — The section explains the "§16.X — short label" convention.** First paragraph names the convention: *"When a reviewer cites `§16.X — <short label>` on your PR (e.g. `§16.1 — no new globals on window`), they're pointing at a specific item in `_bmad-output/project-context.md` §16. The number `X` and the short label are the canonical handle — use them when discussing the flag."* Per FR-06 architectural constraint (c).

3. **AC-06.2.3 — Two or three concrete examples.** Each example shows (a) the reviewer's flag wording, (b) the contributor's resolution path. Recommended examples (pick 2–3, prefer the most-likely-during-MVP set per epics.md §"Story 6.2"):
   - **§16.1 — no new globals on window.** Flag: *"You added `window.foo = ...` in `main/ui/.../bar.ts:42` — see §16.1."* Resolution: *"Replace the `window.foo` assignment with a local module export. Re-request review."*
   - **§16.8 — no new `// @ts-ignore`.** Flag: *"`tsc --noEmit` would error here without the `@ts-ignore` you added — see §16.8."* Resolution: *"Extend the type instead of suppressing the error (see Story 5.1 for the pattern). Re-request review."*
   - **§16.9 — no `--no-verify` commits.** Flag: *"`git log --pretty=fuller` shows your last commit was made with `--no-verify` — see §16.9."* Resolution: *"`git reset HEAD~1`, fix the pre-commit failure, recommit without the flag. Re-request review."*
   - **§16.5 — no edits to vendored utilities in `main/util/`** (alternative example if Story 5.1 reuse is undesirable).
   - **§16.10 — do not drop / re-encode `tests/assets/*.svg`** (alternative example linking to Story 3.2's procedure).

4. **AC-06.2.4 — Cross-link to Story 6.1's PR template.** The section names where the §16 reference lives in the PR template: *"The PR template (`.github/pull_request_template.md`, shipped in Story 6.1) names the §16 self-check inline. If your PR was opened before Story 6.1 shipped, your PR description does not include the checklist — please add the §16 self-check inline (or rebase to pick up the template)."* This sentence may be conditionally elided once the template is universally adopted (likely already the case at write-time).

5. **AC-06.2.5 — §16 references are accurate (NFR-08).** Verify each example's §16 item number against the **current** `_bmad-output/project-context.md` `## 16. Critical anti-patterns — DO NOT do these` section (line 260+). If the numbering has shifted since 2026-04-26, update accordingly. The section MUST not reference an item number that does not exist.

6. **AC-06.2.6 — Coordination with Story 3.2 (fixture-drift section).** If both Story 3.2 and this story land in the same release wave, the resolution sub-bullet for §16.10 should cross-reference Story 3.2's "Re-deriving the test-fixture literals after a `tests/assets/` change" section by name. If Story 3.2 has not yet shipped at write-time, the example may use a forward reference + a `TODO: link once 3.2 lands` marker to be resolved before merge.

7. **AC-06.2.7 — `project-context.md` §16 + NFR-08 hold.** No unrelated docs page rewritten. The PR touches **only** `docs/development-guide.md`. No `--no-verify`. No new `window` global / IPC channel / `@ts-ignore` (all N/A for docs).

8. **AC-06.2.8 — `npm test` is green on the PR.** Same NFR-01 wall-clock band as the other doc story (3.2). Doc-only delta; near-zero regression risk.

---

## Tasks / Subtasks

- [ ] **Task 1 — Read the source surface (AC: #2, #3, #5)**
  - [ ] 1.1 Read `_bmad-output/project-context.md` §16 in full (16 items). Note the **current** item numbers + short labels (verify against the file as-of write time, not as-of 2026-04-26).
  - [ ] 1.2 Read `.github/pull_request_template.md` (Story 6.1's shipped template). Note where it names §16 + how it presents the checklist.

- [ ] **Task 2 — Pick the insertion point (AC: #1)**
  - [ ] 2.1 Read `docs/development-guide.md` end-to-end. Decide: insert after "Adding a new vendored library" if Story 2.4 has shipped; otherwise pick the "Contributing" / "Reviews" chapter; otherwise append at end of guide.
  - [ ] 2.2 Document the chosen placement in the PR description with a one-line rationale.

- [ ] **Task 3 — Write the section (AC: #1, #2, #3, #4, #5)**
  - [ ] 3.1 Heading: `## Resolving an anti-pattern flag in PR review` (or one heading depth deeper to match insertion point).
  - [ ] 3.2 Convention paragraph (AC-06.2.2).
  - [ ] 3.3 2–3 concrete examples (AC-06.2.3) — pick the §16.1, §16.8, §16.9 set unless write-time context suggests otherwise.
  - [ ] 3.4 PR-template cross-link (AC-06.2.4).
  - [ ] 3.5 (Optional) closing paragraph: *"If a reviewer cites a §16 number you can't find in the project-context, the project-context may have drifted — flag it back to the reviewer with the line number you searched."*

- [ ] **Task 4 — Verify §16 numbering (AC: #5)**
  - [ ] 4.1 For each example used, grep `_bmad-output/project-context.md` to confirm the item number + short label are accurate at write time.
  - [ ] 4.2 If a number has shifted (project-context.md was edited between 2026-04-26 and write time), update the example accordingly + note the verification step in the PR description.

- [ ] **Task 5 — Coordinate with Story 3.2 (AC: #6)**
  - [ ] 5.1 If Story 3.2 has shipped: link directly to the section name.
  - [ ] 5.2 If not: use the forward-reference + `TODO: link once 3.2 lands` marker, OR pick an alternative example that does not need the cross-link (per AC-06.2.3 alternatives).

- [ ] **Task 6 — Scope-creep guard (AC: #7)**
  - [ ] 6.1 `git diff --stat` — touched files MUST be only: `docs/development-guide.md` + (optionally) the story file.
  - [ ] 6.2 No edit to `.github/pull_request_template.md` (Story 6.1 is `done`; cross-reference, don't modify).
  - [ ] 6.3 No edit to `_bmad-output/project-context.md` (the §16 list is the source of truth — this section *uses* it, does not edit it).

- [ ] **Task 7 — Pre-commit + CI run (AC: #8)**
  - [ ] 7.1 `git commit` without `--no-verify`.
  - [ ] 7.2 Push the PR; verify CI is green; record wall-clock vs NFR-01 baseline.

- [ ] **Task 8 — PR composition (AC: all)**
  - [ ] 8.1 Open PR titled `docs(dev-guide): Story 6.2 — anti-pattern flag resolution workflow (DEE-?? / FR-06 NFR-03)`.
  - [ ] 8.2 PR description includes: AC checklist (all 8), the new section verbatim, AC-06.2.5 §16-numbering verification log (proves the numbers are current), AC-06.2.6 Story-3.2 coordination statement, NFR-01 verification section.
  - [ ] 8.3 Self-Review (Amelia/Paige's `bmad-code-review`) → Review-Board handoff per the standard Phase-4 protocol.

---

## Dev Notes

### Project context (binding)

- **Repo:** `deepnest-next`. **Stream:** C3 — Stream C doc follow-on. **Owner:** Paige (Tech-Writer) per sprint-plan.md §3, OR Amelia (Dev) if Paige is not on call.
- **Sequencing:** Story 6.1 is the prerequisite (the PR template this section references). Story 6.1 is `done`; this story is unblocked.

### Pre-flight reads (binding)

1. `_bmad-output/project-context.md` §16 — the full anti-pattern list (16 items; the section's source of truth + the example mappings).
2. `_bmad-output/planning-artifacts/prd.md` §FR-06 + §NFR-03.
3. `_bmad-output/planning-artifacts/architecture.md` §4 (FR-06 architectural constraint (c) — reviewer can cite the exact §16 item number).
4. Existing `docs/development-guide.md` (current structure; pick the right insertion point — after the "Adding a new vendored library" section from Story 2.4 if it exists, otherwise create the appropriate section).
5. `.github/pull_request_template.md` (Story 6.1's shipped template — verify it names §16 + how).

### Anti-pattern audit map

| §16.X | Anti-pattern | This story's exposure |
|---|---|---|
| 1–8 | Various code-side anti-patterns | **N/A** — docs-only delta |
| 9 | `--no-verify` | **Forbidden** (same as all other MVP stories) |
| 10–16 | Various code-side anti-patterns | **N/A** |

### Sprint risk callouts

- **R5 (Medium / Low) — Epic 6 PR template (C1) is contested on wording.** C1 is `done`; if the template's §16 reference style changed between Story 6.1 merge and this story's write time, AC-06.2.4 cross-link wording must adapt.
- **R6 (Medium / Medium) — story is unexpectedly larger than its IR sizing claims.** Realistic risk here: the §16 numbering verification (Task 4) might surface a numbering shift that requires updating Story 1.1 / 2.1 / 4.1 / 5.1 audit maps too. **If shift detected, flag as separate `bmad-correct-course` work; do not bundle into this PR.**

### Project Structure Notes

- **Files touched are exactly:** `docs/development-guide.md` + (optionally) the story file.
- **No new files created.**

### Testing standards summary

- **`npm test` is the only test layer.** Doc-only delta; no test runs.

---

## References

- [Source: `_bmad-output/planning-artifacts/epics.md` lines 820–854 §"Story 6.2: Document the 'cite the §16 item number' reviewer workflow"]
- [Source: `_bmad-output/planning-artifacts/sprint-plan.md` §3 row C3]
- [Source: `_bmad-output/planning-artifacts/architecture.md` §4 §"FR-06" architectural constraint (c)]
- [Source: `_bmad-output/planning-artifacts/prd.md` §FR-06 + §NFR-03]
- [Source: `_bmad-output/project-context.md` §16 — full anti-pattern list (16 items)]
- [Source: `.github/pull_request_template.md` — Story 6.1's shipped template]
- [Predecessor: Story 6.1 (DEE-57 / DEE-58 / DEE-76 / PR #6) — done, Board-APPROVED, tea-trace PASS]
- [Coordination: Story 3.2 (fixture-drift procedure) — per AC-06.2.6, if §16.10 example used]
- [Coordination: Story 5.1 — per AC-06.2.3 §16.8 example (extend type rather than suppress)]
- [Parent issue: DEE-83 (CS batch-2 follow-up to DEE-82 standup)]

---

## Dev Agent Record

### Agent Model Used

_(Populated by the implementing Dev/Tech-Writer agent at story execution time.)_

### Debug Log References

_(Populated by the implementing agent.)_

### Completion Notes List

_(Populated by the implementing agent.)_

### File List

_(Populated by the implementing agent.)_

### Change Log

| Date | Change | Author |
|---|---|---|
| 2026-04-26 | Story created (`bmad-create-story` batch-2, DEE-83). Status: ready-for-dev. | John (PM, BMad) |
