# Phase 4: Popup UI — Context

**Gathered:** 2026-05-29
**Status:** Ready for planning

<domain>
## Phase Boundary

Deliver a read-only popup that shows the flagged accounts queue:
1. List of `pending` flagged accounts sorted by `peakScore` DESC (POPUP-01)
2. Each row: account name, signals that fired, composite score, post count (POPUP-02)
3. Live updates when new accounts are flagged while popup is open (POPUP-03)

The existing popup (`src/popup/index.tsx`) is a Phase 2 API key management UI. Phase 4 adds the flagged accounts list as the primary view. The API key section is retained as a collapsible secondary section at the bottom.

**Not in Phase 4:**
- Block action (Phase 5)
- Dismiss action (Phase 5)
- Settings / threshold configuration (Phase 6)
- Dashboard stats (Phase 6)

</domain>

<decisions>
## Implementation Decisions

### Layout

- **D-01:** Popup width stays at 280px (current). Height grows with content — Chrome allows up to 600px before adding a scrollbar. For long lists the popup should scroll internally, not grow the window.

- **D-02:** Two sections:
  1. **Flagged accounts list** (primary, top): rendered from `flaggedAccounts` storage. Shows only `status === 'pending'` entries. Sorted by `peakScore` DESC.
  2. **API key section** (secondary, bottom): existing API key save/clear UI, collapsed behind a `▸ Settings` disclosure toggle by default.

- **D-03:** Empty state copy when no pending accounts: "No flagged accounts yet — scroll LinkedIn to start detecting."

### Component Design

- **D-04:** Extract a pure presentational `AccountRow` component (no chrome API access):
  - Props: `account: FlaggedAccount` (from `src/shared/types.ts`)
  - Displays: `authorName`, `peakScore` (as the headline number), `compositeScore` (EMA; shown as "avg" under the peak), `postCount`, signal chips from `Object.keys(account.signals)` filtered to keys with value > 0
  - No Block / Dismiss buttons — Phase 5 adds those

- **D-05:** Signal chips: show the signal key name (e.g. `listicle`, `buzzwords`, `em-dash`). Truncate to at most 4 chips; if more signals fired, show `+N more`. Keep chips small (pill style, 10px font).

- **D-06:** Score display: show `peakScore` as the large number in the row header. Show `compositeScore` (EMA) next to it as secondary context (`avg: XX`). Both are integers 0–100.

### Storage Access

- **D-07:** `App` component reads `flaggedAccounts` from `chrome.storage.local` on mount (single `useEffect` with empty deps). No async loading state required — popup opens fast enough that a brief render of "Loading..." is acceptable, but the list simply renders as empty until the read resolves.

- **D-08:** `chrome.storage.onChanged` listener registered in `App`'s `useEffect` with cleanup on unmount. On `changes.flaggedAccounts`, call `setAccounts(Object.values(changes.flaggedAccounts.newValue ?? {}))` and re-sort.

- **D-09:** Filter and sort logic: `Object.values(flaggedAccounts).filter(a => a.status === 'pending').sort((a,b) => b.peakScore - a.peakScore)` — applied at render time from the raw state, not stored in a separate state variable.

### API Key Section

- **D-10:** Wrap the existing API key UI in a `<details>` / `<summary>` disclosure element. Default `open` attribute absent (collapsed by default in Phase 4 since the flagged list is the primary content). Summary label: `⚙ Settings`.

- **D-11:** No changes to the API key save/clear logic itself.

### Styling

- **D-12:** Inline styles (existing convention). No CSS files. Extend the existing `styles` Record in `index.tsx`.

- **D-13:** LinkedIn blue `#0a66c2` for score accent. Light separator line `#e5e7eb` between account rows. Background of signal chips: `#f3f4f6` with text `#374151`.

### Scroll

- **D-14:** Add `maxHeight: 400, overflowY: 'auto'` to the account list container so the popup does not grow beyond ~500px for long queues.

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Requirements & Roadmap
- `.planning/REQUIREMENTS.md` — POPUP-01, POPUP-02, POPUP-03
- `.planning/ROADMAP.md` §Phase 4 — success criteria

### Type Contract
- `src/shared/types.ts` — `FlaggedAccount` interface (added in Phase 3): `authorId`, `authorName`, `authorProfileUrl`, `compositeScore`, `peakScore`, `postCount`, `signals: Record<string, number>`, `hiddenPostUrns`, `firstSeenAt`, `lastSeenAt`, `status`
- `src/shared/storage.ts` — `storageGet` typed wrapper (Phase 4 popup reads directly, does not need this wrapper; uses `chrome.storage.local.get` directly in the popup context)

### Existing Popup
- `src/popup/index.tsx` — Phase 2 scaffold with API key section. Phase 4 expands this file in-place.
- `src/popup/index.html` — No changes needed.

### Stack
- `.planning/research/STACK.md` §"3. Popup UI" — Preact 10 + JSX, `@preact/preset-vite`
- `.planning/research/ARCHITECTURE.md` §"Review Flow" — storage-first popup pattern, chrome.storage.onChanged for live updates

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- `src/popup/index.tsx` — existing Preact component with full styles Record, save/clear API key logic. Phase 4 adds the flagged accounts section above the existing content, wraps API key section in `<details>`.
- `preact` + `preact/hooks` already in `package.json` (installed in Phase 2).

### Established Patterns
- Inline styles as `Record<string, preact.JSX.CSSProperties>` — follow existing convention
- `chrome.storage.local.get([...]).then(result => ...)` — already in use in the existing popup
- `useState` / `useEffect` from `preact/hooks` — already imported

### New Files
- `src/popup/AccountRow.tsx` — new file for the presentational account row component
- `src/popup/index.tsx` — modified in-place (add flagged list, wrap API key in details)

### Integration Points
- `FlaggedAccount` type from `src/shared/types.ts` — import in both AccountRow.tsx and index.tsx
- Signal keys to display: derived from `Object.entries(account.signals).filter(([,v]) => v > 0).map(([k]) => k)`

</code_context>

<specifics>
## Specific Ideas

- `AccountRow` receives the full `FlaggedAccount` and is responsible for formatting its own display — no logic in the parent list beyond sort/filter
- Use `a.authorProfileUrl` to make `a.authorName` a clickable link (opens in new tab) — useful for manual review without needing the Block action
- Show `postCount` as "N post" / "N posts" with proper singular/plural
- Signal chip `+N more` threshold: show up to 4 chips, hide the rest behind `+N more` static text (no expand toggle in Phase 4)

</specifics>

<deferred>
## Deferred Ideas

- **Block / Dismiss buttons** — Phase 5 adds these. AccountRow has no action buttons in Phase 4.
- **Loading spinner** — popup renders empty list until storage resolves; acceptable for Phase 4.
- **Filter by status** (pending / blocked / dismissed) — Phase 5/6 concern.
- **Sort toggle** (by peakScore vs by firstSeenAt) — Phase 6 concern.

</deferred>

---

*Phase: 4 — Popup UI*
*Context gathered: 2026-05-29*
