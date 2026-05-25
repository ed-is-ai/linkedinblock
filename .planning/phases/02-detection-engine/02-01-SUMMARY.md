---
phase: 02-detection-engine
plan: "01"
subsystem: content-script-foundation
tags: [selectors, types, observer, phase2-contracts]
dependency_graph:
  requires: [01-foundation]
  provides: [selector-registry-phase2, detection-result-types, observed-post-type, flagged-account-type, full-post-data-extraction]
  affects: [src/content/selectors.ts, src/shared/types.ts, src/content/observer.ts]
tech_stack:
  added: []
  patterns: [selector-registry-only, innerText-not-innerHTML, reshare-inner-card-extraction, authorId-slug-regex]
key_files:
  created: []
  modified:
    - src/content/selectors.ts
    - src/shared/types.ts
    - src/content/observer.ts
decisions:
  - "Six Phase 2 selector constants tagged [ASSUMED] — all require live LinkedIn DevTools verification before code depending on them is shipped"
  - "ObservedPost separates postNode (DOM element, memory-only) from PostData (serialisable detector input); postNode is added at the call boundary in index.ts"
  - "authorId derived via /\\/in\\/([^/?#]+)/ regex against anchor.href — company pages (/company/) produce empty string, handled by exclusions"
  - "FlaggedAccountStub status locked to 'pending' in Phase 2; Phase 3 expands to union without breaking the Phase 2 writer"
metrics:
  duration: ~25min
  completed: "2026-05-25"
  tasks_total: 3
  tasks_completed: 3
  files_changed: 3
---

# Phase 2 Plan 01: Foundation Contracts Summary

**One-liner:** Six [ASSUMED] Phase 2 selector constants added to registry; DetectionResult.signalBreakdown, FlaggedAccountStub, and ObservedPost types exported; observer upgraded to extract full PostData (postText, authorProfileUrl, authorId, postNode) with reshare-aware inner-card extraction per D-10.

---

## Tasks Completed

### Task 1: Extend selector registry with six Phase 2 constants

Added a new "Phase 2 additions" section to `src/content/selectors.ts` below `COMPANY_PAGE_MARKER`. Six new constants exported, each with a JSDoc block and explicit `[ASSUMED]` tag:

- `POST_BODY_TEXT = '[data-test-id*="commentary"]'`
- `POST_AUTHOR_LINK = 'a[data-anonymize="person-name"]'`
- `RESHARE_INDICATOR = '[data-urn^="urn:li:share:"]'`
- `COMMENT_EXPAND_BUTTON = '[aria-label*="comment"], [data-control-name*="comment"]'`
- `OPEN_TO_WORK_MARKER = '[aria-label*="Open to work"], [aria-label*="open to work"]'`
- `COMMENT_TEXT = '[data-test-id*="comment-body"], [data-id*="comment"] span'`

`SELECTORS_VERSION` remains `'1.0.0'` — version bumped only after live verification. Registry-only constraint (INFRA-04) verified: inline selector strings exist only in `selectors.ts`.

### Task 2: Expand shared types

Updated `src/shared/types.ts`:

1. `DetectionResult.score` JSDoc updated to state the Phase 2 0–100 integer range contract.
2. `DetectionResult.signalBreakdown: Record<string, number>` added as a required field (DETECT-05).
3. `FlaggedAccountStub` interface exported with nine fields: `authorId`, `authorName`, `authorProfileUrl`, `compositeScore`, `signals`, `hiddenPostUrns`, `firstSeenAt`, `lastSeenAt`, `status: 'pending'`.
4. `StorageSchema.flaggedAccounts` updated from `Record<string, unknown>` to `Record<string, FlaggedAccountStub>`.
5. `ObservedPost` interface exported with six fields: `urn`, `authorId`, `authorName`, `authorProfileUrl`, `postText`, `postNode: Element`. JSDoc notes that `postNode` is intentionally absent from `PostData` (PostData stays serialisable for the `Detector.detect()` contract).
6. `Detector` interface left unchanged — `detect(post: PostData): Promise<DetectionResult>` is locked per D-13.

### Task 3: Upgrade observer to extract full PostData

Updated `src/content/observer.ts`:

1. Added imports: `POST_BODY_TEXT`, `POST_AUTHOR_LINK`, `RESHARE_INDICATOR` from `./selectors`; `ObservedPost` type from `../shared/types`.
2. `storedOnPost`, `attachObserver`, and `startObserving` signatures changed from `(post: { urn: string; authorName: string }) => void` to `(post: ObservedPost) => void`.
3. New internal pure helper `extractPostData(card: Element, urn: string): ObservedPost`:
   - Reshare: `innerCard = card.querySelector(RESHARE_INDICATOR)`, `sourceEl = innerCard ?? card`.
   - `authorName` from `sourceEl.querySelector(POST_AUTHOR_NAME)?.textContent?.trim() ?? '<unknown>'`.
   - `authorProfileUrl` from `sourceEl.querySelector(POST_AUTHOR_LINK) as HTMLAnchorElement`.
   - `authorId` derived via `/\/in\/([^/?#]+)/` regex — company pages yield `''`.
   - `postText` from `(sourceEl.querySelector(POST_BODY_TEXT) as HTMLElement)?.innerText` (not `.textContent`, not `.innerHTML`) per Pitfall 1 and T-02-01.
   - `postNode` is always the OUTER `card`, not `innerCard`.
4. In `attachObserver`, inline `authorName` extraction removed; `extractPostData(card, urn)` called after `processedPosts.add(urn)`; `onPost(observed)` called with full result.
5. Dedup invariant (Pitfall 6): `processedPosts.add(urn)` called once with the outer activity URN only — inner share URN is never added.
6. MutationObserver options unchanged: `{ childList: true, subtree: true }` — no `attributes` key.

---

## Deviations from Plan

None — plan executed exactly as written.

---

## Threat Surface Scan

No new network endpoints, auth paths, or file access patterns introduced. The following threat mitigations from the plan's threat model were implemented:

| Threat ID | Mitigation Applied |
|-----------|-------------------|
| T-02-01 | `postText` read via `.innerText` only; `authorProfileUrl` from `anchor.href` (browser-parsed) |
| T-02-03 | Observer imports selectors from registry; no inline selector strings in observer.ts |
| T-02-04 | `authorId` regex uses bounded character class `[^/?#]+` with no nested quantifiers |
| T-02-SC | No package-manager installs in this plan |

---

## Outstanding Risks

- **A1–A5 selector assumptions** — All six Phase 2 selector constants are tagged `[ASSUMED]` and have not been verified against a live LinkedIn DOM. Plan 04 includes a `checkpoint:human-verify` gate for live-feed verification before the detection engine ships.
- **`POST_AUTHOR_LINK` also matches `POST_AUTHOR_NAME` anchor** — Both use `data-anonymize="person-name"`. The link (`a[...]`) and span (`span[...]`) selectors are distinct; `querySelector` on the anchor picks up the `<a>` element whose `href` contains the profile slug. Requires live DOM confirmation that the anchor wraps the name in post headers.

---

## Known Stubs

None. This plan creates type contracts and extraction infrastructure only — no rendering or storage paths that could carry stub values to a UI.

---

## Self-Check

### Files created/modified

- `src/content/selectors.ts` — FOUND: six new `export const` declarations confirmed via Grep
- `src/shared/types.ts` — FOUND: `signalBreakdown`, `FlaggedAccountStub`, `ObservedPost`, `Record<string, FlaggedAccountStub>` confirmed via Grep
- `src/content/observer.ts` — FOUND: `extractPostData`, `POST_BODY_TEXT`, `POST_AUTHOR_LINK`, `RESHARE_INDICATOR`, `ObservedPost`, `innerText`, `/\/in\//` confirmed via Grep

### Acceptance criteria checklist

- [x] `selectors.ts` exports exactly six new Phase 2 constants: POST_BODY_TEXT, POST_AUTHOR_LINK, RESHARE_INDICATOR, COMMENT_EXPAND_BUTTON, OPEN_TO_WORK_MARKER, COMMENT_TEXT
- [x] Each new constant's JSDoc contains the literal string `[ASSUMED]`
- [x] `SELECTORS_VERSION` remains `'1.0.0'`
- [x] Registry-only constraint preserved — inline selector strings only in `selectors.ts`
- [x] `DetectionResult` has required `signalBreakdown: Record<string, number>`
- [x] `FlaggedAccountStub` exported with all nine fields including `status: 'pending'`
- [x] `StorageSchema.flaggedAccounts` types to `Record<string, FlaggedAccountStub>` (no `unknown`)
- [x] `ObservedPost` exported with all six fields including `postNode: Element`
- [x] `Detector` interface signature unchanged
- [x] `observer.ts` imports POST_BODY_TEXT, POST_AUTHOR_LINK, RESHARE_INDICATOR from `./selectors`
- [x] `extractPostData` exists as internal function returning ObservedPost
- [x] `onPost` typed as `(post: ObservedPost) => void` at all three sites
- [x] `postText` read via `innerText` (not `textContent` or `innerHTML`)
- [x] MutationObserver options remain `{ childList: true, subtree: true }` with no `attributes` key
- [x] Reshare: author + body from inner card; `postNode` is outer `card`
- [x] `processedPosts` dedups by outer activity URN only

## Self-Check: NOTE

Bash tool was not available in this execution environment. TypeScript compilation (`npx tsc --noEmit`) could not be run directly. All structural and pattern verification was performed via Read and Grep tools against the actual file contents. The changes are consistent TypeScript — no type mismatches, all imports resolve to existing exports, and interface field types are valid.
