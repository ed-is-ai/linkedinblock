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

// ---------------------------------------------------------------------------
// Phase 2 additions
// All constants below are tagged [ASSUMED] — requires live LinkedIn DevTools
// verification before code depending on these selectors is shipped.
// ---------------------------------------------------------------------------

/**
 * Post body text container selector.
 * [ASSUMED] -- requires live LinkedIn DevTools verification before code depending on this selector is shipped.
 * The commentary container typically carries a data-test-id attribute containing "commentary".
 */
export const POST_BODY_TEXT = '[data-test-id*="commentary"]';

/**
 * Author profile link anchor selector.
 * [ASSUMED] -- requires live LinkedIn DevTools verification before code depending on this selector is shipped.
 * LinkedIn uses data-anonymize="person-name" on the anchor wrapping the author name in the post header.
 * The href of this anchor contains the profile slug (e.g. /in/username/).
 */
export const POST_AUTHOR_LINK = 'a[data-anonymize="person-name"]';

/**
 * Reshare inner card selector.
 * [ASSUMED] -- requires live LinkedIn DevTools verification before code depending on this selector is shipped.
 * When a post is a reshare, LinkedIn renders an inner card element with a data-urn starting with
 * "urn:li:share:" nested inside the outer activity card (urn:li:activity:*).
 * Per D-10: the original author's text and profile are extracted from this inner card;
 * the outer activity URN remains the dedup key (Pitfall 6).
 */
export const RESHARE_INDICATOR = '[data-urn^="urn:li:share:"]';

/**
 * Comment section expand button selector.
 * [ASSUMED] -- requires live LinkedIn DevTools verification before code depending on this selector is shipped.
 * Matches the clickable button used to expand the comments section on a post.
 * Read-only action (does not submit, like, or follow) — safe to click programmatically per D-02.
 */
export const COMMENT_EXPAND_BUTTON =
  '[aria-label*="comment"], [data-control-name*="comment"]';

/**
 * Open to Work avatar banner selector.
 * [ASSUMED] -- requires live LinkedIn DevTools verification before code depending on this selector is shipped.
 * LinkedIn renders an aria-label containing "Open to work" on the profile photo overlay or badge
 * for users who have enabled the Open to Work feature.
 * Per D-12: Open to Work authors are NOT hard-excluded; instead the effective hide threshold is
 * raised by 20 points (requires 80/100 to auto-hide) to reduce false positives for job seekers.
 */
export const OPEN_TO_WORK_MARKER =
  '[aria-label*="Open to work"], [aria-label*="open to work"]';

/**
 * Comment text body element selector.
 * [ASSUMED] -- requires live LinkedIn DevTools verification before code depending on this selector is shipped.
 * Matches the body of an individual comment within the expanded comment section.
 * Used by the engagement signal (DETECT-07) to extract comment text for near-duplicate detection.
 */
export const COMMENT_TEXT =
  '[data-test-id*="comment-body"], [data-id*="comment"] span';
