<!-- .github/pull_request_template.md — anchored on _bmad-output/project-context.md §16 -->

## Summary

<!-- 1-3 sentences: what this PR does and why. Link the parent issue / story. -->

> **Reviewer rule:** any anti-pattern checkbox below ticked as violated → request changes, not approve. (NFR-03 — zero ticked-as-violated allowed.)

## Pre-flight reads (binding)

Before opening this PR I have read:

- [ ] `_bmad-output/project-context.md` §16 — anti-patterns (full list — 16 items)
- [ ] `_bmad-output/project-context.md` §8 — cross-cutting behaviours that bite
- [ ] `_bmad-output/project-context.md` §11 — ESLint / Prettier / pre-commit hook
- [ ] `_bmad-output/project-context.md` §17 — brownfield caveats
- [ ] `_bmad-output/project-context.md` §6 — IPC contract

## Anti-pattern checklist (`_bmad-output/project-context.md` §16)

Tick each item as **NOT violated**. If any item is violated, describe the carve-out below the checklist or **do not request review**.

- [ ] §16.1 — No new globals on `window` (only the canonical set declared in `index.d.ts`: `config`, `DeepNest`, `nest`, `SvgParser`, `loginWindow` — ADR-005)
- [ ] §16.2 — No `ipcRenderer.invoke('read-config'|'write-config')` outside `config.service.ts`
- [ ] §16.3 — No new `background-*` IPC handlers outside `nesting.service.ts`
- [ ] §16.4 — No new UI framework (Ractive stays on the existing two views)
- [ ] §16.5 — No modifications to vendored utilities in `main/util/` (`clipper.js`, `simplify.js`, `interact.js`, `ractive.js`, `parallel.js`, `pathsegpolyfill.js`, `svgpanzoom.js`)
- [ ] §16.6 — No imports from `main/util/_unused/`
- [ ] §16.7 — No new TypeScript decorator transform pipeline
- [ ] §16.8 — No new `// @ts-ignore` directives
- [ ] §16.9 — No `--no-verify` commits in this PR
- [ ] §16.10 — No drops / re-encodes of `tests/assets/*.svg` without re-deriving the two spec literals (`#importsnav li = 2`, `54/54`)
- [ ] §16.11 — No mm/inch double-conversion (internal store is inches; existing guards in `initializeConfigForm()` preserved)
- [ ] §16.12 — No external URLs opened by spawning a `BrowserWindow` (`setWindowOpenHandler` already routes them to the OS shell)
- [ ] §16.13 — No HTTP server / telemetry / persistent database introduced
- [ ] §16.14 — No assumption that Windows `clean` / `clean-all` scripts work on Linux/macOS
- [ ] §16.15 — No removal of `**/*.js` from the ESLint global ignore (without a per-file migration plan)
- [ ] §16.16 — No new spinner glyph; `spin.svg` is reused

> Reviewer convention: cite the §16 item number when flagging (e.g., "§16.1 — new `window` global introduced; please remove"). The contributor's resolution path lives in `docs/development-guide.md` §"Resolving an anti-pattern flag in PR review" (added by Story 6.2).

## Merge gate (CEO policy DEE-113 — `_bmad-output/project-context.md` §15 "PR merge gate (Copilot wait + revise)")

> **Reviewer rule (reaffirmed):** if **any** box below is unchecked, request changes / block merge. No carve-outs — applies to feature PRs, BMad / planning-artifact auto-merge PRs, and TEA Phase-5 closer PRs alike.

- [ ] DEE-114 **`Copilot review`** required status check is `success` (server-enforced; merge button blocks until green). Verify with `gh pr view <n> --json statusCheckRollup --jq '.statusCheckRollup[] | select(.name == "Copilot review" and (.conclusion == "SUCCESS" or .state == "SUCCESS"))'`. **Review state is NOT checked** — `copilot-pull-request-reviewer[bot]` returns `COMMENTED` even when satisfied (per `_bmad-output/project-context.md` §15 "Observed Copilot bot behaviour"; DEE-115 dogfood + DEE-114 confirmation).
- [ ] All Copilot comment threads resolved — including any Copilot "Potential fix for pull request finding" auto-push commits (per `validate → fix → reply → resolve` workflow). INVALID/DEFER threads only resolved on reviewer ack, 24 h SLA from the reply with no counter-response, or a linked DEFER follow-up issue id (resolving comment names the basis). DEE-114's status check does NOT enforce conversation-resolution — this remains agent-side discipline.
- [ ] Quiet window: no new Copilot comment, review, or auto-push commit in the last 10 min (guards against merging mid-stream while Copilot is still posting follow-up findings).

## Touched files

<!-- Paste `git diff --stat` summary or list changed paths. Reviewer uses this to scope the review. -->

## Test evidence

<!-- Required for any PR that touches main/, tests/, package.json, or .github/workflows/.
     Otherwise: write "N/A — story does not require test evidence beyond npm test green". -->

- `npm test` exit code: <0 / non-zero>
- NFR-01 wall-clock vs. `nfr01-baseline.json` (rolling_mean_ms = 16746.6, ±20% = 13397..20096 ms): <ms> (Δ <pct>%)
- NFR-02 manual-repro evidence (FR-04 PRs only): <link to evidence write-up or "N/A">
- Drift-gate transcripts (FR-02 / FR-03 PRs only): <green + deliberately-red transcripts or "N/A">

## Linked issue / story

- Issue: DEE-NN
- Story file: `_bmad-output/implementation-artifacts/<story-key>.md`
