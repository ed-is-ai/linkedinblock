---
phase: 05-user-decisions
plan: 02
status: complete
completed: 2026-05-29
---

# Plan 05-02 Summary — Dismiss + Badge Infrastructure

## What Was Done

### `src/content/index.ts`

- **`hiddenPostNodes: Map<string, Element[]>`** added at module scope (after `profileSignalCache`). Tracks which DOM nodes were hidden per authorId so they can be unhidden on dismiss.
- **`dismissedSet: Set<string>`** hoisted from inside `init()` to module scope. Populated in `init()` via `.add()` (not reconstructed) so the module-scope `onChanged` listener shares the same Set reference.
- **Hide path** updated: after `postNode.classList.add('llb-hidden')`, the node is appended to `hiddenPostNodes` under `authorId || urn`.
- **SPA navigation hooks** (`popstate` handler and `history.pushState` override) now call `hiddenPostNodes.clear()` alongside the existing `profileSignalCache.clear()`.
- **`chrome.storage.onChanged` listener** registered at module top level (outside `init()`). When `dismissedAccounts` changes, diffs old vs. new values, adds freshly dismissed ids to `dismissedSet`, removes `llb-hidden` from all tracked nodes for each id, and clears the map entry.

### `src/background/index.ts`

- **`sessionHiddenCount`** variable removed entirely.
- **`chrome.storage.onChanged` listener** added after `onInstalled`. When `flaggedAccounts` changes, counts entries with `status === 'pending'` and sets badge text to that count (empty string when 0, so no badge on a clean feed).
- **`POST_HIDDEN` handler** preserved (message contract with content script maintained) but no longer updates the badge — replaced with a comment pointing to the new `onChanged` listener.
- `SCORE_POST` handler unchanged.

## TypeScript Result

`npx tsc --noEmit` exits 0 — no errors.

## Deviations

None. Implementation follows the plan exactly, including the fix noted in the IDE diagnostics (residual `sessionHiddenCount` references in `POST_HIDDEN` handler removed in the same session).
