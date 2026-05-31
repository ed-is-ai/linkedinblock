---
gsd_state_version: 1.0
milestone: v5.0
milestone_name: voice-detection
status: in-progress
last_updated: "2026-05-31T00:00:00.000Z"
progress:
  total_phases: 1
  completed_phases: 1
  total_plans: 1
  completed_plans: 1
  percent: 100
---

# State — LinkedIn Blocker

## Project Reference

**Core value:** AI-bot posts are hidden automatically before the user sees them, with a reviewable list of flagged accounts in the extension popup.
**Current focus:** v5.0 — Voice pattern detection (hook-story, motivational, impersonal framing heuristic signals)

---

## Current Position

Milestone v1.0: COMPLETE ✓  
Milestone v1.1: COMPLETE ✓  
Milestone v1.2: COMPLETE ✓  
Milestone v2.0: COMPLETE ✓
Milestone v3.0: COMPLETE ✓
Milestone v4.0: COMPLETE ✓
Milestone v5.0: IN PROGRESS

```
v1.0–v4.0: [ Phases 1–16 ] ALL DONE✓

v5.0: [ Phase 17 ]
        TODO
```

---

## Performance Metrics

| Metric | Value |
|--------|-------|
| Milestone | v4.0 (prompt-caching) |
| v4.0 phases total | 1 |
| v4.0 phases complete | 0 |
| v4.0 requirements | 4 (CACHE-01–04) |

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
| Storage schema | Flat-keyed account-centric; cap 500 entries | Phase 3 |
| Popup framework | Preact 10 + JSX; stateless on every open | Phase 4 |
| Post text storage | Stored on hide (user opt-in, v1.1); 200-post cap, 1000-char truncation | Phase 7 |

### v4.0 Design Decisions

| Decision | Outcome |
|----------|---------|
| Cache scope | System prompt only (`SYSTEM_PROMPT` constant) — user message (post text) is always unique |
| Cache TTL | 5 minutes (Anthropic ephemeral cache default) |
| Minimum tokens | Sonnet models require ≥1024 tokens; SYSTEM_PROMPT will be expanded to meet this |
| Beta header | `anthropic-beta: prompt-caching-2024-07-31` included for compatibility |
| system field shape | Changes from plain string to `[{ type: 'text', text: SYSTEM_PROMPT, cache_control: { type: 'ephemeral' } }]` |

### Todos

- [x] Execute Phase 16 (Prompt Caching) — complete 2026-05-31

### Blockers

None.

---

## Session Continuity

**Last updated:** 2026-05-30
**Last action:** Phase 17 executed — 3 new voice signals + integration test (AI voice post scores 61)
**Next action:** Run `/gsd-complete-milestone` to archive v5.0 and tag it
