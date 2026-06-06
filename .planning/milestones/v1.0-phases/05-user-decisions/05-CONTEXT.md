# Phase 5: User Decisions — Context

**Gathered:** 2026-05-29
**Status:** Ready for planning

<domain>
## Phase Boundary

Let users act on flagged accounts from the popup:
1. **Block** — opens LinkedIn's own block/report overlay URL in a new tab (ACTION-01)
2. **Dismiss** — removes the account from the queue, adds to `dismissedAccounts`, unhides their previously hidden posts in the feed (ACTION-02)
3. **Badge** — updates to reflect the number of pending flagged accounts (not session hidden post count); decrements on dismiss

**Not in Phase 5:**
- Configurable threshold (Phase 6)
- Dashboard stats (Phase 6)
- Any automated block simulation (ToS risk; deep link only per STATE.md decision)

</domain>

<decisions>
## Implementation Decisions

### Block (ACTION-01)

- **D-01:** From the popup, open the deep link using `window.open(url, '_blank')`. No `tabs` permission required — the popup context can call `window.open` directly. Manifest stays unchanged.

- **D-02:** Derive the slug from `account.authorProfileUrl` using `/\/in\/([^/?#]+)/`. If extraction fails (e.g. company page URL somehow in the queue), log a warning and no-op.

- **D-03:** No storage write on block. The user completes the block in LinkedIn's own UI. The account remains in the popup queue as `status: 'pending'` until Phase 6 or future work.

### Dismiss (ACTION-02)

- **D-04:** Dismiss is a two-write operation in the popup:
  1. Delete `account.authorId` from `flaggedAccounts`
  2. Append `account.authorId` to `dismissedAccounts` (if not already present)
  Both writes are performed in a single `chrome.storage.local.set({flaggedAccounts, dismissedAccounts})` call.

- **D-05:** Popup state update on dismiss is **automatic** — the existing `chrome.storage.onChanged` listener in the popup (Phase 4) already re-reads `flaggedAccounts` and calls `setAccounts`. No manual state mutation needed.

- **D-06:** The unhide flow is **storage-driven** (no message relay, no `tabs` permission):
  - Content script adds a `chrome.storage.onChanged` listener at init
  - When `dismissedAccounts` changes, the listener diffs old vs. new values to find newly added authorIds
  - For each newly dismissed authorId: adds to in-memory `dismissedSet`, removes `llb-hidden` class from tracked post nodes, removes the authorId entry from the `hiddenPostNodes` map

- **D-07:** Content script tracks hidden post nodes in a new module-scope `Map<string, Element[]>` (`hiddenPostNodes`). When a post is hidden (`.llb-hidden` added), the postNode is appended to this map under `authorId`.

- **D-08:** `hiddenPostNodes` is cleared on SPA navigation (same hook as `profileSignalCache.clear()`).

### Badge Update

- **D-09:** Replace the session-count badge (`sessionHiddenCount`) with a **storage-driven badge** in the service worker. The SW listens to `chrome.storage.onChanged` for `flaggedAccounts` changes and sets the badge text to the count of entries with `status === 'pending'`.

- **D-10:** Keep the `POST_HIDDEN` message handler in the SW (content script still sends it) but the badge is now updated via the onChanged listener, not the message counter. Remove `sessionHiddenCount` — it's misleading after Phase 5 because dismiss doesn't send a corresponding decrement message.

- **D-11:** Badge semantics change: was "hidden posts this session", now "pending flagged accounts in queue". Badge text is empty string when count is 0 (no badge shown on clean feed).

### AccountRow — Button Design

- **D-12:** Add two small buttons to the bottom of each AccountRow row:
  - **Block** — opens LinkedIn deep link; LinkedIn blue outline button
  - **Dismiss** — removes from queue; neutral grey button
  Both buttons are below the signal chips.

- **D-13:** AccountRow gains two new required props: `onBlock: () => void` and `onDismiss: () => void`. The component calls them on click. No async logic in AccountRow — the parent `App` owns the storage writes.

- **D-14:** Button labels: "Block" and "Dismiss". No icons in Phase 5.

### No Manifest Changes

- **D-15:** No new permissions needed. `window.open` does not require the `tabs` permission. Storage-driven unhide does not require tab messaging.

</decisions>

<canonical_refs>
## Canonical References

- `.planning/REQUIREMENTS.md` — ACTION-01, ACTION-02, FEED-02
- `.planning/ROADMAP.md` §Phase 5 — success criteria
- `src/shared/types.ts` — `FlaggedAccount` (status stays `'pending'`; dismissed accounts are removed from flaggedAccounts entirely)
- `src/shared/storage.ts` — `storageGet` / `storageSet`
- `src/popup/AccountRow.tsx` — gains `onBlock` + `onDismiss` props (Wave 1 changes this file)
- `src/popup/index.tsx` — `App` component adds dismiss and block handlers (Wave 1)
- `src/content/index.ts` — adds `hiddenPostNodes` map + `chrome.storage.onChanged` listener (Wave 1)
- `src/background/index.ts` — replaces session counter with storage-driven badge (Wave 1)
- `src/manifest.json` — no changes needed

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- Popup `chrome.storage.onChanged` listener (Phase 4) — already handles `flaggedAccounts` changes; dismiss writes trigger automatic popup refresh at no extra cost
- Content script `dismissedSet: Set<string>` (Phase 3) — already prevents new posts from dismissed authors; Phase 5 extends it to also react to mid-session dismissals
- SW `chrome.storage.onInstalled` and `onMessage` handlers — Phase 5 adds an `onChanged` listener alongside these

### Established Patterns
- Popup uses `chrome.storage.local.get([...]).then(...)` directly (no storageGet wrapper) — consistent with Phase 4
- SW sends badge updates via `chrome.action.setBadgeText` — keep this pattern
- Content script: `postNode.classList.add('llb-hidden')` — Phase 5 reverses this with `classList.remove`

### New Patterns
- `hiddenPostNodes: Map<string, Element[]>` — tracks post DOM nodes for unhiding; entries cleared on SPA navigation
- `chrome.storage.onChanged` in content script — first use in content script; registers at top level (not inside init())

</code_context>

<specifics>
## Specific Ideas

- Dismiss handler in App is `async` — reads current storage, removes entry, appends to dismissedAccounts, writes back. The existing onChanged listener handles popup refresh automatically.
- For the storage onChanged diff in content script: `const freshlyDismissed = newIds.filter(id => !new Set(oldIds).has(id))`
- Block handler is synchronous: extract slug from URL, call `window.open`
- Remove `sessionHiddenCount` from `background/index.ts` — it resets on every SW termination and is no longer the source of truth after Phase 5

</specifics>

<deferred>
## Deferred Ideas

- **status: 'blocked' | 'dismissed' on FlaggedAccount** — not needed for Phase 5. Dismissed accounts are removed from `flaggedAccounts`. Blocked accounts remain as `'pending'` (user completed block externally). Phase 6/future work can add explicit status tracking.
- **"Blocked" confirmation toast** — show in-popup feedback that the block tab opened. Low priority; Phase 6 concern.
- **Undo dismiss** — not in scope.

</deferred>

---

*Phase: 5 — User Decisions*
*Context gathered: 2026-05-29*
