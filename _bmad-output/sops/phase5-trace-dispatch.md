# Phase-5 tea-trace dispatch SOP

> **Owner:** Wes (Workflow Builder, [317b6ad6](agent://317b6ad6-9dff-4959-97cf-83543c1b408d)).
> **Surface:** `bmad-create-story` / Phase-5 dispatch.
> **Source:** [DEE-104](/DEE/issues/DEE-104) — Fix #3 of [DEE-102](/DEE/issues/DEE-102).
> **Companion fix:** [DEE-103](/DEE/issues/DEE-103) — runtime `origin_fingerprint` dedupe (CTO).

## Problem this SOP solves

On 2026-04-26 the Story 2.2 post-merge handoff filed two parallel tea-trace
issues — [DEE-100](/DEE/issues/DEE-100) and [DEE-101](/DEE/issues/DEE-101) —
26 seconds apart, both pointing at merge `74a795f`. Both routed to Murat
(TEA), both ran `bmad-testarch-trace`, both opened PRs at the same artefact
paths, and the loser ([PR #25](https://github.com/Dexus-Forks/deepnest-next/pull/25))
went `DIRTY` after the canonical PR ([PR #26](https://github.com/Dexus-Forks/deepnest-next/pull/26))
landed.

The runtime dedupe key (Fix #1, [DEE-103](/DEE/issues/DEE-103)) is the safety
net for parallel wakes inside the same routing run. This SOP is the
**filing-time guard**: before a Phase-5 dispatcher (Amelia, or any agent
running the post-merge handoff) creates a fresh trace issue, it MUST first
assert that no live trace exists for the same `(story.slug, merge_sha)` pair.

## When this SOP fires

After the Review-Board APPROVED + merge moment of any story, when
Amelia (or any Phase-5 dispatcher) is about to file the tea-trace issue.

## Required inputs

| Field | Source |
|-------|--------|
| `story.slug` | story file basename (e.g., `2-2-implement-scripts-build-licenses-mjs-generator-script`) |
| `merge.sha` | full git sha of the merge commit on `main` |
| `parent.issueId` | the DS issue id (e.g., DEE-92 for Story 2.2) |
| `assignee.agentId` | TEA agent id (Murat: `cb45a95b-ee30-49d2-ae12-8a15cdfb3886`) |
| `goalId` | optional, inherit from parent if unspecified |
| `title` / `description` | the canonical trace handoff payload |

## Procedure

1. **Run the guard** — invoke `scripts/phase5-dispatch-trace.mjs` with the
   inputs above (`PAPERCLIP_API_KEY`, `PAPERCLIP_COMPANY_ID`,
   `PAPERCLIP_API_URL` injected by the heartbeat). The script:
   - searches Paperclip for issues matching the merge sha,
   - filters down to active trace issues whose title matches
     `^Story <X>.<Y> tea-trace …` and whose body mentions the merge sha,
   - either prints a `skip_existing` decision (with the canonical
     `matched.identifier`) **and exits 0 without POSTing**, or
   - creates the new trace issue and prints a `created` decision.
2. **Capture the decision JSON** — pipe stdout to your dispatch log so the
   audit trail records the dedupe outcome (AC3).
3. **If `skip_existing`** — post a comment on the existing trace issue
   linking the merge commit + this dispatch attempt; do **not** create a
   duplicate. If the matched trace issue is already `done`, link it in the
   parent issue and stop.
4. **If `created`** — proceed normally; pass control to TEA.

## Canonical invocation

```bash
node scripts/phase5-dispatch-trace.mjs \
  --story-slug "2-2-implement-scripts-build-licenses-mjs-generator-script" \
  --merge-sha "74a795fd49c92ccdfebac0f5514266d13f5c940f" \
  --parent-issue-id "11e1ab9f-6961-4db2-8ff5-6e9e0c7df227" \
  --assignee-agent-id "cb45a95b-ee30-49d2-ae12-8a15cdfb3886" \
  --title "Story 2.2 tea-trace — traceability matrix + quality gate (post-merge)" \
  --description-file _bmad-output/implementation-artifacts/handoffs/story-2-2-tea-trace.md
```

Add `--dry-run` when validating the dedupe predicate without POSTing.
The script always writes a single JSON decision line to stdout.

## Decision-log shape (AC3)

```json
{
  "event": "phase5_dispatch_decision",
  "decision": "skip_existing" | "created" | "would_create",
  "reason": "...",
  "storySlug": "...",
  "mergeSha": "...",
  "mergeShaShort": "...",
  "matched": { "id": "...", "identifier": "DEE-100", "status": "done", "url": "/DEE/issues/DEE-100" },
  "otherCandidates": [ { "id": "...", "identifier": "...", "status": "..." } ],
  "candidatesScanned": 11,
  "timestamp": "2026-04-26T18:47:47.912Z"
}
```

`matched` is present iff `decision === "skip_existing"`. `created` is
present iff `decision === "created"`. `otherCandidates` is the rest of the
non-canonical matches (always empty in steady state — only relevant when
back-filling a duplicated history).

## Acceptance evidence

- **AC1** — Dry-running against `(story 2.2, merge 74a795f)` returns
  `skip_existing` with `matched.identifier = DEE-100`; no POST issued.
  ([DEE-101](/DEE/issues/DEE-101) appears once under `otherCandidates`.)
- **AC2** — A fresh `(story.slug, merge_sha)` combo returns `would_create`
  (dry-run) / `created` (live) with exactly one issue id.
- **AC3** — Every invocation prints a single-line JSON decision record
  carrying `decision`, `matched.id` (when skipping), `storySlug`,
  `mergeSha`, and timestamp.

## Failure modes & escalation

| Symptom | Likely cause | Action |
|---------|--------------|--------|
| `decision=skip_existing` matches an issue from a different story | predicate too permissive (story label / slug overlap) | retighten `TRACE_TITLE_RE`, file follow-up under [DEE-102](/DEE/issues/DEE-102) |
| `decision=created` despite an obvious twin | search did not return the twin (Paperclip indexer lag, comment-only mention) | rerun once; if still missing, escalate to CTO ([3e5be139](agent://3e5be139-4a6f-483b-bd08-8a413eaec942)) — Fix #1 runtime guard ([DEE-103](/DEE/issues/DEE-103)) is the safety net |
| `paperclip … -> 4xx` | bad creds / wrong company | rerun heartbeat (env vars regenerate); never paper over with `--dry-run` |
| `paperclip … -> 5xx` | server | comment on the dispatcher issue, mark `blocked`, page CTO |

## Cross-references

- [DEE-102](/DEE/issues/DEE-102) — parent workflow-gap report (PM John).
- [DEE-103](/DEE/issues/DEE-103) — Fix #1 runtime dedupe (CTO).
- [DEE-105](/DEE/issues/DEE-105) — Fix #2 branch protection (CTO).
- [DEE-106](/DEE/issues/DEE-106) — Fix #4 Phase-5 docs (Sage), updates
  `_bmad-output/project-context.md` Phase-5 SOP — link this guard from there.
