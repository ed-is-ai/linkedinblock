# Phase 18: Popup Interaction Fixes — Research

**Researched:** 2026-06-05
**Domain:** Chrome MV3 content script + Preact popup — bug fix + UI interaction wiring
**Confidence:** HIGH (all findings verified directly from source files)

---

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions

**BUG-01: Threshold Hiding**
- D-01: At `init()`, load all `flaggedAccounts` with `peakScore >= autoHideThreshold` into a new `thresholdAuthors` map (mirroring the existing `blockedAuthors` pattern). The observer hides their posts immediately without re-running the detector — stored `peakScore` is authoritative.
- D-02: Use the existing `injectTombstone` (grey, score shown) for threshold-hidden posts — same as scored posts. Do NOT use the red blocked tombstone; the user has not manually blocked these accounts.
- D-03: The `thresholdAuthors` map updates live via `chrome.storage.onChanged`. When the settings threshold changes (or new accounts cross the threshold), the content script picks it up without a page reload — consistent with how `blockedAuthors` updates live.

**POPUP-01: Account Name Link**
- D-04: The account name `<a>` in `AccountRow.tsx` already navigates correctly (`target="_blank" rel="noreferrer"`). If clicking the name also fires `onToggle` (row expansion), add `e.stopPropagation()` on the `<a>` click to prevent toggle from firing when the user intends to open the profile.

**POPUP-02: Block Button Semantics**
- D-05: `handleBlock` writes `status: 'blocked'` to `flaggedAccounts` in `chrome.storage.local` and does nothing else. Remove the `window.open(url)` call entirely. No "Report on LinkedIn" link.
- D-06: Blocked accounts stay in `flaggedAccounts` (status: 'blocked') — no schema change. The existing `onChanged` listener in the content script already handles this key.

**POPUP-03: Blocked Accounts Display**
- D-07: Blocked accounts appear in a **separate collapsible section** below the pending list, headed by a toggle row: `"Blocked (N) ▾"`. The section is collapsed by default (or expanded — planner's discretion).
- D-08: A blocked `AccountRow` shows: name text in grey (#9ca3af), a small `"Blocked"` chip/badge, no Block button, no Dismiss button. Minimal change to `AccountRow` — pass an `isBlocked` prop to switch to the blocked visual variant.

### Claude's Discretion

- Default expand/collapse state of the Blocked section (collapsed is recommended — keeps popup compact).
- Exact grey shade for name text and chip styling (follow existing grey palette: #9ca3af or #6b7280).

### Deferred Ideas (OUT OF SCOPE)

- "Report on LinkedIn" link for blocked accounts — deferred; POPUP-02 is local-only by decision.
- Unblock from popup — deferred to Phase 19 (Blocked Accounts Page, BLOCK-02).
</user_constraints>

---

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|------------------|
| BUG-01 | Posts from accounts whose stored score meets or exceeds the block threshold are hidden in the LinkedIn feed (content script applies hiding on page load and on new posts detected via MutationObserver) | D-01/D-02/D-03; `blockedAuthors` pattern in `src/content/index.ts` lines 53 and 181–188 is the exact template |
| POPUP-01 | Clicking an account name opens their LinkedIn profile URL in a new tab | D-04; `<a href={account.authorProfileUrl} target="_blank" rel="noreferrer">` is already correct — only needs `e.stopPropagation()` on the anchor to prevent `onToggle` conflict |
| POPUP-02 | Block button marks the account as blocked in local storage (does not navigate to LinkedIn) | D-05; `handleBlock` in `src/popup/index.tsx` lines 57–69 already writes `status: 'blocked'`; only the `window.open` line (68–69) must be removed |
| POPUP-03 | Block button is visually distinct (greyed out / "Blocked") for accounts already in blocked storage | D-07/D-08; requires new `blocked` filter + collapsible section in `index.tsx` and `isBlocked` prop in `AccountRow.tsx` |
</phase_requirements>

---

## Summary

Phase 18 is a focused surgical fix — four requirements, all touching existing files with no new dependencies. The work divides cleanly into two tracks: a content-script bug fix (BUG-01) and three popup UI improvements (POPUP-01 through POPUP-03).

The BUG-01 bug is architectural: the content script currently loads `blockedAuthors` at `init()` and hides those authors' posts immediately, but it has no equivalent logic for accounts that exceed the auto-hide threshold from prior sessions. The fix requires a new `thresholdAuthors` map that mirrors `blockedAuthors` exactly — same init pattern, same `onChanged` update pattern — but populated by `peakScore >= autoHideThreshold` instead of `status === 'blocked'`. An additional `onChanged` branch handles threshold *slider* changes so the map stays fresh without a reload.

The POPUP-01 fix is a one-liner: the account name anchor already has correct `href` and `target="_blank"` attributes, but it sits inside a `<div onClick={onToggle}>` wrapper — clicking the link currently also triggers row expansion. Adding `e.stopPropagation()` to the anchor's `onClick` is the complete fix. The POPUP-02 fix is also a one-liner: removing the `window.open(url, '_blank', 'noreferrer')` call at the end of `handleBlock`. POPUP-03 is the largest change: a new collapsible "Blocked" section in `index.tsx` (using a `useState` toggle defaulting to collapsed) and an `isBlocked?: boolean` prop on `AccountRow` that switches the row to a read-only grey variant with no action buttons.

**Primary recommendation:** Implement in three tasks — (1) BUG-01 content-script changes, (2) POPUP-01 + POPUP-02 one-liners, (3) POPUP-03 blocked section + AccountRow variant.

---

## Architectural Responsibility Map

| Capability | Primary Tier | Secondary Tier | Rationale |
|------------|-------------|----------------|-----------|
| Threshold-based post hiding on load | Content Script | — | Post DOM is content-script-owned; storage read at init |
| Threshold-based hiding for new infinite-scroll posts | Content Script | — | MutationObserver fires in content script |
| Live threshold map refresh on settings change | Content Script | — | `chrome.storage.onChanged` listener already lives there |
| Account name navigation to LinkedIn profile | Popup (Preact) | — | `<a href>` is a browser primitive; no service worker needed |
| Block button writing storage | Popup (Preact) | — | Direct `chrome.storage.local` write; no message relay needed |
| Blocked section rendering | Popup (Preact) | — | Popup reads storage directly; stateless render on each open |

---

## Standard Stack

No new packages. This phase makes surgical edits to existing files only.

### Existing Stack in Use
| File | Framework/API | Relevant Capability |
|------|--------------|---------------------|
| `src/content/index.ts` | Chrome MV3 content script, vanilla TS | `blockedAuthors` map, `chrome.storage.onChanged`, `init()` pattern |
| `src/popup/index.tsx` | Preact 10 + `preact/hooks` | `useState`, `useEffect`, `handleBlock`, `accounts` state |
| `src/popup/AccountRow.tsx` | Preact 10 JSX, inline styles | `rowStyles` record, `isExpanded` prop pattern |
| `src/shared/types.ts` | TypeScript interfaces | `FlaggedAccount.status: 'pending' \| 'blocked' \| 'dismissed'`, `FlaggedAccount.peakScore` |

**Package Legitimacy Audit:** Not applicable — no new packages installed in this phase.

---

## Architecture Patterns

### System Architecture Diagram

```
CONTENT SCRIPT (init)
  ├── storageGet(['flaggedAccounts', 'settings'])
  │     ├── populate blockedAuthors map  (status === 'blocked')
  │     └── populate thresholdAuthors map (peakScore >= autoHideThreshold)  [NEW]
  │
  └── startObserving(onPost callback)
        └── for each observed post:
              ├── blockedAuthors.has(authorId)?  → hide + blocked tombstone (existing)
              ├── thresholdAuthors.has(authorId)? → hide + grey tombstone  [NEW]
              └── run detector pipeline (existing)

chrome.storage.onChanged (content script)
  ├── dismissedAccounts changed → unhide nodes (existing)
  ├── flaggedAccounts changed → update blockedAuthors + apply blocked tombstone (existing)
  └── settings changed → rebuild thresholdAuthors from flaggedAccounts  [NEW]
                          (re-read flaggedAccounts + new threshold; update map)

POPUP (index.tsx)
  ├── accounts = all FlaggedAccount values from storage
  ├── pending = accounts.filter(a => a.status === 'pending')  (existing)
  ├── blocked = accounts.filter(a => a.status === 'blocked')  [NEW]
  │
  ├── handleBlock: write status='blocked', NO window.open  [CHANGED]
  │
  └── render:
        ├── pending list (existing AccountRow with isBlocked=false)
        └── collapsible "Blocked (N) ▾" section  [NEW]
              └── blocked list (AccountRow with isBlocked=true)

AccountRow.tsx
  ├── props: add isBlocked?: boolean  [NEW]
  └── isBlocked=true → grey name, "Blocked" chip, no Block/Dismiss buttons  [NEW]
```

### Recommended Project Structure (no change)
```
src/
├── content/
│   └── index.ts          ← BUG-01: thresholdAuthors map + onChanged branch
├── popup/
│   ├── index.tsx         ← POPUP-01 (stopPropagation anchor), POPUP-02 (remove window.open), POPUP-03 (blocked section)
│   └── AccountRow.tsx    ← POPUP-03: isBlocked prop + visual variant
└── shared/
    └── types.ts          ← No changes needed (status union already has 'blocked')
```

### Pattern 1: thresholdAuthors map (mirrors blockedAuthors)

**What:** Module-scope Map that tracks accounts whose `peakScore` meets the hide threshold, populated at `init()` and kept fresh by `onChanged`.
**When to use:** Every post entering the observer is checked against this map before running the detector.

```typescript
// Source: src/content/index.ts (existing blockedAuthors pattern, lines 53 and 181–188)
// EXISTING pattern to mirror exactly:
const blockedAuthors = new Map<string, { postScore: number; profileScore: number }>();

// NEW map — same shape; different population condition:
const thresholdAuthors = new Map<string, number>(); // authorId → peakScore

// In init(), after loading flaggedAccounts:
const autoHideThreshold = settings?.autoHideThreshold ?? 60;
for (const [id, entry] of Object.entries(flaggedAccounts)) {
  if (entry.status === 'pending' && entry.peakScore >= autoHideThreshold) {
    thresholdAuthors.set(id, entry.peakScore);
  }
  // existing blocked logic unchanged
}
```

**Observer check (insert BEFORE existing blockedAuthors check):**
```typescript
// Check thresholdAuthors AFTER blockedAuthors (blocked takes precedence)
if (thresholdAuthors.has(trackKey)) {
  const peakScore = thresholdAuthors.get(trackKey)!;
  postNode.classList.add('llb-hidden');
  injectTombstone(postNode, authorName, peakScore); // grey tombstone, D-02
  hiddenPostNodes.set(trackKey, [...(hiddenPostNodes.get(trackKey) ?? []), postNode]);
  return;
}
```

### Pattern 2: settings onChanged branch for thresholdAuthors rebuild

**What:** When the threshold slider changes, rebuild `thresholdAuthors` from current `flaggedAccounts` using the new threshold. Must re-read `flaggedAccounts` from storage to get the latest snapshot.

```typescript
// In chrome.storage.onChanged listener (src/content/index.ts)
if (changes['settings']) {
  const newSettings = changes['settings'].newValue as { autoHideThreshold?: number } | undefined;
  const newThreshold = newSettings?.autoHideThreshold ?? 60;
  // Re-read flaggedAccounts to rebuild the map against new threshold
  storageGet(['flaggedAccounts']).then(({ flaggedAccounts = {} }) => {
    thresholdAuthors.clear();
    for (const [id, entry] of Object.entries(flaggedAccounts)) {
      if (entry.status === 'pending' && entry.peakScore >= newThreshold) {
        thresholdAuthors.set(id as string, (entry as FlaggedAccount).peakScore);
      }
    }
  });
}
```

### Pattern 3: handleBlock — remove window.open

**What:** `handleBlock` already writes `status: 'blocked'` correctly (lines 57–68). The only change is deleting lines 67–68 (the `window.open` call).

```typescript
// Source: src/popup/index.tsx lines 57–69 — AFTER fix:
async function handleBlock(account: FlaggedAccount) {
  const result = await chrome.storage.local.get(['flaggedAccounts']);
  const flaggedAccounts = (result.flaggedAccounts ?? {}) as Record<string, FlaggedAccount>;
  const existing = flaggedAccounts[account.authorId];
  if (existing) {
    flaggedAccounts[account.authorId] = { ...existing, status: 'blocked' as const };
    await chrome.storage.local.set({ flaggedAccounts });
  }
  // window.open removed — D-05
}
```

### Pattern 4: POPUP-01 stopPropagation on account name anchor

**What:** The anchor already has correct `href`/`target`. The `summaryArea` div wraps it with `onClick={onToggle}`. Adding `onClick={e => e.stopPropagation()}` on the `<a>` prevents the toggle from firing on profile link clicks.

```tsx
// Source: src/popup/AccountRow.tsx line 141–148 — AFTER fix:
<a
  href={account.authorProfileUrl}
  target="_blank"
  rel="noreferrer"
  style={rowStyles.nameLink}
  onClick={(e) => e.stopPropagation()}
>
  {account.authorName}
</a>
```

### Pattern 5: POPUP-03 — Blocked section in index.tsx

**What:** Filter `blocked` accounts from `accounts` array; render collapsible section below pending list using a `useState` toggle.

```tsx
// Source: src/popup/index.tsx — additions
const [blockedExpanded, setBlockedExpanded] = useState(false); // D-07: collapsed default

const pending = accounts.filter(a => a.status === 'pending').sort((a, b) => b.peakScore - a.peakScore);
const blocked = accounts.filter(a => a.status === 'blocked').sort((a, b) => b.peakScore - a.peakScore);

// In render, after pending list:
{blocked.length > 0 && (
  <div>
    <div
      style={styles.blockedSectionHeader}
      onClick={() => setBlockedExpanded(prev => !prev)}
    >
      Blocked ({blocked.length}) {blockedExpanded ? '▾' : '▸'}
    </div>
    {blockedExpanded && blocked.map(account => (
      <AccountRow
        key={account.authorId}
        account={account}
        onBlock={() => {}}
        onDismiss={() => {}}
        isBlocked={true}
      />
    ))}
  </div>
)}
```

### Pattern 6: POPUP-03 — AccountRow isBlocked variant

**What:** When `isBlocked=true`, replace the name link colour with #9ca3af, add a "Blocked" chip next to the name, and render neither Block nor Dismiss buttons in `actionRow`.

```tsx
// Source: src/popup/AccountRow.tsx — additions to props and render
interface AccountRowProps {
  // ... existing props ...
  isBlocked?: boolean; // NEW — D-08
}

// In the nameLink style (conditional):
style={{ ...rowStyles.nameLink, ...(isBlocked ? { color: '#9ca3af' } : {}) }}

// "Blocked" chip (rendered when isBlocked):
{isBlocked && (
  <span style={rowStyles.blockedChip}>Blocked</span>
)}

// actionRow — conditional rendering:
{!isBlocked && (
  <div style={rowStyles.actionRow}>
    <button onClick={(e) => { e.stopPropagation(); onDismiss(); }} style={rowStyles.dismissBtn}>Dismiss</button>
    <button onClick={(e) => { e.stopPropagation(); onBlock(); }} style={rowStyles.blockBtn}>Block</button>
  </div>
)}
```

New style entry for blocked chip:
```typescript
blockedChip: {
  background: '#f3f4f6',
  color: '#9ca3af',
  fontSize: 10,
  padding: '2px 6px',
  borderRadius: 10,
  border: '1px solid #e5e7eb',
} as JSX.CSSProperties,
```

New style entry for blocked section header in `index.tsx`:
```typescript
blockedSectionHeader: {
  cursor: 'pointer',
  fontSize: 12,
  color: '#6b7280',
  padding: '6px 0',
  borderTop: '1px solid #e5e7eb',
  userSelect: 'none',
} as preact.JSX.CSSProperties,
```

### Anti-Patterns to Avoid

- **Rebuilding thresholdAuthors on every `flaggedAccounts` change:** The `flaggedAccounts` onChanged fires frequently (every Block or score update). Only the `settings` change should trigger a rebuild — `flaggedAccounts` changes that add new accounts crossing the threshold are less critical (handled on next page load) and would cause unnecessary churn.
- **Using `element.remove()` on LinkedIn-owned nodes:** CLAUDE.md constraint #2. The threshold-hiding path must use `postNode.classList.add('llb-hidden')` — never `postNode.remove()`.
- **Injecting tombstone inside postNode:** CLAUDE.md constraint and tombstone.ts comment: always use `postNode.parentNode?.insertBefore(tombstone, postNode)`.
- **Passing `onBlock`/`onDismiss` as no-ops to blocked AccountRow and still rendering buttons:** Would allow clicks that call no-ops silently. The cleaner pattern is conditional rendering of the `actionRow` div.

---

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Collapsible section UI | Custom animation/transition | Plain `useState` bool + conditional render | Popup is 280px; animations add complexity with no benefit |
| Threshold tracking | Re-run detector on every post | `thresholdAuthors` map populated at init from stored `peakScore` | Stored score is authoritative; detector is async and would cause visible delay |
| Blocked accounts list | Separate storage key | Filter `flaggedAccounts` where `status === 'blocked'` | Storage schema already has status field; no migration needed |

**Key insight:** All data needed for this phase is already in `chrome.storage.local` under existing keys. Zero schema changes required.

---

## Common Pitfalls

### Pitfall 1: thresholdAuthors not cleared on SPA navigation
**What goes wrong:** User navigates to a non-feed page and back. `hiddenPostNodes` is cleared by the `popstate`/`pushState` handlers, but if `thresholdAuthors` is not cleared, the map holds stale data from the old URL session. The `processedPosts` set in `observer.ts` is also cleared on navigation (via `reinit()`), so posts will be re-processed — correctly referencing the current `thresholdAuthors`.
**Why it happens:** The navigation reset in `init()` lines 204–223 explicitly clears `hiddenPostNodes`, `profileSignalCache`, and counters — but the new `thresholdAuthors` map would need to be added to those reset blocks.
**How to avoid:** Add `thresholdAuthors.clear()` (and repopulate from storage) to both the `popstate` and `pushState` handlers, OR treat the map as session-persistent (acceptable since the threshold doesn't change with navigation and peakScores don't change mid-session). Recommend: keep map persistent across SPA nav — no clear needed — since threshold only changes via settings slider and `onChanged` handles that.
**Warning signs:** Posts from threshold-crossing accounts not being re-hidden after returning to the feed from another LinkedIn page.

### Pitfall 2: `flaggedAccounts` onChanged race with thresholdAuthors rebuild
**What goes wrong:** A new account crosses the threshold and its `flaggedAccounts` entry is written. The `onChanged` for `flaggedAccounts` fires. If the handler tries to also update `thresholdAuthors`, it may be using the old threshold value if the settings `onChanged` hasn't fired yet.
**Why it happens:** `autoHideThreshold` is a local variable captured at `init()` — it's not updated when settings change unless explicitly re-read.
**How to avoid:** The `settings` `onChanged` branch (Pattern 2) must update a module-scope `currentThreshold` variable (or re-declare the local) so the `flaggedAccounts` branch can reference it accurately. Alternatively, the simplest approach: only rebuild `thresholdAuthors` from `settings` changes; for `flaggedAccounts` changes, only handle the blocked-tombstone upgrade (existing logic) — threshold-crossing new accounts will be caught on the next page load or by the detector pipeline's live scoring (which calls `persistFlaggedAccount` and then re-checks the hide condition directly).
**Warning signs:** Accounts that just crossed the threshold not appearing in `thresholdAuthors` immediately after a settings change.

### Pitfall 3: Blocked section rows triggering onBlock/onDismiss no-ops
**What goes wrong:** Passing empty `() => {}` as `onBlock`/`onDismiss` to blocked rows and still rendering the action buttons would let users click Block on an already-blocked account, which calls a no-op silently.
**Why it happens:** `AccountRow` currently always renders the `actionRow` div regardless of props.
**How to avoid:** Guard the `actionRow` render with `{!isBlocked && (...)}` as shown in Pattern 6.
**Warning signs:** TypeScript will not catch this — it's a UX logic gap.

### Pitfall 4: `e.stopPropagation()` on anchor breaks keyboard navigation
**What goes wrong:** `stopPropagation()` on `onClick` does not affect keyboard `Enter`/`Space` on the anchor — those dispatch their own events. The anchor's natural activation already opens the URL without bubbling to the parent div's `onClick`, so `stopPropagation()` is only needed for pointer clicks. This is safe.
**Why it happens:** Mis-understanding of event propagation for keyboard-activated links.
**How to avoid:** No special handling needed for keyboard — the `<a>` element natively handles `Enter` to follow `href` without triggering parent `onClick` handlers in the same way.
**Warning signs:** Not applicable — this pitfall is informational; the fix is safe.

---

## Code Examples

### BUG-01: Observer check order (after thresholdAuthors added)

```typescript
// Source: src/content/index.ts, inside startObserving callback
const trackKey = authorId || urn;

// 1. Already-blocked authors (highest priority — existing)
if (blockedAuthors.has(trackKey)) {
  const scores = blockedAuthors.get(trackKey)!;
  postNode.classList.add('llb-hidden');
  injectBlockedTombstone(postNode, authorName, scores.postScore, scores.profileScore);
  hiddenPostNodes.set(trackKey, [...(hiddenPostNodes.get(trackKey) ?? []), postNode]);
  return;
}

// 2. Threshold authors — score meets hide threshold but not manually blocked [NEW]
if (thresholdAuthors.has(trackKey)) {
  const peakScore = thresholdAuthors.get(trackKey)!;
  postNode.classList.add('llb-hidden');
  injectTombstone(postNode, authorName, peakScore); // grey tombstone, D-02
  hiddenPostNodes.set(trackKey, [...(hiddenPostNodes.get(trackKey) ?? []), postNode]);
  return;
}

// 3. Hard exclusions (existing)
const exclusion = checkExclusions(postData, postNode);
```

---

## State of the Art

| Old Behaviour | New Behaviour | Requirement | Note |
|---------------|---------------|-------------|------|
| `handleBlock` writes blocked status AND opens LinkedIn profile URL | `handleBlock` writes blocked status only | POPUP-02 (D-05) | `window.open` on lines 67–68 of `index.tsx` is the exact code to delete |
| Account name click fires `onToggle` (row expansion) due to parent onClick | Account name click opens profile URL, does not expand row | POPUP-01 (D-04) | `e.stopPropagation()` on anchor's onClick is the complete fix |
| Blocked accounts shown in pending list (pending filter on `status === 'pending'` excludes them) | Blocked accounts shown in separate collapsed section | POPUP-03 (D-07) | Currently accounts with `status === 'blocked'` are filtered OUT of `pending` and never rendered |
| No threshold-based hiding on page load | Accounts with `peakScore >= threshold` hidden immediately at init | BUG-01 (D-01) | The detector pipeline handles NEW posts above threshold; BUG-01 is about ALREADY-stored accounts |

**Deprecated/outdated:**
- `window.open(url, '_blank', 'noreferrer')` call in `handleBlock` — replaced by storage-write-only semantics.

---

## Assumptions Log

> All claims in this research were verified by direct source file inspection. No assumed claims.

**If this table is empty:** All claims in this research were verified or cited — no user confirmation needed.

| # | Claim | Section | Risk if Wrong |
|---|-------|---------|---------------|
| — | — | — | — |

---

## Open Questions

1. **thresholdAuthors: should it also handle dismissed accounts?**
   - What we know: `dismissedSet` is checked in the detector pipeline path but NOT in the `blockedAuthors` fast-path. The same omission would apply to `thresholdAuthors`.
   - What's unclear: Should threshold-hidden posts for a dismissed author still be hidden? Probably not — dismissed means "false positive, don't hide".
   - Recommendation: Add `if (dismissedSet.has(trackKey)) return;` check BEFORE the `thresholdAuthors` check, consistent with how the detector pipeline skips dismissed authors (line 271 of `index.ts`).

2. **thresholdAuthors population: should `status === 'blocked'` accounts be excluded?**
   - What we know: Blocked authors are already handled by `blockedAuthors` (which takes precedence). If an account has both `status === 'blocked'` AND `peakScore >= threshold`, the `blockedAuthors` check fires first and returns early.
   - What's unclear: Whether to defensively exclude `status === 'blocked'` from `thresholdAuthors` population.
   - Recommendation: Exclude them — `if (entry.status === 'pending' && entry.peakScore >= autoHideThreshold)` is cleaner than `if (entry.status !== 'dismissed')`. Prevents any edge-case double-processing.

---

## Environment Availability

Step 2.6: SKIPPED — this phase makes source-code edits only. No new external tools, CLIs, runtimes, or services are required. Existing toolchain (Node 26, Vite, TypeScript, Preact) is confirmed available.

---

## Sources

### Primary (HIGH confidence — direct source file inspection)
- `src/content/index.ts` — `blockedAuthors` map pattern (lines 53, 181–188), `onChanged` listener (lines 108–148), `init()` observer callback (lines 225–305)
- `src/popup/index.tsx` — `handleBlock` (lines 57–69), `accounts`/`pending` state (lines 113–115), `AccountRow` render path (lines 136–149)
- `src/popup/AccountRow.tsx` — `rowStyles` record, `<a>` anchor (lines 141–148), `summaryArea` onClick (line 139), `actionRow` (lines 195–198)
- `src/shared/types.ts` — `FlaggedAccount.status` union (line 111), `FlaggedAccount.peakScore` (lines 100–101)
- `src/content/detector/tombstone.ts` — `injectTombstone` signature and implementation (lines 40–65)
- `.planning/phases/18-popup-interaction-fixes/18-CONTEXT.md` — all locked decisions D-01 through D-08

### Secondary (MEDIUM confidence)
- N/A — no WebSearch or external sources needed; all research is from direct file inspection.

---

## Metadata

**Confidence breakdown:**
- BUG-01 implementation: HIGH — exact code patterns verified from source; `blockedAuthors` template is line-for-line reusable
- POPUP-01 fix: HIGH — `<a>` anchor structure confirmed; stopPropagation is the complete fix
- POPUP-02 fix: HIGH — `window.open` call confirmed at lines 67–68; deletion is the complete fix
- POPUP-03 implementation: HIGH — `FlaggedAccount.status` union confirmed; `rowStyles` grey palette confirmed; Preact `useState` pattern confirmed from existing code
- Pitfalls: HIGH — derived from direct source inspection, not speculation

**Research date:** 2026-06-05
**Valid until:** 2026-07-05 (stable internal codebase; no external API dependencies)
