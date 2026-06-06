---
status: partial
phase: 20-batch-block
source: [20-VERIFICATION.md]
started: 2026-06-06T00:00:00Z
updated: 2026-06-06T00:00:00Z
---

## Current Test

[awaiting human testing]

## Tests

### 1. Bar appears with correct count
expected: With at least one pending account whose peakScore >= threshold, opening the popup shows a "Block all above threshold (N)" button between the pending list and the Blocked section, where N matches the count of pending accounts at or above the threshold.
result: [pending]

### 2. Confirmation strip renders correctly
expected: Clicking the bar button shows "Block N accounts above threshold?" with N emphasised in #0a66c2 blue, plus "Keep pending" and "Block all now" buttons.
result: [pending]

### 3. "Keep pending" leaves storage unchanged
expected: Clicking "Keep pending" from the confirming strip collapses back to the idle CTA; chrome.storage.local is unchanged.
result: [pending]

### 4. "Block all now" blocks all qualifying accounts
expected: Clicking "Block all now" with N qualifying accounts moves all N from the pending list to the Blocked section; the BatchBlockBar disappears; no toast or modal appears; affected rows show the greyed name + "Blocked" chip from Phase 18.
result: [pending]

### 5. Threshold slider reactivity
expected: Moving the threshold slider updates the (N) count in the idle CTA on each tick; the bar hides entirely when N drops to 0.
result: [pending]

### 6. Dismissed accounts excluded
expected: With dismissed accounts whose peakScore >= threshold present, triggering batch block does NOT include them in the write; their storage status remains 'dismissed'.
result: [pending]

## Summary

total: 6
passed: 0
issues: 0
pending: 6
skipped: 0
blocked: 0

## Gaps
