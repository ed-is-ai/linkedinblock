---
phase: 21-dashboard-button-reposition
plan: "01"
subsystem: popup
tags: [popup, ux, button-relocation, settings-cleanup]
dependency_graph:
  requires: []
  provides: [POPUP-04, POPUP-05]
  affects: [src/popup/index.tsx]
tech_stack:
  added: []
  patterns: [inline-style-objects, stateless-popup]
key_files:
  created: []
  modified:
    - src/popup/index.tsx
decisions:
  - "Reused styles.dashboardLink verbatim for relocated button (D-06) — no new style key"
  - "Removed styles.divider key after confirming zero remaining references — prevents dangling style object"
  - "Removed <hr style={styles.divider} /> from Settings body as redundant after button removal (Claude's discretion per CONTEXT.md)"
metrics:
  duration: "~5 minutes"
  completed: "2026-06-06T19:17:36Z"
  tasks_completed: 1
  tasks_total: 1
  files_changed: 1
---

# Phase 21 Plan 01: Dashboard Button Reposition Summary

Moved the `📊 View Dashboard` button from the Settings disclosure to the popup header region, rendering it immediately after the title/badge row and before the feed-health line, so the dashboard is discoverable on popup open without any interaction.

## Tasks

| # | Task | Commit | Status |
|---|------|--------|--------|
| 1 | Relocate View Dashboard button to popup header region | effcb3a | Done |

## What Was Built

Single cohesive change to `src/popup/index.tsx`:

1. **Inserted** `<button onClick={openDashboard} style={styles.dashboardLink}>📊 View Dashboard</button>` immediately after the closing `</div>` of the `styles.header` block (line 143) and before the `{feedPct !== null && ...}` feed-health paragraph.

2. **Removed** the in-settings `<button onClick={openDashboard} style={styles.dashboardLink}>📊 View Dashboard</button>` from the Settings `<details>` body.

3. **Removed** the now-redundant `<hr style={styles.divider} />` that previously separated the button from the mode row in Settings.

4. **Removed** the now-orphaned `styles.divider` key from the `styles` record (zero remaining references confirmed by grep before deletion).

The `openDashboard()` handler is unchanged. `styles.dashboardLink` is retained and reused by the relocated button.

## Verification Results

| Check | Result |
|-------|--------|
| `npm run type-check` (tsc --noEmit) | PASS (exit 0) |
| `npm run build` (vite build) | PASS (all 3 steps complete) |
| `git diff --name-only` | `src/popup/index.tsx` only |
| Single openDashboard call site | PASS (defined:1, onClick:1) |
| styles.dashboardLink retained | PASS (line 357 in styles record) |
| styles.divider not dangling | PASS (0 references, key removed) |

## Success Criteria

| Criterion | Status |
|-----------|--------|
| POPUP-04: View Dashboard visible at popup open (header region) | PASS |
| Button opens dashboard/index.html in new tab (unchanged handler) | PASS |
| POPUP-05: Settings no longer contains View Dashboard button | PASS |
| Button moved not duplicated (one openDashboard call site) | PASS |
| SC#4: Only src/popup/index.tsx modified | PASS |
| styles.dashboardLink retained and reused (not orphaned) | PASS |
| styles.divider not left dangling | PASS |
| type-check and build pass | PASS |

## Deviations from Plan

None — plan executed exactly as written. The divider removal and styles.divider key cleanup were explicitly sanctioned as "Claude's discretion" in CONTEXT.md and specified in the task action instructions.

## Known Stubs

None — this is a pure relocation; no data sources or rendering paths were added.

## Threat Flags

None — button relocation reuses existing static-literal handler and `chrome.runtime.getURL` (extension-internal). No new network endpoints, auth paths, file access patterns, or schema changes.

## Self-Check: PASSED

- [x] `src/popup/index.tsx` exists and contains relocated button
- [x] Commit `effcb3a` exists in git log
- [x] `npm run type-check` passed
- [x] `npm run build` passed
- [x] Only `src/popup/index.tsx` in git diff
