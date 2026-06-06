# Phase 20: Batch Block - Discussion Log

> **Audit trail only.** Do not use as input to planning, research, or execution agents.
> Decisions are captured in CONTEXT.md — this log preserves the alternatives considered.

**Date:** 2026-06-06
**Phase:** 20-batch-block
**Areas discussed:** Gray-area triage (phase was pre-specified by 20-UI-SPEC.md)

---

## Gray-Area Triage

The phase arrived with a complete UI design contract (`20-UI-SPEC.md`) locking layout, copy, placement, and the inline confirm flow, plus clear requirements (BATCH-01/02/03). Only the genuinely-open product decisions were surfaced.

| Option | Description | Selected |
|--------|-------------|----------|
| Dismissed accounts | Whether to re-capture previously-dismissed high scorers | |
| Which threshold gates it | Same auto-hide threshold vs a separate higher block bar | |
| Post-block feedback | Silent state change vs a confirmation message | |
| Nothing — spec covers it | Skip discussion, plan with sensible defaults | ✓ |

**User's choice:** "Nothing — spec covers it" — confident the UI-SPEC + requirements are sufficient.
**Notes:** Defaults locked accordingly: (1) respect dismissals (operate on `pending` only), (2) reuse the single auto-hide threshold, (3) silent state change after batch write (bar auto-hides, rows grey out). See CONTEXT.md D-01 through D-09.

---

## Claude's Discretion

- Internal structure of the batch-write loop (build updated `flaggedAccounts`, then one `chrome.storage.local.set`).
- Whether the confirming-state UI is inline in `index.tsx` or an extracted `BatchBlockBar` component (keep inline-style convention either way).

## Deferred Ideas

- Separate, higher "block threshold" distinct from the auto-hide threshold — rejected as new scope; possible future settings enhancement.
- Undo / unblock batch — out of scope (unblock-from-popup already deferred in Phase 18).
- Post-block confirmation toast — rejected in favor of silent state change.
