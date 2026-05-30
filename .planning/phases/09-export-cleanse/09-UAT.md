---
status: complete
phase: 09-export-cleanse
source:
  - 09-01-SUMMARY.md
  - 09-02-SUMMARY.md
started: "2026-05-30T16:20:00.000Z"
updated: "2026-05-30T16:20:00.000Z"
---

## Current Test

[testing complete]

## Tests

### 1. Data management card is visible on the dashboard
expected: Open the dashboard. Below the "Signal categories" card you should see a new "Data management" card with an "Export data" section (two side-by-side buttons: "Export JSON" and "Export CSV"), a separator, and a "Cleanse data before:" section with a date picker and a disabled "Confirm cleanse" button.
result: pass

### 2. Export JSON downloads a correctly named and structured file
expected: Click "Export JSON". A file named linkedin-blocker-YYYY-MM-DD.json (today's UTC date) downloads. Open it — it contains a top-level "exportedAt" ISO string and a "flaggedAccounts" array. Each account has a "posts" sub-array with ISO "hiddenAt" timestamps. There is no "dailyStats" or "dismissedAccounts" key at the top level.
result: pass

### 3. Export CSV downloads a correctly named and structured file
expected: Click "Export CSV". A file named linkedin-blocker-YYYY-MM-DD.csv (today's UTC date) downloads. Open it in a text editor or spreadsheet — the first row is the exact header: authorId,authorName,authorProfileUrl,peakScore,compositeScore,postCount,status,firstSeenAt,lastSeenAt,signals. One row per flagged account. The signals column contains a quoted JSON string. No post text anywhere in the file.
result: pass

### 4. Cleanse date picker shows a live count preview
expected: Click the date picker in the "Cleanse data before:" section and choose a date in the past. A line appears below the input reading "Will remove N account(s) and M post(s)" — where N and M reflect the accounts whose lastSeenAt / posts whose hiddenAt are before that date. Changing the date updates the count live without a page reload.
result: pass

### 5. Confirm cleanse button is disabled until a date is selected
expected: With no date chosen the "Confirm cleanse" button is visually greyed-out and clicking it does nothing (no confirm dialog appears). After selecting a date the button becomes active (red background).
result: pass

### 6. Confirm cleanse deletes matching records and clears dismissed entries
expected: With a date selected and a non-zero preview count, click "Confirm cleanse". A browser confirm dialog appears with the message "Delete N account(s), M post(s), and all dismissed entries? This cannot be undone." Click OK. The matching accounts disappear from the stats cards and signal bars without a page reload. The date picker resets to empty and the preview disappears. Reopen the popup — dismissed entries are cleared; accounts flagged after the chosen date remain.
result: pass

### 7. Export buttons show a helpful message when there are no flagged accounts
expected: If no accounts have been flagged yet (fresh install or after a full cleanse), the Data management card shows "No flagged accounts yet — browse LinkedIn to collect data." instead of the export buttons.
result: pass

## Summary

total: 7
passed: 7
issues: 0
pending: 0
skipped: 0

## Gaps

[none yet]
