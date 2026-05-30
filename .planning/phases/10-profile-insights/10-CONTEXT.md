---
phase: 10-profile-insights
milestone: v1.2
requirements: [INSIGHT-01, INSIGHT-02]
status: planning
---

# Phase 10 Context — Profile Insights

## Goal

Add a "Profile bot rate" stat to the dashboard: the percentage of unique author profiles seen in the feed (within the selected time window) that are flagged accounts. This is more informative than the post-level rate because a prolific bot posting 30 times should count once, not 30 times.

## Design Decisions (from STATE.md v1.2)

| Decision | Outcome |
|----------|---------|
| Profile deduplication strategy | Option B: `seenProfileIds: string[]` embedded in each `DailyStats` entry. Content script adds authorId to today's array if not already present. |
| Profile bot-rate denominator | Union Set of all `seenProfileIds` across window days → truly unique profiles seen in that window |
| Bot count for rate | `accounts.filter(a => unionSet.has(a.authorId)).length` — flagged (non-dismissed) accounts whose ID appears in the union |
| Non-flagged profiles | IDs stored in `DailyStats` but no detail record created — no popup/UI exposure |
| Storage growth | 30 days × ~100 IDs × ~20 bytes ≈ 60KB max — well within chrome.storage limits |

## Scope

**In scope:**
- Add `seenProfileIds?: string[]` to `DailyStats` type
- Track unique author IDs seen per day in the content script
- Merge-write seenProfileIds (union with existing storage values) on each `writeDailyStats` call
- Display "Profile bot rate" on the dashboard, computed from the time window union

**Out of scope:**
- Profile-level filtering or new popup features
- Retroactive backfill of historical data (stat only shows days since Phase 10 deploys)

## Files Touched

| Plan | Files |
|------|-------|
| 10-01 | `src/shared/types.ts`, `src/content/index.ts` |
| 10-02 | `src/dashboard/index.tsx` |

## Verification

INSIGHT-01: After loading LinkedIn and scrolling through posts from N distinct authors, `dailyStats[today].seenProfileIds` should contain exactly those N distinct authorIds (no duplicates).

INSIGHT-02: The dashboard "Profile bot rate" stat updates correctly when switching time windows. A bot-rate of 0% displays when seenProfileIds is absent (backwards-compatible with pre-Phase-10 data).
