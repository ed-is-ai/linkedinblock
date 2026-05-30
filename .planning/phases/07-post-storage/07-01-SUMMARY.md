---
phase: 07-post-storage
plan: 01
status: complete
completed: 2026-05-30
---

# Plan 07-01 Summary — Storage Foundation

## What Was Done

**Task 1 — `src/shared/types.ts`**
- Added `StoredPost` exported interface (6 fields: `urn`, `authorId`, `authorName`, `score`, `text`, `hiddenAt`) between `DailyStats` and `StorageSchema`.
- Added `storedPosts?: StoredPost[]` key to `StorageSchema` with JSDoc describing newest-first ordering, 200-entry cap, and Phase 8 consumer.
- Updated `PostData.postText` JSDoc to reflect v1.1 opt-in storage (replaces v1.0 "never persisted" note).
- Updated `ObservedPost.postText` JSDoc to match.

**Task 2 — `src/shared/postStore.ts` (new file)**
- Created shared module mirroring `queue.ts` pattern: imports only `storageGet`/`storageSet` and `StoredPost`.
- Exports `persistStoredPost(opts)` with:
  - URN deduplication (early return if already stored)
  - Text truncation via `.trim().slice(0, POST_TEXT_MAX_CHARS)` (1000 chars)
  - Newest-first prepend: `[entry, ...storedPosts]`
  - Oldest eviction: `updated.pop()` when `updated.length > POST_STORE_CAP` (200)
- Named constants `POST_STORE_CAP = 200` and `POST_TEXT_MAX_CHARS = 1000`.
- No `document.` or `chrome.runtime.` references — safe shared module.

## Verification

- `node -e "..."` symbol checks passed for both files.
- `npx tsc --noEmit` exits 0 — TypeScript strict mode clean.

## Ready For

Plan 07-02: wire `persistStoredPost()` into the `if (hide) { ... }` block in `src/content/index.ts`.
