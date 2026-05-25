# Phase 2: Detection Engine - Context

**Gathered:** 2026-05-25
**Status:** Ready for planning

<domain>
## Phase Boundary

Deliver a working heuristic detection engine that:
1. Scores every post card entering the feed using content signals (text analysis) and engagement signals (comment patterns)
2. Hides posts scoring ≥ 60/100 by CSS class toggle (tombstone visible), adds posts scoring 35–59 to review queue without hiding
3. Shows a collapsed tombstone for each hidden post: "Post by [author] hidden (74/100) ▼ reveal" — clickable to reveal the original post
4. Updates the extension badge with the count of posts hidden in the current browser session
5. Stores per-post and per-account signal breakdowns in `chrome.storage.local` for Phase 3 to consume

**Not in Phase 2:**
- Profile signals (DETECT-06: headshot proxy, connection count, bio/headline patterns) — deferred to Phase 3
- Popup UI (Phase 4)
- User decisions (dismiss / block) (Phase 5)
- Configurable threshold UI (Phase 6)

</domain>

<decisions>
## Implementation Decisions

### Signal Scope

- **D-01:** Phase 2 implements **content signals only** for DETECT-01 through DETECT-05:
  - Listicle structure detector (`/^\s*\d+[\.\)]\s/m` with count ≥ 3, or "X things/reasons/lessons" header)
  - Buzzword density scorer (count buzzwords per 100 words; threshold > 3/100)
  - Em-dash frequency counter (count `—` per 100 words; threshold > 2/100)
  - Generic CTA phrase matcher (opener phrases + closing CTA phrases)
  - Non-English hard-exclusion (DETECT-04 — language detection before any heuristic)

- **D-02:** Phase 2 also implements **engagement signals** for DETECT-07:
  - Generic comment pattern detection ("Great insights!", "Couldn't agree more!", "This is gold!", "So true!")
  - Comments are loaded by **automatically clicking the "Show comments" button** on high-scoring posts. The researcher must verify whether LinkedIn's comment expand button is safe to click programmatically (read-only action, not a block/follow action).
  - Engagement signals are secondary: a post with only engagement signals does not reach the hide threshold alone; they contribute to the composite score.

- **D-03:** Profile signals (DETECT-06) are **deferred to Phase 3** — headline formula matching, connection count proxy, job title patterns. Phase 2 creates the signal interface so Phase 3 can add these without changing the call site.

### Scoring Model

- **D-04:** Weighted additive model, normalised to 0–100.
  - **Auto-hide threshold: 60/100** — posts ≥ 60 are hidden + added to review queue
  - **Flag-only threshold: 35/100** — posts 35–59 are added to review queue but remain visible
  - Posts < 35 are ignored (no queue entry, no tombstone)

- **D-05:** Starting signal weights (from FEATURES.md — require empirical calibration after Phase 3):
  | Signal | Weight |
  |--------|--------|
  | Listicle + CTA opener combo | 25 |
  | Buzzword density high | 15 |
  | Em-dash overuse | 10 |
  | Generic CTA close phrase | 10 |
  | Generic comment patterns (DETECT-07) | 15 |
  | Non-English exclusion | hard-exclude (score = 0) |

- **D-06:** No first-post grace period — **auto-hide immediately** if a post scores ≥ 60, regardless of whether the extension has seen the account before. Account history (rolling score) is a Phase 3 feature.

### Hidden Post UX

- **D-07:** Hidden posts are **not removed from the DOM** (`element.remove()` is forbidden per CLAUDE.md). Instead, toggle the `.llb-hidden` CSS class to apply `display: none !important`.

- **D-08:** A **tombstone element** is injected adjacent to the hidden post (not inside it — avoids React VDom conflict). Tombstone is a simple `<div class="llb-tombstone">Post by [author] hidden ([score]/100) ▼</div>`. Clicking the tombstone removes `.llb-hidden` from the post and removes the tombstone.

- **D-09:** Tombstone shows: author display name + composite score. Author name is extracted from `POST_AUTHOR_NAME` selector (known to return `<unknown>` for some render states — researcher should identify a more reliable fallback selector for Phase 2).

### Reshare Handling

- **D-10:** For reshared posts: **score the original post's author**, not the resharer. The extension must detect the reshare DOM pattern (LinkedIn renders a "reshared" indicator in the post header) and extract the original post's text and original author for scoring. The resharer's account is NOT scored or flagged from a reshare event.

### Badge Updates

- **D-11:** Badge shows **posts hidden in the current browser session** — resets to 0 on browser restart (not stored in `chrome.storage.local`). The session count is tracked in the service worker's module scope (acceptable since it resets on SW termination, which aligns with session semantics). The content script sends a `{ type: 'POST_HIDDEN' }` message to the SW on each hide; SW increments its counter and calls `chrome.action.setBadgeText`.

### Hard Exclusions (Pre-detection)

- **D-12:** Before ANY heuristic runs, hard-exclude:
  1. Sponsored/promoted posts (DETECT-02) — selector: `SPONSORED_MARKER` from registry
  2. Company page posts (DETECT-03) — URL pattern: `COMPANY_PAGE_MARKER` from registry
  3. Non-English posts (DETECT-04) — language detection heuristic (researcher to pick approach: `lang` attribute, `navigator.language` + character set sampling, or lightweight library)
  4. "Open to Work" posts — reduce effective threshold by 20 points (require 80/100 to auto-hide) per FEATURES.md false positive mitigation. Open to Work banner is DOM-accessible.

### Pluggable Detector Interface (CONFIG-02)

- **D-13:** The `HeuristicDetector` class implements the `Detector` interface already defined in `src/shared/types.ts`. The content script instantiates `HeuristicDetector` and calls `detector.detect(postData)`. No other file ever calls signal functions directly — they are internal to `HeuristicDetector`. This ensures the call site is unchanged when Phase 6 adds `LLMDetector`.

### Claude's Discretion

- Exact regex patterns for listicle detection, CTA phrase lists, buzzword lists — planner/executor has full discretion; FEATURES.md has recommended starting sets
- Whether tombstone CSS is injected as a `<style>` tag extension of the existing `.llb-hidden` injected style, or a separate injection
- Internal file structure for the detection engine (one file vs. split signal-files) — follow what's most testable
- Language detection implementation detail — researcher picks the most reliable lightweight approach for a content script

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Requirements & Roadmap
- `.planning/REQUIREMENTS.md` — Phase 2 requirements: DETECT-01 through DETECT-07, FEED-01 through FEED-03, CONFIG-02
- `.planning/ROADMAP.md` §Phase 2 — success criteria (5 specific things that must be TRUE)
- `.planning/STATE.md` — key decisions log, research flags

### Detection Signal Design
- `.planning/research/FEATURES.md` — Complete signal catalogue, scoring weights, false positive categories, anti-features (non-English, job seekers, recruiters). Signal Implementation Priority table: content signals = Phase 1 MVP in that doc's terms = our Phase 2.
- `.planning/research/FEATURES.md` §Scoring Approach — Weighted additive model rationale, starting weights table, account-level vs post-level scoring
- `.planning/research/FEATURES.md` §False Positive Risk — Recruiter handling, non-native English writers, new users, ghost-written content

### Architecture
- `.planning/research/ARCHITECTURE.md` — What lives where (content script vs SW vs popup), data flow diagrams, message-passing patterns, badge update path (SW only)
- `.planning/research/PITFALLS.md` — CRIT-1 (selector registry), CRIT-2 (SW state loss), COMMON-1 (observer performance), COMMON-10 (CSP)

### Existing Code (Phase 1 output)
- `src/content/selectors.ts` — selector registry; Phase 2 adds new selectors here (sponsored marker, reshare indicator, comment expand button)
- `src/content/observer.ts` — `startObserving(onPost)` entry point; Phase 2 replaces the console.log callback with the detection + hide pipeline
- `src/shared/types.ts` — `PostData`, `DetectionResult`, `Detector` interfaces; `HeuristicDetector` implements `Detector`
- `src/shared/storage.ts` — typed chrome.storage.local wrapper; Phase 2 writes detection results through this

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- `src/content/observer.ts` — `startObserving(onPost)` callback is the integration point: Phase 2 replaces `console.log('[LLB] post', urn, 'by', authorName)` in `index.ts` with `detector.detect(postData).then(handleResult)`
- `src/content/selectors.ts` — All new selectors (comment expand button, reshare indicator, Open to Work banner) must be added here; Phase 2 adds constants, never embeds strings elsewhere
- `src/shared/types.ts` — `PostData` already has `postText` and `authorProfileUrl` fields; Phase 2 fills these in the observer's `onPost` callback (currently only `urn` and `authorName` are extracted)
- `src/shared/storage.ts` — `storageSet`/`storageGet` generic over `StorageSchema`; Phase 3 expands `StorageSchema`, but Phase 2 can already write using the `flaggedAccounts` stub key

### Established Patterns
- **No inline selector strings** — INFRA-04: any new LinkedIn DOM selector (comment expand, reshare container, OTW banner) must go in `selectors.ts`
- **No `element.remove()`** — CLAUDE.md constraint #2: CSS class toggle only; tombstone is a sibling element, not a modification of the post itself
- **SW is stateless** — badge session counter lives in SW module scope (resets on termination = session semantics) per CLAUDE.md constraint #4
- **`postText` extraction is not yet implemented** — Phase 1 observer only extracts `urn` and `authorName`. Phase 2 must add `postText` extraction to `PostData` before the detector can score content.

### Integration Points
- `src/content/index.ts` calls `startObserving(...)` — Phase 2 changes the callback body to invoke `HeuristicDetector.detect(postData)` and act on the result
- `src/background/index.ts` — add `POST_HIDDEN` message handler to increment session counter and call `chrome.action.setBadgeText`
- `src/shared/storage.ts` `StorageSchema.flaggedAccounts` — Phase 2 writes detection results here (Phase 3 expands the schema with typed `FlaggedAccount` records)

</code_context>

<specifics>
## Specific Ideas

- The tombstone element should be injected **as a sibling** immediately before the hidden post element, not inside it — avoids React VDom conflicts
- Badge text background colour: use LinkedIn blue (`#0077B5`) for the badge background (matches extension branding)
- Tombstone is purely DOM-injected HTML/CSS from the content script — no Preact, no framework; keep it a plain `<div>` with inline-class styling from the injected `<style>` block
- Engagement signal scoring: use Levenshtein distance < 10 on comments > 20 chars for near-duplicate detection (FEATURES.md recommendation)

</specifics>

<deferred>
## Deferred Ideas

- **DETECT-06 (profile signals)** — headline formula matcher, connection count proxy, job title patterns. Deferred to Phase 3 alongside storage schema expansion. Phase 2 creates the signal interface so Phase 3 adds signals without changing the `HeuristicDetector` call site.
- **Recruiter threshold penalty** — FEATURES.md recommends a 20-point threshold increase for accounts with "Recruiter"/"Talent Acquisition"/"HR" in their headline. Requires profile signal extraction (headline reading), so deferred to Phase 3 with DETECT-06.
- **Score decay** — Account scores decaying toward neutral after 30 days of no AI-signal posts. Phase 3 feature, requires rolling history in storage.
- **First-post grace period** — Discussed and explicitly rejected: auto-hide immediately on first post if score ≥ 60.
- **Language detection library** — If the researcher identifies a good lightweight library for language detection, consider it; but a character set heuristic (Latin vs non-Latin script detection) may be sufficient for DETECT-04.

</deferred>

---

*Phase: 2-Detection Engine*
*Context gathered: 2026-05-25*
