/**
 * LinkedIn Blocker — Selector Registry
 *
 * !! THIS IS THE ONLY FILE IN THE PROJECT THAT MAY CONTAIN LINKEDIN DOM SELECTORS !!
 *
 * Per INFRA-04 and CLAUDE.md critical constraint #1:
 *   - All LinkedIn DOM selectors are defined here and ONLY here.
 *   - Changing one constant in this file is sufficient to fix any selector breakage site-wide.
 *   - No other file in the project may contain a LinkedIn selector string.
 *
 * Inspection date: 2026-05-25 (see .planning/phases/01-foundation/DOM-INSPECTION.md)
 *
 * Selector value rules:
 *   - Values MUST use data-* attributes, aria-* attributes, role attributes, or semantic elements.
 *   - CSS class names (e.g. .some-class) are FORBIDDEN — LinkedIn rebuilds class names on every deploy.
 *   - URL patterns (strings passed to .includes() / .contains()) are allowed for href-based checks.
 */

/** Version of the selector registry. Increment when a verified change is made. */
export const SELECTORS_VERSION = '1.0.0';

// ---------------------------------------------------------------------------
// Feed container
// ---------------------------------------------------------------------------

/**
 * Primary feed container selector.
 * Verified: div[data-finite-scroll-hotkey-context="FEED"] wraps the infinite-scroll feed.
 */
export const FEED_CONTAINER = 'div[data-finite-scroll-hotkey-context="FEED"]';

/**
 * Fallback feed container selector.
 * The <main> element is a stable semantic fallback when the primary attribute is absent.
 */
export const FEED_CONTAINER_FALLBACK = 'main';

// ---------------------------------------------------------------------------
// Post card
// ---------------------------------------------------------------------------

/**
 * Post card root element selector.
 * Verified: post cards carry data-urn or data-id starting with "urn:li:activity:".
 * The selector matches both attribute variants to maximise compatibility.
 */
export const POST_CARD =
  'div[data-urn^="urn:li:activity:"], div[data-id^="urn:li:activity:"]';

/**
 * The attribute name that holds the post URN on the post card element.
 * Used with element.getAttribute(POST_URN_ATTR).
 */
export const POST_URN_ATTR = 'data-urn';

/**
 * Fallback URN attribute name used when data-urn is absent.
 * Both data-urn and data-id were observed on live LinkedIn post cards (DOM-INSPECTION.md).
 */
export const POST_URN_ATTR_FALLBACK = 'data-id';

// ---------------------------------------------------------------------------
// Author
// ---------------------------------------------------------------------------

/**
 * Author display name element selector.
 * Verified: LinkedIn uses data-anonymize="person-name" on the author name span.
 * Extract text content from the inner span with dir="ltr" to avoid duplicate
 * visually-hidden text from screen reader siblings.
 */
export const POST_AUTHOR_NAME = 'span[data-anonymize="person-name"]';

// ---------------------------------------------------------------------------
// Exclusion markers
// ---------------------------------------------------------------------------

/**
 * Sponsored / Promoted post marker selector.
 * Verified: sponsored posts include an element with aria-label containing "Promoted"
 * or "Sponsored". This attribute-based check survives CSS class renames.
 * Content scripts may also check the text content of sub-description elements for
 * the string "Promoted" as a belt-and-suspenders fallback.
 */
export const SPONSORED_MARKER = '[aria-label*="Promoted"], [aria-label*="Sponsored"]';

/**
 * Company page author URL pattern.
 * Verified: company page profile URLs contain /company/ (e.g. linkedin.com/company/google/).
 * Individual profiles use /in/ (e.g. linkedin.com/in/username/).
 * Use with authorProfileUrl.includes(COMPANY_PAGE_MARKER) in content script logic.
 */
export const COMPANY_PAGE_MARKER = '/company/';
