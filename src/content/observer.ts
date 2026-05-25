/**
 * LinkedIn Blocker — MutationObserver + SPA Navigation Handler
 *
 * Exports a single entry point: startObserving(onPost).
 *
 * Internals:
 *   - waitForFeedContainer(): exponential-backoff retry for the feed container
 *   - extractPostData(): pure helper to extract full ObservedPost from a card element
 *   - attachObserver(): MutationObserver wired to the feed container
 *   - installSpaNavigationHandler(): pushState monkey-patch + popstate listener
 *   - reinit(): disconnect + clear + reattach on route change
 *
 * INFRA-04: All selector strings are imported from ./selectors.
 * This file must never contain 'data-urn', 'data-finite-scroll-hotkey-context',
 * 'data-anonymize', or any other LinkedIn selector string as raw string literals.
 * Phase 2 additions: POST_BODY_TEXT and POST_AUTHOR_LINK are imported for full
 * PostData extraction; RESHARE_INDICATOR is imported for reshare-aware author/body
 * extraction per D-10.
 */

import {
  FEED_CONTAINER,
  FEED_CONTAINER_FALLBACK,
  POST_CARD,
  POST_URN_ATTR,
  POST_URN_ATTR_FALLBACK,
  POST_AUTHOR_NAME,
  POST_BODY_TEXT,
  POST_AUTHOR_LINK,
  RESHARE_INDICATOR,
  SELECTORS_VERSION,
} from './selectors';
import type { ObservedPost } from '../shared/types';

// ---------------------------------------------------------------------------
// Module-scope state
// ---------------------------------------------------------------------------

let currentObserver: MutationObserver | null = null;
const processedPosts = new Set<string>();
let storedOnPost: ((post: ObservedPost) => void) | null = null;
let lastUrl = location.href;

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const MAX_RETRIES = 10;
const BASE_DELAY_MS = 500;

// ---------------------------------------------------------------------------
// waitForFeedContainer
// ---------------------------------------------------------------------------

async function waitForFeedContainer(): Promise<Element | null> {
  for (let attempt = 0; attempt < MAX_RETRIES; attempt++) {
    const el =
      document.querySelector(FEED_CONTAINER) ??
      document.querySelector(FEED_CONTAINER_FALLBACK);
    if (el) return el;
    await new Promise<void>((resolve) =>
      setTimeout(resolve, BASE_DELAY_MS * Math.min(attempt + 1, 4))
    );
  }
  console.warn('[LLB] Feed container not found after retries.', {
    selectorsVersion: SELECTORS_VERSION,
    url: location.href,
  });
  return null;
}

// ---------------------------------------------------------------------------
// extractPostData
// ---------------------------------------------------------------------------

/**
 * Pure helper: extracts a full ObservedPost from a post card element and its outer URN.
 *
 * Reshare handling (D-10 + Pitfall 6):
 *   - When RESHARE_INDICATOR is present as an inner card, the original author's name,
 *     profile link, and post body are read from that inner card.
 *   - The outer `card` element is always returned as `postNode` — it is what receives
 *     `.llb-hidden` and has the tombstone injected before it.
 *   - The outer activity URN is the dedup key; the inner share URN is never added to
 *     processedPosts (Pitfall 6 invariant preserved in attachObserver).
 *
 * Security (T-02-01): postText is read via `.innerText` (not `.innerHTML`) to avoid
 * any XSS risk from LinkedIn-controlled post content entering the content script as HTML.
 */
function extractPostData(card: Element, urn: string): ObservedPost {
  // Reshare detection: if an inner card with urn:li:share:* is present, read author
  // and body from it (original post); otherwise read from the outer card itself.
  const innerCard = card.querySelector(RESHARE_INDICATOR);
  const sourceEl = innerCard ?? card;

  // Author name — fall back to '<unknown>' per D-09 (tombstone copy depends on it)
  const authorName =
    sourceEl.querySelector(POST_AUTHOR_NAME)?.textContent?.trim() ?? '<unknown>';

  // Author profile URL from the anchor href — browser-parsed, not innerHTML (T-02-01)
  const authorAnchor = sourceEl.querySelector(POST_AUTHOR_LINK) as HTMLAnchorElement | null;
  const authorProfileUrl = authorAnchor?.href ?? '';

  // Derive authorId from the /in/<slug>/ portion of the profile URL.
  // Company pages (/company/) and profiles without a slug produce '' and will be
  // filtered later by the company-page exclusion in content/exclusions.ts.
  // ReDoS safety (T-02-04): bounded character class [^/?#]+ with no nested quantifiers.
  const slugMatch = /\/in\/([^/?#]+)/.exec(authorProfileUrl);
  const authorId = slugMatch?.[1] ?? '';

  // Post body text — use innerText (not textContent or innerHTML) per Pitfall 1 so
  // that "See more" expanded content is captured and HTML tags are not included.
  const bodyEl = sourceEl.querySelector(POST_BODY_TEXT) as HTMLElement | null;
  const postText = bodyEl?.innerText?.trimEnd() ?? '';

  // postNode is always the OUTER card — it is the element that gets hidden and has
  // the tombstone inserted before it.
  return { urn, authorId, authorName, authorProfileUrl, postText, postNode: card };
}

// ---------------------------------------------------------------------------
// attachObserver
// ---------------------------------------------------------------------------

function attachObserver(
  container: Element,
  onPost: (post: ObservedPost) => void
): MutationObserver {
  const observer = new MutationObserver((mutations) => {
    for (const mutation of mutations) {
      if (mutation.type !== 'childList') continue;
      for (const node of mutation.addedNodes) {
        if (node.nodeType !== Node.ELEMENT_NODE) continue;
        const el = node as Element;
        const postCards: Element[] = el.matches(POST_CARD)
          ? [el]
          : Array.from(el.querySelectorAll(POST_CARD));
        for (const card of postCards) {
          let urn = card.getAttribute(POST_URN_ATTR);
          // Fallback: try data-id when data-urn is absent
          if (!urn) {
            urn = card.getAttribute(POST_URN_ATTR_FALLBACK);
          }
          if (!urn || processedPosts.has(urn)) continue;
          // Only the OUTER activity URN is added to processedPosts.
          // The inner share URN (urn:li:share:*) is NOT added — Pitfall 6 invariant.
          processedPosts.add(urn);
          const observed = extractPostData(card, urn);
          onPost(observed);
        }
      }
    }
  });

  observer.observe(container, { childList: true, subtree: true });
  return observer;
}

// ---------------------------------------------------------------------------
// installSpaNavigationHandler
// ---------------------------------------------------------------------------

function installSpaNavigationHandler(reinit: () => void): void {
  // Catch back / forward navigation
  window.addEventListener('popstate', () => {
    if (location.href !== lastUrl) {
      lastUrl = location.href;
      setTimeout(reinit, 1000);
    }
  });

  // Catch programmatic pushState navigation (LinkedIn's primary nav method)
  const originalPushState = history.pushState.bind(history);
  history.pushState = function (...args: Parameters<typeof history.pushState>) {
    originalPushState(...args);
    if (location.href !== lastUrl) {
      lastUrl = location.href;
      setTimeout(reinit, 1000);
    }
  };
}

// ---------------------------------------------------------------------------
// reinit
// ---------------------------------------------------------------------------

async function reinit(): Promise<void> {
  if (currentObserver) {
    currentObserver.disconnect();
    currentObserver = null;
  }
  processedPosts.clear();

  const container = await waitForFeedContainer();
  if (container && storedOnPost) {
    currentObserver = attachObserver(container, storedOnPost);
  }
}

// ---------------------------------------------------------------------------
// startObserving (public API)
// ---------------------------------------------------------------------------

export function startObserving(
  onPost: (post: ObservedPost) => void
): void {
  storedOnPost = onPost;
  reinit();
  installSpaNavigationHandler(() => reinit());
}
