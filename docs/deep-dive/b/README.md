# Deep dive — Group B: legacy renderer (window globals)

> Per-file deep dives for the legacy renderer code that lives outside `main/ui/` and is loaded directly into the visible / hidden Electron renderers without TypeScript compilation. Sibling of [DEE-11](../../../) parent issue and [DEE-13](../../../) tracking issue.

## Files in this group

### B1 — Core renderer modules

| File | Deep dive |
|---|---|
| `main/deepnest.js` | [main__deepnest.js.md](./main__deepnest.js.md) |
| `main/background.js` | [main__background.js.md](./main__background.js.md) |
| `main/svgparser.js` | [main__svgparser.js.md](./main__svgparser.js.md) |
| `main/nfpDb.ts` | [main__nfpDb.ts.md](./main__nfpDb.ts.md) |

### B2 — `main/util/*`

Vendored third-party libraries:

| File | Upstream | Version | Deep dive |
|---|---|---|---|
| `main/util/clipper.js` | [angusj/Clipper](http://www.angusj.com/clipper2/) | 6.2.1 (rev 482) | [main__util__clipper.js.md](./main__util__clipper.js.md) |
| `main/util/interact.js` | [taye/interact.js](https://github.com/taye/interact.js) | 1.2.6 | [main__util__interact.js.md](./main__util__interact.js.md) |
| `main/util/pathsegpolyfill.js` | [progers/pathseg](https://github.com/progers/pathseg) | unversioned | [main__util__pathsegpolyfill.js.md](./main__util__pathsegpolyfill.js.md) |
| `main/util/ractive.js` | [ractivejs/ractive](https://ractive.js.org/) | 0.8.1 (commit fd141da) | [main__util__ractive.js.md](./main__util__ractive.js.md) |
| `main/util/simplify.js` | [mourner/simplify-js](https://mourner.github.io/simplify-js/) | unversioned (≈ 1.x) | [main__util__simplify.js.md](./main__util__simplify.js.md) |
| `main/util/svgpanzoom.js` | [bumbu/svg-pan-zoom](https://github.com/bumbu/svg-pan-zoom) | 3.6.2 | [main__util__svgpanzoom.js.md](./main__util__svgpanzoom.js.md) |

First-party (deepnest):

| File | Deep dive |
|---|---|
| `main/util/parallel.js` | [main__util__parallel.js.md](./main__util__parallel.js.md) |
| `main/util/geometryutil.js` | [main__util__geometryutil.js.md](./main__util__geometryutil.js.md) |
| `main/util/domparser.ts` | [main__util__domparser.ts.md](./main__util__domparser.ts.md) |
| `main/util/eval.ts` | [main__util__eval.ts.md](./main__util__eval.ts.md) |
| `main/util/HullPolygon.ts` | [main__util__HullPolygon.ts.md](./main__util__HullPolygon.ts.md) |
| `main/util/matrix.ts` | [main__util__matrix.ts.md](./main__util__matrix.ts.md) |
| `main/util/point.ts` | [main__util__point.ts.md](./main__util__point.ts.md) |
| `main/util/vector.ts` | [main__util__vector.ts.md](./main__util__vector.ts.md) |

## Out of scope — `main/util/_unused/`

The directory `main/util/_unused/` is **deliberately excluded**. The first-pass docs (`docs/architecture.md`, `docs/component-inventory.md`, `docs/source-tree-analysis.md`) do not reference any file under `_unused/`, and no production code path loads them. Files in that directory at the time of this scan:

- `clippernode.js`
- `filesaver.js`
- `hull.js`
- `json.js`
- `placementworker.js`

If a future refactor reactivates any of these, add it to a new follow-up issue rather than backfilling Group B. `placementworker.js` is the most likely landmine — see the gotcha in [main__util__parallel.js.md](./main__util__parallel.js.md).

## How these files are loaded

The visible renderer (`main/index.html`) loads the vendored utilities as classic `<script>` tags **before** any module code executes. They install themselves on `window` (`window.simplify`, `window.GeometryUtil`, `window.Parallel`, `window.svgPanZoom`, `window.Ractive`, `window.ClipperLib`, `interact()`). Then a single `<script type="module">` block imports `SvgParser` and `DeepNest` from the legacy `.js` files (which reach `import` statements pointing into compiled `build/util/*.js`) and assigns the singletons to `window.SvgParser` and `window.DeepNest`.

The hidden background renderer (`main/background.html`) imports `main/background.js`, which in turn imports `NfpCache` from `build/nfpDb.js` (TypeScript-compiled output of `main/nfpDb.ts`) and pulls Parallel/clipper into worker scripts via `p.require('../../main/util/clipper.js')`.

This explains why the same util can be touched from three contexts: visible renderer, background renderer, and per-pair NFP worker spawned from `parallel.js`. Any change to a util has to be compatible with all three.

## Per-file template

Each deep dive uses the `DEE-11` shared template:

1. **Purpose** — one paragraph
2. **Public surface** — exports / globals / IPC
3. **IPC / global side-effects** — what touches `window` or `ipcRenderer`
4. **Dependencies (in / out)** — who imports this; who this imports
5. **Invariants & gotchas** — load order, stale assumptions, hidden contracts
6. **Known TODOs** — `// todo:`, `// FIXME`, `_unused/` debt
7. **Extension points** — where future work plugs in
8. **Test coverage** — Playwright spec lines that exercise this; otherwise "manual / not covered"

Vendored files get a shorter form: purpose, upstream URL + version, how it is loaded, and any local fork / patch notes.

## Acceptance criteria coverage

For each of the 18 files in scope (4 B1 + 14 B2), the corresponding doc covers:

- ✅ Purpose, public surface, and how the file is loaded
- ✅ IPC / global side-effects (or explicit "none")
- ✅ In/out dependencies pinned to importer call-sites
- ✅ Invariants & gotchas with line-number citations where the source carries hidden contracts
- ✅ Known TODOs — `// todo:` / `// FIXME` markers quoted verbatim, plus higher-level debt (worker-pool cap, listener leaks, env-var honoured only in `deepnest.js`)
- ✅ Extension points
- ✅ Test coverage status (E2E only via `tests/index.spec.ts`; no unit tests below the UI layer)
- ✅ Cross-references between Group B docs and to sibling groups (D services, J tests)
- ✅ Vendored vs first-party explicitly stated; vendored files use the shorter "purpose / upstream / version / load order / local-fork notes" form

## Status

- **Author**: Paige (tech-writer agent), full-redo per [DEE-11 board directive](../../../) → DEE-34.
- **Branch**: `chore/dee-11-iso/group-b` (Paperclip-managed worktree off `chore/bmad-method-setup`).
- **Source-grounded**: every doc was written against the current source tree in this worktree (no carry-over from prior `chore/dee-11/group-b` attempts).
- **Completion timestamp**: 2026-04-26.
