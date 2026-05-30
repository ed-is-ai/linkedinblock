---
plan: 11-01
status: complete
completed_at: "2026-05-30"
---

## What was built

Added `buildPostsCsvExport(posts: StoredPost[]): string` to `src/dashboard/dataManagement.ts`. The function produces RFC 4180-compliant CSV with headers `authorId,authorName,urn,score,text,hiddenAt`, using the existing `csvEscape` helper for all fields and converting `hiddenAt` millisecond timestamps to ISO 8601 strings.

Added a `buildPostsCsvExport` describe block (6 tests) to `src/dashboard/dataManagement.test.ts`, covering: empty input, single post column values, comma/double-quote/newline escaping, and multi-post row counts. The import at the top of the test file was updated to include `buildPostsCsvExport`.

## Verification results

- `vitest run src/dashboard/dataManagement.test.ts` — 37 tests passed (31 existing + 6 new)
- `tsc --noEmit` — exited 0, no type errors
