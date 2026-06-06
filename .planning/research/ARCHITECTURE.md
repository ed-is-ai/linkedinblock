# ARCHITECTURE Research — v7.0 Adaptive DOM Scraper

**Milestone:** v7.0 — Adaptive DOM Scraper
**Researched:** 2026-06-06
**Confidence:** HIGH for integration/constraint reconciliation; MEDIUM for heuristic vocabulary + DOM-sanitisation completeness (need live DOM).

## Constraint #1 Reconciliation (CLAUDE.md)

The change is **additive, not a violation**:

- `selectors.ts` remains the **only file** that may contain hard-coded LinkedIn selector strings (unchanged).
- At runtime, all selector consumption routes through a new `SelectorRegistry` module — direct `selectors.ts` imports in `observer.ts`/`exclusions.ts` are replaced with `selectorRegistry.resolve('TARGET')`.
- Only `SelectorRegistry.seedIfNeeded()` writes selector strings into storage — a NEW extension of the constraint.

**Updated wording for v7.0:** *All hard-coded LinkedIn selector strings live in `selectors.ts` and only there. At runtime the content script reads selectors exclusively through `SelectorRegistry`, which hydrates from `chrome.storage.local` and falls back to the `selectors.ts` seed. Only `SelectorRegistry` may write selector strings to storage.*

## Candidate Registry Schema (key `selectorRegistry`)

```typescript
type SelectorTarget =
  | 'FEED_CONTAINER' | 'FEED_CONTAINER_FALLBACK' | 'POST_CARD' | 'POST_URN_ATTR'
  | 'POST_BODY_TEXT' | 'POST_AUTHOR_NAME' | 'POST_AUTHOR_LINK'
  | 'SPONSORED_MARKER' | 'COMPANY_PAGE_MARKER' | 'RESHARE_INDICATOR'
  | 'COMMENT_EXPAND_BUTTON' | 'OPEN_TO_WORK_MARKER' | 'COMMENT_TEXT'
  | 'AUTHOR_HEADLINE' | 'CONNECTION_DEGREE';
type CandidateSource = 'seed' | 'heuristic' | 'llm' | 'user';
interface SelectorCandidate { value: string; source: CandidateSource; lastVerified: string|null; addedAt: string; failCount: number; }
interface TargetEntry { candidates: SelectorCandidate[]; }   // index 0 = active
interface SelectorRegistrySchema { version: string; targets: Record<SelectorTarget, TargetEntry>; lastAdaptedAt: string|null; }
```

Ordered list (not a map) — index 0 is active; prepend a new winner and all consumers use it. `failCount` per candidate. `version` mirrors `SELECTORS_VERSION` and triggers re-seed. ~15 targets × 5 × ~200B ≈ 15 KB.

## New vs Modified Components

**New:**
| Component | File | Responsibility |
|---|---|---|
| `SelectorRegistry` | `src/content/selector-registry.ts` | In-memory cache over storage; **sync** `resolve(target)`; seeding + migration; singleton |
| `BreakageDetector` | `src/content/adapter/breakage-detector.ts` | Counts mutations vs matches; emits `breakage` when feed active but zero post-cards |
| `HeuristicRederiver` | `src/content/adapter/heuristic-rederiver.ts` | Tries a stable-attribute vocabulary per target; validates via `querySelector` + cardinality |
| `LLMRederiver` | `src/content/adapter/llm-rederiver.ts` | Sanitised DOM sample → Anthropic → ranked candidates; reuses existing auth |
| `AdaptiveAdapter` | `src/content/adapter/index.ts` | Orchestrates detector → heuristic → LLM; writes winner via `updateCandidate()` |
| `SelectorView` | `src/popup/SelectorView.tsx` | Read-only panel: active selector, source badge, lastVerified; surfaces breakage alert |

**Modified:** `types.ts` (+`selectorRegistry`, `selectorBreakageAlert`); `content/index.ts` (`seedIfNeeded()`+`load()` before `startObserving()`; `adaptiveAdapter.start()` in W2); `observer.ts` (imports → `resolve()`; 2 detector instrumentation calls); `exclusions.ts` (imports → `resolve()`); `popup/App.tsx` (+SelectorView panel). **Unchanged:** `selectors.ts` (comment header only), `heuristic.ts`, `llm.ts`, `queue.ts`, `postStore.ts`, signals, `storage.ts`, `manifest.json`.

## SelectorRegistry — the key integration module

`resolve(target)` is **synchronous** (called from the observer hot path). Safe because `load()` is awaited in `init()` **before** `startObserving()`, warming the cache; if called pre-load, `resolve()` falls back to the `selectors.ts` seed constant (no crash). A `chrome.storage.onChanged` listener keeps the cache fresh when the adapter writes a winner — observer picks it up on the next mutation. **Migration is additive:** new targets added from seed; existing healed candidates preserved; seed appended as last-resort fallback (not prepended); version bumped.

## ⚠ LLM call location — UNRESOLVED conflict

This pass concluded the LLM call belongs in the **content script** (claims `llm.ts` already fetches `api.anthropic.com` directly + host_permissions covers it; routing via SW adds wake/latency for no benefit). **The Stack pass disagreed** (CORS from `linkedin.com` forces the call into the service worker). **Resolve by reading the actual `src/content/detector/llm.ts` and `src/background/index.ts` during Wave 2 planning** and reusing whatever pattern already works. Either way: per-target single-attempt latch + mandatory DOM sanitisation before any call.

## HeuristicRederiver vocabulary (sample, needs live verification)

| Target | Candidates (in order) |
|---|---|
| FEED_CONTAINER | `[data-component-type="LazyColumn"]`, `[data-component-type]`, `[data-finite-scroll-hotkey-context]`, `main` |
| POST_CARD | `div[componentkey]`, `div[data-urn]`, `div[data-id]`, `article` |
| POST_BODY_TEXT | `span[data-testid="expandable-text-box"]`, `div[dir="ltr"]`, `span[dir="ltr"]` |
| POST_AUTHOR_LINK | `a[href*="/in/"]:has(strong)`, `a[href*="/in/"]` |
| SPONSORED_MARKER | `[aria-label*="Promoted"]`, `[aria-label*="Sponsored"]` |

## Build Order

**Wave 1 (independently shippable, zero behavior change):** types → `SelectorRegistry` + unit tests → wire `seedIfNeeded()`/`load()` into `init()` → migrate `observer.ts` one selector at a time (start `POST_BODY_TEXT`, regression-test each) → migrate `exclusions.ts` → build `SelectorView`. **Gate:** behaves identically to v6.1, all tests pass.

**Wave 2 (needs W1):** `BreakageDetector` + tests → `HeuristicRederiver` + fixture tests → wire `AdaptiveAdapter` heuristic-only → `LLMRederiver` (test sanitisation separately; live-key integration test is **manual, not CI**) → wire LLM fallback → `selectorBreakageAlert` write + SelectorView render.

## Roadmap Implications

- Wave 1 = standalone phase, no user-visible change, proves the storage foundation.
- Wave 2 = 4–5 discrete components with clean seams (each a separate plan).
- LLM live-key integration test must be flagged manual.
- DOM-sanitisation review is a named deliverable, not an implicit assumption.
- Open: exact PII-bearing attributes (live DOM); `failCount` auto-demote policy; whether SelectorView is dev-gated or always shown.
