---
status: partial
phase: 18-popup-interaction-fixes
source: [18-VERIFICATION.md]
started: 2026-06-05T15:00:00Z
updated: 2026-06-05T15:00:00Z
---

## Current Test

[awaiting human testing]

## Tests

### 1. Feed Hiding on Page Load (BUG-01 / SC 1)
expected: Post from a pending account with peakScore >= autoHideThreshold is hidden immediately on page load with a grey reveal tombstone (not red blocked tombstone), before any detector async call resolves
result: [pending]

### 2. MutationObserver Hiding on Infinite Scroll (BUG-01 / SC 2)
expected: Newly injected posts from a threshold-crossing pending account are caught by the MutationObserver and hidden with the grey tombstone as they enter the DOM
result: [pending]

### 3. Account Name Click Behaviour (POPUP-01 / SC 3)
expected: Clicking an account name link opens the LinkedIn profile in a new tab AND the row does NOT expand
result: [pending]

### 4. Block Button Storage-Only Behaviour (POPUP-02 / SC 4)
expected: Clicking Block leaves the popup on the same page (no new tab), stores status:'blocked', and moves the account from pending list into the Blocked section
result: [pending]

### 5. Blocked Row Visual State (POPUP-03 / SC 5)
expected: Expanding the Blocked section shows grey name text (#9ca3af), a "Blocked" chip, and no Block or Dismiss buttons on the row
result: [pending]

## Summary

total: 5
passed: 0
issues: 0
pending: 5
skipped: 0
blocked: 0

## Gaps
