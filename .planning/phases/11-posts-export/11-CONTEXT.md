---
phase: 11-posts-export
milestone: v1.2
requirements: [EXPORT-03]
status: planning
---

# Phase 11 Context — Posts CSV Export

## Goal

Let users download their stored hidden post data as a CSV for spreadsheet analysis. The existing "Data management" card already has Export JSON and Export CSV (accounts) buttons; this phase adds a third button for posts.

## Design Decisions (from STATE.md v1.2)

| Decision | Outcome |
|----------|---------|
| Posts CSV format | One row per stored post; columns `authorId, authorName, urn, score, text, hiddenAt`; RFC 4180 escaped |
| Posts CSV button location | "Data management" card on dashboard, alongside existing Export JSON / Export CSV |
| Filename | `linkedin-blocker-posts-YYYY-MM-DD.csv` |

## Scope

**In scope:**
- `buildPostsCsvExport(posts: StoredPost[]): string` pure function in `dataManagement.ts`
- Tests for the new function in `dataManagement.test.ts`
- "Export Posts CSV" button wired in `dashboard/index.tsx`

**Out of scope:**
- Posts export in the popup
- Any changes to the JSON export format
- Additional columns beyond the six specified

## Files Touched

| Plan | Files |
|------|-------|
| 11-01 | `src/dashboard/dataManagement.ts`, `src/dashboard/dataManagement.test.ts` |
| 11-02 | `src/dashboard/index.tsx` |

## RFC 4180 requirements

`csvEscape()` already exists and handles: commas, internal double-quotes (doubled), newlines, carriage returns. The post `text` field is the main risk (can contain all of these). `hiddenAt` should be rendered as ISO-8601 string (same pattern as `buildCsvExport` for account timestamps).

## Verification

EXPORT-03: Clicking "Export Posts CSV" downloads `linkedin-blocker-posts-YYYY-MM-DD.csv`. Opening in Excel/Google Sheets shows correct columns and no corruption even when post text contains commas or quotes.
