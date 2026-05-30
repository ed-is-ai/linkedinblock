---
phase: 03-storage-queue
plan: 02
status: complete
completed: 2026-05-29
---

# Plan 03-02 Summary — Profile Signal Module

## What Was Done

### Task 1: Selector registry additions (src/content/selectors.ts)

Two new selector constants appended in a "Phase 3 additions" comment-delimited section:

| Constant | Assumed Value |
|---|---|
| `AUTHOR_HEADLINE` | `'a[href*="/in/"] ~ span'` |
| `CONNECTION_DEGREE` | `'[aria-label*="degree"], span[data-anonymize="degree"]'` |

Both tagged `[ASSUMED] -- requires live LinkedIn DevTools verification before code depending on this selector is shipped` in their JSDoc, following the Phase 2 discipline.

`SELECTORS_VERSION` bumped from `'1.2.0'` to `'1.3.0'`.

No CSS class name selectors introduced.

### Task 2: Profile signal module (src/content/detector/signals/profile.ts)

New file created. Named exports:

| Export | Type | Description |
|---|---|---|
| `HEADLINE_BUZZWORDS` | `readonly string[]` | 21 lowercase buzzword/formula strings |
| `HEADLINE_PIPE_PATTERN` | `RegExp` | Matches 2+ pipe-separated role segments |
| `checkHeadlineFormula` | `(text: string) => number` | Returns 0–10; +5 for pipe pattern, +2/buzzword capped at +5 |
| `checkConnectionDegree` | `(text: string) => number` | Returns 5 for '3rd', 0 otherwise |
| `extractProfileSignals` | `(postNode: Element) => Record<string, number>` | DOM helper querying both selectors |

Signal keys: `'headline-formula'` (0–10 pts), `'degree-3'` (0 or 5 pts).

Imports `AUTHOR_HEADLINE` and `CONNECTION_DEGREE` from `../../selectors` — no inline selector strings.

Uses `innerText` for DOM text extraction throughout.

No default export; named-only module style matches other signal files.

## Deviation

`src/content/index.ts` was not in `files_modified` but contained a pre-existing TypeScript error introduced by Plan 03-01 work: `FlaggedAccountStub` was still referenced after `types.ts` renamed it to `FlaggedAccount`. The type annotation and two missing required fields (`postCount: 1`, `peakScore: compositeScore`) were added to the new-entry stub to fix compilation. This was a one-location fix required for `npx tsc --noEmit` to exit 0 as mandated by the plan's acceptance criteria.

## TypeScript Compilation

`npx tsc --noEmit` exits 0. No errors or warnings from tsc.

## Outstanding

Both new selectors are `[ASSUMED]`. **Live LinkedIn DevTools verification is required before Phase 3 ships to users.** Specifically:

- `AUTHOR_HEADLINE` (`'a[href*="/in/"] ~ span'`) — may be too broad; needs scoping after inspection.
- `CONNECTION_DEGREE` (`'[aria-label*="degree"], span[data-anonymize="degree"]'`) — exact attribute name/structure needs confirmation.
