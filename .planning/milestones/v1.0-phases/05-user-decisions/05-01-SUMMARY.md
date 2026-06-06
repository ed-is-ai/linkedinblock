---
phase: 05-user-decisions
plan: 01
status: complete
completed: 2026-05-29
---

# Plan 05-01 Summary — Block + Dismiss Wiring

## What Was Done

### Task 1 — AccountRow.tsx

- Expanded `AccountRowProps` with two new required callbacks: `onBlock: () => void` and `onDismiss: () => void`.
- Updated the function signature to destructure both props using `Readonly<AccountRowProps>` (addresses SonarJS S6759 warning).
- Added an `actionRow` div below the chip row containing two buttons: **Dismiss** (grey, neutral) and **Block** (white background, LinkedIn blue outline), matching the D-12/D-13/D-14 design decisions.
- Added three new entries to `rowStyles`: `actionRow`, `dismissBtn`, `blockBtn`.
- No async logic introduced in the component itself — all handlers are callbacks from the parent.

### Task 2 — index.tsx (App)

- Added `handleBlock(account: FlaggedAccount)` (synchronous): extracts the LinkedIn slug from `authorProfileUrl` via `/\/in\/([^/?#]+)/`; calls `window.open` with the deep link URL (`/overlay/report-or-block/`), `'_blank'`, and `'noreferrer'`; logs a warning and no-ops if slug extraction fails (D-02, D-03).
- Added `handleDismiss(account: FlaggedAccount)` (async): reads `flaggedAccounts` and `dismissedAccounts` from storage, deletes the account entry, appends the authorId to `dismissedAccounts` (idempotent), writes both back in a single `chrome.storage.local.set` call (D-04). No manual `setAccounts` call — the existing Phase 4 `onChanged` listener handles popup refresh automatically (D-05).
- Updated the `pending.map(...)` call site to pass `onBlock` and `onDismiss` callbacks to each `AccountRow`.
- No new imports required — `FlaggedAccount` was already imported.

## TypeScript Result

`npx tsc --noEmit` exits 0. No new type errors introduced.

## Deviations

None. Implementation follows the plan exactly. The `Readonly<AccountRowProps>` annotation was added proactively to silence a SonarJS S6759 linting warning surfaced by the IDE hook — this is additive and doesn't change behaviour.
