# Architecture Research

**Project:** LinkedIn Blocker (Chrome MV3)
**Researched:** 2026-05-25
**Confidence:** HIGH for MV3 patterns (stable spec, fully within training). MEDIUM for LinkedIn DOM specifics (subject to LinkedIn updates).

---

## Component Map

### The Three Runtimes (and why each exists)

Chrome MV3 gives you three isolated JavaScript runtimes. Each has different capabilities and lifetime rules. Assigning responsibilities correctly is the single most important architectural decision.

```
┌─────────────────────────────────────────────────────────────┐
│  LinkedIn tab (linkedin.com)                                 │
│  ┌─────────────────────────────────────────────────────┐   │
│  │  Content Script (content.js)                         │   │
│  │  - Full DOM access                                   │   │
│  │  - Can read page text, attributes, layout            │   │
│  │  - Can inject CSS classes / hide elements            │   │
│  │  - Runs MutationObserver                             │   │
│  │  - Runs heuristic scoring                            │   │
│  │  - NO direct chrome.storage.local write (use msg)   │   │
│  │    [correction: can write, but route through SW     │   │
│  │     for coordination]                                │   │
│  └──────────────────────┬──────────────────────────────┘   │
└─────────────────────────│───────────────────────────────────┘
                          │ chrome.runtime.sendMessage /
                          │ chrome.runtime.connect (port)
                          ▼
┌─────────────────────────────────────────────────────────────┐
│  Service Worker (background.js)                              │
│  - Receives detection events from content scripts            │
│  - Writes to chrome.storage.local                            │
│  - Maintains flagged-accounts state                          │
│  - Responds to popup queries                                 │
│  - Coordinates block actions (sends message back to CS)      │
│  - EPHEMERAL: dies after ~30s idle, must be stateless        │
└──────────────────────┬──────────────────────────────────────┘
                       │ chrome.runtime.sendMessage
                       ▼
┌─────────────────────────────────────────────────────────────┐
│  Popup (popup.html + popup.js)                               │
│  - Reads chrome.storage.local directly (or via SW)           │
│  - Renders flagged account list                              │
│  - Sends "block" or "dismiss" decisions to SW                │
│  - SW relays block command to content script                 │
│  - Short-lived: only exists while popup is open              │
└─────────────────────────────────────────────────────────────┘
```

### What Lives Where (definitive)

| Responsibility | Component | Rationale |
|---|---|---|
| MutationObserver (feed watching) | Content Script | Needs DOM access |
| Post/profile text extraction | Content Script | Needs DOM access |
| Heuristic scoring engine | Content Script | Co-located with extraction to avoid serialization of full DOM nodes |
| CSS class injection / element hiding | Content Script | Needs DOM access |
| LinkedIn block button click simulation | Content Script | Needs DOM access |
| Flagged account storage writes | Content Script via direct `chrome.storage.local` | CS can write directly — no need to go through SW for simple writes |
| Badge count update | Service Worker | Only SW can reliably call `chrome.action.setBadgeText` |
| Cross-tab state coordination | Service Worker | SW is the single shared coordinator |
| Popup data reads | Popup JS (direct `chrome.storage.local.get`) | Fastest path; no SW roundtrip needed |
| User decisions (block/dismiss) | Popup JS → SW message → CS message | Popup cannot access DOM; must relay |
| Threshold configuration reads | Content Script (direct storage read) | CS can read storage |

**Correction on content script storage:** Content scripts CAN read/write `chrome.storage.local` directly. Route through the SW only when you need coordination (e.g., updating badge count after a write, or when multiple tabs must see an atomic update).

---

## Data Flow

### Detection Flow (content script internal)

```
LinkedIn page loads
  └─ content.js injected
       └─ MutationObserver.observe(feedContainer, { childList: true, subtree: true })
            └─ New post node added to DOM
                 └─ extractPostData(postNode) → { authorId, authorName, postText, profileSignals }
                      └─ score(postData) → { score: 0.87, signals: ['listicle', 'thin_profile'] }
                           └─ if score >= THRESHOLD:
                                ├─ hideElement(postNode)          // immediate, sync
                                ├─ storeFlaggedAccount(account)   // chrome.storage.local.get/set
                                └─ notifyServiceWorker('flagged') // for badge update only
```

### Storage Schema

```javascript
// chrome.storage.local schema
{
  flaggedAccounts: {
    [accountId: string]: {
      id: string,
      name: string,
      profileUrl: string,
      avatarUrl: string,
      firstSeenAt: number,       // Unix timestamp
      lastSeenAt: number,
      postCount: number,         // how many flagged posts
      totalScore: number,        // cumulative score (for sorting)
      peakScore: number,         // highest single-post score
      signals: string[],         // union of all signals ever detected
      status: 'pending' | 'blocked' | 'dismissed',
      hiddenPostIds: string[],   // LinkedIn post URNs, for unhiding on dismiss
    }
  },
  settings: {
    threshold: number,           // 0.0–1.0, default 0.7
    autoHide: boolean,           // default true
    detectionEngine: 'heuristic' | 'llm',
  },
  stats: {
    totalHidden: number,
    totalBlocked: number,
    totalDismissed: number,
    lastScan: number,
  }
}
```

### Review Flow (popup)

```
User opens popup
  └─ popup.js: chrome.storage.local.get(['flaggedAccounts', 'stats'])
       └─ render list sorted by peakScore DESC, status==='pending' first
            └─ User clicks "Block"
                 └─ popup.js: chrome.runtime.sendMessage({ type: 'BLOCK_ACCOUNT', accountId })
                      └─ background.js receives message
                           └─ chrome.tabs.query({ active: true, url: '*://www.linkedin.com/*' })
                                └─ chrome.tabs.sendMessage(tabId, { type: 'TRIGGER_BLOCK', accountId })
                                     └─ content.js: navigateAndBlock(accountId)
                                          └─ chrome.storage.local update: status → 'blocked'
                                               └─ popup.js: chrome.storage.onChanged listener refreshes UI
```

### Dismiss Flow

```
User clicks "Dismiss" in popup
  └─ popup.js: chrome.storage.local update: status → 'dismissed'
       └─ popup.js: sendMessage({ type: 'UNHIDE_POSTS', hiddenPostIds })
            └─ content.js: remove hidden CSS class from matching post nodes
            (No-op if user has scrolled past them — acceptable)
```

### Badge Update Flow

```
content.js writes new flaggedAccount to storage
  └─ content.js: chrome.runtime.sendMessage({ type: 'ACCOUNT_FLAGGED' })
       └─ background.js:
            └─ chrome.storage.local.get('flaggedAccounts')
                 └─ count pending accounts
                      └─ chrome.action.setBadgeText({ text: String(pendingCount) })
```

---

## Key Patterns

### 1. MutationObserver for LinkedIn's Infinite Scroll Feed

LinkedIn's feed is a React SPA. New posts are injected via React reconciliation into a container element. The key insight: observe the feed container, not `document.body`.

**Finding the feed container:** LinkedIn uses a `<div>` with a class like `scaffold-finite-scroll__content` or the direct parent of `<div data-id="...">` post cards. These class names change with LinkedIn's deployments.

**Robust selector strategy — prefer attribute selectors over class names:**

```javascript
// Fragile (breaks on LinkedIn class renames):
document.querySelector('.scaffold-finite-scroll__content')

// More robust (data attributes change less often):
document.querySelector('[data-finite-scroll-hotkey-context]')
// or fall back to:
document.querySelector('main')  // stable semantic element
```

**Observer setup:**

```javascript
function observeFeed() {
  // Wait for feed container to exist (page may not be ready at injection time)
  const container = findFeedContainer();
  if (!container) {
    // Retry with exponential backoff, max 10s
    setTimeout(observeFeed, 500);
    return;
  }

  const observer = new MutationObserver((mutations) => {
    for (const mutation of mutations) {
      for (const node of mutation.addedNodes) {
        if (node.nodeType !== Node.ELEMENT_NODE) continue;
        // Each added node may be a post card or a container holding post cards
        const postNodes = extractPostNodes(node);
        postNodes.forEach(processPost);
      }
    }
  });

  observer.observe(container, {
    childList: true,   // catch direct child additions
    subtree: true,     // catch nested additions (React may add wrapper divs first)
  });
}
```

**Critical: avoid characterData or attributes observation.** LinkedIn continuously mutates attributes (React reconciliation). Observing those creates performance chaos.

**Post node identification:** LinkedIn post cards contain `data-urn` or `data-id` attributes with a URN like `urn:li:activity:1234567890`. This is your stable post identifier. Extract it from the card root.

**Deduplication:** Maintain a `Set<string>` of already-processed post URNs in content script memory. MutationObserver fires for every DOM change; the same post node may be re-added during React reconciliation.

```javascript
const processedPosts = new Set();

function processPost(node) {
  const urn = node.dataset?.urn || node.querySelector('[data-urn]')?.dataset.urn;
  if (!urn || processedPosts.has(urn)) return;
  processedPosts.add(urn);
  // ... proceed with scoring
}
```

**LinkedIn's SPA navigation:** LinkedIn uses pushState navigation. The content script persists across same-tab navigation but the feed container is destroyed and recreated. Listen for navigation:

```javascript
// MV3 content scripts can use the Navigation API or observe URL changes
let lastUrl = location.href;
new MutationObserver(() => {
  if (location.href !== lastUrl) {
    lastUrl = location.href;
    // Re-initialize observer after brief delay for React to render new page
    setTimeout(observeFeed, 1000);
  }
}).observe(document.body, { subtree: true, childList: true });
// This is intentionally broad — only triggers on URL change, lightweight
```

### 2. Element Hiding Strategy

**Recommendation: CSS class injection (not `display:none` inline, not node removal).**

Three options and why to choose class injection:

| Strategy | Implementation | Pros | Cons |
|---|---|---|---|
| `element.style.display = 'none'` | Inline style | Simple | Overridden by !important rules; hard to undo cleanly; no batching |
| `element.remove()` | DOM removal | Definitely gone | React may re-add it; cannot undo; breaks LinkedIn's own virtualization |
| CSS class injection | `element.classList.add('llb-hidden')` | Clean, undoable, batched by browser, survives React reconciliation | Requires injected stylesheet |

**Implementation:**

Inject one stylesheet from the content script on startup:

```javascript
// content.js — run once on load
const style = document.createElement('style');
style.id = 'llb-styles';
style.textContent = `
  .llb-hidden {
    display: none !important;
  }
  .llb-flagged {
    outline: 2px solid orange !important;  /* debug mode only */
  }
`;
document.head.appendChild(style);
```

Then hiding is just:

```javascript
postNode.classList.add('llb-hidden');
postNode.dataset.llbUrn = urn;  // stamp for later unhiding
```

Unhiding is:

```javascript
document.querySelectorAll(`[data-llb-urn="${urn}"]`).forEach(el => {
  el.classList.remove('llb-hidden');
});
```

**Why not `chrome.scripting.insertCSS`?** That API works but requires the service worker to be awake, adds latency, and is overkill when the content script can inject a `<style>` tag synchronously at startup.

**Why not node removal?** LinkedIn's React virtual DOM tracks DOM nodes. Removing them causes React errors and re-renders that re-add the content. Class-based hiding is invisible to React.

### 3. Message Passing Patterns

**One-time messages** (fire and forget, or with response):

```javascript
// Content script → Service Worker
chrome.runtime.sendMessage({ type: 'ACCOUNT_FLAGGED', accountId, score })
  .catch(() => {}); // SW may be sleeping; acceptable to drop badge updates

// Popup → Service Worker (expects response)
const response = await chrome.runtime.sendMessage({ type: 'GET_FLAGGED_ACCOUNTS' });
```

**Long-lived port** (popup to SW, for real-time updates):

For v1 with local-only storage, use `chrome.storage.onChanged` in the popup instead of a port. Simpler, no keep-alive complexity.

```javascript
// popup.js
chrome.storage.onChanged.addListener((changes, area) => {
  if (area === 'local' && changes.flaggedAccounts) {
    renderAccountList(changes.flaggedAccounts.newValue);
  }
});
```

**SW to Content Script (for block commands):** The SW must look up the active tab first:

```javascript
// background.js
chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {
  if (msg.type === 'BLOCK_ACCOUNT') {
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      const linkedInTab = tabs.find(t => t.url?.includes('linkedin.com'));
      if (linkedInTab) {
        chrome.tabs.sendMessage(linkedInTab.id, {
          type: 'TRIGGER_BLOCK',
          accountId: msg.accountId
        });
      }
    });
  }
});
```

**Service Worker lifetime:** The SW sleeps after ~30 seconds of inactivity. It will wake on `chrome.runtime.onMessage`. Never store in-memory state in the SW — always persist to `chrome.storage.local` before the message handler returns.

---

## Pluggable Detection Design

The detection engine must be swappable from heuristic to LLM without changing any surrounding code.

### The Detector Interface

Define a single interface that all detection engines implement:

```typescript
// types/detector.ts
interface PostData {
  urn: string;
  authorId: string;
  authorName: string;
  authorProfileUrl: string;
  authorAvatarUrl: string;
  postText: string;
  postHtml: string;           // for structural analysis
  reactionCount: number;
  commentCount: number;
  repostCount: number;
  // Profile signals (extracted from hover card or profile page if available)
  profileBio?: string;
  connectionDegree?: number;  // 1st, 2nd, 3rd
}

interface DetectionResult {
  score: number;             // 0.0 (human) to 1.0 (definitely bot)
  signals: string[];         // human-readable signal names that fired
  confidence: 'high' | 'medium' | 'low';
  engineUsed: 'heuristic' | 'llm';
}

interface Detector {
  detect(post: PostData): Promise<DetectionResult>;
  name: string;
}
```

### Heuristic Engine (v1)

```typescript
// detectors/heuristic.ts
class HeuristicDetector implements Detector {
  name = 'heuristic';

  async detect(post: PostData): Promise<DetectionResult> {
    const signals: string[] = [];
    let score = 0;

    // Each rule adds a weighted score and a signal label
    score += this.checkListicle(post, signals);
    score += this.checkBuzzwords(post, signals);
    score += this.checkThinProfile(post, signals);
    score += this.checkEngagementRatio(post, signals);

    return {
      score: Math.min(score, 1.0),
      signals,
      confidence: signals.length > 2 ? 'high' : 'medium',
      engineUsed: 'heuristic',
    };
  }
}
```

### LLM Engine (v2, future)

```typescript
// detectors/llm.ts
class LLMDetector implements Detector {
  name = 'llm';

  async detect(post: PostData): Promise<DetectionResult> {
    const prompt = buildPrompt(post);
    const response = await fetch('https://api.anthropic.com/...', {
      method: 'POST',
      headers: { 'x-api-key': await getApiKey() },
      body: JSON.stringify({ prompt }),
    });
    const result = await response.json();
    return parseResult(result);
  }
}
```

### Engine Selection (content script startup)

```typescript
// content.js
async function getDetector(): Promise<Detector> {
  const { settings } = await chrome.storage.local.get('settings');
  if (settings?.detectionEngine === 'llm') {
    return new LLMDetector();
  }
  return new HeuristicDetector(); // default
}

const detector = await getDetector();
```

### Why This Works

- The caller (`processPost`) always calls `detector.detect(postData)` — never checks which engine is active
- Swapping engine = change one setting key in storage
- Heuristic is synchronous internally but wrapped in `async` to match the interface
- LLM engine can be added as a new file with zero changes to content.js call sites
- `signals[]` array is the same shape whether from rules or LLM — popup renders identically

---

## LinkedIn Block Triggering

LinkedIn has no public API for blocking. The only way to block from an extension is to simulate what a human does in the browser.

### Method: Navigate and Click (MEDIUM confidence — LinkedIn DOM changes)

The block option is buried in a "More" menu on a profile page or post card. The sequence:

1. Content script receives `TRIGGER_BLOCK` message with `accountId`
2. Open the profile URL in the current tab (or a new tab): `window.location.href = profileUrl`
3. Wait for the profile page to load (MutationObserver or `setTimeout`)
4. Find the "More" button (`...` menu) — typically `[aria-label*="More actions"]`
5. Click it to open the dropdown
6. Find "Report/Block" option in the dropdown
7. Click it, navigate the confirmation dialog

### Practical Problems with This Approach

- Navigates away from the feed — disruptive to the user
- LinkedIn may rate-limit or detect automated clicks
- The modal sequence has 3–4 steps with no stable selectors
- Profile page layout changes break the automation

### Recommended v1 Approach: Deep Link to LinkedIn's Own Block Flow

LinkedIn has a report/block URL pattern:

```
https://www.linkedin.com/in/{profileSlug}/overlay/report-or-block/
```

Opening this URL directly lands the user on a block/report modal without needing to simulate menu clicks. The extension can open this as a new tab:

```javascript
// content.js
function triggerBlock(profileUrl) {
  const slug = profileUrl.match(/linkedin\.com\/in\/([^/]+)/)?.[1];
  if (!slug) return;
  // Open LinkedIn's own block/report overlay — user completes it manually
  window.open(`https://www.linkedin.com/in/${slug}/overlay/report-or-block/`, '_blank');
}
```

This is far more robust than DOM automation: LinkedIn's own UI handles the block, the extension just navigates there. The user clicks "Block" in LinkedIn's own interface. This avoids brittle selector chains and Terms of Service risk from fully automated blocking.

**Trade-off:** The user must click one more button in LinkedIn's UI. Acceptable for v1 given the robustness gain.

**Full automation (if desired later):** Use `chrome.debugger` API to simulate clicks via Chrome DevTools Protocol — but this requires `debugger` permission, shows a warning bar to the user, and is complex. Avoid for v1.

---

## Build Order

Build in this order so every step is independently testable and shippable.

### Phase 1: Content Script Skeleton + Observer (testable day 1)

**Goal:** Prove you can observe the LinkedIn feed and identify post nodes.

Build:
- `manifest.json` with content script on `*://www.linkedin.com/*`
- Content script with MutationObserver wired to feed container
- Console.log every detected post URN and author name

Test: Open LinkedIn, scroll the feed, watch console output. No storage, no popup.

**Why first:** Everything else depends on reliable post detection. Validate this before writing any other code.

### Phase 2: Post Extraction + Heuristic Scoring (testable in isolation)

**Goal:** Score is computed correctly for known test cases.

Build:
- `PostData` extractor (reads DOM, returns typed object)
- `HeuristicDetector` with 3–4 initial rules
- Unit-testable rule functions (pure functions, no DOM dependency)
- Score threshold check with console output

Test:
- Unit tests for heuristic rules with fixture data (no browser needed)
- Manual: load LinkedIn, check console for scores on known-AI-pattern posts

**Why second:** Scoring logic is complex and the most likely source of bugs. Isolate it before hiding anything.

### Phase 3: Element Hiding (testable visually)

**Goal:** High-score posts disappear from feed.

Build:
- Injected stylesheet (`llb-hidden` class)
- `hidePost(node, urn)` function
- Wire hiding into the observer pipeline after scoring

Test: Visually confirm posts vanish. Confirm LinkedIn still scrolls and loads more posts (no broken feed).

**Why third:** Hiding is simple once scoring works, but you want scoring proven first so you're not hiding legitimate posts during development.

### Phase 4: Storage + Flagged Account Queue

**Goal:** Flagged accounts persist across page reloads.

Build:
- `storeFlaggedAccount()` function writing to `chrome.storage.local`
- Storage schema as defined above
- Read-back verification

Test: Reload LinkedIn page, open DevTools → Application → chrome.storage.local, confirm accounts persist.

### Phase 5: Popup (read-only first)

**Goal:** Popup shows flagged accounts from storage.

Build:
- `popup.html` + `popup.js`
- Read `flaggedAccounts` from storage
- Render list with name, score, signals, status
- `chrome.storage.onChanged` listener for live updates

Test: Flag some accounts by browsing, open popup, confirm list appears.

**Why read-only first:** Separates rendering from action handling. Catch rendering bugs before wiring decisions.

### Phase 6: User Decisions (block / dismiss)

**Goal:** User can act on flagged accounts from popup.

Build:
- Dismiss: update status in storage, attempt to unhide posts in active tab
- Block: open LinkedIn's block URL in new tab (deep link approach)
- `background.js` service worker for tab coordination
- Badge text showing pending count

Test: Dismiss an account, confirm it disappears from the "pending" list. Block an account, confirm LinkedIn's block modal opens.

### Phase 7: Settings + Threshold Configuration

**Goal:** User can tune the threshold without rebuilding.

Build:
- Settings storage key
- Settings UI in popup (slider or input for threshold)
- Content script reads threshold at startup

Test: Set threshold to 0.0 (flag everything), confirm all posts flagged. Set to 1.0 (flag nothing), confirm feed is clean.

---

## Architecture Risks

| Risk | Severity | Mitigation |
|---|---|---|
| LinkedIn class names change → observer stops working | HIGH | Use `data-*` attribute selectors, add self-test that logs if feed container not found |
| MV3 service worker wakes too slowly → badge count stale | LOW | Badge is cosmetic; acceptable staleness |
| React re-adds hidden nodes after reconciliation | MEDIUM | CSS class hiding survives reconciliation; node removal would not |
| Block deep link URL pattern changes | MEDIUM | Fallback: open profile page and show toast "click More → Block" |
| `processedPosts` Set grows unbounded in long sessions | LOW | Cap at 1000 entries with LRU eviction, or clear on navigation |
| Content script injected before feed DOM exists | HIGH (timing) | Retry loop with backoff for feed container detection |
| Scoring false positives alienate user | HIGH (UX) | Default threshold conservatively high (0.75+); make it obvious what was hidden |

---

## Confidence Summary

| Area | Confidence | Notes |
|---|---|---|
| MV3 component boundaries | HIGH | Stable spec, well-documented |
| MutationObserver patterns | HIGH | Standard Web API, patterns proven |
| CSS class hiding strategy | HIGH | Standard DOM manipulation |
| chrome.storage.local schema | HIGH | Well-understood API |
| Message passing patterns | HIGH | Standard MV3 patterns |
| Pluggable detector interface | HIGH | Pure software design, no external dependency |
| LinkedIn feed DOM selectors | MEDIUM | Class names change; data-* attributes more stable but still subject to change |
| LinkedIn block URL deep link | MEDIUM | Observed pattern but not officially documented; verify before shipping |
| Full block click automation | LOW | Fragile, not recommended for v1 |
