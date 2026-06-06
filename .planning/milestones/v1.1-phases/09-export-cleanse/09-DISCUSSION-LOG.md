# Phase 9: Export & Cleanse — Discussion Log

> **Audit trail only.** Do not use as input to planning, research, or execution agents.
> Decisions are captured in CONTEXT.md — this log preserves the alternatives considered.

**Date:** 2026-05-30
**Phase:** 09-export-cleanse
**Areas discussed:** JSON export shape, Export placement, CSV columns, Cleanse scope & date logic, Dashboard layout, File naming convention

---

## JSON Export Shape

### storedPosts in JSON

| Option | Description | Selected |
|--------|-------------|----------|
| Embedded in each account | `posts: [...]` array inside each account object, joined by authorId | ✓ |
| Parallel top-level arrays | `{ flaggedAccounts: [...], storedPosts: [...] }` mirroring storage | |
| Accounts only — skip posts | Export just flaggedAccounts, omit posts entirely | |

**User's choice:** Embedded in each account — posts grouped by owner, easiest to read and re-import.

### JSON scope

| Option | Description | Selected |
|--------|-------------|----------|
| All data (full backup) | Include flaggedAccounts, storedPosts, dailyStats, dismissedAccounts | |
| Accounts + posts only | Include only flaggedAccounts and storedPosts | ✓ |
| You decide | Pick whichever is simpler | |

**User's choice:** Accounts + posts only — dailyStats regenerate naturally; dismissedAccounts are implementation detail.

---

## Export Placement

| Option | Description | Selected |
|--------|-------------|----------|
| Dashboard only | Both export buttons and cleanse in dashboard page only | ✓ |
| Both dashboard and popup | Export buttons in both places | |

**User's choice:** Dashboard only — popup is already crowded from Phase 8 signal detail expansion.

### Cleanse UI location

| Option | Description | Selected |
|--------|-------------|----------|
| Dashboard only | Cleanse card on dashboard page | ✓ |
| Both dashboard and popup | Also add simplified cleanse to popup Settings | |

---

## CSV Columns

### Column set

| Option | Description | Selected |
|--------|-------------|----------|
| Core fields only | authorId, authorName, authorProfileUrl, peakScore, compositeScore, postCount, status, firstSeenAt | |
| Core + signals as JSON string | Core fields + signals column as serialised JSON | ✓ |
| Core + separate column per signal | Each signal gets its own column | |

**User's choice:** Core + signals as JSON string — keeps signal data accessible without exploding column count.

### Timestamp format

| Option | Description | Selected |
|--------|-------------|----------|
| ISO 8601 strings | Convert Unix ms to '2026-05-30T12:34:56.000Z' | ✓ |
| Unix ms (raw) | Leave as numeric timestamps | |

---

## Cleanse Scope & Date Logic

### Account date field

| Option | Description | Selected |
|--------|-------------|----------|
| firstSeenAt | Remove accounts first seen before the chosen date | |
| lastSeenAt | Remove accounts whose most recent flag was before the date | ✓ |
| You decide | Pick simpler implementation | |

**User's choice:** lastSeenAt — keeps recently-active accounts even if first seen long ago.

### dismissedAccounts

| Option | Description | Selected |
|--------|-------------|----------|
| Yes, wipe all dismissedAccounts | Full cleanse also clears the dismissed list | ✓ |
| No, keep dismissedAccounts | Dismissed entries are deliberate decisions | |
| You decide | Pick simpler implementation | |

**User's choice:** Wipe all dismissedAccounts on cleanse — user can re-dismiss if needed.

### dailyStats

| Option | Description | Selected |
|--------|-------------|----------|
| Yes, remove entries before date | Filter by DailyStats.date | |
| No, leave dailyStats alone | They auto-expire after 30 days anyway | ✓ |
| You decide | Pick simpler implementation | |

**User's choice:** Leave dailyStats alone — auto-expiry makes this unnecessary complexity.

---

## Dashboard Layout

### Export/Cleanse card structure

| Option | Description | Selected |
|--------|-------------|----------|
| Two separate cards | Export card, then Cleanse card | |
| Single combined 'Data management' card | One card with export at top, cleanse below | ✓ |
| You decide | Follow existing pattern | |

### Cleanse confirmation

| Option | Description | Selected |
|--------|-------------|----------|
| Count preview + confirm button on page | Live count, red Confirm button, no modal | |
| Count preview + window.confirm | Show count, then window.confirm() for destructive step | ✓ |
| You decide | Pick simplest | |

---

## File Naming Convention

| Option | Description | Selected |
|--------|-------------|----------|
| Date-stamped | linkedin-blocker-2026-05-30.json / .csv | ✓ |
| Static names | linkedin-blocker-export.json / .csv | |
| You decide | Pick simplest | |

---

## Claude's Discretion

- Whether to read `storedPosts` in the dashboard `useEffect` on mount or fetch at export click time — either is acceptable.

## Deferred Ideas

- Re-import from exported JSON — requires a full state restore flow, separate phase
- "Clear all data" nuclear option (all keys, regardless of date) — potential future popup setting
- Export to clipboard rather than file download
