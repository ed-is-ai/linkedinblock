---
phase: 08-popup-detail
plan: 02
status: complete
completed: 2026-05-30
---

# Plan 02 Summary — Accordion State & StoredPosts Wiring in App

## What Was Done

Modified `src/popup/index.tsx` to wire the accordion expansion logic and stored post data into the `App` component:

1. **Type import updated** — added `StoredPost` to the existing import from `'../shared/types'`.
2. **New state added** — `expandedId: string | null` (accordion control) and `storedPosts: StoredPost[]` (posts from storage) declared alongside existing state.
3. **Storage read extended** — added `'storedPosts'` to the `chrome.storage.local.get(...)` call in the second `useEffect`; calls `setStoredPosts((result.storedPosts ?? []) as StoredPost[])` after the existing dailyStats logic.
4. **AccountRow call site updated** — each row in `pending.map(...)` now receives:
   - `isExpanded={expandedId === account.authorId}`
   - `onToggle={() => setExpandedId(prev => prev === account.authorId ? null : account.authorId)}`
   - `posts={storedPosts.filter(p => p.authorId === account.authorId).slice(0, 3)}`

## Verification

- String-presence check passed (all 7 required tokens present in `index.tsx`).
- `npx tsc --noEmit` exits 0 — no type errors.

## Outcome

The accordion is fully wired: clicking a row expands the signal detail panel and (if posts exist) the post preview section; clicking the same row collapses it; clicking a different row replaces the open panel — satisfying UX-01, UX-02, and UX-03.
