---
plan: 10-02
status: complete
completed_at: "2026-05-30"
---

## What was built

Added "Profile bot rate" stat to the dashboard (`src/dashboard/index.tsx`).

**Derivation block** (inserted after the `recentPct` computation):
- Unions all `seenProfileIds` arrays from `windowStats` entries into a `Set<string>` (`seenUnion`), so the stat tracks unique profiles seen within the selected time window only.
- Builds `pendingIds` from accounts filtered by both `a.status !== 'dismissed'` and `!dismissed.includes(a.authorId)` to cover both dismissal paths.
- Counts how many `seenUnion` IDs are in `pendingIds` → `botProfileCount`.
- Computes `profileBotRate` as a percentage string, or `null` when `seenUnion` is empty (zero-division guard).

**Display block** (added inside the first stats card, after the `recentPct` conditional):
- When data is available: renders `"Profile bot rate: X% (N of M unique profiles in last N days)"`.
- When no profile data has been collected yet: renders `"Profile bot rate: — (browse LinkedIn to collect profile data)"`.
- Uses existing `s.statSub` style — no new styles needed.

## Verification

- `npx tsc --noEmit` — exited 0, no type errors.
- Symbol check (`seenUnion`, `botProfileCount`, `profileBotRate`, `seenProfileIds`) — all present.
