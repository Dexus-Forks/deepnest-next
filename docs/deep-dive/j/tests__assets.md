# Deep Dive — `tests/assets/`

> **Group**: J (test suite) · **Issue**: [DEE-42](../../../) · **Parent**: [DEE-11](../../index.md) · **Author**: Paige · **Generated**: 2026-04-26
>
> Per-file deep dive following the [DEE-11 shared template](../b/README.md#per-file-template), batched into a single doc per the issue scope (one inventory write-up rather than one stub per asset). Companion file in this group: [`tests__index.spec.ts.md`](./tests__index.spec.ts.md).

| Field | Value |
|---|---|
| Path | [`tests/assets/`](../../../tests/assets/) |
| File count | 2 (both `*.svg`) |
| Total bytes | 96 481 |
| Consumer | [`tests/index.spec.ts`](../../../tests/index.spec.ts) `Upload files` step ([:120-133](../../../tests/index.spec.ts)) |

---

## 1. Purpose

The two SVG files in this directory are the **input parts** for the single end-to-end nesting test. They are intentionally complex, glyph-derived outlines (single `<path>` element each with dozens of closed sub-paths) that exercise the SVG parser's multi-subpath decomposition, the GA's per-rotation polygon evaluation, and the rendering pipeline through to SVG export. Together they produce the `54/54` placement count asserted at [`tests/index.spec.ts:185-186`](../../../tests/index.spec.ts).

The directory is **enumerated dynamically** by the test:

```ts
const inputDir = path.resolve(__dirname, "assets");
const files = (await readdir(inputDir))
  .filter((file) => path.extname(file) === ".svg")
  .map((file) => path.resolve(inputDir, file));
```
([`tests/index.spec.ts:121-124`](../../../tests/index.spec.ts))

— meaning any additional `*.svg` dropped here will be picked up automatically. The literal `2` at `:132` (`#importsnav li` count) and the `54/54` placement count at `:185-186` would then have to be updated in lockstep.

---

## 2. Public surface (file inventory)

| File | Bytes | `<path>` elements | Closed sub-paths (`M…Z`) | Approx. coordinate extent | Used by test step | Cleanup status |
|---|---:|---:|---:|---|---|---|
| [`henny-penny.svg`](../../../tests/assets/henny-penny.svg) | 70 200 | 1 | 36 | x ≈ 0–1188, y ≈ 0–110 (no `viewBox`, no `width`/`height`) | `Upload files` ([:120-133](../../../tests/index.spec.ts)) — half of the 2 imports | Active fixture (in use) |
| [`mrs-saint-delafield.svg`](../../../tests/assets/mrs-saint-delafield.svg) | 26 281 | 1 | 44 | x ≈ 0–688, y ≈ 0–102 (no `viewBox`, no `width`/`height`) | `Upload files` ([:120-133](../../../tests/index.spec.ts)) — the other import | Active fixture (in use) |

Both files share the same minimal envelope: `<svg xmlns="http://www.w3.org/2000/svg"><path d="…"/></svg>` — a single `<path>` whose `d` attribute is a long bezier-quadratic sequence (`Q` and `L` segments only, no `C` or arcs). No grouping (`<g>`), no embedded styles, no `<text>`, no `viewBox`.

The 36 + 44 = 80 closed sub-paths do **not** map 1:1 to nested parts. After [`main/svgparser.js`](../b/main__svgparser.js.md) cleans the input and [`main/deepnest.js`](../b/main__deepnest.js.md) `importsvg` runs, parent/child polygon nesting (holes inside outer outlines) collapses some sub-paths into hole relationships rather than separate placements. The net result is the `54` nestable parts asserted by the test.

---

## 3. IPC / global side-effects

None — these are static fixtures. They reach the renderer through the file-picker monkeypatch in [`tests/index.spec.ts:125-130`](../../../tests/index.spec.ts):

```ts
await electronApp.evaluate(({ dialog }, paths) => {
  dialog.showOpenDialog = async (): Promise<OpenDialogReturnValue> => ({
    filePaths: paths,
    canceled: false,
  });
}, files);
await mainWindow.click("id=import");
```

The `#import` button delegates to [`main/ui/services/import.service.ts`](../d/main__ui__services__import.service.md), which reads the file with `fs.readFile`, hands it to `DeepNest.importsvg(...)`, and pushes the resulting parts onto `DeepNest.parts`. Because the `.svg` extension is recognised directly, **the conversion server is not involved** — the asset choice keeps the test offline.

---

## 4. Dependencies (in / out)

| Direction | What |
|---|---|
| **In (consumed by)** | [`tests/index.spec.ts`](../../../tests/index.spec.ts) `Upload files` step. No production code references these files. |
| **Out (depends on)** | None — pure data files. The SVG content depends only on the W3C SVG 1.1 path grammar (the `M`, `L`, `Q`, `Z` subset). |

The asset directory is **not** packaged into the Electron build: [`package.json`](../../../package.json) `build.files` excludes `!test**` ([`:104`](../../../package.json)).

---

## 5. Invariants & gotchas

1. **Asset count and placement count are coupled**. The `Upload files` step asserts `#importsnav li` = `2` ([:132](../../../tests/index.spec.ts)); the placement assertion expects `54/54` ([:186](../../../tests/index.spec.ts)). Adding or removing a file under `tests/assets/` requires both literals to be re-derived from a fresh test run.
2. **Both SVGs lack `viewBox` and `width`/`height` attributes**. The browser falls back to `300 × 150` per CSS, but [`main/svgparser.js`](../b/main__svgparser.js.md) reads from the path coordinates directly, so the missing dimensions do not affect nesting. They would matter if the test ever rendered the imported SVG into a visible element for screenshot comparison.
3. **Single `<path>` with many subpaths**. The SVG parser must split the path on each `M…Z` subpath. A regression in subpath handling would change the `54/54` count without breaking the file format. The `54/54` magic number is therefore the canary for that pipeline.
4. **Offline by design**. Both files are `.svg` — they take the direct import path in [`import.service.ts`](../d/main__ui__services__import.service.md) and never round-trip through the conversion server. The test passes without network access. Adding a `.dxf` / `.dwg` / `.eps` / `.ps` fixture here would silently turn the test into an online test.
5. **No metadata (license, author, source attribution) is committed alongside the files**. The names match Google Fonts (`Henny Penny`, `Mrs Saint Delafield`), both available under the SIL Open Font License — but no `LICENSE` or `README` in `tests/assets/` records this. If the project's [`LICENSES.md`](../../../LICENSES.md) does not already cover bundled font glyphs, this is a paperwork gap, not a test gap.
6. **Bytes-on-disk are large for path-only SVGs** (96 KB combined). Decimal precision in `Q` control points (two decimal places everywhere) dominates. Stripping to one decimal would shrink files by ~20% and would not change the `54/54` count materially — but it *would* drift the GA-derived placement coordinates.
7. **Asset content drift breaks the test silently**. Re-exporting either glyph from a new font version, or any tool that re-orders subpaths, would change polygon count. There is no checksum or snapshot of these files.
8. **`__dirname` resolution in TypeScript ESM**. The spec uses `path.resolve(__dirname, "assets")` ([:121](../../../tests/index.spec.ts)). This works because [`tsconfig.json`](../h/tsconfig.json.md) compiles to CommonJS, where `__dirname` is a real binding. A future move to native ESM would require `import.meta.url` + `fileURLToPath`.

---

## 6. Known TODOs

None. No companion `README`, `LICENSE`, or `MANIFEST` exists in `tests/assets/` to carry TODO markers. The directory is treated as a flat fixture bag.

Implicit follow-ups discovered during this deep dive:

- Document the licence / origin of each glyph SVG (see invariant #5).
- Consider a `tests/assets/README.md` recording: source font, version, glyph(s) extracted, conversion tool, expected `M…Z` count.
- Consider a checksum or snapshot of placement count to make the asset / test coupling explicit (invariant #7).

---

## 7. Extension points

| Extension | How |
|---|---|
| Add a third glyph fixture | Drop the `*.svg` here. Run the test, observe the new `#importsnav li` count and the new `H1[1]` placement text, update both literals in [`tests/index.spec.ts`](../../../tests/index.spec.ts). |
| Add a `.dxf` fixture (exercise the conversion server) | Drop `foo.dxf` here, then update the filter at `:123` from `=== ".svg"` to a multi-extension predicate. The test will become online-dependent. |
| Replace the glyphs with simpler shapes | Any SVG with a single `<path>` works. Simpler shapes will speed the GA up; the `54/54` literal will drop. |
| Strip path precision to shrink the files | Run an SVGO pass with two-decimal precision; verify the placement count survives. |

---

## 8. Test coverage status

The fixtures themselves are **not** test-covered (they are static data). Their *consumption* is covered by every assertion in [`tests/index.spec.ts`](../../../tests/index.spec.ts) downstream of the `Upload files` step. Specifically:

- ✅ Both files reach `#importsnav` and produce two list items.
- ✅ Their combined polygon count drives the `54/54` assertion.
- ✅ Their geometry is rendered to the exported SVG attached as `nesting.svg`.
- ❌ No integrity check (hash / dimension assertion) on the files themselves.
- ❌ No assertion that both files contributed parts (a regression that drops one file silently could still hit the right count if the other file's geometry doubled).

---

## 9. References

- [`tests/assets/henny-penny.svg`](../../../tests/assets/henny-penny.svg)
- [`tests/assets/mrs-saint-delafield.svg`](../../../tests/assets/mrs-saint-delafield.svg)
- [`tests/index.spec.ts`](../../../tests/index.spec.ts) — sole consumer; deep dive [`tests__index.spec.ts.md`](./tests__index.spec.ts.md)
- [`main/svgparser.js`](../../../main/svgparser.js) — subpath decomposition; deep dive [`docs/deep-dive/b/main__svgparser.js.md`](../b/main__svgparser.js.md)
- [`main/deepnest.js`](../../../main/deepnest.js) — `importsvg` consumer; deep dive [`docs/deep-dive/b/main__deepnest.js.md`](../b/main__deepnest.js.md)
- [`main/ui/services/import.service.ts`](../../../main/ui/services/import.service.ts) — `#import` click handler; deep dive [`docs/deep-dive/d/main__ui__services__import.service.md`](../d/main__ui__services__import.service.md)
- [`package.json`](../../../package.json) `build.files` exclusion — keeps `tests/` out of the packaged app
