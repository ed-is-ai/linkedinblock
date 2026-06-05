---
phase: 18-popup-interaction-fixes
plan: "03"
subsystem: popup
tags: [popup, ui, blocked-accounts, preact]
dependency_graph:
  requires: ["18-02"]
  provides: ["POPUP-03"]
  affects: ["src/popup/AccountRow.tsx", "src/popup/index.tsx"]
tech_stack:
  added: []
  patterns: ["conditional JSX render", "useState toggle", "array filter+sort"]
key_files:
  created: []
  modified:
    - src/popup/AccountRow.tsx
    - src/popup/index.tsx
decisions:
  - "Blocked rows omit isExpanded/onToggle props — expansion deferred since no actions exist on blocked rows"
  - "No-op onBlock/onDismiss passed to blocked AccountRow rows; buttons are conditionally removed by isBlocked guard so they are never invoked"
  - "blockedExpanded state initialised to false — collapsed by default per D-07"
metrics:
  duration: "12m"
  completed: "2026-06-05"
  tasks_completed: 2
  tasks_total: 2
  files_modified: 2
---

# Phase 18 Plan 03: Blocked Accounts Section Summary

Collapsible "Blocked (N)" section below the pending list with read-only blocked rows (grey name, Blocked chip, no action buttons).

## Tasks Completed

| # | Task | Commit | Files |
|---|------|--------|-------|
| 1 | AccountRow isBlocked prop — grey name, Blocked chip, conditional action buttons | c616b57 | src/popup/AccountRow.tsx |
| 2 | index.tsx — blocked filter, collapsible Blocked section, header style | b6338df | src/popup/index.tsx |

## What Was Built

**AccountRow.tsx changes (Task 1):**
- Added `isBlocked?: boolean` to `AccountRowProps` interface; defaults to `false`
- Added `rowStyles.blockedChip`: background `#f3f4f6`, color `#9ca3af`, fontSize 10, padding `2px 6px`, borderRadius 10, border `1px solid #e5e7eb`
- Name `<a>` style conditionally spreads `{ color: '#9ca3af' }` when `isBlocked` — preserves fontWeight 600 and all other nameLink properties
- Renders `{isBlocked && <span style={rowStyles.blockedChip}>Blocked</span>}` in the topLine after the name anchor
- `actionRow` wrapped in `{!isBlocked && (...)}` — no Block/Dismiss buttons render for blocked rows (mitigates T-18-07)

**index.tsx changes (Task 2):**
- Added `const [blockedExpanded, setBlockedExpanded] = useState(false)` (collapsed by default)
- Added `blocked` filter: `accounts.filter(a => a.status === 'blocked').sort((a, b) => b.peakScore - a.peakScore)`
- Added `styles.blockedSectionHeader`: cursor pointer, fontSize 11, color `#6b7280`, padding `6px 0`, borderTop `1px solid #e5e7eb`, userSelect none
- Collapsible section renders when `blocked.length > 0`: header div with click toggle showing `Blocked (N) ▾/▸`; when expanded, maps blocked to `<AccountRow>` with `isBlocked={true}`
- No second `chrome.storage.onChanged` listener added — existing listener at lines 44–55 already refreshes `accounts` state, causing live move of freshly-blocked accounts from pending into the Blocked section

## Deviations from Plan

None — plan executed exactly as written.

## Threat Mitigation Verification

| Threat | Mitigation Applied |
|--------|--------------------|
| T-18-06: authorName XSS | Rendered via JSX `{account.authorName}` — Preact escapes text nodes, no innerHTML |
| T-18-07: Blocked row action buttons | `actionRow` conditionally removed for `isBlocked={true}` rows — Block/Dismiss never rendered or invokeable |

## Known Stubs

None.

## Self-Check

- [x] `src/popup/AccountRow.tsx` modified — contains `isBlocked`, `blockedChip`, `!isBlocked` guard
- [x] `src/popup/index.tsx` modified — contains `blockedExpanded`, `status === 'blocked'`, `blockedSectionHeader`
- [x] Commit c616b57 exists (Task 1)
- [x] Commit b6338df exists (Task 2)
- [x] `npx tsc --noEmit` exits 0
- [x] `npx vite build` completes without error

## Self-Check: PASSED
