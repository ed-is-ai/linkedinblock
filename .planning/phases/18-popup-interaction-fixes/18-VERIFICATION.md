---
phase: 18-popup-interaction-fixes
verified: 2026-06-05T15:00:00Z
status: human_needed
score: 5/5 must-haves verified
overrides_applied: 0
human_verification:
  - test: "Load a LinkedIn feed with a known pending account whose stored peakScore >= autoHideThreshold. Verify that the post from that account is hidden (llb-hidden class present, grey tombstone shown) immediately on page load without any interaction."
    expected: "Post is hidden with a grey reveal tombstone (not the red blocked tombstone) before any detector call is made."
    why_human: "Requires a live LinkedIn session, a pre-seeded chrome.storage.local, and a known flagged account to observe the hiding behaviour."
  - test: "Scroll LinkedIn feed to inject new posts from the same threshold-crossing pending account. Verify new posts are also hidden by the MutationObserver."
    expected: "Newly injected posts from the threshold account are hidden with the grey tombstone as they enter the DOM."
    why_human: "Requires live LinkedIn infinite-scroll triggering MutationObserver callbacks. Cannot be verified statically."
  - test: "In the popup, click an account name link. Verify the LinkedIn profile opens in a new tab AND the row does NOT expand."
    expected: "New tab opens to the account's LinkedIn profile URL. The AccountRow stays in its current collapsed/expanded state."
    why_human: "Click propagation behaviour (stopPropagation decoupling) requires a running popup to observe the two-event interaction."
  - test: "In the popup, click Block on a pending account row. Verify no new tab or page opens, and the account moves from the pending list into the Blocked section."
    expected: "Popup stays on same page. Account disappears from pending list and appears under Blocked (N) section header."
    why_human: "Requires a running popup connected to a live chrome.storage.local to observe state transitions."
  - test: "In the Blocked section, expand it (click the header). Verify that blocked account rows show grey name text, a Blocked chip, and no Block or Dismiss buttons."
    expected: "Name text is muted grey (#9ca3af). A small Blocked label/chip appears. No Block or Dismiss buttons render."
    why_human: "Visual presentation requires rendering the Preact component in a live popup context."
---

# Phase 18: Popup Interaction Fixes — Verification Report

**Phase Goal:** Posts from accounts at or above the block threshold are hidden in the feed, and popup interaction behaves correctly — account names link to LinkedIn profiles, Block marks accounts locally without navigation, and already-blocked accounts are visually distinguished
**Verified:** 2026-06-05T15:00:00Z
**Status:** human_needed
**Re-verification:** No — initial verification

## Goal Achievement

### Observable Truths (Roadmap Success Criteria)

| # | Truth | Status | Evidence |
|---|-------|--------|----------|
| 1 | Loading a LinkedIn feed page hides posts from any account whose stored score meets or exceeds the configured threshold | VERIFIED | `thresholdAuthors` map populated at `init()` (index.ts line 220–221); observer fast-path at lines 282–287 hides posts with `classList.add('llb-hidden')` + `injectTombstone` |
| 2 | New posts injected by the SPA (infinite scroll) from threshold-hitting accounts are also hidden by the MutationObserver handler | VERIFIED | Observer callback checks `thresholdAuthors.has(trackKey)` at line 282, hides + returns before any detector call; newly observed posts are caught the same way |
| 3 | Clicking an account name row in the popup opens that account's LinkedIn profile URL in a new browser tab | VERIFIED | AccountRow.tsx line 156: `onClick={(e) => e.stopPropagation()}` on the `<a>` with `target="_blank"` and `rel="noreferrer"` — profile URL from `account.authorProfileUrl` |
| 4 | Clicking Block on a popup account row stores the account as blocked in chrome.storage.local without opening any LinkedIn page | VERIFIED | `handleBlock` in index.tsx lines 57–66: writes `status: 'blocked' as const`, no `window.open` call; `openDashboard` window.open at line 89 is untouched (separate function) |
| 5 | A popup account row whose account is already in blocked storage shows a visually distinct state (greyed out label or "Blocked" indicator) instead of an active Block button | VERIFIED | AccountRow.tsx: `isBlocked` prop triggers `color: '#9ca3af'` on name (line 155), renders `Blocked` chip span (line 160), guards `actionRow` with `{!isBlocked && (...)}` (line 207) |

**Score:** 5/5 truths verified

### Required Artifacts

| Artifact | Expected | Status | Details |
|----------|----------|--------|---------|
| `src/content/index.ts` | thresholdAuthors map + observer hide branch + settings onChanged rebuild | VERIFIED | `const thresholdAuthors = new Map<string, number>()` at line 62; `let currentThreshold = 60` at line 77; observer branch at lines 277–288; `changes['settings']` branch at lines 168–179 |
| `src/popup/AccountRow.tsx` | account name anchor with stopPropagation; isBlocked prop variant | VERIFIED | `onClick={(e) => e.stopPropagation()}` at line 156; `isBlocked?: boolean` in interface (line 11); `blockedChip` style at lines 126–133; `{!isBlocked && (...)}` guard at line 207 |
| `src/popup/index.tsx` | handleBlock writing blocked status with no window.open; blocked filter + collapsible Blocked section | VERIFIED | `handleBlock` at lines 57–66 — only `chrome.storage.local.set`; no `window.open`; `blockedExpanded` state at line 110; `accounts.filter(a => a.status === 'blocked')` at lines 116–118; `{blocked.length > 0 && (...)}` section at lines 157–176 |

### Key Link Verification

| From | To | Via | Status | Details |
|------|----|-----|--------|---------|
| `src/content/index.ts init()` | thresholdAuthors map | `entry.status === 'pending' && entry.peakScore >= autoHideThreshold` → `thresholdAuthors.set(id, entry.peakScore)` | WIRED | Lines 220–221 — confirmed by grep |
| `src/content/index.ts startObserving callback` | injectTombstone | `thresholdAuthors.has(trackKey)` → `injectTombstone(postNode, authorName, peakScore)` | WIRED | Lines 282–287 — grey tombstone, not red injectBlockedTombstone |
| `src/content/index.ts onChanged settings branch` | thresholdAuthors map | `changes['settings']` → `thresholdAuthors.clear()` + storageGet rebuild | WIRED | Lines 168–179 — confirmed by grep |
| `src/popup/AccountRow.tsx name anchor onClick` | parent summaryArea onToggle | `e.stopPropagation()` prevents toggle firing | WIRED | Line 156: `onClick={(e) => e.stopPropagation()}` on the `<a>` element inside `<div onClick={onToggle}>` |
| `src/popup/index.tsx handleBlock` | chrome.storage.local | `status: 'blocked' as const` write, no window.open | WIRED | Lines 63–64: `{ ...existing, status: 'blocked' as const }` → `chrome.storage.local.set` |
| `src/popup/index.tsx App` | AccountRow isBlocked prop | `blocked.map` renders rows with `isBlocked={true}` | WIRED | Line 171: `isBlocked={true}` passed to AccountRow for all blocked rows |
| `src/popup/index.tsx blocked filter` | accounts state | `accounts.filter(a => a.status === 'blocked')` | WIRED | Lines 116–118 — filter reads from `accounts` state updated by onChanged listener |
| `src/popup/AccountRow.tsx actionRow` | isBlocked guard | `actionRow` rendered only when `!isBlocked` | WIRED | Line 207: `{!isBlocked && (<div style={rowStyles.actionRow}>...)}` |

### Data-Flow Trace (Level 4)

| Artifact | Data Variable | Source | Produces Real Data | Status |
|----------|---------------|--------|-------------------|--------|
| `src/content/index.ts` thresholdAuthors | `flaggedAccounts` from storage | `storageGet(['flaggedAccounts'])` at init + `storageGet(['flaggedAccounts'])` on settings change | Yes — reads real chrome.storage.local | FLOWING |
| `src/popup/index.tsx` accounts state | `flaggedAccounts` from storage | `chrome.storage.local.get(['flaggedAccounts'])` in useEffect + onChanged listener refreshes on writes | Yes — real storage reads, live-updated | FLOWING |
| `src/popup/AccountRow.tsx` blocked variant | `isBlocked` prop + `account` prop | Passed from index.tsx `blocked` array which filters real accounts state | Yes — driven by real storage-backed state | FLOWING |

### Behavioral Spot-Checks

| Behavior | Command | Result | Status |
|----------|---------|--------|--------|
| TypeScript compiles clean | `npx tsc --noEmit -p tsconfig.json` | Exit 0, no output | PASS |
| All 7 phase commits exist in git log | `git log --oneline` | 1fea8a3, c079012, dbc4f35, e4dda75, 0ee8f22, c616b57, b6338df all present | PASS |
| No window.open in handleBlock | grep `window.open` in index.tsx | Only one match at line 89 (openDashboard, not handleBlock) | PASS |
| dismissedSet guard before thresholdAuthors check | grep `dismissedSet.has` in index.ts | Line 277 (before thresholdAuthors.has at 282) | PASS |
| Grey tombstone used (not red) for threshold posts | grep `injectTombstone` in threshold branch | Line 285: `injectTombstone(postNode, authorName, peakScore)` — not `injectBlockedTombstone` | PASS |

### Probe Execution

Step 7c: SKIPPED — no probe scripts in `scripts/*/tests/probe-*.sh` for this phase; no probes declared in PLAN frontmatter.

### Requirements Coverage

| Requirement | Source Plan | Description | Status | Evidence |
|-------------|------------|-------------|--------|----------|
| BUG-01 | 18-01-PLAN.md | Posts from accounts whose stored score meets or exceeds threshold are hidden in feed | SATISFIED | thresholdAuthors map + observer branch + settings rebuild all implemented and wired |
| POPUP-01 | 18-02-PLAN.md | Clicking account name opens LinkedIn profile in new tab | SATISFIED | stopPropagation on name anchor at AccountRow.tsx line 156; existing href/target/_blank/rel unchanged |
| POPUP-02 | 18-02-PLAN.md | Block button marks account as blocked in local storage, does not navigate | SATISFIED | handleBlock writes status: 'blocked', no window.open at all |
| POPUP-03 | 18-03-PLAN.md | Block button visually distinct for already-blocked accounts | SATISFIED | isBlocked variant: grey name, Blocked chip, no Block/Dismiss buttons rendered |

All 4 requirements claimed by plans are accounted for and satisfied. No orphaned requirements — BLOCK-01/02/03 and BATCH-01/02/03 are mapped to Phases 19 and 20 respectively.

### Anti-Patterns Found

| File | Line | Pattern | Severity | Impact |
|------|------|---------|----------|--------|
| `src/popup/index.tsx` | 215 | `placeholder="sk-ant-..."` | Info | HTML input placeholder attribute — not a code stub; pre-existing API key input field |

No TBD, FIXME, XXX markers. No empty implementations. No hardcoded empty props flowing to rendering. No unreferenced debt markers.

### Human Verification Required

All automated checks pass. The following items require human verification because they depend on live browser/extension context:

### 1. Feed Hiding on Page Load (BUG-01 / SC 1)

**Test:** Pre-seed `chrome.storage.local` with a `flaggedAccounts` entry having `status: 'pending'` and `peakScore >= autoHideThreshold`. Load a LinkedIn feed page. Locate a post from that account.
**Expected:** The post is hidden immediately with a grey reveal tombstone (llb-hidden class, grey background) before any detector async call resolves. No red blocked tombstone.
**Why human:** Requires a live LinkedIn session, pre-seeded storage, and a known account to observe the CSS class toggle timing.

### 2. MutationObserver Hiding on Infinite Scroll (BUG-01 / SC 2)

**Test:** With the same pre-seeded account, scroll the LinkedIn feed to trigger infinite-scroll injection of new posts. Verify newly injected posts from that account are hidden.
**Expected:** Posts injected into the DOM by LinkedIn's SPA are caught by the observer callback and hidden with the grey tombstone.
**Why human:** Requires live LinkedIn infinite-scroll behaviour and a running content script.

### 3. Account Name Click Behaviour (POPUP-01 / SC 3)

**Test:** Open the extension popup. Click the name link of a pending account row.
**Expected:** A new browser tab opens to the account's LinkedIn profile URL. The popup row does NOT expand (the detail panel does not appear).
**Why human:** stopPropagation behaviour requires running the Preact component in a live popup to observe the two-event decoupling.

### 4. Block Button Storage-Only Behaviour (POPUP-02 / SC 4)

**Test:** Open the extension popup with at least one pending account. Click Block on a row.
**Expected:** The popup stays on the same page. No LinkedIn tab opens. The account disappears from the pending list and appears in the Blocked section below.
**Why human:** Requires running popup connected to chrome.storage.local to observe state transitions and confirm no navigation side-effect.

### 5. Blocked Row Visual State (POPUP-03 / SC 5)

**Test:** With at least one blocked account, open the popup and click the "Blocked (N)" section header to expand it. Inspect the blocked account row.
**Expected:** Account name text is visually muted (grey). A small "Blocked" chip/label appears next to the name. No Block button and no Dismiss button are visible on the row.
**Why human:** Visual styling requires rendering the Preact component in a live popup context to confirm colour and layout.

### Gaps Summary

No gaps. All 5 roadmap success criteria are substantively implemented and wired in the codebase. TypeScript compiles clean. All 7 commits exist and match the declared changes. The phase goal is achieved in code. Human verification is needed only to confirm the runtime behaviour in a live extension context.

---

_Verified: 2026-06-05T15:00:00Z_
_Verifier: Claude (gsd-verifier)_
