---
phase: 18-popup-interaction-fixes
plan: "01"
subsystem: content-script
tags: [bug-fix, threshold-hiding, storage-observer, BUG-01]
dependency_graph:
  requires: []
  provides: [thresholdAuthors-map, threshold-hide-on-load, threshold-onChanged-rebuild]
  affects: [src/content/index.ts]
tech_stack:
  added: []
  patterns: [module-scope-map-mirroring-blockedAuthors, fast-path-observer-branch, onChanged-settings-rebuild]
key_files:
  created: []
  modified:
    - src/content/index.ts
decisions:
  - "thresholdAuthors mirrors blockedAuthors lifecycle: populated at init, rebuilt on settings change only"
  - "Dismissed authors excluded from thresholdAuthors via early-return guard using trackKey"
  - "Grey injectTombstone used for threshold-hidden posts (not red injectBlockedTombstone, D-02)"
  - "currentThreshold module variable prevents stale-threshold race in onChanged handler"
  - "thresholdAuthors NOT cleared on popstate/pushState — session-persistent (RESEARCH Pitfall 1)"
metrics:
  duration: "12 minutes"
  completed: "2026-06-05"
  tasks_completed: 3
  files_modified: 1
---

# Phase 18 Plan 01: Threshold Authors Fast-Path (BUG-01) Summary

Fixed BUG-01: added `thresholdAuthors` map + `currentThreshold` module variable to `src/content/index.ts` so pending accounts whose stored `peakScore` already meets the auto-hide threshold from prior sessions are hidden immediately on load and on new scrolled-in posts, without re-running the async detector.

## What Was Built

Three coordinated changes to `src/content/index.ts`:

1. **Module-scope declarations** — `const thresholdAuthors = new Map<string, number>()` (after `blockedAuthors`) and `let currentThreshold = 60` (near daily stats counters).

2. **init() population** — After reading settings, assigns `currentThreshold = autoHideThreshold`, then extends the `flaggedAccounts` loop with an `else if (entry.status === 'pending' && entry.peakScore >= autoHideThreshold)` branch that calls `thresholdAuthors.set(id, entry.peakScore)`. Blocked accounts continue to go to `blockedAuthors` only.

3. **Observer fast-path** — In `startObserving` callback, immediately after the `blockedAuthors.has(trackKey)` block: (a) `if (dismissedSet.has(trackKey)) return` guard prevents dismissed authors from being threshold-hidden; (b) `if (thresholdAuthors.has(trackKey))` block hides with `classList.add('llb-hidden')`, calls `injectTombstone` (grey), tracks in `hiddenPostNodes`, and returns — no detector call.

4. **onChanged settings rebuild** — New `changes['settings']` branch in the top-level storage listener: reads `newThreshold` from `newValue`, assigns `currentThreshold = newThreshold`, then calls `storageGet(['flaggedAccounts']).then(...)` to clear and rebuild `thresholdAuthors` from pending accounts meeting the new threshold.

## Tasks Completed

| Task | Description | Commit |
|------|-------------|--------|
| 1 | Add thresholdAuthors map and currentThreshold, populate at init() | 1fea8a3 |
| 2 | Add observer threshold-hide branch with grey tombstone | c079012 |
| 3 | Add settings onChanged branch to rebuild thresholdAuthors live | dbc4f35 |

## Verification

- `npx tsc --noEmit` exits 0 after each task
- `npx vite build` completes without error — content script bundles at 21.33 kB

## Deviations from Plan

None — plan executed exactly as written.

## Known Stubs

None.

## Threat Flags

No new security surface introduced. All mitigations per threat register applied:
- T-18-01: `injectTombstone` uses `textContent` only (existing implementation)
- T-18-02: No `postNode.remove()` — hiding via `classList.add('llb-hidden')` only
- T-18-03: `dismissedSet.has(trackKey)` guard prevents dismissed account leakage

## Self-Check: PASSED

- `src/content/index.ts` contains `const thresholdAuthors = new Map<string, number>()`
- `src/content/index.ts` contains `let currentThreshold`
- `src/content/index.ts` contains `currentThreshold = autoHideThreshold` inside init()
- flaggedAccounts loop contains `entry.status === 'pending' && entry.peakScore >= autoHideThreshold` guarding `thresholdAuthors.set(`
- `dismissedSet.has(trackKey)` guard appears before `thresholdAuthors.has(trackKey)` in observer
- `changes['settings']` branch present in onChanged listener with `thresholdAuthors.clear()` and `storageGet` rebuild
- Commits 1fea8a3, c079012, dbc4f35 exist in git log
