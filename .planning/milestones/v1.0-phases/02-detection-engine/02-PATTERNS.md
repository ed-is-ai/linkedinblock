# Phase 2: Detection Engine - Pattern Map

**Mapped:** 2026-05-25
**Files analyzed:** 11 new/modified files
**Analogs found:** 11 / 11 (all from Phase 1 codebase; no missing analogs)

---

## File Classification

| New/Modified File | Role | Data Flow | Closest Analog | Match Quality |
|-------------------|------|-----------|----------------|---------------|
| `src/content/selectors.ts` | config/registry | — | `src/content/selectors.ts` (self — add constants) | exact |
| `src/shared/types.ts` | model | — | `src/shared/types.ts` (self — expand interfaces) | exact |
| `src/content/index.ts` | controller | request-response | `src/content/index.ts` (self — replace callback body) | exact |
| `src/background/index.ts` | service/message-handler | event-driven | `src/background/index.ts` (self — add message handler) | exact |
| `src/content/detector/heuristic.ts` | service | request-response | `src/content/observer.ts` (orchestration pattern) | role-match |
| `src/content/detector/signals/listicle.ts` | utility | transform | `src/content/observer.ts` (pure extraction pattern) | partial |
| `src/content/detector/signals/buzzwords.ts` | utility | transform | `src/content/observer.ts` (pure extraction pattern) | partial |
| `src/content/detector/signals/em-dash.ts` | utility | transform | `src/content/observer.ts` (pure extraction pattern) | partial |
| `src/content/detector/signals/cta.ts` | utility | transform | `src/content/observer.ts` (pure extraction pattern) | partial |
| `src/content/detector/signals/comments.ts` | utility | transform | `src/content/observer.ts` (pure extraction pattern) | partial |
| `src/content/detector/language.ts` | utility | transform | `src/content/observer.ts` (guard/exclusion pattern) | partial |
| `src/content/detector/tombstone.ts` | utility | event-driven | `src/content/observer.ts` (DOM manipulation pattern) | partial |
| `src/content/exclusions.ts` | middleware | request-response | `src/content/observer.ts` (guard-before-action pattern) | role-match |

---

## Pattern Assignments

### `src/content/selectors.ts` — ADD new Phase 2 selector constants

**Analog:** `src/content/selectors.ts` (self — extend with new constants)

**Existing file pattern** (lines 1-17 — header block to copy for new selector comment blocks):
```typescript
/**
 * LinkedIn Blocker — Selector Registry
 *
 * !! THIS IS THE ONLY FILE IN THE PROJECT THAT MAY CONTAIN LINKEDIN DOM SELECTORS !!
 *
 * Per INFRA-04 and CLAUDE.md critical constraint #1:
 *   - All LinkedIn DOM selectors are defined here and ONLY here.
 *   - Changing one constant in this file is sufficient to fix any selector breakage site-wide.
 *   - No other file in the project may contain a LinkedIn selector string.
 */
```

**Existing selector constant pattern** (lines 29-31 + 47-48 — doc comment format to replicate):
```typescript
/**
 * Primary feed container selector.
 * Verified: div[data-finite-scroll-hotkey-context="FEED"] wraps the infinite-scroll feed.
 */
export const FEED_CONTAINER = 'div[data-finite-scroll-hotkey-context="FEED"]';

// Post card root — matches both data-urn and data-id attribute variants
export const POST_CARD =
  'div[data-urn^="urn:li:activity:"], div[data-id^="urn:li:activity:"]';
```

**Existing exclusion marker pattern** (lines 78-94 — format for new Phase 2 markers):
```typescript
export const SPONSORED_MARKER = '[aria-label*="Promoted"], [aria-label*="Sponsored"]';
export const COMPANY_PAGE_MARKER = '/company/';
```

**New constants to add** (all tagged [ASSUMED] — must be verified with live DOM before code is written):
```typescript
// Post body text container — [ASSUMED]: requires live DevTools verification
export const POST_BODY_TEXT = '[data-test-id*="commentary"]';

// Author profile link — [ASSUMED]
export const POST_AUTHOR_LINK = 'a[data-anonymize="person-name"]';

// Reshare inner card — [ASSUMED]
export const RESHARE_INDICATOR = '[data-urn^="urn:li:share:"]';

// Comment expand button — [ASSUMED]
export const COMMENT_EXPAND_BUTTON = '[aria-label*="comment"], [data-control-name*="comment"]';

// Open to Work avatar banner — [ASSUMED]
export const OPEN_TO_WORK_MARKER = '[aria-label*="Open to work"], [aria-label*="open to work"]';

// Comment text within expanded section — [ASSUMED]
export const COMMENT_TEXT = '[data-test-id*="comment-body"], [data-id*="comment"] span';
```

---

### `src/shared/types.ts` — EXPAND interfaces for Phase 2

**Analog:** `src/shared/types.ts` (self — add `signalBreakdown` to `DetectionResult`, expand `StorageSchema`)

**Existing interface pattern** (lines 19-30 — JSDoc + interface shape to replicate):
```typescript
/**
 * Represents a single LinkedIn post as extracted from the DOM by the content script.
 * Security note (T-03-04): PostData passes through memory only and is NEVER persisted
 * to chrome.storage.local.
 */
export interface PostData {
  urn: string;
  authorId: string;
  authorName: string;
  authorProfileUrl: string;
  postText: string;
}
```

**Existing DetectionResult pattern** (lines 36-48 — add `signalBreakdown` field here):
```typescript
export interface DetectionResult {
  score: number;         // currently 0.0–1.0 — Phase 2 changes to 0–100 integer
  signals: string[];
  confidence: 'high' | 'medium' | 'low';
  engineUsed: 'heuristic' | 'llm';
}
```

**Phase 2 additions to DetectionResult:**
```typescript
  /** Per-signal numeric breakdown for DETECT-05 — stored in flaggedAccounts */
  signalBreakdown: Record<string, number>;
```

**Existing StorageSchema pattern** (lines 64-76 — expand `flaggedAccounts` value type):
```typescript
export interface StorageSchema {
  flaggedAccounts?: Record<string, unknown>; // Phase 1 stub — Phase 2 replaces unknown
}
```

**Phase 2 additions — new FlaggedAccountStub interface + updated StorageSchema:**
```typescript
export interface FlaggedAccountStub {
  authorId: string;
  authorName: string;
  authorProfileUrl: string;
  compositeScore: number;
  signals: Record<string, number>;  // signal name -> individual score
  hiddenPostUrns: string[];
  firstSeenAt: number;
  lastSeenAt: number;
  status: 'pending';
}

export interface StorageSchema {
  flaggedAccounts?: Record<string, FlaggedAccountStub>;
}
```

---

### `src/content/index.ts` — REPLACE callback body with detection pipeline

**Analog:** `src/content/index.ts` (self — replace console.log callback with full pipeline)

**Existing entry point pattern** (lines 1-13 — import structure + startObserving call to preserve):
```typescript
import { SELECTORS_VERSION } from './selectors';
import { startObserving } from './observer';

console.log(
  '[LLB] content script starting on',
  location.href,
  'selectors v',
  SELECTORS_VERSION
);

startObserving(({ urn, authorName }) => {
  console.log('[LLB] post', urn, 'by', authorName);  // <-- REPLACE this body
});
```

**Phase 2 replacement pattern for the callback body:**
```typescript
import { SELECTORS_VERSION } from './selectors';
import { startObserving } from './observer';
import { HeuristicDetector } from './detector/heuristic';
import { checkExclusions } from './exclusions';
import { injectTombstone } from './detector/tombstone';
import { storageGet, storageSet } from '../shared/storage';
import type { PostData, FlaggedAccountStub } from '../shared/types';

// CSS for llb-hidden + llb-tombstone injected once at startup
const style = document.createElement('style');
style.textContent = `
  .llb-hidden { display: none !important; }
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
  .llb-tombstone:hover { background: #e8e8e8; }
`;
document.head.appendChild(style);

const detector = new HeuristicDetector();
const AUTO_HIDE_THRESHOLD = 60;
const FLAG_THRESHOLD = 35;

startObserving(({ urn, authorName, authorProfileUrl, postText, postNode }) => {
  const postData: PostData = { urn, authorId: '', authorName, authorProfileUrl, postText };

  const exclusion = checkExclusions(postData, postNode);
  if (exclusion.excluded) return;

  const effectiveHideThreshold = exclusion.openToWork
    ? AUTO_HIDE_THRESHOLD + 20
    : AUTO_HIDE_THRESHOLD;

  detector.detect(postData).then((result) => {
    if (result.score < FLAG_THRESHOLD) return;

    // Write to storage (both flag-only and hide cases)
    void writeDetectionResult(postData, result);

    if (result.score >= effectiveHideThreshold) {
      postNode.classList.add('llb-hidden');
      injectTombstone(postNode, authorName, result.score);
      chrome.runtime.sendMessage({ type: 'POST_HIDDEN' }).catch(() => {
        // SW may be sleeping — badge staleness is acceptable per D-11
      });
    }
  });
});
```

---

### `src/background/index.ts` — ADD POST_HIDDEN message handler

**Analog:** `src/background/index.ts` (self — replace stub no-op with real handler)

**Existing stub pattern** (lines 1-10 — structure to replace):
```typescript
console.log('[LLB] service worker started');

chrome.runtime.onInstalled.addListener(() => {
  console.log('[LLB] extension installed');
});

chrome.runtime.onMessage.addListener((_message, _sender, _sendResponse) => {
  // Phase 1 stub: no-op handler
  return false;
});
```

**Phase 2 replacement — add session counter in module scope:**
```typescript
console.log('[LLB] service worker started');

// Session-scoped counter: resets on SW termination = session semantics (D-11)
let sessionHiddenCount = 0;

chrome.runtime.onInstalled.addListener(() => {
  console.log('[LLB] extension installed');
  chrome.action.setBadgeBackgroundColor({ color: '#0077B5' });
});

chrome.runtime.onMessage.addListener((message, _sender, _sendResponse) => {
  if (message.type === 'POST_HIDDEN') {
    sessionHiddenCount++;
    chrome.action.setBadgeText({ text: String(sessionHiddenCount) });
    chrome.action.setBadgeBackgroundColor({ color: '#0077B5' });
  }
  return false;
});
```

---

### `src/content/detector/heuristic.ts` — NEW HeuristicDetector class

**Analog:** `src/content/observer.ts` (orchestration pattern — imports, module-scope state, single exported class/function)

**Import pattern to copy from** `src/content/observer.ts` (lines 17-25):
```typescript
import {
  FEED_CONTAINER,
  FEED_CONTAINER_FALLBACK,
  POST_CARD,
  POST_URN_ATTR,
  POST_URN_ATTR_FALLBACK,
  POST_AUTHOR_NAME,
  SELECTORS_VERSION,
} from './selectors';
```

**Single-export pattern from** `src/content/observer.ts` (lines 147-153):
```typescript
export function startObserving(
  onPost: (post: { urn: string; authorName: string }) => void
): void {
  storedOnPost = onPost;
  reinit();
  installSpaNavigationHandler(() => reinit());
}
```

**Phase 2 class pattern — implements existing Detector interface from** `src/shared/types.ts` (lines 55-60):
```typescript
export interface Detector {
  name: string;
  detect(post: PostData): Promise<DetectionResult>;
}
```

**Concrete implementation skeleton:**
```typescript
// src/content/detector/heuristic.ts
import type { PostData, DetectionResult, Detector } from '../../shared/types';
import { checkListicle } from './signals/listicle';
import { checkBuzzwords } from './signals/buzzwords';
import { checkEmDash } from './signals/em-dash';
import { checkCta } from './signals/cta';
import { checkGenericComments } from './signals/comments';

export class HeuristicDetector implements Detector {
  readonly name = 'heuristic';

  async detect(post: PostData): Promise<DetectionResult> {
    const breakdown: Record<string, number> = {};
    let score = 0;
    // ... signal calls accumulate into breakdown + score ...
    return {
      score: Math.min(score, 100),
      signals: Object.keys(breakdown),
      signalBreakdown: breakdown,
      confidence: score >= 60 ? 'high' : score >= 35 ? 'medium' : 'low',
      engineUsed: 'heuristic',
    };
  }
}
```

---

### `src/content/detector/signals/listicle.ts` — NEW pure signal function

**Analog:** `src/content/observer.ts` pattern of pure internal functions (lines 68-100 — `attachObserver` as model of focused, single-concern functions)

**Pure function contract pattern** — take a string, return a number, zero DOM access, zero side effects:
```typescript
// Pattern: all signal files follow this shape
// - top-level const for compiled regexes (outside function for perf)
// - single named export: check<Name>(text: string): number
// - return 0 for no signal, positive integer for signal weight contribution

export function checkListicle(text: string): number { ... }
```

**TypeScript strict-mode constraint from** `tsconfig.json` — `noUncheckedIndexedAccess: true` means array accesses return `T | undefined`. Guard all array index reads:
```typescript
// Correct under noUncheckedIndexedAccess:
const first = arr[0];  // type: T | undefined
if (first !== undefined) { ... }

// Also correct: use non-null assertion only when certain:
eligible[i]!
```

---

### `src/content/detector/signals/buzzwords.ts` — NEW pure signal function

**Analog:** same as listicle.ts above — pure function, compiled regex at module scope

**Key pattern — compiled regex with alternation at module scope** (avoid recompiling on each call):
```typescript
const BUZZ_RE = new RegExp(
  `\\b(${BUZZWORDS.map(w => w.replace(/ /g, '\\s+')).join('|')})\\b`,
  'gi'
);

export function checkBuzzwords(text: string): number {
  const words = text.trim().split(/\s+/).length;
  if (words < 20) return 0;
  const hits = (text.match(BUZZ_RE) ?? []).length;
  // density check...
}
```

---

### `src/content/detector/signals/em-dash.ts` — NEW pure signal function

**Analog:** same as listicle.ts — pure function, module-scope constants

**Density calculation pattern** (same formula used across all density-based signals):
```typescript
const density = (count / wordCount) * 100;  // per 100 words
if (density > threshold) return weight;
```

---

### `src/content/detector/signals/cta.ts` — NEW pure signal function

**Analog:** same as listicle.ts — pure function, array of compiled regexes at module scope

**Array-of-regexes pattern:**
```typescript
const CTA_OPENERS: RegExp[] = [ /\bexcited to announce\b/i, ... ];
const CTA_CLOSERS: RegExp[] = [ /\bwhat do you think\b/i, ... ];

export function checkCta(text: string): number {
  const openerHits = CTA_OPENERS.filter(re => re.test(text)).length;
  const closerHits = CTA_CLOSERS.filter(re => re.test(text)).length;
  // weighted return based on combination...
}
```

---

### `src/content/detector/signals/comments.ts` — NEW pure signal function

**Analog:** same as listicle.ts — pure function; adds `fast-levenshtein` import

**External dependency import pattern** (ESM, matches `"type": "module"` in package.json):
```typescript
import levenshtein from 'fast-levenshtein';
```

**Set-based lookup pattern** (O(1) exact match before O(n²) fuzzy check):
```typescript
const GENERIC_PHRASES = new Set(['great insights!', "couldn't agree more!", ...]);

export function checkGenericComments(commentTexts: string[]): number {
  const eligible = commentTexts.filter(t => t.length > 20);
  if (eligible.length < 2) return 0;
  const genericHits = eligible.filter(t => GENERIC_PHRASES.has(t.toLowerCase().trim()));
  if (genericHits.length >= 2) return 15;
  // Levenshtein near-dup fallback...
}
```

**noUncheckedIndexedAccess guard** for inner loop:
```typescript
for (let i = 0; i < eligible.length; i++) {
  for (let j = i + 1; j < eligible.length; j++) {
    if (levenshtein.get(eligible[i]!, eligible[j]!) < 10) { ... }
  }
}
```

---

### `src/content/detector/language.ts` — NEW pure language exclusion utility

**Analog:** `src/content/observer.ts` — synchronous guard function pattern (lines 47-62, `waitForFeedContainer` as model of defensive early-return)

**Guard function pattern from** `src/content/observer.ts` (lines 87-91):
```typescript
if (!urn || processedPosts.has(urn)) continue;  // early return pattern
```

**Phase 2 language detection shape:**
```typescript
// Module-scope const array (compiled once)
const NON_LATIN_RANGES: Array<[number, number]> = [ ... ];

// Two-argument signature: DOM element for lang attribute, string for script sampling
export function isNonEnglish(postNode: Element, postText: string): boolean {
  const langEl = postNode.closest('[lang]');
  if (langEl) {
    const lang = langEl.getAttribute('lang') ?? '';
    if (lang && !lang.startsWith('en')) return true;
  }
  // script range sampling fallback...
  return total > 10 && nonLatin / total > 0.3;
}
```

---

### `src/content/detector/tombstone.ts` — NEW DOM mutation utility

**Analog:** `src/content/observer.ts` — DOM manipulation pattern (lines 72-100, `attachObserver` as model for direct DOM writes from content script)

**DOM element creation pattern from** `src/content/observer.ts` (line 80 — querying + traversal):
```typescript
const el = node as Element;
const postCards: Element[] = el.matches(POST_CARD)
  ? [el]
  : Array.from(el.querySelectorAll(POST_CARD));
```

**Phase 2 tombstone injection shape:**
```typescript
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
  // Insert as sibling BEFORE the post — not inside — to avoid React VDom conflict
  postNode.parentNode?.insertBefore(tombstone, postNode);
}
```

**Security note:** Use `.textContent =` not `.innerHTML =` — authorName is user-controlled DOM text. This is consistent with the existing observer pattern (line 91: `card.querySelector(POST_AUTHOR_NAME)?.textContent?.trim()`).

---

### `src/content/exclusions.ts` — NEW pre-detection guard

**Analog:** `src/content/observer.ts` — guard-before-action pattern (lines 82-91, the `if (!urn || processedPosts.has(urn)) continue` deduplication guard)

**Import pattern to replicate** (selector-only imports, no inline strings) from `src/content/observer.ts` (lines 17-25):
```typescript
import {
  SPONSORED_MARKER,
  COMPANY_PAGE_MARKER,
  OPEN_TO_WORK_MARKER,
} from './selectors';
import { isNonEnglish } from './detector/language';
import type { PostData } from '../shared/types';
```

**Guard function shape:**
```typescript
export interface ExclusionResult {
  excluded: boolean;
  reason?: 'sponsored' | 'company-page' | 'non-english';
  openToWork?: boolean;  // true = raise effective threshold +20
}

export function checkExclusions(
  postData: PostData,
  postNode: Element
): ExclusionResult {
  if (postNode.querySelector(SPONSORED_MARKER)) {
    return { excluded: true, reason: 'sponsored' };
  }
  if (postData.authorProfileUrl.includes(COMPANY_PAGE_MARKER)) {
    return { excluded: true, reason: 'company-page' };
  }
  if (isNonEnglish(postNode, postData.postText)) {
    return { excluded: true, reason: 'non-english' };
  }
  const openToWork = !!postNode.querySelector(OPEN_TO_WORK_MARKER);
  return { excluded: false, openToWork };
}
```

---

## Shared Patterns

### Selector Registry Constraint
**Source:** `src/content/selectors.ts` lines 1-17 (file-level header), line 10 (core rule)
**Apply to:** Every new file that touches LinkedIn DOM
```typescript
// NEVER embed a LinkedIn selector string in any file other than selectors.ts
// ALWAYS import from './selectors' (or '../content/selectors' from shared/)
import { SPONSORED_MARKER, COMMENT_EXPAND_BUTTON } from './selectors';
```

### Import Style (named, type-annotated)
**Source:** `src/content/observer.ts` lines 17-25, `src/shared/storage.ts` lines 16
**Apply to:** All new files
```typescript
// Named imports with braces; type-only imports use `import type`
import type { PostData, DetectionResult } from '../../shared/types';
import { storageGet, storageSet } from '../../shared/storage';
```

### chrome.storage.local Access — ONLY via wrapper
**Source:** `src/shared/storage.ts` lines 25-50
**Apply to:** Any file writing detection results or reading flagged accounts
```typescript
import { storageGet, storageSet } from '../shared/storage';
// Never call chrome.storage.local.get() or .set() directly
const { flaggedAccounts } = await storageGet(['flaggedAccounts']);
await storageSet({ flaggedAccounts: updated });
```

### Error-safe Message Passing
**Source:** RESEARCH.md Pattern 7 (mirrors PITFALLS.md COMMON-4 extension context invalidation)
**Apply to:** `src/content/index.ts` POST_HIDDEN send and any future sendMessage calls
```typescript
chrome.runtime.sendMessage({ type: 'POST_HIDDEN' }).catch(() => {
  // SW may be sleeping; badge staleness acceptable per D-11
  // Catches "Extension context invalidated" on extension reload
});
```

### no-op return false from onMessage
**Source:** `src/background/index.ts` line 9
**Apply to:** `src/background/index.ts` message handler
```typescript
chrome.runtime.onMessage.addListener((message, _sender, _sendResponse) => {
  // ... synchronous handler body ...
  return false;  // synchronous response — do NOT return true unless using async sendResponse
});
```

### noUncheckedIndexedAccess Guard
**Source:** `tsconfig.json` line 11 (`"noUncheckedIndexedAccess": true`)
**Apply to:** All signal files and any other file using array indexing
```typescript
// Array index access returns T | undefined under this flag
const item = arr[i]!;            // non-null assertion when index is guaranteed in-bounds
const val = arr[0] ?? fallback;  // nullish coalescing when uncertain
```

### JSDoc Comment Style
**Source:** `src/content/selectors.ts` lines 20-31, `src/shared/types.ts` lines 11-18
**Apply to:** All exported symbols in new files
```typescript
/**
 * One-line summary.
 * Multi-line explanation if needed.
 * @param name - description
 */
export function checkXxx(text: string): number { ... }
```

---

## No Analog Found

All files have a close match in the Phase 1 codebase. No entries in this section.

---

## Metadata

**Analog search scope:** `src/` (all 6 Phase 1 source files read in full)
**Files scanned:** 6 source files + package.json + tsconfig.json
**Pattern extraction date:** 2026-05-25

**Critical pre-coding gate:** All selectors tagged `[ASSUMED]` in `src/content/selectors.ts`
(POST_BODY_TEXT, POST_AUTHOR_LINK, RESHARE_INDICATOR, COMMENT_EXPAND_BUTTON,
OPEN_TO_WORK_MARKER, COMMENT_TEXT) require live LinkedIn DevTools verification
before any code depending on them is written. This is the highest-risk item in Phase 2.
