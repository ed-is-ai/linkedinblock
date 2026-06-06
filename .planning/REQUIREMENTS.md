# Requirements — Milestone v6.1: Popup UX Tidy-up

**Status:** Active
**Milestone:** v6.1
**Last updated:** 2026-06-06

---

## Popup Layout

- [ ] **POPUP-04**: The "View Dashboard" action appears at the top of the popup (in/near the title header, above the pending account list), so it is visible without opening Settings
- [ ] **POPUP-05**: The "View Dashboard" button is removed from the ⚙ Settings disclosure (moved, not duplicated); Settings retains only the threshold slider and export/cleanse controls

---

## Future Requirements (deferred)

- Blocked accounts page (`blocked.html`) listing locally-blocked accounts with unblock action (BLOCK-01, BLOCK-02, BLOCK-03)
- Opening LinkedIn deep-link from blocked accounts page to report accounts on LinkedIn
- Syncing blocked list with LinkedIn's native block list

## Out of Scope

- Any change to dashboard behavior or content (this milestone only moves the launch button)
- New storage, settings, or content-script changes
- Programmatic block clicks on LinkedIn (ToS risk — existing constraint from Phase 5)
- Backend or cloud sync of blocked accounts

---

## Traceability

| REQ-ID | Phase | Status |
|--------|-------|--------|
| POPUP-04 | Phase 21 | Pending |
| POPUP-05 | Phase 21 | Pending |
