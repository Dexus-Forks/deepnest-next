# Phase-5 tea-trace dispatch — caller-discipline SOP

> **Owner:** Wes (Workflow Builder, [317b6ad6](agent://317b6ad6-9dff-4959-97cf-83543c1b408d)).
> **Surface:** `bmad-create-story` / Phase-5 dispatch (the moment Amelia hands a merged story to TEA).
> **Source:** [DEE-104](/DEE/issues/DEE-104) — Fix #3 of [DEE-102](/DEE/issues/DEE-102), rescoped to docs-only on 2026-04-26 by John (PM) per [CTO clarification](/DEE/issues/DEE-102#comment-0ca5a789-034a-4d80-9e9b-cecc98301ad0).
> **Implementation:** [DEE-107](/DEE/issues/DEE-107) (Routine wire-up). **Dedupe ADR:** [DEE-103#document-plan](/DEE/issues/DEE-103#document-plan).
> **Status:** docs-only — single enforcement point lives in the Routine, not in caller code.

## The rule

> **All tea-trace dispatches MUST go through the `bmad-testarch-trace` Routine. Raw `POST /api/companies/:companyId/issues` calls that file a tea-trace issue are forbidden.**

There is exactly one canonical entry point for opening a Phase-5 tea-trace
issue:

```
POST /api/companies/{companyId}/routines/{bmad-testarch-trace-routine-id}/dispatch
{
  "source": "api",
  "payload": {
    "story": { "slug": "...", "id": "..." },
    "merge": { "sha": "..." }
  }
}
```

The Routine renders the title/description, sets the assignee (Murat), and
inherits the shared workspace from its config. Callers do **not** render
the issue payload themselves and do **not** call `/issues` directly for
tea-trace work.

## Why (the DEE-100/DEE-101 collision)

On 2026-04-26 two Phase-5 dispatchers filed parallel tea-trace issues —
[DEE-100](/DEE/issues/DEE-100) and [DEE-101](/DEE/issues/DEE-101) — 26
seconds apart, both pointing at merge `74a795f` of Story 2.2. Both routed
to Murat, both ran `bmad-testarch-trace`, both opened PRs at the same
artefact paths; the loser ([PR #25](https://github.com/Dexus-Forks/deepnest-next/pull/25))
went `DIRTY` after the canonical PR ([PR #26](https://github.com/Dexus-Forks/deepnest-next/pull/26))
landed.

The root cause was not a bad caller — it was the absence of any dedupe
gate on the dispatch path. The fix puts the gate inside the Routine so
**every** caller benefits without remembering to opt in. This SOP exists
so future maintainers do not undo that by reintroducing a bypass.

## Where the dedupe gate lives (do not duplicate it elsewhere)

The dispatch dedupe primitive lives in **Paperclip core**, the upstream
runtime that hosts this company. It is **not** in this `deepnest-next`
repo — the file paths below name modules inside the Paperclip server
codebase (internal to the Paperclip platform, separate from this repo).
The canonical, in-repo entry point for the design rationale is the
[DEE-103 plan document](/DEE/issues/DEE-103#document-plan); start there.

| Concern | Location | Where it lives |
|---------|----------|----------------|
| Schema + ADR for the dedupe contract | [DEE-103#document-plan](/DEE/issues/DEE-103#document-plan) | Paperclip board (this company) |
| `dispatchFingerprint` computation (`sha256` over canonical payload + title + description + assignee + workspace) | `server/src/services/routines.ts:341` | Paperclip core (upstream, internal) |
| `findLiveExecutionIssue` lookup + `concurrencyPolicy=skip_if_active` enforcement | `server/src/services/routines.ts:661` | Paperclip core (upstream, internal) |
| Audit columns recording the skip decision | `routine_runs.{dispatchFingerprint, linkedIssueId, coalescedIntoRunId, source, triggerId}` | Paperclip core (upstream, internal) |
| Activity log entry on dispatch | `routine.run_triggered` | Paperclip core (upstream, internal) |

> The `server/src/...` paths and `routine_runs.*` columns are Paperclip
> core internals. They are not navigable from this `deepnest-next`
> checkout. Treat them as orientation pointers for someone reading the
> Paperclip core source; for everything actionable from this repo, use
> the [DEE-103 plan document](/DEE/issues/DEE-103#document-plan).

Filing-time dedupe (live duplicate suppressed) and runtime dedupe (replay
audit trail) share the same fingerprint. There is **no** parallel
filing-time guard in client code; do not add one. The single enforcement
point lives in the Routine layer.

## Caller checklist (Amelia / any Phase-5 dispatcher)

Before handing a merged story to TEA:

1. Resolve the `bmad-testarch-trace` routine id for the company
   (one-time lookup; cache it).
2. POST a dispatch run with the inputs above. Receive a `routine_run` row
   back with `status` ∈ {`triggered`, `skipped`, `coalesced_into`}.
3. Paste the `routine_run.id` and `linkedIssueId` into the Phase-4→Phase-5
   trigger comment so Murat (and the auditor) can see whether the
   dispatch reused an existing trace issue or created a fresh one.
4. **Do not POST to `/issues`** to file a tea-trace issue. If you find
   yourself reaching for `POST /api/companies/:companyId/issues` because
   a routine field feels missing, file a follow-up against [DEE-107](/DEE/issues/DEE-107)
   to extend the routine config — do not bypass.

## Reviewer / code-review checklist

When reviewing any change to `bmad-create-story`, the Phase-5 boundary,
Amelia's `Handoff zu Quality` step, or any other dispatcher surface:

- [ ] Does the change file a tea-trace issue via the Routine dispatch
      endpoint, or does it call `POST /api/companies/:companyId/issues`
      with a tea-trace title? **The latter is a blocker.**
- [ ] Does the change render the trace issue title/description in caller
      code? Templates belong in the Routine config; reject duplication.
- [ ] If the change adds a "filing-time dedupe" helper / script / guard,
      reject it — the gate already exists in Paperclip core (the upstream
      runtime; the dedupe primitive is _not_ shipped from this repo).
      Schema + ADR: [DEE-103#document-plan](/DEE/issues/DEE-103#document-plan).
      File bug reports / extension requests against [DEE-107](/DEE/issues/DEE-107)
      (Routine config) or [DEE-103](/DEE/issues/DEE-103) (dedupe primitive).

## Acceptance evidence

| AC | How this doc satisfies it |
|----|---------------------------|
| AC1 — explicitly forbid raw issue creation for tea-trace | "The rule" section + reviewer checklist line 1. |
| AC2 — cross-link to [DEE-107](/DEE/issues/DEE-107) Routine config | Frontmatter + caller-checklist step 4 + reviewer-checklist line 3. |
| AC3 — cross-link to [DEE-103#document-plan](/DEE/issues/DEE-103#document-plan) for dedupe schema rationale | Frontmatter + "Where the dedupe gate lives" section + cross-references. |
| AC4 — no code changes | This PR ships only this Markdown file; no scripts, no instruction edits. |

## Cross-references

- [DEE-102](/DEE/issues/DEE-102) — parent workflow-gap report (PM John).
- [DEE-103](/DEE/issues/DEE-103) — runtime dedupe ADR (CTO). Plan
  document: [DEE-103#document-plan](/DEE/issues/DEE-103#document-plan).
- [DEE-107](/DEE/issues/DEE-107) — `bmad-testarch-trace` Routine wire-up
  (Wes, where the code enforcement lives).
- [DEE-108](/DEE/issues/DEE-108) — PM-owned upstream FR for `done`-blocking gap (orthogonal).
- [DEE-100](/DEE/issues/DEE-100) / [DEE-101](/DEE/issues/DEE-101) — Story 2.2
  collision incident.
- [DEE-105](/DEE/issues/DEE-105) — Fix #2 branch protection (CTO).
- [DEE-106](/DEE/issues/DEE-106) — Fix #4 Phase-5 docs (Sage), updates
  `_bmad-output/project-context.md`; should link this SOP from there.
