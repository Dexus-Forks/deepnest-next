# `main/font/` — Deep Dive

**Generated:** 2026-04-26 by Paige (Tech Writer) for [DEE-18](/DEE/issues/DEE-18) (parent: [DEE-11](/DEE/issues/DEE-11)).
**Group:** G — deep-dive static surfaces.
**Surface:** `main/font/` (web-font assets + binding stylesheets).
**Mode:** Single write-up — weights packaged, CSS binding, who loads what.

## 1. What ships in this directory

```
main/font/
├── latolatinfonts.css         ← LIVE binding stylesheet (loaded by main/index.html)
├── stylesheet.css             ← DEMO binding stylesheet (loaded by demo HTML only)
├── generator_config.txt       ← Font Squirrel generator settings (not loaded at runtime)
│
├── lato-hai-webfont.{eot,svg,ttf,woff}   ← latohairline (UNUSED by app — demo only)
├── lato-lig-webfont.{eot,svg,ttf,woff}   ← latolight (UNUSED by app — demo only)
├── lato-hai-demo.html         ← Font specimen page (not loaded by app)
├── lato-lig-demo.html         ← Font specimen page (not loaded by app)
│
├── fonts/                     ← LIVE LatoLatinWeb / LatoLatinWebLight assets
│   ├── LatoLatin-Bold.{eot,ttf,woff,woff2}        ← bound to LatoLatinWeb (bold)
│   ├── LatoLatin-Regular.{eot,ttf,woff,woff2}     ← bound to LatoLatinWeb (regular)
│   ├── LatoLatin-Light.{eot,ttf,woff,woff2}       ← bound to LatoLatinWebLight
│   └── LatoLatin-BoldItalic.{eot,ttf,woff,woff2}  ← UNUSED (no @font-face binding)
│
└── specimen_files/            ← Support assets for the demo HTML pages
    ├── easytabs.js
    ├── grid_12-825-55-15.css
    └── specimen_stylesheet.css
```

## 2. Loading graph — who loads which CSS

| Loader | Path | CSS file loaded | Effect |
|---|---|---|---|
| `main/index.html:6-11` | `<link href="font/latolatinfonts.css">` | `main/font/latolatinfonts.css` | Defines `LatoLatinWeb` (Bold + Regular merged) and `LatoLatinWebLight` (Light). |
| `main/notification.html` | — | (none — the notification window inlines `font-family: Arial, sans-serif`) | No webfont in the notification window. |
| `main/font/lato-hai-demo.html:24` | `<link href="stylesheet.css">` | `main/font/stylesheet.css` | Demo-only — defines `latohairline`. |
| `main/font/lato-lig-demo.html:24` | `<link href="stylesheet.css">` | `main/font/stylesheet.css` | Demo-only — defines `latolight`. |

**The live application loads exactly one font CSS file: `main/font/latolatinfonts.css`.** `stylesheet.css` is loaded only by the two `lato-*-demo.html` pages, which are font-specimen documents shipped with the original Font Squirrel package and are not reachable through the app navigation. They are vestigial.

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

| File | Bound by `latolatinfonts.css`? | Purpose |
|---|---|---|
| `LatoLatin-Bold.eot/.ttf/.woff/.woff2` | ✅ — `font-family: LatoLatinWeb`, weight `bold` | bold runs of body text |
| `LatoLatin-Regular.eot/.ttf/.woff/.woff2` | ✅ — `font-family: LatoLatinWeb`, weight `normal` | default body text |
| `LatoLatin-Light.eot/.ttf/.woff/.woff2` | ✅ — `font-family: LatoLatinWebLight`, weight `normal` | the heading rule on `style.css:72` |
| `LatoLatin-BoldItalic.eot/.ttf/.woff/.woff2` | ❌ **No `@font-face` binding** | **Unused at runtime.** No CSS declaration loads them, no rule asks for `font-style: italic` + `font-weight: bold`. ~336 KB of dead weight across the 4 formats. |

> **Cleanup candidate**: `LatoLatin-BoldItalic.*`. If a rule ever needs bold-italic, the engine will silently synthesise it (or fall back to the next family). Either delete the four files, or extend `latolatinfonts.css` to bind them — pick one.

The directory ships **all four format variants per weight** (`.eot` for IE9, `.woff2` modern, `.woff` modern, `.ttf` legacy / fallback) plus an `.eot` for `LatoLatin-BoldItalic`. Electron always uses Chromium, which will pick `.woff2` first, so the `.eot` and `.ttf` files are effectively dead-weight on the Electron target. They are kept because the assets came from Font Squirrel as a bundle and no one has trimmed them. Trimming `.eot` and `.ttf` from the live three weights would save ~700 KB; defer until a packaging-size story warrants it.

## 5. Inventory — `lato-hai-*` and `lato-lig-*` (demo-only family)

`stylesheet.css` defines two more `font-family` names but is **not loaded by the app**:

| `font-family` | Files | Loaded where |
|---|---|---|
| `latohairline` | `lato-hai-webfont.{eot,svg,ttf,woff}` | `main/font/lato-hai-demo.html:24` (specimen page) |
| `latolight` | `lato-lig-webfont.{eot,svg,ttf,woff}` | `main/font/lato-lig-demo.html:24` (specimen page) |

Confirmed by greps on the codebase: no source file outside `main/font/` references the `latohairline` or `latolight` family names. The two demo HTML files exist purely as the standard Font Squirrel "specimen" preview sheets shipped with the original generator output.

> **Cleanup candidate (larger)**: the entire pairing of `lato-hai-*`, `lato-lig-*`, `lato-hai-demo.html`, `lato-lig-demo.html`, `stylesheet.css`, and the `specimen_files/` directory is **demo-only**. Removing the lot is safe so long as you also delete `stylesheet.css` (which only the demo pages load). Approximate savings: ~1.2 MB across ~12 files.

The four `lato-{hai,lig}-webfont.svg` files alone account for ~470 KB — those are SVG-format webfonts (an early-2010s format — Chromium dropped support after Chrome 38). They are categorically dead.

## 6. `generator_config.txt`

A Font Squirrel generator settings dump (`{"mode":"optimal","formats":["ttf","woff","eotz"], …}`). Loaded by nothing at runtime. Useful only if a maintainer needs to rebuild the webfont kit through the Font Squirrel UI. Keep it next to the assets it generated, or remove it together with the `lato-hai-*` / `lato-lig-*` cluster — there is no policy reason to retain `generator_config.txt` once those fonts are gone.

## 7. Invariants & gotchas

1. **Family names are case-sensitive in `style.css`.** `LatoLatinWeb` ≠ `latolatinweb` — the cascade silently falls through to the OS fallback if the casing is wrong. Don't normalise.
2. **`LatoLatinWeb` is a *combined* family** (Bold + Regular share one name with different `font-weight`s). `font-weight: bold` automatically pulls `LatoLatin-Bold.*`; `font-weight: normal` pulls `LatoLatin-Regular.*`. **`LatoLatinWebLight` is a *separate* family** that only contains the Light face — switching to it requires changing `font-family`, not `font-weight`. This is a deliberate Font Squirrel pattern; do not collapse them into a single name.
3. **The notification window does NOT use any webfont.** `notification.html:40` declares `font-family: Arial, sans-serif`. If a future feature wants the notification window to share the main app's typography, it must add a `<link rel="stylesheet" href="font/latolatinfonts.css">` and set `font-family: "LatoLatinWeb"` explicitly — there is no automatic inheritance because the notification window loads no shared CSS.
4. **Electron target is Chromium-only.** `.eot` (IE9) is dead weight; `.ttf` is fallback; `.woff2` is the only file that should reach a user. Until a packaging-size story lands, the extras stay.
5. **`fonts/` is two levels deep, but the URLs in `latolatinfonts.css` are relative to the CSS file** (`url("fonts/LatoLatin-Bold.eot")`), so they resolve to `main/font/fonts/LatoLatin-Bold.eot`. Don't move `latolatinfonts.css` without updating the URLs.

## 8. Cleanup summary

If a future story takes on font-related cleanup, the safe-to-remove set is (in increasing scope):

| Risk | Items | Approx. saving |
|---|---|---|
| **Zero risk** | `LatoLatin-BoldItalic.eot/.ttf/.woff/.woff2` | ~336 KB |
| Low — affects developer-only specimen pages | `lato-hai-webfont.*`, `lato-lig-webfont.*`, `lato-hai-demo.html`, `lato-lig-demo.html`, `stylesheet.css`, `specimen_files/`, `generator_config.txt` | ~1.2 MB |
| Medium — only safe on Electron target | `.eot` + `.ttf` for the three live weights (keep `.woff2` + `.woff` only) | ~700 KB |

Do **not** remove `latolatinfonts.css`, the three live weight families (`Bold`, `Regular`, `Light`), or the `<link>` in `main/index.html` — they are load-bearing for body text rendering across every page.

## 9. Test coverage

No spec asserts on font rendering. Visual diff tools would catch a missing/changed weight, but the existing E2E suite (Playwright in `tests/e2e/specs/*`) does not include image baselines. Manual / not covered.

## 10. Cross-references

- [`docs/deep-dive/g/main__index.html.md`](./main__index.html.md) §2 (Load order) — shows the `<link>` that pulls in `latolatinfonts.css`.
- [`docs/source-tree-analysis.md`](../../source-tree-analysis.md) §"main/" — first-pass enumeration of the `font/` directory; the deep dive above is the authoritative "what's used vs unused" reference.
