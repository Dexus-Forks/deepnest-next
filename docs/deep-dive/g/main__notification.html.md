# `main/notification.html` — Deep Dive

**Generated:** 2026-04-25 by Paige (Tech Writer); **re-verified** 2026-04-26 against `HEAD` for [DEE-39](/DEE/issues/DEE-39) (Paperclip-isolated full redo of the Group G deep-dive; parent: [DEE-11](/DEE/issues/DEE-11)).
**Group:** G — deep-dive static surfaces.
**File:** `main/notification.html` (218 LOC, single file).
**Mode:** Exhaustive deep-dive — every line citation below has been spot-checked against `HEAD` on 2026-04-26.

## Scope correction (vs DEE-11)

DEE-11 lists `main/notification/*` (HTML + assets) as a directory. **There is no `main/notification/` directory.** The notification surface is a single self-contained file at `main/notification.html` and no sibling assets ship under that name. The deep-dive scope therefore collapses to one file, and the discrepancy is captured here so the parent inventory matches reality on the next sweep.

## 1. Purpose

Renderer for the on-demand modal notification window. Created by `main.js:148-203` (`createNotificationWindow(notification)`), opened as a child of `mainWindow` with `modal: true`, `parent: mainWindow`, `alwaysOnTop: true`, `type: "notification"`, fixed 750×500. The window is **stateless on disk**: every notification payload is stashed on the BrowserWindow instance (`win.notificationData = notification`) and pulled back into the renderer via the `get-notification-data` IPC.

The file is intentionally self-contained — all CSS lives inline, the only `<script>` block is inline at the end, and there are no external resource references. This is so the window is independent of the main renderer's `style.css` / `latolatinfonts.css` / `util/*` load graph.

## 2. Element id inventory

Three ids, all of them load-bearing:

| id | HTML line | Element | Purpose |
|---|---|---|---|
| `title` | 189 | `<h1>` | Title text. Default placeholder is the literal `"Notification"` until the `notification-data` IPC reply lands and overwrites `textContent`. |
| `content` | 190 | `<div class="content">` | Rich body. Filled via `innerHTML = data.content` (line 209) — the payload **is HTML**, not Markdown, and not sanitized in this file. See §6 Gotcha. |
| `okButton` | 194 | `<button class="btn">` | Closes the window via the `close-notification` IPC. |

No other ids are used. CSS rules attach via classes (`.notification-container`, `.content`, `.button-container`, `.btn`, `.release-info`, `.merged-notification`, `.notification-date`, `.notification-content`, `.additional-notice`, `.release-assets`, `.assets-list`, `.asset-item`, `.asset-link`, `.asset-size`, `.asset-info`).

The inline CSS also targets `*::-webkit-scrollbar*` (lines 8-37) to recolor scrollbars for the dark notification surface — this is **not** shared with `main/style.css`'s scrollbar rules.

## 3. IPC contract

The notification window participates in three IPC channels. None of them are listed in `IPC_CHANNELS` (`main/ui/types/index.ts:268-270`) — that constant is scoped to the modular UI; the notification window is a separate renderer with its own private contract.

### 3.1 `get-notification-data` — request

| Field | Value |
|---|---|
| Channel | `get-notification-data` |
| Direction | renderer → main (`ipcRenderer.send`) |
| Payload | none |
| Sent from | `notification.html:203` (DOMContentLoaded handler) |
| Handled by | `main.js:391-399` (`ipcMain.on('get-notification-data', ...)`) |

The handler looks up the originating window via `BrowserWindow.fromWebContents(event.sender)` and reads `win.notificationData` (the property set by `createNotificationWindow` at construction time, `main.js:202`). It replies on the request channel using `event.reply(...)`, which is the modern equivalent of the deprecated synchronous send-and-forget pattern.

### 3.2 `notification-data` — reply

| Field | Value |
|---|---|
| Channel | `notification-data` |
| Direction | main → renderer (`event.reply`) |
| Payload | `{ title: string, content: string }` |
| Sent from | `main.js:394-397` |
| Handled by | `notification.html:207-210` (`ipcRenderer.on('notification-data', ...)`) |

Only `{ title, content }` are forwarded. The `markAsSeen` callback that lives on the main-process `notificationData` stash is **never** sent over IPC — it is invoked from the main process when `close-notification` arrives.

### 3.3 `close-notification` — close + advance

| Field | Value |
|---|---|
| Channel | `close-notification` |
| Direction | renderer → main (`ipcRenderer.send`) |
| Payload | none |
| Sent from | `notification.html:214` (OK button click handler) |
| Handled by | `main.js:401-419` |

The handler:

1. Looks up the originating window.
2. If `win.notificationData.markAsSeen` exists, invokes it (persists the seen UUID/release tag through `NotificationService` — the same callback declared in `notification-service.js:234,264,281,299`).
3. Closes the window.
4. After 500 ms, calls `notificationService.checkForNotifications()` once and, if a next notification exists, opens another `createNotificationWindow(...)` — this is how the *"There are N additional notification(s)"* chain advances.

## 4. Expected message-data shape

The renderer reads only `title` and `content`. The full main-process notification payload (constructed in `notification-service.js`) is:

```ts
type NotificationPayload = {
  title: string;            // shown in #title via textContent
  content: string;          // injected into #content via innerHTML — see §6
  markAsSeen: () => void;   // never crosses IPC; called by main on close-notification
}
```

Three call sites in `notification-service.js` build this object:

| Trigger | Site | Title example | Content shape |
|---|---|---|---|
| Multiple unseen notifications | `notification-service.js:230-247` | `"Multiple Important Updates"` | Concatenated `<div class="merged-notification">` blocks for each item |
| Single unseen notification (with linked release) | `notification-service.js:260-273` | `notification.title \|\| 'Deepnest Notification'` | `notification.content` plus an `.additional-notice` block when an unrelated update is also pending |
| Single unseen notification (no extras) | `notification-service.js:277-289` | same | `notification.content` (no extras) |
| New release available | `notification-service.js:295-303` | `` `New Version Available: ${releaseInfo.tag_name}` `` | `formatReleaseContent(releaseInfo)` — assembles `.release-info`, `.release-assets`, `.assets-list`, `.asset-item` |

The CSS classes recognised by the inline stylesheet (line 100-184) line up with this shape — the `.merged-notification`, `.release-info`, `.release-assets`, `.additional-notice` classes are not referenced from the renderer-side script; they are entirely styling hooks for the markup that the main process writes into the `content` field.

## 5. Wiring of the OK button (`#okButton`)

The button is wired by an inline DOM event listener (line 213-215):

```js
document.getElementById("okButton").addEventListener("click", () => {
  ipcRenderer.send("close-notification");
});
```

This is the only path that closes the window through user interaction. The window can also be closed by:

- The OS window-close button — fires `close` on the BrowserWindow → `main.js:175-177` (`closed` listener) clears `notificationWindow = null`. **`markAsSeen` is not called** in this path; the user has chosen to dismiss without acknowledging. This is intentional based on the existing flow — a quit-without-ack is treated as "show me again next time."
- A second notification arriving while one is open — `createNotificationWindow` calls `.close()` on the previous instance before opening the next (`main.js:149-151`).

## 6. Invariants & gotchas

1. **`innerHTML = data.content` is unsanitized** (line 209). The notification feed comes from a trusted source (the deepnest GitHub release feed via `notification-service.js`), but treat any change to that source as a renderer-XSS surface. `nodeIntegration: true` is set on this window — a script tag in the payload would execute with Node access. Do not point `notification-service.js` at user-controlled content without adding sanitization here.
2. **The `event` parameter on the `notification-data` listener (line 207) is unused** but kept positional because Electron's `ipcRenderer.on` callback signature is `(event, ...args)`.
3. **No fallback for missing data** — if `get-notification-data` fires but `win.notificationData` is missing on the main side, no reply is sent (`main.js:393` short-circuits) and the window keeps showing the placeholder `<h1>Notification</h1>`. This is unlikely (the main process always stashes the payload before opening the window) but means the window will not error visibly.
4. **`ipcRenderer` is reached via `require("electron")`**, which depends on `webPreferences.nodeIntegration: true`. The notification window does **not** declare its own preferences — it inherits the same permissive set as the main window from `main.js:154-159`. Removing `nodeIntegration` from this window would break this file.
5. **The window has no menu bar suppression**. `createNotificationWindow` sets `frame: true, resizable: false, minimizable: false, maximizable: false` but does not call `setMenu(null)`. The default Electron menu therefore renders on Linux and Windows. This is a low-priority cosmetic issue.
6. **Inline CSS only** — there is no link to `main/style.css`. Restyling notifications must be done in this file. The scrollbar rules (lines 8-37) and the body font (`Arial, sans-serif`, line 40) are deliberately not shared with `main/index.html` (which uses LatoLatinWeb).

## 7. Known TODOs

None in this file. The closest debt is in `main.js`:

- `main.js:179-203` constructs the window with hard-coded 750×500 — no scaling for HiDPI or for unusually long content.
- `main.js:413-418` uses a 500 ms `setTimeout` to advance the chain. A "next notification" race could in principle land before the prior window's `closed` event clears `notificationWindow`; in practice the gap is wide enough that it has never been observed.

## 8. Extension points

| To add… | Touch this file | Also touch |
|---|---|---|
| A new field in the payload (e.g. icon URL, severity) | Add a target element + populate it inside the `notification-data` handler | `notification-service.js` builders; `main.js:394-397` reply payload |
| A "Don't show again" checkbox | Add `<input type="checkbox" id="dontShowAgain">` and include its value in a new `close-notification` payload | `main.js:401-410` to read it and skip `markAsSeen` accordingly |
| Markdown rendering of the content | Replace `innerHTML = data.content` with a sanitized renderer (e.g. `marked` is already a main-process dependency — pre-render there and keep this side rendering raw HTML) | `notification-service.js` to mark payloads as Markdown vs HTML |

## 9. Test coverage

No Playwright spec exercises the notification window. It is a child window opened from outside the test entry point (`main/index.html`), and the test runner does not currently follow the second-window flow. Manual / not covered.

If a spec is needed, it would have to drive the main-process `NotificationService` to fabricate a payload (e.g. via `--devtools-debug` or a test-only IPC channel) and then assert against the second BrowserWindow.

## 10. Cross-references

- [`docs/deep-dive/a/main.js.md`](../a/main.js.md) §3.3 — notification BrowserWindow construction; §5.5 — IPC handlers (`get-notification-data`, `close-notification`).
- [`docs/deep-dive/a/main__notification-service.js.md`](../a/main__notification-service.js.md) — payload construction, `markAsSeen` semantics, GitHub release polling.
- [`docs/deep-dive/g/main__index.html.md`](./main__index.html.md) — the sibling visible-renderer surface.
