# Pitfalls Research

**Project:** LinkedIn Blocker (Chrome MV3)
**Researched:** 2026-05-25
**Confidence note:** All tool access (WebSearch, WebFetch, Bash/Context7 CLI) was denied in this environment. All findings are drawn from training knowledge (cutoff August 2025). Confidence levels reflect source quality honestly — treat MEDIUM and LOW findings as needing human verification before coding decisions are locked in.

---

## Critical Pitfalls

These are show-stoppers: if you hit them late in development, you face a partial or full rewrite.

---

### CRIT-1: LinkedIn Class Name Instability

**What goes wrong:**
LinkedIn's frontend is compiled with CSS Modules or a similar obfuscation pipeline. Class names like `.feed-shared-update-v2`, `.occludable-update`, `.ember-view` are *internal implementation details*, not a stable public API. LinkedIn has historically renamed classes after frontend rebuilds — sometimes overnight — without any notice. An extension that selects posts with `.feed-shared-update-v2` may silently stop working after LinkedIn ships a routine deploy.

**Why it happens:**
LinkedIn runs a React (or Ember, depending on the surface) SPA with a build pipeline that produces hashed or at-minimum-non-guaranteed class names. They have no obligation to preserve them. The company also has strong commercial incentive to break scrapers and automation tools because these compete with LinkedIn's own analytics and data products.

**Consequences:**
- Content script queries return 0 results — extension silently does nothing
- MutationObserver callbacks fire but selectors match nothing — no posts are hidden
- Users think the extension is broken (it is, but not in an obvious way)
- No error is thrown — the failure is a silent empty NodeList

**Prevention:**
1. Use *structural selectors* as your primary anchor, not class names. LinkedIn's DOM has `data-*` attributes that are more stable: `data-id`, `data-urn`, `aria-label`, `role` attributes, and `id` attributes on major containers. These change less frequently because they serve accessibility and internal tracking purposes.
2. Use `article` semantic elements and structural patterns (e.g., "the first `a[href*='/in/']` inside an `article`") rather than class-specific selectors.
3. Build a *selector registry* — a single file that defines all selectors — so when LinkedIn changes, you update one file, not every function.
4. Add a *health-check sentinel* on each content script run: detect whether your primary anchor selectors are returning any nodes. If they return zero on a page that clearly has posts (check URL, check feed container exists by structural means), log a warning to `chrome.storage` and surface it in the popup ("Selectors may be broken — LinkedIn may have updated").
5. Version-pin selector sets: include a `SELECTORS_VERSION` string and a GitHub issue link in the selector registry so you can track breakage over time.

**Detection (warning signs):**
- Extension shows 0 posts hidden after a LinkedIn deploy
- Feed still loads but popup queue never grows
- `document.querySelectorAll(PRIMARY_SELECTOR)` returns empty NodeList on a page with visible posts

**Phase to address:** Phase 1 (DOM parsing foundation). The selector registry architecture must be in place before any detection logic is written. Retrofitting it is painful.

**Confidence:** HIGH — this is a well-documented problem for all LinkedIn DOM tools. Class instability is inherent to compiled frontend builds.

---

### CRIT-2: MV3 Service Worker Termination — State Loss

**What goes wrong:**
In MV3, the background context is a *service worker*, not a persistent background page. Chrome terminates the service worker after ~30 seconds of inactivity (no events). Any in-memory state (JavaScript variables, module-level caches, pending timeouts) is **destroyed**. When the next event arrives, the service worker cold-starts from scratch.

**Why it happens:**
MV3 enforced this to reduce Chrome's memory footprint. It is by design, not a bug. Extensions ported from MV2 that stored state in `let flaggedAccounts = []` at module level silently lose data every time the worker sleeps.

**Consequences:**
- The flagged-accounts queue is empty every time the user opens the popup (if you stored it in memory)
- Message handlers that assume prior state (`if (cache.has(accountId))`) behave incorrectly after worker restart
- Any debounce/throttle timer set with `setTimeout` in the service worker is lost if the worker sleeps mid-timer
- `chrome.alarms` callbacks fire correctly but find empty state if not re-hydrated first

**Prevention:**
1. **Never store durable state in service worker memory.** All persistent data must go to `chrome.storage.local` immediately on write. Treat the service worker as stateless between events.
2. Re-hydrate on every message handler entry: `const state = await chrome.storage.local.get(['flaggedAccounts', 'settings'])` at the top of each handler.
3. For the flagged-accounts queue specifically: write to `chrome.storage.local` every time a new account is flagged (content script → service worker message → immediate storage write).
4. Use `chrome.alarms` (not `setTimeout`) for any recurring work — alarms survive worker sleep/wake cycles.
5. Add `chrome.runtime.onStartup` and `chrome.runtime.onInstalled` listeners to initialize default state on first install/update.

**Detection (warning signs):**
- Popup shows an empty queue despite the feed having been active
- `console.log` in service worker shows fresh initial values on every popup open
- State is correct only in the first ~30 seconds after an extension reload

**Phase to address:** Phase 1 (architecture setup). The storage abstraction layer must wrap all state access before any feature is built on top of it.

**Confidence:** HIGH — service worker termination is documented Chrome MV3 behaviour.

---

### CRIT-3: LinkedIn SPA Navigation — Content Script Not Re-Running

**What goes wrong:**
LinkedIn is a React SPA. Navigating from the feed to a profile page and back does *not* trigger a full page load — it uses the History API (`pushState`/`replaceState`). Chrome only re-injects content scripts on *actual* navigation (a real page load), not on SPA route changes. This means your content script runs once when LinkedIn first loads and then must survive all subsequent route changes — or be told about them.

**Why it happens:**
Chrome's `content_scripts` `run_at` injection model is tied to page lifecycle events (`document_idle`, `document_start`). SPA route changes produce no such event. The script is already running; it does not restart.

**Consequences:**
- Content script sets up a MutationObserver correctly on initial load
- User navigates to a profile, then back to feed
- The feed DOM has been substantially replaced by React reconciliation
- The MutationObserver is still watching the *old* subtree or the observer target was detached and re-attached in a way that misses new mutations

**Prevention:**
1. Observe at a *stable, high-level ancestor* — typically `document.body` or `#main-content` — rather than a specific feed container that React may unmount and remount. High-level observation captures all DOM mutations including re-mounts.
2. Listen for SPA navigation signals: `popstate` event, or `window.navigation` if available. On route change, re-scan the DOM and re-verify your observer is still attached to a live node.
3. Use the MutationObserver `subtree: true` option to catch all descendant mutations from a stable root.
4. Intercept History API: wrap `history.pushState` to dispatch a custom event your content script listens for. This is a known pattern for SPA-aware content scripts.

**Detection (warning signs):**
- Extension works on first load but stops working after navigating away and returning to feed
- Observer callback stops firing after SPA navigation

**Phase to address:** Phase 1 (content script foundation). Must be architected correctly before post detection is wired up.

**Confidence:** HIGH — SPA navigation is a universal content script challenge with well-established solutions.

---

### CRIT-4: Programmatic LinkedIn Block May Violate ToS

**What goes wrong:**
The PROJECT.md specifies that the user can "confirm block (trigger LinkedIn block)" from the popup. If this means the extension *programmatically simulates clicks on LinkedIn's block UI* (clicking LinkedIn's own block button via DOM manipulation), this constitutes *automated action on behalf of the user* — which LinkedIn's Terms of Service (Section 8.2, User Obligations, as of training cutoff) explicitly prohibit under "use bots or other automated methods to access LinkedIn."

**Why it matters:**
- LinkedIn can suspend accounts that trigger automated interaction patterns
- Chrome Web Store review may flag extensions that automate social platform interactions
- Even if LinkedIn does not detect individual block clicks, mass-blocking via automation is a higher-risk signal

**Nuance — this is a spectrum:**
- Hiding posts locally (CSS `display: none` or DOM removal) carries very low risk. It is purely client-side, leaves no server-side trace, and is the same as an ad blocker. LinkedIn cannot detect this.
- Reading the DOM to score content is similarly invisible to LinkedIn servers.
- Programmatically clicking LinkedIn's block button sends a real API request to LinkedIn's servers from the user's authenticated session. This *is* detectable.

**Prevention:**
1. For v1, implement the block action as a *guided manual flow*: the popup identifies the account and provides a direct link to that person's LinkedIn profile. The user clicks block manually.
2. If programmatic block is desired, add a clear UX step: "Click to go to their profile and block" — i.e., open the profile URL in a new tab. Do not simulate the block click itself.
3. Document this explicitly in the extension's README if publishing to the Web Store.
4. Never automate any action that touches LinkedIn's servers without an explicit per-action user gesture.

**Detection (warning signs):**
- LinkedIn account receives "unusual activity" warning
- Extension gets rejected by Chrome Web Store for automating social interactions

**Phase to address:** Phase 1 (design/scope decision). This is an architectural decision, not an implementation detail. Lock in the safe design before building the popup action flow.

**Confidence:** MEDIUM — ToS terms are from training knowledge; LinkedIn may have updated them. The risk assessment (server-side vs. client-side) is HIGH confidence because it is based on how HTTP requests work, not on ToS text specifically.

---

## Common Mistakes

These are frequent errors that cause bugs, regressions, or poor UX, but do not necessarily require a full rewrite.

---

### COMMON-1: MutationObserver on the Entire Feed — Performance Tax

**What goes wrong:**
A naive implementation observes `document.body` with `{ childList: true, subtree: true }` and runs synchronous scoring logic inside the callback. On LinkedIn's feed, this fires hundreds of times per second during scroll (React re-renders, lazy image loads, ad injections, notification badges updating). The callback becomes a per-frame bottleneck.

**Prevention:**
1. Use a *debounce or batch* pattern: collect mutations in a buffer, process them on the next `requestIdleCallback` or in a `setTimeout(fn, 0)` batch, not synchronously in the observer callback.
2. Filter mutations immediately in the callback: only process `MutationRecord` entries where `addedNodes` contains nodes matching a coarse structural test (e.g., the node is or contains an `article` element). Ignore attribute mutations and text node mutations entirely.
3. Use `requestIdleCallback` (available in content scripts) to defer scoring work when the browser is idle.
4. Avoid `querySelectorAll` on the entire document inside the observer callback. Instead, narrow the search to the `target` node of each `MutationRecord`.

**Phase to address:** Phase 1 (content script architecture), Phase 2 (performance tuning).

**Confidence:** HIGH — this is a documented pattern for SPA content scripts.

---

### COMMON-2: chrome.storage.local Quota and Async Misuse

**What goes wrong:**
`chrome.storage.local` has a default quota of 10 MB. Storing full post text, full profile data, and serialised DOM snapshots for every flagged account will hit this limit as the list grows. Additionally, developers often call `chrome.storage.local.set()` but forget it is async — forgetting to `await` it means reads immediately after may return stale data.

**Prevention:**
1. Store only the minimum needed per flagged account: `{ urn, displayName, score, signals: string[], firstSeen, postCount }`. Do not store post text or HTML.
2. Implement a *rotation policy*: cap the queue at N accounts (e.g., 500). When the cap is hit, drop the oldest dismissed entries first, then the oldest low-score entries.
3. Always `await chrome.storage.local.set(...)` before reading back. Use the Promises API (available since Chrome 88), not the callback API, to make async flow obvious.
4. Store settings and the account queue as separate keys so a settings write does not require deserialising/re-serialising the entire account list.

**Phase to address:** Phase 1 (storage layer design).

**Confidence:** HIGH — storage quota is documented Chrome API behaviour.

---

### COMMON-3: Popup Closes and Loses In-Flight State

**What goes wrong:**
The extension popup is an ephemeral window — it closes the moment the user clicks outside it, or when Chrome decides to close it. Any state held in popup JavaScript variables (current page of results, pending confirmation dialog state, unsaved filter input) is destroyed when the popup closes. On the next open, the popup re-initialises from scratch.

This also means: if the popup is making a `chrome.storage` read to populate the queue when the popup opens, and the user quickly closes and reopens it, the second open gets its own fresh read — fine. But if the popup was mid-way through a multi-step action (e.g., "confirm block" dialog), that state is lost.

**Prevention:**
1. Treat the popup as *stateless view over chrome.storage*. Every popup open is a full re-render from storage. Never rely on popup-level variables persisting across close/open cycles.
2. Multi-step confirmation flows must either (a) complete in a single user gesture, or (b) persist their intermediate state to `chrome.storage` so the next popup open can resume.
3. Use `chrome.storage.session` (MV3, Chrome 102+) for ephemeral state that should survive popup close but not browser restart — e.g., "user was on page 2 of the queue".
4. Consider using `chrome.action.setBadgeText` to show queue count on the extension icon — this persists even when popup is closed and avoids users losing context.

**Phase to address:** Phase 2 (popup implementation).

**Confidence:** HIGH — popup lifecycle is documented MV3 behaviour.

---

### COMMON-4: Content Script ↔ Service Worker Message Race Conditions

**What goes wrong:**
Content scripts communicate with the service worker via `chrome.runtime.sendMessage`. The service worker may be asleep when the content script sends a message. Chrome will wake the service worker to handle the message, but this wakeup takes 50–200ms. If the content script sends a burst of messages (one per detected post), and the service worker is processing them without any queue, messages can be dropped or arrive out of order.

Additionally, `chrome.runtime.sendMessage` from a content script throws if the extension context is invalidated (e.g., the extension was just reloaded or updated while the tab was open). This uncaught error crashes the content script.

**Prevention:**
1. Batch flagged accounts before sending: collect flagged accounts in a local array in the content script, then send them in a single message every N seconds (e.g., every 2 seconds or when the batch reaches 10 items).
2. Always wrap `chrome.runtime.sendMessage` in a try/catch or add a `chrome.runtime.lastError` check to handle context invalidation gracefully.
3. Check `chrome.runtime.id` before sending messages — if it's undefined, the extension context has been invalidated; do not attempt to send.
4. In the service worker, use a sequential async queue (process one message at a time to avoid interleaved storage reads/writes).

**Phase to address:** Phase 1 (content script ↔ background communication design).

**Confidence:** HIGH — `chrome.runtime.lastError` on context invalidation is documented Chrome behaviour.

---

### COMMON-5: LinkedIn Anti-Scraping Measures — Rate and Pattern Detection

**What goes wrong:**
LinkedIn actively monitors for patterns that suggest automated reading of their platform. While hiding posts locally is invisible, certain extension behaviours can trigger signals: programmatic profile page navigation (opening profile URLs in rapid succession), or XHR/fetch interception patterns.

Specifically: if a future phase adds "fetch profile data to score" by programmatically navigating to each poster's profile page, LinkedIn's servers will see rapid sequential profile views from the same authenticated session. This is detectable and has historically resulted in temporary profile restrictions ("You've reached your commercial use limit").

**Prevention:**
1. For v1: score profiles from data present in the feed post itself (the name, headline, and avatar shown in the post card) — do not navigate to profile pages programmatically.
2. If profile deep-reads are needed in a later phase, implement hard rate limits: no more than 1 profile per 10 seconds, with jitter, and only triggered by explicit user action (not automatic).
3. Never intercept or replay LinkedIn's internal API calls (`/voyager/api/*`). These are private APIs with no stability guarantee and using them may trigger LinkedIn's bot detection.

**Phase to address:** Phase 1 (detection design), Phase 3+ (if profile deep-reads are added).

**Confidence:** MEDIUM — detection behaviour is from training knowledge; LinkedIn's specific thresholds are not publicly documented.

---

### COMMON-6: False Positive Cascade — Trust Erosion

**What goes wrong:**
Heuristic detection (listicles, buzzwords, "clean grammar") will produce false positives. If the extension hides a post from someone the user actually knows and respects, and the user has no easy way to discover this happened, trust in the extension erodes rapidly. Worse, if the extension silently hides too many posts, the user's LinkedIn feed becomes sparse in a way they cannot diagnose — they may conclude LinkedIn is broken, or that their network has gone quiet.

**Prevention:**
1. During early phases, default to a *high threshold* (only hide if score is very high). It is better to miss some AI posts than to hide real ones.
2. Always show a *count of hidden posts* in the current session (badge or popup counter). Users need to know filtering is active.
3. Provide a *"show hidden posts"* or *"review what was hidden"* mechanism even if basic — a log of recently hidden posts with the scores and signals that triggered them.
4. Make thresholds configurable from day one — let users tighten or loosen detection. This gives users agency when false positives occur.
5. Never auto-confirm a LinkedIn block based on heuristic score alone. Block is a destructive action; always require explicit user confirmation.

**Phase to address:** Phase 2 (detection thresholds and UX), Phase 3 (review/audit UI).

**Confidence:** HIGH — this is a product design pattern applicable to any content filtering tool.

---

### COMMON-7: Debugging Across Isolated Worlds

**What goes wrong:**
Chrome MV3 extensions run in three separate JavaScript contexts, and errors in one are not visible in another:

1. **Content script world** — runs in the page's tab, isolated from the page's JS but with access to the DOM. Errors appear in the *tab's* DevTools console (F12 on the LinkedIn tab).
2. **Service worker world** — runs in the extension's background context. Errors appear only in `chrome://extensions` → "Inspect views: service worker".
3. **Popup world** — runs in the popup's own document. Errors appear in the popup's own DevTools (right-click popup → Inspect).

A message passing failure between worlds produces no visible error in the sender's context — `chrome.runtime.lastError` is set, but only accessible in the callback/promise of the sending call. Developers often miss these entirely.

**Prevention:**
1. Build a *unified error logging utility* from the start: any caught error in any context should write to `chrome.storage.local` with a timestamp, context label (`'content'`, `'worker'`, `'popup'`), and message. The popup can display a "Diagnostics" section showing recent errors.
2. Add `console.error` calls with context labels at every message handler boundary so you can trace message flow across all three DevTools consoles.
3. In development, always have all three DevTools open simultaneously: tab console, service worker inspector (`chrome://extensions`), and popup inspector.
4. Use a structured message format with `type` and `requestId` fields so you can correlate sends and receives across contexts.

**Phase to address:** Phase 1 (logging/diagnostic infrastructure). Must be in place before any cross-context communication is built.

**Confidence:** HIGH — isolated worlds and their DevTools separation is documented Chrome extension architecture.

---

### COMMON-8: CSS Injection Conflicts with LinkedIn's Styles

**What goes wrong:**
Hiding posts via injected CSS (e.g., adding a class that sets `display: none`) can conflict with LinkedIn's own dynamic style injections. LinkedIn uses inline styles and JavaScript-driven class mutations for its own UI states. An injected `!important` rule may work but then fight with LinkedIn's animation/transition states. Worse, hiding a post's *container* rather than the post *card* may break LinkedIn's virtual scrolling or infinite scroll sentinel, causing the feed to stop loading new posts.

**Prevention:**
1. Prefer setting `display: none` on the specific *post card* element (the `article` or equivalent), not on a parent container that LinkedIn uses for layout.
2. Test hiding logic against LinkedIn's infinite scroll: confirm new posts still load after several posts have been hidden.
3. Use a CSS class injected via the content script's `document.documentElement.appendChild(style)` pattern so that styles are scoped and can be cleanly removed.
4. Do not use `visibility: hidden` — it preserves layout space and leaves a blank gap, which is confusing UX.

**Phase to address:** Phase 1 (DOM hiding implementation).

**Confidence:** MEDIUM — specific LinkedIn layout behaviour is from training knowledge; verify by testing with LinkedIn's current feed implementation.

---

### COMMON-9: chrome.storage.sync vs. chrome.storage.local Confusion

**What goes wrong:**
`chrome.storage.sync` has a much lower quota (100 KB total, 8 KB per item, 512 items max) and rate limits. Using `sync` for the flagged accounts queue will hit quota quickly. The PROJECT.md correctly specifies local-only storage, but developers sometimes reach for `sync` thinking "it's like localStorage, just better."

**Prevention:**
Use `chrome.storage.local` for all data. Only consider `sync` for a tiny settings object if cross-device sync is ever added — but its rate limits (1 write per second sustained, 120 per minute burst) make it unsuitable for high-frequency flag writes from the content script.

**Phase to address:** Phase 1. A simple naming convention (`storage.local` exclusively) prevents this.

**Confidence:** HIGH — quota figures are documented Chrome API limits.

---

### COMMON-10: CSP Restrictions on Injected Scripts and Remote Code

**What goes wrong:**
Chrome MV3 forbids `eval()`, `new Function()`, and any form of remotely fetched and executed code (via the extension's own CSP). If the detection engine ever needs to load rules dynamically (e.g., fetch an updated keyword list from a URL), this cannot be done by fetching JS and evaluating it. Additionally, LinkedIn's own page CSP may block certain types of script injection from the content script.

**Prevention:**
1. Keep all detection logic in bundled, static files. Dynamic rule updates must be data-only (JSON keyword lists), not code.
2. Fetching a JSON rules file from a URL is acceptable (data, not code) but requires declaring the URL in `host_permissions` in the manifest and handling CORS. For v1, bundle the keyword list statically — it avoids all of this complexity.
3. LinkedIn's page CSP does not affect content script execution (content scripts run in an isolated world), but it *does* affect scripts injected via `document.createElement('script')` into the *main world*. Avoid injecting scripts into the main world unless necessary.

**Phase to address:** Phase 1 (manifest and architecture setup), Phase 4+ (if dynamic rules are added).

**Confidence:** HIGH for MV3 CSP rules (documented). MEDIUM for LinkedIn's page CSP specifics (from training knowledge).

---

## Phase Mapping

| Phase | Key Pitfall(s) to Address | Concrete Action Required |
|-------|---------------------------|--------------------------|
| **Phase 1: Foundation** | CRIT-1 (class instability), CRIT-2 (service worker state), CRIT-3 (SPA navigation), CRIT-4 (ToS/block design), COMMON-1 (observer perf), COMMON-2 (storage design), COMMON-4 (message passing), COMMON-7 (debugging), COMMON-9 (storage.local), COMMON-10 (CSP) | Selector registry, storage abstraction layer, stable MutationObserver anchor, cross-context logging utility, confirm block action design, use local storage exclusively |
| **Phase 2: Detection Engine** | COMMON-5 (anti-scraping), COMMON-6 (false positives), COMMON-8 (CSS conflicts) | Score-only from feed card data (no profile navigation), high default threshold, hidden-post counter, CSS hiding on article element only |
| **Phase 3: Popup UI** | COMMON-3 (popup state), COMMON-6 (false positive UX) | Stateless popup design, badge counter, queue review with signal explanations, configurable thresholds |
| **Phase 4+: Advanced Detection** | CRIT-4 (ToS), COMMON-5 (anti-scraping rate limits) | If profile deep-reads added: hard rate limits, jitter, explicit user trigger only. Never automate block clicks. |

---

## Research Gaps

The following areas could not be verified with live documentation due to tool access restrictions. These should be manually checked before implementation decisions are finalised:

1. **LinkedIn's current DOM structure** — Verify current feed post selectors and which `data-*` attributes are present. Inspect LinkedIn's feed HTML directly in DevTools before writing any selectors.
2. **LinkedIn ToS (Section 8, User Obligations)** — Read the current ToS at `https://www.linkedin.com/legal/user-agreement` to confirm the programmatic block risk assessment. The restriction on automated actions is well-established, but the exact current language should be confirmed.
3. **chrome.storage.session availability** — Confirmed as Chrome 102+ in training data; verify your target Chrome version supports it before relying on it for popup ephemeral state.
4. **LinkedIn Content Security Policy headers** — Inspect LinkedIn's actual `Content-Security-Policy` response headers in DevTools Network tab to understand what main-world injection restrictions exist.
5. **LinkedIn's infinite scroll implementation** — Test DOM hiding against the actual feed to confirm it does not break the scroll sentinel or intersection observer LinkedIn uses for lazy loading.
