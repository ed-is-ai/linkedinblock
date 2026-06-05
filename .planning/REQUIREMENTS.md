# Requirements — Milestone v6.0: UX Polish + Block Management

**Status:** Active
**Milestone:** v6.0
**Last updated:** 2026-06-05

---

## Popup Interaction

- [x] **POPUP-01**: Clicking an account name opens their LinkedIn profile URL in a new tab
- [x] **POPUP-02**: Block button marks the account as blocked in local storage (does not navigate to LinkedIn)
- [x] **POPUP-03**: Block button is visually distinct (e.g. greyed out / labelled "Blocked") for accounts already in blocked storage

## Blocked Accounts Page

- [ ] **BLOCK-01**: A dedicated `blocked.html` extension page lists all locally-blocked accounts with name and block date
- [ ] **BLOCK-02**: Each blocked account row has an Unblock action that removes the account from blocked storage and updates the list
- [ ] **BLOCK-03**: The popup has a link or button that opens `blocked.html`

## Batch Block

- [ ] **BATCH-01**: The popup has a "Block all above threshold" action
- [ ] **BATCH-02**: The action marks all currently-flagged accounts whose peak score ≥ configured threshold as blocked in local storage
- [ ] **BATCH-03**: A confirmation step displays the affected account count before executing

## Bug Fix

- [x] **BUG-01**: Posts from accounts whose stored score meets or exceeds the block threshold are hidden in the LinkedIn feed (content script applies hiding on page load and on new posts detected via MutationObserver)

---

## Future Requirements (deferred)

- Opening LinkedIn deep-link from blocked accounts page to report accounts on LinkedIn
- Syncing blocked list with LinkedIn's native block list

## Out of Scope

- Programmatic block clicks on LinkedIn (ToS risk — existing constraint from Phase 5)
- Backend or cloud sync of blocked accounts

---

## Traceability

| REQ-ID | Phase | Status |
|--------|-------|--------|
| BUG-01 | 18 | Satisfied |
| POPUP-01 | 18 | Satisfied |
| POPUP-02 | 18 | Satisfied |
| POPUP-03 | 18 | Satisfied |
| BLOCK-01 | 19 | Pending |
| BLOCK-02 | 19 | Pending |
| BLOCK-03 | 19 | Pending |
| BATCH-01 | 20 | Pending |
| BATCH-02 | 20 | Pending |
| BATCH-03 | 20 | Pending |
