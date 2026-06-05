# Phase 18: Popup Interaction Fixes - Context

**Gathered:** 2026-06-05
**Status:** Ready for planning

<domain>
## Phase Boundary

Fix one content-script bug (threshold-based hiding) and wire up three popup interactions: account name links to LinkedIn profile, Block writes to local storage without navigation, and already-blocked accounts appear in a collapsible section with a distinct visual state.

</domain>

<decisions>
## Implementation Decisions

### BUG-01: Threshold Hiding

- **D-01:** At `init()`, load all `flaggedAccounts` with `peakScore >= autoHideThreshold` into a new `thresholdAuthors` map (mirroring the existing `blockedAuthors` pattern). The observer hides their posts immediately without re-running the detector — stored `peakScore` is authoritative.
- **D-02:** Use the existing `injectTombstone` (grey, score shown) for threshold-hidden posts — same as scored posts. Do NOT use the red blocked tombstone; the user has not manually blocked these accounts.
- **D-03:** The `thresholdAuthors` map updates live via `chrome.storage.onChanged`. When the settings threshold changes (or new accounts cross the threshold), the content script picks it up without a page reload — consistent with how `blockedAuthors` updates live.

### POPUP-01: Account Name Link

- **D-04:** The account name `<a>` in `AccountRow.tsx` already navigates correctly (`target="_blank" rel="noreferrer"`). If clicking the name also fires `onToggle` (row expansion), add `e.stopPropagation()` on the `<a>` click to prevent toggle from firing when the user intends to open the profile.

### POPUP-02: Block Button Semantics

- **D-05:** `handleBlock` writes `status: 'blocked'` to `flaggedAccounts` in `chrome.storage.local` and does nothing else. Remove the `window.open(url)` call entirely. No "Report on LinkedIn" link.
- **D-06:** Blocked accounts stay in `flaggedAccounts` (status: 'blocked') — no schema change. The existing `onChanged` listener in the content script already handles this key.

### POPUP-03: Blocked Accounts Display

- **D-07:** Blocked accounts appear in a **separate collapsible section** below the pending list, headed by a toggle row: `"Blocked (N) ▾"`. The section is collapsed by default (or expanded — planner's discretion).
- **D-08:** A blocked `AccountRow` shows: name text in grey (#9ca3af), a small `"Blocked"` chip/badge, no Block button, no Dismiss button. Minimal change to `AccountRow` — pass an `isBlocked` prop to switch to the blocked visual variant.

### Claude's Discretion

- Default expand/collapse state of the Blocked section (collapsed is recommended — keeps popup compact).
- Exact grey shade for name text and chip styling (follow existing grey palette: #9ca3af or #6b7280).

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Requirements
- `.planning/REQUIREMENTS.md` — BUG-01, POPUP-01, POPUP-02, POPUP-03 full acceptance criteria
- `.planning/ROADMAP.md` §Phase 18 — success criteria (5 items)

### Popup Source
- `src/popup/AccountRow.tsx` — component to extend with `isBlocked` prop; inline styles pattern
- `src/popup/index.tsx` — `handleBlock`, `handleDismiss`, `pending` filter, `App` component

### Content Script
- `src/content/index.ts` — `init()`, `blockedAuthors` map pattern to mirror for `thresholdAuthors`, `chrome.storage.onChanged` listener

### Storage Schema
- `src/shared/types.ts` — `FlaggedAccount` type (check `status` field values)

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- `blockedAuthors` map in `src/content/index.ts:53` — exact pattern to replicate for `thresholdAuthors`; loaded at init + updated via onChanged
- `injectTombstone` in `src/content/detector/tombstone.ts` — use for threshold-hidden posts (already takes `authorName` and `score`)
- `hiddenPostNodes` map — already tracks DOM nodes per author; threshold-hidden nodes slot into this same map
- `AccountRow.tsx` `rowStyles` — existing grey palette (#9ca3af, #6b7280, #f3f4f6) for blocked variant

### Established Patterns
- Content script hiding: `postNode.classList.add('llb-hidden')` + `hiddenPostNodes.set(trackKey, [...])` — must follow this for threshold-hidden posts so future dismissals can unhide them
- Popup state refresh: `chrome.storage.onChanged` listener already in `index.tsx` watches `flaggedAccounts` — blocked section will update live when Block is clicked
- Inline styles only (no CSS modules or className strings)

### Integration Points
- `thresholdAuthors` must be populated before `startObserving()` is called in `init()`
- `chrome.storage.onChanged` in content script needs a new branch for `settings` changes (threshold slider) to rebuild `thresholdAuthors`
- `AccountRow` receives `isBlocked?: boolean` prop; `index.tsx` passes it for the blocked section rows

</code_context>

<specifics>
## Specific Ideas

- POPUP-03 section header: `"Blocked (N) ▾"` toggle row (with count inline)
- BUG-01: `thresholdAuthors` is the preferred name for the new map (mirrors `blockedAuthors`)

</specifics>

<deferred>
## Deferred Ideas

- "Report on LinkedIn" link for blocked accounts — deferred; POPUP-02 is local-only by decision
- Unblock from popup — deferred to Phase 19 (Blocked Accounts Page, BLOCK-02)

</deferred>

---

*Phase: 18-popup-interaction-fixes*
*Context gathered: 2026-06-05*
