# `main/img/` — Deep Dive

**Generated:** 2026-04-26 by Paige (Tech Writer); **re-verified** 2026-04-26 against `HEAD` for [DEE-39](/DEE/issues/DEE-39) (Paperclip-isolated full redo of the Group G deep-dive; parent: [DEE-11](/DEE/issues/DEE-11)).
**Group:** G — deep-dive static surfaces.
**Surface:** `main/img/` (30 files, all SVG; was 35 = 34 SVG + 1 PNG pre-Story-1.1 / DEE-55).
**Mode:** Single write-up — naming convention + inventory + cleanup candidates. The unused-icon list (auth0logo, background.png, logo.svg, progress.svg, stop.svg) was re-confirmed by `grep -r 'img/(auth0logo|background\.png|logo\.svg|progress\.svg|stop\.svg)' main/` on 2026-04-26 — zero hits — and **resolved by deletion in Story 1.1 (DEE-55)** the same day.

## 1. Naming convention

The directory holds the icon set for the visible renderer. There are three suffix patterns:

| Suffix | Meaning | Pairs found |
|---|---|---|
| (no suffix) | Base icon, designed for the **light** background of the home/config/info surfaces (the legacy "main" view). | All 28 base-named icons. |
| `<name>_dark.svg` | Variant designed for a **dark** background — typically white-on-orange or white-on-dark blue. Used on the top-nav `.account` chip and the `.importsnav .close` chip, both of which sit on coloured chrome. | `account_dark`, `close_dark`, `shop_dark`, `spin_dark` |
| `<name>_light.svg` | Variant designed for the **dark** `#nest` view (the in-progress nesting screen has a near-black background). Light strokes on transparent. | `credits_light`, `unlimited_light` |

> **Important**: `_dark` / `_light` are **not** dark-mode-toggle variants. They denote the *background* the icon is drawn on, which is fixed by surface (top-nav vs. `#nest`), not by `body.dark-mode`. The dark-mode toggle (`body.dark-mode`) recolours other CSS (text, fills) but **does not swap any icon URL** — every `background-image: url(img/...)` declaration in `main/style.css` is unconditional.

The naming convention is therefore:

- **`<name>.svg`** — the canonical icon, used everywhere unless a context-specific override exists.
- **`<name>_dark.svg`** — pair when the icon is rendered on a light/coloured chrome.
- **`<name>_light.svg`** — pair when the icon is rendered on the dark `#nest` background.
- New pairs follow the same suffix; do **not** introduce a third spelling (`<name>-dark.svg`, `darkmode_<name>.svg`, etc.).

A handful of base icons (e.g. `dark_mode.svg`, `add_sheet.svg`) use snake_case for the icon name itself — that is unrelated to the variant suffix. Stay consistent: lowercase, words joined by `_`, no camelCase or kebab-case.

## 2. How icons are referenced

**All 30 in-use icons are referenced exclusively from `main/style.css`** as `background-image: url(img/<name>.svg)`. Search for `img/` in the codebase confirms:

- `main/index.html` — **0** references.
- `main/notification.html` — **0** references.
- `main/ui/**/*.ts` — **0** references.
- `main/*.js` — **0** references.
- `main/style.css` — every reference (see §3 below).

This means CSS is the single point of truth for icon binding. Renaming an icon requires editing exactly one file (`main/style.css`); the JS/TS layer never names an icon. To swap an icon at runtime, code adds/removes a CSS class (e.g. `.button.import.spinner` swaps `import.svg` for `spin.svg` via the `.spinner` rule overriding the prior `background-image`).

## 3. Inventory — referenced from `main/style.css`

Sorted by reference count. Lines refer to `main/style.css`.

| Icon | CSS line(s) | Referenced by selector | Notes |
|---|---|---|---|
| `spin.svg` | 262, 278, 287, 530, 1413 | `.button.stop`, `.button.spinner`, `.button.import.spinner`, `.button.export.spinner`, `#config dl dd .spinner`, `#nest .account.spinner` | Hottest icon. Reused as the busy/working indicator across many states. |
| `settings.svg` | 142, 325 | `#config_tab`, `.button` (settings) | |
| `shop.svg` | 149, 1425 | `#account_tab` (dead), `#nest .account_purchase` | |
| `shop_dark.svg` | 1393 | `.account_purchase` (top-nav variant) | |
| `info.svg` | 156 | `#info_tab` | |
| `dark_mode.svg` | 163 | `#darkmode_tab` | |
| `arrow_right.svg` | 224 | progress / forward indicator | |
| `start.svg` | 254 | `.button.start` | |
| `import.svg` | 270 | `.button.import` | |
| `delete.svg` | 294 | `.button.delete` | |
| `add_sheet.svg` | 302 | `.button.addsheet` | |
| `download.svg` | 310 | `.button` (export download) | |
| `code.svg` | 318 | `.button` (JSON/code export) | |
| `close.svg` | 332 | `.button.close` | |
| `zoomin.svg` | 339 | `.button.zoomin` | |
| `zoomout.svg` | 344 | `.button.zoomout` | |
| `arrow_up.svg` | 698 | parts table column ascending sort | |
| `arrow_down.svg` | 705 | parts table column descending sort | |
| `close_dark.svg` | 942 | `#importsnav li .close` | Orange chip background. |
| `plus.svg` | 1009 | `.zoomin` (svg-pan-zoom default control) | |
| `minus.svg` | 1013 | `.zoomout` (svg-pan-zoom default control) | |
| `reset.svg` | 1017 | `.zoomreset` | |
| `account_dark.svg` | 1356 | `.topnav .account` | |
| `spin_dark.svg` | 1369 | `.topnav .account.spinner` | |
| `credits.svg` | 1385 | `.account_credits` | |
| `credits_light.svg` | 1419 | `#nest .account_credits` | |
| `unlimited.svg` | 1400 | `.account_unlimited` | |
| `unlimited_light.svg` | 1432 | `#nest .account_unlimited` | |
| `account.svg` | 1406 | `#nest .account` | |
| `logosmall.svg` | 135 | `#sidenav #home_tab` | The brand mark in the side nav. |

**30 referenced icons.** Cross-checked by `grep -rn "img/[a-z_]\+\.\(svg\|png\)" main/` — every URL in `main/style.css` matches a file that exists in `main/img/`; no broken refs.

## 4. Inventory — unused (cleanup candidates)

Five files in `main/img/` are not referenced from any CSS, HTML, JS, TS, or JSON in the codebase. Verified by:

```
grep -rn '<file>' --include='*.css' --include='*.ts' --include='*.js' \
                  --include='*.html' --include='*.json' --include='*.md'
```

| File | Size | Status | Note |
|---|---|---|---|
| `auth0logo.svg` | 1.9 KB | **Removed in Story 1.1, DEE-55** (was: Unused) | Auth0 brand mark — leftover from an OAuth login flow that was removed when the deepnest.io payment surface was disabled. The `#account_tab` is commented out in `main/index.html:126`; this icon was part of the same cluster of dead surfaces. |
| `background.png` | 18.8 KB | **Removed in Story 1.1, DEE-55** (was: Unused) | Was the only PNG in the directory. No CSS rule loaded it. Likely a legacy splash / onboarding asset; was the biggest single file in the directory. |
| `logo.svg` | 10.5 KB | **Removed in Story 1.1, DEE-55** (was: Unused) | The full deepnest logo. The info page (`main/index.html:3346-3536`) uses an **inline** `<svg>` reproduction of the logo (lines 3449-3535) rather than this file, so removing `logo.svg` did not affect the about page. |
| `progress.svg` | 0.7 KB | **Removed in Story 1.1, DEE-55** (was: Unused) | The progress indicator inside the top-nav uses an **inline** `<circle>` SVG (`main/index.html:51-83`), not this file. |
| `stop.svg` | 0.7 KB | **Removed in Story 1.1, DEE-55** (was: Unused) | The "Stop nest" button (`#stopnest`) inherits `.button.stop` styling, which CSS line 262 binds to `spin.svg` — there was no rule that used `stop.svg`. The file was an orphan from an earlier design where the stop button had its own glyph. |

Total unused payload: **~32 KB** — **resolved (removed in Story 1.1, DEE-55)**.

> **Cleanup safety note (historical, retained for audit)**: Before deleting any of these, the corresponding docs entries had to be stripped. `docs/source-tree-analysis.md:121-123` and `docs/component-inventory.md:84-86` mentioned `auth0logo.svg`, `background.png`, `logo.svg`, `progress.svg`, and `stop.svg` by name — those references were authored when the icons were assumed in-use. **Action complete**: Story 1.1 (DEE-55) deleted the icons and stripped the matching docs entries in the same PR. The inventory above is preserved as the historical record of the dead-weight set.

## 5. Theme-variant pairs (light/dark suffixes)

Six families have variants. The decision tree for picking which one a CSS rule uses is "what is the surrounding background colour?", not "what is `body.dark-mode`?":

| Family | Base | `_dark` | `_light` | Used where |
|---|---|---|---|---|
| account | `account.svg` | `account_dark.svg` | — | base on `#nest`, `_dark` on `.topnav` |
| close | `close.svg` | `close_dark.svg` | — | base on light chrome, `_dark` on the orange `#importsnav li .close` chip |
| shop | `shop.svg` | `shop_dark.svg` | — | base on `#nest`, `_dark` on `.account_purchase` (top-nav) |
| spin | `spin.svg` | `spin_dark.svg` | — | base everywhere there is a busy state on light chrome, `_dark` only for `.topnav .account.spinner` |
| credits | `credits.svg` | — | `credits_light.svg` | base on `.account_credits`, `_light` on `#nest .account_credits` |
| unlimited | `unlimited.svg` | — | `unlimited_light.svg` | same pattern as credits |

Note the **asymmetry**: `account`, `close`, `shop`, `spin` use `_dark` (icon for dark chrome); `credits`, `unlimited` use `_light` (icon for the dark `#nest` view). The convention you adopt for a new icon depends on which background it must contrast against, not on retrofitting existing pairs.

## 6. Invariants & gotchas

1. **No JS/TS file imports an icon URL.** This is a load-bearing constraint — bundlers and Electron-builder configs don't need to track these assets at the JS level. They are static resources copied via the `extraResources` (or default packaging) flow.
2. **`spin.svg` is the universal busy indicator**. If you add a new `.spinner` state, do not introduce a new spin glyph; reuse the existing one to keep the visual language consistent.
3. **The dark-mode toggle (`body.dark-mode`) does not change which icon is loaded.** It only repaints the surrounding chrome and text. If you need a dark-mode-specific icon, prefer recolouring via CSS filters (`filter: invert(1)`) or by rebuilding the SVG inline so `currentColor` can flow through.
4. **No PNGs in this directory.** Pre-Story-1.1 the directory held one PNG (`background.png`); post-Story-1.1 (DEE-55) the directory is SVG-only. New artwork should remain SVG so it scales with HiDPI displays without bitmap artefacts.
5. **No icon font.** The earlier deepnest.io build used a Lato-derived icon font; the current build uses individual SVG backgrounds. Re-introducing an icon font would mean rewriting every `background-image: url(img/...)` rule to `font-family` + glyph code.

## 7. Test coverage

No Playwright spec asserts on icon presence — the existing E2E tests target functional state (button enabled / disabled, click handlers fire, IPC payloads). Visual regression of icon rendering is not in the test plan today.

## 8. Cross-references

- [`docs/deep-dive/g/main__index.html.md`](./main__index.html.md) — the surfaces that consume the icons (via class names — see id inventory).
- [`docs/source-tree-analysis.md`](../../source-tree-analysis.md) §5 — high-level source tree summary; **the icon section there counts the directory by file system, not by use.** This deep dive is the canonical "what's used vs unused" reference.
- [`docs/component-inventory.md`](../../component-inventory.md) §"Static assets" — first-pass inventory; same caveat about counting by FS, not by reference graph.
