/**
 * LinkedIn Blocker — MutationObserver + SPA Navigation Handler
 *
 * Exports a single entry point: startObserving(onPost).
 *
 * Internals:
 *   - waitForFeedContainer(): exponential-backoff retry for the feed container
 *   - attachObserver(): MutationObserver wired to the feed container
 *   - installSpaNavigationHandler(): pushState monkey-patch + popstate listener
 *   - reinit(): disconnect + clear + reattach on route change
 *
 * INFRA-04: All selector strings are imported from ./selectors.
 * This file must never contain 'data-urn', 'data-finite-scroll-hotkey-context',
 * or 'data-anonymize' as raw string literals.
 */

import {
  FEED_CONTAINER,
  FEED_CONTAINER_FALLBACK,
  POST_CARD,
  POST_URN_ATTR,
  POST_URN_ATTR_FALLBACK,
  POST_AUTHOR_NAME,
  SELECTORS_VERSION,
} from './selectors';

// ---------------------------------------------------------------------------
// Module-scope state
// ---------------------------------------------------------------------------

let currentObserver: MutationObserver | null = null;
const processedPosts = new Set<string>();
let storedOnPost: ((post: { urn: string; authorName: string }) => void) | null = null;
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
// attachObserver
// ---------------------------------------------------------------------------

function attachObserver(
  container: Element,
  onPost: (post: { urn: string; authorName: string }) => void
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
          processedPosts.add(urn);
          const authorName =
            card.querySelector(POST_AUTHOR_NAME)?.textContent?.trim() ??
            '<unknown>';
          onPost({ urn, authorName });
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
  onPost: (post: { urn: string; authorName: string }) => void
): void {
  storedOnPost = onPost;
  reinit();
  installSpaNavigationHandler(() => reinit());
}
