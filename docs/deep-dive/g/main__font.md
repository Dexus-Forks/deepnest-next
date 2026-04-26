# `main/font/` — Deep Dive

**Generated:** 2026-04-26 by Paige (Tech Writer); **re-verified** 2026-04-26 against `HEAD` for [DEE-39](/DEE/issues/DEE-39) (Paperclip-isolated full redo of the Group G deep-dive; parent: [DEE-11](/DEE/issues/DEE-11)).
**Group:** G — deep-dive static surfaces.
**Surface:** `main/font/` (web-font assets + binding stylesheets).
**Mode:** Single write-up — weights packaged, CSS binding, who loads what. `latolatinfonts.css` cited rules (`style.css:29` body, `:72` heading family) re-checked against `HEAD` on 2026-04-26. **Updated 2026-04-26 in Story 1.1 (DEE-55)** to reflect the dead-weight removal — `latolatinfonts.css` now binds woff2/woff only and the demo specimen kit / `BoldItalic` family / `.eot` / `.ttf` files are gone.

## 1. What ships in this directory

```
main/font/                                                                 ← post-Story-1.1 (DEE-55)
├── latolatinfonts.css         ← LIVE binding stylesheet (loaded by main/index.html)
│
└── fonts/                     ← LIVE LatoLatinWeb / LatoLatinWebLight assets (woff/woff2 only)
    ├── LatoLatin-Bold.{woff,woff2}        ← bound to LatoLatinWeb (bold)
    ├── LatoLatin-Regular.{woff,woff2}     ← bound to LatoLatinWeb (regular)
    └── LatoLatin-Light.{woff,woff2}       ← bound to LatoLatinWebLight
```

**Removed in Story 1.1 (DEE-55)** — preserved here as historical record:

```
main/font/                                                                 ← pre-Story-1.1
├── stylesheet.css             ← DEMO binding stylesheet (only loaded by demo HTML)             ← removed
├── generator_config.txt       ← Font Squirrel generator settings (not loaded at runtime)        ← removed
│
├── lato-hai-webfont.{eot,svg,ttf,woff}   ← latohairline (UNUSED by app — demo only)             ← removed
├── lato-lig-webfont.{eot,svg,ttf,woff}   ← latolight (UNUSED by app — demo only)                ← removed
├── lato-hai-demo.html         ← Font specimen page (not loaded by app)                          ← removed
├── lato-lig-demo.html         ← Font specimen page (not loaded by app)                          ← removed
│
├── fonts/
│   ├── LatoLatin-Bold.{eot,ttf}           ← .eot/.ttf legacy fallbacks (live family)            ← removed
│   ├── LatoLatin-Regular.{eot,ttf}                                                              ← removed
│   ├── LatoLatin-Light.{eot,ttf}                                                                ← removed
│   └── LatoLatin-BoldItalic.{eot,ttf,woff,woff2}  ← UNUSED (no @font-face binding)              ← removed
│
└── specimen_files/            ← Support assets for the demo HTML pages                          ← removed
    ├── easytabs.js
    ├── grid_12-825-55-15.css
    └── specimen_stylesheet.css
```

## 2. Loading graph — who loads which CSS

| Loader | Path | CSS file loaded | Effect |
|---|---|---|---|
| `main/index.html:6-11` | `<link href="font/latolatinfonts.css">` | `main/font/latolatinfonts.css` | Defines `LatoLatinWeb` (Bold + Regular merged) and `LatoLatinWebLight` (Light). |
| `main/notification.html` | — | (none — the notification window inlines `font-family: Arial, sans-serif`) | No webfont in the notification window. |

**The live application loads exactly one font CSS file: `main/font/latolatinfonts.css`.** Pre-Story-1.1 the directory also held `stylesheet.css` (loaded only by `lato-{hai,lig}-demo.html` specimen pages); both the stylesheet and the specimen pages were vestigial Font Squirrel artefacts and have been removed in Story 1.1 (DEE-55).

## 3. Live bindings (`latolatinfonts.css` → `main/style.css`)

`latolatinfonts.css` declares two `font-family` names:

| `font-family` declared | Backed by physical fonts | Weights covered | Defined at |
|---|---|---|---|
| `LatoLatinWeb` | `LatoLatin-Bold.*` (font-weight: bold) + `LatoLatin-Regular.*` (font-weight: normal) | Bold + Regular | `latolatinfonts.css:1-27` |
| `LatoLatinWebLight` | `LatoLatin-Light.*` | Light only (declared as `font-weight: normal` in this family) | `latolatinfonts.css:29-41` |

`main/style.css` consumes both:

| `style.css` line | Selector / property | Family used |
|---|---|---|
| 29 | `body { font: normal 14px/1.4 "LatoLatinWeb", ... }` | `LatoLatinWeb` |
| 72 | (a heading rule) `font-family: "LatoLatinWebLight", helvetica, arial, verdana, sans-serif;` | `LatoLatinWebLight` |

Other rules in `style.css` inherit through the cascade — they do not reset `font-family`. The two declarations above are the only direct references in the live render path. Both rules include OS fallbacks (`helvetica, arial, verdana, sans-serif`) so a missing webfont degrades gracefully rather than rendering with the platform default.

## 4. Inventory — `main/font/fonts/` (live `LatoLatin*` files)

Post-Story-1.1 (DEE-55):

| File | Bound by `latolatinfonts.css`? | Purpose |
|---|---|---|
| `LatoLatin-Bold.{woff,woff2}` | ✅ — `font-family: LatoLatinWeb`, weight `bold` | bold runs of body text |
| `LatoLatin-Regular.{woff,woff2}` | ✅ — `font-family: LatoLatinWeb`, weight `normal` | default body text |
| `LatoLatin-Light.{woff,woff2}` | ✅ — `font-family: LatoLatinWebLight`, weight `normal` | the heading rule on `style.css:72` |

Pre-Story-1.1 the directory also held the `.eot` + `.ttf` legacy fallbacks for the three live weights (~650 KB) and the entire `LatoLatin-BoldItalic.{eot,ttf,woff,woff2}` family (~336 KB; never bound). Both sets were removed; `latolatinfonts.css` was simultaneously edited to drop the `.eot` (IE9) and `.ttf` `src:` URLs because Electron is Chromium-only and resolves to `woff2`/`woff` before falling through to `.ttf`. **Cleanup candidate "BoldItalic" — resolved.** **Cleanup candidate ".eot/.ttf" — resolved.**

## 5. Inventory — `lato-hai-*` and `lato-lig-*` (demo-only family — removed in Story 1.1, DEE-55)

Pre-Story-1.1 the directory also held a second binding stylesheet (`stylesheet.css`) that defined two more `font-family` names but was **not loaded by the app**:

| `font-family` | Files (historical) | Loaded where (historical) | Status |
|---|---|---|---|
| `latohairline` | `lato-hai-webfont.{eot,svg,ttf,woff}` | `lato-hai-demo.html:24` (specimen page) | Removed in Story 1.1, DEE-55 |
| `latolight` | `lato-lig-webfont.{eot,svg,ttf,woff}` | `lato-lig-demo.html:24` (specimen page) | Removed in Story 1.1, DEE-55 |

The kit (8 webfont binaries, 2 demo HTML pages, `stylesheet.css`, `specimen_files/`, `generator_config.txt`) was vestigial Font Squirrel output — only the demo HTML pages loaded `stylesheet.css`, and they were not reachable through the app navigation. **Cleanup candidate "demo specimen kit" — resolved.** Measured saving: ~828 KB.

The four pre-removal `lato-{hai,lig}-webfont.svg` files alone accounted for ~470 KB — SVG-format webfonts (an early-2010s format — Chromium dropped support after Chrome 38), categorically dead.

## 6. `generator_config.txt` (removed in Story 1.1, DEE-55)

Pre-Story-1.1 the directory held `generator_config.txt`, a Font Squirrel generator settings dump (`{"mode":"optimal","formats":["ttf","woff","eotz"], …}`). Loaded by nothing at runtime. Removed alongside the demo specimen kit in Story 1.1.

## 7. Invariants & gotchas

1. **Family names are case-sensitive in `style.css`.** `LatoLatinWeb` ≠ `latolatinweb` — the cascade silently falls through to the OS fallback if the casing is wrong. Don't normalise.
2. **`LatoLatinWeb` is a *combined* family** (Bold + Regular share one name with different `font-weight`s). `font-weight: bold` automatically pulls `LatoLatin-Bold.*`; `font-weight: normal` pulls `LatoLatin-Regular.*`. **`LatoLatinWebLight` is a *separate* family** that only contains the Light face — switching to it requires changing `font-family`, not `font-weight`. This is a deliberate Font Squirrel pattern; do not collapse them into a single name.
3. **The notification window does NOT use any webfont.** `notification.html:40` declares `font-family: Arial, sans-serif`. If a future feature wants the notification window to share the main app's typography, it must add a `<link rel="stylesheet" href="font/latolatinfonts.css">` and set `font-family: "LatoLatinWeb"` explicitly — there is no automatic inheritance because the notification window loads no shared CSS.
4. **Electron target is Chromium-only.** `.eot` (IE9) and `.ttf` were legacy fallbacks; `.woff2` and `.woff` are the only formats Chromium needs. Story 1.1 (DEE-55) removed the `.eot` / `.ttf` files and dropped the corresponding `src:` URLs from `latolatinfonts.css`.
5. **`fonts/` is two levels deep, but the URLs in `latolatinfonts.css` are relative to the CSS file** (`url("fonts/LatoLatin-Bold.woff2")`), so they resolve to `main/font/fonts/LatoLatin-Bold.woff2`. Don't move `latolatinfonts.css` without updating the URLs.

## 8. Cleanup summary

**All P1 + P3 + P4 candidates resolved in Story 1.1 (DEE-55) — measured 1.85 MB saving across `main/img/` + `main/font/`.** Historical risk-by-scope table:

| Risk | Items | Approx. saving | Status |
|---|---|---|---|
| **Zero risk** | `LatoLatin-BoldItalic.eot/.ttf/.woff/.woff2` | ~336 KB measured | Removed in Story 1.1 (DEE-55) |
| Low — affected developer-only specimen pages | `lato-hai-webfont.*`, `lato-lig-webfont.*`, `lato-hai-demo.html`, `lato-lig-demo.html`, `stylesheet.css`, `specimen_files/`, `generator_config.txt` | ~828 KB measured | Removed in Story 1.1 (DEE-55) |
| Low — only safe on Electron target | `.eot` + `.ttf` for the three live weights (kept `.woff2` + `.woff` only) | ~650 KB measured | Removed in Story 1.1 (DEE-55) |

Do **not** remove `latolatinfonts.css`, the three live weight families (`Bold`, `Regular`, `Light`), or the `<link>` in `main/index.html` — they are load-bearing for body text rendering across every page.

## 9. Test coverage

No spec asserts on font rendering. Visual diff tools would catch a missing/changed weight, but the existing E2E suite (Playwright in `tests/e2e/specs/*`) does not include image baselines. Manual / not covered.

## 10. Cross-references

- [`docs/deep-dive/g/main__index.html.md`](./main__index.html.md) §2 (Load order) — shows the `<link>` that pulls in `latolatinfonts.css`.
- [`docs/source-tree-analysis.md`](../../source-tree-analysis.md) §"main/" — first-pass enumeration of the `font/` directory; the deep dive above is the authoritative "what's used vs unused" reference.
