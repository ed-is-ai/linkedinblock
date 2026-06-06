# Phase 7: Post Storage — Context

**Gathered:** 2026-05-30
**Status:** Ready for planning

<domain>
## Phase Boundary

When a post is auto-hidden, save its text and metadata to `chrome.storage.local` so the user can review what was hidden from within the extension (popup Phase 8) without returning to LinkedIn.

**Deliberate override of the v1.0 "never store post text" constraint:** The user explicitly opted in to post storage. This is documented in PROJECT.md v1.1 requirements.

**Deliverables:**
1. `StoredPost` interface in `types.ts`
2. `storedPosts?: StoredPost[]` key in `StorageSchema`
3. `src/shared/postStore.ts` — `persistStoredPost()` helper (200-cap, 1000-char truncation)
4. Content script calls `persistStoredPost()` on every hide event

**Not in Phase 7:**
- Displaying stored posts in the popup (Phase 8)
- Exporting stored posts (Phase 9)
- Storing posts that scored below the auto-hide threshold (flagged but not hidden)

</domain>

<decisions>
## Implementation Decisions

### StoredPost Type

- **D-01:** `StoredPost` interface:
  ```typescript
  interface StoredPost {
    urn: string;       // post URN — dedup key; matches FlaggedAccount.hiddenPostUrns entries
    authorId: string;  // FK to FlaggedAccount; Phase 8 filters by this
    authorName: string;
    score: number;     // mergedScore at time of hiding (integer 0–100)
    text: string;      // post text truncated at POST_TEXT_MAX_CHARS
    hiddenAt: number;  // Unix timestamp (ms)
  }
  ```

- **D-02:** `StoredPost[]` is stored as a flat array, newest-first (prepend on write). Phase 8 filters by `authorId` in-memory — at 200 entries this is negligible.

- **D-03:** `storedPosts` is a **separate key** from `flaggedAccounts` — no schema entanglement. Eviction is independent.

### Cap & Truncation

- **D-04:** `POST_STORE_CAP = 200` — when the array length reaches 200 before inserting, drop the oldest entry (last item in the newest-first array).

- **D-05:** `POST_TEXT_MAX_CHARS = 1000` — `text = postText.trim().slice(0, POST_TEXT_MAX_CHARS)`. Enough for review; avoids ballooning storage on verbose posts. LinkedIn posts are typically 150–600 words (750–3000 chars); most will be truncated.

- **D-06:** Dedup by URN: if a post URN is already in `storedPosts`, skip the write (the post may be re-observed on React re-render). Check before inserting.

### Module Location

- **D-07:** Create `src/shared/postStore.ts` — mirrors `src/shared/queue.ts` pattern. Contains `persistStoredPost()` only. Imported by content/index.ts.

### Content Script Wiring

- **D-08:** Call `persistStoredPost()` inside the `if (hide) { ... }` block in content/index.ts, alongside the existing `persistFlaggedAccount()` call. Fire-and-forget (`.catch(() => {})`).

- **D-09:** `postText` is available as a local variable in the `startObserving` callback closure — no new extraction needed.

### Security Note (Updated from v1.0)

- **D-10:** The `PostData.postText` JSDoc in `types.ts` says "memory only — NEVER persisted". This is now outdated. Update the comment to: "Post text content. As of v1.1, this IS persisted to chrome.storage.local via persistStoredPost() when a post is hidden — the user explicitly opted in to post storage."

</decisions>

<canonical_refs>
## Canonical References

- `.planning/REQUIREMENTS.md` — STORE-01, STORE-02, STORE-03
- `.planning/ROADMAP.md` §Phase 7 — success criteria
- `src/shared/types.ts` — `StorageSchema` (add `storedPosts`), `PostData` (update JSDoc)
- `src/shared/storage.ts` — `storageGet`/`storageSet` wrappers used by postStore.ts
- `src/shared/queue.ts` — structural reference for `persistFlaggedAccount` pattern
- `src/content/index.ts` — the `if (hide) { ... }` block (lines ~270–285) where the call goes

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Patterns
- `src/shared/queue.ts` — same pattern: read from storage, mutate array, write back. `persistStoredPost` follows the same async structure.
- `storageGet(['storedPosts'])` / `storageSet({ storedPosts })` — same typed wrappers used by all storage modules.

### Integration Point
- `src/content/index.ts` — the hide block:
  ```typescript
  if (hide) {
    hiddenToday++;
    postNode.classList.add('llb-hidden');
    injectTombstone(postNode, authorName, mergedScore);
    hiddenPostNodes.set(trackKey, [...]);
    chrome.runtime.sendMessage({ type: 'POST_HIDDEN' }).catch(() => {});
    writeDailyStats().catch(() => {});
  }
  ```
  Add `persistStoredPost({ urn, authorId: trackKey, authorName, score: mergedScore, text: postText }).catch(() => {});` here.

</code_context>

<deferred>
## Deferred

- Storing flagged-but-not-hidden posts (score 35–59) — Phase 7 only stores hidden posts
- Storing engagement-expanded comment text — too noisy; post body only
- Compression of stored text — overkill at 200-entry cap

</deferred>

---

*Phase: 7 — Post Storage*
*Context gathered: 2026-05-30*
