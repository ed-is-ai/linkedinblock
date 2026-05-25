# LinkedIn DOM Inspection — 2026-05-25
LinkedIn build (if visible): n/a

## Feed Container
Selector: main, div.core-rail, or div[data-finite-scroll-hotkey-context="FEED"]
Example outerHTML snippet (first 200 chars): <main id="main" class="scaffold-layout__main" aria-label="Main Feed" role="main"><div data-finite-scroll-hotkey-context="FEED" class="core-rail"><div><div class="scaffold-finite-scroll">


## Post Card
Selector: div[data-urn^="urn:li:activity:"], div[data-id^="urn:li:activity:"], or .feed-shared-update-v2
URN attribute: data-urn or data-id
Example URN value: urn:li:activity:7123456789012345678

## Post Author Name
Selector: span[data-anonymize="person-name"] or .update-components-actor__name span[dir="ltr"]
Text extraction method: textContent (specifically targeting the inner <span> with aria-hidden="true" or dir="ltr", as the parent often contains duplicate visually hidden text for screen readers)

## Sponsored / Promoted Marker
Selector: .update-components-actor__sub-description containing the text "Promoted", or elements within the post header containing [aria-label*="Promoted"] / [aria-label*="Sponsored"]

## Company Page Marker
Selector or URL pattern: Extract the href attribute from the author's profile link (.update-components-actor__meta-link or .update-components-actor__image-link). A company page URL will contain /company/ (e.g., https://www.linkedin.com/company/google/), whereas an individual's profile will contain /in/ (e.g., https://www.linkedin.com/in/username/).

## Notes / Anomalies