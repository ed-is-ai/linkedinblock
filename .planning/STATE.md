---
gsd_state_version: 1.0
milestone: v1.0
milestone_name: milestone
status: Not started
last_updated: "2026-05-25T07:30:59.296Z"
progress:
  total_phases: 6
  completed_phases: 0
  total_plans: 0
  completed_plans: 0
  percent: 0
---

# State — LinkedIn Blocker

## Project Reference

**Core value:** AI-bot posts are hidden automatically before the user sees them, with a reviewable list of flagged accounts in the extension popup.
**Current focus:** Phase 1 — Foundation

---

## Current Position

**Phase:** 1 — Foundation
**Plan:** None yet (phase not started)
**Status:** Not started

```
Progress: [ Phase 1 ] [ Phase 2 ] [ Phase 3 ] [ Phase 4 ] [ Phase 5 ] [ Phase 6 ]
            CURRENT    pending     pending     pending     pending     pending
```

---

## Performance Metrics

| Metric | Value |
|--------|-------|
| Phases total | 6 |
| Phases complete | 0 |
| Plans complete | 0 |
| Requirements mapped | 26/26 |
| Requirements complete | 0/26 |

---

## Accumulated Context

### Key Decisions

| Decision | Outcome | Phase |
|----------|---------|-------|
| Selector strategy | data-* attribute selectors + semantic HTML only; no CSS class names | Phase 1 |
| Service worker state | All durable state in chrome.storage.local; service worker is stateless | Phase 1 |
| SPA navigation | Observe document.body subtree:true; re-init on pushState/popstate | Phase 1 |
| Block action | Deep link to /overlay/report-or-block/ only; never simulate clicks | Phase 5 |
| Detector interface | detect(post: PostData): Promise<DetectionResult> — swappable heuristic/LLM | Phase 2 |
| CSS hiding | Single injected <style> with .llb-hidden { display: none !important } | Phase 2 |
| Storage schema | Flat-keyed account-centric; cap 500 entries; never store post text | Phase 3 |
| Popup framework | Preact 10 + JSX; stateless on every open | Phase 4 |

### Research Flags (must verify before building)

- [ ] Phase 1 prerequisite: Live LinkedIn DOM inspection — post card data-* attributes, feed container selector, stable ancestor for MutationObserver
- [ ] Phase 2 validation: CSS hiding does not break LinkedIn infinite scroll sentinel
- [ ] Phase 5 prerequisite: Verify LinkedIn block deep link (/overlay/report-or-block/) is still valid
- [ ] Phase 5 prerequisite: Read LinkedIn ToS Section 8 on automated actions before building block flow

### Todos

- Begin Phase 1: inspect live LinkedIn DOM in DevTools before writing any selector-dependent code

### Blockers

None.

---

## Session Continuity

**Last updated:** 2026-05-25
**Last action:** Roadmap created, STATE.md initialised
**Next action:** Start Phase 1 — run `/gsd-plan-phase 1`
