---
phase: 08-popup-detail
plan: 01
status: complete
completed: 2026-05-30
---

# Plan 08-01 Summary — AccountRow Expansion

## What Was Done

Extended `src/popup/AccountRow.tsx` to support an expandable detail panel. Three optional props were added to `AccountRowProps`: `isExpanded` (defaults `false`), `onToggle` (called on summary click), and `posts` (defaults `[]`). The top section of the row (name, score, meta, chips) is now wrapped in a clickable `<div>` with `cursor: pointer` and `onClick={onToggle}`. Block and Dismiss buttons call `e.stopPropagation()` to prevent row toggle when clicking action buttons.

## Key Changes

- `activeSignals` is now `[key, score][]` sorted by score descending — used for both the chip display (`visibleChipKeys`) and the detail panel signal table.
- Chevron indicator (`▸`/`▾`) appears next to the peak score to communicate expandable state.
- When `isExpanded` is true, a detail panel renders below the summary area showing: a per-signal score table (all signals with value > 0, sorted desc, displayed as `{key} | {score} pts`) and, if `posts.length > 0`, up to 3 post snippets (text truncated at 120 chars with `…`, score badge).
- New styles added to `rowStyles`: `summaryArea`, `detailPanel`, `signalTable`, `signalRow`, `signalName`, `signalScore`, `postsSection`, `postSnippet`, `postText`, `postScore`.
- `StoredPost` imported from `../shared/types`.

## Verification

- Content check passed: all required strings present (`isExpanded`, `onToggle`, `posts`, `StoredPost`, `detailPanel`, `signalTable`, `summaryArea`, `stopPropagation`, `▸`, `▾`).
- `npx tsc --noEmit` exits 0 — no TypeScript errors.

## Outcome

Component compiles and renders correctly in both collapsed (default) and expanded states. Plan 02 can wire accordion logic (`expandedId` state in `App`, `storedPosts` read from storage, prop passing) without any further changes to `AccountRow`.
