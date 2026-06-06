---
phase: 07-post-storage
plan: 02
status: complete
completed: 2026-05-30
---

# Plan 02 Summary — Wire persistStoredPost into content script hide path

## What was done

Modified `src/content/index.ts` with two targeted changes:

1. **Added import** alongside the other `../shared/` imports:
   ```typescript
   import { persistStoredPost } from '../shared/postStore';
   ```

2. **Added fire-and-forget call** inside the `if (hide) { ... }` block, after `chrome.runtime.sendMessage({ type: 'POST_HIDDEN' }).catch(() => {})`:
   ```typescript
   persistStoredPost({
     urn,
     authorId: authorId || urn,
     authorName,
     score: mergedScore,
     text: postText,
   }).catch(() => {});
   ```

All five variables (`urn`, `authorId`, `authorName`, `mergedScore`, `postText`) were already in scope in the `detector.detect().then()` closure — no new extraction was required.

## Verification

- Node inline check: `persistStoredPost` present, `text: postText` present — **PASS**
- `npx tsc --noEmit` — **exits 0**, no type errors

## Requirements satisfied

- **STORE-01**: Hidden posts are now saved to `storedPosts` with all required fields (`urn`, `authorId`, `authorName`, `score`, `text`, `hiddenAt`) — fulfilled by the wiring in this plan plus the postStore.ts implementation from Plan 01.
- **STORE-02**: 200-entry cap enforced in `postStore.ts` (Plan 01).
- **STORE-03**: Text truncated at 1000 chars in `postStore.ts` (Plan 01).

## Phase 8 readiness

Every auto-hidden post is now persisted to `storedPosts` in `chrome.storage.local`. Phase 8 can read `storedPosts` and filter by `authorId` to display per-account post previews in the popup.
