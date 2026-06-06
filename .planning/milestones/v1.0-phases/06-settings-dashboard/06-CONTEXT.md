# Phase 6: Settings & Dashboard — Context

**Gathered:** 2026-05-29
**Status:** Ready for planning

<domain>
## Phase Boundary

1. **Configurable threshold** (CONFIG-01): `AUTO_HIDE_THRESHOLD` is currently hardcoded at 60. Phase 6 reads it from `chrome.storage.local` at content script init and saves it via a slider in the popup's Settings section. Changing the value immediately affects which new posts are hidden.

2. **Dashboard** (DASH-01, DASH-02, DASH-03): A dedicated extension page (`src/dashboard/`) showing:
   - Percentage of posts seen that were flagged in the selected time window
   - Signal category breakdown: "AI language" signals vs "bot behaviour" signals
   - 7-day / 30-day time window toggle (client-side, no page reload)

**Not in Phase 6:**
- Retroactively re-scoring already-hidden posts when threshold changes — only new posts use the new threshold
- Per-account signal tuning
- Export / share / cloud sync

</domain>

<decisions>
## Implementation Decisions

### Threshold Storage

- **D-01:** Add `settings?: { autoHideThreshold: number }` to `StorageSchema`. Default: 60 when the key is absent (preserves current behaviour on first install).

- **D-02:** Content script reads `settings.autoHideThreshold` at `init()` alongside `anthropicApiKey`. The local `const AUTO_HIDE_THRESHOLD = 60` is replaced with the stored value (or 60 default). `FLAG_THRESHOLD = 35` remains hardcoded — it is not user-configurable.

- **D-03:** The popup slider saves on `onInput` (no Save button needed). Writes `{ settings: { autoHideThreshold: value } }` to storage. The next post the content script processes uses the new value from its already-loaded variable — content script re-reads on every page load (SPA-safe since `init()` runs once per navigation).

### Stats Tracking

- **D-04:** Add `dailyStats?: DailyStats[]` to `StorageSchema`. Each entry covers one calendar day (UTC date `'YYYY-MM-DD'`). Rolling 30-entry max — entries older than 30 days are pruned on write.

- **D-05:** `DailyStats` interface:
  ```typescript
  interface DailyStats {
    date: string;   // 'YYYY-MM-DD' UTC
    seen: number;   // posts entering the scoring pipeline (after exclusions)
    hidden: number; // posts with score >= effectiveHideThreshold
  }
  ```

- **D-06:** Content script tracks `seenToday` and `hiddenToday` as module-scope counters, reset on SPA navigation. On every `POST_HIDDEN` event (i.e. when hiding a post), it flushes both counters to today's `DailyStats` entry via a `writeDailyStats()` helper. `seen` is incremented on every post that passes exclusion and enters the detect pipeline (before the score threshold check).

- **D-07:** `writeDailyStats()` is a simple helper in `content/index.ts`: reads the current `dailyStats` array, finds-or-creates today's entry, updates `seen` and `hidden`, prunes entries older than 30 days, writes back. Only called when a post is hidden (not on every post seen) — write frequency is proportional to the hide rate, which is acceptable.

- **D-08:** Signal breakdown for the dashboard is derived **at display time** from `flaggedAccounts` entries whose `firstSeenAt` falls within the selected window. No separate signal counters needed in `DailyStats`.

### Dashboard Page

- **D-09:** Dashboard is a new Preact entry point at `src/dashboard/index.html` + `src/dashboard/index.tsx`. Registered in `manifest.json` under `options_ui: { page: "dashboard/index.html", open_in_tab: true }`. `vite-plugin-web-extension` automatically picks it up.

- **D-10:** A "📊 Dashboard" text link is added in the popup footer (below the Settings details element) that opens the dashboard via `chrome.runtime.getURL('dashboard/index.html')` in a new tab.

- **D-11:** Dashboard reads `flaggedAccounts` and `dailyStats` once on mount. No live updates via `onChanged` — user can reload the page if they want fresh data.

### Signal Categories

- **D-12:** Two category groups:
  - **AI language** (content signals): keys starting with or matching — `listicle`, `cta`, `buzzwords`, `em-dash`, `ai-vocab`, `generic-comments`, `hook-story`, `motivational`, `template`
  - **Bot behaviour** (profile/engagement signals): `degree-3`, `headline-formula`, `open-to-work`, `engagement-ratio`, any signal not in the AI-language set

- **D-13:** Category membership is determined in the dashboard by a `Set<string>` constant (`AI_LANGUAGE_SIGNALS`). Any signal not in the set is treated as "bot behaviour". This is forward-compatible with new signals.

### Popup Settings UI

- **D-14:** Add to the existing `<details>⚙ Settings</details>` section (above the API key fields):
  - Label: "Hide posts scoring above:"
  - `<input type="range">` min=35 max=90 step=5 defaultValue=60
  - Numeric display of current value (e.g. `60 / 100`)

- **D-15:** Read threshold from storage in the existing API-key `useEffect` (or a separate one). Save on `onInput` immediately (no debounce needed — writes are infrequent as the user drags).

</decisions>

<canonical_refs>
## Canonical References

- `.planning/REQUIREMENTS.md` — CONFIG-01, DASH-01, DASH-02, DASH-03
- `.planning/ROADMAP.md` §Phase 6 — success criteria
- `src/shared/types.ts` — `StorageSchema` (add `settings`, `dailyStats`); `FlaggedAccount` (signal breakdown source for dashboard)
- `src/content/index.ts` — `AUTO_HIDE_THRESHOLD` (line 23), `FLAG_THRESHOLD` (line 24), init() flow, `startObserving` callback
- `src/popup/index.tsx` — existing `<details>⚙ Settings</details>` section; `useEffect` pattern for storage reads
- `src/manifest.json` — add `options_ui`

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Patterns
- Popup `useEffect` + `chrome.storage.local.get` pattern — copy for threshold read
- Popup `chrome.storage.local.set` pattern — copy for threshold save
- Content script `storageGet` wrapper — use for threshold read at init
- `injectTombstone` pattern in tombstone.ts — reference for new dashboard entry point style

### New Files
- `src/dashboard/index.html` — bare HTML shell (same as popup/index.html)
- `src/dashboard/index.tsx` — Preact App with stats display and time-window toggle

### Integration Points
- `src/content/index.ts` line 23: `const AUTO_HIDE_THRESHOLD = 60` → replaced with value from storage
- `src/manifest.json`: add `options_ui` key
- `src/shared/types.ts`: add `Settings`, `DailyStats`, update `StorageSchema`

</code_context>

<specifics>
## Specific Ideas

- `writeDailyStats` helper: today's date via `new Date().toISOString().slice(0, 10)` (UTC)
- Dashboard time window toggle: `const [window, setWindow] = useState<7 | 30>(7)` — no page reload
- % calculation: `(hiddenInWindow / seenInWindow * 100).toFixed(1)` — show 1 decimal place
- Signal category bar: two horizontal bars (AI language count vs bot behaviour count) using CSS width percentages
- Dashboard width: full tab page (unlike popup's 280px constraint)

</specifics>

<deferred>
## Deferred

- Per-account threshold overrides
- "Never flag this person" from dashboard
- Historical trend charts
- Export to CSV

</deferred>

---

*Phase: 6 — Settings & Dashboard*
*Context gathered: 2026-05-29*
