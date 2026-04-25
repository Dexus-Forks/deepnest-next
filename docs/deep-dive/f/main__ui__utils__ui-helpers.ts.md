# `main/ui/utils/ui-helpers.ts` — Deep Dive

**Generated:** 2026-04-25 by Paige (Tech Writer) for [DEE-17](/DEE/issues/DEE-17) (parent: [DEE-11](/DEE/issues/DEE-11)).
**Group:** F — UI utilities.
**File:** `main/ui/utils/ui-helpers.ts` (140 LOC, TypeScript, strict).
**Mode:** Exhaustive deep-dive.

## Overview

Three small renderer helpers with **no shared theme**:

- `message()` — toast/banner shown in the static `#messagewrapper` element. The renderer's only user-visible error/notification channel.
- `throttle()` — Underscore.js-style leading/trailing throttle, used for one call site (parts-view repaint).
- `millisecondsToStr()` — humanize a millisecond duration. Used by nest-view for ETA display.

The file groups them only because they're "small things needed across components". They share no internal state and could be split into three separate modules without touching consumers — the bundling is incidental.

## Public surface

```ts
export function message(txt: string, error?: boolean): void;

export function throttle<T extends (...args: unknown[]) => unknown>(
  func: T,
  wait: number,
  options?: ThrottleOptions
): (...args: Parameters<T>) => ReturnType<T> | undefined;

export function millisecondsToStr(milliseconds: number): string;
```

`ThrottleOptions = { leading?: boolean; trailing?: boolean }` is imported from `main/ui/types/index.ts:220`.

## `message(txt, error?)` — the toast banner

### Contract

`message("Saved!")` shows a green/neutral banner; `message("Failed", true)` shows the same banner with `class="error"`. Markup is **HTML, not text** — `#messagecontent.innerHTML = txt` (line 34). XSS-unsafe. Callers in this codebase always pass static strings or values they themselves produced.

```ts
function message(txt: string, error?: boolean): void {
  const messageElement   = document.querySelector("#message");
  const wrapperElement   = document.querySelector("#messagewrapper");
  const contentElement   = document.querySelector("#messagecontent");
  if (!messageElement || !wrapperElement || !contentElement) return;
  messageElement.className = error ? "error" : "";
  wrapperElement.className = "active";
  setTimeout(() => { messageElement.className += " animated bounce"; }, 100);
  contentElement.innerHTML = txt;
}
```

### DOM contract (Group G)

Three IDs in `main/index.html` (lines 115–119):

```html
<div id="messagewrapper">
  <div id="message">
    <a href="#" class="button close"></a>
    <div id="messagecontent"></div>
  </div>
</div>
```

If any of the three is missing, the function silently no-ops. There is no logging or fallback. Renaming any of these IDs without updating the helper is a breakage class — it would manifest as "errors and confirmations stop appearing" with no console output.

### Animation contract

The CSS classes set on `#message`:

- `""` — neutral baseline (uses default `.button` styling on the close link).
- `"error"` — red error styling.
- After 100 ms: ` animated bounce` (Animate.css convention) is appended via `+=`. Note this is a **string concat**, not a class-list manipulation — calling `message()` twice in quick succession will produce e.g. `"error animated bounce animated bounce"`. The CSS animation runs once, so duplicates are harmless visually, but the class-list grows unboundedly until the wrapper is dismissed.

The `#messagewrapper` gets `class="active"` — the close-button (and any external code) is responsible for removing it when the user dismisses the toast. **`message()` itself never removes the active class**, so a stale toast persists until something clears it.

### Reentrancy

There is no debounce, no queue, and no per-message id. Calling `message()` while a previous toast is still active overwrites the content and re-applies the bounce animation 100 ms later. Two calls within 100 ms collapse: the first `setTimeout` will write its `+= " animated bounce"` to whatever className the second call set.

### DOM mutation that bypasses Ractive

This entire function is direct DOM manipulation outside any Ractive instance. The `#messagewrapper` element is a static sibling of `#main` and is not part of any Ractive template — there is no risk of Ractive overwriting these mutations during a re-render. **Verified in `main/index.html`:** the wrapper sits between `<script type="text/ractive">` blocks and the active `<div id="main">`, in plain HTML.

### Used-by

12 unique call sites across services + `index.ts`:

| Importer | Notable usages |
|---|---|
| `main/ui/index.ts` (preset save/load/delete) | 9 calls — success and error variants for preset workflows. |
| `main/ui/services/export.service.ts` | 5 calls — DXF export errors, conversion-server failures. |
| `main/ui/services/nesting.service.ts` | 3 calls — "Please import parts first", "Please mark sheet". |
| `main/ui/services/import.service.ts` | ~15 calls — file-IO errors, conversion-server failures, SVG-parse errors. |

The function is the **single user-facing error channel** in the renderer. There is no `console.error` fallback, no IPC error report, no telemetry — if `message()` doesn't fire, the user sees nothing.

## `throttle(func, wait, options?)` — Underscore-style throttle

Direct port of Underscore's `_.throttle`. Behavior and option semantics are identical:

| Behavior | Default | Disable by |
|---|---|---|
| Fire on leading edge | yes | `{ leading: false }` |
| Fire on trailing edge | yes | `{ trailing: false }` |
| Both at once | not allowed by Underscore convention | results in skipping the first call when both edges are off — same caveat as Underscore |

### Internals

```ts
let context, args, result;
let timeout: NodeJS.Timeout | null = null;
let previous = 0;
const opts = options || {};

const later = () => {
  previous = opts.leading === false ? 0 : Date.now();
  timeout = null;
  result = func.apply(context, args);
  context = null; args = null;
};

return function (...funcArgs) {
  const now = Date.now();
  if (!previous && opts.leading === false) previous = now;
  const remaining = wait - (now - previous);
  context = this; args = funcArgs;
  if (remaining <= 0) {
    if (timeout) { clearTimeout(timeout); timeout = null; }
    previous = now;
    result = func.apply(context, args);
    context = null; args = null;
  } else if (!timeout && opts.trailing !== false) {
    timeout = setTimeout(later, remaining);
  }
  return result;
};
```

The `_now = Date.now || (() => new Date().getTime())` shim on line 40 is a relic of the Underscore source and is unnecessary on modern Electron — `Date.now` exists in every supported Chromium runtime — but it does no harm and removing it is a churn change. Keep it unless you're already touching the file.

### Generic typing caveat

The signature is `<T extends (...args: unknown[]) => unknown>`. TypeScript callers passing a function with **specific parameter types** must usually type the throttled wrapper explicitly:

```ts
const throttled = throttle((x: number, y: number) => x + y, 100);
//   ^? (...args: [number, number]) => number | undefined
```

Works, because `Parameters<T>` recovers the tuple. The `unknown[]` constraint is permissive enough.

### Used-by

```bash
$ rg -nU --type ts "throttle\\("
main/ui/components/parts-view.ts:558  this.throttledUpdate = throttle(updateFn, 500);
```

**One call site.** The parts-view repaints on every drag/zoom/import event; throttling at 500 ms keeps the SVG re-render off the hot path. Default options (leading + trailing both fire).

If you need a different cadence elsewhere, a 60 fps repaint utility belongs in `requestAnimationFrame` instead — `throttle` is for time-based throttling, not animation-frame coalescing.

## `millisecondsToStr(ms)` — duration formatter

Returns the **largest non-zero unit** as a labelled string:

| Range | Output examples |
|---|---|
| ≥ 1 year (31 536 000 000 ms) | `"2 years"`, `"1 year"` |
| ≥ 1 day (86 400 000 ms) | `"3 days"`, `"1 day"` |
| ≥ 1 hour (3 600 000 ms) | `"5 hours"`, `"1 hour"` |
| ≥ 1 minute (60 000 ms) | `"30 minutes"`, `"1 minute"` |
| ≥ 1 second (< 60 s of remainder) | `"45 seconds"`, `"1 second"` |
| 0 ms or sub-second | `"0 seconds"` |

Quirks:

- **Pluralization is by `>1`, not `!== 1`**: 0 of any unit cannot reach the branch (it's gated by the `if (years)` guard), so the only output that hits the `else` branch is the final `"0 seconds"` literal. The `numberEnding` helper is correct as written.
- **Sub-second inputs round to `"0 seconds"`** because `Math.floor(ms / 1000)` is the very first operation. If you need millisecond precision, this is not the right helper.
- **Years are 365-day Julian years** (`31 536 000` seconds). Leap years are not modelled. For a UX that displays "5 years" this is fine; do not use it for date arithmetic.
- **No years > Number.MAX_SAFE_INTEGER guard.** Pass `Infinity` and the function returns `"Infinity years"` (which is valid TypeScript: `Math.floor(Infinity) === Infinity`).
- **Negative inputs:** `Math.floor(-1500 / 1000)` is `-2`, then `-2 % 31536000 === -2`, etc. — the function eventually returns `"0 seconds"` because every higher unit is negative and falsy. Don't rely on this; the function isn't designed for negative durations.

### Used-by

```bash
$ rg -nU --type ts "millisecondsToStr"
main/ui/components/nest-view.ts:444  return millisecondsToStr(seconds * 1000);
```

**One call site.** The nest-view ETA banner converts the placement engine's seconds-estimate into a human-readable string. The call multiplies by 1000 because the engine reports in seconds.

## Build & loading

`main/ui/utils/ui-helpers.ts` is compiled by `tsc` to `build/ui/utils/ui-helpers.js` and loaded transitively via `main/ui/index.ts`. It is **not** loaded as a classic `<script>`. The file is leaf-import-only — it imports `ThrottleOptions` from `../types/index.js` (a type-only import) and otherwise depends on `Date.now`, `setTimeout`, `clearTimeout`, and `document.querySelector` — all browser/Electron globals.

## Side effects

- `message()` mutates `#message`, `#messagewrapper`, `#messagecontent` (DOM only).
- `throttle()` schedules `setTimeout` and `clearTimeout` calls, scoped per-throttled-fn.
- `millisecondsToStr()` is pure — no side effects.

No IPC, no network, no console output, no `globalThis` writes.

## Error handling

- `message()` silently no-ops if any of its three target elements is missing. There is no fallback path.
- `throttle()` propagates exceptions thrown by `func` synchronously (when `func.apply` is called inside the wrapper). The wrapper does not swallow errors and does not reset state on throw — a throwing handler will leave `previous` set to the throw time, so the next call will be subject to the normal wait window.
- `millisecondsToStr()` does not validate input. `NaN` produces `"0 seconds"`; numeric strings are coerced via `Math.floor` (which calls `ToNumber`).

## Testing

- **Unit tests:** none in repo for any of the three functions.
- **E2E coverage:**
  - `message()` is exercised every time a Playwright spec triggers a save/load/error path. The `tests/specs/import.spec.ts` flow at minimum invokes it via `nesting.service.ts`.
  - `throttle()` is implicit in any parts-view repaint (drag a part — observe the 500 ms repaint cadence).
  - `millisecondsToStr()` is implicit in any nesting run that produces an ETA.
- **Manual verification:** trigger an error path (e.g., import a malformed SVG) — the toast must appear, must be styled red, and must not break later toasts.

## Comments / TODOs in source

The header comment summarizes purpose accurately. No `TODO` / `FIXME` / `HACK` markers. The Underscore attribution lives on lines 41–46 ("Based on Underscore.js throttle implementation"). The `_now` shim on line 40 is the only legacy artifact.

## Contributor checklist

**Risks & gotchas:**

- **`message()` is the only error channel.** Removing or refactoring it without ensuring every consumer's error path still surfaces would silently drop user-visible failures. Audit consumers if you change the public signature.
- **`message()` writes `innerHTML`.** Any caller that interpolates user input must escape it first. Today's callers all pass static strings.
- **`message()` doesn't auto-dismiss.** If you change UX so that the close-button is removed or made conditional, you must add a timeout to the helper or have the caller dismiss it explicitly.
- **Animation class accumulates.** Repeated calls grow the className string. If you ever hook off the className value, normalize first (`element.className = element.className.replace(/\s*animated\s+bounce/g, '')`).
- **`throttle()` with both `leading: false` and `trailing: false`** silently swallows every call (Underscore convention). Do not pass both as `false`.
- **`throttle()` doesn't preserve `this` reliably from arrow callers.** It captures `this` via `context = this` at call time, which means non-arrow callers get expected behavior; arrow-bound callers get whatever `this` was at definition. The single in-tree usage is an arrow function (`updateFn` in `parts-view.ts`), so this is fine today.
- **`millisecondsToStr()` reports only the dominant unit** — `61 000 ms` returns `"1 minute"`, not `"1 minute 1 second"`. If the ETA banner ever needs higher precision, this helper has to be rewritten, not extended.
- **`millisecondsToStr()` rounds down** — `999 ms` → `"0 seconds"`. The nest-view ETA hides this because it's already rounded by the engine.

**Pre-change verification:**

- `npm run build` (TypeScript strict catches signature drift on every importer).
- For `message()` UX changes: launch the app, trigger preset save (success path) and import a broken SVG (error path); verify toast color, animation, and that the close button still dismisses.
- For `throttle()` changes: drag parts in the parts view rapidly; the SVG should not re-render more than ~2× per second.

**Suggested tests before PR:**

- `npm test` (Playwright E2E). The relevant flows: preset save/load (`tests/specs/config-tab.spec.ts`), import (`tests/specs/import.spec.ts`).
- For `millisecondsToStr` regressions: a pure-function unit test would be cheap, but is not in the repo today. Land one in the same PR if you change the formatter.

## Cross-references

- **Group D (services):** `export.service.ts`, `import.service.ts`, `nesting.service.ts` are the heaviest consumers of `message()`. See [main__ui__services__export.service.md](../d/main__ui__services__export.service.md) and the sibling import/nesting deep-dives.
- **Group E (UI components):** `parts-view.ts` consumes `throttle()`; `nest-view.ts` consumes `millisecondsToStr()`. See [main__ui__components__parts-view.md](../e/main__ui__components__parts-view.md) and [main__ui__components__nest-view.md](../e/main__ui__components__nest-view.md).
- **Group G (`main/index.html`):** owns the `#messagewrapper`/`#message`/`#messagecontent` IDs that `message()` requires. Lines 115–119.
- **Component inventory:** `docs/component-inventory.md` row "UI helpers" (`main/ui/utils/ui-helpers.ts`).
- **Architecture:** `docs/architecture.md` §3 (renderer composition); §6 (testing model — explains why these helpers have only E2E coverage).

---

_Generated by Paige for the Group F deep-dive on 2026-04-25. Sources: `main/ui/utils/ui-helpers.ts`, `main/ui/index.ts`, `main/ui/components/parts-view.ts`, `main/ui/components/nest-view.ts`, all `main/ui/services/*.ts`, `main/index.html`._
