# Phase 1: Foundation - Context

**Gathered:** 2026-05-25
**Status:** Ready for planning

<domain>
## Phase Boundary

Deliver a working Chrome MV3 extension scaffold that:
1. Loads on linkedin.com without errors
2. Observes the LinkedIn feed DOM with a MutationObserver and logs a post URN + author name for every post card that enters the feed
3. Survives SPA navigation (navigate to profile and back — observer keeps logging)
4. Stores all DOM selectors in a single selector registry file

No scoring, no hiding, no storage writes, no popup. Phase 1 output is console output only.

</domain>

<decisions>
## Implementation Decisions

### Project Scaffolding
- **D-01:** Use a web extension starter template (vite-plugin-web-extension) rather than `npm create vite vanilla-ts` from scratch. This gets the multi-entry Vite config and manifest wiring pre-configured.
- **D-02:** Researcher must verify the current state of vite-plugin-web-extension's official starter (or demo-mv3 template) before the planner commits to this path. Check: Does a clean MV3 + TypeScript template exist? What framework does it scaffold by default? Is it current with Vite 5?
- **D-03:** If no clean template is found, fall back to `npm create vite@latest -- --template vanilla-ts` with manual MV3 config (as documented in `.planning/research/STACK.md`).

### Folder Structure
- **D-04:** Source layout under `src/` with subdirectories per entry point:
  ```
  src/
    content/
      index.ts          ← content script entry point
      observer.ts       ← MutationObserver setup + SPA nav handling
      selectors.ts      ← selector registry (single file for all LinkedIn selectors)
    background/
      index.ts          ← service worker entry (minimal in Phase 1)
    popup/
      index.html
      index.tsx         ← Preact entry (stub in Phase 1, built in Phase 4)
    shared/
      types.ts          ← PostData, DetectionResult interfaces
      storage.ts        ← typed chrome.storage.local wrapper
    manifest.json
  vite.config.ts
  ```

### Observer Anchor (not discussed — planner should apply defaults from research)
- See `.planning/research/ARCHITECTURE.md` §MutationObserver for LinkedIn's Infinite Scroll Feed
- See `.planning/research/PITFALLS.md` §CRIT-3 for SPA navigation pattern
- Recommendation from research: try to find a specific feed container (`[data-finite-scroll-hotkey-context]` or `main`) first; fall back to `document.body` with filtering. Researcher should verify what stable data-* attributes currently exist on the feed container.

### SPA Navigation Detection (not discussed — planner should apply defaults from research)
- See `.planning/research/ARCHITECTURE.md` for the body MutationObserver URL-polling pattern
- Decision from STATE.md: re-init on pushState/popstate
- Researcher should assess: MutationObserver URL polling vs. history.pushState monkey-patch vs. Navigation API — pick the most reliable for Chrome MV3 content scripts

### Phase 1 Scope Boundary (not discussed — planner's call)
- PITFALLS.md §CRIT-1, COMMON-7 recommend a health-check sentinel and cross-context error logging in Phase 1. Planner should decide whether to include:
  - Basic health sentinel (console warning if feed container returns zero nodes after X retries) — recommended to include
  - Full cross-context error logger writing to chrome.storage.local — may defer to Phase 2
- `processedPosts` deduplication Set: include in Phase 1 (prevents duplicate logs during dev, needed before Phase 2 anyway). Cap strategy can be simple (clear on navigation).

### Claude's Discretion
- ESLint + Prettier configuration details (flat config eslint.config.js as per STACK.md)
- TypeScript strictness settings
- Whether the service worker stub in Phase 1 is a bare-minimum file or includes the message listener pattern from ARCHITECTURE.md

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Requirements & Roadmap
- `.planning/REQUIREMENTS.md` — Phase 1 requirements: INFRA-01 through INFRA-05 (exact acceptance criteria)
- `.planning/ROADMAP.md` §Phase 1 — success criteria (4 specific things that must be TRUE)
- `.planning/STATE.md` — accumulated key decisions and research flags

### Stack & Architecture
- `.planning/research/STACK.md` — Full stack decisions: Vite, vite-plugin-web-extension, Preact, TypeScript, @types/chrome, ESLint. Includes exact install commands and vite.config.ts pattern.
- `.planning/research/ARCHITECTURE.md` — Component map, MutationObserver setup, SPA navigation pattern, message passing patterns, pluggable detector interface shape (for Phase 1 type stubs)

### Pitfalls to Avoid
- `.planning/research/PITFALLS.md` — Phase 1 pitfalls: CRIT-1 (class instability → selector registry), CRIT-2 (SW state loss), CRIT-3 (SPA nav), COMMON-1 (observer perf), COMMON-2 (storage design), COMMON-4 (message passing), COMMON-7 (cross-context debugging), COMMON-9 (storage.local only), COMMON-10 (CSP)

### Live Inspection Prerequisite (research flag — must action before coding)
- STATE.md §Research Flags — "Phase 1 prerequisite: Live LinkedIn DOM inspection — post card data-* attributes, feed container selector, stable ancestor for MutationObserver"
- The researcher agent or developer MUST inspect the live LinkedIn feed in DevTools to confirm which data-* attributes exist on post cards before writing any selector. This is the single highest-risk unknown.

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- None — this is the first phase; no existing code in the project.

### Established Patterns
- All patterns are documented in `.planning/research/` — no live code exists to reference yet.

### Integration Points
- Phase 1 creates the foundation everything else builds on:
  - `src/content/selectors.ts` → Phase 2 detection reads from here
  - `src/shared/types.ts` (PostData interface) → Phase 2 detection implements against this
  - `src/shared/storage.ts` → Phase 3 flagged-account writes use this wrapper
  - `src/background/index.ts` → Phase 5 badge updates build on this stub

</code_context>

<specifics>
## Specific Ideas

- The researcher should check the vite-plugin-web-extension repository (github.com/nicepkg/vite-plugin-web-extension or aklinker1/vite-plugin-web-extension — confirm correct repo) for: whether a starter template or demo-mv3 exists, what it scaffolds, and whether it's compatible with Vite 5 + TypeScript.
- If a clean template exists, the plan should include a "verify template output matches expected folder structure" task and a "strip or replace template noise" task.

</specifics>

<deferred>
## Deferred Ideas

- Full cross-context error logging utility (writing errors from all three contexts to chrome.storage.local, surfaced in popup) — strongly recommended by PITFALLS.md COMMON-7 but may be deferred to Phase 2 when the popup exists to show it.
- `processedPosts` LRU eviction (cap at 1000, evict oldest) — basic Set is sufficient for Phase 1; eviction strategy belongs in Phase 2 or Phase 3.
- Infinite scroll sentinel test (verifying CSS hiding doesn't break feed loading) — Phase 2 concern (no hiding in Phase 1).

None of the other gray areas (observer anchor, SPA nav detection method) were discussed — planner has full discretion on those, guided by research docs.

</deferred>

---

*Phase: 1-Foundation*
*Context gathered: 2026-05-25*
