# Story 5.1: Add `transformParse` and `polygonifyPath` to `SvgParserInstance` in `index.d.ts`

Status: ready-for-dev

> Authored by John (PM, BMad) on 2026-04-26 via `bmad-create-story` (DEE-83 batch-2) for **MVP-1 / Stream C continuation (C2)**. Sprint plan reference: `_bmad-output/planning-artifacts/sprint-plan.md` §3 row C2. Epic anchor: `_bmad-output/planning-artifacts/epics.md` §"Story 5.1" lines 702–758.
>
> ⚠️ **Story-spec correction caught at authoring time** (see "Story-spec correction" section in Dev Notes): the canonical `SvgParserInstance` type now lives in **two** files — root `index.d.ts` (the *published* types surface, missing the two methods) and `main/ui/types/index.ts` (the *internal* types surface, where the two methods are **already declared**). The story scope is therefore **dual** — extend root `index.d.ts` to match the internal surface, and treat the internal surface as the authoring reference. **Do not blindly add the methods only to `index.d.ts` — verify the signatures match `main/ui/types/index.ts:294-295` first.**

---

## Story

As a **Maintainer working on `main/deepnest.js`**,
I want **`index.d.ts` (the published / root types surface) to declare `transformParse` and `polygonifyPath` on `SvgParserInstance` with signatures matching the call sites in `main/deepnest.js:902` and `main/deepnest.js:916` (and matching the signatures already declared in `main/ui/types/index.ts:294-295`)**,
so that **`tsc --noEmit` passes with zero new errors and zero new `// @ts-ignore` directives, AND the published types surface no longer drifts from the internal types surface (NFR-08 docs/types-freshness)**.

**Sprint role.** This story is **C2 — Stream C's second item** (after Story 6.1 / C1 done). Type-only delta; no runtime change.

**FR/AC coverage:** FR-05 (PRD §FR-05) — AC-05.1 .. AC-05.3.
**ADR binding:** None new. **Preserves ADR-005** (no new globals on `window`; `index.d.ts` is the only legitimate growth surface) and **ADR-007** (strict TS only on `main/**/*.ts`; `tsconfig.json` `include` not extended).
**NFR coupling measured:** NFR-03 (anti-patterns); NFR-08 (docs/types-freshness — the published `index.d.ts` surface stays aligned with the internal `main/ui/types/index.ts` surface).

---

## Acceptance Criteria

1. **AC-05.1.1 — `index.d.ts` (root) declares `transformParse` on `SvgParserInstance`.** A new method declaration is added to the `SvgParserInstance` interface (currently at `index.d.ts:260-273`) with a signature matching the call site in `main/deepnest.js:902` AND matching the existing internal declaration at `main/ui/types/index.ts:294`. Recommended exact signature (verify before adopting):
   ```ts
   /** Parse an SVG `transform` attribute string and return a calc() helper, or null if unparseable */
   transformParse(transformString: string): { calc(point: PolygonPoint): PolygonPoint } | null;
   ```

2. **AC-05.1.2 — `index.d.ts` (root) declares `polygonifyPath` on `SvgParserInstance`.** A new method declaration is added with a signature matching the call site in `main/deepnest.js:916` AND matching the existing internal declaration at `main/ui/types/index.ts:295`. Recommended exact signature (verify before adopting):
   ```ts
   /** Convert an SVG `<path>` element into a polygon point list */
   polygonifyPath(element: SVGPathElement): PolygonPoint[];
   ```

3. **AC-05.1.3 — Signature parity verified between root `index.d.ts` and `main/ui/types/index.ts`.** After this PR, **both files declare the same shape** for `SvgParserInstance` (member-by-member). The implementing agent runs a textual diff between the two interfaces and reports: identical method set + identical method signatures (modulo doc-comment whitespace). If parity cannot be achieved (e.g. one surface uses a different point-type alias), the PR description must call out the divergence and propose a follow-up story to consolidate.

4. **AC-05.1.4 — `tsc --noEmit` over `main/**/*.ts` + `main/ui/**/*.ts` passes with zero new errors.** The pre-PR baseline for the include set in `tsconfig.json` (`include: ["main/**/*.ts", "main/ui/**/*.ts"]`) is captured before the edit; the post-PR run shows the same or fewer errors. **Note** (story-spec context): root `index.d.ts` is **not in the tsconfig include set**, so `tsc --noEmit` will *not* exercise the new declarations directly; AC-05.1.4 verifies "no regression", not "the new methods type-check". The new methods' type-check happens at the call site if/when `main/deepnest.js` is migrated to TS in a future story. See "Why two SvgParserInstance interfaces" below.

5. **AC-05.1.5 — Zero new `// @ts-ignore` directives** are introduced (anti-pattern §16.8). Verified by `git diff | grep '@ts-ignore'` returning only context lines (no `^+` lines).

6. **AC-05.1.6 — `tsconfig.json` is NOT modified.** Single-topology preserved per `_bmad-output/project-context.md` §10. No new `tsconfig.app.json` / `tsconfig.test.json` / `tsconfig.node.json`. No `lib`/`target` change. No `include` extension to bring `index.d.ts` (root) into the type-check set. Verified by `git diff tsconfig.json` returning empty.

7. **AC-05.1.7 — No call site in `main/deepnest.js` is removed or "fixed" to side-step the type extension.** Per AC-05.3 (PRD) + `_bmad-output/project-context.md` §7 explicit guard. The two call sites (`main/deepnest.js:902` and `:916`) are **preserved verbatim**. Verified by `git diff main/deepnest.js` returning empty.

8. **AC-05.1.8 — No new global on `window`.** ADR-005 preserved. The existing `window.SvgParser` global's *type surface* is extended via the type declaration; no new runtime global is added. Verified by `grep -n "window\." index.d.ts main/ui/types/index.ts` showing no new `window.foo` additions in the diff.

9. **AC-05.1.9 — `npm test` is green on the PR (NFR-01 regression check).** Same as Story 1.1 / 2.1 / 4.1: CI run wall-clock within ±20 % of `_bmad-output/planning-artifacts/nfr01-baseline.json` `rolling_mean_ms` (16 746.6 ms ± 20 % = [13 397, 20 096] ms). Placement count remains `54/54`. Type-only delta, so regression risk is essentially zero.

10. **AC-05.1.10 — `project-context.md` §16 anti-patterns hold.** Full 16-item audit map is in Dev Notes. Same pattern as Stories 1.1 / 2.1 / 4.1.

11. **AC-05.1.11 — `PolygonPoint` type used in the new signatures resolves to the same alias in both files.** `index.d.ts` (root) imports / declares `PolygonPoint` from the same source as `main/ui/types/index.ts`. If `PolygonPoint` is not exported from a shared location, the implementing agent must verify both files declare structurally compatible types (likely `{ x: number; y: number }`) and document the structural-alias rationale in the PR description.

---

## Tasks / Subtasks

- [ ] **Task 1 — Read both `SvgParserInstance` interfaces (AC: #1, #2, #3, #11)**
  - [ ] 1.1 Read `index.d.ts:260-273` (the root / published surface — currently missing `transformParse` + `polygonifyPath`).
  - [ ] 1.2 Read `main/ui/types/index.ts:288-302` (the internal surface — already declares both methods).
  - [ ] 1.3 Diff the two interfaces by hand. Note any pre-existing divergence (e.g. method names that exist in one but not the other; doc-comment shape differences).

- [ ] **Task 2 — Read both call sites in `main/deepnest.js` (AC: #1, #2, #11)**
  - [ ] 2.1 Read `main/deepnest.js:900-907` (the `transformParse` call site). Confirm the argument is a string from `el.getAttribute("transform")` and the return value is consumed via `.calc(mid)` where `mid` is a `{ x, y }` point.
  - [ ] 2.2 Read `main/deepnest.js:914-925` (the `polygonifyPath` call site). Confirm the argument is an `el` of `tagName == "path"` and the return value is consumed as an array of `{ x, y }` points.
  - [ ] 2.3 Reconcile call-site usage with the existing `main/ui/types/index.ts:294-295` signatures. If the existing internal signatures don't match the call sites, that is a separate bug — flag in PR description and stop.

- [ ] **Task 3 — Resolve `PolygonPoint` (AC: #11)**
  - [ ] 3.1 Locate the `PolygonPoint` type definition. `main/ui/types/index.ts` likely defines or imports it; check imports near top of file.
  - [ ] 3.2 Decide: import `PolygonPoint` into root `index.d.ts` from a shared module, OR redeclare structurally identical inline (`{ x: number; y: number }`), OR reuse an existing root-level type if present.
  - [ ] 3.3 Document the chosen resolution in the PR description; the choice should minimise drift risk between the two files.

- [ ] **Task 4 — Add the two methods to root `index.d.ts` (AC: #1, #2)**
  - [ ] 4.1 Edit `index.d.ts` `SvgParserInstance` interface (currently at lines 260-273) to add the two method declarations.
  - [ ] 4.2 Match the doc-comment style of the existing methods in the same interface (`/** ... */` JSDoc).
  - [ ] 4.3 Place the new methods in a sensible position within the interface (recommended: alphabetically after `polygonify` for `polygonifyPath`, and after `polygonify` group for `transformParse` — but consistency with the internal file's ordering at `main/ui/types/index.ts:294-295` is acceptable).

- [ ] **Task 5 — Verify `main/ui/types/index.ts` does NOT need editing (AC: #3)**
  - [ ] 5.1 Confirm the internal interface already has both methods at lines 294 and 295.
  - [ ] 5.2 If yes: do NOT edit this file. Document in the PR description that internal/published parity is achieved by the root edit alone.
  - [ ] 5.3 If no (signatures drifted): edit to match the call sites, AND note this in the PR description as an unexpected pre-existing drift.

- [ ] **Task 6 — Run baseline + post-edit type-check (AC: #4)**
  - [ ] 6.1 Pre-edit: `npx tsc --noEmit -p tsconfig.json 2>&1 | tee /tmp/tsc-baseline.txt`. Count errors.
  - [ ] 6.2 Post-edit: same command, redirect to `/tmp/tsc-post.txt`. Count errors.
  - [ ] 6.3 Diff: `diff /tmp/tsc-baseline.txt /tmp/tsc-post.txt` → must show no new errors.
  - [ ] 6.4 If `tsc` is not available locally (Paperclip worktree without `node_modules`), defer to CI.

- [ ] **Task 7 — Scope-creep guard (AC: #5, #6, #7, #8)**
  - [ ] 7.1 `git diff --stat` — touched files MUST be only: `index.d.ts` + (optionally) `main/ui/types/index.ts` (per Task 5.3 contingency) + (optionally) the story file.
  - [ ] 7.2 `git diff main/deepnest.js` — empty (AC-05.1.7).
  - [ ] 7.3 `git diff tsconfig.json` — empty (AC-05.1.6).
  - [ ] 7.4 `git diff | grep '@ts-ignore'` — only context lines (AC-05.1.5).

- [ ] **Task 8 — Pre-commit + CI run (AC: #9, #10)**
  - [ ] 8.1 `git commit` without `--no-verify`. Hook absence acceptable per Story 1.1 precedent.
  - [ ] 8.2 Push the PR; verify CI Playwright run is green; record wall-clock vs NFR-01 baseline.
  - [ ] 8.3 If CI's `paths:` filter does not match `.d.ts` (it should — see `.github/workflows/playwright.yml`'s pattern set), trigger manually.

- [ ] **Task 9 — PR composition (AC: all)**
  - [ ] 9.1 Open PR titled `feat(types): Story 5.1 — declare transformParse + polygonifyPath on SvgParserInstance (DEE-?? / FR-05)`.
  - [ ] 9.2 PR description includes: AC checklist (all 11), the diff of the new method declarations (2 methods × 2-3 lines each), §16 anti-pattern 16/16-pass checklist, NFR-01 verification section, **the parity verification table** (root `index.d.ts` vs internal `main/ui/types/index.ts` member set), `PolygonPoint` resolution rationale, the call-site quotes from `main/deepnest.js:902` + `:916`.
  - [ ] 9.3 Self-Review (Amelia's `bmad-code-review`) → Review-Board handoff per the standard Phase-4 protocol.

---

## Dev Notes

### Project context (binding)

- **Repo:** `deepnest-next` (community fork of Deepnest 2D bin-packing for Electron). See `_bmad-output/project-context.md` §1 for orientation.
- **Stream:** This story is **C2 — Stream C's second item** (after Story 6.1 / C1 done). Independent of all other MVP epics; touches only `index.d.ts` (and optionally `main/ui/types/index.ts`).
- **Sequencing implication:** None. Type-only delta; no merge conflict risk with any other in-flight stream.

### Story-spec correction (caught at authoring time)

The epic spec (`_bmad-output/planning-artifacts/epics.md` lines 702–758) names "`index.d.ts`" without qualifying which one. Inspection of the repo on 2026-04-26 reveals **two** files with `SvgParserInstance` interfaces:

1. **Root `index.d.ts`** (published types surface — `package.json` `types: "index.d.ts"` field; this is what downstream consumers import). Currently at lines 260-273. **Missing** `transformParse` and `polygonifyPath`.
2. **`main/ui/types/index.ts`** (internal types surface — used by `main/ui/**/*.ts` for type-checking). Currently at lines 288-302. **Already declares** both methods at lines 294-295.

The PRD (§FR-05) and architecture overlay (§3.1, §4 §FR-05) both name "`index.d.ts`" — the root file. The work to do is therefore:

- **Primary:** Extend root `index.d.ts` to match the internal surface (add the two missing methods).
- **Secondary verification:** Confirm `main/ui/types/index.ts` already has the two methods (no edit needed). If for some reason it doesn't, add them there too with the same signature.

This is **not** a scope expansion — it is a clarification of "which `index.d.ts`". The work is still type-only and ~5 lines net.

**Why is there drift today?** Likely history: someone migrated `main/ui/` to TypeScript and added the two methods to the internal types surface, but the published root `index.d.ts` (which is the "public API contract") was not kept in sync. NFR-08 (docs/types-freshness) is what this story closes.

### Why two `SvgParserInstance` interfaces (and why both stay)

- **Root `index.d.ts`** is the **published declaration file** (referenced by `package.json` `types`). Consumers of `deepnest-next` as an npm package see this file. It is **not** type-checked locally because `tsconfig.json` `include` is `["main/**/*.ts", "main/ui/**/*.ts"]` — root is outside that set.
- **`main/ui/types/index.ts`** is the **internal types surface** — `main/ui/**/*.ts` files import from here. `tsc --noEmit` exercises this surface.

The split is intentional (per ADR-005 + ADR-007 single-topology rule). The bug is that the published surface drifted behind the internal one. AC-05.1.4 + AC-05.1.3 close that drift.

**Implication for AC-05.1.4 ("zero new errors"):** Because root `index.d.ts` is outside the `include` set, adding methods to it cannot *introduce* tsc errors. The "zero new errors" check is a **regression guard** for the internal surface — it ensures the implementing agent didn't accidentally edit `main/ui/types/index.ts` in a way that broke existing call sites.

### Edit sites — verified line numbers (2026-04-26)

| Site | Current lines | Action |
|---|---|---|
| Root `index.d.ts` `SvgParserInstance` interface | 260-273 | **Add** `transformParse(...)` and `polygonifyPath(...)` declarations |
| `main/ui/types/index.ts` `SvgParserInstance` interface | 288-302 | **Verify** both methods present (lines 294-295). Do not edit unless drift found. |
| `main/deepnest.js:902` | the `transformParse` call site | **Do not edit.** Read for signature derivation. |
| `main/deepnest.js:916` | the `polygonifyPath` call site | **Do not edit.** Read for signature derivation. |
| `tsconfig.json` `include` array | top of file | **Do not edit.** Single-topology preserved. |

### Diff sketch (illustrative — final wording subject to Task 3 decision on `PolygonPoint`)

```diff
@@ index.d.ts around lines 260-273 @@
 export interface SvgParserInstance {
   /** Load and parse SVG content */
   load(dirpath: string | null, svgstring: string, scale: number, scalingFactor?: number | null): SVGSVGElement;
   /** Clean input SVG for nesting */
   cleanInput(dxfFlag?: boolean): SVGSVGElement;
   /** Supported polygon element types */
   polygonElements: string[];
   /** Check if an element forms a closed path */
   isClosed(element: SVGElement, tolerance: number): boolean;
   /** Convert element to polygon points */
   polygonify(element: SVGElement): PolygonPoint[];
+  /** Convert an SVG `<path>` element into a polygon point list */
+  polygonifyPath(element: SVGPathElement): PolygonPoint[];
+  /** Parse an SVG `transform` attribute string and return a calc() helper, or null if unparseable */
+  transformParse(transformString: string): { calc(point: PolygonPoint): PolygonPoint } | null;
   /** Configure parser options */
   config(options: { tolerance: number; endpointTolerance?: number }): void;
 }
```

(Net diff in root `index.d.ts`: ~4 added lines. `main/ui/types/index.ts` likely untouched. Total reviewer surface: ~4 lines + the parity-verification table.)

### Call-site references (verbatim — for signature derivation)

**`main/deepnest.js:900-907` (`transformParse` call site):**
```js
var transformString = el.getAttribute("transform");
if (transformString) {
  var transform = window.SvgParser.transformParse(transformString);
  if (transform) {
    mid = transform.calc(mid);
  }
}
```

→ Argument: `string` (from `el.getAttribute("transform")` — TypeScript-wise, `string | null`, but the `if (transformString)` guard narrows to `string` before the call).
→ Return: an object with a `.calc(point)` method, OR `null` (the `if (transform)` guard implies nullability).
→ `.calc()` argument: `mid` (a `{ x, y }` point).
→ `.calc()` return: a `{ x, y }` point (consumed by `pointInPolygon(mid, part.polygontree)`).

**`main/deepnest.js:914-925` (`polygonifyPath` call site):**
```js
} else if (el.tagName == "path" || el.tagName == "polyline") {
  var k;
  if (el.tagName == "path") {
    var p = window.SvgParser.polygonifyPath(el);
  } else {
    var p = [];
    for (k = 0; k < el.points.length; k++) {
      p.push({ x: el.points[k].x, y: el.points[k].y });
    }
  }
}
```

→ Argument: `el` of `tagName == "path"` (TypeScript-wise, `SVGPathElement`).
→ Return: an array of `{ x, y }` points (assignable to the same type built in the `else` branch).

Both call-site signatures match the existing `main/ui/types/index.ts:294-295` declarations:
```ts
polygonifyPath(element: SVGPathElement): PolygonPoint[];
transformParse(transformString: string): { calc(point: PolygonPoint): PolygonPoint } | null;
```

→ **Use these signatures verbatim** for the root `index.d.ts` extension.

### Anti-pattern audit map (project-context.md §16)

| §16.X | Anti-pattern | This story's exposure | Verification |
|---|---|---|---|
| 1 | New global on `window` | None — type extension on existing `window.SvgParser` global; no new global | `git diff` + grep |
| 2 | `ipcRenderer.invoke('read-config'\|'write-config')` outside `config.service.ts` | None | — |
| 3 | New `background-*` IPC handler outside `nesting.service.ts` | None | — |
| 4 | New UI framework | None | — |
| 5 | Modify vendored utilities in `main/util/` | None | — |
| 6 | Import from `main/util/_unused/` | None | — |
| 7 | New TypeScript decorator transform | None | — |
| 8 | New `// @ts-ignore` | **Forbidden** — this story exists *because* removing the methods or adding `@ts-ignore` would side-step FR-05 | `git diff \| grep '@ts-ignore'` returns nothing new |
| 9 | `--no-verify` to skip pre-commit | **Forbidden.** | `git log --pretty=fuller` |
| 10 | Drop / re-encode `tests/assets/*.svg` without re-deriving spec literals | None | `git diff --stat tests/assets` empty |
| 11 | Double-convert mm/inch | None | — |
| 12 | Open external URLs by spawning a `BrowserWindow` | None | — |
| 13 | Add HTTP server / telemetry / DB | None | — |
| 14 | Assume Windows `clean`/`clean-all` works on Linux/macOS | N/A | — |
| 15 | Remove `**/*.js` from ESLint global ignore | None | `git diff eslint.config.mjs` empty |
| 16 | New spinner glyph | None | — |

### Pre-flight reads (binding)

Before editing, the implementing agent **must** have read:

1. `_bmad-output/project-context.md` §16 — full anti-pattern list.
2. `_bmad-output/project-context.md` §7 — data model invariants (`index.d.ts` is canonical for `window.SvgParser`).
3. `_bmad-output/project-context.md` §10 — TypeScript / language rules (`lib`/`target` invariants; single-topology preserved).
4. `_bmad-output/project-context.md` §11 — pre-commit hook / no-`--no-verify` rule.
5. `_bmad-output/planning-artifacts/architecture.md` §3.1 (FR-05 row) + §4 (FR-05 architectural constraints (a)–(d)).
6. `_bmad-output/planning-artifacts/architecture.md` §5 ADR-005 + ADR-007 (single-topology + `window` globals).
7. `_bmad-output/planning-artifacts/prd.md` §FR-05 (AC-05.1..AC-05.3).
8. **Root `index.d.ts`** (lines 260-273 — current `SvgParserInstance`; the surface to extend).
9. **`main/ui/types/index.ts`** (lines 288-302 — verify the methods are already present; reference signatures).
10. `main/deepnest.js` (lines 900-925 — the call sites).

### Sprint risk callouts (from sprint-plan.md §5)

- **R1 (Low / High) — NFR-01 wall-clock regression > 20 %.** Pure type-only delta; regression risk near-zero. Task 8.2 still records the duration.
- **R6 (Medium / Medium) — story is unexpectedly larger than its IR sizing claims.** Realistic risk here: the `PolygonPoint` resolution (Task 3) may surface a deeper alias-divergence between root `index.d.ts` and `main/ui/types/index.ts` that requires a small refactor. Mitigation: if the alias resolution touches > 1 file beyond `index.d.ts` + `main/ui/types/index.ts`, escalate via `bmad-correct-course` rather than letting scope creep.

### Project Structure Notes

- **Files touched are exactly:** `index.d.ts` (root) + (optionally) `main/ui/types/index.ts` (only if Task 5.3 contingency fires) + (optionally) the story file. **No** `.js` file. **No** `package.json`. **No** `tsconfig.json`. **No** `.github/`. **No** `tests/`. **No** `docs/`.
- **No new files created.**
- **No `tsconfig.json` change** — single-topology preserved (ADR-007 + project-context §10).

### Testing standards summary

- **`npm test` is the only test layer.** Single Playwright spec at `tests/index.spec.ts`. Type-only delta; spec is unaffected. Per `_bmad-output/project-context.md` §12.
- **No new test added** — the type-check is the test surface (AC-05.1.4 regression guard).
- **`tsc --noEmit` is the type-side verification.** Run pre + post and diff (Task 6).

---

## References

- [Source: `_bmad-output/planning-artifacts/epics.md` lines 702–758 §"Story 5.1: Add transformParse and polygonifyPath to SvgParserInstance in index.d.ts"]
- [Source: `_bmad-output/planning-artifacts/epics.md` lines 691–700 §"Epic 5: SvgParserInstance type-gap closure"]
- [Source: `_bmad-output/planning-artifacts/sprint-plan.md` §3 row C2]
- [Source: `_bmad-output/planning-artifacts/architecture.md` §3.1 row FR-05 + §4 §"FR-05" + §5 §"ADR-005", §"ADR-007"]
- [Source: `_bmad-output/planning-artifacts/prd.md` §FR-05 (AC-05.1..AC-05.3)]
- [Source: `_bmad-output/project-context.md` §7 (data model invariants), §10 (TS rules), §16 (anti-patterns)]
- [Source: root `index.d.ts:260-273` — current `SvgParserInstance` interface (the surface to extend)]
- [Source: `main/ui/types/index.ts:288-302` — internal `SvgParserInstance` interface (already has both methods at lines 294-295; reference signatures)]
- [Source: `main/deepnest.js:900-925` — the two call sites (`transformParse` at 902, `polygonifyPath` at 916)]
- [Source: `_bmad-output/planning-artifacts/nfr01-baseline.json` — `rolling_mean_ms = 16746.6`, `tolerance_pct = 20`]
- [Parent issue: DEE-83 (CS batch-2 follow-up to DEE-82 standup)]
- [Sprint label: MVP-1; Sprint-Start gate OPEN per CTO sign-off in DEE-53]

---

## Dev Agent Record

### Agent Model Used

_(Populated by the implementing Dev agent at story execution time.)_

### Debug Log References

_(Populated by the implementing Dev agent.)_

### Completion Notes List

_(Populated by the implementing Dev agent.)_

### File List

_(Populated by the implementing Dev agent.)_

### Change Log

| Date | Change | Author |
|---|---|---|
| 2026-04-26 | Story created (`bmad-create-story` batch-2, DEE-83). Status: ready-for-dev. **Story-spec correction noted at authoring time:** epic spec names "`index.d.ts`" but the type now lives in two files (root `index.d.ts` published surface — missing the methods; `main/ui/types/index.ts` internal surface — already has them). Story scope clarified to extend root file to achieve parity, not blindly mirror epic wording. | John (PM, BMad) |
