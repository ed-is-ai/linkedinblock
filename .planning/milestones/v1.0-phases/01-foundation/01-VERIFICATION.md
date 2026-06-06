---
phase: 01-foundation
verified: 2026-05-25T00:00:00Z
status: gaps_found
score: 4/5 must-haves verified
overrides_applied: 0
gaps:
  - truth: "No other file contains a LinkedIn selector string — changing one constant in selectors.ts is sufficient to fix any selector breakage site-wide (INFRA-04)"
    status: failed
    reason: "src/content/observer.ts line 84 uses the raw string literal 'data-id' as a fallback attribute in card.getAttribute('data-id'). This is a LinkedIn DOM attribute name that should be a named export from selectors.ts (e.g. POST_URN_ATTR_FALLBACK). If LinkedIn renames this attribute, a developer must edit observer.ts directly rather than only selectors.ts — the exact failure mode INFRA-04 was designed to prevent."
    artifacts:
      - path: "src/content/observer.ts"
        issue: "Line 84: card.getAttribute('data-id') — raw LinkedIn attribute string literal outside the selector registry"
    missing:
      - "Add POST_URN_ATTR_FALLBACK = 'data-id' export to src/content/selectors.ts"
      - "Replace card.getAttribute('data-id') in observer.ts line 84 with card.getAttribute(POST_URN_ATTR_FALLBACK) and add POST_URN_ATTR_FALLBACK to the import from './selectors'"
human_verification:
  - test: "Confirm INFRA-01: Extension loads on linkedin.com without console errors"
    expected: "No errors in chrome://extensions card; service worker console shows '[LLB] service worker started'; page console shows '[LLB] content script starting on https://www.linkedin.com/feed/ selectors v 1.0.0'"
    why_human: "Requires a running Chrome browser with the extension loaded from dist/ — cannot verify programmatically"
  - test: "Confirm INFRA-02: MutationObserver logs URN + author name for every post card on scroll"
    expected: "Console shows '[LLB] post urn:li:activity:<id> by <author>' for each new post card entering the feed viewport on scroll"
    why_human: "Requires live LinkedIn feed interaction — cannot verify DOM mutation behavior statically"
  - test: "Confirm INFRA-05: Observer survives SPA navigation (browser-Back AND LinkedIn Home pushState)"
    expected: "After navigating feed → profile → feed (both browser Back and LinkedIn Home click), console resumes '[LLB] post ...' lines within ~2 seconds without a full page reload"
    why_human: "Requires live SPA navigation in a real Chrome session — cannot verify pushState monkey-patch behavior statically"
---

# Phase 1: Foundation Verification Report

**Phase Goal:** Establish the Chrome MV3 project scaffold with build toolchain, a single-file selector registry keyed on verified LinkedIn data-* attributes, and a MutationObserver content script that detects post cards and survives SPA navigation — all without touching CSS class names.
**Verified:** 2026-05-25
**Status:** gaps_found (1 BLOCKER gap + 3 human verification items)
**Re-verification:** No — initial verification

---

## Goal Achievement

### Observable Truths

| # | Truth | Status | Evidence |
|---|-------|--------|----------|
| 1 | Chrome MV3 extension scaffold exists, builds, and loads on linkedin.com without errors (INFRA-01) | HUMAN-NEEDED | src/manifest.json with manifest_version 3, content_scripts targeting linkedin.com, vite.config.ts with webExtension plugin. Human-verified per 01-01-SUMMARY.md Task 3 PASSED. |
| 2 | MutationObserver attached to data-* selectors logs URN + author on scroll (INFRA-02) | HUMAN-NEEDED | observer.ts fully implemented with attachObserver(), all selectors from registry. Human-verified per 01-04-SUMMARY.md Task 3 PASSED. |
| 3 | Typed chrome.storage.local wrapper exists and compiles (INFRA-03) | VERIFIED | src/shared/storage.ts exports storageGet, storageSet, storageRemove; generic over StorageSchema; no chrome.storage.sync usage found. |
| 4 | Single-file selector registry — all LinkedIn DOM selectors in one file (INFRA-04) | FAILED | Raw string literal 'data-id' used in observer.ts line 84 outside the registry. See gaps. |
| 5 | Observer survives SPA navigation — pushState monkey-patch and popstate listener both reinit (INFRA-05) | HUMAN-NEEDED | observer.ts contains full installSpaNavigationHandler() wrapping history.pushState and adding popstate listener with lastUrl guard. Human-verified per 01-04-SUMMARY.md Task 3 PASSED. |

**Score:** 4/5 truths verified (1 failed, 3 require human confirmation already obtained per SUMMARYs but not independently verifiable here)

---

## Detailed Findings

### INFRA-04 Violation: 'data-id' Raw Literal in observer.ts

`src/content/observer.ts` line 84:

```typescript
urn = card.getAttribute('data-id');
```

`selectors.ts` exports `POST_URN_ATTR = 'data-urn'` but has no corresponding `POST_URN_ATTR_FALLBACK` constant for the `data-id` fallback. The PLAN frontmatter for plan 03 required exports of `["SELECTORS_VERSION", "FEED_CONTAINER", "FEED_CONTAINER_FALLBACK", "POST_CARD", "POST_URN_ATTR", "POST_AUTHOR_NAME", "SPONSORED_MARKER", "COMPANY_PAGE_MARKER"]` — no `POST_URN_ATTR_FALLBACK` was specified, so the plan itself has a gap, but the effect is a INFRA-04 violation in the implementation.

The 01-04-SUMMARY.md documents this decision: "data-id used as fallback URN attribute when data-urn is absent — both observed in live DOM per DOM-INSPECTION.md." The summary acknowledges it but does not flag the INFRA-04 consequence.

**Impact:** If LinkedIn renames `data-id`, a developer must know to edit observer.ts in addition to selectors.ts. This defeats the single-file fix guarantee of INFRA-04.

### DOM-INSPECTION.md Contains CSS Class Selectors (Warning)

DOM-INSPECTION.md records CSS class names in several selector lines:
- `div.core-rail` (Feed Container)
- `.feed-shared-update-v2` (Post Card)
- `.update-components-actor__sub-description` (Sponsored Marker)
- `.update-components-actor__name` (Author Name)
- `.update-components-actor__meta-link`, `.update-components-actor__image-link` (Company Page Marker)

Plan 02 must_have states: "Every recorded selector is a data-* attribute, aria-label, role, or semantic element — zero CSS class names per CLAUDE.md constraint #1."

However, this is a documentation artifact failure, not a code failure. The actual `selectors.ts` correctly avoids all CSS class names (confirmed by inspection). Plan 03's 01-03-SUMMARY.md explicitly notes the deviation was caught and corrected: "SPONSORED_MARKER avoided CSS class per CLAUDE.md constraint #1." The DOM-INSPECTION.md failure is a WARNING, not a BLOCKER, because the class names were not used in code.

---

### Required Artifacts

| Artifact | Expected | Status | Details |
|----------|----------|--------|---------|
| `src/manifest.json` | MV3 manifest with content_scripts for linkedin.com | VERIFIED | manifest_version 3, host_permissions linkedin.com, content_scripts targeting linkedin.com, run_at document_idle |
| `vite.config.ts` | Multi-entry Vite build via vite-plugin-web-extension + @preact/preset-vite | VERIFIED | Both plugins present; base './' set for extension popup paths |
| `src/content/selectors.ts` | Single-file selector registry — 8 named exports | VERIFIED | All 8 constants exported: SELECTORS_VERSION, FEED_CONTAINER, FEED_CONTAINER_FALLBACK, POST_CARD, POST_URN_ATTR, POST_AUTHOR_NAME, SPONSORED_MARKER, COMPANY_PAGE_MARKER. No CSS class selectors in values. |
| `src/content/observer.ts` | waitForFeedContainer, attachObserver, installSpaNavigationHandler, startObserving | VERIFIED (with gap) | All four functions implemented, exports startObserving. Contains 'data-id' raw literal (INFRA-04 violation). 152 lines — exceeds min_lines: 60. |
| `src/content/index.ts` | Calls startObserving with URN + author logging callback | VERIFIED | Imports startObserving from observer, calls with console.log callback. Imports SELECTORS_VERSION from selectors for startup log. |
| `src/background/index.ts` | Stateless service worker with onMessage and onInstalled | VERIFIED | Both listeners registered. No module-scope mutable state. |
| `src/shared/types.ts` | PostData, DetectionResult, Detector, StorageSchema | VERIFIED | All four interfaces exported with correct shapes. |
| `src/shared/storage.ts` | Typed chrome.storage.local wrapper | VERIFIED | storageGet, storageSet, storageRemove exported. Generic over StorageSchema. No chrome.storage.sync. |
| `.planning/phases/01-foundation/DOM-INSPECTION.md` | Verified selectors from live inspection | PARTIAL | Exists with all 6 required headings. Contains CSS class names alongside data-* selectors in selector lines (warning — not used in code). |

---

### Key Link Verification

| From | To | Via | Status | Details |
|------|----|-----|--------|---------|
| src/manifest.json | src/content/index.ts | content_scripts[0].js = "content/index.ts" | VERIFIED | Pattern "content/index" present |
| src/manifest.json | src/background/index.ts | background.service_worker = "background/index.ts" | VERIFIED | Pattern "background/index" present |
| vite.config.ts | src/manifest.json | webExtension({ manifest: 'manifest.json' }) | VERIFIED | webExtension plugin call with manifest path |
| src/content/observer.ts | src/content/selectors.ts | import { FEED_CONTAINER, FEED_CONTAINER_FALLBACK, POST_CARD, POST_URN_ATTR, POST_AUTHOR_NAME, SELECTORS_VERSION } from './selectors' | VERIFIED | All 6 selector constants imported |
| src/content/index.ts | src/content/observer.ts | import { startObserving } from './observer' | VERIFIED | startObserving imported and called |
| src/content/observer.ts | window.history.pushState | monkey-patch wrapping originalPushState.bind(history) | VERIFIED | history.pushState assignment present at line 116 |
| src/shared/storage.ts | src/shared/types.ts | import type { StorageSchema } | VERIFIED | Generic over StorageSchema |

---

### Data-Flow Trace (Level 4)

| Artifact | Data Variable | Source | Produces Real Data | Status |
|----------|---------------|--------|--------------------|--------|
| src/content/observer.ts | urn, authorName | Live DOM via MutationObserver mutations | Yes — reads from DOM elements as they are added by LinkedIn's React renderer | FLOWING (requires human confirmation on live site) |
| src/shared/storage.ts | StorageSchema keys | chrome.storage.local | Yes — direct chrome API wrapper, no static fallback | FLOWING |

---

### Behavioral Spot-Checks

Step 7b: SKIPPED for extension-specific behaviors requiring a running Chrome session with extension loaded. Build compilation was verified by executor (`npm run build exits 0`, `npx tsc --noEmit exits 0` per SUMMARYs). Static code checks confirm the wiring is correct.

---

### Requirements Coverage

| Requirement | Source Plan | Description | Status | Evidence |
|-------------|------------|-------------|--------|---------|
| INFRA-01 | 01-01-PLAN.md | Extension loads as Chrome MV3 on linkedin.com without errors | HUMAN-NEEDED | Manifest correct, stub entries correct, human verification claimed PASSED in 01-01-SUMMARY.md |
| INFRA-02 | 01-04-PLAN.md | MutationObserver anchored to data-* attributes, logs URN + author on scroll | HUMAN-NEEDED | observer.ts fully implemented; human verification claimed PASSED in 01-04-SUMMARY.md |
| INFRA-03 | 01-03-PLAN.md | Typed chrome.storage.local wrapper exists | SATISFIED | storage.ts exports storageGet/storageSet/storageRemove; no chrome.storage.sync |
| INFRA-04 | 01-03-PLAN.md + 01-04-PLAN.md | Single-file selector registry — single-file fix for any selector breakage | BLOCKED | 'data-id' raw literal in observer.ts line 84 violates single-file guarantee |
| INFRA-05 | 01-04-PLAN.md | Observer survives SPA navigation | HUMAN-NEEDED | installSpaNavigationHandler() present with both pushState and popstate paths; human verification claimed PASSED in 01-04-SUMMARY.md |

---

### Anti-Patterns Found

| File | Line | Pattern | Severity | Impact |
|------|------|---------|----------|--------|
| src/content/observer.ts | 84 | `card.getAttribute('data-id')` — raw LinkedIn attribute string literal outside selector registry | BLOCKER | Violates INFRA-04 single-file fix guarantee; if LinkedIn renames data-id this line requires a separate fix outside selectors.ts |
| .planning/phases/01-foundation/DOM-INSPECTION.md | 5, 10, 15, 19, 22 | CSS class selectors recorded in planning doc (.core-rail, .feed-shared-update-v2, .update-components-actor__*) | WARNING | Plan 02 must_have requires zero CSS class names in DOM-INSPECTION.md; however these were NOT propagated into code — selectors.ts correctly uses only data-* and aria-* |

No occurrences of: `element.remove()`, `chrome.storage.sync`, `attributes: true`, `characterData: true`, `TBD`, `FIXME`, `XXX`, `return null`, hardcoded empty `[]` or `{}` in rendered output paths.

---

### Human Verification Required

The following behavioral checks require a running Chrome session and cannot be verified statically. All three were reported as PASSED by the executor in their respective SUMMARY.md files — but SUMMARY.md is not independent evidence.

#### 1. Extension Loads Without Errors (INFRA-01)

**Test:** Run `npm run build`. Load `dist/` as unpacked extension in chrome://extensions. Navigate to https://www.linkedin.com/feed/.
**Expected:** Extension card shows no errors. Service worker console shows `[LLB] service worker started`. Page console shows `[LLB] content script starting on https://www.linkedin.com/feed/ selectors v 1.0.0`. Popup opens with "LinkedIn Blocker" text.
**Why human:** Requires a running Chrome session with extension installed — cannot simulate extension load or content script injection statically.

#### 2. Observer Logs URN + Author on Scroll (INFRA-02)

**Test:** With extension loaded, open LinkedIn feed. Scroll slowly.
**Expected:** Console shows `[LLB] post urn:li:activity:<id> by <author>` for each new post card. Each URN appears exactly once (no duplicates from React re-renders). No `[LLB] Feed container not found` warning appears.
**Why human:** Requires live DOM mutation events from LinkedIn's React renderer — cannot simulate MutationObserver callbacks against a static file.

#### 3. Observer Survives SPA Navigation (INFRA-05)

**Test:** Navigate feed → profile page → back to feed using both browser Back button and LinkedIn Home link click.
**Expected:** Console resumes `[LLB] post ...` lines within ~2 seconds on each return to /feed/. Both pushState path (Home click) and popstate path (Back button) must work.
**Why human:** Requires live SPA navigation in Chrome — cannot test history.pushState monkey-patch behavior without a running page.

---

### Gaps Summary

**1 BLOCKER gap identified:**

`observer.ts` line 84 contains `card.getAttribute('data-id')` — a raw LinkedIn DOM attribute string literal that should be a named constant in `selectors.ts`. The 01-03-PLAN.md artifact spec did not include a `POST_URN_ATTR_FALLBACK` export, so the executor was not explicitly directed to create it, but the INFRA-04 requirement is clear: all LinkedIn DOM selectors must live in the single registry file so that selector drift requires only a single-file fix.

**Fix required:**
1. Add `export const POST_URN_ATTR_FALLBACK = 'data-id';` to `src/content/selectors.ts`
2. Add `POST_URN_ATTR_FALLBACK` to the import in `src/content/observer.ts`
3. Replace `card.getAttribute('data-id')` with `card.getAttribute(POST_URN_ATTR_FALLBACK)` in observer.ts line 84

This is a small, targeted fix. All other code is well-structured and the architectural goal of Phase 1 is otherwise achieved.

---

_Verified: 2026-05-25_
_Verifier: Claude (gsd-verifier)_
