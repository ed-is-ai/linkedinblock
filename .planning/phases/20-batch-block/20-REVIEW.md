---
phase: 20-batch-block
reviewed: 2026-06-06T00:00:00Z
depth: standard
files_reviewed: 2
files_reviewed_list:
  - src/popup/BatchBlockBar.tsx
  - src/popup/index.tsx
findings:
  critical: 0
  warning: 4
  info: 3
  total: 7
status: issues_found
---

# Phase 20: Code Review Report

**Reviewed:** 2026-06-06T00:00:00Z
**Depth:** standard
**Files Reviewed:** 2
**Status:** issues_found

## Summary

Reviewed the new `BatchBlockBar` Preact component and the `handleBatchBlock` /
`batchQualifying` additions to `src/popup/index.tsx`. The phase is popup-only:
it derives a set of pending accounts whose `peakScore >= threshold` and, on
confirmation, performs a single batched `chrome.storage.local.set` that flips
each qualifying account to `status: 'blocked'`.

No security vulnerabilities and no data-loss BLOCKERs were found — the write is
read-modify-write on a fresh storage snapshot and spreads existing records, so
no fields are clobbered. However, there are correctness/robustness issues
centred on a stale-closure mismatch between the confirmed count and what is
actually written, a count/label vs. comparison-operator mismatch, and a missing
guard against an empty qualifying set. These are WARNING-tier: they cause the UI
to over- or under-report what it did, not corrupt data.

## Warnings

### WR-01: `handleBatchBlock` iterates a stale closure — confirmed count can differ from accounts actually blocked

**File:** `src/popup/index.tsx:69-79` (uses `batchQualifying` declared at `:129`)
**Issue:** `handleBatchBlock` re-reads `flaggedAccounts` fresh from storage (good),
but it iterates over `batchQualifying`, which is the array captured in the
closure at the render that mounted the button. The `onChanged` listener
(`:45-55`) live-updates `accounts` whenever `flaggedAccounts` changes, and the
content script writes to `flaggedAccounts` continuously while the user scrolls
LinkedIn. Between the user clicking "Block all above threshold (N)" and
confirming "Block all now", the real qualifying set can grow or shrink. The
popup will then block the *old* set while the confirm strip displayed a count
that may already be stale — and any newly-qualifying accounts are silently
skipped. The threshold can also change via the settings slider in the same
window, further desyncing `count` from what is written.
**Fix:** Recompute the qualifying set from the fresh storage snapshot inside
`handleBatchBlock` rather than trusting the closure, so the write is consistent
with current data:
```ts
async function handleBatchBlock() {
  const result = await chrome.storage.local.get(['flaggedAccounts']);
  const flaggedAccounts = (result.flaggedAccounts ?? {}) as Record<string, FlaggedAccount>;
  for (const acc of Object.values(flaggedAccounts)) {
    if (acc.status === 'pending' && acc.peakScore >= threshold) {
      flaggedAccounts[acc.authorId] = { ...acc, status: 'blocked' as const };
    }
  }
  await chrome.storage.local.set({ flaggedAccounts });
}
```
Note `threshold` is itself a closure capture; if slider changes mid-confirm are
a concern, read `settings.autoHideThreshold` from the same snapshot.

### WR-02: Label says "above threshold" but qualification uses `>=` (at-or-above)

**File:** `src/popup/index.tsx:129` and `src/popup/BatchBlockBar.tsx:97,100,110`
**Issue:** `batchQualifying = pending.filter(a => a.peakScore >= threshold)` is
inclusive of the boundary, but every piece of user-facing copy says "above
threshold" / "Block all accounts above threshold". An account whose `peakScore`
exactly equals the threshold is counted and blocked, contradicting the stated
"above". This is a behavioural/spec ambiguity that affects which accounts get
blocked at the boundary value (e.g. threshold 60, peakScore exactly 60).
**Fix:** Decide the contract and make code and copy agree. If at-or-above is
intended (consistent with the detection engine, where `score >= threshold`
hides), change the copy to "at or above threshold". Otherwise use `> threshold`.

### WR-03: No guard for `batchQualifying.length === 0` inside `handleBatchBlock`

**File:** `src/popup/index.tsx:69-79`
**Issue:** The bar is only rendered when `batchQualifying.length > 0`
(`:172`), so the empty case is gated at render time. But `handleBatchBlock` is
passed by reference and, per WR-01, the qualifying set is a stale closure. If
every captured account has been dismissed/blocked by the time confirm runs,
the loop matches nothing and the function still issues a full
`chrome.storage.local.set({ flaggedAccounts })` — a redundant write that
re-broadcasts the entire `flaggedAccounts` object to all `onChanged`
listeners (content script + popup) for no change. With the WR-01 fix this
becomes a no-op write; either way, short-circuit when nothing changed.
**Fix:** Track whether any record was modified and skip the write otherwise:
```ts
let changed = false;
for (...) { if (existing) { ...; changed = true; } }
if (changed) await chrome.storage.local.set({ flaggedAccounts });
```

### WR-04: Batch-blocked accounts are not added to `dismissedAccounts`, unlike the single Block path is symmetric but the content-script re-flag risk is unaddressed

**File:** `src/popup/index.tsx:69-79` vs `handleBlock` `:58-67`
**Issue:** `handleBatchBlock` mirrors single-account `handleBlock` (flip status
to `blocked`), which is internally consistent — neither touches
`dismissedAccounts`, by design. The concern is robustness: an account flipped
to `blocked` remains in `flaggedAccounts`, and if the content script's scoring
pipeline later re-persists a post from that author, verify it respects the
`blocked` status and does not reset it to `pending`. This is a cross-module
contract that this popup-only phase relies on but does not enforce. Flagging so
the fixer confirms the content-script writer preserves a non-`pending` status
on re-persist; if it does not, batch-blocked accounts silently reappear in the
pending list.
**Fix:** Confirm (in the content-script persist path) that existing
`status: 'blocked' | 'dismissed'` is preserved when updating an account's EMA /
peakScore. If not already handled, that writer must early-return or retain the
non-pending status. No change required in these two files if the invariant
already holds.

## Info

### IN-01: `setConfirming(false)` on error but not on success leaves bar in inconsistent reset path

**File:** `src/popup/BatchBlockBar.tsx:81-91`
**Issue:** On error, `handleConfirm` resets `confirming` to false (returns to
idle button). On success, it does not reset `confirming` — it relies on the
parent unmounting/re-rendering the bar because `batchQualifying.length`
drops to 0 after the write propagates via `onChanged`. This works only if the
write actually empties the qualifying set; if some qualifying accounts remain
(e.g. partial set per WR-01, or threshold unchanged with new pending accounts),
the component stays stuck in the "confirm" strip. Resetting `confirming` in the
`finally` block would make the component self-consistent regardless of parent
re-render timing.
**Fix:** Add `setConfirming(false)` to the `finally` block alongside
`setWriting(false)`.

### IN-02: `console.error` debug artifact in catch

**File:** `src/popup/BatchBlockBar.tsx:86`
**Issue:** `console.error('[LLB popup] batch block failed:', err)` is the only
user-visible signal that a batch block failed — there is no UI surface for the
error. Consistent with the existing popup logging style (`index.tsx:112`), so
acceptable, but the user gets no feedback when a write throws (e.g. storage
quota). Consider a minimal inline error state.
**Fix:** Optional — surface a short inline "Couldn't block — try again" message
on failure rather than only logging to console.

### IN-03: Duplicated button style objects

**File:** `src/popup/BatchBlockBar.tsx:52-74`
**Issue:** `blockAllBtn` and `blockAllBtnDisabled` duplicate every property
except `cursor`/`opacity`. Minor maintainability smell; a single base object
spread with the disabled overrides would avoid drift.
**Fix:** `blockAllBtnDisabled: { ...barStyles.blockAllBtn, cursor: 'not-allowed', opacity: 0.7 }`
(define base separately to avoid self-reference at object-literal init).

---

_Reviewed: 2026-06-06T00:00:00Z_
_Reviewer: Claude (gsd-code-reviewer)_
_Depth: standard_
