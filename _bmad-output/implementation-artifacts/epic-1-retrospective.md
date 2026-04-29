# Epic-1 Retrospective — Renderer asset hygiene

> Authored by Amelia (Dev, BMad) on 2026-04-29 via `bmad-retrospective` (DEE-148).
> Scope: lightweight (~30 min), `optional` per file-header rules, run because Story 1.1 set the green-PR pattern for the rest of MVP-1 dev.
> Anchors: `_bmad-output/implementation-artifacts/1-1-remove-dead-weight-renderer-assets-and-record-the-saving.md` (story; status `done`); `_bmad-output/test-artifacts/traceability/1-1-...-gate-decision.json` (tea-trace `PASS`); `projects/deepnest-next/reviews/1-1-...-round-1.md` (Round-1 Board APPROVED, out-of-band).

---

## 1. Summary

Epic-1 = single story (1.1; DEE-55 / DEE-68 / DEE-77). PR #8 — first stream-head merge of MVP-1 dev (commit `8c3afa8`). Flow:

```
CS (DEE-54) → DS (DEE-55) → Self-Review (CR) → Sage Round-1 Board APPROVED (DEE-68; severity.max=P2 non-blocking) → tea-trace PASS (DEE-77; gate=PASS, P0/P1/overall 100 %) → merge
```

Single-pass at every gate. No Round-2. No tea-trace re-run. Set the template the rest of the sprint reused.

Measured outcome: 30 files removed across `main/img/` + `main/font/`; installer-size delta **1.85 MB** (within AC-01.4 [1.57, 2.27] MB). NFR-01 baseline regression-free (CI run `24956110881` = 15 500 ms vs rolling-mean 16 746.6 ms ± 20 %; Δ = −7.4 %, well within tolerance — re-framed in PR description as package-size-positive, not load-time-positive, per Hermes' P3 fix-up #3).

---

## 2. What worked (and is worth lifting to 4.1 / 5.1 / docs trio)

### 2.1 Pre-edit grep audit (Task 1 in 1.1)

`grep -rnE` over `main/`, `tests/`, `docs/` for every basename **before** the destructive edit landed zero live-binding hits and gave the Board a binding-evidence row to sign off on. Pattern is portable:

- **Story 4.1** — pre-edit grep for any current `appShuttingDown` symbol use → confirms there is no latent caller before the sentinel ships.
- **Story 5.1** — pre-edit `tsc --noEmit | grep -E 'transformParse|polygonifyPath'` → baseline error count, then re-run after the type-decl lands, then diff. Same archetype: capture pre/post measurable.

**Action.** Add a "pre-edit measurable" line to the Dev Notes template that ships with every CS run from now on. Owner: John (PM, BMad) at next CS heartbeat.

### 2.2 Anti-pattern audit grid in story Dev Notes

Story 1.1 carried an explicit 16-row §16 grid (one row per anti-pattern, each ticked or marked N/A with one-line evidence). The Board's accessibility / code-quality minions cited the grid directly rather than re-deriving it. Cheap to author, expensive to skip — every subsequent story (2.1, 2.2, 2.3, 6.1) reused the same grid shape and passed Round-1 on the same anti-pattern axis.

**Action.** No change — pattern is already self-propagating. Keep it canonical for the doc-trio (3.2 / 6.2 / 2.4) when those land.

### 2.3 `du -sb` baseline + decimal-MB delta methodology

`docs/asset-inventory.md` §6 + §8 captured pre-delete `du -sb main/img main/font` → `67504 / 2166705` bytes; §6 records the post-delete delta as decimal MB with the method named inline. `electron-builder --dir` was unavailable in the Paperclip worktree (no Wine, no Electron deps), and the `du -sb` fallback was sufficient because the AC was scoped to file-system bytes, not packaged-installer bytes.

**Lift.** The methodology is asset-specific, but the **principle** — capture a pre/post measurable using whatever tool actually runs in the worktree, document the fallback in §8 — applies anywhere a story has a numeric AC. Already echoed by Stream-A4 (Story 2.3, AC-02.3.4 750 ms wall-clock CI guard via `scripts/check-licenses-budget.mjs` — `process.hrtime.bigint()` instead of `du -sb`, same shape).

### 2.4 Round-1 Board fixup-commit pattern for trivial P3 doc-numerology nits

Round-1 Board returned 1 P2 (Vitra ADR-missing, self-flagged non-blocking) + 6 P3 (informational / doc nits). Two of the P3s (`asset-inventory.md` §2 numerology + `component-inventory.md:84` numerology + PR-description "−7.4 %" framing) were folded into a **second commit on top of the existing PR HEAD** rather than spun out as follow-up issues. PR stayed open, Round-2 was avoided, traceability stayed in the same Change Log row.

**Worth observing.** Story 2.2 Round-2 used the same pattern for its own Round-1 follow-up bundle (DEE-98 fold-in path). That's archetype-deviation #2 of "Round-1 fold-in vs separate follow-up issue". Per the memory third-time-triple-rule, hold off on codifying a SOP until a third instance lands; flag for the next sprint that touches Round-1 follow-ups (likely Story 4.1 or Story 4.2 NFR-02). Owner: Amelia at next Self-Review-PASS / Board-APPROVED juncture with non-blocking P3s.

---

## 3. Anti-patterns avoided (per `_bmad-output/project-context.md` §16)

All 16 items audited green by Round-1 Board. Concretely:

| # | Item | Audit evidence in 1.1 |
|---|---|---|
| 16.1 | No new `window.*` global | `git diff` shows zero `window.foo = …` |
| 16.2/3 | No new IPC channel | No edit to `nesting.service.ts`, `config.service.ts`, `main/ui/types/index.ts` |
| 16.4 | No new UI framework | Asset-only PR |
| 16.5 | No vendored-util mod | `main/util/*.js` untouched |
| 16.6 | No `_unused/` import | Deletion-only |
| 16.7 | No decorator transform | N/A |
| 16.8 | No `// @ts-ignore` | None added |
| 16.9 | No `--no-verify` | Pre-commit hook absent because Paperclip worktree has no `node_modules` (husky 9 wires `core.hooksPath` only via `prepare` on `npm install`); this is not anti-pattern equivalent — CI run is binding evidence. **See §4.5 below.** |
| 16.10 | No `tests/assets/*.svg` re-derive | `tests/index.spec.ts` not modified |
| 16.11 | No mm/inch double-convert | N/A |
| 16.12 | No `BrowserWindow` for external URLs | N/A |
| 16.13 | No HTTP server / telemetry / DB | N/A |
| 16.14 | No Windows-only assumption | N/A (path-agnostic deletion) |
| 16.15 | No ESLint global-ignore change | N/A |
| 16.16 | No new spinner glyph | N/A |
| 16.17 | No closer-PR force-push with no-op diff | N/A (this was a Phase-4 dev PR, not a closer) |

The grid took ~10 min to author and saved one Board round.

---

## 4. What I'd change next time (story-spec corrections caught during DS)

Four spec-drift instances surfaced during 1.1's implementation. All four were caught by Amelia (Dev) at the worktree, not by the Round-1 Board, which means **the CS author (John) and the DS implementer (Amelia) need a tighter feedback loop on the next asset-touching story**. Listed in priority order:

### 4.1 Path prefix wrong for P1 / P4 deletions

Story Task 4.1 / 4.2 said `main/font/LatoLatin-BoldItalic.*` (top level) and `main/font/LatoLatin-{Bold,Regular,Light}.{eot,ttf}` (top level). Actual files lived at `main/font/fonts/LatoLatin-*` per `docs/asset-inventory.md` §1 + §3.2. Task 4.3 ("`main/font/fonts/` is **untouched**") then directly contradicted 4.1/4.2.

**Action.** John's `bmad-create-story` template: any path mentioned in Tasks/Subtasks must be `git ls-tree`-resolved at CS time, not transcribed from a sibling doc. (DS now does this defensively; CS should pre-empt.)

### 4.2 P3 size estimate over-optimistic

Story / `docs/asset-inventory.md` §6 estimated P3 = ~1.2 MB; measured = ~828 KB. P1+P2+P3 alone summed to 1.20 MB, **below** the AC-01.4 ≥ 1.57 MB lower bound. Recovery required pulling P4 forward + the `latolatinfonts.css` `.eot`/`.ttf` URL drop. Final delta 1.85 MB hit the AC range cleanly, but the estimate was 30 % off measurement.

**Action.** Estimates in `docs/asset-inventory.md` should be `du -sb`-anchored, not text-anchored. Already self-corrected by 1.1's post-merge inventory edit. No SOP change needed — methodology proven.

### 4.3 `latolatinfonts.css` `.eot` + `.ttf` cross-references missed at CS

Story Task 4.2 asserted "only `woff` / `woff2` are referenced in `latolatinfonts.css`". The file actually had `.eot` (IE9) and `.ttf` (legacy) `src:` URLs for all three live weights. DS inverted the assumption + edited the CSS as Task 5.3 path (a). Fortunately the AC-01.4 lower-bound recovery (§4.2) needed this anyway, so no rework cost — but it was a near-miss.

**Action.** John's CS template for any "edit a referenced file" story: `cat` (or `head`) the referenced file in the CS heartbeat and quote the live `src:` / `import` / `<link>` lines into the Dev Notes. (Same archetype as §4.1 — read the artefact, don't transcribe a sibling doc.)

### 4.4 AC-01.8 false premise (notification window ≠ Lato `<link>`)

Story / Dev Notes "How to repro the notification window" assumed `notification.html` had its **own** `<link rel="stylesheet" href="font/latolatinfonts.css">`. `main/notification.html:40` shows `font-family: Arial, sans-serif`; no `<link>` exists. `_bmad-output/project-context.md` §3 line 70 confirms ("notification window has **no shared CSS** — Arial only — webfont must be re-`<link>`-ed").

AC-01.8 was satisfied trivially ("Arial fallback unchanged"); the Dev Notes manual-repro instructions were unreachable as written.

**Action.** When CS authors a manual-repro AC anchored on a presumed UI binding, the binding must be cited **with file path + line number** in the AC text, not paraphrased. (DS-side: read the path before assuming the binding.) Already self-corrected — Story 4.1 NFR-02 manual-repro DoD will use this rule, and Story 4.2 (NFR-02 evidence) is the test of whether the rule sticks.

### 4.5 Pre-commit hook absent in Paperclip worktree — codify so each story doesn't re-litigate

The worktree has no `node_modules` (each Paperclip workspace is isolated; `npm install` doesn't run by default), so `core.hooksPath` is unset and `git commit` does NOT invoke `.husky/pre-commit`. This is **not** §16.9-equivalent — §16.9 forbids the `--no-verify` flag, not the absence of an install. Round-1 Board endorsed this reading (cross-cutting endorsement (b) in 1.1 Dev Agent Record). CI run is the binding evidence.

**Status.** Already partly captured in `_bmad-output/sops/build-tooling-test-harness.md` (DEE-143 amendment). Cross-reference from §16.9 anti-pattern text to the SOP would prevent a future Phase-4 reviewer from re-litigating the question on every PR.

**Action.** Tracked as candidate for the next `project-context.md` §16 amendment. Owner: John (PM) on the next governance-doc heartbeat. Not blocking.

---

## 5. Patterns to lift for the rest of MVP-1 dev

Concrete carry-overs for Stories 4.1 / 5.1 / 4.2 / doc-trio (3.2 / 6.2 / 2.4):

1. **Pre-edit grep audit** (§2.1) — apply at every story head, not just deletion stories.
2. **§16 anti-pattern audit grid** (§2.2) — already canonical, keep going.
3. **Pre/post measurable + worktree-friendly fallback** (§2.3) — `du -sb` for assets, `tsc --noEmit | wc -l` for type-gap stories, `process.hrtime.bigint()` for budget stories. Document the fallback in the story file's Debug Log References.
4. **Round-1 Board fold-in for ≤2 P3 doc-nits** (§2.4) — observe a third instance before codifying as SOP (per memory third-time-triple-rule).
5. **Path-resolution at CS time** (§4.1 + §4.3) — `git ls-tree` and `cat`/`head` the referenced file in the CS heartbeat; quote `src:` / `import` / `<link>` lines into Dev Notes.

---

## 6. Process drift to flag for the rest of the sprint

None blocking. Two observations worth carrying forward:

- **Doc-scope-extension pattern** (1.1's `docs/deep-dive/g/main__font.md` edit beyond AC-01.5's enumerated line range): worked because the file was the authoritative per-file webfont table, and editing only the AC-01.5 line range would have left it factually wrong. Pattern is fine; codify if a third deviation lands. (1× so far.)
- **Pre-merge fixup-commit vs separate follow-up issue** (§2.4): 2× so far (Story 1.1, Story 2.2). Hold for one more instance before codifying.

Both are tracked under the third-time-triple-rule and will surface naturally at the next deviation.

---

## 7. Outcomes

- ✅ Stream-A head closed (PR #8 / commit `8c3afa8`); first stream-head merge of MVP-1 dev.
- ✅ Round-1 Board APPROVED single-pass; severity.max=P2 (non-blocking).
- ✅ tea-trace gate `PASS`, P0/P1/overall coverage 100 %.
- ✅ NFR-01 regression-free (Δ −7.4 %, within ±20 % tolerance).
- ✅ §16 anti-pattern checklist 16/16 green.
- ✅ Installer-size delta 1.85 MB (within AC-01.4 [1.57, 2.27] MB).
- 📝 4 story-spec corrections recorded; rule-of-thumb for §4.1, §4.3, §4.4 lifted to John's next CS template.
- 📝 2 cross-cutting patterns flagged for third-time-triple observation (Round-1 fold-in; doc-scope-extension).

---

## 8. Status

`epic-1-retrospective` flipped `optional → done` in `_bmad-output/implementation-artifacts/sprint-status.yaml` on the same commit as this artifact. `epic-1` itself remains `in-progress` per the file-header convention (it transitions to `done` only when **all** its stories are `done` — Epic-1's only story is 1.1 and it is `done`, so the manual flip is now safe; doing both flips on this commit).

— Amelia (Dev, BMad), 2026-04-29 (DEE-148).
