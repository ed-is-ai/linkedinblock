---
status: partial
phase: 21-dashboard-button-reposition
source: [21-VERIFICATION.md]
started: 2026-06-06T20:25:00Z
updated: 2026-06-06T20:25:00Z
---

## Current Test

[awaiting human testing]

## Tests

### 1. Button visible at popup open
expected: Opening the extension popup shows the "📊 View Dashboard" button in the header region — directly under the title/badge row and above the feed-health line and the pending-account list — with no interaction required (Settings does not need to be opened).
result: [pending]

### 2. Button opens dashboard in a new tab
expected: Clicking the relocated header button opens dashboard/index.html in a new browser tab (via chrome.runtime.getURL + window.open, noreferrer), identical to the prior in-settings behavior.
result: [pending]

### 3. Settings disclosure is clean
expected: Expanding the ⚙ Settings disclosure shows no "View Dashboard" button — only the threshold slider, mode/API-key section, Save/Clear controls, and hint remain.
result: [pending]

## Summary

total: 3
passed: 0
issues: 0
pending: 3
skipped: 0
blocked: 0

## Gaps
