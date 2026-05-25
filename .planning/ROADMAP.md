# Roadmap — LinkedIn Blocker

**Project:** LinkedIn Blocker (Chrome MV3)
**Milestone:** v1 — Clean Feed
**Granularity:** Coarse
**Created:** 2026-05-25

---

## Phases

- [ ] **Phase 1: Foundation** — MutationObserver, selector registry, SPA navigation handling, MV3 scaffolding
- [ ] **Phase 2: Detection Engine** — Heuristic scoring, post exclusions, CSS hiding, pluggable detector interface
- [ ] **Phase 3: Storage & Queue** — Persist flagged accounts with rolling scores across sessions
- [ ] **Phase 4: Popup UI** — Preact read-only list of flagged accounts with signal breakdown
- [ ] **Phase 5: User Decisions** — Block deep link, dismiss false positives, service worker badge relay
- [ ] **Phase 6: Settings & Dashboard** — Configurable threshold, 7/30-day rolling stats by signal category

---

## Phase Details

**Plans:** 4 plans
  - [ ] 01-01-PLAN.md — Project scaffold (Vite + vite-plugin-web-extension + MV3 manifest + D-04 layout) — INFRA-01
  - [ ] 01-02-PLAN.md — Live LinkedIn DOM inspection prerequisite — captures verified selectors
  - [ ] 01-03-PLAN.md — Selector registry + shared types + typed chrome.storage.local wrapper — INFRA-03, INFRA-04
  - [ ] 01-04-PLAN.md — MutationObserver + SPA navigation handler + content script wiring — INFRA-02, INFRA-05

### Phase 2: Detection Engine
**Goal**: Posts are automatically scored and hidden in the feed when they exceed the bot-probability threshold, with per-signal scores stored
**Depends on**: Phase 1
**Requirements**: DETECT-01, DETECT-02, DETECT-03, DETECT-04, DETECT-05, DETECT-06, DETECT-07, FEED-01, FEED-02, FEED-03, CONFIG-02
**Success Criteria** (what must be TRUE):
  1. A known AI-pattern post (listicle + buzzwords + generic CTA) is hidden in the feed before the user scrolls past it
  2. Sponsored posts and company-page posts are never hidden, even when their text matches AI patterns
  3. Non-English posts are never hidden
  4. The extension icon badge shows an incrementing count of hidden posts as the feed scrolls
  5. Per-signal scores (buzzword density, em-dash frequency, listicle structure, CTA match, headline pattern) are stored alongside the composite score and are individually inspectable
**Plans**: TBD
**UI hint**: yes

### Phase 3: Storage & Queue
**Goal**: Flagged account data survives browser restarts and service worker terminations, and accumulates correctly across multiple sessions
**Depends on**: Phase 2
**Requirements**: QUEUE-01, QUEUE-02
**Success Criteria** (what must be TRUE):
  1. After flagging accounts in one browser session, closing and reopening Chrome still shows those accounts in the review queue
  2. Each flagged account entry in storage contains: account ID, display name, profile URL, post count seen, signals that fired, composite score, and first-seen timestamp
  3. Accounts accumulate a rolling score across sessions — a second high-scoring post from the same account increases their stored score
**Plans**: TBD

### Phase 4: Popup UI
**Goal**: Users can open the extension popup and immediately see which accounts have been flagged, with enough signal detail to make a review decision
**Depends on**: Phase 3
**Requirements**: POPUP-01, POPUP-02, POPUP-03
**Success Criteria** (what must be TRUE):
  1. Opening the popup shows a list of flagged accounts sorted by peak score, with no manual refresh needed
  2. Each account row displays the account name, the signals that fired, the composite score, and the number of posts seen
  3. When a new account is flagged while the popup is open, it appears in the list without the user needing to close and reopen the popup
**Plans**: TBD
**UI hint**: yes

### Phase 5: User Decisions
**Goal**: Users can resolve flagged accounts from the popup — either blocking them on LinkedIn or dismissing them as false positives — and those decisions persist
**Depends on**: Phase 4
**Requirements**: ACTION-01, ACTION-02
**Success Criteria** (what must be TRUE):
  1. Clicking Block on a flagged account opens LinkedIn's block/report overlay URL in a new tab, allowing the user to complete the block in LinkedIn's own UI
  2. Clicking Dismiss removes the account from the popup list and prevents it from being re-flagged in future sessions
  3. After a dismiss action, the badge count decrements and previously hidden posts from that account become visible in the feed again
**Plans**: TBD
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
**Plans**: TBD
**UI hint**: yes

---

## Progress

| Phase | Plans Complete | Status | Completed |
|-------|----------------|--------|-----------|
| 1. Foundation | 0/4 | Not started | - |
| 2. Detection Engine | 0/? | Not started | - |
| 3. Storage & Queue | 0/? | Not started | - |
| 4. Popup UI | 0/? | Not started | - |
| 5. User Decisions | 0/? | Not started | - |
| 6. Settings & Dashboard | 0/? | Not started | - |
