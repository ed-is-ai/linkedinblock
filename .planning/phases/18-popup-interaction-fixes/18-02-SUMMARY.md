---
phase: 18-popup-interaction-fixes
plan: "02"
subsystem: popup
tags: [bug-fix, popup, interaction, stopPropagation, storage]
dependency_graph:
  requires: []
  provides: [POPUP-01, POPUP-02]
  affects: [src/popup/AccountRow.tsx, src/popup/index.tsx]
tech_stack:
  added: []
  patterns: [stopPropagation on nested anchor, storage-only block action]
key_files:
  created: []
  modified:
    - src/popup/AccountRow.tsx
    - src/popup/index.tsx
decisions:
  - "Block is now a local-only storage write; no navigation side-effect (D-05/D-06)"
  - "Account name anchor uses stopPropagation to decouple click from row-expand toggle (D-04)"
metrics:
  duration: "~5 minutes"
  completed: "2026-06-05"
  tasks_completed: 2
  tasks_total: 2
---

# Phase 18 Plan 02: Popup One-Liner Interaction Fixes Summary

Wired two targeted popup fixes: stopPropagation on the account name anchor (POPUP-01) and removal of the trailing `window.open` navigation from `handleBlock` (POPUP-02).

## Tasks Completed

| # | Task | Commit | Files |
|---|------|--------|-------|
| 1 | POPUP-01 — stopPropagation on account name anchor | e4dda75 | src/popup/AccountRow.tsx |
| 2 | POPUP-02 — remove window.open from handleBlock | 0ee8f22 | src/popup/index.tsx |

## What Was Built

**POPUP-01 (AccountRow.tsx):** Added `onClick={(e) => e.stopPropagation()}` to the account name `<a>` element. The anchor was already correctly configured with `href`, `target="_blank"`, and `rel="noreferrer"`. Without stopPropagation, clicks bubbled up to the parent `summaryArea` div's `onToggle`, causing both profile navigation and row-expansion. The fix decouples the two interactions.

**POPUP-02 (index.tsx):** Removed the trailing comment, `const url = ...` declaration, and `window.open(url, '_blank', 'noreferrer')` call from `handleBlock`. The function now exclusively writes `status: 'blocked' as const` to `chrome.storage.local`. The `openDashboard` function's `window.open` was deliberately left untouched. The content script's existing `onChanged` listener picks up the blocked status update (D-06).

## Verification

- `npx tsc --noEmit -p tsconfig.json` exits 0 (both tasks verified individually)
- `npx vite build` completes without error — all 3 build steps passed cleanly

## Deviations from Plan

None — plan executed exactly as written.

## Known Stubs

None.

## Threat Flags

None — threat register threats T-18-04 and T-18-05 are both addressed:
- T-18-04 (anchor tamper): `rel="noreferrer"` retained on anchor, URL from stored data
- T-18-05 (storage write elevation): write scoped to existing account by authorId key only

## Self-Check

- [x] `src/popup/AccountRow.tsx` contains `onClick={(e) => e.stopPropagation()}` on the name anchor
- [x] `src/popup/index.tsx` `handleBlock` contains `status: 'blocked' as const` and no `window.open`
- [x] `src/popup/index.tsx` `openDashboard` still contains `window.open(chrome.runtime.getURL(`
- [x] Commits e4dda75 and 0ee8f22 exist in git log

## Self-Check: PASSED
