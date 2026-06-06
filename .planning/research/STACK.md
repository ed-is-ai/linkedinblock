# STACK Research — v7.0 Adaptive DOM Scraper

**Milestone:** v7.0 — Adaptive DOM Scraper
**Researched:** 2026-06-06
**Mode:** Ecosystem / feasibility (stack additions only)
**Confidence:** HIGH — grounded in direct inspection of the existing codebase.

## Headline

**No new runtime dependencies are required.** Every v7.0 capability can be built with hand-rolled TypeScript reusing existing infrastructure (Anthropic client, `chrome.storage.local` wrappers, MutationObserver loop, vitest fixtures). The existing `fast-levenshtein` dep is available for attribute-name fuzzy matching if needed.

## Key Findings

1. **Candidate registry = one new versioned `selectorRegistry` key** in `StorageSchema`. Each slot is a rank-ordered array of `SelectorCandidate`. Seed from `selectors.ts` defaults when the key is absent or `version` is stale.
2. **LLM structured output = existing "JSON-only system prompt + inline type guard" pattern** (already proven by the `SCORE_POST` handler). No Zod / JSON-schema library.
3. **Breakage detection = an integer counter** in the MutationObserver callback (consecutive feed mutations yielding zero post-card matches ≥ threshold). No timer/polling library.
4. **DOM structural scorer = hand-rolled (~60 lines).** No browser-compatible adaptive-locator library exists (Playwright/Puppeteer are Node-only; dom-diff libs solve a different problem).
5. **⚠ OPEN CONFLICT — where does the LLM `fetch` live?** The Stack pass argued **service worker** (content scripts on `linkedin.com` can't fetch `api.anthropic.com` due to CORS). The Architecture + Features passes argued **content script** (claiming the existing `LLMDetector`/`llm.ts` already fetches Anthropic directly with `anthropic-dangerous-direct-browser-access` + host_permissions). **This must be resolved by reading the actual `src/content/detector/llm.ts` + `src/background/index.ts` before Wave 2 planning.** Whichever the existing code already does is the answer — reuse it.

## Recommended New Modules (all hand-rolled, zero deps)

- `heuristic-scorer.ts` (~60 lines) — score candidate elements on: direct child of feed container; contains `[href*="/in/"]`; contains a text block ≥ ~50 chars; has a UUID/URN-ish stable id attribute; not under an `[aria-label*="Promoted"/"Sponsored"]` ancestor. Highest scorer among feed-container children wins.
- DOM sanitiser (~15 lines) — clone subtree, blank all text nodes (PII) and `href`/`src`/`aria-label` values, preserve structure/attributes, cap to ~6–8k chars before sending to the LLM.
- LLM response type guard (~10 lines, inline).

## Storage Shape (proposed, `src/shared/types.ts`)

```typescript
interface SelectorCandidate {
  value: string;                 // selector string or attribute name
  source: 'default' | 'heuristic' | 'llm';
  lastMatchedAt: number | null;
  lastVerifiedAt: number | null;
  matchCount: number;
}
interface SelectorRegistry {
  version: number;               // bump → re-seed
  lastValidatedAt: number | null;
  candidates: Record<SelectorTarget, SelectorCandidate[]>;
}
```

- **Seeding:** `ensureRegistry()` at content-script `init()` — write defaults if key absent or `version < REGISTRY_VERSION`. Seed runs EXACTLY once (absent key) — never on every load (would wipe healed candidates).
- **Ranking:** array index = rank (index 0 tried first). On a successful match from index > 0, rotate winner to front and persist.
- **Size:** ~5–15 KB typical — negligible vs the 10 MB limit. Inline version branch; no migration library.
- **Use `chrome.storage.local`, NOT `.sync`** — candidates are derived from the user's live local feed, not cross-device portable.

## Consolidated Stack Table

| Component | Tech | Change |
|-----------|------|--------|
| Manifest / content script / popup / build / tests | MV3, TS, Preact, Vite+plugin, vitest+jsdom | Unchanged |
| Storage | chrome.storage.local | **Extended:** add `selectorRegistry` key |
| LLM client | existing Anthropic client (`llm.ts`) | **Extended:** add a selector-derivation call/message |
| Anthropic model | claude-sonnet-4-6 via REST | Unchanged |
| Host permissions | `https://api.anthropic.com/*` | Unchanged (already present) |
| String similarity | fast-levenshtein 3.x | **Reuse** (already in package.json) |
| Heuristic scorer / DOM sanitiser / LLM guard | hand-rolled TS | **New** (~60 / ~15 / ~10 lines) |

## What NOT to Add

Zod/AJV (overkill for one validation site) · Playwright/Puppeteer locators (Node-only) · tree-edit-distance/dom-diff libs (no browser build) · XPath libs (no advantage over CSS attr selectors) · storage ORMs · streaming/SSE · `chrome.storage.sync` for the registry.

## Open Questions

- **LLM call location** (service worker vs content script) — resolve from existing code.
- `BREAKAGE_THRESHOLD` value — tune against LinkedIn's scroll mutation frequency.
- DOM-sample root when breakage fires — prefer last-known feed container, fall back to `document.body`.
- Heuristic confidence threshold before escalating to the LLM — calibrate against fixtures.
