---
plan: 10-01
status: complete
completed_at: "2026-05-30"
---

## What was built

Added unique author profile ID tracking to the daily stats system (INSIGHT-01).

### `src/shared/types.ts`
Added `seenProfileIds?: string[]` to the `DailyStats` interface. This optional array stores deduped author profile IDs observed each calendar day.

### `src/content/index.ts`
Four targeted changes:

1. **Module-scope set** — `const seenProfileIdsToday = new Set<string>()` declared after `botSignalsToday`, persisting across SPA navigations until explicitly cleared.

2. **Populate on observation** — `seenProfileIdsToday.add(authorId)` called immediately after `seenToday++` in the `startObserving` callback, so every post that passes exclusions contributes its author to the set.

3. **Merge-aware `writeDailyStats`** — on each write the function reads the existing entry's `seenProfileIds` from storage, unions it with the in-memory set, and writes back the merged array. This ensures SPA navigations (which clear the in-memory set) do not erase IDs already accumulated for the current calendar day.

4. **SPA navigation reset** — `seenProfileIdsToday.clear()` added to both the `popstate` handler and the `history.pushState` override, alongside the existing counter resets.

## Verification

`npx tsc --noEmit` — passed (exit 0, no errors after adding `!` non-null assertion on `filtered[idx]` to satisfy TypeScript's strict array-element typing).

Content string check confirmed presence of `seenProfileIdsToday`, `seenProfileIdsToday.add(authorId)`, and `seenProfileIdsToday.clear()`.
