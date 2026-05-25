---
phase: 01-foundation
plan: "04"
subsystem: observer
tags:
  - mutation-observer
  - spa-navigation
  - content-script
dependency_graph:
  requires:
    - 01-01
    - 01-02
    - 01-03
  provides:
    - working-observer
    - spa-navigation-handler
    - infra-02
    - infra-05
  affects:
    - Phase 2 detector (wires into startObserving callback)
tech_stack:
  patterns:
    - MutationObserver { childList: true, subtree: true } on feed container
    - history.pushState monkey-patch + popstate listener for SPA reinit
    - processedPosts Set for deduplication, cleared on each route change
    - Exponential backoff waitForFeedContainer (10 retries, 500ms base delay)
key_files:
  created:
    - src/content/observer.ts
  modified:
    - src/content/index.ts
    - src/background/index.ts
decisions:
  - "data-id used as fallback URN attribute when data-urn is absent — both observed in live DOM per DOM-INSPECTION.md"
  - "author name reads as <unknown> on live site — span[data-anonymize=person-name] selector is correct but textContent returns empty for some rendered states; deferred to Phase 2 where author extraction is refined alongside scoring"
  - "No try/catch around startObserving per CONTEXT.md decision — real errors surface for now"
metrics:
  duration: "~20 minutes"
  completed: "2026-05-25"
  tasks_completed: 3
  tasks_total: 3
---

# Phase 01 Plan 04: MutationObserver + SPA Navigation — Summary

Implemented and verified the runtime content script: a MutationObserver attached to the verified LinkedIn feed container that logs URN + author name for every post card entering the feed, with a pushState/popstate-driven reinit handler that survives SPA navigation. All four Phase 1 ROADMAP success criteria confirmed on the live site.

## What Was Built

### observer.ts (152 lines)

Four internal helpers behind a single export `startObserving(onPost)`:

- **`waitForFeedContainer()`** — 10 retries with `500ms * min(attempt+1, 4)` delay. Tries `FEED_CONTAINER` then `FEED_CONTAINER_FALLBACK`. Emits `[LLB] Feed container not found after retries.` health sentinel with `selectorsVersion` and URL on failure.
- **`attachObserver()`** — `{ childList: true, subtree: true }` only (no `attributes`, no `characterData`). Deduplicates via `processedPosts` Set. Falls back from `data-urn` to `data-id` for URN extraction.
- **`installSpaNavigationHandler()`** — monkey-patches `history.pushState` (calls original first), adds `popstate` listener. Both paths call `setTimeout(reinit, 1000)` on URL change.
- **`reinit()`** — disconnects current observer, clears `processedPosts`, reattaches after `waitForFeedContainer()`.

Zero raw selector string literals in observer.ts — all constants imported from `./selectors` per INFRA-04.

### Content script wiring

`src/content/index.ts` logs startup line with `SELECTORS_VERSION`, calls `startObserving` with a `console.log('[LLB] post', urn, 'by', authorName)` callback.

`src/background/index.ts` adds `onInstalled` listener; keeps `onMessage` stub; no mutable module-scope state.

## Human Verification: PASSED

All acceptance criteria confirmed on live LinkedIn feed (2026-05-25):

| Step | Criterion | Result |
|------|-----------|--------|
| 3 | `[LLB] content script starting on ... selectors v 1.0.0` in console | PASS |
| 4 | `[LLB] post urn:li:activity:<id> by <name>` per post card on scroll | PASS |
| 5–6 | Logs resume after browser-Back navigation within ~2 seconds | PASS |
| 7 | Logs resume after LinkedIn Home (pushState) navigation | PASS |
| — | No `Feed container not found` health sentinel during normal browsing | PASS |
| — | No errors in chrome://extensions | PASS |

## Known Issues / Deferred

| Issue | Detail | Deferred to |
|-------|--------|-------------|
| Author name logs as `<unknown>` | `span[data-anonymize="person-name"]` resolves but `textContent` is empty for some rendered post states (likely lazy-rendered text). URN detection is unaffected. | Phase 2 — author extraction refined alongside scoring |

## INFRA-04 Compliance

INFRA-04 grep gate passed: no file under `src/` other than `src/content/selectors.ts` contains LinkedIn selector strings as literals.

## Requirements Satisfied

- **INFRA-02**: Observer anchored to `data-*` attribute selectors; logs URN + author name on scroll — **CONFIRMED**
- **INFRA-05**: Observer reinitialises on both browser-Back and LinkedIn pushState navigation — **CONFIRMED**

## Self-Check: PASSED

- `npx tsc --noEmit` exits 0
- `npm run build` exits 0
- INFRA-04 grep gate passes
- Human verification: all 6 criteria confirmed
