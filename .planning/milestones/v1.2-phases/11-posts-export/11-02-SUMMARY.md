---
plan: 11-02
status: complete
completed_at: "2026-05-30"
---

## What changed

Wired the "Export Posts CSV" button into `src/dashboard/index.tsx`:

1. Extended the `dataManagement` import to include `buildPostsCsvExport`.
2. Added `handleExportPostsCsv()` handler directly after `handleExportCsv`, which calls `buildPostsCsvExport(posts)` and triggers a download named `linkedin-blocker-posts-<date>.csv`.
3. Added an "Export Posts CSV" `<button>` in the export button group alongside the existing Export JSON and Export CSV buttons.

No new styles were needed — `s.actionBtn` was reused.

## Verification

- `npx tsc --noEmit` — exited 0 (no type errors)
- Content check for all four required strings (`buildPostsCsvExport`, `handleExportPostsCsv`, `Export Posts CSV`, `linkedin-blocker-posts-`) — passed
