# Deep dive — `main/ui/utils/ui-helpers.ts`

> Group F · `DEE-38` (replaces DEE-27/DEE-1f) · parent issue [DEE-11](../../../). Authored fresh from source per the board's full-redo directive.

## Purpose

Three loosely-related helpers that don't belong with `dom-utils` or `conversion`:

1. **`message`** — render a status banner in the existing `#message` HTML scaffold. The single user-facing notification primitive used across the renderer for toasts and inline error reporting.
2. **`throttle`** — Underscore.js's throttle implementation, retyped for TypeScript. Used in exactly one place (the parts list update loop).
3. **`millisecondsToStr`** — convert a duration to a coarse human-readable string ("5 hours", "30 seconds"). Used by the cut-time estimator.

The file is small (~140 lines) and has the highest fan-in of the three Group F utilities — six importers across `index.ts`, three services, and two components.

## Public surface

| Symbol (line) | Signature | Role |
|---|---|---|
| `message` (13) | `(txt: string, error?: boolean) => void` | Show a banner. `error === true` adds the `error` class. The text becomes `innerHTML`. |
| `throttle` (53) | `<T extends (...args: unknown[]) => unknown>(func: T, wait: number, options?: ThrottleOptions) => (...args: Parameters<T>) => ReturnType<T> \| undefined` | Underscore-style leading + trailing throttle with options. |
| `millisecondsToStr` (107) | `(milliseconds: number) => string` | Returns the largest non-zero unit ("years"/"days"/"hours"/"minutes"/"seconds") or `"0 seconds"`. |

A module-private `_now = Date.now \|\| (() => new Date().getTime())` (line 40) is the time source for `throttle`. Captured once at module load.

## IPC / global side-effects

The whole file's globals contact:

| Function | What it touches |
|---|---|
| `message` | `document.querySelector("#message")` (line 14), `#messagewrapper` (15), `#messagecontent` (16). Mutates `className` on the first two and `innerHTML` on the third. Schedules a `setTimeout(..., 100)` on line 30 to append `" animated bounce"` to the message element's class. |
| `throttle` | Reads `Date.now` via `_now`. Schedules a `setTimeout(later, remaining)` (line 93). Holds `context`, `args`, `result`, `timeout`, `previous` in closure. Does **not** clean up on caller disposal — there is no `cancel` method (Underscore's has one; this port omits it). |
| `millisecondsToStr` | None. Pure function. |
| `_now` (module-level) | Reads `Date.now` *at module-load time*. The fallback `() => new Date().getTime()` is functionally equivalent in any modern Electron renderer; it exists for vestigial IE compat from Underscore. |

No IPC, no persistence, no `window.*` writes.

### `message()` mutates the DOM outside Ractive

This is the file's most consequential behaviour and the one the brief explicitly asks to flag (group-specific guidance: "flag any DOM mutation that bypasses Ractive").

`#message`, `#messagewrapper`, and `#messagecontent` are static elements declared in [`main/index.html`](../../../main/index.html) and are **not** Ractive-managed. The Ractive components (`navigation`, `parts-view`, `nest-view`, `sheet-dialog`) live in different parts of the DOM. So `message()` is **safe to call from any Ractive lifecycle phase** — Ractive is unaware of it.

But the converse — Ractive cannot react to `#message` state — means:

- Re-rendering a Ractive view does not redraw or clear the banner.
- Closing the banner (the `#message a.close` link wired in [`main/ui/index.ts:541, 793`](../../../main/ui/index.ts) — see Group C deep-dive) sets `messagewrapper.className = ""` directly.
- If two Ractive transitions race with `message()`, the banner state can survive past the rendering of unrelated UI.

In practice this is what the codebase wants — banners are top-level chrome, not view content. Callers should not try to make Ractive "own" them.

## Dependencies

```ts
import type { ThrottleOptions } from "../types/index.js"; // line 6
```

One type-only import; `ThrottleOptions = { leading?: boolean; trailing?: boolean; }` from [`main/ui/types/index.ts:220-225`](../../../main/ui/types/index.ts).

## Used-by

Six importers across the live tree (all under `main/ui/`):

| Importer | Line | Symbol | Role |
|---|---|---|---|
| [`main/ui/index.ts`](../../../main/ui/index.ts) | 34 | `message` | Preset save / load / delete success + error toasts (`main/ui/index.ts:308, 310, 321, 349, 351, 354, 365, 376, 378`). |
| [`main/ui/services/import.service.ts`](../../../main/ui/services/import.service.ts) | 15 | `message` | All user-visible failure paths (`399, 434, 454, 461, 487, 512, 518, 547, 552, 584, 591, 614, 675, 692, 699`). |
| [`main/ui/services/export.service.ts`](../../../main/ui/services/export.service.ts) | 15 | `message` | Export-time errors (`357, 392, 438, 444, 463, 468, 688`). |
| [`main/ui/services/nesting.service.ts`](../../../main/ui/services/nesting.service.ts) | 15 | `message` | Nest start / validation errors (`430, 440, 445`). |
| [`main/ui/components/parts-view.ts`](../../../main/ui/components/parts-view.ts) | 23 | `throttle` | Wraps `updateImports + applyZoom` at 500 ms (`main/ui/components/parts-view.ts:558`). |
| [`main/ui/components/nest-view.ts`](../../../main/ui/components/nest-view.ts) | 25 | `millisecondsToStr` | Renders the "time saved" stat in the nest list (`main/ui/components/nest-view.ts:444`). |

`message` has 25+ call sites; `throttle` has one (a single `throttledUpdate` field on `PartsView`); `millisecondsToStr` has one.

## Invariants & gotchas

### `message`

1. **Silently no-ops if any of the three elements is missing.** Lines 18-20:
   ```ts
   if (!messageElement || !wrapperElement || !contentElement) {
     return;
   }
   ```
   Callers cannot tell if the banner rendered. The contract is "best-effort, fire-and-forget". Don't gate critical UX on it.

2. **`error === true` is the only modifier.** A non-error message sets `messageElement.className = ""` (line 25), wiping any previous animation-class artefact. So a pure `message("ok")` call resets the banner's CSS state.

3. **`wrapperElement.className = "active"` is hardcoded** (line 28) — not toggled, not OR'd. If something else added a class to `#messagewrapper`, this overwrites it.

4. **The 100 ms delay is required for the bounce animation** (line 30). Adding `animated bounce` to `messageElement` immediately would not retrigger the keyframe; CSS animations only run on class *transitions*. Don't reduce the delay.

5. **`contentElement.innerHTML = txt` is XSS-prone.** Line 34. The JSDoc above the function (line 9-12) does not flag this. Audit of call sites:
   - All `import.service.ts:461 / 591 / 699`: `"An error occurred reading the file: " + err.message` — `err.message` ultimately comes from Node's `fs` and the SVG/DXF parsers; not user-controlled HTML in normal flows but a malicious filename could in principle produce escape characters. Low risk, non-zero.
   - All other call sites pass static strings.
   The safer escape is `setInnerText` (from [`dom-utils.ts:427`](./main__ui__utils__dom-utils.ts.md)), but that would break the implicit HTML-formatting contract — some banners are designed to render formatted text. **Don't blindly switch to `setInnerText`** without auditing every call site.

6. **`message` bypasses [`getElement` from `dom-utils.ts`](./main__ui__utils__dom-utils.ts.md).** It calls `document.querySelector` directly. This is the only DOM-utils bypass in `main/ui/utils/**`. Cross-link: see the "Bypasses & gotchas" section of [`main__ui__utils__dom-utils.ts.md`](./main__ui__utils__dom-utils.ts.md).

### `throttle`

1. **Verbatim Underscore.js algorithm.** The JSDoc on line 44 cites this; the implementation matches Underscore 1.x's `_.throttle`. If the algorithm needs changing, port to a modern variant rather than fork-edit this one.

2. **Generic constraint `T extends (...args: unknown[]) => unknown`** (line 53) — accepts any function. The caller's `Parameters<T>` and `ReturnType<T>` flow through, so `throttle((x: number) => x.toString(), 500)` returns `(x: number) => string | undefined`. The `| undefined` exists because the leading-edge fire might not have happened yet on the first call — see invariant 3.

3. **First call returns `undefined` if `opts.leading === false`.** Lines 75-77 set `previous = now` when leading is suppressed, so `remaining > 0` and the synchronous return is the closure's `result` initial value (`undefined`). Callers that depend on the return value should avoid `leading: false`.

4. **Trailing call drops `context` and `args` after invocation** (lines 70-71, 90-91) — preventing memory leaks but also meaning the throttled fn can't be re-armed without a new caller. This is intentional.

5. **No `cancel()` method.** Underscore exposes `cancel()` to clear the pending `setTimeout`. This port does not. If a component is unmounted while a trailing call is pending, the function will fire against possibly-stale closure state. The single in-tree caller (`parts-view.ts:558`) does not unmount mid-session, so this is theoretical for now.

6. **`opts.leading === false` interacts with `opts.trailing !== false`.** Setting both to `false` produces a function that *never* fires (Underscore documents this as a foot-gun). The check on line 92 (`else if (!timeout && opts.trailing !== false)`) silently swallows it. No call site exercises the `false`/`false` combo today.

### `millisecondsToStr`

1. **Returns the largest non-zero unit only.** A duration of 1h 30m returns `"1 hour"`, dropping the minutes (lines 124-128). Callers that want full breakdown must compute it themselves.

2. **Pluralisation via `numberEnding`** (line 108-110) — `> 1` adds `"s"`. So `1 hour` is correct; `0 hours` is not reachable because the function returns `"0 seconds"` (line 139) for any sub-second input.

3. **`0` and any negative input return `"0 seconds"`.** Line 139. Specifically: `Math.floor(milliseconds / 1000)` for `milliseconds < 1000` is `0`, and the chain of `if (years) … if (seconds)` falls through.

4. **Floats are truncated, not rounded.** `Math.floor` on line 112 — `2999 ms` becomes `2 seconds`, not `3`. Don't rely on rounding behaviour for sub-second precision.

5. **Year length is 365 days exactly** (line 114: `31536000` = `365 * 86400`). Doesn't account for leap years. Acceptable here because the stat is a coarse cut-time estimate, not a calendar.

6. **The `temp %=` chain on lines 119, 124, 129 mutates `temp` in place inside the conditions.** The expression is correct but easy to mis-edit; a reformat that splits each line into a separate assignment changes the meaning.

## Known TODOs

`grep -n "TODO\|FIXME"` against this file returns **no matches**. No in-source debt markers.

## Extension points

- **Notification variants.** Currently only `error: true | false`. A `warn` / `info` / `success` taxonomy would map to additional CSS classes on `#message` and could swap `className =` for `classList.add/remove` to compose with future state.
- **A `clearMessage()` helper.** Today only [`main/ui/index.ts`](../../../main/ui/index.ts) (line 793, see Group C) clears the banner, by directly mutating `#messagewrapper.className`. Encapsulating that in a sibling export would remove the last open-coded banner mutation.
- **Type-safe `throttle` for zero-arg functions.** The current generic accepts variadic args; the single in-tree call passes a `() => void`. A more specific overload could remove the `Parameters<T>` complication for the common case.
- **Replacing `_now` and `setTimeout` with injectable clocks.** Would make `throttle` unit-testable. Not currently exposed.
- **`millisecondsToStr` precision controls.** A second argument like `precision: number` (top-N units) would be a non-breaking addition.

## Test coverage status

- **No dedicated unit tests.** Only `tests/index.spec.ts` (Playwright E2E, single file) exists.
- E2E indirect coverage:
  - `message` is called on most error paths — when an E2E flow takes a happy path, `message` is *not* exercised. The success toasts (preset save / load / delete) would exercise it but are not part of the current spec (see [Group J's `tests__index.spec.ts.md`](../j/tests__index.spec.ts.md)).
  - `throttle` runs as part of the parts-view selection drag throttle. The E2E test does not currently drive selection drags, so the throttle is exercised only at module-load (the wrap call on line 558).
  - `millisecondsToStr` runs only when the nest-list renders a non-empty list. The E2E test exits before any nesting completes.
- Effective coverage of this file is therefore **near-zero** automated; everything is validated only by manual smoke testing.

## Cross-references

- DOM helpers it does not yet use: [`dom-utils.ts`](./main__ui__utils__dom-utils.ts.md).
- Bootstrap that wires `#message a.close`: [Group C's `main__ui__index.ts.md`](../c/main__ui__index.ts.md) (function `initializeMessageClose`, line 541 → wired at 793).
- Service-layer call sites: [Group D's services deep-dives](../d/README.md) — `import.service`, `export.service`, `nesting.service`.
- Component call sites: [Group E's `main__ui__components__parts-view.md`](../e/main__ui__components__parts-view.md) (throttle), [Group E's `main__ui__components__nest-view.md`](../e/main__ui__components__nest-view.md) (millisecondsToStr).
- The `#message` markup contract: [Group G's `main__index.html.md`](../g/main__index.html.md).
- Sibling utilities: [`dom-utils.ts`](./main__ui__utils__dom-utils.ts.md), [`conversion.ts`](./main__ui__utils__conversion.ts.md).
