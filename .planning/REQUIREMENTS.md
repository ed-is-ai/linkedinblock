# Requirements — LinkedIn Blocker

## v1 Requirements

### Foundation & Infrastructure

- [ ] **INFRA-01**: Extension loads as a Chrome MV3 extension without errors on linkedin.com
- [ ] **INFRA-02**: Content script observes the LinkedIn feed using MutationObserver anchored to stable `data-*` attributes (not CSS class names)
- [ ] **INFRA-03**: All durable state is persisted to `chrome.storage.local` immediately on change (no in-memory-only state)
- [ ] **INFRA-04**: A selector registry abstracts all LinkedIn DOM selectors into one place so changes require a single-file fix
- [ ] **INFRA-05**: Extension handles LinkedIn SPA navigation (route changes without full page reload) without losing the observer

### Detection — Content Signals

- [ ] **DETECT-01**: User can see AI-language content signals scored per post (em-dash overuse, listicle structure, generic motivational CTA, buzzword density, impersonal framing)
- [ ] **DETECT-02**: Sponsored/promoted posts are hard-excluded from detection (never flagged)
- [ ] **DETECT-03**: Company page posts are hard-excluded from detection (never flagged)
- [ ] **DETECT-04**: Non-English posts are hard-excluded from detection (heuristics are English-only)
- [ ] **DETECT-05**: Per-signal scores are stored alongside the composite score so each signal can be displayed and tuned independently

### Detection — Profile & Engagement Signals

- [ ] **DETECT-06**: User can see profile signals scored per account (AI-generated headshot indicator, thin connection count, generic bio patterns)
- [ ] **DETECT-07**: User can see engagement signals scored per account (identical or near-identical comments, unusual reaction-to-comment ratios)

### Feed Integration

- [ ] **FEED-01**: Posts exceeding the bot-probability threshold are hidden in the feed using CSS class injection (not `element.remove()`)
- [ ] **FEED-02**: Hidden post count is visible to the user (badge on extension icon)
- [ ] **FEED-03**: Already-processed post URNs are tracked to prevent duplicate scoring on React re-renders

### Review Queue

- [ ] **QUEUE-01**: Flagged accounts are stored in a review queue in `chrome.storage.local` with: account ID, display name, profile URL, post count seen, signals that fired, composite score, timestamp first seen
- [ ] **QUEUE-02**: Review queue entries persist across browser sessions and service worker restarts

### Popup UI

- [ ] **POPUP-01**: Extension popup renders the review queue as a list of flagged accounts
- [ ] **POPUP-02**: Each queue entry shows: account name, signals that fired, composite score, and post count
- [ ] **POPUP-03**: Popup updates in real time when new accounts are flagged (via `chrome.storage.onChanged`)

### User Decisions

- [ ] **ACTION-01**: User can initiate a block from the popup — extension opens LinkedIn's block/report deep link in a new tab (`/overlay/report-or-block/`)
- [ ] **ACTION-02**: User can dismiss a false positive from the popup — account is removed from the queue and marked as confirmed-human (not re-flagged)

### Configuration

- [ ] **CONFIG-01**: User can adjust the auto-hide threshold score (conservative default, e.g. 60/100)
- [ ] **CONFIG-02**: Detection engine is pluggable — a single interface (`detect(postData): Promise<DetectionResult>`) that both heuristic and future LLM engines implement

### Dashboard

- [ ] **DASH-01**: A dedicated dashboard page (chrome extension page) shows the percentage of posts seen that were flagged
- [ ] **DASH-02**: Dashboard breaks down flagged posts by signal category: AI-written language signals vs bot-like behaviour signals
- [ ] **DASH-03**: Dashboard time window is user-selectable: 7 days / 30 days

---

## v1.1 Requirements

### Post Storage

- [ ] **STORE-01**: When a post is hidden, its text, author, score, and timestamp are saved to `chrome.storage.local` (deliberate user opt-in — overrides v1.0 "never store post text" guideline)
- [ ] **STORE-02**: Stored posts are capped at 200 entries (oldest evicted when cap hit) to prevent unbounded storage growth
- [ ] **STORE-03**: Stored post text is truncated at 1000 characters if longer (full text rarely needed for review)

### Popup UX

- [ ] **UX-01**: Account rows in the popup are expandable — clicking the row body reveals the full per-signal score breakdown (signal name + pts for each signal that fired)
- [ ] **UX-02**: The expanded account view shows up to 3 stored post snippets from that account with their scores
- [ ] **UX-03**: Expanded rows collapse when another row is expanded (accordion behaviour — one open at a time)

### Export

- [ ] **EXPORT-01**: User can export all flagged accounts (and their stored posts) as a JSON file from the dashboard or popup
- [ ] **EXPORT-02**: User can export as CSV (accounts only, no post text — flattened row per account)

### Cleanse

- [ ] **CLEANSE-01**: User can clear all data (flagged accounts, stored posts, daily stats, dismissed/blocked lists) before a user-selected date
- [ ] **CLEANSE-02**: Cleanse shows a confirmation step with a count of records that will be deleted before executing

---

## v1.2 Requirements *(archived — shipped 2026-05-30)*

See [milestones/v1.2-REQUIREMENTS.md](milestones/v1.2-REQUIREMENTS.md) for full record.

- [x] **INSIGHT-01**: Unique author profiles tracked per day in `dailyStats.seenProfileIds`
- [x] **INSIGHT-02**: Dashboard "Profile bot rate" stat with time-window union
- [x] **EXPORT-03**: Posts CSV export (`linkedin-blocker-posts-YYYY-MM-DD.csv`)

---

## v2.0 Requirements — Chrome Web Store Release *(archived — shipped 2026-05-31)*

See [milestones/v2.0-REQUIREMENTS.md](milestones/v2.0-REQUIREMENTS.md) for full record.

- [x] **CWS-01**: manifest.json v1.2.0 with icons, action.default_icon, homepage_url
- [x] **CWS-02**: PNG icons at 16/48/128px in src/public/icons/; in dist/ after build
- [x] **CWS-03**: PRIVACY.md — data inventory, local-only storage, opt-in LLM, deletion instructions
- [x] **CWS-04**: store/LISTING.md — name, 132-char short desc, 340-word description, permissions justification, 5-screenshot checklist
- [x] **CWS-05**: npm run package → dist/linkedin-blocker-v1.2.0.zip (27.6 KB)
- [x] **CWS-06**: store/SUBMISSION_GUIDE.md — 6-step first-time CWS submission walkthrough

---

## v3.0 Requirements — Repo Rename Cleanup *(archived — shipped 2026-05-31)*

See [milestones/v3.0-REQUIREMENTS.md](milestones/v3.0-REQUIREMENTS.md) for full record.

- [x] **RENAME-01–05**: All `linkedinblock` → `linkedinaivoiceblock` URL references updated (11 files + git remote + ZIP)

---

## Deferred (post-v3)

- LLM cost controls — heuristic pre-filter + per-session rate limiting (LLM fully implemented; cost optimisation deferred)
- Prompt caching — Anthropic prompt caching on system prompt (~90% cost reduction)
- Posting time regularity signal (excluded — too many false positives from scheduling tools)
- Posting frequency signal (excluded by user preference)
- Firefox support
- Cloud sync or shared community blocklists
- Cross-device sync

---

## Out of Scope (v1)

- **Firefox** — Chrome only; WebExtensions API differences deferred
- **LLM detection** — heuristics only; pluggable interface prepared for later
- **Backend / user accounts** — no server, all local
- **Posting frequency / time regularity** — user explicitly excluded; scheduling tools cause too many false positives
- **Programmatic block simulation** — clicking LinkedIn's DOM directly; ToS risk; deep-link approach used instead
- **Profile deep-reads** — navigating to full profile pages during scoring; rate-limit risk deferred

---

## Traceability

| REQ-ID | Phase | Status |
|--------|-------|--------|
| INFRA-01 | Phase 1: Foundation | Pending |
| INFRA-02 | Phase 1: Foundation | Pending |
| INFRA-03 | Phase 1: Foundation | Pending |
| INFRA-04 | Phase 1: Foundation | Pending |
| INFRA-05 | Phase 1: Foundation | Pending |
| DETECT-01 | Phase 2: Detection Engine | Pending |
| DETECT-02 | Phase 2: Detection Engine | Pending |
| DETECT-03 | Phase 2: Detection Engine | Pending |
| DETECT-04 | Phase 2: Detection Engine | Pending |
| DETECT-05 | Phase 2: Detection Engine | Pending |
| DETECT-06 | Phase 2: Detection Engine | Pending |
| DETECT-07 | Phase 2: Detection Engine | Pending |
| FEED-01 | Phase 2: Detection Engine | Pending |
| FEED-02 | Phase 2: Detection Engine | Pending |
| FEED-03 | Phase 2: Detection Engine | Pending |
| CONFIG-02 | Phase 2: Detection Engine | Pending |
| QUEUE-01 | Phase 3: Storage & Queue | Pending |
| QUEUE-02 | Phase 3: Storage & Queue | Pending |
| POPUP-01 | Phase 4: Popup UI | Pending |
| POPUP-02 | Phase 4: Popup UI | Pending |
| POPUP-03 | Phase 4: Popup UI | Pending |
| ACTION-01 | Phase 5: User Decisions | Pending |
| ACTION-02 | Phase 5: User Decisions | Pending |
| CONFIG-01 | Phase 6: Settings & Dashboard | Pending |
| DASH-01 | Phase 6: Settings & Dashboard | Pending |
| DASH-02 | Phase 6: Settings & Dashboard | Pending |
| DASH-03 | Phase 6: Settings & Dashboard | Complete |
| STORE-01 | Phase 7: Post Storage | Pending |
| STORE-02 | Phase 7: Post Storage | Pending |
| STORE-03 | Phase 7: Post Storage | Pending |
| UX-01 | Phase 8: Popup Detail View | Pending |
| UX-02 | Phase 8: Popup Detail View | Pending |
| UX-03 | Phase 8: Popup Detail View | Pending |
| EXPORT-01 | Phase 9: Export & Cleanse | Complete |
| EXPORT-02 | Phase 9: Export & Cleanse | Complete |
| CLEANSE-01 | Phase 9: Export & Cleanse | Complete |
| CLEANSE-02 | Phase 9: Export & Cleanse | Complete |
| INSIGHT-01 | Phase 10: Profile Insights | Pending |
| INSIGHT-02 | Phase 10: Profile Insights | Pending |
| EXPORT-03 | Phase 11: Posts Export | Pending |
