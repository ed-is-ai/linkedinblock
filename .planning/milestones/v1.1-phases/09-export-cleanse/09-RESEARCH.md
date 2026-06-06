# Phase 9: Export & Cleanse — Research

**Researched:** 2026-05-30
**Domain:** Chrome MV3 extension dashboard — data export (JSON/CSV) and date-based storage cleanse
**Confidence:** HIGH (all claims derived from codebase inspection and well-established Web APIs)

---

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions

- **D-01:** storedPosts embedded inside each account as a `posts` field, joined by `authorId` at export time
- **D-02:** JSON export scope is flaggedAccounts + storedPosts only; dailyStats and dismissedAccounts excluded
- **D-03:** All Unix ms timestamps converted to ISO 8601 strings (`new Date(ts).toISOString()`) in both exports
- **D-04:** CSV columns (in order): `authorId, authorName, authorProfileUrl, peakScore, compositeScore, postCount, status, firstSeenAt, lastSeenAt, signals` — `signals` serialised as JSON string
- **D-05:** CSV header uses exact column names above; values with commas/quotes wrapped in double-quotes per RFC 4180; no post text in CSV
- **D-06:** Both export buttons and the cleanse control live only on the dashboard page — popup not touched
- **D-07:** Accounts removed from cleanse if `lastSeenAt` is before the chosen date
- **D-08:** `storedPosts` removed if `hiddenAt` is before the chosen date
- **D-09:** `dismissedAccounts` wiped entirely on cleanse (no timestamp filtering possible)
- **D-10:** `dailyStats` not touched by cleanse
- **D-11:** Cleanse UX: live count preview on date change + `window.confirm` before executing
- **D-12:** Single "Data management" card appended below existing stats cards; top section = Export (two buttons side-by-side), separator, bottom section = Cleanse (date picker + count preview + red Confirm button)
- **D-13:** Card uses existing `s.card` style (white background, `border: '1px solid #e5e7eb'`, `borderRadius: 8`, `padding: '20px 24px'`)
- **D-14:** File names: `linkedin-blocker-YYYY-MM-DD.json` and `linkedin-blocker-YYYY-MM-DD.csv` using today's UTC date
- **D-15:** Download via Blob + `<a download>` pattern

### Claude's Discretion

- Whether to add a `storedPosts` read to the dashboard `useEffect` or do a fresh `chrome.storage.local.get` at export click time — either is fine

### Deferred Ideas (OUT OF SCOPE)

- Re-import from exported JSON
- "Clear all data" nuclear option
- Export to clipboard
</user_constraints>

---

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|------------------|
| EXPORT-01 | Export all flagged accounts and stored posts as a JSON file from the dashboard | D-01/D-02: JSON shape confirmed; dashboard `useEffect` pattern confirmed; Blob+anchor verified |
| EXPORT-02 | Export as CSV (accounts only, flattened row per account) | D-04/D-05: column list confirmed; RFC 4180 escaping documented in Pitfalls |
| CLEANSE-01 | Clear flagged accounts, stored posts, dismissed list before a user-selected date | D-07/D-08/D-09: per-key logic confirmed; `storageGet`/`storageSet` wrappers available |
| CLEANSE-02 | Cleanse shows confirmation step with count of records before executing | D-11: live count preview + `window.confirm` pattern; count derivation logic documented |
</phase_requirements>

---

## Summary

Phase 9 adds a "Data management" card to the existing `src/dashboard/index.tsx` dashboard page. The card provides three controls: Export JSON, Export CSV, and a date-based Cleanse. No new files are needed — all work is additive to the single dashboard component.

The dashboard already loads `flaggedAccounts` and `dailyStats` on mount via `chrome.storage.local.get`. The `useEffect` call must be extended to also load `storedPosts` and `dismissedAccounts` so the cleanse count preview has the data it needs at date-input time. The export functions can use the in-memory state (avoiding a second storage read) or do a fresh fetch on click — either approach is safe because the dashboard does not live-update.

All download mechanics use the standard Blob + `<a download>` Web API pattern, which is fully supported in Chrome extension pages (dashboard.html is a regular HTML page — it is not a service worker or content script, so there are no MV3 restrictions on Blob URLs or anchor clicks). CSV requires careful RFC 4180 escaping because the `signals` column embeds a JSON string containing double-quotes and potentially commas.

**Primary recommendation:** Extend the existing `useEffect` to load all four storage keys on mount; use in-memory state for both exports and the cleanse count preview; write the cleanse as a single `storageSet` call that replaces all three affected keys atomically.

---

## Architectural Responsibility Map

| Capability | Primary Tier | Secondary Tier | Rationale |
|------------|-------------|----------------|-----------|
| Export JSON button | Browser (dashboard page) | — | Pure client-side: reads in-memory state, constructs Blob, triggers anchor click |
| Export CSV button | Browser (dashboard page) | — | Same as JSON; serialisation is in-page JS only |
| Cleanse count preview | Browser (dashboard page) | — | Derived from in-memory `storedPosts` + `accounts` state filtered by date |
| Cleanse execution | Browser (dashboard page) | chrome.storage.local | Page calls `storageSet` directly; no SW relay needed |
| `dismissedAccounts` wipe | Browser (dashboard page) | chrome.storage.local | Simple key removal; page owns this directly |

---

## Standard Stack

No new packages. Phase 9 uses only what is already installed.

### Core (already installed)
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| preact | 10.29.2 [VERIFIED: npm registry] | JSX UI framework | Already used throughout extension |
| preact/hooks | (bundled with preact) | `useState`, `useEffect` | Already used in dashboard |
| TypeScript | 6.0.3 [VERIFIED: npm registry] | Type safety | Project-wide, enforced by tsconfig |

### Web APIs (no install needed)
| API | Purpose | MV3 Availability |
|-----|---------|------------------|
| `Blob` | Wrap string content for download | Full support in extension pages [ASSUMED] |
| `URL.createObjectURL` | Create blob: URL for anchor | Full support in extension pages [ASSUMED] |
| `document.createElement('a')` | Programmatic download anchor | Full support in extension pages [ASSUMED] |
| `window.confirm` | Cleanse confirmation dialog | Full support in extension pages [ASSUMED] |
| `chrome.storage.local` | Read and write storage | MV3 standard |

### Alternatives Considered
| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| Blob+anchor | `chrome.downloads` API | `chrome.downloads` requires an extra manifest permission and shows in Chrome's download bar — unnecessary for simple file saves |
| `window.confirm` | Custom modal | Custom modal is more work; `window.confirm` is acceptable for a destructive action gated behind a dashboard |
| In-memory state for export | Fresh `storageGet` on click | Fresh fetch is slightly safer if the page has been open for hours, but adds async complexity; in-memory is fine for v1.1 |

**Installation:** None required.

---

## Package Legitimacy Audit

No new packages are installed in this phase. Section N/A.

---

## Architecture Patterns

### System Architecture Diagram

```
dashboard.html
  └─ src/dashboard/index.tsx (App component)
        │
        ├─ useEffect (mount)
        │    └─ chrome.storage.local.get(
        │         ['flaggedAccounts', 'dailyStats', 'storedPosts', 'dismissedAccounts'])
        │         → setAccounts / setStats / setPosts / setDismissed
        │
        ├─ existing stats cards (unchanged)
        │
        └─ NEW: Data management card
              ├─ Export JSON button
              │    └─ buildJson(accounts, posts) → Blob → anchor click
              ├─ Export CSV button
              │    └─ buildCsv(accounts) → Blob → anchor click
              └─ Cleanse section
                   ├─ <input type="date"> → onInput → derive count preview
                   │    (filter accounts by lastSeenAt, posts by hiddenAt)
                   ├─ Count preview label (live)
                   └─ Confirm cleanse button
                        └─ window.confirm → storageSet({ flaggedAccounts, storedPosts, dismissedAccounts })
                                          → setAccounts / setPosts / setDismissed (local state update)
```

### Recommended Project Structure

No new files. All additions are within:
```
src/dashboard/
└── index.tsx     ← only file modified
```

### Pattern 1: Extend useEffect to load storedPosts and dismissedAccounts

**What:** Add two keys to the existing `chrome.storage.local.get` call on mount.
**When to use:** Required — cleanse count preview needs both arrays in state.

```typescript
// Source: src/dashboard/index.tsx (existing pattern, extended)
useEffect(() => {
  chrome.storage.local.get([
    'flaggedAccounts', 'dailyStats', 'storedPosts', 'dismissedAccounts'
  ]).then((result) => {
    const accts = Object.values(
      (result.flaggedAccounts ?? {}) as Record<string, FlaggedAccount>
    );
    setAccounts(accts);
    setStats((result.dailyStats ?? []) as DailyStats[]);
    setPosts((result.storedPosts ?? []) as StoredPost[]);
    setDismissed((result.dismissedAccounts ?? []) as string[]);
  });
}, []);
```

### Pattern 2: Blob + anchor download

**What:** Standard Web API pattern for triggering file downloads from JavaScript strings.
**When to use:** Both JSON and CSV exports.

```typescript
// Source: D-15 (CONTEXT.md — exact pattern locked by user)
function triggerDownload(content: string, filename: string, mimeType: string): void {
  const blob = new Blob([content], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}
```

### Pattern 3: JSON export builder

**What:** Join flaggedAccounts with storedPosts by authorId, convert timestamps to ISO strings.
**When to use:** "Export JSON" button handler.

```typescript
// Source: codebase inspection (types.ts fields verified)
function buildJsonExport(
  accounts: FlaggedAccount[],
  posts: StoredPost[]
): string {
  const postsByAuthor: Record<string, StoredPost[]> = {};
  for (const p of posts) {
    (postsByAuthor[p.authorId] ??= []).push(p);
  }

  const payload = {
    exportedAt: new Date().toISOString(),
    flaggedAccounts: accounts.map(a => ({
      ...a,
      firstSeenAt: new Date(a.firstSeenAt).toISOString(),
      lastSeenAt: new Date(a.lastSeenAt).toISOString(),
      posts: (postsByAuthor[a.authorId] ?? []).map(p => ({
        urn: p.urn,
        score: p.score,
        text: p.text,
        hiddenAt: new Date(p.hiddenAt).toISOString(),
      })),
    })),
  };

  return JSON.stringify(payload, null, 2);
}
```

### Pattern 4: CSV export builder with RFC 4180 escaping

**What:** One row per account; `signals` column serialised as JSON string and properly escaped.
**When to use:** "Export CSV" button handler.

```typescript
// Source: D-04/D-05 (CONTEXT.md — columns and escaping rules locked)
function csvEscape(value: string | number): string {
  const str = String(value);
  // RFC 4180: if field contains comma, double-quote, or newline — wrap in double-quotes
  // and escape any internal double-quotes by doubling them
  if (str.includes(',') || str.includes('"') || str.includes('\n') || str.includes('\r')) {
    return '"' + str.replace(/"/g, '""') + '"';
  }
  return str;
}

function buildCsvExport(accounts: FlaggedAccount[]): string {
  const headers = [
    'authorId', 'authorName', 'authorProfileUrl',
    'peakScore', 'compositeScore', 'postCount',
    'status', 'firstSeenAt', 'lastSeenAt', 'signals',
  ];
  const rows = accounts.map(a => [
    a.authorId,
    a.authorName,
    a.authorProfileUrl,
    a.peakScore,
    Math.round(a.compositeScore),  // EMA float → integer for readability
    a.postCount,
    a.status,
    new Date(a.firstSeenAt).toISOString(),
    new Date(a.lastSeenAt).toISOString(),
    JSON.stringify(a.signals),     // embedded JSON — contains " and : which trigger RFC 4180 quoting
  ].map(csvEscape).join(','));

  return [headers.join(','), ...rows].join('\r\n');  // RFC 4180 requires CRLF
}
```

### Pattern 5: Cleanse count derivation and execution

**What:** Filter accounts by `lastSeenAt`, posts by `hiddenAt`, then write back filtered arrays.
**When to use:** Date input `onInput` (count preview) and Confirm cleanse handler.

```typescript
// Source: D-07, D-08, D-09, D-10 (CONTEXT.md — cleanse logic locked)
function deriveCleanseCount(
  accounts: FlaggedAccount[],
  posts: StoredPost[],
  beforeDateStr: string  // 'YYYY-MM-DD' from <input type="date">
): { accountCount: number; postCount: number } {
  const cutoffMs = new Date(beforeDateStr).getTime();
  // Note: new Date('YYYY-MM-DD') parses as midnight UTC — compare against UTC timestamps
  return {
    accountCount: accounts.filter(a => a.lastSeenAt < cutoffMs).length,
    postCount: posts.filter(p => p.hiddenAt < cutoffMs).length,
  };
}

async function executeClean(
  accounts: FlaggedAccount[],
  posts: StoredPost[],
  beforeDateStr: string,
  setAccounts: (a: FlaggedAccount[]) => void,
  setPosts: (p: StoredPost[]) => void,
  setDismissed: (d: string[]) => void,
): Promise<void> {
  const cutoffMs = new Date(beforeDateStr).getTime();
  const keptAccounts: Record<string, FlaggedAccount> = {};
  for (const a of accounts.filter(a => a.lastSeenAt >= cutoffMs)) {
    keptAccounts[a.authorId] = a;
  }
  const keptPosts = posts.filter(p => p.hiddenAt >= cutoffMs);

  await chrome.storage.local.set({
    flaggedAccounts: keptAccounts,
    storedPosts: keptPosts,
    dismissedAccounts: [],   // D-09: always wiped entirely
  });

  // Update local state so UI reflects the change without a page reload
  setAccounts(Object.values(keptAccounts));
  setPosts(keptPosts);
  setDismissed([]);
}
```

### Pattern 6: useState for cleanse UI state

**What:** Two pieces of state — the date string and computed count preview.
**When to use:** Cleanse section of the Data Management card.
**Follows:** Existing `timeWindow` useState pattern already in the dashboard.

```typescript
const [cleanseDate, setCleanseDate] = useState<string>('');
const [cleansePreview, setCleansePreview] = useState<{ accountCount: number; postCount: number } | null>(null);
```

### Anti-Patterns to Avoid

- **`new Date('YYYY-MM-DD').getTime()` timezone trap:** `new Date('2026-05-01')` parses as midnight UTC, which is correct for comparison against Unix ms timestamps that are also UTC. Do NOT use `new Date(beforeDateStr + 'T00:00:00')` (local time) — it will produce wrong cutoffs in non-UTC timezones.
- **`compositeScore` as a float in CSV:** It is an EMA rolling average and may be a float (e.g. `72.4`). Round to an integer with `Math.round()` before emitting — this is cleaner for spreadsheet consumers and does not lose meaningful precision.
- **Not revoking the object URL:** Always call `URL.revokeObjectURL(url)` after the anchor click. Failing to revoke leaks a Blob reference in memory for the lifetime of the page.
- **Appending anchor to DOM before clicking:** The pattern in D-15 does NOT append the anchor to the document — it calls `.click()` directly. This works in Chrome and avoids leaving stale anchor elements in the DOM.
- **`storageRemove` vs `storageSet` for cleanse:** Do NOT use `storageRemove` for flaggedAccounts or storedPosts — that would delete the entire key. Use `storageSet` with the filtered subset, which replaces the key with the reduced data.
- **Mutating `accounts` state array:** Never mutate the `accounts` array in place. Filter produces a new array — pass the new array to both `storageSet` and `setAccounts`.

---

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| RFC 4180 CSV quoting | Custom regex replace | The `csvEscape` function in Pattern 4 (20 lines) | Doubles internal quotes AND handles newlines — easy to miss one case |
| File download | `XMLHttpRequest` to a server | Blob + anchor (D-15) | No server available; Blob is the correct client-only approach |
| Storage typed access | Direct `chrome.storage.local.get` with `any` casts | `storageGet` / `storageSet` wrappers from `src/shared/storage.ts` | Already typed against `StorageSchema`; import the wrappers |

**Key insight:** CSV escaping is the highest-risk hand-roll in this phase. The signals field contains `{"listicle":25,"buzzwords":15}` which has both double-quotes and colons. `csvEscape()` must double the internal quotes AND wrap the entire field — both transformations must happen in the correct order (stringify signals first, then pass the string to csvEscape).

---

## Common Pitfalls

### Pitfall 1: UTC midnight vs local midnight in cleanse cutoff

**What goes wrong:** The date input returns `'YYYY-MM-DD'`. Passing it to `new Date()` creates midnight UTC. The stored timestamps (`lastSeenAt`, `hiddenAt`) are `Date.now()` values — also UTC ms. These comparisons are therefore consistent.

**Why it happens:** Developers expect `new Date('2026-05-01')` to produce local midnight, but the spec defines date-only strings as UTC. This is actually the correct behaviour for this project — but only because the stored timestamps are UTC ms. If a developer adds `'T00:00:00'` to force local time, the comparison breaks in non-UTC timezones.

**How to avoid:** Use `new Date(beforeDateStr).getTime()` exactly. Add a comment explaining UTC parsing is intentional.

**Warning signs:** Cleanse preview counts are off by one day in certain timezones.

### Pitfall 2: signals JSON-inside-CSV double-encoding

**What goes wrong:** `JSON.stringify(a.signals)` produces `{"listicle":25}`. Passing this to a naive `csvEscape` that only wraps with quotes produces `"{"listicle":25}"` — not valid because the internal `"` characters are not doubled.

**Why it happens:** The signals value contains embedded double-quotes (from JSON). RFC 4180 requires internal double-quotes to be escaped as `""`. Without doubling, the CSV is malformed.

**How to avoid:** In `csvEscape`, do `str.replace(/"/g, '""')` BEFORE wrapping in outer quotes. The Pattern 4 implementation above does this correctly.

**Warning signs:** Opening the CSV in Excel/LibreOffice shows the signals column truncated or merged with the next column.

### Pitfall 3: dismissedAccounts is an array, not a Record

**What goes wrong:** Developer assumes dismissedAccounts is a `Record<string, ...>` (like flaggedAccounts) and tries to filter it by timestamp. There is no timestamp on dismissed entries — D-09 mandates wiping it entirely.

**Why it happens:** flaggedAccounts is a `Record<string, FlaggedAccount>`. dismissedAccounts is `string[]` (authorId strings only, per `StorageSchema`). The types are different.

**How to avoid:** In `executeClean`, always write `dismissedAccounts: []` unconditionally. Do not attempt to filter.

**Warning signs:** TypeScript compile error if you try to access `.lastSeenAt` on elements of `dismissedAccounts`.

### Pitfall 4: chrome.storage.local 10 MB quota

**What goes wrong:** `chrome.storage.local` has a 10 MB quota [ASSUMED — well-known Chrome limit, not re-verified against current docs]. A user with many accounts and 200 stored posts may be near this limit. Export and cleanse are unaffected (they only read and delete), but a future import feature would need to check quota.

**Why it happens:** Preact dashboard reads storage on mount — if storage is near 10 MB, the read itself is fine. Only writes can fail.

**How to avoid:** Phase 9 only reads and deletes — no quota risk. Note for future: a re-import feature would need a quota check before writing.

**Warning signs:** Not applicable to Phase 9.

### Pitfall 5: empty state (no accounts in storage)

**What goes wrong:** `flaggedAccounts` is `undefined` or `{}` on first install. Export buttons produce an empty file. Cleanse preview shows "Will remove 0 accounts, 0 posts" even with a date selected.

**Why it happens:** No accounts have been flagged yet. This is valid runtime state.

**How to avoid:** Both export functions must handle empty arrays gracefully. JSON export with 0 accounts still produces valid JSON (`{"exportedAt":"...","flaggedAccounts":[]}`). CSV export with 0 accounts still produces a valid CSV (header row only). Count preview of 0 is accurate and acceptable.

**Warning signs:** Not a bug — just an edge case to confirm works. Write a mental test: export with empty accounts should not throw.

### Pitfall 6: `new Date(beforeDateStr)` when cleanseDate is empty string

**What goes wrong:** `new Date('').getTime()` returns `NaN`. If the Confirm cleanse button is somehow clicked before a date is set (or the preview is 0), `NaN < anything` is always `false` — the cleanse would delete nothing. This is safe-by-default but confusing.

**Why it happens:** Cleanse button may not be properly disabled when `cleanseDate === ''`.

**How to avoid:** Disable the Confirm cleanse button when `cleanseDate === ''`. Also guard in `executeClean`: if `!cleanseDate` return early. The count preview label should only show when `cleanseDate !== ''`.

**Warning signs:** Confirm cleanse button clickable with no date selected.

---

## Code Examples

### Reading all four storage keys on mount

```typescript
// Source: src/dashboard/index.tsx (existing pattern extended — verified by codebase inspection)
// Add storedPosts + dismissedAccounts to the existing get call
const [posts, setPosts] = useState<StoredPost[]>([]);
const [dismissed, setDismissed] = useState<string[]>([]);

useEffect(() => {
  chrome.storage.local.get([
    'flaggedAccounts', 'dailyStats', 'storedPosts', 'dismissedAccounts'
  ]).then((result) => {
    // existing code...
    setAccounts(accts);
    setStats((result.dailyStats ?? []) as DailyStats[]);
    // new:
    setPosts((result.storedPosts ?? []) as StoredPost[]);
    setDismissed((result.dismissedAccounts ?? []) as string[]);
  });
}, []);
```

### Date input with live count preview

```typescript
// Source: D-11 (CONTEXT.md), adapted to Preact onInput pattern
<input
  type="date"
  style={{ ...existing date input style... }}
  value={cleanseDate}
  onInput={(e) => {
    const d = (e.target as HTMLInputElement).value;
    setCleanseDate(d);
    if (d) {
      setCleansePreview(deriveCleanseCount(accounts, posts, d));
    } else {
      setCleansePreview(null);
    }
  }}
/>
{cleansePreview !== null && (
  <div style={s.statSub}>
    Will remove {cleansePreview.accountCount} account(s) and {cleansePreview.postCount} post(s)
  </div>
)}
```

### Confirm cleanse button handler

```typescript
// Source: D-11 (CONTEXT.md — exact window.confirm message locked)
const handleClean = async () => {
  if (!cleanseDate || !cleansePreview) return;
  const { accountCount, postCount } = cleansePreview;
  const ok = window.confirm(
    `Delete ${accountCount} account(s), ${postCount} post(s), and all dismissed entries? This cannot be undone.`
  );
  if (!ok) return;
  await executeClean(accounts, posts, cleanseDate, setAccounts, setPosts, setDismissed);
  setCleanseDate('');
  setCleansePreview(null);
};
```

### File naming (today's UTC date)

```typescript
// Source: D-14 (CONTEXT.md — pattern locked)
const today = new Date().toISOString().slice(0, 10); // 'YYYY-MM-DD'
const jsonFilename = `linkedin-blocker-${today}.json`;
const csvFilename  = `linkedin-blocker-${today}.csv`;
```

### Card layout skeleton (JSX)

```tsx
// Source: D-12/D-13 (CONTEXT.md — layout and style locked)
<div style={s.card}>
  <div style={s.statLabel}>Export data</div>
  <div style={{ display: 'flex', gap: 8, marginTop: 8 }}>
    <button onClick={handleExportJson}>Export JSON</button>
    <button onClick={handleExportCsv}>Export CSV</button>
  </div>
  <hr style={{ margin: '16px 0', border: 'none', borderTop: '1px solid #e5e7eb' }} />
  <div style={s.statLabel}>Cleanse data before:</div>
  <input type="date" ... />
  {cleansePreview !== null && <div style={s.statSub}>Will remove ...</div>}
  <button
    disabled={!cleanseDate}
    onClick={handleClean}
    style={{ ... destructive/red style ... }}
  >Confirm cleanse</button>
</div>
```

---

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| `URL.createObjectURL` with manual cleanup | Same — still correct | N/A | Pattern is stable; no newer alternative needed |
| `chrome.downloads` API for extension downloads | Blob+anchor for simple downloads | MV3 era | `chrome.downloads` adds a manifest permission; Blob+anchor requires none |

**Deprecated/outdated:**
- Appending anchor to `document.body` before clicking: Some older tutorials do `document.body.appendChild(a); a.click(); document.body.removeChild(a)`. This is unnecessary in Chrome — `.click()` works without DOM insertion. The D-15 pattern (no append) is correct.

---

## Assumptions Log

| # | Claim | Section | Risk if Wrong |
|---|-------|---------|---------------|
| A1 | Blob + `URL.createObjectURL` + anchor `.click()` works without DOM append in Chrome extension pages | Architecture Patterns — Pattern 2 | Download silently fails; fix: append anchor to body before clicking |
| A2 | `window.confirm` is available in dashboard extension pages (chrome-extension:// scheme) | Architecture Patterns | Confirm dialog blocked; fix: implement a custom confirmation UI element |
| A3 | `chrome.storage.local` quota is 10 MB | Pitfall 4 | Higher or lower limit; Phase 9 is read/delete-only so this has zero impact on this phase |
| A4 | RFC 4180 CRLF line endings (`\r\n`) are required for maximum spreadsheet compatibility | Pattern 4 | LF-only files open correctly in most tools; CRLF is the safer default |

**Note on A1 and A2:** Both are well-established Chrome extension patterns that have worked since MV2 and continue to work in MV3 dashboard pages (chrome-extension:// pages are full HTML pages, not restricted contexts like service workers). The `[ASSUMED]` tag reflects that they were not re-verified against current Chrome 2026 documentation in this session.

---

## Open Questions (RESOLVED)

1. **`compositeScore` precision in CSV**
   - What we know: `compositeScore` is an EMA float (e.g. `72.4`)
   - What's unclear: Should it be rounded or emitted as a float?
   - Recommendation: Round to nearest integer with `Math.round()` — consistent with how scores are displayed in the popup (integer display), avoids spurious precision in spreadsheets

2. **Cleanse: should dismissed accounts that match the date filter be preserved or wiped?**
   - What we know: D-09 says wipe entirely — no timestamp on dismissed entries
   - What's unclear: Nothing — this is locked by D-09. Documented here for implementer awareness.
   - Recommendation: Always write `dismissedAccounts: []` on any cleanse, regardless of date or count.

3. **Post-cleanse UI state reset**
   - What we know: After cleanse, local state must update to reflect the deletion
   - What's unclear: Should the time-window stats cards also re-render?
   - Recommendation: Reset `setAccounts`, `setPosts`, `setDismissed` in-place after cleanse. The stats cards derive from `accounts` state — they will auto-update because Preact re-renders on state change. No special handling needed.

---

## Environment Availability

| Dependency | Required By | Available | Version | Fallback |
|------------|------------|-----------|---------|----------|
| Node.js | Build (Vite) | ✓ | v26.1.0 | — |
| TypeScript | Build | ✓ | 6.0.3 | — |
| Preact | Dashboard UI | ✓ | 10.29.2 | — |
| chrome.storage.local | Data read/write | ✓ (extension context) | MV3 | — |
| Blob / URL.createObjectURL | Export download | ✓ (browser built-in) | Standard | — |

No missing dependencies.

---

## Security Domain

`security_enforcement` is not set to false in `.planning/config.json` — this section is included.

### Applicable ASVS Categories

| ASVS Category | Applies | Standard Control |
|---------------|---------|-----------------|
| V2 Authentication | No | — |
| V3 Session Management | No | — |
| V4 Access Control | No | — |
| V5 Input Validation | Partial | `cleanseDate` from `<input type="date">` is browser-validated to `YYYY-MM-DD` format; `new Date(cleanseDate)` handles invalid values gracefully (NaN guard in executeClean) |
| V6 Cryptography | No | — |

### Known Threat Patterns for This Stack

| Pattern | STRIDE | Standard Mitigation |
|---------|--------|---------------------|
| Export leaks stored post text to filesystem | Information Disclosure | Phase 9 JSON export includes stored post text — this is intentional (user opt-in, v1.1). CSV explicitly excludes post text per D-05. Document in comments. |
| Cleanse with invalid date deletes nothing (NaN guard) | Tampering | Guard in executeClean: `if (!cleanseDate) return` before any storage write. |
| Blob URL persists after download | Information Disclosure | Always call `URL.revokeObjectURL(url)` immediately after `.click()` — Pattern 2 does this. |

**No new attack surface:** All operations are local to the user's own browser storage. There is no network transmission, no server endpoint, and no cross-origin communication in this phase.

---

## Sources

### Primary (HIGH confidence)
- `src/dashboard/index.tsx` — Existing App component, `s` styles, `useEffect` pattern, `useState` usage, card JSX (codebase inspection)
- `src/shared/types.ts` — `FlaggedAccount`, `StoredPost`, `StorageSchema` — all fields confirmed (codebase inspection)
- `src/shared/storage.ts` — `storageGet`/`storageSet` typed wrappers (codebase inspection)
- `src/shared/postStore.ts` — confirms `hiddenAt` field is `Date.now()` Unix ms (codebase inspection)
- `src/shared/queue.ts` — confirms `firstSeenAt`/`lastSeenAt` are `Date.now()` Unix ms (codebase inspection)
- `.planning/phases/09-export-cleanse/09-CONTEXT.md` — all locked decisions (D-01 through D-15)

### Secondary (MEDIUM confidence)
- RFC 4180 (CSV standard) — CSV quoting rules, CRLF line endings — well-established standard, applied from training knowledge

### Tertiary (LOW confidence — [ASSUMED])
- Blob + anchor download pattern in Chrome extension pages — confirmed to work in MV2/MV3 by broad community knowledge; not re-verified against 2026 Chrome docs in this session
- `window.confirm` availability in `chrome-extension://` pages — same caveat

---

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH — no new packages; existing stack verified by inspection
- Architecture: HIGH — single file, additive; existing patterns fully understood
- Pitfalls: HIGH — CSV escaping and UTC date parsing pitfalls are deterministic; edge cases derived from type inspection
- Blob+anchor and window.confirm: MEDIUM — [ASSUMED] tags applied; well-established patterns

**Research date:** 2026-05-30
**Valid until:** 2026-08-30 (stable Web APIs; Chrome extension page behaviour changes rarely)
