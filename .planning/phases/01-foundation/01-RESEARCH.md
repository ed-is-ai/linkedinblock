# Phase 1: Foundation - Research

**Researched:** 2026-05-25
**Domain:** Chrome MV3 extension scaffolding, MutationObserver, SPA navigation, selector registry
**Confidence:** HIGH for MV3 patterns and stack; LOW for live LinkedIn DOM selectors (requires hands-on inspection)

---

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions

- **D-01:** Use a web extension starter template (vite-plugin-web-extension) rather than `npm create vite vanilla-ts` from scratch.
- **D-02:** Researcher must verify the current state of vite-plugin-web-extension's official starter before the planner commits to this path.
- **D-03:** Fallback if no clean template found: `npm create vite@latest -- --template vanilla-ts` with manual MV3 config.
- **D-04:** Source layout under `src/` with subdirectories per entry point (content/, background/, popup/, shared/), manifest.json, vite.config.ts.
- Selector strategy: data-* attribute selectors + semantic HTML only; no CSS class names (from CLAUDE.md + STATE.md).
- No `element.remove()` — use CSS class toggle `.llb-hidden { display: none !important }` (from CLAUDE.md).
- Service worker is stateless — all durable state to `chrome.storage.local` immediately (from CLAUDE.md + STATE.md).
- SPA navigation: observe document.body subtree:true; re-init on pushState/popstate (from STATE.md).
- Block action: deep link `/overlay/report-or-block/` only, never simulate clicks (from CLAUDE.md).

### Claude's Discretion

- ESLint + Prettier configuration details (flat config eslint.config.js).
- TypeScript strictness settings.
- Whether the service worker stub in Phase 1 is a bare-minimum file or includes the message listener pattern.
- Observer anchor specifics (which stable element to anchor to).
- SPA navigation detection method (URL polling vs. pushState monkey-patch vs. Navigation API).
- processedPosts Set cap strategy for Phase 1.
- Whether to include basic health sentinel (recommended) or defer.
- Whether to include cross-context error logger (likely defer to Phase 2).

### Deferred Ideas (OUT OF SCOPE)

- Full cross-context error logging utility writing errors to chrome.storage.local and surfacing in popup.
- processedPosts LRU eviction (cap at 1000, evict oldest) — basic Set sufficient for Phase 1.
- Infinite scroll sentinel test — Phase 2 concern (no hiding in Phase 1).
</user_constraints>

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|------------------|
| INFRA-01 | Extension loads as a Chrome MV3 extension without errors on linkedin.com | Scaffold via `npm create vite-plugin-web-extension`, manifest.json with correct `content_scripts`, `host_permissions`, service worker entry. Verified stack packages support this. |
| INFRA-02 | Content script observes the LinkedIn feed using MutationObserver anchored to stable `data-*` attributes (not CSS class names) | Selector registry pattern + observer anchored to `[data-finite-scroll-hotkey-context]` or `main` fallback. Live DOM inspection prerequisite still required. |
| INFRA-03 | All durable state persisted to `chrome.storage.local` immediately on change | No durable state in Phase 1 (console output only), but storage abstraction stub (`src/shared/storage.ts`) must be created with typed wrapper pattern. |
| INFRA-04 | A selector registry abstracts all LinkedIn DOM selectors into one place | `src/content/selectors.ts` as single file — any LinkedIn DOM change requires only editing this file. |
| INFRA-05 | Extension handles LinkedIn SPA navigation without losing the observer | `popstate` event listener + `history.pushState` monkey-patch pattern; re-initialise observer with 1s delay after route change. |
</phase_requirements>

---

## Summary

Phase 1 is the foundational scaffold that everything else builds on. The technical domain divides cleanly into two parts: the build toolchain (Vite + vite-plugin-web-extension, TypeScript, manifest), and the runtime content script (MutationObserver, selector registry, SPA navigation recovery). Both are well-understood patterns with high-confidence implementation guidance, except for one critical unknown: the actual live LinkedIn DOM structure.

The vite-plugin-web-extension plugin (by aklinker1) is confirmed active on npm as of April 2026 (version 4.5.1) and provides an official scaffold CLI command with a `vanilla-ts` template option. This satisfies D-01/D-02 — the clean MV3 + TypeScript template exists. The plugin supports Vite 5 (current: 8.0.14 for Vite, which is Vite 8 — see note below). All core stack packages are legitimate npm packages with multi-year histories, high download volumes, and official GitHub repositories.

For SPA navigation, the recommended pattern is `popstate` event listener combined with a `history.pushState` monkey-patch. The Web Navigation API (Chrome 102+) is available in content scripts as a web platform API (it lives on `window.navigation`) but LinkedIn fires pushState navigations that do not always produce `popstate` events on forward navigation — the monkey-patch is the only reliable method to catch all pushState calls. URL-polling via a body MutationObserver is a viable fallback but adds unnecessary mutation callback overhead.

The single highest-risk unknown in this phase remains the live LinkedIn DOM structure. No selector for the feed container or post card can be finalized without live DevTools inspection.

**Primary recommendation:** Scaffold with `npm create vite-plugin-web-extension`, select `vanilla-ts` template, adapt folder structure to D-04 spec, then do live LinkedIn DOM inspection before writing a single selector. The SPA navigation handler should use pushState monkey-patch + popstate listener.

---

## Architectural Responsibility Map

| Capability | Primary Tier | Secondary Tier | Rationale |
|------------|-------------|----------------|-----------|
| MutationObserver + feed observation | Content Script | — | Requires DOM access; content scripts have full DOM access in isolated world |
| Selector registry | Content Script (file) | — | A static config file consumed by the content script; no other tier needs it in Phase 1 |
| SPA navigation detection | Content Script | — | URL changes happen in page context; content script listens to popstate and wraps pushState |
| Post URN + author extraction | Content Script | — | DOM read; co-located with observer to avoid serialization overhead |
| processedPosts deduplication Set | Content Script (memory) | — | In-memory per tab; cleared on SPA navigation; no cross-context sharing needed in Phase 1 |
| chrome.storage.local typed wrapper | Shared module | Content Script consumer | Abstraction layer; content script is the only writer in Phase 1 |
| Service worker stub | Service Worker | — | Required by manifest; minimal in Phase 1 — registers onMessage listener, no business logic |
| Build configuration | Build toolchain | — | vite.config.ts + manifest.json; not a runtime tier |

---

## Standard Stack

### Core

| Library | Version (verified) | Purpose | Why Standard |
|---------|-------------------|---------|--------------|
| vite-plugin-web-extension | 4.5.1 [VERIFIED: npm registry] | Multi-entry Vite plugin for Chrome/web extensions; handles manifest processing, separate bundles per entry | Only actively-maintained MV3-native Vite plugin; CRXJS had documented Vite 5 compat issues |
| vite | 8.0.14 [VERIFIED: npm registry] | Build tool and dev server | Current Vite major; esbuild under the hood; fastest HMR for popup dev |
| typescript | 6.0.3 [VERIFIED: npm registry] | Type-safe chrome.* API usage; catches message shape mismatches at compile time | Language standard for all non-trivial Chrome extensions |
| @types/chrome | 0.1.42 [VERIFIED: npm registry] | TypeScript definitions for all Chrome MV3 APIs | DefinitelyTyped package; only source of MV3 type coverage |
| preact | 10.29.2 [VERIFIED: npm registry] | ~4 KB React-compatible UI framework for popup (stub in Phase 1) | 10x smaller than React; API-compatible; well-established for extension popups |
| @preact/preset-vite | 2.10.5 [VERIFIED: npm registry] | Vite preset configuring JSX transform for Preact | Official Preact plugin; zero-config JSX in Vite |

### Supporting

| Library | Version (verified) | Purpose | When to Use |
|---------|-------------------|---------|-------------|
| eslint | 10.4.0 [VERIFIED: npm registry] | Static analysis; catches common MV3 anti-patterns | Phase 1 setup; flat config (eslint.config.js) is ESLint 9+ default |
| prettier | 3.8.3 [VERIFIED: npm registry] | Code formatting | Phase 1 setup; format-on-save in editor |

> **Note on Vite version:** Training data references Vite 5 (vite@5.x). The current npm version is 8.0.14 (Vite 8). The vite-plugin-web-extension plugin lists no peer dependency restriction on npm (empty peerDependencies field), and its last publish was April 2026. Treat Vite 8 as current; do not pin to Vite 5.

### Alternatives Considered

| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| vite-plugin-web-extension | @crxjs/vite-plugin | CRXJS had documented Vite 5 compat gaps as of mid-2025; vite-plugin-web-extension was updated April 2026 and is clearly the safer choice |
| vite-plugin-web-extension | npm create vite vanilla-ts + manual MV3 config (D-03) | Manual config is viable but requires writing multi-entry Vite config from scratch; plugin handles this automatically |
| @preact/preset-vite + JSX | htm tagged templates | htm avoids JSX transform but is less ergonomic; preset-vite is cleaner for Vite projects |

**Installation (after scaffold):**
```bash
npm create vite-plugin-web-extension
# Select: vanilla-ts template
# Then add:
npm install preact
npm install -D @preact/preset-vite @types/chrome eslint prettier
```

**Version verification:** All versions above confirmed via `npm view <pkg> version` on 2026-05-25.

---

## Package Legitimacy Audit

> slopcheck ran against PyPI (Python) registry — this is a JavaScript/Node.js project. All packages below are npm packages. PyPI slopcheck results are inapplicable (cross-ecosystem false positives — see protocol note). Verification performed directly via npm registry.

| Package | Registry | Age | Last Published | Source Repo | slopcheck (npm) | Disposition |
|---------|----------|-----|----------------|-------------|-----------------|-------------|
| vite-plugin-web-extension | npm | ~4.5 yrs (2021-11-01) | 2026-04-06 | github.com/aklinker1/vite-plugin-web-extension | N/A — verified via npm + official docs | Approved |
| preact | npm | ~10.6 yrs (2015-09-11) | 2026-05-17 | github.com/preactjs/preact | N/A — verified via npm + official docs | Approved |
| @preact/preset-vite | npm | ~4 yrs (2021-03-12) | 2026-03-20 | github.com/preactjs (inferred from preactjs org) | N/A — verified via npm | Approved |
| vite | npm | Well-established | 2026-05 | github.com/vitejs/vite | N/A — verified via npm | Approved |
| typescript | npm | 12+ yrs | 2026-05 | github.com/microsoft/TypeScript | N/A — verified via npm | Approved |
| @types/chrome | npm | ~10 yrs (2016-05-17) | 2026-05-07 | github.com/DefinitelyTyped/DefinitelyTyped | N/A — verified via npm | Approved |
| eslint | npm | ~12 yrs (2013-07-04) | 2026-05-15 | github.com/eslint/eslint | N/A — verified via npm | Approved |
| prettier | npm | 8+ yrs | 2026-05 | github.com/prettier/prettier | N/A — verified via npm | Approved |

**Packages removed due to slopcheck [SLOP] verdict:** none
**Packages flagged as suspicious [SUS]:** none

No postinstall scripts found on vite-plugin-web-extension, preact, or @preact/preset-vite via `npm view <pkg> scripts.postinstall`.

*Note: slopcheck defaults to PyPI and incorrectly flagged all npm packages as "hallucinated". These are long-established npm packages verified directly on the npm registry. Cross-ecosystem false-positive — slopcheck result disregarded for npm packages.*

---

## Architecture Patterns

### System Architecture Diagram

```
LinkedIn tab (https://www.linkedin.com/*)
  |
  | Chrome injects at document_idle
  v
+----------------------------------------------------------+
|  Content Script (src/content/index.ts)                   |
|                                                          |
|  startup:                                                |
|    readSelectorsFromRegistry()                           |
|    waitForFeedContainer() --[retry/backoff]--> attach    |
|    MutationObserver                                      |
|    wrapHistoryPushState()  <-- SPA nav intercept        |
|    window.addEventListener('popstate', reinit)           |
|                                                          |
|  on mutation:                                            |
|    filter: addedNodes with element type                  |
|    extractPostNodes(addedNode)                           |
|    for each postNode:                                    |
|      urn = postNode.dataset.urn  (or queried child)     |
|      if processedPosts.has(urn) -> skip                  |
|      processedPosts.add(urn)                             |
|      authorName = extractAuthor(postNode)                |
|      console.log(urn, authorName)  [Phase 1 output]     |
|                                                          |
|  on SPA navigation:                                      |
|    processedPosts.clear()                                |
|    setTimeout(reinitObserver, 1000)                      |
+-----------------------------+----------------------------+
                              |
                              | chrome.runtime.sendMessage (Phase 1: stub only)
                              v
+----------------------------------------------------------+
|  Service Worker (src/background/index.ts)                |
|  - Registers onMessage listener (stub)                   |
|  - Phase 1: no business logic                            |
+----------------------------------------------------------+

src/content/selectors.ts (selector registry)
  FEED_CONTAINER = '[data-finite-scroll-hotkey-context]'  <- NEEDS LIVE VERIFICATION
  FEED_CONTAINER_FALLBACK = 'main'
  POST_CARD = '[data-urn]'                                <- NEEDS LIVE VERIFICATION
  POST_AUTHOR = ???                                       <- NEEDS LIVE VERIFICATION
  SELECTORS_VERSION = '1.0.0-unverified'
```

### Recommended Project Structure

```
linkedin.blocker/
  src/
    content/
      index.ts          <- content script entry; startup orchestration
      observer.ts       <- MutationObserver setup + SPA nav handling
      selectors.ts      <- selector registry (single file for ALL LinkedIn selectors)
    background/
      index.ts          <- service worker entry; onMessage stub
    popup/
      index.html        <- popup shell (stub in Phase 1)
      index.tsx         <- Preact entry (stub; built in Phase 4)
    shared/
      types.ts          <- PostData, DetectionResult interfaces
      storage.ts        <- typed chrome.storage.local wrapper
  manifest.json         <- MV3 manifest
  vite.config.ts        <- multi-entry Vite config
  tsconfig.json
  eslint.config.js      <- flat config (ESLint 9+)
  .prettierrc
```

### Pattern 1: Selector Registry

**What:** A single TypeScript file that exports all LinkedIn DOM selectors as named constants. No selector string appears anywhere else in the codebase.

**When to use:** Always. Any time a LinkedIn DOM element must be queried, the selector comes from this file.

**Example:**
```typescript
// src/content/selectors.ts
// Source: Project convention (CLAUDE.md critical constraint #1)
// !! All values below are PLACEHOLDERS — must be verified via live LinkedIn DevTools inspection !!

export const SELECTORS_VERSION = '1.0.0-unverified';

// Feed container — anchor for MutationObserver
export const FEED_CONTAINER = '[data-finite-scroll-hotkey-context]'; // [ASSUMED] — verify in DevTools
export const FEED_CONTAINER_FALLBACK = 'main';                        // [ASSUMED] — semantic fallback

// Post card — the element receiving .llb-hidden in Phase 2
export const POST_CARD = '[data-urn]';   // [ASSUMED] — URN attribute may be on a child node

// Post identifiers
export const POST_URN_ATTR = 'data-urn'; // [ASSUMED] — attribute holding the URN value

// Author name — text content or aria attribute
export const POST_AUTHOR_NAME = '[data-anonymize="person-name"]'; // [ASSUMED] — common LinkedIn pattern

// Exclusion markers
export const SPONSORED_MARKER = '[data-test-id*="promoted"]';   // [ASSUMED] — verify
export const COMPANY_PAGE_MARKER = '[data-test-id*="company"]'; // [ASSUMED] — verify
```

### Pattern 2: Feed Container Wait with Exponential Backoff

**What:** LinkedIn's feed container is rendered client-side; the content script injects at `document_idle` but the feed DOM may not be present yet. Retry with backoff.

**When to use:** On every content script startup and after every SPA navigation.

**Example:**
```typescript
// src/content/observer.ts
// Source: .planning/research/ARCHITECTURE.md §MutationObserver for LinkedIn Infinite Scroll

const MAX_RETRIES = 10;
const BASE_DELAY_MS = 500;

async function waitForFeedContainer(): Promise<Element | null> {
  const { FEED_CONTAINER, FEED_CONTAINER_FALLBACK } = await import('./selectors');
  for (let attempt = 0; attempt < MAX_RETRIES; attempt++) {
    const el = document.querySelector(FEED_CONTAINER)
      ?? document.querySelector(FEED_CONTAINER_FALLBACK);
    if (el) return el;
    await new Promise(r => setTimeout(r, BASE_DELAY_MS * Math.min(attempt + 1, 4)));
  }
  // Health sentinel: if feed not found after retries, warn
  console.warn('[LLB] Feed container not found after retries. Selectors may be stale.', {
    selectorsVersion: (await import('./selectors')).SELECTORS_VERSION,
    url: location.href,
  });
  return null;
}
```

### Pattern 3: SPA Navigation Detection — pushState Monkey-Patch

**What:** LinkedIn uses `history.pushState` for SPA navigation. `popstate` fires on back/forward navigation but NOT on programmatic `pushState` calls. Wrapping `pushState` is the only reliable way to catch all route changes.

**When to use:** Once at content script startup.

**Why not Navigation API:** `window.navigation` is available in Chrome 102+ content scripts as it is a standard web platform API. However, it fires for ALL navigations including sub-frame and resource navigations, and LinkedIn's own code may suppress or intercept it in ways that differ from pushState interception. The pushState monkey-patch is the established, predictable approach for LinkedIn content scripts. [ASSUMED — the Navigation API suitability for this specific use case has not been verified against LinkedIn's actual navigation implementation.]

**Why not body MutationObserver URL polling:** A body observer fires hundreds of times per second on LinkedIn's feed. Checking `location.href` on every mutation callback adds CPU cost to an already hot code path. Dedicated event listeners are more precise.

**Example:**
```typescript
// src/content/observer.ts
// Source: .planning/research/ARCHITECTURE.md §SPA Navigation, PITFALLS.md §CRIT-3

let lastUrl = location.href;

function installSpaNavigationHandler(reinit: () => void): void {
  // Catch back/forward navigation
  window.addEventListener('popstate', () => {
    if (location.href !== lastUrl) {
      lastUrl = location.href;
      setTimeout(reinit, 1000); // let React finish rendering
    }
  });

  // Catch programmatic pushState navigation (LinkedIn's primary nav method)
  const originalPushState = history.pushState.bind(history);
  history.pushState = function (...args) {
    originalPushState(...args);
    if (location.href !== lastUrl) {
      lastUrl = location.href;
      setTimeout(reinit, 1000);
    }
  };
}
```

### Pattern 4: MutationObserver with Immediate Filtering

**What:** Observe the feed container with `{ childList: true, subtree: true }`. Filter mutations immediately — only process records where `addedNodes` contains element nodes. Never run `querySelectorAll` on the full document inside the callback.

**When to use:** After feed container is found.

**Example:**
```typescript
// src/content/observer.ts
// Source: .planning/research/PITFALLS.md §COMMON-1, ARCHITECTURE.md §Pattern 1

function attachObserver(container: Element, onPost: (node: Element) => void): MutationObserver {
  const processedPosts = new Set<string>();

  const observer = new MutationObserver((mutations) => {
    for (const mutation of mutations) {
      if (mutation.type !== 'childList') continue;
      for (const node of mutation.addedNodes) {
        if (node.nodeType !== Node.ELEMENT_NODE) continue;
        const el = node as Element;
        // Coarse filter: only process nodes that are or contain post cards
        const postCards = el.matches(POST_CARD) ? [el] : Array.from(el.querySelectorAll(POST_CARD));
        for (const card of postCards) {
          const urn = card.getAttribute(POST_URN_ATTR);
          if (!urn || processedPosts.has(urn)) continue;
          processedPosts.add(urn);
          onPost(card);
        }
      }
    }
  });

  observer.observe(container, { childList: true, subtree: true });
  return observer;
}
```

### Anti-Patterns to Avoid

- **CSS class selectors in selectors.ts:** LinkedIn CSS classes (`scaffold-finite-scroll__content`, etc.) change on every deploy. Any class-based selector will silently return empty NodeLists after a LinkedIn deploy. Use `data-*`, `aria-label`, `role`, or semantic elements only. [HIGH — PITFALLS.md CRIT-1]
- **`element.remove()` for hiding:** React tracks DOM nodes. Removing them causes reconciliation errors and React re-adds the node. Use `classList.add('llb-hidden')` only. Phase 1 has no hiding, but the pattern must be established now. [HIGH — CLAUDE.md]
- **`characterData: true` or `attributes: true` in observer options:** LinkedIn mutates attributes and text on every React render cycle. Observing these fires the callback hundreds of times per second. Only `childList: true, subtree: true` is needed for post arrival detection. [HIGH — PITFALLS.md COMMON-1]
- **`chrome.storage.sync` instead of `chrome.storage.local`:** sync has 100 KB total quota and rate limits; local has 10 MB. The project uses local exclusively. [HIGH — PITFALLS.md COMMON-9, CLAUDE.md]
- **State in service worker module scope:** Chrome terminates idle service workers after ~30 s. Module-level variables are destroyed. Never store durable state in SW memory. [HIGH — PITFALLS.md CRIT-2]
- **Injecting content scripts into MAIN world:** Makes the script visible to LinkedIn's page JavaScript. Use ISOLATED (default). [MEDIUM — STACK.md]

---

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Multi-entry Vite config for extension | Manual `rollupOptions.input` with 4 entries | `vite-plugin-web-extension` | Plugin handles manifest parsing, separate chunk output per entry, HMR for popup; manual config has known edge cases with content script IIFE wrapping |
| TypeScript for chrome.* APIs | Type assertions / `any` casts | `@types/chrome` | Full MV3 API coverage including service worker globals, storage, action API |
| JSX transform for Preact | Manual Babel config | `@preact/preset-vite` | Zero-config; one-line plugin addition to vite.config.ts |
| Service worker keep-alive | `setInterval` pings, `chrome.alarms` polling | Design around stateless handlers | Keep-alive fights MV3's design; Chrome will terminate the SW anyway; re-hydrate from storage on each event |

**Key insight:** The vite-plugin-web-extension plugin eliminates ~100 lines of Vite/Rollup configuration that extension developers historically had to write by hand and maintain as Vite versions change.

---

## Common Pitfalls

### Pitfall 1: Selector Returns Empty NodeList After LinkedIn Deploy

**What goes wrong:** Content script queries `document.querySelector(FEED_CONTAINER)` and gets null. MutationObserver is never attached. Extension silently does nothing.

**Why it happens:** LinkedIn's compiled CSS classes change on every frontend deploy. Even `data-*` attributes are not immune — LinkedIn has changed `data-urn` formatting and attribute names before.

**How to avoid:** All selectors in `selectors.ts`. Health-check sentinel: if `waitForFeedContainer()` fails all retries, log a structured warning to console with the `SELECTORS_VERSION` string. This makes breakage immediately obvious in DevTools.

**Warning signs:** Popup queue never grows despite active LinkedIn browsing. Console has no `[LLB]` output lines.

---

### Pitfall 2: Observer Detaches After SPA Navigation

**What goes wrong:** Observer works on first page load. User navigates to a profile and back. The feed DOM was destroyed and recreated by React. The old MutationObserver target is now a detached element (not in the live DOM). No new mutations are observed.

**Why it happens:** `history.pushState` does not fire `popstate`. The content script has no way to know a navigation happened unless it specifically listens for pushState.

**How to avoid:** Monkey-patch `history.pushState` at startup (Pattern 3 above). On route change, call `observer.disconnect()`, clear `processedPosts`, wait 1s, then re-run `waitForFeedContainer()` and re-attach.

**Warning signs:** Extension logs posts on initial load but stops after navigating away and returning. Refreshing the tab restores logging.

---

### Pitfall 3: vite-plugin-web-extension Template Folder Structure Mismatch

**What goes wrong:** `npm create vite-plugin-web-extension` with `vanilla-ts` generates a default structure that may differ from the D-04 spec (src/content/, src/background/, src/popup/, src/shared/). Planning task assumes one layout; template produces another.

**Why it happens:** The scaffold CLI has its own opinionated layout. D-04 is the project's target layout.

**How to avoid:** After running the scaffold command, the plan must include an explicit "verify template output and restructure to D-04 spec" task before any code is written. Do not assume the template matches D-04.

**Warning signs:** N/A — caught at planning time by this pitfall entry.

---

### Pitfall 4: Content Script Injected Before Feed DOM Exists

**What goes wrong:** `run_at: document_idle` fires when the initial HTML document is parsed, not when LinkedIn's React app has finished rendering the feed. The feed container element does not exist at content script startup.

**Why it happens:** LinkedIn is a React SPA. The HTML shell loads first; feed posts are rendered client-side via JavaScript after the initial idle event.

**How to avoid:** `waitForFeedContainer()` with exponential backoff (Pattern 2 above). Never call `querySelector` on the feed container synchronously at the top level of the content script.

**Warning signs:** Observer attached immediately on load but catches 0 posts; console logging starts only after manual scroll.

---

### Pitfall 5: Vite 8 vs. Vite 5 in Documentation

**What goes wrong:** The existing `.planning/research/STACK.md` references `vite@5.x`. The current npm version is 8.0.14 (Vite 8). Scaffolding with explicit version pins to 5 may create unnecessary complexity.

**Why it happens:** Training data cutoff (August 2025) predates Vite 8.

**How to avoid:** Use the latest version (Vite 8) — `vite-plugin-web-extension` 4.5.1 has no npm peerDependency restriction on Vite version and was published April 2026, well after Vite 8. Do not pin to Vite 5.

**Warning signs:** `npm install` peer dependency warnings if vite@5 is explicitly pinned.

---

## Code Examples

### Manifest (MV3 minimal)

```json
// src/manifest.json
// Source: .planning/research/STACK.md §Permissions, confirmed against Chrome MV3 docs [ASSUMED]
{
  "manifest_version": 3,
  "name": "LinkedIn Blocker",
  "version": "0.1.0",
  "description": "Hides AI-generated posts on LinkedIn.",
  "permissions": ["storage", "activeTab"],
  "host_permissions": ["https://www.linkedin.com/*"],
  "background": {
    "service_worker": "background/index.js",
    "type": "module"
  },
  "content_scripts": [
    {
      "matches": ["https://www.linkedin.com/*"],
      "js": ["content/index.js"],
      "run_at": "document_idle",
      "all_frames": false
    }
  ],
  "action": {
    "default_popup": "popup/index.html",
    "default_title": "LinkedIn Blocker"
  }
}
```

### Vite Config (multi-entry with Preact)

```typescript
// vite.config.ts
// Source: .planning/research/STACK.md §Build Tooling, vite-plugin-web-extension docs
import { defineConfig } from 'vite';
import preact from '@preact/preset-vite';
import webExtension from 'vite-plugin-web-extension';

export default defineConfig({
  plugins: [
    preact(),
    webExtension({
      manifest: () => require('./src/manifest.json'),
    }),
  ],
});
```

### TypeScript Storage Wrapper Stub

```typescript
// src/shared/storage.ts
// Source: .planning/research/STACK.md §chrome.storage.local Patterns [ASSUMED]
import type { StorageSchema } from './types';

export async function storageGet<K extends keyof StorageSchema>(
  keys: K[]
): Promise<Pick<StorageSchema, K>> {
  return chrome.storage.local.get(keys) as Promise<Pick<StorageSchema, K>>;
}

export async function storageSet(values: Partial<StorageSchema>): Promise<void> {
  return chrome.storage.local.set(values);
}
```

### PostData and DetectionResult Type Stubs

```typescript
// src/shared/types.ts
// Source: .planning/research/ARCHITECTURE.md §Pluggable Detection Design
export interface PostData {
  urn: string;
  authorId: string;
  authorName: string;
  authorProfileUrl: string;
  postText: string;
}

export interface DetectionResult {
  score: number;         // 0.0 (human) to 1.0 (bot)
  signals: string[];
  confidence: 'high' | 'medium' | 'low';
  engineUsed: 'heuristic' | 'llm';
}

export interface Detector {
  name: string;
  detect(post: PostData): Promise<DetectionResult>;
}
```

---

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| vite@5.x (per STACK.md) | vite@8.0.14 | Between Aug 2025 and May 2026 | No impact — vite-plugin-web-extension has no peerDep restriction; use Vite 8 directly |
| ESLint 9 flat config `.eslintrc.js` (legacy) | `eslint.config.js` (flat config) | ESLint 9 (2024) | Flat config is now the default; `.eslintrc.*` files are deprecated |

**Deprecated/outdated patterns in STACK.md:**
- `vite@5.x` reference: Vite is now at v8.0.14. STACK.md guidance remains valid — just use the current version.
- `eslint@9.x` + `prettier@3.x` references remain accurate (current: eslint@10.4.0, prettier@3.8.3 — same major, minor bump only).
- `@types/chrome ~0.0.270+` reference: current is 0.1.42. Same package; the version jump is normal.

---

## Live LinkedIn DOM Inspection — Mandatory Prerequisite

This section documents what MUST be discovered via live DevTools inspection before any selector-dependent code is written. It is the single highest-risk unknown in Phase 1.

**What to inspect (open LinkedIn feed, F12, Elements tab):**

1. **Feed container element:** What element is the direct parent of post cards? Does `[data-finite-scroll-hotkey-context]` exist? What other `data-*` attributes exist on the feed container or its scroll wrapper?

2. **Post card element:** What is the root element of a single post card? What `data-*` attributes does it have? Is `data-urn` present at the card root, or on a child element? What does the URN value look like (e.g., `urn:li:activity:1234567890`)?

3. **Author name:** Is the author's display name in a specific element with an `aria-label` or `data-anonymize` attribute? Or only as raw text content?

4. **Sponsored post marker:** What attribute or element marks a sponsored/promoted post? Is there an `aria-label` containing "Promoted" or a `data-test-id` containing "promoted"?

5. **Company page marker:** What distinguishes a company-page post from a personal post in the feed card DOM?

**Deliverable from inspection:** Update `src/content/selectors.ts` — replace all `[ASSUMED]` selectors with verified values and change `SELECTORS_VERSION` from `'1.0.0-unverified'` to `'1.0.0'`.

**This inspection cannot be automated or replaced by web research.** LinkedIn's DOM is not publicly documented.

---

## Assumptions Log

| # | Claim | Section | Risk if Wrong |
|---|-------|---------|---------------|
| A1 | `[data-finite-scroll-hotkey-context]` is the feed container selector | Standard Stack, Code Examples | Observer attaches to wrong element or never attaches; no posts logged |
| A2 | `[data-urn]` identifies post cards and `data-urn` holds the post URN | Code Examples, Pattern 4 | processedPosts deduplication fails; posts logged 0 or multiple times |
| A3 | `[data-anonymize="person-name"]` is the author name selector | Code Examples selectors.ts | Author name extraction fails; logs show undefined |
| A4 | Sponsored posts can be identified via a `data-test-id` or `aria-label` containing "promoted" | Code Examples selectors.ts | Sponsored posts not excluded (Phase 2 concern but selector belongs in registry) |
| A5 | `history.pushState` monkey-patch is the best SPA navigation detection method for LinkedIn | Architecture Patterns (Pattern 3) | If LinkedIn overrides pushState itself, the reinit handler may fire at wrong times |
| A6 | vite-plugin-web-extension 4.5.1 is compatible with Vite 8 | Standard Stack | Build fails; would need to pin to an older Vite or older plugin version |
| A7 | `npm create vite-plugin-web-extension` offers a `vanilla-ts` template option | Standard Stack | Template may require manual adjustment to remove an included framework |
| A8 | `run_at: document_idle` is correct for LinkedIn; feed content is rendered client-side after idle | Code Examples manifest | Content script fires too early for DOM-based fallback detection |

**If this table is empty:** Not empty — A1-A4 are specifically flagged for live LinkedIn DOM verification.

---

## Open Questions (RESOLVED)

1. **Does `[data-finite-scroll-hotkey-context]` still exist on the LinkedIn feed container?**
   - What we know: Referenced in ARCHITECTURE.md as a candidate. More stable than class names.
   - What's unclear: LinkedIn may have changed this attribute. Cannot verify without live DOM.
   - Recommendation: Make the first task in Wave 1 a mandatory live DevTools inspection; block all selector-dependent coding on this.
   - **RESOLVED:** Plan 01-02 mandates live LinkedIn DOM inspection (human-action checkpoint) as a hard Wave 1 prerequisite. No selector-dependent code in plans 01-03 or 01-04 may proceed until DOM-INSPECTION.md is written with verified attribute values.

2. **Does vite-plugin-web-extension's vanilla-ts template match D-04's folder structure closely enough, or does it require significant restructuring?**
   - What we know: The scaffold CLI exists and offers vanilla-ts. Folder structure is not documented on the website.
   - What's unclear: Whether the generated layout uses `src/content/`, `src/background/`, etc. or a flat structure.
   - Recommendation: The plan must include a task to inspect scaffold output and restructure to D-04 before writing any code.
   - **RESOLVED:** Plan 01-01 Task 2 explicitly includes an inspect-and-restructure step: run scaffold, compare output to D-04 layout, rename/move directories as needed before writing any source files.

3. **Should Phase 1 include the health-check sentinel?**
   - What we know: PITFALLS.md CRIT-1 recommends it. CONTEXT.md says planner should include basic sentinel (console warning if feed container returns zero nodes).
   - What's unclear: Nothing — the CONTEXT.md guidance is clear: include it.
   - Recommendation: Include a minimal console.warn sentinel in `waitForFeedContainer()`. Full storage-writing diagnostics are deferred.
   - **RESOLVED:** Plan 01-04 includes a `waitForFeedContainer()` helper with a retry loop and `console.warn` after max retries, per CONTEXT.md guidance. Full error-logger (chrome.storage.local write) is deferred to Phase 2.

---

## Environment Availability

| Dependency | Required By | Available | Version | Fallback |
|------------|------------|-----------|---------|----------|
| Node.js | Build toolchain (Vite, npm scripts) | Yes | v26.1.0 | — |
| npm | Package installation | Yes | 11.13.0 | — |
| Chrome browser | Loading/testing extension | [ASSUMED] present | Unknown | Cannot test without Chrome |
| LinkedIn account | Live DOM inspection prerequisite | [ASSUMED] present | — | Cannot verify selectors without it |

**Missing dependencies with no fallback:**
- Chrome browser (required for extension load testing and live DOM inspection)
- LinkedIn account with active feed (required for selector verification)

**Note:** Both are assumed to be available given the project context. The build toolchain (Node 26, npm 11) is confirmed available on this machine.

---

## Validation Architecture

> Nyquist validation config: .planning/config.json not found — treating as enabled.

### Test Framework

Phase 1 is a scaffold phase with minimal logic. The primary validation is:
1. Extension loads in Chrome without errors (manual verification in chrome://extensions)
2. Content script logs URN + author on LinkedIn feed scroll (manual DevTools observation)
3. Observer survives SPA navigation (manual test: navigate away, return, confirm logs resume)

Unit-testable logic in Phase 1 is minimal — the selector registry and types are pure data/interfaces, not logic. The `waitForFeedContainer` retry logic and SPA navigation handler are DOM-dependent and cannot be meaningfully unit-tested without a browser DOM.

| Framework | Value |
|-----------|-------|
| Framework | None (Phase 1 has no logic to unit test; DOM-dependent code requires browser) |
| Config file | N/A — add testing framework in Phase 2 when heuristic scoring logic is unit-testable |
| Quick run command | `npm run build` (build succeeds = types correct) |
| Full verification | Manual: load unpacked extension in Chrome, open LinkedIn, check console output |

### Phase Requirements → Test Map

| Req ID | Behavior | Test Type | Automated Command | Notes |
|--------|----------|-----------|-------------------|-------|
| INFRA-01 | Extension loads without errors | Manual | `npm run build` + load in chrome://extensions | Build success is necessary but not sufficient |
| INFRA-02 | MutationObserver logs URN + author per post | Manual | `npm run build` then inspect DevTools console on LinkedIn feed | Cannot automate without browser DOM |
| INFRA-03 | storage.ts typed wrapper compiles | Automated | `npm run build` (TypeScript compilation) | Type checking at build time |
| INFRA-04 | All selectors in selectors.ts, no selector strings elsewhere | Automated (grep) | Grep codebase for `querySelector` calls outside selectors.ts | Lint rule or CI grep |
| INFRA-05 | Observer survives SPA navigation | Manual | Navigate LinkedIn feed → profile → feed; confirm logs resume | Cannot automate without E2E browser test framework |

### Wave 0 Gaps

- [ ] `eslint.config.js` — lint rule to enforce "no querySelector calls outside selectors.ts" (custom rule or grep check)
- [ ] `tsconfig.json` — strict mode settings defined in Phase 1 setup

*(No unit test files needed in Phase 1 — logic unit tests begin in Phase 2 with HeuristicDetector.)*

---

## Security Domain

> `security_enforcement` not set in config — treating as enabled.

### Applicable ASVS Categories

| ASVS Category | Applies | Standard Control |
|---------------|---------|-----------------|
| V2 Authentication | No | Extension has no authentication |
| V3 Session Management | No | No sessions |
| V4 Access Control | No | No user roles |
| V5 Input Validation | Partial | LinkedIn DOM data read into typed PostData — TypeScript types provide compile-time validation; no untrusted network input in Phase 1 |
| V6 Cryptography | No | No cryptographic operations |

### Known Threat Patterns for Chrome MV3 Content Scripts

| Pattern | STRIDE | Standard Mitigation |
|---------|--------|---------------------|
| Content script reading LinkedIn page DOM (LinkedIn's data, not user input) | Information Disclosure | Use ISOLATED world (default); do not pass DOM nodes or post text to service worker |
| `history.pushState` monkey-patch intercepting navigations | Tampering | Monkey-patch only wraps/delegates to original; does not block or modify navigation |
| Extension CSP bypass via `eval()` | Tampering | Do not use eval(); all logic in bundled static files per MV3 CSP |
| Service worker state loss exposing stale data | Denial of Service | Re-hydrate from storage on every handler (Phase 3+) |

**Phase 1 specific:** Phase 1 produces console output only (no storage writes, no network, no hiding). Security surface is minimal — the primary concern is not introducing patterns (eval, MAIN world injection) that create problems in later phases.

---

## Sources

### Primary (HIGH confidence)

- npm registry — `npm view` commands — confirmed package versions, ages, repository URLs, and postinstall scripts for all 8 packages (2026-05-25)
- vite-plugin-web-extension official docs (vite-plugin-web-extension.aklinker1.io) — scaffold CLI command `npm create vite-plugin-web-extension`, `vanilla-ts` template existence confirmed
- GitHub (github.com/aklinker1/vite-plugin-web-extension) — repository confirmed active, last npm publish April 2026
- .planning/research/ARCHITECTURE.md — MutationObserver patterns, SPA navigation patterns, component responsibility map
- .planning/research/PITFALLS.md — CRIT-1 through CRIT-4, COMMON-1, COMMON-7
- .planning/research/STACK.md — Vite config patterns, manifest structure, storage API patterns
- CLAUDE.md — Critical constraints (selector strategy, no element.remove, no CSS classes, storage.local only)

### Secondary (MEDIUM confidence)

- Chrome for Developers (developer.chrome.com/docs/web-platform/navigation-api) — Navigation API Chrome 102+ support confirmed; content script availability not explicitly stated
- .planning/research/SUMMARY.md — synthesized recommendations and phase guidance

### Tertiary (LOW confidence / [ASSUMED])

- All LinkedIn DOM selector values (`[data-finite-scroll-hotkey-context]`, `[data-urn]`, `[data-anonymize="person-name"]`) — training knowledge only; MUST be verified via live DevTools inspection before writing any content script selector code

---

## Metadata

**Confidence breakdown:**
- Standard stack (packages, versions): HIGH — verified via npm registry 2026-05-25
- Build toolchain (vite-plugin-web-extension scaffold, templates): HIGH — confirmed via official docs
- Architecture patterns (MutationObserver, SPA nav, selector registry): HIGH — stable web platform + MV3 APIs
- LinkedIn DOM selectors: LOW — all [ASSUMED]; cannot be verified without live browser session

**Research date:** 2026-05-25
**Valid until:** Stack packages: 30 days. LinkedIn DOM selector guesses: validate immediately before first coding session.
