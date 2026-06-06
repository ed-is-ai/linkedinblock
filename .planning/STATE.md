---
gsd_state_version: 1.0
milestone: v6.1
milestone_name: Popup UX Tidy-up
status: planning
last_updated: "2026-06-06T18:48:20.614Z"
last_activity: 2026-06-06 — Roadmap for v6.1 created (Phase 21)
progress:
  total_phases: 4
  completed_phases: 3
  total_plans: 5
  completed_plans: 5
  percent: 75
---

# State — LinkedIn Blocker

## Project Reference

See: .planning/PROJECT.md (updated 2026-06-06)

**Core value:** AI-bot posts are hidden automatically before the user sees them, with a reviewable list of flagged accounts in the extension popup.
**Current focus:** v6.1 — move "View Dashboard" button to popup header region

---

## Current Position

Phase: 21 — Dashboard Button Reposition
Plan: —
Status: Ready to plan
Last activity: 2026-06-06 — Roadmap for v6.1 created (Phase 21)

Progress: 0/1 phases complete [░░░░░░░░░░] 0%

## Accumulated Context

### Roadmap Evolution

- Phase 18.1 inserted after Phase 18: Dashboard Data Display (URGENT)

### Key Decisions

| Decision | Outcome | Phase |
|----------|---------|-------|
| Selector strategy | data-* attribute selectors + semantic HTML only; no CSS class names | Phase 1 |
| Service worker state | All durable state in chrome.storage.local; service worker is stateless | Phase 1 |
| SPA navigation | Observe document.body subtree:true; re-init on pushState/popstate | Phase 1 |
| Block action | Deep link to /overlay/report-or-block/ only; never simulate clicks | Phase 5 |
| Detector interface | detect(post: PostData): Promise<DetectionResult> — swappable heuristic/LLM | Phase 2 |
| CSS hiding | Single injected <style> with .llb-hidden { display: none !important } | Phase 2 |
| Storage schema | Flat-keyed account-centric; cap 500 entries | Phase 3 |
| Popup framework | Preact 10 + JSX; stateless on every open | Phase 4 |
| Post text storage | Stored on hide (user opt-in, v1.1); 200-post cap, 1000-char truncation | Phase 7 |
| Prompt caching | System prompt only; anthropic-beta header; SYSTEM_PROMPT ≥ 1024 tokens | Phase 16 |
| Voice signal placement | Inserted after ai-vocab block (Step 3b), before engagement gate (Step 4) | Phase 17 |
| Hook-story regex | `I was \w+ing` form required (not "I was in a meeting") to avoid false positives | Phase 17 |
| Popup inline styles | All popup styling via inline style objects (styles record); no CSS class selectors | Phase 4 |

### Todos

None.

### Blockers

None.

---

## Session Continuity

**Last updated:** 2026-06-06
**Last action:** v6.1 roadmap created — 1 phase (21), 2 requirements mapped (POPUP-04, POPUP-05)
**Next action:** `/gsd-plan-phase 21`
