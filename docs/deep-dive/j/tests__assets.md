# `tests/assets/` — E2E spec input fixtures

Two SVG fixtures consumed by [`tests/index.spec.ts`](../../../tests/index.spec.ts).
The test enumerates this directory at runtime
([`tests/index.spec.ts:121-124`](../../../tests/index.spec.ts)),
filters by `.svg`, and stubs Electron's `dialog.showOpenDialog` to
return the absolute paths.

```
tests/assets/
├── henny-penny.svg         <- 70 200 bytes, 36 closed sub-paths
└── mrs-saint-delafield.svg <- 26 281 bytes, 44 closed sub-paths
```

Both files are **path-only outlines of script-font glyphs**, dropped
in to give the Genetic-Algorithm nesting loop a sufficiently
non-trivial input to (a) produce more than a handful of distinct
parts, (b) include glyphs with internal holes (so the polygon-tree
exercises hole-nesting), and (c) be small enough to nest into a
`300 mm × 200 mm` sheet quickly enough to land at least one
`background-response` iteration before Playwright's default poll
budget runs out.

## Inventory

| File | Size | Sub-paths | Single `<path>`? | viewBox / width / height | Stroke / fill attrs |
| --- | --- | --- | --- | --- | --- |
| `henny-penny.svg` | 70 200 B | 36 (`M…Z` runs) | yes | none — coordinate space is implicit (~0 to ~1187 on x, ~0 to ~107 on y for visible glyphs) | none — relies on the renderer default `fill: black` |
| `mrs-saint-delafield.svg` | 26 281 B | 44 (`M…Z` runs) | yes | none — coordinate space is implicit (~0 to ~688 on x, ~38 to ~144 on y) | none — relies on the renderer default `fill: black` |

Both files share the same minimal envelope:

```xml
<svg xmlns="http://www.w3.org/2000/svg"><path d="M… Q… L… Z M… Q… L… Z …"/></svg>
```

There is no `viewBox`, no `width` / `height` attribute, no `<g>`,
`<rect>`, `<polygon>`, `<text>`, or any other element. Curves are
all quadratic Béziers (`Q`) and straight segments (`L`); no cubics,
no arcs.

## Per-asset usage notes

### `henny-penny.svg`

**What it is.** Path-data export of the word(s) "Henny Penny" rendered
in the [Henny Penny](https://fonts.google.com/specimen/Henny+Penny)
display font (Google Fonts, OFL). The 36 sub-paths correspond to the
outer letterforms plus the internal holes of glyphs that have one
(`e`, `n` counters, `P`, `H` cross-bar arches, etc.). Once
[`main/svgparser.js`](../../../main/svgparser.js) has flattened the
quadratic Béziers (using the configured `curveTolerance: 0.72` from
`DEFAULT_CONFIG`) and built the polygon tree, the holes are nested
into their containing letterforms — so the **part count after parse
is lower than the sub-path count**.

**Why it was chosen.** Combined with `mrs-saint-delafield.svg`, the
two files together produce **54 outer parts** after polygon-tree
extraction (asserted by
[`tests/index.spec.ts`](../../../tests/index.spec.ts) as
`#nestinfo h1:nth(1) === "54/54"`). 54 is enough that:

- The GA's pairwise NFP cache builds non-trivially (54 × 54 part
  pairs at 4 rotations each; the test sets `rotations: 4`).
- The placement step is more than a one-shot bin pack — multiple
  iterations produce distinguishable best-fitness candidates in
  `#nestlist`.
- The result still fits on the configured `300 × 200 mm` sheet, so
  the test asserts `1` sheet used (single-sheet placement).

**Used by which test case.** The single `Nest` test in
`tests/index.spec.ts`, in the `Upload files` step
([`tests/index.spec.ts:120-133`](../../../tests/index.spec.ts)).
Imported as one of two files; appears as one `<li>` entry in
`#importsnav` (the test asserts the count is `2`).

**Size / glyph constraints that matter.**

| Constraint | Effect on the test |
| --- | --- |
| No `viewBox` | The SVG parser treats coordinates as raw SVG units (1 unit ≈ 1/72 inch under `scale: 72`). The visible coordinate range (~1187 × ~107) is well below the 300 × 200 mm sheet (which translates to ≈ 850 × 567 SVG units after the `mm × scale ÷ 25.4` conversion that `sheet-dialog` performs). All 36 sub-paths fit on one sheet. |
| All curves are quadratic | The `curveTolerance: 0.72` flattening produces enough segments for hole-nesting to work, but few enough that NFP generation finishes inside Playwright's poll budget. |
| Single `<path>` element | Hole / outer-loop relationships come from sub-path winding direction, not from explicit `<path>` parents. Exercises `main/svgparser.js`'s polygon-tree builder. |
| No `id`, `class`, `fill`, `stroke` | Parts inherit the renderer's default presentation. The export step (`#exportsvg`) round-trips them with whatever attributes `ExportService` synthesises. |
| 70 200 bytes / single line | Big enough that an accidental editor-driven reformat (e.g. running the tree through Prettier) would risk corrupting the path data; small enough that it's checked into the repo without LFS. |

### `mrs-saint-delafield.svg`

**What it is.** Path-data export of "Mrs Saint Delafield" rendered in
the [Mrs Saint Delafield](https://fonts.google.com/specimen/Mrs+Saint+Delafield)
script font (Google Fonts, OFL). The 44 sub-paths correspond to
letterforms with their swashes and counters. Coordinate range for
the visible glyphs is roughly `(0, 38)` to `(688, 144)` (x, y in
SVG units).

**Why it was chosen.** Pairs with `henny-penny.svg` to reach the
54-part target. The script font also gives the polygon-tree some
glyphs with **multiple holes per outer letter** (e.g. lowercase `e`
and `a`), exercising deeper nesting in the polytree.

**Used by which test case.** Same as above — the `Nest` test's
`Upload files` step.

**Size / glyph constraints that matter.**

| Constraint | Effect on the test |
| --- | --- |
| Smaller coordinate range than `henny-penny.svg` | Together with the larger file, the union spans easily fits the 300 × 200 mm sheet without rotations being mandatory. |
| Y-coordinate origin at ~38 | The polygon-tree's bounding-box maths (`GeometryUtil.getPolygonBounds`) correctly recovers a tight box, but if a future asset goes negative on `y`, the Ractive parts-view rendering will need to verify it still positions correctly relative to the sheet origin. |
| Same `<svg xmlns=…><path d=…/></svg>` envelope | Identical parsing path to `henny-penny.svg`. |
| 26 281 bytes | Small enough that the overall test fixture footprint stays under 100 KB. |

## Test-case linkage

Per-asset → test-case map (only one test case exists; both assets are
used in it):

| Asset | Test case | Step | Notes |
| --- | --- | --- | --- |
| `henny-penny.svg` | `Nest` ([`tests/index.spec.ts:17`](../../../tests/index.spec.ts)) | `Upload files` ([`tests/index.spec.ts:120-133`](../../../tests/index.spec.ts)) | Imported via stubbed `dialog.showOpenDialog`. Contributes ≈ 28 of the 54 placed parts. |
| `mrs-saint-delafield.svg` | `Nest` (same) | `Upload files` (same) | Imported in the same call. Contributes ≈ 26 of the 54 placed parts. |

The *exact* split between the two files (28/26 vs another partition)
is not asserted; the spec only asserts the **total** of `54/54`. If
either asset is replaced and the new total differs, update the
`expect(...).toHaveText("54/54")` line in
[`tests/index.spec.ts:185-187`](../../../tests/index.spec.ts).

## Cleanup flags

| Flag | Asset | Status | Recommendation |
| --- | --- | --- | --- |
| Unused asset? | `henny-penny.svg` | **In use** by the `Upload files` step. | Keep. |
| Unused asset? | `mrs-saint-delafield.svg` | **In use** by the `Upload files` step. | Keep. |
| Hard-coded count `54/54` | both | The 54 number is asset-derived, not a property of the GA. | Document here so future asset edits don't silently drift; treat the assertion as a snapshot of these specific files at this curve-tolerance default. |

No assets in this directory are unused at the time of this scan.

## Why the assets live under `tests/assets/`

The test discovers them by enumerating
`path.resolve(__dirname, "assets")` at runtime
([`tests/index.spec.ts:121`](../../../tests/index.spec.ts)). Anything
ending in `.svg` will be picked up, so:

- Adding a third `.svg` here without updating the `54/54` and the
  `#importsnav li toHaveCount(2)` assertions **will break the test**.
- Adding a non-SVG file (`.txt`, `.dxf`, `.png`) is ignored by the
  filter and is harmless. There is currently no DXF / DWG / EPS / PS
  fixture in this directory, which is why those import paths are not
  E2E-covered (see [`tests__index.spec.ts.md`](./tests__index.spec.ts.md)
  → "What this spec implicitly tests").

## License / provenance reminder

Both fonts are Google-Fonts OFL releases. The committed files are
**path-data outlines** (the SVG version of "outline" tracing), not
the original `.ttf` / `.otf` font files, so no `@font-face` is
involved and the OFL's redistribution clauses are satisfied by the
fact that the path data is a derivative work permitted by the OFL.
If a future change replaces these with a font with a more
restrictive license, this note should be revisited.

## References

- [`tests/index.spec.ts`](../../../tests/index.spec.ts) — the only
  consumer.
- [`tests/index.spec.ts:120-133`](../../../tests/index.spec.ts) —
  `Upload files` step.
- [`main/svgparser.js`](../../../main/svgparser.js) — polygon-tree
  builder that turns sub-paths into the 54 parts.
- [`main/ui/services/import.service.ts`](../../../main/ui/services/import.service.ts) —
  SVG import path; reads files via `fs.readFile` (renderer-side, see
  Group D security smell summary).
- [`main/ui/components/sheet-dialog.ts`](../../../main/ui/components/sheet-dialog.ts) —
  the `300 × 200 mm` sheet that hosts the placements.
- [`docs/deep-dive/j/tests__index.spec.ts.md`](./tests__index.spec.ts.md) —
  full deep-dive on the E2E spec.
