# Roadmap — LinkedIn Blocker

**Project:** LinkedIn Blocker (Chrome MV3)
**Milestone:** v1 — Clean Feed, v1.1 — UX & Data, v1.2 — Feed Insights & Export, v2 — CWS Release
**Granularity:** Coarse
**Created:** 2026-05-25

---

## Phases

- [x] **Phase 1: Foundation** — MutationObserver, selector registry, SPA navigation handling, MV3 scaffolding *(completed 2026-05-25)*
- [x] **Phase 2: Detection Engine** — Heuristic scoring, post exclusions, CSS hiding, pluggable detector interface *(completed 2026-05-29)*
- [x] **Phase 3: Storage & Queue** — Persist flagged accounts with rolling scores across sessions *(completed 2026-05-29)*
- [x] **Phase 4: Popup UI** — Preact read-only list of flagged accounts with signal breakdown
- [x] **Phase 5: User Decisions** — Block deep link, dismiss false positives, service worker badge relay
- [x] **Phase 6: Settings & Dashboard** — Configurable threshold, 7/30-day rolling stats by signal category

---

## Phase Details

**Plans:** 4 plans

  - [x] 01-01-PLAN.md — Project scaffold (Vite + vite-plugin-web-extension + MV3 manifest + D-04 layout) — INFRA-01
  - [x] 01-02-PLAN.md — Live LinkedIn DOM inspection prerequisite — captures verified selectors
  - [x] 01-03-PLAN.md — Selector registry + shared types + typed chrome.storage.local wrapper — INFRA-03, INFRA-04
  - [x] 01-04-PLAN.md — MutationObserver + SPA navigation handler + content script wiring — INFRA-02, INFRA-05

### Phase 2: Detection Engine

**Goal**: Posts are automatically scored and hidden in the feed when they exceed the bot-probability threshold, with per-signal scores stored
**Depends on**: Phase 1
**Requirements**: DETECT-01, DETECT-02, DETECT-03, DETECT-04, DETECT-05, DETECT-06, DETECT-07, FEED-01, FEED-02, FEED-03, CONFIG-02
**Success Criteria** (what must be TRUE):

  1. A known AI-pattern post (listicle + buzzwords + generic CTA) is hidden in the feed before the user scrolls past it
  2. Sponsored posts and company-page posts are never hidden, even when their text matches AI patterns
  3. Non-English posts are never hidden
  4. The extension icon badge shows an incrementing count of hidden posts as the feed scrolls
  5. Per-signal scores (buzzword density, em-dash frequency, listicle structure, CTA match, headline pattern) are stored alongside the composite score and are individually inspectable**Plans**: 4 plans

**Wave 1**

  - [x] 02-01-PLAN.md — Foundations: extend selector registry, expand shared types (signalBreakdown, FlaggedAccountStub, ObservedPost), upgrade observer to extract full PostData incl. reshare-aware postText — DETECT-05, DETECT-06 (interface), FEED-03, CONFIG-02
  - [x] 02-02-PLAN.md — Pure signal functions (listicle, buzzwords, em-dash, CTA, generic comments) + non-English exclusion + fast-levenshtein install — DETECT-01, DETECT-04, DETECT-07

**Wave 2** *(blocked on Wave 1 completion)*

  - [x] 02-03-PLAN.md — HeuristicDetector class, exclusions guard, tombstone + comment-expand DOM utilities — DETECT-02, DETECT-03, DETECT-05, DETECT-06, DETECT-07, CONFIG-02, FEED-01

**Wave 3** *(blocked on Wave 2 completion)*

  - [x] 02-04-PLAN.md — Content script pipeline wiring + SW badge handler + live LinkedIn verification — FEED-01, FEED-02, FEED-03, DETECT-05, CONFIG-02

**UI hint**: yes

### Phase 3: Storage & Queue

**Goal**: Flagged account data survives browser restarts and service worker terminations, and accumulates correctly across multiple sessions
**Depends on**: Phase 2
**Requirements**: QUEUE-01, QUEUE-02
**Success Criteria** (what must be TRUE):

  1. After flagging accounts in one browser session, closing and reopening Chrome still shows those accounts in the review queue
  2. Each flagged account entry in storage contains: account ID, display name, profile URL, post count seen, signals that fired, composite score, and first-seen timestamp
  3. Accounts accumulate a rolling score across sessions — a second high-scoring post from the same account increases their stored score

**Plans**: 3 plans

**Wave 1** *(parallel — no cross-plan file conflicts)*

  - [x] 03-01-PLAN.md — Type expansions: FlaggedAccountStub → FlaggedAccount (add postCount + peakScore), StorageSchema adds dismissedAccounts — QUEUE-01, QUEUE-02
  - [x] 03-02-PLAN.md — Profile signal functions + selectors: AUTHOR_HEADLINE + CONNECTION_DEGREE in selectors.ts, profile.ts with checkHeadlineFormula + checkConnectionDegree + extractProfileSignals — DETECT-06

**Wave 2** *(blocked on Wave 1 completion)*

  - [x] 03-03-PLAN.md — Queue rewrite (EMA rolling score, peakScore, postCount, 500-cap eviction) + content/index.ts wiring (dismissedSet guard, profile signal cache + merge, SPA reset) — QUEUE-01, QUEUE-02, DETECT-06

### Phase 4: Popup UI

**Goal**: Users can open the extension popup and immediately see which accounts have been flagged, with enough signal detail to make a review decision
**Depends on**: Phase 3
**Requirements**: POPUP-01, POPUP-02, POPUP-03
**Success Criteria** (what must be TRUE):

  1. Opening the popup shows a list of flagged accounts sorted by peak score, with no manual refresh needed
  2. Each account row displays the account name, the signals that fired, the composite score, and the number of posts seen
  3. When a new account is flagged while the popup is open, it appears in the list without the user needing to close and reopen the popup

**Plans**: 2 plans

**Wave 1**

  - [x] 04-01-PLAN.md — AccountRow presentational component: author link, peakScore, compositeScore (avg), postCount, signal chips (max 4 + overflow) — POPUP-02

**Wave 2** *(blocked on Wave 1 completion)*

  - [x] 04-02-PLAN.md — App rewrite: flaggedAccounts state, storage read on mount, chrome.storage.onChanged live updates, pending filter + sort by peakScore DESC, empty state, details/summary API key wrapper — POPUP-01, POPUP-02, POPUP-03

**UI hint**: yes

### Phase 5: User Decisions

**Goal**: Users can resolve flagged accounts from the popup — either blocking them on LinkedIn or dismissing them as false positives — and those decisions persist
**Depends on**: Phase 4
**Requirements**: ACTION-01, ACTION-02
**Success Criteria** (what must be TRUE):

  1. Clicking Block on a flagged account opens LinkedIn's block/report overlay URL in a new tab, allowing the user to complete the block in LinkedIn's own UI
  2. Clicking Dismiss removes the account from the popup list and prevents it from being re-flagged in future sessions
  3. After a dismiss action, the badge count decrements and previously hidden posts from that account become visible in the feed again

**Plans**: 2 plans

**Wave 1** *(parallel — no cross-plan file conflicts)*

  - [x] 05-01-PLAN.md — Popup: AccountRow Block+Dismiss buttons + App handlers (window.open deep link + storage dismiss write) — ACTION-01, ACTION-02
  - [x] 05-02-PLAN.md — Content script: hiddenPostNodes tracking + dismissedAccounts onChanged unhide; SW: storage-driven badge replacing sessionHiddenCount — ACTION-02, FEED-02

**UI hint**: yes

### Phase 6: Settings & Dashboard

**Goal**: Users can tune the auto-hide threshold to reduce false positives and view a rolling breakdown of how many posts have been flagged and why
**Depends on**: Phase 5
**Requirements**: CONFIG-01, DASH-01, DASH-02, DASH-03
**Success Criteria** (what must be TRUE):

  1. Changing the threshold value in Settings immediately affects which new posts are hidden (lower = more hidden, higher = fewer)
  2. The dashboard page shows the percentage of posts seen that were flagged during the selected time window
  3. The dashboard splits flagged post counts into two categories: AI-written language signals vs bot-like behaviour signals
  4. Switching between the 7-day and 30-day time windows updates the dashboard figures without a page reload

**Plans**: 3 plans

**Wave 1**

  - [x] 06-01-PLAN.md — Foundation: Settings + DailyStats types; content script reads threshold from storage + tracks daily stats; manifest options_ui — CONFIG-01, DASH-01

**Wave 2** *(parallel — different files)*

  - [x] 06-02-PLAN.md — Popup: threshold slider (35–90) + "📊 View Dashboard" link in ⚙ Settings — CONFIG-01
  - [x] 06-03-PLAN.md — Dashboard page (src/dashboard/): % flagged + AI-language vs bot-behaviour signal bars + 7/30-day toggle — DASH-01, DASH-02, DASH-03

**UI hint**: yes

---

## Milestone v1.1 — UX & Data

### Phase 7: Post Storage

**Goal**: Posts hidden by the extension are preserved locally so users can review what was hidden without returning to LinkedIn
**Depends on**: Phase 6
**Requirements**: STORE-01, STORE-02, STORE-03
**Success Criteria** (what must be TRUE):

  1. When a post is hidden, its text (truncated at 1000 chars), author, score, and timestamp are saved in `chrome.storage.local` under a `storedPosts` key
  2. Only the 200 most recent posts are kept — oldest are evicted when the cap is hit
  3. Posts are retrievable by `authorId` so the popup can show them per-account

**Plans**: 2 plans

**Wave 1**

  - [x] 07-01-PLAN.md — StoredPost type + StorageSchema.storedPosts + src/shared/postStore.ts (persistStoredPost: 200-cap, 1000-char truncation, URN dedup) — STORE-02, STORE-03

**Wave 2** *(blocked on Wave 1)*

  - [x] 07-02-PLAN.md — Content script wiring: import + call persistStoredPost in the hide path — STORE-01

**UI hint**: no

### Phase 8: Popup Signal Detail & Post Preview

**Goal**: Users can expand any flagged account row to see exactly which signals fired and what the hidden post said
**Depends on**: Phase 7
**Requirements**: UX-01, UX-02, UX-03
**Success Criteria** (what must be TRUE):

  1. Clicking an account row in the popup expands it to show a per-signal score table (signal name | pts for each signal with value > 0)
  2. The expanded row shows up to 3 stored post snippets from that account, each with its score
  3. Only one row is expanded at a time (accordion — opening one closes the previous)

**Plans**: 2 plans

**Wave 1**

  - [x] 08-01-PLAN.md — AccountRow: optional isExpanded/onToggle/posts props, clickable summary section, chevron indicator, detail panel (signal score table + post snippets) — UX-01, UX-02, UX-03

**Wave 2** *(blocked on Wave 1)*

  - [x] 08-02-PLAN.md — App wiring: expandedId accordion state, storedPosts read from storage, AccountRow props passed — UX-01, UX-02, UX-03

**UI hint**: yes

### Phase 9: Export & Cleanse

**Goal**: Users can export their data for backup and remove old entries to keep storage lean
**Depends on**: Phase 7
**Requirements**: EXPORT-01, EXPORT-02, CLEANSE-01, CLEANSE-02
**Success Criteria** (what must be TRUE):

  1. Clicking "Export JSON" in the dashboard downloads a `.json` file containing all flagged accounts with their signals and stored posts
  2. Clicking "Export CSV" downloads a `.csv` file with one row per flagged account (accounts only — no post text)
  3. A "Cleanse data before date" control (date picker) in the dashboard shows a count of records that will be removed; confirming deletes them from all storage keys

**Plans**: 2
**UI hint**: yes

---

## Milestone v1.2 — Feed Insights & Export Completeness *(archived)*

Profile bot-rate stat on dashboard + Posts CSV export. Phases 10–11. Shipped 2026-05-30. → [v1.2-ROADMAP.md](milestones/v1.2-ROADMAP.md)

---

## Milestone v2.0 — Chrome Web Store Release *(archived)*

Icons, manifest compliance, privacy policy, store listing, packaging script, submission guide. Phases 12–14. Shipped 2026-05-31. → [v2.0-ROADMAP.md](milestones/v2.0-ROADMAP.md)

---

## Milestone v3.0 — Repo Rename Cleanup *(archived)*

Replace all `linkedinblock` → `linkedinaivoiceblock` refs (11 files + git remote + ZIP rebuild). Phase 15. Shipped 2026-05-31. → [v3.0-ROADMAP.md](milestones/v3.0-ROADMAP.md)

---

## Milestone v4.0 — Prompt Caching

### Phase 16: Prompt Caching

**Goal**: LLM API calls use Anthropic prompt caching, reducing input token costs ~90% on cache hits
**Depends on**: Phase 15
**Requirements**: CACHE-01, CACHE-02, CACHE-03, CACHE-04
**Success Criteria** (what must be TRUE):

  1. The `scorePost` API request sends `anthropic-beta: prompt-caching-2024-07-31` and a `cache_control: { type: "ephemeral" }` block on the system message
  2. `SYSTEM_PROMPT` is ≥1024 tokens so the cache_control is effective
  3. `npx tsc --noEmit` exits 0

**Plans**: TBD
**UI hint**: no

---

## Progress

| Phase | Plans Complete | Status | Completed |
|-------|----------------|--------|-----------|
| 1. Foundation | 4/4 | Complete | 2026-05-25 |
| 2. Detection Engine | 4/4 | Complete | 2026-05-29 |
| 3. Storage & Queue | 3/3 | Complete | 2026-05-29 |
| 4. Popup UI | 2/2 | Complete | 2026-05-29 |
| 5. User Decisions | 2/2 | Complete | 2026-05-29 |
| 6. Settings & Dashboard | 3/3 | Complete | 2026-05-30 |
| 7. Post Storage | 2/2 | Complete | 2026-05-30 |
| 8. Popup Signal Detail | 2/2 | Complete | 2026-05-30 |
| 9. Export & Cleanse | 2/2 | Complete | 2026-05-30 |
| 10. Profile Insights | 2/2 | Complete | 2026-05-30 |
| 11. Posts Export | 2/2 | Complete | 2026-05-30 |
| 12. Manifest & Icons | 2/2 | Complete | 2026-05-30 |
| 13. Store Assets | 2/2 | Complete | 2026-05-31 |
| 14. Package & Submit | 2/2 | Complete | 2026-05-31 |
| **v2.0 total** | **6/6** | **Complete** | **2026-05-31** |
| 15. URL Reference Updates | 1/1 | Complete | 2026-05-31 |
| 16. Prompt Caching | 0/TBD | Not started | - |
