# Roadmap — LinkedIn Blocker

**Project:** LinkedIn Blocker (Chrome MV3)
**Created:** 2026-05-25

---

## Milestones

- ✅ **v1.0 Clean Feed** — Phases 1–6 (shipped 2026-05-30)
- ✅ **v1.1 UX & Data** — Phases 7–9 (shipped 2026-05-30)
- ✅ **v1.2 Feed Insights & Export** — Phases 10–11 (shipped 2026-05-30)
- ✅ **v2.0 Chrome Web Store Release** — Phases 12–14 (shipped 2026-05-31)
- ✅ **v3.0 Repo Rename Cleanup** — Phase 15 (shipped 2026-05-31)
- ✅ **v4.0 Prompt Caching** — Phase 16 (shipped 2026-05-31)
- ✅ **v5.0 Voice Pattern Detection** — Phase 17 (shipped 2026-05-31)
- 🚧 **v6.0 UX Polish + Block Management** — Phases 18–20 (in progress)

---

## Phases

<details>
<summary>✅ v1.0 Clean Feed (Phases 1–6) — SHIPPED 2026-05-30</summary>

- [x] Phase 1: Foundation — 4/4 plans — completed 2026-05-25
- [x] Phase 2: Detection Engine — 4/4 plans — completed 2026-05-29
- [x] Phase 3: Storage & Queue — 3/3 plans — completed 2026-05-29
- [x] Phase 4: Popup UI — 2/2 plans — completed 2026-05-29
- [x] Phase 5: User Decisions — 2/2 plans — completed 2026-05-29
- [x] Phase 6: Settings & Dashboard — 3/3 plans — completed 2026-05-30

</details>

<details>
<summary>✅ v1.1 UX & Data (Phases 7–9) — SHIPPED 2026-05-30</summary>

- [x] Phase 7: Post Storage — 2/2 plans — completed 2026-05-30
- [x] Phase 8: Popup Signal Detail & Post Preview — 2/2 plans — completed 2026-05-30
- [x] Phase 9: Export & Cleanse — 2/2 plans — completed 2026-05-30

</details>

<details>
<summary>✅ v1.2 Feed Insights & Export Completeness (Phases 10–11) — SHIPPED 2026-05-30</summary>

Profile bot-rate stat on dashboard + Posts CSV export. → [v1.2-ROADMAP.md](milestones/v1.2-ROADMAP.md)

</details>

<details>
<summary>✅ v2.0 Chrome Web Store Release (Phases 12–14) — SHIPPED 2026-05-31</summary>

Icons, manifest compliance, privacy policy, store listing, packaging script, submission guide. → [v2.0-ROADMAP.md](milestones/v2.0-ROADMAP.md)

</details>

<details>
<summary>✅ v3.0 Repo Rename Cleanup (Phase 15) — SHIPPED 2026-05-31</summary>

Replace all `linkedinblock` → `linkedinaivoiceblock` refs (11 files + git remote + ZIP rebuild). → [v3.0-ROADMAP.md](milestones/v3.0-ROADMAP.md)

</details>

<details>
<summary>✅ v4.0 Prompt Caching (Phase 16) — SHIPPED 2026-05-31</summary>

Anthropic prompt caching on system prompt + expanded SYSTEM_PROMPT to 856 words. → [v4.0-ROADMAP.md](milestones/v4.0-ROADMAP.md)

</details>

<details>
<summary>✅ v5.0 Voice Pattern Detection (Phase 17) — SHIPPED 2026-05-31</summary>

Three new signal functions: hook-story, motivational, impersonal framing. AI voice post scores 61. → [v5.0-ROADMAP.md](milestones/v5.0-ROADMAP.md)

</details>

---

### 🚧 v6.0 UX Polish + Block Management (In Progress)

**Milestone Goal:** Fix the popup interaction model, add a blocked accounts manager page, and fix the threshold-blocking bug so the extension correctly hides posts from accounts the user has already flagged above the detection threshold.

- [ ] **Phase 18: Popup Interaction Fixes** - Bug fix (threshold hiding) + popup click wiring (account name, block button state)
- [ ] **Phase 19: Blocked Accounts Page** - New blocked.html extension page listing and managing locally-blocked accounts
- [ ] **Phase 20: Batch Block** - "Block all above threshold" popup action with confirmation step

## Phase Details

### Phase 18: Popup Interaction Fixes

**Goal**: Posts from accounts at or above the block threshold are hidden in the feed, and popup interaction behaves correctly — account names link to LinkedIn profiles, Block marks accounts locally without navigation, and already-blocked accounts are visually distinguished
**Depends on**: Phase 17
**Requirements**: BUG-01, POPUP-01, POPUP-02, POPUP-03
**Success Criteria** (what must be TRUE):

  1. Loading a LinkedIn feed page hides posts from any account whose stored score meets or exceeds the configured threshold (verified with a known flagged account)
  2. New posts injected by the SPA (infinite scroll) from threshold-hitting accounts are also hidden by the MutationObserver handler
  3. Clicking an account name row in the popup opens that account's LinkedIn profile URL in a new browser tab
  4. Clicking Block on a popup account row stores the account as blocked in chrome.storage.local without opening any LinkedIn page
  5. A popup account row whose account is already in blocked storage shows a visually distinct state (greyed out label or "Blocked" indicator) instead of an active Block button**Plans**: 3 plans

**Wave 1**

- [ ] 18-01-PLAN.md — BUG-01: thresholdAuthors map + observer hide branch + settings rebuild
- [ ] 18-02-PLAN.md — POPUP-01/POPUP-02: anchor stopPropagation + remove window.open from handleBlock

**Wave 2** *(blocked on Wave 1 completion)*

- [ ] 18-03-PLAN.md — POPUP-03: collapsible Blocked section + AccountRow isBlocked variant

**UI hint**: yes

### Phase 19: Blocked Accounts Page

**Goal**: A dedicated extension page (blocked.html) lets the user view all locally-blocked accounts and unblock individual entries; the popup provides a direct entry point to that page
**Depends on**: Phase 18
**Requirements**: BLOCK-01, BLOCK-02, BLOCK-03
**Success Criteria** (what must be TRUE):

  1. Opening blocked.html (via chrome-extension:// URL or the popup link) displays a list of all accounts stored as blocked, showing each account's name and the date it was blocked
  2. Clicking Unblock on a row removes that account from blocked storage and the row disappears from the list without a page reload
  3. The popup contains a visible link or button that opens blocked.html

**Plans**: TBD
**UI hint**: yes

### Phase 20: Batch Block

**Goal**: The user can mark all flagged accounts at or above the detection threshold as blocked in a single popup action, with a confirmation step showing the affected count before any change is committed
**Depends on**: Phase 19
**Requirements**: BATCH-01, BATCH-02, BATCH-03
**Success Criteria** (what must be TRUE):

  1. The popup displays a "Block all above threshold" button (or equivalent action) when at least one flagged account's peak score meets or exceeds the configured threshold
  2. Activating the action shows a confirmation prompt that states how many accounts will be blocked before any write occurs
  3. Confirming the action writes all qualifying accounts to blocked storage; cancelling leaves storage unchanged
  4. After confirmation, previously-qualifying popup rows show the already-blocked visual state from Phase 18

**Plans**: TBD
**UI hint**: yes

---

## Progress

| Phase | Milestone | Plans Complete | Status | Completed |
|-------|-----------|----------------|--------|-----------|
| 1. Foundation | v1.0 | 4/4 | Complete | 2026-05-25 |
| 2. Detection Engine | v1.0 | 4/4 | Complete | 2026-05-29 |
| 3. Storage & Queue | v1.0 | 3/3 | Complete | 2026-05-29 |
| 4. Popup UI | v1.0 | 2/2 | Complete | 2026-05-29 |
| 5. User Decisions | v1.0 | 2/2 | Complete | 2026-05-29 |
| 6. Settings & Dashboard | v1.0 | 3/3 | Complete | 2026-05-30 |
| 7. Post Storage | v1.1 | 2/2 | Complete | 2026-05-30 |
| 8. Popup Signal Detail | v1.1 | 2/2 | Complete | 2026-05-30 |
| 9. Export & Cleanse | v1.1 | 2/2 | Complete | 2026-05-30 |
| 10. Profile Insights | v1.2 | 2/2 | Complete | 2026-05-30 |
| 11. Posts Export | v1.2 | 2/2 | Complete | 2026-05-30 |
| 12. Manifest & Icons | v2.0 | 2/2 | Complete | 2026-05-30 |
| 13. Store Assets | v2.0 | 2/2 | Complete | 2026-05-31 |
| 14. Package & Submit | v2.0 | 2/2 | Complete | 2026-05-31 |
| 15. URL Reference Updates | v3.0 | 1/1 | Complete | 2026-05-31 |
| 16. Prompt Caching | v4.0 | 1/1 | Complete | 2026-05-31 |
| 17. Voice Signal Functions | v5.0 | 4/4 | Complete | 2026-05-31 |
| 18. Popup Interaction Fixes | v6.0 | 0/3 | Planned | - |
| 19. Blocked Accounts Page | v6.0 | 0/? | Not started | - |
| 20. Batch Block | v6.0 | 0/? | Not started | - |
