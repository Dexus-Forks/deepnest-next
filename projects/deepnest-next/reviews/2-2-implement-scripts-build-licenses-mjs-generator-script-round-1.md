# Board Review — Story 2.2, round 1 — consolidated report

**Story:** Story 2.2 — Implement `scripts/build-licenses.mjs` generator script (Stream-A3 + Sage Round-1 architectural addendum)
**Story slug:** `2-2-implement-scripts-build-licenses-mjs-generator-script`
**PR:** [#23](https://github.com/Dexus-Forks/deepnest-next/pull/23) — branch `DEE-92-ds-2-2-licenses-generator-script` @ `16c81b8` against `main` @ `db6592b` (pinned)
**Review round:** 1
**Review-Leader:** Sage (`claude_local`)
**Parent review issue:** [DEE-93](/DEE/issues/DEE-93)
**Source dev issue:** [DEE-92](/DEE/issues/DEE-92) (Amelia)
**Spec source:** [DEE-90](/DEE/issues/DEE-90) (John, CS) — PR #21 absorbed inline as commit `f710308`.
**Predecessor (Story 2.1 / Round-1):** [DEE-85](/DEE/issues/DEE-85) APPROVED `severity.max=P2`; consolidated report at `projects/deepnest-next/reviews/2-1-bootstrap-per-folder-license-yml-metadata-regenerate-licenses-md-round-1.md`. Story 2.1 deferred follow-ups (P2-01 + P3-01 + P3-02 + P3-03) all closed in this PR — verified below.

---

## Verdict

**APPROVED** — `severity.max = P2` across all four dispatched perspectives. **No P0 or P1 finding from any reviewer.** Amelia's self-review verdict (PASS at Round-2; one Round-1 self-finding on AC-02.2.8 closed via commit `16c81b8`) is upheld. Every claim in the PR self-table is reproducible from the diff against the pinned baseRef and from the deterministic re-run of the generator.

The four P2 findings (one from Lydia, three from Vitra) are either spec/impl alignment improvements at the ADR-008 layer (Vitra) or a test-harness gap that is the natural surface of Story 2.3 / A4 (Lydia). None block merge of PR #23. All Story 2.1 Round-1 architectural follow-ups (P2-01 + P3-01 + P3-02 + P3-03) are visibly closed in the diff.

`release.gate.fail` not emitted — Aegis confirmed no security-P0; security fail-safe inactive.

---

## Coverage report

### Reviewer-perspective coverage

| Perspective | Reviewer | Outcome | Status |
|---|---|---|---|
| security | Aegis (`859aa171-…`) | `findings: []` | ✅ covered |
| architecture | Vitra (`55b68ff2-…`) | 3× P2 + 2× P3 | ✅ covered |
| performance | Hermes (`9bb7916b-…`) | 1× P3 | ✅ covered |
| code-quality | Lydia (`f0452a25-…`) | 1× P2 + 3× P3 | ✅ covered |
| accessibility | Iris (`9d50d97b-…`, conditional) | runWhen unmet | ❎ **not dispatched** — `event.story.touchesUI = false` (diff is `scripts/*.mjs` + `package.json` + `LICENSES.md` + 4× `LICENSE.yml` + 2× planning docs; no `*.svg`/`*.css`/`*.html`/`*.tsx?` UI source touched; no `tags: [ui, frontend]` on the story). Same conditional-skip rule as the Story 2.1 / Round-1 precedent. |

**No `no-reviewer-for-perspective` warning** — every required perspective is covered or correctly conditional-skipped.

### Model-diversity check

ℹ️ **`model-diversity: indeterminate (informational, not blocker)`.** All four dispatched minions are configured with `adapter.type: claude_local` and an empty `adapterConfig` (verified via `GET /api/companies/{companyId}/agents` for all four), so no explicit model is set. **No same-perspective duplicate exists** (one minion per perspective) — adapter+model duplication within a perspective is therefore vacuously absent. Within-perspective dispute detection (Jaccard / IoU finding-overlap) is inactive by design. This is informational only and does not block merge. (Same posture as Story 2.1 / Round-1.)

### Other coverage notes

- `tests.coverage.gaps`: one P2 — Lydia Finding 1 names the absence of automated test coverage for the parser fail-fast branches and for `--check`'s drift-detection path. **Resolution path:** Story 2.3 (A4) is the natural moment, since A4 wires `licenses:check` into `scripts.test`. Folded into the consolidated P2 list below; not escalated to Murat (TEA) as a separate gap.
- `dispute.within-perspective`: inactive — only 1 reviewer per perspective. Vitra's report posted twice on `DEE-97` (`5a556e1a` and `57dd37f3`, byte-identical) — single submission counted; the duplicate is a Paperclip post-side artefact, not a dispute.
- `dispute.cross-perspective`: **none.** Each finding is unique to its perspective. Vitra's ADR-008 alignment findings (F1, F2, F4, F5) and her closed-set drift-gate gap (F3) operate at the architecture/ADR layer; Lydia's parser test-coverage gap (F1) operates at the implementation-quality layer; Hermes's CI-budget-test recommendation (F1) is a Story 2.3 review-surface deferral. No two perspectives flagged the same line.

---

## Pre-flight verification (Sage, deterministic)

The following structural checks were run against the pinned baseRef (`main@db6592b` ↔ `DEE-92-ds-2-2-licenses-generator-script@16c81b8`) before findings consolidation. All pass.

| Check | Result | Evidence |
|---|---|---|
| Diff scope (10 files, +828/−74) | ✅ matches PR claim | `git diff --stat db6592b...16c81b8` |
| Zero diff to executable surfaces outside `scripts/` | ✅ clean | `git diff db6592b...16c81b8 -- main/util/*.{js,ts} main/util/_unused/ main/font/fonts/ tests/assets/*.svg eslint.config.mjs tsconfig.json .github/ scripts/check-test-fixtures.mjs tests/assets/.fixture-manifest.json` returns empty |
| `package-lock.json` unchanged (zero-dep guarantee, AC-02.2.1) | ✅ confirmed | `git diff db6592b...16c81b8 -- package-lock.json` returns empty |
| `time node scripts/build-licenses.mjs --check` exit 0, < 1 s budget | ✅ ~64 ms | exit 0; `real 0m0,064s` (architecture.md §3.3 budget = sub-second; mirrors `scripts/check-test-fixtures.mjs` precedent) |
| Two consecutive build runs produce byte-identical `LICENSES.md` | ✅ confirmed | `cmp` exits 0; `git status --short LICENSES.md` clean after second run |
| LF only on `LICENSES.md` (32 lines, single trailing `\n`, no CRLF) | ✅ confirmed | `head -c 200 \| od -c`, `tail -c 5 \| od -c`, `wc -l = 32` |
| Drift detection round-trip (mutate `LICENSES.md` → exit 1 with unified-diff stderr; restore → exit 0) | ✅ confirmed | unified-diff-style stderr names `L33 expected: \<empty> observed: X` |
| AC-02.2.5 first-party block ordering matches spec | ✅ confirmed | rows 1–6 of `LICENSES.md`: `/main`, `/main/svgparser.js`, `/main/deepnest.js`, `minkowski.cc, minkowski.h`, `/polygon`, `/main/font/latolatinfonts.css` |
| AC-02.2.6 SPDX normalisation (3 cell deltas only on first-party License column) | ✅ confirmed | `Boost`→`BSL-1.0` ×2 (rows 4 + 5), `GPLv3`→`GPL-3.0-only` ×1 (row 3); third-party SPDX cells unchanged |
| AC-02.2.7 `latolatinfonts.css` placement (first-party block row 6; third-party shrinks 23→22; total 28) | ✅ confirmed | row count 28 matches; row 6 is `/main/font/latolatinfonts.css` |
| AC-02.2.8 schema canonicalisation (option α: ADR-008 §5 step 1 amended) + headers ≤ 4 lines | ✅ confirmed | `architecture.md` ADR-008 step 1 has new "Schema reference" subsection (field-by-field table); 4× `LICENSE.yml` headers reduced (`main/`, `main/util/`, `main/font/`, `tests/assets/`) |
| AC-02.2.9 fixture-manifest interaction (option β; impl deferred; no edits to `scripts/check-test-fixtures.mjs` or `.fixture-manifest.json`) | ✅ confirmed | guarded zero-diff above |
| AC-02.2.13 file-set scope (only the 10 named files touched) | ✅ confirmed | `git diff --stat` lists exactly: `LICENSES.md`, story file (new), `sprint-status.yaml`, `architecture.md`, `main/LICENSE.yml` (new), `main/font/LICENSE.yml`, `main/util/LICENSE.yml`, `package.json`, `scripts/build-licenses.mjs` (new), `tests/assets/LICENSE.yml` |
| §16 anti-pattern hot greps (16/16) | ✅ clean | no `window.` adds, no IPC channel, no `// @ts-ignore`, no edits under `main/util/*.{js,ts}` / `main/util/_unused/*` source / `main/font/fonts/` / `tests/assets/*.svg`; commit composed without `--no-verify`; generator is `.mjs` outside `main/` (ADR-007 strict-TS surface unchanged) |
| Story 2.1 Round-1 follow-up closure (P2-01 + P3-01 + P3-02 + P3-03) | ✅ all four visible in diff | P2-01 = `main/LICENSE.yml` passthrough (option a); P3-01 = SPDX normalisation; P3-02 = `first_party: true` flag on `latolatinfonts.css`; P3-03 = ADR-008 §5 step 1 "Schema reference" + 4× header reductions |

---

## Findings — consolidated, deduped, prioritised

`severity.max: P2` (overall)
`confidence: high` (overall — small, well-bounded diff; one new generator script (298 LOC, hand-rolled YAML reader on a constrained schema) plus metadata; four perspectives walked end-to-end with concrete `git diff` + runtime evidence; structural pre-flight all passes)

### P0

_None._

### P1

_None._

### P2 — should-fix (non-blocking; resolution path is upstream of this PR)

#### P2-01 (architecture, Vitra Finding 1) — ADR-008 step 2 wording vs the implemented rendering rule

- **Location:** `_bmad-output/planning-artifacts/architecture.md` ADR-008 step 2 (still reads *"emits a canonical, deterministically-ordered `LICENSES.md` (header preserved verbatim, body sorted by `path`)"*) vs `scripts/build-licenses.mjs:202–215` (`renderTable`).
- **Evidence:** Implementation sorts the third-party block by **Unit** (post-derivation) and the first-party block by **walk-order then YAML insertion order** (`LICENSE_YML_FILES` constant order × file-internal entry order). For passthrough rows in `main/LICENSE.yml` `Unit ≠ path` — e.g. `Unit = "minkowski.cc, minkowski.h"` is derived from a literal `path:` value; ADR-008 step 2's "body sorted by `path`" wording predates the §2a passthrough route. The new "Schema reference" subsection landed by AC-02.2.8 documents fields but is silent on rendering order.
- **Remediation:** Amend ADR-008 step 2 (or extend the new "Schema reference" subsection) to state the canonical rendering rule: (a) first-party block precedes third-party; (b) first-party order = `LICENSE_YML_FILES` walk-order + YAML insertion order; (c) third-party order = ASCII byte sort by Unit. Bundle with P2-02 / P2-04 / P3-01 / P3-02 below into a single ADR-008 amendment commit (Story 2.3's natural moment, since A4 wires the gate).
- **Verdict:** **Non-blocking for this PR.** The implementation matches the spec's *intent*; only the wording is narrower than the implementation.

#### P2-02 (architecture, Vitra Finding 2) — `LICENSE_YML_FILES` is a hardcoded constant, ADR-008 wording implies metadata discovery

- **Location:** `scripts/build-licenses.mjs:28–33` (`LICENSE_YML_FILES = ["main/LICENSE.yml", "main/util/LICENSE.yml", "main/font/LICENSE.yml", "tests/assets/LICENSE.yml"]`) vs ADR-008 step 2.
- **Evidence:** ADR-008 step 2 says *"walks the configured roots (`main/util/`, `main/font/`, `tests/assets/`, plus any other root the metadata declares)"* — the "metadata declares" clause implies discovery. The implementation hard-codes the four paths in a module-level constant. Adding a new vendored-library folder requires a script edit, not a metadata edit.
- **Remediation:** Either (a) ADR-008 step 2 amendment that **states explicitly** the script's `LICENSE_YML_FILES` constant IS the configured-roots list (intentional narrowing for review-surface clarity — the Sage recommendation for the lower-cost fix); or (b) move the list into a metadata sentinel discoverable by walking from `REPO_ROOT`. **Recommend (a).** Bundles with P2-01.
- **Verdict:** **Non-blocking for this PR.** Closed-set ergonomics (a deliberate two-file PR for new roots) is defensible — see P2-03 for the matching Risk-row update.

#### P2-03 (architecture, Vitra Finding 3) — Closed-set drift gate; ADR-008 §Risk row needs the new-folder caveat

- **Location:** `scripts/build-licenses.mjs:142–167` (`loadEntries`); ADR-008 §Consequences/Risk row.
- **Evidence:** The CI gate (`licenses:check`) re-parses already-configured `LICENSE_YML_FILES` and diffs the rendered output. A contributor who adds a new third-party asset under a *new* folder without (a) adding a `LICENSE.yml` there AND (b) editing the script's constant produces zero CI signal — the gate cannot catch what it doesn't enumerate. ADR-008's risk row claims *"Failure mode names the missing file path"* but only for already-configured paths.
- **Remediation:** Document the gap in ADR-008 §Consequences/Risk: the drift gate is **closed-set** by `LICENSE_YML_FILES`; new roots require a deliberate two-file PR (LICENSE.yml + script constant). Optional follow-up story: add a `find . -name LICENSE.yml -not -path './node_modules/*'` cross-check in the script that fails if a `LICENSE.yml` exists outside the configured set. **Not blocking.**
- **Verdict:** **Non-blocking for this PR.** Documentation-only update on Story 2.3 (or a small Story 2.4 docs follow-up).

#### P2-04 (code-quality, Lydia Finding 1) — No automated coverage for the parser fail-fast branches and `--check`'s drift-detection path

- **Location:** `scripts/build-licenses.mjs:60-93` (`parseYaml`), `:95-105` (`parseValue`), `:120-141` (`validateEntry`); also AC-02.2.3's drift-detection path.
- **Evidence:** Five distinct `failSchema(...)` branches (value-line outside any entry; expected continuation/new-entry; unterminated double-quoted string; missing/non-string required field; unknown field; non-boolean `first_party`) plus the `--check` drift path are exercised manually only — Sage's pre-flight mutated `LICENSES.md` once; no automated regression test asserts that `--check` flips to exit 1 on drift, and `tests/index.spec.ts` never imports the generator. The script is real code that runs in CI from Story 2.3 onward, and these branches are the only behavioural contract the parser exposes to a contributor who mis-edits a `LICENSE.yml`.
- **Remediation:** Add a thin smoke harness — either a `tests/build-licenses.spec.ts` Playwright case (the existing test runner) or a `scripts/build-licenses.test.mjs` driven by Node's built-in `node:test` — that feeds in-memory bad inputs through `parseYaml` / `validateEntry` and asserts each fail-* branch emits the documented exit code (`EXIT_SCHEMA = 2`); cover the drift-path with a temp-file mutate-restore cycle. Pulling `failSchema` / `failIO` behind an injected `onFail(code, msg)` callback (default = current `process.stderr.write` + `process.exit`) would make this testable without spawning a child process per case. **Story 2.3 (A4) is the natural moment** — A4 wires `licenses:check` into `scripts.test`, so the gate's behavioural contract is the consumer of the test set.
- **Verdict:** **Non-blocking for this PR.** Defer to Story 2.3 / DEE-?? scope (Amelia or whoever picks up A4 should fold this into the spec). Sage's pre-flight + the two-run determinism check validates the happy path on this PR, and the metadata-only diff is mechanical.

### P3 — nice-to-have

#### P3-01 (architecture, Vitra Finding 4) — `§271` line-number anchor in ADR-008 schema-reference paragraph is fragile

- **Location:** `_bmad-output/planning-artifacts/architecture.md` ADR-008 schema-reference paragraph, final sentence: *"The §271 out-of-tree clause stands"*.
- **Evidence:** Line-number anchors drift on the next edit to `architecture.md`. The clause itself is not numbered as `§271` — it is a paragraph in the ADR-008 "Cross-references" section.
- **Remediation:** Replace `§271 out-of-tree clause` with a subsection-title or ADR cross-reference (e.g. *"ADR-008 Cross-references — out-of-tree `@deepnest/*` clause"*). One-line edit; bundle with P2-01's ADR amendment.

#### P3-02 (architecture, Vitra Finding 5) — ADR-008 step 2 "no runtime deps beyond `fs` / `path`" is narrower than the implementation (`node:url` also imported)

- **Location:** `scripts/build-licenses.mjs:18–20` (imports `node:fs`, `node:path`, `node:url`) vs ADR-008 step 2 wording.
- **Evidence:** ADR-008 step 2 reads *"Node, no runtime deps beyond `fs` / `path`"*. The script also imports `node:url` (`fileURLToPath` to resolve `import.meta.url` → `SCRIPT_DIR`). All three are Node-stable stdlib modules, so the **spirit** ("zero transitive deps; no `experimental` APIs") is preserved, but the literal ADR phrasing is narrower than the implementation.
- **Remediation:** Widen ADR-008 step 2 wording to *"Node stdlib only (no transitive deps; no `experimental` APIs)"*. Fold into P2-01's ADR amendment.

#### P3-03 (code-quality, Lydia Finding 2) — Drift-diff truncation is silent past 20 lines

- **Location:** `scripts/build-licenses.mjs:226-251` (`emitDriftDiff`).
- **Evidence:** When `maxLen > 20` differing lines exist, the loop silently `break`s after capturing 20 entries. The user-visible *"First 20 differing line(s):"* banner does not signal that further drift exists past the 20th line — for a 28-row table this is unlikely in practice, but the intent of the gate is to surface every drift, not the first 20.
- **Remediation:** Count remaining drift after the capture cap and format `First N of M differing line(s):` with a `(…M-N more truncated)` hint when truncated. Optional; small one-function-local change.

#### P3-04 (code-quality, Lydia Finding 3) — `renderTable` allocation pattern (spread+map+join vs single-pass accumulation)

- **Location:** `scripts/build-licenses.mjs:165` (`renderTable`).
- **Evidence:** `[...firstParty, ...thirdParty].map(...).join("\n")` allocates a fresh array, maps each entry to a row string, then joins. For 28 rows this is fine; the same idiom appears in `scripts/check-test-fixtures.mjs:147-180`. Idiomatic-consistency nudge, not a defect.
- **Remediation:** Optional. `for-of` accumulation (`let body = HEADER; for (const e of firstParty) body += rowOf(e) + "\n"; …`) would save one allocation. Skip if the team prefers the declarative shape.

#### P3-05 (code-quality, Lydia Finding 4) — `--help` / `-h` exits with `EXIT_USAGE = 3`, not POSIX-conventional `0`

- **Location:** `scripts/build-licenses.mjs:271-279` (CLI dispatcher).
- **Evidence:** Any arg other than `--check` falls through to the usage block and exits `3`. The usage text *is* printed, so the user sees what they wanted, but exit-code 3 on an explicit `--help` is non-idiomatic. Mirrors `scripts/check-test-fixtures.mjs:283-292` (same shape) — project-wide nudge, not a per-script defect.
- **Remediation:** Optional. Add an explicit `--help` / `-h` branch before the catch-all that exits `EXIT_OK = 0`, in both scripts.

#### P3-06 (performance, Hermes Finding 1) — No CI wall-clock guard on `licenses:check` once Story 2.3 wires the gate

- **Location:** `scripts/build-licenses.mjs:1-298` (entry-set sized at 5+14+7+2 = 28 rows today).
- **Evidence:** Local benchmark (5 cold-process `node scripts/build-licenses.mjs --check` runs): **70 / 63 / 61 / 63 / 59 ms wall** (mean ≈ 63 ms; matches Sage's pre-flight ~64 ms). architecture.md §3.3 budget for the FR-02 + FR-03 CI gates is *"sub-second deterministic file walks"* → ~14× headroom today. Asymptotics: O(n) parse + O(n log n) sort on a 28-row third-party slice — trivial at present scale, ~500-entry headroom before the 1 s ceiling. From Story 2.3 onward (`licenses:check` wired into `npm test` per FR-02 §A4), this script becomes a true CI hot-path; Hermes's role rule is to make the budget posture explicit, not implicit, when a script enters CI.
- **Remediation:** No code change to the generator. Hand off to TEA (Murat) on Story 2.3: add a runtime regression test (or a `time` wrapper inside the npm-test step) that **fails CI when `node scripts/build-licenses.mjs --check` exceeds e.g. 750 ms wall** on the canonical CI cell — explicit 250 ms cushion under §3.3's 1 s ceiling, ~12× margin to absorb future row growth + CI variance + node-process startup. Capture the chosen threshold in the Story 2.3 Dev Agent Record. **Not blocking for this PR.**
- **Hermes notes (recorded for Sage consolidation):** sync `readFileSync` × 4 small files is the right pattern (parallelising via `fs.promises` would save < 5 ms and add complexity — explicitly **not** recommended; premature-optimisation guard); two-pass `.filter()` partition in `renderTable` is O(n=28) — single-pass would be a micro-optimisation with no measurable gain (also **not** recommended); `emitDriftDiff` 20-line cap is appropriate (bounded output; no DoS); zero-dep posture preserved (no `package-lock.json` change).

---

## Aegis (security) — explicit zero-finding posture

Aegis walked the threat model end-to-end:

- **Injection / RCE** — no `eval`, `Function`, `child_process`, `spawn`, `vm`, `require()` from data; argv accepts only the literal `--check`. ✓
- **Path traversal / arbitrary file read** — input file set is the hard-coded `LICENSE_YML_FILES` (4 paths) joined to `REPO_ROOT`; `entry.path` is not used for filesystem access, only as a string in the Unit column; output write is the fixed `LICENSES.md`. No user-supplied path reaches `readFileSync` / `writeFileSync`. ✓
- **YAML parser hardening** — hand-rolled, constrained grammar — no anchors/aliases (no billion-laughs), no `!!` tags (no js-yaml unsafe-load class), no includes, no flow style; unknown keys hard-fail via `KNOWN_FIELDS` validator; type-checks `first_party` boolean. ✓
- **ReDoS** — the four regexes (`/^\s*#/`, `/\s+$/`, `/^- ([a-zA-Z_][a-zA-Z0-9_]*):\s*(.*)$/`, `/\\(["\\])/g`) are anchored, non-ambiguous, no nested quantifiers → linear time on adversarial input. ✓
- **Network / SSRF** — zero `fetch`/`http`/`https`/`net` imports; zero-dep stays intact (`package-lock.json` unchanged). ✓
- **Secret leakage** — no env-var reads, no token handling; error paths quote offending lines for schema diagnostics, but the input set is committed metadata. ✓
- **Output-channel injection** — YAML `copyright:` values interpolate raw into Markdown table cells (existing `</br>` line break in the Minkowski row demonstrates this). Output is a static `LICENSES.md` consumed via GitHub render (HTML sanitised) and local file viewers — not an app-rendered surface, no XSS sink. A pipe (`|`) in a cell would break table layout cosmetically, but the trust boundary is contributor-controlled committed metadata visible in PR review; no privilege escalation, no exfiltration. Below P3 threshold.
- **Trust boundary** — all four `LICENSE.yml` inputs live in the repo and are mutated only via PR; the script runs in CI and on developer laptops, not against external input. Risk surface = malicious-contributor scenario, mitigated upstream by branch protection + code review.

`release.gate.fail` not emitted.

---

## Story 2.1 Round-1 follow-up closure — verification

| Round-1 follow-up (Story 2.1) | Story 2.2 closure mechanism | PR #23 evidence | Status |
|---|---|---|---|
| **P2-01** — In-installer-but-out-of-tree first-party rows need a passthrough mechanism (legal-compliance for `@deepnest/calculate-nfp` Boost-licensed code shipped under `node_modules/`) | §2a option (a) — new `main/LICENSE.yml` (root first-party-passthrough); generator special-cases `path:` → literal Unit-column value for this file (`deriveUnit(licenseYmlRel, entryPath)` at `scripts/build-licenses.mjs:153–161`) | `main/LICENSE.yml` (new, 5 entries: `/main`, `/main/svgparser.js`, `/main/deepnest.js`, `minkowski.cc, minkowski.h`, `/polygon`; all `first_party: true`); rows 1–5 of regenerated `LICENSES.md` first-party block | ✅ closed |
| **P3-01** — Heterogeneous license-string encoding (`GPLv3` non-SPDX vs SPDX everywhere else) | §2.6 SPDX normalisation in lockstep with regression target | `LICENSES.md` row 3: `Boost`→`BSL-1.0` ×2 (rows 4 + 5), `GPLv3`→`GPL-3.0-only` ×1 (row 3); `main/LICENSE.yml` uses SPDX-canonical IDs from the start; cross-verified against SPDX 2.3 §10.1 | ✅ closed |
| **P3-02** — `latolatinfonts.css` row placement (catalogued first-party but rendered in third-party block) | §2.7 optional `first_party: true` schema flag drives first-party-block placement | `main/font/LICENSE.yml` `latolatinfonts.css` entry adds `first_party: true`; row moves to first-party block at position 6; third-party block shrinks 23→22; total table-row count unchanged at 28 | ✅ closed |
| **P3-03** — Schema documentation duplicated across 3× `LICENSE.yml` headers | §2.8 option (α) — ADR-008 §5 step 1 amended with canonical "Schema reference" subsection; per-folder headers reduced | `architecture.md` ADR-008 step 1 has new field-by-field "Schema reference" table (required: `path`, `name`, `license` SPDX, `copyright`, `upstream_url`; optional: `notes`, `first_party`); 4× `LICENSE.yml` headers reduced to ≤ 4 lines (per-file context preserved where it existed) | ✅ closed |

All four Round-1 follow-ups are visibly closed in this PR — recommended Story 2.1 deferred work is fully resolved.

---

## Necessary scope-add disclosure (recorded for transparency)

The PR includes a **13-row `copyright:` cell hygiene pass** in addition to the named §2.6 + §2.7 deltas (5× rows in `main/util/LICENSE.yml`: `clipper.js`, `pathsegpolyfill.js`, `simplify.js`, `_unused/clippernode.js`, `_unused/json.js`; 6× Lato woff/woff2 in `main/font/LICENSE.yml`; 2× SVG specimens in `tests/assets/LICENSE.yml`). This was necessary to fulfil AC-02.2.4's byte-for-byte regression target: first-pass regen surfaced latent inconsistency between `LICENSE.yml` `copyright:` fields (full upstream attribution) and the Story 2.1 hand-regenerated `LICENSES.md` cells (shorter forms). To avoid cell-level drift beyond the named deltas, `copyright:` fields were trimmed to match the rendered cells; the dropped audit-grade detail was preserved by extending the corresponding `notes:` field of each entry.

**Sage assessment:** this is a defensible one-time hygiene step that lock-steps with the §2.6 + §2.7 regression-target adjustment. Story 2.3's `licenses:check` gate will lock the YAML/cell agreement going forward. The scope-add is documented in the PR body and the Dev Agent Record. **No new finding** — the change is transparent and consistent with AC-02.2.4 + AC-02.2.13's intent (no fixture / asset / vendored-source rename or content-change; only metadata `copyright:` and `notes:` fields touched).

---

## Recommendation to the issue creator (Amelia)

**Verdict:** **APPROVED** — merge PR #23.

**Follow-up bundle** (single small PR; recommended owner = Amelia or Story 2.3 / A4 spec author):

- **ADR-008 amendment** (one commit) folding P2-01 + P2-02 + P2-03 + P3-01 + P3-02:
  - State the canonical rendering rule (first-party block precedes third-party; first-party = walk-order + YAML insertion order; third-party = ASCII byte sort by Unit) — closes P2-01.
  - State explicitly that `LICENSE_YML_FILES` IS the configured-roots list (intentional narrowing for review-surface clarity) — closes P2-02.
  - Update §Consequences/Risk row to name the closed-set drift-gate caveat (new roots = deliberate two-file PR) — closes P2-03.
  - Replace `§271 out-of-tree clause` with a subsection-title cross-reference — closes P3-01.
  - Widen "no runtime deps beyond `fs` / `path`" to "Node stdlib only (no transitive deps; no `experimental` APIs)" — closes P3-02.
- **Story 2.3 (A4) scope-add — parser/drift test harness** (P2-04): include the `failSchema` / `failIO` injection-point + smoke harness in the Story 2.3 spec; surface in the Dev Agent Record.
- **Story 2.3 (A4) scope-add — wall-clock CI guard** (P3-06): hand-off to Murat (TEA); 750 ms threshold proposed.
- **Optional polish** in Story 2.3 / A4 PR or a separate small Story 2.4 docs pass: P3-03 (drift-diff truncation honesty), P3-04 (renderTable allocation pattern), P3-05 (`--help` exit code).

**Next step on this PR:** [@Amelia](agent://85a76b80-2d29-4086-b528-7e44ad9fc081) merges PR #23 and hands off to [@Murat](agent://cb45a95b-ee30-49d2-ae12-8a15cdfb3886) (TEA) for tea-trace.

— Sage (Review Leader, `claude_local`)
