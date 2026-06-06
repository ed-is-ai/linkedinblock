---
phase: 20-batch-block
plan: "01"
subsystem: popup
tags: [batch-block, preact, chrome-storage, ui-component]
dependency_graph:
  requires: []
  provides: [BatchBlockBar component, handleBatchBlock write, batchQualifying derivation]
  affects: [src/popup/index.tsx, src/popup/BatchBlockBar.tsx]
tech_stack:
  added: []
  patterns: [inline-style Preact component, read-modify-write chrome.storage.local, derived constant from existing state]
key_files:
  created:
    - src/popup/BatchBlockBar.tsx
  modified:
    - src/popup/index.tsx
decisions:
  - BatchBlockBar owns confirming/writing local state; parent owns the storage write — matches D-08 error-handling boundary
  - handleBatchBlock not wrapped in try/catch; BatchBlockBar confirm handler owns error handling per plan spec
  - batchQualifying derives from pending (not accounts) — dismissed accounts excluded by definition
metrics:
  duration: "3m"
  completed_date: "2026-06-06T17:58:11Z"
  tasks_completed: 2
  tasks_total: 2
  files_created: 1
  files_modified: 1
---

# Phase 20 Plan 01: Batch Block UI Summary

## One-liner

Preact BatchBlockBar component with idle CTA, inline confirming strip, in-flight disable, and single batched `chrome.storage.local.set` write — wired into popup between the pending list and Blocked section.

## Tasks Completed

| # | Task | Commit | Files |
|---|------|--------|-------|
| 1 | Create BatchBlockBar component | 3981eaf | src/popup/BatchBlockBar.tsx (created, 130 lines) |
| 2 | Wire batchQualifying, handleBatchBlock, render BatchBlockBar | 211ba6d | src/popup/index.tsx (+22 lines) |

## What Was Built

**BatchBlockBar (src/popup/BatchBlockBar.tsx)**

A self-contained Preact functional component with two local boolean states (`confirming`, `writing`). Idle state renders a full-width outline button labelled `Block all above threshold (N)`. Clicking it swaps to the inline confirming strip (no storage write). The strip shows `Block N accounts above threshold?` with count emphasized in `#0a66c2`, and two buttons: `Keep pending` (returns to idle) and `Block all now` (calls `onBatchBlock()` with in-flight disable + `cursor: not-allowed`). On error, `console.error('[LLB popup] batch block failed:', err)` then returns to idle. No toast, no modal — matches D-08/D-09.

**index.tsx changes (src/popup/index.tsx)**

1. Import `BatchBlockBar` after `AccountRow`.
2. `const batchQualifying = pending.filter(a => a.peakScore >= threshold)` — pure derived constant, reactive to both `accounts` and `threshold` state on every render (D-04).
3. `async function handleBatchBlock()` — one `get(['flaggedAccounts'])`, loop over `batchQualifying` setting `status: 'blocked' as const`, one `set({ flaggedAccounts })` — single batched write (D-06). No try/catch here; BatchBlockBar owns error handling.
4. JSX insertion: `{batchQualifying.length > 0 && <BatchBlockBar count={batchQualifying.length} onBatchBlock={handleBatchBlock} />}` between `</div>` (listContainer close) and `{blocked.length > 0 && ...}` (Blocked section).

## Verification

- `npx tsc --noEmit` — passes (no type errors)
- `npm run build` — exits 0; popup bundle 11.92 kB

## Deviations from Plan

None — plan executed exactly as written.

## Requirements Addressed

- BATCH-01: Popup shows "Block all above threshold (N)" whenever `batchQualifying.length > 0`
- BATCH-02: Confirming writes all qualifying pending accounts to `status: 'blocked'` in one `chrome.storage.local.set`; "Keep pending" writes nothing
- BATCH-03: Activating the CTA shows inline confirmation stating the count before any write
- D-01: Qualifying set is `pending.filter(...)` — blocked/dismissed excluded by derivation
- D-02: Dismissed accounts excluded because `pending` already filters `status === 'pending'`
- D-03: Single existing `threshold` state reused; no new threshold introduced
- D-04: `batchQualifying` recomputed every render — slider changes update bar visibility/count reactively
- D-06: Single batched get + loop + set (not per-account set calls)
- D-07: `Block all now` is `disabled={writing}` with `cursor: 'not-allowed'` during in-flight write
- D-08: Error returns to idle with `console.error`; no retry UI
- D-09: Auto-hide via existing `onChanged` listener recomputing `batchQualifying` to empty — no toast

## Threat Mitigations Applied

- T-20-01 (accidental tamper): Inline confirmation gate requiring explicit second click before any write
- T-20-02 (double-submit): `disabled` + `cursor: not-allowed` on confirm button during write
- T-20-03 (data loss): Read-modify-write preserves all non-qualifying entries; only `status` changed via spread

## Known Stubs

None.

## Threat Flags

None — no new network endpoints, auth paths, file access patterns, or schema changes introduced.

## Self-Check: PASSED

- [x] `src/popup/BatchBlockBar.tsx` exists (130 lines, > 40)
- [x] `src/popup/index.tsx` contains `import BatchBlockBar`, `batchQualifying`, `handleBatchBlock`, `BatchBlockBar` render
- [x] Commit 3981eaf exists (Task 1)
- [x] Commit 211ba6d exists (Task 2)
- [x] `npx tsc --noEmit` passes
- [x] `npm run build` exits 0
