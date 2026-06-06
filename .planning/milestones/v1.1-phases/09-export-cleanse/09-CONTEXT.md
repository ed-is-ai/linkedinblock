# Phase 9: Export & Cleanse — Context

**Gathered:** 2026-05-30
**Status:** Ready for planning

<domain>
## Phase Boundary

Add Export (JSON + CSV downloads) and data Cleanse (before-date deletion with confirmation) controls to the existing dashboard page. Both features are **dashboard-only** — the popup is not touched.

**Deliverables:**
1. "Export JSON" button → downloads `linkedin-blocker-YYYY-MM-DD.json`
2. "Export CSV" button → downloads `linkedin-blocker-YYYY-MM-DD.csv`
3. "Cleanse data" date picker + count preview + `window.confirm` → deletes records
4. All controls live in a single "Data management" card on the dashboard

**Not in Phase 9:**
- Re-import / restore from exported JSON
- Cloud sync or cross-device backup
- Popup-level export shortcuts
- Any changes to the popup component

</domain>

<decisions>
## Implementation Decisions

### JSON Export

- **D-01:** storedPosts are **embedded inside each account object** as a `posts` field. Join by `authorId` at export time. Shape:
  ```json
  {
    "exportedAt": "2026-05-30T12:00:00.000Z",
    "flaggedAccounts": [
      {
        "authorId": "...",
        "authorName": "...",
        ...other FlaggedAccount fields with timestamps as ISO strings...,
        "posts": [
          { "urn": "...", "score": 72, "text": "...", "hiddenAt": "2026-05-30T..." },
          ...
        ]
      }
    ]
  }
  ```

- **D-02:** JSON export scope is **flaggedAccounts + storedPosts only**. `dailyStats` and `dismissedAccounts` are not included. dailyStats regenerate naturally; dismissedAccounts are an implementation detail.

- **D-03:** All Unix ms timestamps (e.g. `firstSeenAt`, `lastSeenAt`, `hiddenAt`) are converted to **ISO 8601 strings** (`new Date(ts).toISOString()`) in both JSON and CSV exports.

### CSV Export

- **D-04:** One row per flagged account. Columns (in order):
  `authorId, authorName, authorProfileUrl, peakScore, compositeScore, postCount, status, firstSeenAt, lastSeenAt, signals`
  where `signals` is the `signals` object serialised as a JSON string (e.g. `"{\"listicle\":25,\"buzzwords\":15}"`).

- **D-05:** CSV header row uses the exact column names above. Values that contain commas or quotes are wrapped in double-quotes per RFC 4180. No post text in CSV export.

### Export Placement

- **D-06:** Both Export JSON and Export CSV buttons, plus the entire Cleanse control, live **only on the dashboard page** — not in the popup. This is final; the "dashboard or popup" language in REQUIREMENTS.md is superseded by this decision.

### Cleanse Logic

- **D-07:** Accounts are removed if their **`lastSeenAt`** (most recent flag) is **before** the chosen date. This keeps recently-active accounts even if they were first seen long ago.

- **D-08:** `storedPosts` are removed if their **`hiddenAt`** timestamp is before the chosen date.

- **D-09:** `dismissedAccounts` are **wiped entirely** on cleanse (no timestamp filtering is possible). All dismissed IDs are cleared.

- **D-10:** `dailyStats` are **not touched** by cleanse. They auto-expire after 30 days.

- **D-11:** Cleanse confirmation UX: date input triggers live count preview (e.g. "Will remove 3 accounts, 12 posts"). Clicking "Confirm cleanse" calls `window.confirm('Delete 3 accounts and 12 posts?')`. Only on OK does the deletion proceed.

### Dashboard Layout

- **D-12:** A single **"Data management" card** is appended below the existing stats cards. Inside the card:
  - Top section: "Export data" — two buttons side by side: "Export JSON" and "Export CSV"
  - Separator (`<hr>` or border-top)
  - Bottom section: "Cleanse data before:" — `<input type="date">` + count preview line + "Confirm cleanse" button (red/destructive style)

- **D-13:** The card follows the existing `s.card` style (white background, `border: '1px solid #e5e7eb'`, `borderRadius: 8`, `padding: '20px 24px'`).

### File Naming

- **D-14:** Files are named with the export date:
  - `linkedin-blocker-YYYY-MM-DD.json`
  - `linkedin-blocker-YYYY-MM-DD.csv`
  where the date is today's UTC date (`new Date().toISOString().slice(0, 10)`).

- **D-15:** Download is triggered via the Blob + `<a download>` pattern (no server needed, works in Chrome extension pages):
  ```typescript
  const blob = new Blob([content], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url; a.download = filename; a.click();
  URL.revokeObjectURL(url);
  ```

### Claude's Discretion

- Whether to add a `storedPosts` read to the dashboard `useEffect` or do a fresh `chrome.storage.local.get` at export click time — either is fine.

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Requirements
- `.planning/REQUIREMENTS.md` — EXPORT-01, EXPORT-02, CLEANSE-01, CLEANSE-02

### Roadmap
- `.planning/ROADMAP.md` §Phase 9 — success criteria

### Types & Storage
- `src/shared/types.ts` — `FlaggedAccount`, `StoredPost`, `StorageSchema` (all fields exported)
- `src/shared/storage.ts` — `storageGet`/`storageSet` typed wrappers

### Dashboard (the file being extended)
- `src/dashboard/index.tsx` — existing App component, `s` styles Record, `chrome.storage.local.get` pattern, card/toggle UI patterns

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Patterns
- `s.card` style object in `src/dashboard/index.tsx` — copy for the new Data Management card
- `chrome.storage.local.get(['flaggedAccounts', 'dailyStats'])` in dashboard `useEffect` — extend to also fetch `storedPosts` and `dismissedAccounts` for cleanse count
- Blob + anchor download pattern — no external library needed, standard Web API available in extension pages

### Established Patterns
- Dashboard reads all data on mount, no live updates — export can use the same in-memory state already loaded
- Preact `useState` for UI state (e.g. `cleanseDate`, `cleanseCount`) follows the existing `timeWindow` toggle pattern

### Integration Points
- `src/dashboard/index.tsx` `useEffect` get call — add `'storedPosts'` and `'dismissedAccounts'` to the keys array
- `src/dashboard/index.tsx` `App` return JSX — append the Data Management card below the Signal categories card

</code_context>

<specifics>
## Specific Ideas

- Count preview text: `"Will remove {N} account(s) and {M} post(s)"` — update live on date input change via `onInput` handler
- `window.confirm` message: `"Delete {N} account(s), {M} post(s), and all dismissed entries? This cannot be undone."`
- Export button labels: "Export JSON" and "Export CSV" — plain text, no icons
- Cleanse date default: empty (no pre-filled date) so user must consciously pick a date before the count appears

</specifics>

<deferred>
## Deferred Ideas

- Re-import from exported JSON (would require a full state restore flow — separate phase)
- "Clear all data" nuclear option (all keys at once, regardless of date) — could be a future popup setting
- Export to clipboard rather than file download

</deferred>

---

*Phase: 9 — Export & Cleanse*
*Context gathered: 2026-05-30*
