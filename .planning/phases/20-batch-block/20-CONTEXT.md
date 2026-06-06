# Phase 20: Batch Block - Context

**Gathered:** 2026-06-06
**Status:** Ready for planning

<domain>
## Phase Boundary

Add a single popup action — "Block all above threshold" — that marks every currently-pending account whose peak score meets or exceeds the configured threshold as `status: 'blocked'` in local storage, gated by an inline confirmation that shows the affected count before any write occurs.

Scope is the popup only. No content-script changes, no new settings, no LinkedIn navigation. Visual/interaction design is fully locked by `20-UI-SPEC.md`.

</domain>

<decisions>
## Implementation Decisions

The user reviewed the open product decisions and confirmed the UI-SPEC + requirements cover the phase. The following defaults are locked.

### Qualifying Set (BATCH-02)
- **D-01:** The batch action operates on **pending accounts only** — `accounts.filter(a => a.status === 'pending' && a.peakScore >= threshold)`. This reuses the existing `pending` array in `src/popup/index.tsx:112`, which already excludes blocked and dismissed accounts.
- **D-02:** **Dismissed accounts are NOT re-captured**, even if their peak score is still ≥ threshold. A dismissal is an explicit false-positive signal from the user and must be respected. (Confirmed default — no separate handling needed because `pending` already excludes `status === 'dismissed'`.)

### Threshold (BATCH-01)
- **D-03:** The batch action uses the **same single auto-hide threshold** already in settings (the `threshold` value in `index.tsx`, default 60). No separate, higher "block threshold" is introduced — that would be new scope.
- **D-04:** The qualifying count is **reactive** — recomputed on every render from the live `threshold` and `pending` values. If the threshold slider changes while the popup is open, the count (and bar visibility) updates automatically.

### Confirmation & Write (BATCH-03)
- **D-05:** Inline confirmation per UI-SPEC — no modal, no new page. Idle button → confirming strip ("Block N accounts above threshold?" + "Keep pending" / "Block all now") → write. "Keep pending" returns to idle with storage unchanged.
- **D-06:** The write is a **single `chrome.storage.local.set` call** that sets `status: 'blocked'` on all qualifying accounts in `flaggedAccounts` at once (mirrors the single-account `handleBlock` at `index.tsx:63`, batched). Cancelling writes nothing.
- **D-07:** "Block all now" is **disabled during the in-flight async write** (`disabled` + `cursor: 'not-allowed'`) to prevent double-submit.
- **D-08:** On write failure: log the error to console, return the bar to idle, re-render with the original count. No retry UI.

### Post-Block Feedback
- **D-09:** **Silent state change** — no toast or confirmation message. After the write, the BatchBlockBar hides automatically (qualifying count drops to 0 via the existing `onChanged` reactivity) and the affected rows transition to the Phase 18 blocked visual state (greyed name + "Blocked" chip). This is sufficient feedback.

### Claude's Discretion
- Exact internal structure of the batch-write loop (build the updated `flaggedAccounts` object, then one `set`).
- Whether the confirming-state component lives inline in `index.tsx` or as a small extracted `BatchBlockBar` component — planner's choice, but keep inline-style convention.

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Design Contract (locked — read first)
- `.planning/phases/20-batch-block/20-UI-SPEC.md` — **MANDATORY.** Locks the full visual + interaction contract: BatchBlockBar placement, idle/confirming/post-confirm states, copy ("Block all above threshold (N)", "Block N accounts above threshold?", "Block all now", "Keep pending"), colors, spacing, typography, accessibility, and DOM placement (sibling of `listContainer`, before the Blocked section).

### Requirements
- `.planning/REQUIREMENTS.md` — BATCH-01, BATCH-02, BATCH-03 acceptance criteria
- `.planning/ROADMAP.md` §Phase 20 — 4 success criteria

### Popup Source
- `src/popup/index.tsx` — `pending` filter (line 112), single-account `handleBlock` (line 63) to batch, `threshold` state (line 14), `chrome.storage.onChanged` reactivity, DOM insertion point between `listContainer` and Blocked section
- `src/popup/AccountRow.tsx` — `isBlocked` prop (Phase 18) for post-block row state; existing button styles (`blockBtn`, `clearBtn`, `saveBtn`) the UI-SPEC reuses

### Storage Schema
- `src/shared/types.ts` — `FlaggedAccount.status: 'pending' | 'blocked' | 'dismissed'` (line 111); no schema change needed

### Prior Phase Decisions
- `.planning/phases/18-popup-interaction-fixes/18-CONTEXT.md` — D-05 (Block = local write, no navigation), D-07/D-08 (blocked section + `isBlocked` variant) that this phase builds on

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- `handleBlock` (`src/popup/index.tsx:63`) — single-account block logic to batch into one loop + one `set`
- `pending` array (`src/popup/index.tsx:112`) — already filters `status === 'pending'` and sorts by peakScore; qualifying set is `pending.filter(a => a.peakScore >= threshold)`
- `threshold` state (`src/popup/index.tsx:14`) — drives the qualifying count and bar visibility
- `AccountRow` `isBlocked` prop — Phase 18 blocked visual state; no new styling needed post-confirm
- Existing inline button styles (`saveBtn`, `clearBtn`, `blockBtn`) — UI-SPEC reuses verbatim for the bar/confirm buttons

### Established Patterns
- Inline style objects only (no className strings / CSS modules)
- `chrome.storage.onChanged` reactivity already refreshes the popup when `flaggedAccounts` changes — drives auto-hide of the bar after batch write
- Single-key blocked-write convention (`status: 'blocked' as const`)

### Integration Points
- BatchBlockBar inserted as a sibling of `listContainer`, between the pending list and the Blocked section (per UI-SPEC DOM placement)
- Batch write reuses the same `flaggedAccounts` key and `status` field — content script's existing `onChanged` branch picks up the newly-blocked accounts with no content-script change

</code_context>

<specifics>
## Specific Ideas

- Copy is fixed by UI-SPEC: always "above threshold" qualifier, "accounts" always plural (even N=1), count in CTA must equal count in confirmation (same computed value).
- No `element.remove()`, no programmatic LinkedIn clicks (project-wide constraints) — not relevant here since this is local-storage only.

</specifics>

<deferred>
## Deferred Ideas

- **Separate, higher "block threshold"** for the batch action (distinct from the auto-hide threshold) — considered and rejected for this phase as new scope. Could be a future settings enhancement if batch-blocking at 60 proves too aggressive.
- **Undo / unblock batch** — out of scope; unblock-from-popup was already deferred (Phase 18 deferred list).
- **Post-block confirmation toast** — rejected in favor of silent state change; revisit only if users miss the feedback.

</deferred>

---

*Phase: 20-batch-block*
*Context gathered: 2026-06-06*
