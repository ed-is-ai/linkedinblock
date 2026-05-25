# Phase 2: Detection Engine - Research

**Researched:** 2026-05-25
**Domain:** Heuristic text analysis, Chrome MV3 content-script architecture, DOM post extraction, CSS hiding, service-worker message passing
**Confidence:** HIGH for architecture and Chrome API patterns; MEDIUM for LinkedIn DOM specifics; LOW for language-detection heuristic completeness

---

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions

- **D-01:** Content signals (DETECT-01–05): listicle structure, buzzword density, em-dash frequency, CTA phrase matching, non-English hard-exclusion (before any heuristic).
- **D-02:** Engagement signals (DETECT-07): auto-expand "Show comments" on high-scoring posts; generic comment pattern detection. Read-only action; programmatic clicks on comment-expand are safe if they only expand, not interact.
- **D-03:** Profile signals (DETECT-06) are deferred to Phase 3. Phase 2 creates the signal interface so Phase 3 can add signals without changing the HeuristicDetector call site.
- **D-04:** Scoring: weighted additive, normalised 0–100. Auto-hide threshold 60/100. Flag-only threshold 35/100. Under 35: ignored.
- **D-05:** Starting signal weights: Listicle + CTA opener combo = 25, Buzzword density high = 15, Em-dash overuse = 10, Generic CTA close phrase = 10, Generic comment patterns = 15. Weights sum to 75 (leaving 25 for Phase 3 profile signals, or renormalising).
- **D-06:** No first-post grace period — auto-hide immediately if score >= 60.
- **D-07:** Hidden posts use CSS class toggle `.llb-hidden { display: none !important }` — no element.remove().
- **D-08:** Tombstone sibling `<div class="llb-tombstone">` injected immediately before the hidden post. Clicking reveals the post and removes the tombstone.
- **D-09:** Tombstone text: "Post by [author] hidden ([score]/100) ▼". Author name from POST_AUTHOR_NAME selector; fallback to `<unknown>`.
- **D-10:** For reshares: score original author's post, not resharer. Detect reshare DOM pattern, extract original text and original author.
- **D-11:** Badge = posts hidden in current browser session. Session counter in SW module scope (resets on SW termination = session semantics). Content script sends `{ type: 'POST_HIDDEN' }` on each hide; SW increments counter and calls `chrome.action.setBadgeText`.
- **D-12:** Hard exclusions before any heuristic: sponsored posts, company page posts, non-English posts, Open to Work (20-point effective threshold increase, not a hard exclude).
- **D-13:** `HeuristicDetector` implements `Detector` interface from `src/shared/types.ts`. Content script calls `detector.detect(postData)`. Signal functions are internal to HeuristicDetector.
- **No CSS class selectors** — all LinkedIn DOM selectors in `src/content/selectors.ts` using data-*, aria-*, role, semantic elements only.
- **No element.remove()** — CSS class toggle only.
- **Service worker is stateless** — all durable state to `chrome.storage.local` immediately.
- **Hard exclusions first** — sponsored, company pages, non-English, Open to Work before any heuristic.
- **postText extraction not yet implemented** — Phase 1 observer only extracts `urn` and `authorName`. Phase 2 must add `postText` extraction to `PostData`.

### Claude's Discretion

- Exact regex patterns for listicle detection, CTA phrase lists, buzzword lists — FEATURES.md has recommended starting sets.
- Whether tombstone CSS extends the existing `<style>` tag or is a separate injection.
- Internal file structure for the detection engine (one file vs. split signal-files) — follow what's most testable.
- Language detection implementation detail — pick the most reliable lightweight approach for a content script.

### Deferred Ideas (OUT OF SCOPE)

- DETECT-06 profile signals (headline formula, connection count, bio patterns) — Phase 3.
- Recruiter threshold penalty (requires profile signal extraction) — Phase 3.
- Score decay toward neutral after 30 days — Phase 3.
- First-post grace period — explicitly rejected, will not be implemented.
- Language detection library — character set heuristic likely sufficient; library is an option if needed.
</user_constraints>

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|------------------|
| DETECT-01 | Per-post AI language content signals scored: em-dash, listicle, CTA, buzzword density, impersonal framing | HeuristicDetector with weighted additive scoring; pure-function signal modules; testable without browser |
| DETECT-02 | Sponsored/promoted posts hard-excluded (never flagged) | SPONSORED_MARKER selector already in selectors.ts; check before scoring |
| DETECT-03 | Company page posts hard-excluded (never flagged) | COMPANY_PAGE_MARKER pattern in selectors.ts; check authorProfileUrl |
| DETECT-04 | Non-English posts hard-excluded | lang attribute check + script detection heuristic; see Language Detection section |
| DETECT-05 | Per-signal scores stored alongside composite score | `signals` array in `DetectionResult` + per-signal numeric breakdown in storage entry |
| DETECT-07 | Engagement signals: near-duplicate comment detection | Auto-expand comments on high-scoring posts; Levenshtein distance < 10 on 20+ char strings; fast-levenshtein available |
| FEED-01 | Posts >= 60/100 hidden with CSS class injection, not element.remove() | CSS class toggle `.llb-hidden`; tombstone sibling injected |
| FEED-02 | Hidden post count visible on extension icon badge | SW receives POST_HIDDEN message; increments module-scope counter; calls chrome.action.setBadgeText |
| FEED-03 | Already-processed post URNs tracked to prevent duplicate scoring | processedPosts Set already in observer.ts; Phase 2 reuses this — no additional work needed |
| CONFIG-02 | Detector is pluggable via Detector interface | HeuristicDetector implements existing Detector interface from types.ts; call site in index.ts unchanged |
</phase_requirements>

---

## Summary

Phase 2 is a pure logic phase: it adds a scoring engine, a CSS-hiding pipeline, a tombstone UI, and a message to the service worker — all building on the Phase 1 infrastructure that already works. No new selectors are added to the registry, except the six new ones needed for Phase 2 DOM access (post body text, comment expand button, reshare container, Open to Work banner, author profile link). The existing `Detector` interface, `PostData` type, `StorageSchema`, and `storageSet`/`storageGet` wrappers are all in place.

The highest-risk implementation question is **language detection**. The cleanest approach is a two-step heuristic that (1) reads the `lang` attribute from the post's closest ancestor element, and (2) falls back to a script-range character test (detecting non-Latin scripts by Unicode codepoint ranges). This avoids any external library, works synchronously, and handles the most common cases (CJK, Arabic, Hebrew, Cyrillic, Devanagari) without false positives on accented Latin text.

The second-highest-risk question is **comment section expansion**. Clicking LinkedIn's "Show comments" button programmatically is a read-only action (it does not submit, like, or follow), so it does not carry the same ToS risk as block/follow automation. However, the selector for this button is a Phase 2 addition to the registry that requires live DOM verification.

For the Levenshtein-based comment near-duplicate check, `fast-levenshtein` is already transitively present in `node_modules` (via eslint's dependency chain) and passes slopcheck `[OK]`. Installing it as a direct dependency is low-risk and saves ~30 lines of hand-rolled code.

**Primary recommendation:** Structure the detection engine as `src/content/detector/` with one file per concern (`heuristic.ts`, `signals/`, `tombstone.ts`). The HeuristicDetector class lives in `heuristic.ts`; each signal function lives in its own `signals/*.ts` file (pure functions, no DOM access) for unit-testability. The observer callback in `index.ts` calls `detector.detect(postData)` and routes the result through a `handleResult()` function that does hiding, storage writes, and badge messages.

---

## Architectural Responsibility Map

| Capability | Primary Tier | Secondary Tier | Rationale |
|------------|-------------|----------------|-----------|
| Post text extraction (postText) | Content Script | — | Requires DOM access; co-located with observer to avoid serialisation |
| Hard exclusion checks (sponsored, company, language, OtW) | Content Script | — | DOM reads for sponsored/OtW; URL check for company; all synchronous before async detect() call |
| Heuristic scoring (signal functions) | Content Script (pure functions) | — | Pure text analysis; no DOM access; testable in Node.js |
| CSS hiding + tombstone injection | Content Script | — | DOM write; must be synchronous after detection result |
| processedPosts deduplication | Content Script (memory) | — | Already in observer.ts; Phase 2 reuses without change |
| Detection result storage writes | Content Script (direct storage.local) | — | CS can write directly; no SW coordination needed for this |
| Badge counter | Service Worker (module scope) | — | Only SW can call chrome.action.setBadgeText; session counter acceptable |
| POST_HIDDEN message passing | Content Script → Service Worker | — | Fire-and-forget; drop if SW is sleeping (badge staleness is acceptable) |
| Comment expansion click | Content Script | — | DOM interaction; read-only action |
| Comment text extraction | Content Script | — | DOM read after comment expansion |

---

## Standard Stack

### Core

| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| (no new runtime deps required) | — | All Phase 2 logic uses Web APIs and existing deps | Detection is pure text analysis; no additional library needed beyond optional Levenshtein |

### Supporting

| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| fast-levenshtein | 3.0.0 [VERIFIED: npm registry] | Edit distance for near-duplicate comment detection | Add as direct dependency for DETECT-07 comment deduplication; avoids hand-rolling O(nm) algorithm with Unicode edge cases |
| @types/fast-levenshtein | 0.0.4 [VERIFIED: npm registry] | TypeScript declarations for fast-levenshtein | Install alongside fast-levenshtein |

### Alternatives Considered

| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| fast-levenshtein | Hand-rolled Levenshtein | ~25 lines of code, no dependency; viable but fast-levenshtein has locale-aware collator support and is already in the tree — direct install is lower risk than a hand-rolled implementation with edge cases |
| fast-levenshtein | `fastest-levenshtein` | Newer, possibly faster; but fast-levenshtein is already in node_modules, well-established (2013, 50M+ weekly downloads), and passes slopcheck |
| Character-set language detection | `franc` or `langdetect` library | Libraries are more accurate but add bundle weight to the content script; for the use case (block CJK, Arabic, Cyrillic, Devanagari) a Unicode codepoint range test is sufficient and zero-dependency |

**Installation:**
```bash
npm install fast-levenshtein
npm install -D @types/fast-levenshtein
```

**Version verification:**
```bash
npm view fast-levenshtein version    # 3.0.0
npm view @types/fast-levenshtein version  # 0.0.4
```

---

## Package Legitimacy Audit

> Package Legitimacy Gate was executed on 2026-05-25 against the npm registry.

| Package | Registry | Age | Downloads | Source Repo | slopcheck | Disposition |
|---------|----------|-----|-----------|-------------|-----------|-------------|
| fast-levenshtein | npm | ~12 yrs (2013-04-18) | ~50M/wk (via eslint dep chain) | github.com/hiddentao/fast-levenshtein | [OK] — "name looks like LLM bait but package is established" | Approved |
| @types/fast-levenshtein | npm | ~8 yrs (DefinitelyTyped) | Proportional to fast-levenshtein | github.com/DefinitelyTyped/DefinitelyTyped | Not run — DefinitelyTyped package; inherently low-risk | Approved |

**Packages removed due to slopcheck [SLOP] verdict:** none
**Packages flagged as suspicious [SUS]:** none

No `postinstall` scripts found on either package via `npm view <pkg> scripts.postinstall`.

**Note:** `fast-levenshtein` is already a transitive dependency of `eslint@9.x` in this project's `node_modules`. Making it a direct dependency adds no net new code to `node_modules`.

---

## Architecture Patterns

### System Architecture Diagram

```
LinkedIn feed mutation fires
  |
  v
observer.ts: MutationObserver callback
  |  extractPostData(postNode) <--- NEW in Phase 2
  |    reads: postText, authorProfileUrl
  |    (authorName, urn already extracted in Phase 1)
  |
  v
index.ts: onPost callback
  |
  +--- isHardExcluded(postData, postNode)?
  |      YES --> return (do nothing)
  |      [checks: SPONSORED_MARKER, COMPANY_PAGE_MARKER, non-English, Open-to-Work]
  |
  +--- detector.detect(postData)  <--- HeuristicDetector
  |      |
  |      +--- checkListicle()     --> signal "listicle"   +25
  |      +--- checkBuzzwords()    --> signal "buzzword"   +15
  |      +--- checkEmDash()       --> signal "em-dash"    +10
  |      +--- checkCtaClose()     --> signal "cta-close"  +10
  |      |     (content signals only; engagement signals below require comment expansion)
  |      |
  |      +--- [if raw content score > 20]: expandComments(postNode)
  |      |       --> commentTexts[]
  |      |       --> checkGenericComments()  --> signal "generic-comments"  +15
  |      |
  |      --> DetectionResult { score: 0-100, signals[], confidence, engineUsed }
  |
  +--- score < 35  --> ignore (do nothing)
  |
  +--- 35 <= score < 60  --> writeToStorage(flaggedAccounts, status='pending')
  |                          (no hiding, no tombstone)
  |
  +--- score >= 60  --> CSS hide: postNode.classList.add('llb-hidden')
                        injectTombstone(postNode, authorName, score)
                        writeToStorage(flaggedAccounts, status='pending', hiddenPostId=urn)
                        chrome.runtime.sendMessage({ type: 'POST_HIDDEN' })
                          |
                          v
                        background/index.ts: onMessage handler
                          sessionHiddenCount++
                          chrome.action.setBadgeText({ text: String(sessionHiddenCount) })
                          chrome.action.setBadgeBackgroundColor({ color: '#0077B5' })
```

### Recommended Project Structure

```
src/
  content/
    index.ts              # entry point: wires detector into observer callback
    observer.ts           # Phase 1: unchanged except extractPostData() added
    selectors.ts          # Phase 1 + Phase 2 additions (comment expand, reshare, OtW)
    detector/
      heuristic.ts        # HeuristicDetector class; orchestrates signal calls
      signals/
        listicle.ts       # checkListicle(text): number
        buzzwords.ts      # checkBuzzwords(text): number
        em-dash.ts        # checkEmDash(text): number
        cta.ts            # checkCta(text): number
        comments.ts       # checkGenericComments(texts: string[]): number
      language.ts         # isNonEnglish(postNode: Element): boolean
      tombstone.ts        # injectTombstone / revealPost DOM manipulation
      exclusions.ts       # isHardExcluded() — combines all pre-detection checks
  background/
    index.ts              # Phase 2: adds POST_HIDDEN handler + session counter
  shared/
    types.ts              # Phase 2: expands PostData + StorageSchema
    storage.ts            # unchanged
```

**Why split signal files:** Each signal function is a pure function that takes a string and returns a number. Splitting them enables unit testing in Node.js without a browser or DOM, and keeps the scope of each function to ~20-40 lines. The HeuristicDetector class remains the only entry point; signal functions are not exported from the `detector/` package boundary to outside files.

### Pattern 1: postText Extraction

**What:** Phase 1's `observer.ts` only extracted `urn` and `authorName`. Phase 2 must add `postText` (and `authorProfileUrl`) extraction.

**When to use:** Inside the `attachObserver` mutation callback, alongside existing URN and author extraction.

**Key concern:** LinkedIn's post text is often split across multiple child elements (the "see more" expand, the hashtag block, etc.). The safest extraction is `postNode.innerText` or reading a known container. Avoid `.innerHTML` (triggers XSS risk and strips structure). LinkedIn renders post body text in an element with `data-test-id="main-feed-activity-card__commentary"` or within a `<span>` that is a sibling of the author attribution area.

**New selectors needed in selectors.ts:**
```typescript
// Post body text container
// [ASSUMED] -- needs live DOM verification; inspect data-test-id on the text block
export const POST_BODY_TEXT = '[data-test-id*="commentary"]';

// Author profile link (to extract authorProfileUrl)
// [ASSUMED] -- inspect the anchor tag wrapping the author name in the post header
export const POST_AUTHOR_LINK = 'a[data-anonymize="person-name"]';

// Reshare container (LinkedIn renders "Reshared post" or a nested card)
// [ASSUMED] -- inspect a reshared post in DevTools; look for data-urn on a nested card
export const RESHARE_INDICATOR = '[data-urn^="urn:li:share:"]';

// Comment expand button
// [ASSUMED] -- LinkedIn uses aria-label="Show comments" or data-control-name="comments"
export const COMMENT_EXPAND_BUTTON = '[aria-label*="comment"], [data-control-name*="comment"]';

// Open to Work banner
// [ASSUMED] -- LinkedIn renders a #open-to-work overlay on the author avatar
// or an aria-label="Open to work" badge
export const OPEN_TO_WORK_MARKER = '[aria-label*="Open to work"], [aria-label*="open to work"]';

// Comment text within the expanded comments section
// [ASSUMED]
export const COMMENT_TEXT = '[data-test-id*="comment-body"], [data-id*="comment"] span';
```

**All selectors tagged [ASSUMED] require live DOM verification before code is written. Add to selectors.ts only after inspection.**

### Pattern 2: Hard Exclusion Check

**What:** Before calling `detector.detect()`, run synchronous checks that short-circuit all heuristic work.

**When to use:** In `index.ts` inside the `onPost` callback, immediately after `extractPostData()`.

**Example:**
```typescript
// src/content/exclusions.ts
import {
  SPONSORED_MARKER,
  COMPANY_PAGE_MARKER,
  OPEN_TO_WORK_MARKER,
} from './selectors';
import { isNonEnglish } from './detector/language';
import type { PostData } from '../shared/types';

export interface ExclusionResult {
  excluded: boolean;
  reason?: string;
  openToWork?: boolean; // true = raise effective threshold by 20
}

export function checkExclusions(
  postData: PostData,
  postNode: Element
): ExclusionResult {
  // 1. Sponsored post
  if (postNode.querySelector(SPONSORED_MARKER)) {
    return { excluded: true, reason: 'sponsored' };
  }
  // 2. Company page
  if (postData.authorProfileUrl.includes(COMPANY_PAGE_MARKER)) {
    return { excluded: true, reason: 'company-page' };
  }
  // 3. Non-English
  if (isNonEnglish(postNode, postData.postText)) {
    return { excluded: true, reason: 'non-english' };
  }
  // 4. Open to Work (NOT excluded — threshold raised instead)
  const openToWork = !!postNode.querySelector(OPEN_TO_WORK_MARKER);
  return { excluded: false, openToWork };
}
```

**Effective threshold when Open to Work is detected:** `autoHideThreshold + 20` (default: 60 + 20 = 80). Apply this adjustment in `index.ts` before the hide/flag decision.

### Pattern 3: Language Detection (Non-English Exclusion)

**What:** DETECT-04 requires non-English posts to be hard-excluded. The lightest approach that covers the most common cases is a two-step test:
1. Read the `lang` attribute from the post's root element or a known container.
2. If no `lang` attribute, test post text against Unicode script ranges for non-Latin scripts.

**Why this approach:**
- `lang` attribute: LinkedIn renders post content inside elements that may carry `lang` attributes (they use React intl and browser locale awareness). Reading this attribute is O(1) and deterministic.
- Script range detection: Counts characters in non-Latin Unicode ranges (CJK, Arabic, Hebrew, Cyrillic, Devanagari, Thai, Korean). If more than 20% of alphanumeric characters are in these ranges, treat as non-English. This safely excludes posts in CJK, Arabic, Cyrillic, etc. without false-positives on French/German/Spanish (all Latin-script).
- No library needed. Zero bundle size impact.

**Limitation:** A post in Turkish, Finnish, or Indonesian will pass the Latin-script test and proceed to scoring. These are all-Latin-script languages. The content heuristics (em-dash, specific CTA phrases) are English-specific enough that false positives on Latin-non-English posts are unlikely to reach the hide threshold. This is an acceptable limitation for v1.

**Example:**
```typescript
// src/content/detector/language.ts
const NON_LATIN_RANGES: Array<[number, number]> = [
  [0x4E00, 0x9FFF],   // CJK Unified Ideographs
  [0x3040, 0x30FF],   // Hiragana + Katakana
  [0xAC00, 0xD7AF],   // Korean Hangul
  [0x0600, 0x06FF],   // Arabic
  [0x0590, 0x05FF],   // Hebrew
  [0x0400, 0x04FF],   // Cyrillic
  [0x0900, 0x097F],   // Devanagari
  [0x0E00, 0x0E7F],   // Thai
];

export function isNonEnglish(postNode: Element, postText: string): boolean {
  // Step 1: lang attribute on the post node or its nearest ancestor
  const langEl = postNode.closest('[lang]');
  if (langEl) {
    const lang = langEl.getAttribute('lang') ?? '';
    if (lang && !lang.startsWith('en')) return true;
  }
  // Step 2: script character sampling (at most first 500 chars)
  const sample = postText.slice(0, 500);
  let nonLatin = 0;
  let total = 0;
  for (const ch of sample) {
    const cp = ch.codePointAt(0) ?? 0;
    if (cp > 127) {
      total++;
      if (NON_LATIN_RANGES.some(([lo, hi]) => cp >= lo && cp <= hi)) {
        nonLatin++;
      }
    }
  }
  return total > 10 && nonLatin / total > 0.3;
}
```

### Pattern 4: Levenshtein Comment Near-Duplicate Detection

**What:** DETECT-07 requires detecting generic near-duplicate comments ("Great insights!", "Couldn't agree more!") to score engagement signals.

**When to use:** After comment expansion on posts that score > 20 on content signals.

**Approach:**
1. Only process comments > 20 characters (avoids false positives on short "Thanks!" replies).
2. For each comment, check against the generic phrase list first (exact match, O(1)).
3. For comments not in the exact list, compute Levenshtein distance against each other comment in the set. Distance < 10 = near-duplicate pair.
4. If >= 2 near-duplicate comments exist in the post, the engagement signal fires.

**Using fast-levenshtein:**
```typescript
// src/content/detector/signals/comments.ts
import levenshtein from 'fast-levenshtein';

const GENERIC_PHRASES = new Set([
  'great insights!',
  "couldn't agree more!",
  "couldn't agree more",
  'this is gold!',
  'so true!',
  'saving this!',
  'well said!',
  'love this!',
  'this is so true',
  'great post!',
]);

export function checkGenericComments(commentTexts: string[]): number {
  const eligible = commentTexts.filter(t => t.length > 20);
  if (eligible.length < 2) return 0;

  // Exact generic phrase match
  const genericHits = eligible.filter(t => GENERIC_PHRASES.has(t.toLowerCase().trim()));
  if (genericHits.length >= 2) return 15; // full signal weight

  // Near-duplicate fuzzy check
  let nearDupCount = 0;
  for (let i = 0; i < eligible.length; i++) {
    for (let j = i + 1; j < eligible.length; j++) {
      if (levenshtein.get(eligible[i]!, eligible[j]!) < 10) {
        nearDupCount++;
        if (nearDupCount >= 2) return 10; // partial signal weight
      }
    }
  }
  return 0;
}
```

**Performance note:** The nested loop is O(n²) in comment count. LinkedIn posts rarely have more than 20 visible comments in the initial expand. Cap at 20 comments max to bound this to 190 comparisons.

### Pattern 5: Tombstone Injection

**What:** A sibling `<div class="llb-tombstone">` injected immediately before the hidden post element.

**Constraints:**
- Must be a sibling (not inside the post) to avoid React VDom conflict.
- Plain DOM — no Preact, no framework.
- Tombstone CSS can extend the existing `<style id="llb-styles">` block injected at content script startup.

**Example:**
```typescript
// src/content/detector/tombstone.ts
export function injectTombstone(
  postNode: Element,
  authorName: string,
  score: number
): void {
  const tombstone = document.createElement('div');
  tombstone.className = 'llb-tombstone';
  tombstone.setAttribute('role', 'button');
  tombstone.setAttribute('aria-label', `Reveal post by ${authorName}`);
  tombstone.textContent = `Post by ${authorName} hidden (${score}/100) ▼`;
  tombstone.addEventListener('click', () => {
    postNode.classList.remove('llb-hidden');
    tombstone.remove();
  });
  postNode.parentNode?.insertBefore(tombstone, postNode);
}
```

**CSS (add to existing llb-styles block):**
```css
.llb-tombstone {
  padding: 8px 16px;
  background: #f3f2ef;
  border: 1px solid #e0e0e0;
  border-radius: 4px;
  color: #666;
  font-size: 14px;
  cursor: pointer;
  margin: 4px 0;
}
.llb-tombstone:hover {
  background: #e8e8e8;
}
```

### Pattern 6: Reshare Detection

**What:** LinkedIn displays reshared posts with a "nested card" structure — the resharing user's wrapper post card contains an inner card (the original post). Phase 2 must detect this pattern and score the original post's author, not the resharer.

**DOM pattern (ASSUMED — verify in DevTools):** The original post appears as a nested element with its own URN attribute (typically `urn:li:share:` prefix rather than `urn:li:activity:`). The resharer's post card wraps it.

**Logic:**
```typescript
// In extractPostData(), after getting the outer postNode:
const innerCard = postNode.querySelector(RESHARE_INDICATOR);
if (innerCard) {
  // This is a reshare — extract postText and authorName from the inner card
  // The outer card's author is the resharer; the inner card's author is the original
  return extractPostDataFromNode(innerCard, urn); // urn stays as resharer's activity urn
}
```

**Key decision from D-10:** The `urn` in `PostData` remains the reshare activity URN (for deduplication and storage key purposes). The `authorId`, `authorName`, `authorProfileUrl`, and `postText` are extracted from the original inner card.

### Pattern 7: POST_HIDDEN Message to Service Worker

**What:** Content script sends a fire-and-forget message to the SW on each hide, for badge counter increment.

**Pattern:**
```typescript
// src/content/index.ts — after CSS hiding
chrome.runtime.sendMessage({ type: 'POST_HIDDEN' }).catch(() => {
  // SW may be sleeping; badge staleness is acceptable per D-11
});
```

**Service worker handler:**
```typescript
// src/background/index.ts
let sessionHiddenCount = 0; // module scope — acceptable; resets on SW termination = session semantics

chrome.runtime.onMessage.addListener((message, _sender, _sendResponse) => {
  if (message.type === 'POST_HIDDEN') {
    sessionHiddenCount++;
    chrome.action.setBadgeText({ text: String(sessionHiddenCount) });
    chrome.action.setBadgeBackgroundColor({ color: '#0077B5' });
  }
  return false;
});
```

**Note:** `chrome.action.setBadgeText` requires the manifest's `"action"` key to be present — confirmed in `src/manifest.json`. No additional permissions needed.

### Pattern 8: StorageSchema Expansion for Phase 2

**What:** Phase 3 owns the full `FlaggedAccount` interface, but Phase 2 must write detection results to storage. The minimal Phase 2 storage entry:

```typescript
// src/shared/types.ts — add to StorageSchema
export interface FlaggedAccountStub {
  authorId: string;
  authorName: string;
  authorProfileUrl: string;
  compositeScore: number;
  signals: Record<string, number>; // signal name -> individual score
  hiddenPostUrns: string[];
  firstSeenAt: number;
  lastSeenAt: number;
  status: 'pending';
}

// Update StorageSchema:
export interface StorageSchema {
  flaggedAccounts?: Record<string, FlaggedAccountStub>;
}
```

Phase 3 will expand `FlaggedAccountStub` to the full `FlaggedAccount` type (adding `postCount`, `peakScore`, `status: 'pending' | 'blocked' | 'dismissed'`, etc.) without breaking Phase 2's write path.

### Anti-Patterns to Avoid

- **Calling `detector.detect()` before exclusion checks:** Hard exclusions must run synchronously before any async heuristic. An AI-looking sponsored post should never reach the detector.
- **Storing postText in chrome.storage.local:** PostData is memory-only per STATE.md decision (privacy). Only metadata (scores, signals, authorId) is persisted.
- **Using `element.innerHTML` to extract postText:** XSS risk. Use `innerText` or targeted `.textContent` reads.
- **Observing `attributes: true` in MutationObserver:** LinkedIn continuously mutates attributes in React reconciliation. Only `childList: true, subtree: true` should be observed (already correct in Phase 1 observer.ts).
- **Hiding the feed container instead of the post card:** CSS `display: none` on a parent container can break LinkedIn's infinite scroll sentinel. Apply `.llb-hidden` to the specific post card element only.
- **Injecting tombstone inside the post node:** React may overwrite it. Insert as a sibling (`insertBefore`).
- **Assuming the SW is awake for badge updates:** Always wrap `chrome.runtime.sendMessage` in `.catch(() => {})` for POST_HIDDEN messages — badge staleness is acceptable.

---

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Edit distance for comment near-dup detection | Custom O(nm) Levenshtein | `fast-levenshtein` | Handles Unicode surrogate pairs and locale-aware collation; already in node_modules tree; passes slopcheck [OK] |
| Language detection for Latin vs. non-Latin scripts | External language ID library (franc, langdetect) | Unicode codepoint range test (20 lines, zero deps) | Library adds bundle weight; the use case only needs CJK/Arabic/Cyrillic/Devanagari detection; range test is sufficient |
| Badge text management | Custom badge state in storage | SW module-scope integer | Session counter is intentionally ephemeral; storage would persist across sessions, which contradicts D-11 |
| Tombstone CSS injection | `chrome.scripting.insertCSS` from SW | `<style>` tag appended to `document.head` in content script at startup | SW approach adds async latency and requires SW to be awake; content script approach is synchronous |
| DOM selector strings | Inline selector strings in signal files | All selectors in `selectors.ts` only | CLAUDE.md constraint #1 and INFRA-04 |

**Key insight:** The detection logic is almost entirely pure text analysis. The only DOM interaction needed is (1) read postText at extraction time, (2) click comment expand button, and (3) read comment text. Everything between DOM reads and DOM writes (hiding/tombstone) is pure functions that can be unit tested.

---

## Common Pitfalls

### Pitfall 1: postText Extraction Misses Content After "See More"

**What goes wrong:** LinkedIn truncates long posts with a "See more" button. Extracting `postNode.querySelector(POST_BODY_TEXT)?.textContent` may only return the visible truncated text, not the full post.

**Why it happens:** LinkedIn's React rendering toggles a `aria-hidden` span for the overflow content. The hidden content IS in the DOM; it just has `aria-hidden="true"` or is inside a clamp container.

**How to avoid:** Use `postNode.querySelector(POST_BODY_TEXT)?.innerText` rather than `.textContent` — `innerText` respects CSS visibility but follows the full text flow. Alternatively, concatenate all direct text-containing children of the body container. Test with a known long post.

**Warning signs:** Listicle detector never fires on posts that require "See more" to see the numbered items.

---

### Pitfall 2: Comment Expand Button Selector Breaks LinkedIn

**What goes wrong:** The comment expand button selector (COMMENT_EXPAND_BUTTON) is a Phase 2 addition to the registry. If the selector is wrong or stale, clicking does nothing and `expandComments()` returns an empty array — silently degrading engagement signal to always-zero.

**Why it happens:** LinkedIn renames aria-labels and data-control-name attributes. COMMENT_EXPAND_BUTTON is [ASSUMED] and requires live DOM verification.

**How to avoid:** Test comment expansion manually on first extension load in Phase 2. Log a warning if `postNode.querySelector(COMMENT_EXPAND_BUTTON)` returns null on a post that visibly has comments.

**Warning signs:** DETECT-07 signals never fire regardless of post type.

---

### Pitfall 3: CSS Hiding Breaks LinkedIn Infinite Scroll Sentinel

**What goes wrong:** LinkedIn uses an IntersectionObserver or scroll sentinel element at the bottom of the feed to trigger loading more posts. If hiding post cards affects the layout in a way that removes this sentinel from the viewport, infinite scroll stops working.

**Why it happens:** `display: none !important` removes elements from layout flow entirely. If the sentinel is positioned relative to the last visible post, hiding many posts can push the sentinel far up the page, never triggering the next load.

**How to avoid:** Apply `.llb-hidden` to the post card only, not to its parent container. The tombstone replaces the visual space, which may be enough to keep scroll sentinel triggering. STATE.md flags this as a research item: "Phase 2 validation: CSS hiding does not break LinkedIn infinite scroll sentinel." Test manually by scrolling past several hidden posts and verifying new posts load.

**Warning signs:** Feed stops loading new posts after a few hidden posts appear.

---

### Pitfall 4: Tombstone Triggers React Reconciliation Warning

**What goes wrong:** LinkedIn's React tree includes the post cards and their parents. Injecting a tombstone element as a sibling modifies the parent's `childNodes`. React may detect an unexpected node and log reconciliation warnings or, in worst case, overwrite the tombstone on its next render pass.

**Why it happens:** React checks the DOM against its virtual DOM tree. Foreign nodes injected by content scripts are "unexpected" from React's perspective.

**How to avoid:** Insert the tombstone immediately before the post (not inside it) using `parentNode.insertBefore(tombstone, postNode)`. React reconciles children of a node starting from its known children list — foreign siblings are typically ignored by React as it does not own the parent at that granularity. Phase 1 confirmed that `.llb-hidden` class toggles survive reconciliation. The same principle applies to sibling injection.

**Warning signs:** Tombstone disappears after ~1 second; console has React reconciliation warnings.

---

### Pitfall 5: SW Badge Counter Out of Sync on Extension Reload

**What goes wrong:** When the extension is reloaded from `chrome://extensions` while a LinkedIn tab is open, the content script becomes "orphaned" — it has an invalidated extension context. Any subsequent `chrome.runtime.sendMessage()` call throws "Extension context invalidated". If not caught, this crashes the content script.

**Why it happens:** Chrome invalidates content script extension contexts when the extension is reloaded without reloading the tab.

**How to avoid:** Always wrap `chrome.runtime.sendMessage` in a try/catch or `.catch()` handler. Already documented in PITFALLS.md COMMON-4. Apply the same pattern for the POST_HIDDEN message.

**Warning signs:** Content script throws uncaught exception after extension reload; feed detection stops working without a tab reload.

---

### Pitfall 6: Reshare URN Naming Conflict in processedPosts

**What goes wrong:** A reshared post has two URNs: the reshare activity URN (`urn:li:activity:X`) and the original post's URN (may be `urn:li:share:Y`). If both end up in `processedPosts`, the same original content appearing in multiple people's reshares may be processed only once.

**Why it happens:** The observer deduplicates by URN. If the inner card also carries a URN in `processedPosts`, a second reshare of the same original content by a different user would be skipped.

**How to avoid:** Deduplicate by the outer (reshare) activity URN only — each reshare event is a unique feed entry deserving its own scoring and hide decision. Do not add the inner card's URN to `processedPosts`.

**Warning signs:** Multiple reshares of the same post all have the same display URN; second and subsequent reshares are not scored.

---

## Code Examples

### HeuristicDetector Skeleton

```typescript
// src/content/detector/heuristic.ts
// Source: ARCHITECTURE.md §Pluggable Detection Design + CONTEXT.md §D-13
import type { PostData, DetectionResult, Detector } from '../../shared/types';
import { checkListicle } from './signals/listicle';
import { checkBuzzwords } from './signals/buzzwords';
import { checkEmDash } from './signals/em-dash';
import { checkCta } from './signals/cta';
import { checkGenericComments } from './signals/comments';
import { expandComments } from '../dom-utils'; // reads comment text from DOM

export class HeuristicDetector implements Detector {
  name = 'heuristic';

  async detect(post: PostData): Promise<DetectionResult> {
    const signals: Record<string, number> = {};
    let score = 0;

    const listicleScore = checkListicle(post.postText);
    const ctaScore = checkCta(post.postText);
    const listicleCtaCombo = listicleScore > 0 && ctaScore > 0 ? 25 : (listicleScore > 0 ? 12 : ctaScore > 0 ? 8 : 0);
    if (listicleCtaCombo > 0) { signals['listicle-cta'] = listicleCtaCombo; score += listicleCtaCombo; }

    const buzzScore = checkBuzzwords(post.postText);
    if (buzzScore > 0) { signals['buzzword'] = buzzScore; score += buzzScore; }

    const emDashScore = checkEmDash(post.postText);
    if (emDashScore > 0) { signals['em-dash'] = emDashScore; score += emDashScore; }

    const ctaCloseScore = checkCta(post.postText); // separate close-phrase check
    if (ctaCloseScore > 0) { signals['cta-close'] = ctaCloseScore; score += ctaCloseScore; }

    // Engagement signals — only expand comments if content score warrants it
    if (score > 20 && post.urn) {
      const comments = await expandComments(post.urn);
      const commentScore = checkGenericComments(comments);
      if (commentScore > 0) { signals['generic-comments'] = commentScore; score += commentScore; }
    }

    const finalScore = Math.min(score, 100);
    return {
      score: finalScore,
      signals: Object.keys(signals),
      signalBreakdown: signals,  // stored per DETECT-05
      confidence: finalScore >= 60 ? 'high' : finalScore >= 35 ? 'medium' : 'low',
      engineUsed: 'heuristic',
    };
  }
}
```

### Listicle Signal (Pure Function)

```typescript
// src/content/detector/signals/listicle.ts
// Source: FEATURES.md §AI Linguistic Pattern Detection, CONTEXT.md D-01
const NUMBERED_LINE = /^\s*\d+[\.\)]\s/m;
const LISTICLE_HEADER = /\b(here'?s?\s+)?\d+\s+(things?|reasons?|lessons?|tips?|ways?|steps?)\b/i;
const MIN_NUMBERED_ITEMS = 3;

export function checkListicle(text: string): number {
  const headerMatch = LISTICLE_HEADER.test(text);
  const lines = text.split('\n');
  const numberedLines = lines.filter(l => NUMBERED_LINE.test(l)).length;

  if (headerMatch && numberedLines >= 2) return 12; // strong listicle signal
  if (numberedLines >= MIN_NUMBERED_ITEMS) return 8; // numbered structure without header
  if (headerMatch) return 6; // header but no numbered items yet (content truncated?)
  return 0;
}
```

### Buzzword Signal (Pure Function)

```typescript
// src/content/detector/signals/buzzwords.ts
// Source: FEATURES.md §High-confidence indicators
const BUZZWORDS = [
  'synergy', 'leverage', 'game-changer', 'game changer', 'disruptive',
  'innovative', 'thought leader', 'holistic', 'paradigm shift',
  'actionable insights', 'move the needle', 'circle back', 'deep dive',
  'boil the ocean', 'bleeding edge', 'best-in-class', 'value-add',
  'low-hanging fruit', 'scalable', 'bandwidth', 'pivot',
];
const BUZZ_RE = new RegExp(`\\b(${BUZZWORDS.map(w => w.replace(/ /g, '\\s+')).join('|')})\\b`, 'gi');

export function checkBuzzwords(text: string): number {
  const words = text.trim().split(/\s+/).length;
  if (words < 20) return 0; // too short to be meaningful
  const hits = (text.match(BUZZ_RE) ?? []).length;
  const density = (hits / words) * 100;
  if (density > 3) return 15;   // > 3 per 100 words: strong signal
  if (density > 1.5) return 8;  // > 1.5 per 100 words: weak signal
  return 0;
}
```

### Em-Dash Signal (Pure Function)

```typescript
// src/content/detector/signals/em-dash.ts
// Source: FEATURES.md §High-confidence indicators
export function checkEmDash(text: string): number {
  const words = text.trim().split(/\s+/).length;
  if (words < 30) return 0;
  const emDashes = (text.match(/—/g) ?? []).length;
  const density = (emDashes / words) * 100;
  if (density > 2) return 10;  // > 2 per 100 words
  if (density > 1) return 5;   // > 1 per 100 words
  return 0;
}
```

### CTA Phrase Signal (Pure Function)

```typescript
// src/content/detector/signals/cta.ts
// Source: FEATURES.md §High-confidence indicators
const CTA_OPENERS = [
  /\bexcited to announce\b/i,
  /\bthrilled to share\b/i,
  /\bhumbled (and )?honored\b/i,
  /\bproud to announce\b/i,
  /\bdelighted to share\b/i,
];
const CTA_CLOSERS = [
  /\bwhat do you think\b/i,
  /\bdrop a comment\b/i,
  /\bfollow (me )?for more\b/i,
  /\blike (this post|and follow)\b/i,
  /\bsave this (for later)?\b/i,
  /\bshare (this|your thoughts)\b/i,
  /\blet me know (in the comments|below)\b/i,
];

export function checkCta(text: string): number {
  const openerHits = CTA_OPENERS.filter(re => re.test(text)).length;
  const closerHits = CTA_CLOSERS.filter(re => re.test(text)).length;
  if (openerHits >= 1 && closerHits >= 1) return 10; // both opener and closer
  if (closerHits >= 1) return 6;
  if (openerHits >= 1) return 4;
  return 0;
}
```

---

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| MV2 persistent background page | MV3 service worker (ephemeral) | Chrome MV3 mandate | SW terminates after ~30s idle; session counter in module scope is fine because session = SW lifetime |
| `chrome.browserAction` (MV2) | `chrome.action` (MV3) | MV3 | `chrome.action.setBadgeText` is the correct API; already in manifest |
| Levenshtein hand-roll | `fast-levenshtein` 3.0.0 | Library existed since 2013 | No change needed; just install as direct dep |

**Deprecated/outdated patterns:**
- `chrome.browserAction.setBadgeText`: Removed in MV3 — use `chrome.action.setBadgeText`.
- Storing post HTML/text in `chrome.storage.local`: Privacy risk; STATE.md decision is "never store post text".

---

## Assumptions Log

| # | Claim | Section | Risk if Wrong |
|---|-------|---------|---------------|
| A1 | `data-test-id*="commentary"` identifies LinkedIn's post body text container | Pattern 1, Code Examples | postText extraction silently returns empty string; no signals fire |
| A2 | `a[data-anonymize="person-name"]` has an `href` attribute with the author profile URL | Pattern 1 | authorProfileUrl is empty; company-page exclusion fails |
| A3 | LinkedIn renders reshared posts with an inner element carrying `data-urn^="urn:li:share:"` | Pattern 6 | Reshare detection fails; resharer may be incorrectly scored |
| A4 | Comment expand button has `aria-label*="comment"` or `data-control-name*="comment"` | Pattern 1 (new selectors) | Comment expansion silently fails; DETECT-07 always scores zero |
| A5 | Open to Work banner has `aria-label*="Open to work"` | Pattern 1 (new selectors) | OtW threshold modifier never applies; some job seekers auto-hidden below intended threshold |
| A6 | `chrome.action.setBadgeText` without a `tabId` sets the badge globally for all tabs | Pattern 7 | Badge shows wrong count per-tab |
| A7 | `postNode.querySelector(POST_BODY_TEXT)?.innerText` returns full text including "see more" overflow | Pitfall 1 | Truncated posts miss signals that appear after the fold |
| A8 | Tombstone sibling injection does not conflict with LinkedIn's React reconciliation on the parent container | Pattern 5 | Tombstone disappears after React re-render |

**All A1–A5 selectors require live DOM verification before code is written.**

---

## Open Questions

1. **Does `data-test-id*="commentary"` reliably identify LinkedIn's post body text?**
   - What we know: LinkedIn uses data-test-id attributes on various UI components. The commentary area is a known component.
   - What's unclear: The exact data-test-id value changes between LinkedIn deploys.
   - Recommendation: Inspect a live post in DevTools and add the verified selector to selectors.ts as POST_BODY_TEXT before writing any postText extraction code. This is the most critical DOM inspection for Phase 2.

2. **Is it safe to programmatically click LinkedIn's "Show comments" button?**
   - What we know: CONTEXT.md D-02 states this is a read-only action. Expanding comments sends a request to LinkedIn's servers to load comment data — this IS a server-side action, not purely client-side like CSS hiding.
   - What's unclear: Whether LinkedIn rate-limits or detects automated comment expansion. For scoring purposes, we expand comments on posts that already scored > 20 on content signals — this is a small percentage of total posts.
   - Recommendation: Treat comment expansion as acceptable (read-only, no destructive action). However, cap comment expansion to maximum 10 posts per page-load to limit server request volume.

3. **Should tombstone CSS extend the existing `<style id="llb-styles">` or be a separate injection?**
   - What we know: Both approaches work. A single style tag is simpler to manage.
   - Recommendation: Extend the existing style tag. In `content/index.ts`, update the injected CSS to include both `.llb-hidden` and `.llb-tombstone` rules at startup.

---

## Environment Availability

| Dependency | Required By | Available | Version | Fallback |
|------------|------------|-----------|---------|----------|
| Node.js | Build (npm install, tsc) | Yes | 26.1.0 | — |
| npm | Package installation | Yes | 11.x | — |
| fast-levenshtein | DETECT-07 comment scoring | Transitively present | 2.0.6 (transitive), 3.0.0 (latest) | Hand-roll ~25 lines |
| Chrome browser | Extension loading + manual testing | Assumed present | Unknown | Cannot test without |
| LinkedIn account | Live DOM selector verification | Assumed present | — | Cannot verify without |

**Missing dependencies with no fallback:**
- Chrome browser and LinkedIn account (for DOM inspection of Phase 2 new selectors before coding)

---

## Security Domain

> `security_enforcement` not set in config — treating as enabled. `nyquist_validation` is explicitly `false` in config.json — Validation Architecture section omitted.

### Applicable ASVS Categories

| ASVS Category | Applies | Standard Control |
|---------------|---------|-----------------|
| V2 Authentication | No | Extension has no authentication |
| V3 Session Management | No | No sessions |
| V4 Access Control | No | No user roles |
| V5 Input Validation | Yes | LinkedIn DOM text → postText: use `.innerText` / `.textContent`, not `.innerHTML`. Regex signals run on postText without further sanitisation — inputs are text-only, not code |
| V6 Cryptography | No | No cryptographic operations |

### Known Threat Patterns for Detection Engine

| Pattern | STRIDE | Standard Mitigation |
|---------|--------|---------------------|
| LinkedIn post contains crafted regex-killing string (ReDoS) | Denial of Service | Use simple, non-backtracking regexes; avoid catastrophic backtracking in signal patterns; test with adversarial input |
| postText stored in chrome.storage.local | Information Disclosure | postText is memory-only (PostData never persisted); STATE.md decision enforced |
| Tombstone XSS via authorName | Tampering | Use `tombstone.textContent = ...` not `innerHTML`; authorName is set from DOM `.textContent`, not from innerHTML |
| Comment expansion sends server requests | Information Disclosure | Read-only action; no credentials sent beyond LinkedIn's own session cookies; same as normal user browsing |
| fast-levenshtein postinstall script | Tampering | Verified: no postinstall script on fast-levenshtein 3.0.0 |

**ReDoS risk note:** The buzzword regex uses alternation over ~20 terms. This is bounded and will not exhibit catastrophic backtracking with realistic LinkedIn post lengths (< 3000 characters). Signal functions should be tested with a 3000-character adversarial string of repeated patterns as part of Phase 2 unit tests.

---

## Sources

### Primary (HIGH confidence)

- `src/content/selectors.ts` — confirmed selector registry contents from Phase 1 (POST_AUTHOR_NAME, SPONSORED_MARKER, COMPANY_PAGE_MARKER, POST_CARD, POST_URN_ATTR)
- `src/shared/types.ts` — confirmed PostData, DetectionResult, Detector interface shapes
- `src/content/observer.ts` — confirmed Phase 1 observer architecture and integration points
- `src/background/index.ts` — confirmed SW stub for Phase 2 POST_HIDDEN handler addition
- `.planning/phases/01-foundation/DOM-INSPECTION.md` — confirmed LinkedIn DOM selectors verified by live inspection 2026-05-25
- `.planning/phases/02-detection-engine/02-CONTEXT.md` — locked decisions D-01 through D-13
- `.planning/research/FEATURES.md` — signal specifications, weights, false positive categories
- `.planning/research/ARCHITECTURE.md` — message passing patterns, storage schema, detector interface
- `.planning/research/PITFALLS.md` — CRIT-1 through CRIT-4, COMMON-1, COMMON-8
- `CLAUDE.md` — critical constraints (#1 no CSS class selectors, #2 no element.remove, #4 SW stateless)
- npm registry: `npm view fast-levenshtein` — confirmed version 3.0.0, age 2013-04-18, source repo github.com/hiddentao/fast-levenshtein, no postinstall script
- slopcheck: `python -m slopcheck install fast-levenshtein` — result: [OK]

### Secondary (MEDIUM confidence)

- `.planning/research/PITFALLS.md §COMMON-8` — CSS hiding conflicts with LinkedIn styles (training knowledge, not live-verified for current LinkedIn)
- Chrome MV3 docs (training knowledge, August 2025 cutoff) — `chrome.action.setBadgeText` API, service worker lifetime, `chrome.runtime.sendMessage` behaviour

### Tertiary (LOW confidence — [ASSUMED])

- New Phase 2 selectors (POST_BODY_TEXT, POST_AUTHOR_LINK, RESHARE_INDICATOR, COMMENT_EXPAND_BUTTON, OPEN_TO_WORK_MARKER, COMMENT_TEXT) — all [ASSUMED], require live LinkedIn DOM inspection before any code using them is written
- LinkedIn rendering "see more" overflow in DOM (whether full text is in DOM but hidden, vs. loaded on demand) — [ASSUMED]
- Whether tombstone sibling injection survives LinkedIn's React reconciliation — [ASSUMED]

---

## Metadata

**Confidence breakdown:**
- Standard stack (no new runtime packages beyond fast-levenshtein): HIGH — fast-levenshtein verified on npm, slopcheck [OK]
- Detection algorithm design (signal functions, weights, thresholds): HIGH — locked in CONTEXT.md decisions, backed by FEATURES.md
- Architecture patterns (message passing, CSS hiding, tombstone, storage): HIGH — based on Phase 1 verified patterns + MV3 docs
- New DOM selectors (POST_BODY_TEXT, RESHARE_INDICATOR, COMMENT_EXPAND_BUTTON, etc.): LOW — all [ASSUMED]; require live inspection

**Research date:** 2026-05-25
**Valid until:** Architecture patterns: stable (30 days). New DOM selectors: verify immediately before coding.
