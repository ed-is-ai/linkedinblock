# Research Summary — LinkedIn Blocker

**Project:** LinkedIn Blocker (Chrome MV3)
**Domain:** Browser extension / content filtering / heuristic AI detection
**Researched:** 2026-05-25
**Confidence:** MEDIUM-HIGH overall — MV3 patterns HIGH, LinkedIn DOM specifics LOW

---

## Recommended Stack

The extension runtime (MV3 service worker, content script isolation, `chrome.storage.local`) is not a choice — it is the platform. The decisions that remain are the popup framework and the build tool.

**Use Preact 10 with JSX via `@preact/preset-vite`, not React.** React’s ~45 KB runtime is disproportionate for a popup that renders a list and a few buttons. Preact is API-compatible and ships at ~4 KB. Svelte 5 is an alternative but the runes reactivity model is still stabilising and adds complexity not justified here.

**Use Vite 5 + `vite-plugin-web-extension` (by aklinker1).** Extensions require multiple entry points bundled independently (service worker, content script, popup) — Vite handles this cleanly with the plugin. CRXJS (`@crxjs/vite-plugin`) had maintenance gaps and Vite 5 compatibility issues as of mid-2025; verify its current status before adopting it.

| Layer | Technology | Version | Rationale |
|---|---|---|---|
| Manifest | Chrome Manifest V3 | 3 | Required for Web Store; MV2 deprecated |
| Content Script | Vanilla TypeScript | ~5.4 | Direct DOM access; no framework overhead |
| Popup UI | Preact + JSX | preact@10.x | ~4 KB runtime; React-compatible API |
| Build tool | Vite + vite-plugin-web-extension | vite@5.x | Multi-entry bundling; HMR in popup dev |
| Storage | chrome.storage.local | native | Source of truth; 10 MB limit; never use .sync |
| Type defs | @types/chrome | ~0.0.270+ | Full MV3 API coverage |
| Linting | ESLint 9 + Prettier 3 | eslint@9.x | Flat config (eslint.config.js) is now default |

**What not to use:** React 18/19, Vue 3, webpack, CRXJS (verify before adopting), `chrome.storage.sync` (8 KB/item limit), `chrome.storage.session` (cleared on restart), persistent background pages (MV2 pattern), `eval()`, MAIN-world content script injection, `webRequest` blocking.

---

## Table Stakes Features

Detection signals that must work or the extension provides no value. Ordered by signal strength and implementation priority.

### Must implement in phase 1 detection engine

1. **Listicle structure detection** — Posts with numbered items or structured headers. Regex on post text; >= 3 numbered items is a strong signal. Weight: 25/100.
2. **Buzzword density scoring** — "synergy", "leverage", "game-changer", "thought leader", "actionable insights". Count per 100 words; > 3 per 100 words triggers signal. Weight: 15/100.
3. **CTA phrase matching** — Opening phrases ("Excited to announce", "Thrilled to share") and closing phrases ("What do you think?", "Follow for more"). Exact match against curated phrase list. Weight: 10/100.
4. **Em-dash overuse** — GPT-family models compulsively use em-dashes as clause separators. > 2 per 100 words is high-specificity. Weight: 10/100.
5. **Generic headline pattern** — "CEO | Coach | Speaker | Author | Visionary" (3+ role nouns pipe-separated). Visible in every post card without visiting the profile page. Weight: 15/100.
6. **Sponsored/Promoted post exclusion** — LinkedIn marks promoted posts in the DOM. Score = 0, never hide. Failing to exclude these risks ToS issues.
7. **Company page exclusion** — Company pages expect AI-assisted content; apply a much higher threshold or skip detection entirely.
8. **Open to Work threshold reduction** — Job seekers write template-heavy posts by design; require score >= 80/100 before hiding (vs default 60/100).

**Default thresholds:** Auto-hide at 60/100 (configurable). Flag-only (review queue) at 35/100 (configurable). Both must be user-configurable from day one.

### Must implement in phase 2 (account-level intelligence)

9. **Per-account rolling score** — Rolling average of post scores across sessions in `chrome.storage.local`. A single high-scoring post may be a one-off; 8 of 10 posts scoring high is a strong account-level signal.
10. **Zero-mutual-connection signal** — Weak on its own; significant in combination with other signals. Weight: 10/100.
11. **Identical/generic comment detection** — Phrases like "Great insights! This really resonated with me." appearing near-verbatim across multiple posts. Weight: 15/100.

### Defer to v2+

- LLM-based scoring (stub the interface in v1 only)
- AI headshot detection (requires vision API)
- Commenter network graph
- Cadence regularity detection
- Profile page deep-reads (LinkedIn anti-scraping risk)

### Anti-features (deliberately excluded)

- **Non-English content filtering** — English-trained heuristics produce massive false positive rates on other languages; skip detection for non-English posts
- **Political/ideological filtering** — heuristics cannot distinguish AI-generated inspiration from political speech
- **Posting frequency as a signal** — prolific human writers post constantly; frequency is a terrible signal; confirmed out of scope in PROJECT.md
- **Absolute reaction count thresholding** — use ratio anomalies (reactions vs comment quality), never raw counts
- **Reshare penalisation** — score the original post account, not the resharing account

### False positive mitigations baked into v1

- Recruiters / HR professionals: raise auto-hide threshold by 20 points when headline contains "Recruiter", "Talent Acquisition", "HR"
- New genuine users: require at least 2 posts before auto-hiding; flag-only on first detection
- Score decay: account scores decay toward neutral if no AI-signal posts seen for 30 days

---

## Architecture in One Page

Three JavaScript runtimes, each with different capabilities and lifetimes. Assigning responsibilities correctly is the single most important architectural decision.

### Component responsibilities

| Component | Lifetime | Responsibilities |
|---|---|---|
| **Content Script** | Lives as long as LinkedIn tab | DOM observation, post extraction, heuristic scoring, CSS hiding, direct storage writes, badge notification |
| **Service Worker** | Ephemeral (~30s idle timeout) | Badge count update only; relay block/dismiss commands from popup to content script; zero durable in-memory state |
| **Popup** | Exists only while open | Stateless view over chrome.storage.local; renders flagged queue; sends user decisions to SW |

### Data flow

```
Feed mutation detected
  -> extractPostData(node) -> PostData
  -> detector.detect(PostData) -> DetectionResult
  -> if score >= threshold: hidePost(node) + storeFlaggedAccount()
  -> sendMessage ACCOUNT_FLAGGED -> SW updates badge
  -> popup reads storage.onChanged -> re-renders queue
  -> user clicks Block -> popup -> SW -> CS -> window.open(block URL)
```

### The pluggable detector interface

Every scoring engine implements one TypeScript interface. Swapping from heuristic to LLM requires changing one storage setting key — no changes to call sites.

```typescript
interface Detector {
  name: string;
  detect(post: PostData): Promise<DetectionResult>;
}

interface DetectionResult {
  score: number;       // 0.0 (human) to 1.0 (bot)
  signals: string[];   // human-readable names for popup display
  confidence: string;  // high | medium | low
  engineUsed: string;  // heuristic | llm
}
```

The content script selects the engine at startup from `settings.detectionEngine`. `HeuristicDetector` is the v1 implementation. `LLMDetector` is a future drop-in with zero changes to the detection pipeline.

### Element hiding strategy

Inject a single `<style>` tag at content script startup with `.llb-hidden { display: none !important; }`. Apply by adding the class; undo by removing it. Never use `element.remove()` — React will re-add removed nodes. Never use inline display:none — hard to batch and undo cleanly. CSS class hiding survives React reconciliation.

### Storage schema (flat-keyed, account-centric)

```javascript
{
  flaggedAccounts: { // keyed by profileId
    [id]: { id, name, profileUrl, avatarUrl, firstSeenAt, lastSeenAt,
            postCount, totalScore, peakScore, signals, status, hiddenPostIds }
  },
  settings: { threshold, autoHide, detectionEngine },
  stats: { totalHidden, totalBlocked, totalDismissed, lastScan },
  schemaVersion: 1
}
```

Store only account-level data. Never store full post text or HTML — this hits the 10 MB storage limit quickly. Cap the flagged account queue at 500 entries; drop oldest dismissed entries first when rotating.

### LinkedIn block action

Use a deep link to LinkedIn own block/report modal: `linkedin.com/in/{slug}/overlay/report-or-block/` opened in a new tab. The user completes the block in LinkedIn own UI. Never simulate clicks on LinkedIn block button — that sends API requests to LinkedIn servers from the user authenticated session, which is detectable and violates ToS.

---

## Top Pitfalls to Avoid

Ordered by consequence severity. All CRITICAL pitfalls must be designed around in phase 1 before any feature code is written.

### CRIT-1: LinkedIn class name instability

LinkedIn CSS classes are compiler-generated and change without notice after any frontend deploy. An extension selecting posts with `.feed-shared-update-v2` may silently return empty NodeLists the following morning. The failure is invisible — no errors, just an empty NodeList.

**Prevention:** Build a selector registry as a single file from day one. Prefer `data-*` attribute selectors and semantic HTML (`article`, `[data-urn]`, `[aria-label]`) over class names. Add a health-check sentinel that warns the user in the popup if selectors return zero nodes on a page with visible posts. Include a `SELECTORS_VERSION` string for tracking breakage over time.

### CRIT-2: Service worker state loss

Chrome terminates the service worker after ~30 seconds of inactivity. Any in-memory JavaScript variables are destroyed. This is by design, not a bug. Extensions ported from MV2 that stored state in module-level variables silently lose all data every time the worker sleeps.

**Prevention:** Never store durable state in the service worker. Write everything to `chrome.storage.local` before the message handler returns. Re-hydrate from storage at the top of every handler. Use `chrome.alarms` (not `setTimeout`) for recurring work — alarms survive sleep/wake cycles.

### CRIT-3: SPA navigation breaking the observer

LinkedIn uses pushState navigation. The content script does not re-run on SPA route changes — the same script instance must survive navigating from the feed to a profile and back. The feed DOM is destroyed and recreated by React on each route change, potentially detaching the MutationObserver from live nodes.

**Prevention:** Observe at a stable high-level ancestor (`document.body` with `subtree: true`). Listen for `popstate` events or wrap `history.pushState` to dispatch a custom event. Re-initialise the observer with a 1-second delay after route changes to allow React to complete rendering.

### CRIT-4: Programmatic block triggering LinkedIn ToS violation

Simulating clicks on LinkedIn block UI sends API requests to LinkedIn servers from the user authenticated session. This is detectable and risks account suspension and Chrome Web Store rejection.

**Prevention:** Implement block as a deep link to `/overlay/report-or-block/` — the user completes the action manually in LinkedIn own UI. Lock this design in before building the popup action flow. Never automate any action that touches LinkedIn servers without an explicit per-action user gesture.

### HIGH-1: False positive cascade eroding user trust

Recruiters, non-native English writers, and motivational content creators all pattern-match to AI signals. If the extension hides a post from someone the user knows without any visible indication, trust is permanently lost. If too many posts are hidden, the user may conclude LinkedIn itself is broken.

**Prevention:** Default threshold 0.75+ (conservative). Always show a hidden-post count in the badge so users know filtering is active. Show per-signal breakdown in the popup. Provide a review queue with permanent dismiss. Never auto-confirm a block from heuristic score alone.

### MODERATE-1: MutationObserver performance tax

Observing `document.body` with synchronous scoring logic fires hundreds of times per second during LinkedIn feed scroll (React re-renders, lazy image loads, ad injections, notification badge updates).

**Prevention:** Filter mutations immediately in the callback — only process records where `addedNodes` contains an element with an article-like structure. Batch processing with `requestIdleCallback`. Never run `querySelectorAll` on the full document inside the observer callback. Use a `Set` to deduplicate already-processed post URNs.

---

## Key Unknowns (Must Verify Before Building)

These cannot be resolved from static research. Each requires hands-on LinkedIn DOM inspection in a live browser. Treat as a mandatory spike at the start of phase 1 before any selector-dependent code is written.

**1. Live feed post card structure**
What selector reliably identifies a feed post card? What `data-*` attributes are present? What is the stable ancestor to use as the MutationObserver target? What element should receive `.llb-hidden`?

*Action: Open LinkedIn, inspect a feed post in DevTools, document all `data-*` attributes on the card and its ancestors, identify the feed scroll container.*

**2. Profile signals available in the feed DOM**
Is the author headline queryable in the post card (not just as rendered text)? Is connection degree (1st/2nd/3rd) exposed as an attribute or text node? Is the "Promoted" label consistently marked with a specific attribute or aria-label? Is the "Open to Work" banner present in the post card?

*Action: Inspect the post card for a connection-degree indicator, a promoted label, and a headline element. Document exact selectors.*

**3. Comment and engagement data in DOM**
Are comment text nodes in the DOM on initial feed render, or only after expanding comments? What datetime attribute format do comment time elements use? Are reaction counts present as accessible text nodes on initial load?

*Action: Inspect a post with comments and reactions without clicking "Show comments". Document what is present vs. requires user interaction.*

**4. LinkedIn block deep link validity**
Verify that `linkedin.com/in/{slug}/overlay/report-or-block/` still resolves to a block/report modal in the current production build.

*Action: Navigate to the URL manually for a test account before building the popup block flow.*

**5. CSS hiding effect on infinite scroll**
After hiding several posts with `display: none !important`, does LinkedIn infinite scroll sentinel still trigger new post loading? If the sentinel element is inside a hidden post container, the feed stops loading new posts.

*Action: In phase 2, hide 5-10 posts and scroll to the bottom. Confirm new posts load.*

**6. LinkedIn ToS current wording on automated actions**
Read `linkedin.com/legal/user-agreement` Section 8 (User Obligations) to confirm the automated action prohibition before finalising the popup block action design.

*Action: Read the ToS before designing phase 5.*

---

## Phase Guidance

Build order is dictated by three constraints: (a) each phase must be independently testable in a live browser, (b) LinkedIn DOM uncertainty means selectors must be validated before logic is layered on top, and (c) the pluggable detector interface must be established before any scoring rules are written.

### Phase 1 — Foundation (DOM observation + selector registry)

**Rationale:** Everything else depends on reliably identifying post nodes. Validate this before writing any detection logic. All critical architectural decisions must also be locked in here.

**Deliverable:** Content script with a working MutationObserver that logs every post URN and author name to the console as the feed scrolls. No scoring, no hiding, no storage. Selector registry file created. Health-check sentinel wired up. Cross-context logging utility in place. Service worker state design and block action design confirmed.

**Pitfalls to avoid:** CRIT-1, CRIT-2, CRIT-3, CRIT-4, MODERATE-1 (observer performance pattern), cross-context logging infrastructure.

**Research flag: requires live LinkedIn DOM inspection before coding. Cannot be skipped.**

---

### Phase 2 — Detection Engine (scoring + hiding)

**Rationale:** Scoring logic is the most complex part and the most likely source of bugs. Isolate it from storage and UI. Prove scores are correct before anything gets hidden.

**Deliverable:** HeuristicDetector implementing the Detector interface with buzzword density, listicle structure, CTA phrase, em-dash frequency, and generic headline scoring. Sponsored/company/open-to-work exclusions. Threshold check with CSS hiding applied. Rule functions are pure TypeScript — unit-testable without a browser.

**Pitfalls to avoid:** CRIT-1 (data-attribute selectors), score only from feed card data (no profile navigation), default threshold 0.75+, CSS hiding on article element (test infinite scroll).

**Research flag: standard patterns apply. Scoring weight calibration requires live testing after implementation.**

---

### Phase 3 — Storage + Flagged Account Queue

**Rationale:** Once scoring is proven, persist the results. Storage schema design here locks in data shapes used by popup and future features.

**Deliverable:** storeFlaggedAccount() writing to chrome.storage.local. Per-account rolling score. Rotation policy capping queue at 500 entries. Schema version key. Verify state persists across page reloads in DevTools.

**Pitfalls to avoid:** Store only account-level data (never full post text); always await storage writes; separate settings key from account list key.

**Research flag: standard patterns.**

---

### Phase 4 — Popup (read-only first)

**Rationale:** Separate rendering from action handling. Catch rendering bugs before wiring user decisions.

**Deliverable:** Preact popup rendering flagged accounts sorted by peak score, showing per-account signal breakdown. chrome.storage.onChanged listener for live updates. Badge count showing pending accounts.

**Pitfalls to avoid:** Stateless popup design (every open is a full re-render from storage); show hidden post count; explain which signals fired per account.

**Research flag: standard Preact patterns.**

---

### Phase 5 — User Decisions (block + dismiss)

**Rationale:** The popup action flow is the most ToS-sensitive part. Design it last so the safe mechanism is validated before building.

**Deliverable:** Dismiss updates status in storage and unhides posts in active tab. Block opens LinkedIn deep link in a new tab. Service worker as message relay. Badge decrements after decisions.

**Pitfalls to avoid:** CRIT-4 (deep link only, never simulate block clicks); wrap sendMessage in try/catch; handle context invalidation.

**Research flag: verify key unknown #4 (deep link) before building block flow.**

---

### Phase 6 — Settings + Dashboard

**Rationale:** User configurability is needed to handle false positives gracefully. Dashboard is a PROJECT.md requirement.

**Deliverable:** Settings UI with threshold slider and enable/disable toggle. Content script reads threshold from storage at startup. Dashboard page showing percentage of posts flagged over user-selectable 7/30-day rolling windows, broken down by signal type.

**Research flag: standard patterns; no additional research needed.**

---

## Confidence Assessment

| Area | Confidence | Notes |
|---|---|---|
| Stack | HIGH | MV3 APIs are stable; Preact/Vite choices are well-established. vite-plugin-web-extension vs CRXJS recommendation is MEDIUM — verify maintenance status before committing. |
| Features | MEDIUM-HIGH | AI linguistic signals (em-dash, listicles, CTAs) are HIGH confidence. Scoring weight values are LOW — require empirical calibration against real LinkedIn data after phase 2. |
| Architecture | HIGH | MV3 component boundaries, MutationObserver patterns, CSS class hiding, storage schema, pluggable detector interface are all stable and well-documented. Block deep link is MEDIUM. |
| Pitfalls | HIGH | CRIT-1 through CRIT-4 are all well-established platform and ToS risks. LinkedIn-specific anti-scraping detection thresholds are MEDIUM. |

**Overall confidence: MEDIUM-HIGH.** The MV3 extension platform is well understood. The critical gap — LinkedIn actual DOM structure — is a deliberate unknown that must be addressed before any selector-dependent code is written.

### Gaps to address during execution

- **LinkedIn live DOM inspection** (phase 1 prerequisite): document post card structure, `data-*` attributes, feed container selector, profile signal availability, promoted label marking.
- **Scoring weight calibration** (phase 2 follow-up): starting weights are educated guesses; run the scorer against a sample of known-AI and known-human LinkedIn posts and adjust empirically.
- **LinkedIn ToS confirmation** (phase 5 prerequisite): read current Section 8 before finalising the block action design.
- **Infinite scroll CSS interaction** (phase 2 validation): test that hiding posts does not break LinkedIn scroll sentinel.

---

## Sources

All research drawn from training knowledge (cutoff August 2025). Web search and fetch tools were unavailable during the research session.

### HIGH confidence (stable specifications, long-standing platform behaviour)
- Chrome Extensions MV3 documentation — service worker lifecycle, isolated world model, storage APIs, message passing, permissions
- Web platform APIs — MutationObserver, History API/pushState, requestIdleCallback, CSS class manipulation
- Content filtering product design — false positive categories, trust erosion patterns, threshold design

### MEDIUM confidence (known as of mid-2025, may have evolved)
- LinkedIn frontend architecture — React SPA, pushState navigation, CSS module class instability, `data-urn` attribute presence
- vite-plugin-web-extension vs CRXJS current maintenance status
- LinkedIn block/report overlay URL pattern
- LinkedIn Terms of Service Section 8 (automated action prohibition)
- LinkedIn anti-scraping detection thresholds

### LOW confidence (requires live validation)
- Specific LinkedIn DOM selectors for feed posts, profile cards, comment timestamps, reaction counts
- AI detection scoring weight values (require empirical calibration)
- CSS hiding interaction with LinkedIn infinite scroll sentinel

---

*Research completed: 2026-05-25*
*Ready for roadmap: yes*
