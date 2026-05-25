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

## v2 Requirements (Deferred)

- LLM-based detection API integration (pluggable engine stub is built in v1)
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

| REQ-ID | Phase |
|--------|-------|
| INFRA-01 – INFRA-05 | Phase 1: Foundation |
| DETECT-01 – DETECT-07 | Phase 2: Detection Engine |
| FEED-01 – FEED-03 | Phase 2: Detection Engine |
| QUEUE-01 – QUEUE-02 | Phase 3: Storage & Queue |
| POPUP-01 – POPUP-03 | Phase 4: Popup UI |
| ACTION-01 – ACTION-02 | Phase 5: User Decisions |
| CONFIG-01 – CONFIG-02 | Phase 2 (interface) + Phase 6 (UI) |
| DASH-01 – DASH-03 | Phase 6: Settings & Dashboard |
