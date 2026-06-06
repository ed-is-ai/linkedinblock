# Phase 22: Externalize Selectors to Storage — Research

**Researched:** 2026-06-07
**Domain:** Chrome MV3 extension — storage-backed selector registry, Preact dashboard UI
**Confidence:** HIGH — all findings grounded directly in the codebase and locked CONTEXT.md decisions.

---

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions

**D-01:** The read-only selector health view lives in the **dashboard** (`src/dashboard/`), always visible — not in the popup.

**D-02:** Health view lists, per target: active selector value, source badge (`seed` / `heuristic` / `llm` — only `seed` in Phase 22), and last-matched / last-verified info.

**D-03:** Warning model is **session-miss based**:
- Feed-essential targets → red warning: `FEED_CONTAINER`, `POST_CARD`, `POST_AUTHOR_LINK`, `POST_BODY_TEXT`
- Contextual/optional targets → neutral grey (no alarm): comments, `AUTHOR_HEADLINE`, `CONNECTION_DEGREE`, `RESHARE_INDICATOR`, `SPONSORED_MARKER`, etc.

**D-04:** Session-miss warning is **distinct from the 30-day TTL**. Both coexist.

**D-05:** Reset uses an **inline confirm step** reusing `BatchBlockBar` pattern — click "Reset to defaults" → confirm strip → commit.

**D-06:** Reset restores **all** entries to `selectors.ts` seed (all-or-nothing). Health view reflects reset immediately via `onChanged`.

**D-07:** Migrate **all four runtime selector consumers**: `observer.ts`, `exclusions.ts`, `detector/comment-expand.ts`, `detector/signals/profile.ts`. Leave `SELECTORS_VERSION` import in `index.ts` as-is (metadata, not a DOM selector).

**D-08:** SELECTOR-10 doc updates are in scope: update CLAUDE.md constraint #1 wording and `selectors.ts` header comment to the seed-vs-runtime model.

### Claude's Discretion

- Source-badge label strings, exact health-table layout/styling, candidate-list cap (≤10) enforcement mechanics.
- Cross-tab `onChanged` test approach.
- Whether `POST_URN_ATTR` / `POST_AUTHOR_NAME` / `FEED_CONTAINER_FALLBACK` / `COMPANY_PAGE_MARKER` (attribute-name and URL-pattern "selectors") are modeled as registry targets or kept as seed constants. Schema must accommodate both selector strings and attribute-name/URL-pattern values.

### Deferred Ideas (OUT OF SCOPE)

- Manual selector editing / override UI
- Per-selector reset
- Breakage event log in health view
- Auto-promotion after N consecutive matches
- All self-healing (Phase 23 only)
</user_constraints>

---

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|------------------|
| SELECTOR-01 | Selector-registry entries stored in `chrome.storage.local` as rank-ordered candidate lists with metadata (`value`, `source`, `lastMatchedAt`, `lastVerifiedAt`, `matchCount`), seeded from `selectors.ts` defaults | Schema defined in ARCHITECTURE.md; `storageGet`/`storageSet` wrappers ready |
| SELECTOR-02 | Runtime selector resolution through candidate registry; `selectors.ts` reduced to seed/defaults; no direct selector imports remain in `observer.ts` / `exclusions.ts` | All 4 consumer files identified and mapped; call-site patterns documented |
| SELECTOR-03 | Registry versioned; seeds only when absent or on version bump; never overwrites adapted candidates on normal load | `SELECTORS_VERSION = '1.3.0'` is the seed trigger; additive-migration rules established |
| SELECTOR-04 | Successful match rotates winning candidate to front and persists | Winner-rotation pattern documented; wires into observer's existing match path |
| SELECTOR-05 | Adapted candidates carry timestamp; demoted/expired after 30 days; list capped at ≤10; default seed always retained | TTL tracking via `addedAt` field; cap enforcement on write |
| SELECTOR-06 | User can reset selectors to bundled defaults from dashboard | `BatchBlockBar` inline-confirm reuse; reset writes seed back to `selectorRegistry` key |
| SELECTOR-07 | Read-only view: active selector, source badge, last-matched, stale warning for critical selectors | `SelectorView.tsx` component spec in UI-SPEC.md; session-miss mechanism documented |
| SELECTOR-08 | In-memory selector cache refreshes via `chrome.storage.onChanged` | Existing `onChanged` listener pattern in `index.ts` is the model |
| SELECTOR-09 | Extension behaves identically to v6.1 after migration; verified by fixture-DOM tests | Sync `resolve()` with in-memory cache; observer starts only after `load()` awaited |
| SELECTOR-10 | CLAUDE.md constraint #1 and `selectors.ts` header updated to seed-vs-runtime model | Exact wording locked in CONTEXT.md D-08 |
</phase_requirements>

---

## Summary

Phase 22 is a **foundation phase with zero user-visible behavior change**. It replaces direct `import` of selector string constants in four content-script files with a sync `selectorRegistry.resolve('TARGET')` call, backed by a new `SelectorRegistry` singleton that maintains an in-memory cache over `chrome.storage.local`. The storage key `selectorRegistry` holds versioned, rank-ordered candidate lists seeded once from `selectors.ts`. The dashboard gains a `SelectorView` panel (read-only) with an inline-confirm reset control.

The phase is internally Wave 1 of v7.0: it lays the storage foundation that Phase 23's self-healing (breakage detection, heuristic re-derivation, LLM fallback) will build on. No new runtime dependencies are required. All patterns reuse established codebase conventions — the storage wrapper, the `onChanged` listener, the async-then-sync bootstrap order, and the `BatchBlockBar` confirm-strip pattern.

The highest-risk decision is the **async-to-sync boundary**: selectors are currently consumed synchronously during the observer hot path, but `chrome.storage.local` is async. The solution is already documented in CONTEXT.md and verified by reading `index.ts`: `init()` is `async` and awaits `storageGet(...)` before calling `startObserving()`. Insert `await selectorRegistry.seedIfNeeded()` and `await selectorRegistry.load()` at this same pre-observation await point, warming the in-memory cache before the observer fires any callbacks.

**Primary recommendation:** Implement `SelectorRegistry` as a singleton with a sync `resolve()` that reads an in-memory cache, plus `seedIfNeeded()` and `load()` async methods called in `init()`. Wire `chrome.storage.onChanged` to refresh the cache. Migrate consumer files one at a time, running the existing test suite after each. Build `SelectorView` last.

---

## Architectural Responsibility Map

| Capability | Primary Tier | Secondary Tier | Rationale |
|------------|-------------|----------------|-----------|
| Selector resolution at runtime | Content script (in-memory cache) | `chrome.storage.local` (persistence) | Observer hot path is sync; cache warms before observer starts |
| Storage seeding and versioned migration | Content script (`SelectorRegistry.seedIfNeeded()`) | — | Only the content script runs on LinkedIn pages; no service worker involvement needed |
| Winner rotation + persist | Content script (`SelectorRegistry.updateCandidate()`) | `chrome.storage.local` | Rotation happens on match, immediately persisted |
| Cross-tab cache refresh | Content script (`chrome.storage.onChanged` listener) | — | Each tab's in-memory cache refreshes independently when storage changes |
| TTL eviction (30-day adapted candidates) | Content script (on `load()` or `seedIfNeeded()`) | — | Eviction is a read-time filter; no background sweep needed |
| Session-miss tracking | Content script (per-session counter per target) | `chrome.storage.local` (`selectorSessionMisses` key) | Dashboard needs to read it; written by `SelectorRegistry` |
| Health view display | Dashboard (Preact `SelectorView.tsx`) | — | D-01 decision; popup stays compact |
| Reset-to-defaults write | Dashboard (`handleResetSelectors` in App) | `chrome.storage.local` | Writes seed back; `onChanged` propagates refresh to all consumers |

---

## Standard Stack

### Core (no new dependencies — all existing)

| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| `preact` | ^10.0.0 | Dashboard `SelectorView` component | Already the popup/dashboard framework |
| `preact/hooks` | (bundled) | `useState`, `useEffect` for SelectorView state | Same pattern used throughout dashboard |
| `chrome.storage.local` | MV3 API | Persist `selectorRegistry` and `selectorSessionMisses` keys | Project constraint: no other storage |
| `chrome.storage.onChanged` | MV3 API | Cache invalidation across tabs and contexts | Established pattern in `content/index.ts` |
| TypeScript | ^5.0.0 | All new module code | Project standard |
| vitest + jsdom | ^4.1.7 | Unit tests for registry logic | Existing test infrastructure |

### No New Packages

**All capabilities are hand-rolled.** STACK.md confirms no new runtime dependencies for v7.0. The slopcheck protocol is not required — no package installs occur in this phase.

---

## Package Legitimacy Audit

**Not applicable.** This phase installs zero new packages. All implementation uses existing project dependencies and browser extension APIs.

---

## Architecture Patterns

### System Architecture Diagram

```
[LinkedIn tab — content script]
  init() [async]
    ├── storageGet([...existing keys...])     ← existing await
    ├── selectorRegistry.seedIfNeeded()       ← NEW await (seeds if absent/stale)
    ├── selectorRegistry.load()               ← NEW await (warm in-memory cache)
    └── startObserving(onPost)                ← existing (observer now starts AFTER cache warm)

  MutationObserver fires:
    └── observer.ts processElement()
          ├── selectorRegistry.resolve('POST_BODY_TEXT')   ← sync, reads cache
          ├── extractPostData(card, urn)
          │     ├── selectorRegistry.resolve('RESHARE_INDICATOR')
          │     ├── selectorRegistry.resolve('POST_AUTHOR_LINK')
          │     └── selectorRegistry.resolve('POST_BODY_TEXT')
          └── [on successful match at index > 0]
                └── selectorRegistry.updateCandidate('TARGET', winnerValue)
                      └── storageSet({ selectorRegistry: ... })  ← async, fire-and-forget

  chrome.storage.onChanged fires (any tab writes):
    └── selectorRegistry refreshes in-memory cache from newValue

[Dashboard page]
  useEffect:
    ├── chrome.storage.local.get(['selectorRegistry', 'selectorSessionMisses'])
    └── chrome.storage.onChanged listener → re-read → setState

  SelectorView renders:
    ├── one row per SelectorTarget
    ├── source badge (seed/heuristic/llm)
    ├── last-matched (ISO date or "—")
    ├── session-miss warning (red for feed-essential, grey for contextual)
    └── Reset-to-defaults inline confirm
          └── handleResetSelectors()
                └── storageSet({ selectorRegistry: buildSeedRegistry() })
```

### Recommended Project Structure (additions only)

```
src/
├── content/
│   ├── selector-registry.ts        # NEW — singleton SelectorRegistry module
│   ├── selectors.ts                # UNCHANGED except header comment (D-08)
│   ├── observer.ts                 # MODIFIED — imports → resolve()
│   ├── exclusions.ts               # MODIFIED — imports → resolve()
│   ├── index.ts                    # MODIFIED — seedIfNeeded() + load() in init()
│   └── detector/
│       ├── comment-expand.ts       # MODIFIED — imports → resolve()
│       └── signals/
│           └── profile.ts          # MODIFIED — imports → resolve()
├── shared/
│   └── types.ts                    # MODIFIED — +SelectorRegistrySchema types
└── dashboard/
    ├── index.tsx                   # MODIFIED — +SelectorView, +selectorRegistry state
    └── SelectorView.tsx            # NEW — read-only health panel + reset control
```

### Pattern 1: SelectorRegistry Singleton

**What:** A module-scoped singleton that wraps `chrome.storage.local` with an in-memory cache. Exposes sync `resolve()` for the hot path and async `seedIfNeeded()`/`load()`/`updateCandidate()` for lifecycle and write operations.

**When to use:** Whenever a content-script module needs a selector string. Never call `chrome.storage.local` directly for selector reads.

```typescript
// src/content/selector-registry.ts

import type { SelectorRegistrySchema, SelectorTarget } from '../shared/types';
import { storageGet, storageSet } from '../shared/storage';
import { SELECTORS_VERSION, /* all seed constants */ } from './selectors';

// In-memory cache — warm before startObserving(), refreshed via onChanged
let _cache: SelectorRegistrySchema | null = null;

/** Build the seed registry from selectors.ts defaults. */
function buildSeedRegistry(): SelectorRegistrySchema {
  return {
    version: SELECTORS_VERSION,
    targets: {
      FEED_CONTAINER:   { candidates: [{ value: FEED_CONTAINER,   source: 'seed', lastMatchedAt: null, addedAt: new Date().toISOString(), failCount: 0 }] },
      POST_CARD:        { candidates: [{ value: POST_CARD,         source: 'seed', lastMatchedAt: null, addedAt: new Date().toISOString(), failCount: 0 }] },
      // ... all targets
    },
    lastAdaptedAt: null,
  };
}

/** Seed storage if absent or version-bumped. Never overwrites adapted candidates. */
export async function seedIfNeeded(): Promise<void> {
  const { selectorRegistry } = await storageGet(['selectorRegistry']);
  if (!selectorRegistry || selectorRegistry.version !== SELECTORS_VERSION) {
    await storageSet({ selectorRegistry: migrate(selectorRegistry) });
  }
  // Load into cache after seeding
}

/** Load registry from storage into in-memory cache. */
export async function load(): Promise<void> {
  const { selectorRegistry } = await storageGet(['selectorRegistry']);
  _cache = selectorRegistry ?? buildSeedRegistry();
}

/** Sync resolver — called from observer hot path. Falls back to seed if cache is null. */
export function resolve(target: SelectorTarget): string {
  if (!_cache) {
    // Pre-load fallback: return seed constant directly (import from selectors.ts)
    return SEED_MAP[target];
  }
  const entry = _cache.targets[target];
  return entry?.candidates[0]?.value ?? SEED_MAP[target];
}

/** Rotate winning candidate to front and persist. Fire-and-forget from observer. */
export async function updateCandidate(target: SelectorTarget, winnerValue: string): Promise<void> {
  if (!_cache) return;
  const entry = _cache.targets[target];
  if (!entry) return;
  const idx = entry.candidates.findIndex(c => c.value === winnerValue);
  if (idx <= 0) {
    // Already at front or not found — just update lastMatchedAt
    if (idx === 0) entry.candidates[0]!.lastMatchedAt = new Date().toISOString();
    await storageSet({ selectorRegistry: _cache });
    return;
  }
  // Rotate to front
  const [winner] = entry.candidates.splice(idx, 1);
  winner!.lastMatchedAt = new Date().toISOString();
  entry.candidates.unshift(winner!);
  await storageSet({ selectorRegistry: _cache });
}

// Register onChanged listener to keep cache fresh across tabs
chrome.storage.onChanged.addListener((changes, area) => {
  if (area === 'local' && changes['selectorRegistry']) {
    _cache = changes['selectorRegistry'].newValue ?? null;
  }
});
```

[CITED: CONTEXT.md code_context section — `seedIfNeeded()` + `load()` insertion point in `init()`]
[CITED: ARCHITECTURE.md — SelectorRegistry schema and sync resolve() rationale]

### Pattern 2: Additive Migration

**What:** When `version` in storage doesn't match `SELECTORS_VERSION`, merge: keep existing adapted candidates, add any new targets from seed, append seed as last-resort fallback if not already present. Never clear adapted candidates.

**Rule:** `migrate(stored)` produces a new `SelectorRegistrySchema` that:
1. Copies all existing `TargetEntry` records (preserving adapted candidates)
2. Adds any `SelectorTarget` keys present in seed but absent in stored
3. Ensures the seed value is always present in each list (as last item if not already in list)
4. Sets `version` to `SELECTORS_VERSION`

[CITED: ARCHITECTURE.md — "Migration is additive: new targets added from seed; existing healed candidates preserved; seed appended as last-resort fallback"]

### Pattern 3: TTL Eviction on Load

**What:** During `load()` (or `seedIfNeeded()`), scan all candidates with `source !== 'seed'`. If `addedAt` is older than 30 days, remove that candidate from the list. The seed candidate (always present) ensures the list is never empty after eviction.

**When:** Run eviction during `load()` — no background sweep required. Eviction is silent (no user notification in Phase 22).

```typescript
const THIRTY_DAYS_MS = 30 * 24 * 60 * 60 * 1000;

function evictStaleAdapted(registry: SelectorRegistrySchema): SelectorRegistrySchema {
  const now = Date.now();
  for (const entry of Object.values(registry.targets)) {
    entry.candidates = entry.candidates.filter(c => {
      if (c.source === 'seed') return true; // never evict seed
      return (now - new Date(c.addedAt).getTime()) < THIRTY_DAYS_MS;
    });
  }
  return registry;
}
```

[CITED: REQUIREMENTS.md SELECTOR-05]

### Pattern 4: Session-Miss Tracking

**What:** `SelectorRegistry` maintains a per-session `Set<SelectorTarget>` of targets that have resolved but never produced a DOM match. The content script calls `selectorRegistry.recordMiss(target)` on each failed `document.querySelector()`. After a brief debounce (or on page unload), write `selectorSessionMisses` to `chrome.storage.local` for the dashboard to read.

**Simpler alternative (preferred for Phase 22):** The dashboard reads `selectorSessionMisses` from storage and displays it. The content script writes the set after each mutation batch. Because Phase 22 adds no healing, a write-per-session (on first miss per target, not per mutation) is sufficient. No debounce needed — just call `storageSet` once per target on first miss.

### Pattern 5: chrome.storage.onChanged (established pattern)

**What:** The existing `content/index.ts` registers a `chrome.storage.onChanged` listener at module top level (before `init()` resolves) to handle `dismissedAccounts`, `flaggedAccounts`, and `settings` changes. The same pattern is used for `selectorRegistry`.

**Key detail:** The `SelectorRegistry` module registers its own `onChanged` listener at module import time (module-scope IIFE or module top-level). This means the listener is active even before `load()` is called, so a race condition where one tab writes while another tab's `load()` hasn't completed yet is handled gracefully.

[CITED: `src/content/index.ts` lines 125–180 — existing `chrome.storage.onChanged.addListener` pattern]

### Anti-Patterns to Avoid

- **Calling `chrome.storage.local.get()` from the observer hot path:** Never read storage synchronously in `processElement()`. The in-memory cache is the only allowed resolver on the hot path.
- **`resolve()` before `load()`:** Handled by the seed-constant fallback (`SEED_MAP[target]`), but planner should ensure `load()` is always awaited in `init()` before `startObserving()`.
- **Calling `element.remove()` anywhere in new code:** CLAUDE.md constraint — use `classList.add('llb-hidden')` only.
- **Using CSS class names in any new selector value:** CLAUDE.md constraint — only `data-*`, `aria-*`, `role`, semantic elements, and URL patterns.
- **Storing the registry in `chrome.storage.sync`:** REQUIREMENTS.md Out-of-Scope explicitly prohibits this.
- **Overwriting adapted candidates on every page load:** The `seedIfNeeded()` function must guard with a version check — only seed when key is absent or version differs.

---

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Storage read/write | Raw `chrome.storage.local.get/set` | `storageGet`/`storageSet` from `src/shared/storage.ts` | Already typed over `StorageSchema`; catches shape drift at compile time |
| Inline confirm pattern | Custom modal or `window.confirm()` | Clone from `BatchBlockBar.tsx` (`barStyles.confirmStrip`, state machine) | Phase 20 established this as the project pattern; UI-SPEC.md requires it |
| Preact component state | Anything outside `useState`/`useEffect` | `preact/hooks` — same as every other popup/dashboard component | No class components in this project |
| Dashboard card styling | New style constants | Copy `s.card`, `s.cardHeading`, `s.actionBtn`, `s.errorMsg` from `dashboard/index.tsx` | UI-SPEC.md requires exact reuse of established values |

**Key insight:** The storage layer is already generified over `StorageSchema`. The new `selectorRegistry` key must be added to `StorageSchema` in `types.ts` and the `storageGet`/`storageSet` wrappers will then type-check it automatically.

---

## Exact Call Sites to Migrate (SELECTOR-02, D-07)

This table is verified by reading the actual source files.

| File | Imports to Replace | Replacement |
|------|-------------------|-------------|
| `src/content/observer.ts` | `FEED_CONTAINER`, `FEED_CONTAINER_FALLBACK`, `POST_URN_ATTR`, `POST_AUTHOR_NAME`, `POST_BODY_TEXT`, `POST_AUTHOR_LINK`, `RESHARE_INDICATOR` | `selectorRegistry.resolve('FEED_CONTAINER')` etc. at each call site |
| `src/content/exclusions.ts` | `SPONSORED_MARKER`, `COMPANY_PAGE_MARKER`, `OPEN_TO_WORK_MARKER` | `selectorRegistry.resolve(...)` at each call site |
| `src/content/detector/comment-expand.ts` | `COMMENT_EXPAND_BUTTON`, `COMMENT_TEXT` | `selectorRegistry.resolve(...)` at each call site |
| `src/content/detector/signals/profile.ts` | `AUTHOR_HEADLINE`, `CONNECTION_DEGREE` | `selectorRegistry.resolve(...)` at each call site |
| `src/content/index.ts` | `SELECTORS_VERSION` (line 1) | **Leave as-is** — this is version metadata, not a DOM selector |

**Total targets requiring registry entries:** 15 (all constants in `selectors.ts` except `SELECTORS_VERSION`)

**Special cases requiring planner decision (Claude's Discretion):**
- `POST_URN_ATTR = 'componentkey'` — used as `card.getAttribute(POST_URN_ATTR)`, not `querySelector`. The registry must accept this but `resolve()` returns the attribute name string as-is.
- `POST_AUTHOR_NAME = 'a[href*="/in/"]:has(strong) strong'` — imported in `observer.ts`; used in `extractPostData`. Migrate normally.
- `COMPANY_PAGE_MARKER = '/company/'` — used in `authorProfileUrl.includes(COMPANY_PAGE_MARKER)`, not `querySelector`. Same "attribute-name" special case as `POST_URN_ATTR`.
- `FEED_CONTAINER_FALLBACK = 'main'` — used as a querySelector fallback in `waitForFeedContainer()`. Migrate normally.
- `POST_URN_ATTR_FALLBACK = 'componentkey'` — same as `POST_URN_ATTR`; not separately imported by any consumer (confirmed by reading files). Planner should check if this needs its own target.

**Bootstrap sequence change in `index.ts`:**

```typescript
// BEFORE (existing init() start):
async function init(): Promise<void> {
  const { anthropicApiKey, dismissedAccounts, flaggedAccounts, settings } =
    await storageGet(['anthropicApiKey', 'dismissedAccounts', 'flaggedAccounts', 'settings']);
  // ... setup ...
  startObserving(...);
}

// AFTER (Phase 22 addition):
async function init(): Promise<void> {
  const { anthropicApiKey, dismissedAccounts, flaggedAccounts, settings } =
    await storageGet(['anthropicApiKey', 'dismissedAccounts', 'flaggedAccounts', 'settings']);
  // NEW: warm selector cache before observer starts
  await selectorRegistry.seedIfNeeded();
  await selectorRegistry.load();
  // ... existing setup ...
  startObserving(...);  // observer hot path can now call resolve() synchronously
}
```

[VERIFIED: `src/content/index.ts` lines 208–260 — `init()` is async, `storageGet` is awaited before `startObserving`]

---

## Schema Definition for types.ts

The following types must be added to `src/shared/types.ts` and `StorageSchema`.

```typescript
// Add to types.ts

export type SelectorTarget =
  | 'FEED_CONTAINER' | 'FEED_CONTAINER_FALLBACK' | 'POST_CARD'
  | 'POST_URN_ATTR' | 'POST_URN_ATTR_FALLBACK'
  | 'POST_BODY_TEXT' | 'POST_AUTHOR_NAME' | 'POST_AUTHOR_LINK'
  | 'SPONSORED_MARKER' | 'COMPANY_PAGE_MARKER' | 'RESHARE_INDICATOR'
  | 'COMMENT_EXPAND_BUTTON' | 'OPEN_TO_WORK_MARKER' | 'COMMENT_TEXT'
  | 'AUTHOR_HEADLINE' | 'CONNECTION_DEGREE';

export type CandidateSource = 'seed' | 'heuristic' | 'llm' | 'user';

export interface SelectorCandidate {
  value: string;           // selector string or attribute name
  source: CandidateSource;
  lastMatchedAt: string | null;  // ISO 8601 or null
  addedAt: string;               // ISO 8601
  failCount: number;
}

export interface TargetEntry {
  candidates: SelectorCandidate[];  // index 0 = active
}

export interface SelectorRegistrySchema {
  version: string;                              // mirrors SELECTORS_VERSION
  targets: Record<SelectorTarget, TargetEntry>;
  lastAdaptedAt: string | null;
}

// Add to StorageSchema:
export interface StorageSchema {
  // ... existing fields ...
  selectorRegistry?: SelectorRegistrySchema;
  selectorSessionMisses?: SelectorTarget[];    // written by content script; read by dashboard
}
```

[CITED: ARCHITECTURE.md — Candidate Registry Schema section]
[CITED: CONTEXT.md — session-miss storage key described in UI-SPEC.md implementation note 4]

---

## Dashboard Integration (SelectorView)

The UI-SPEC.md provides the complete visual contract. Key integration facts verified from `src/dashboard/index.tsx`:

**Existing `s` style record provides:** `s.card`, `s.cardHeading`, `s.actionBtn`, `s.errorMsg`, `s.metricLabel` — all reused verbatim by `SelectorView`.

**Existing `chrome.storage.local.get()` call (line 81):** Already reads `['flaggedAccounts', 'dailyStats', 'storedPosts', 'dismissedAccounts']` in `useEffect`. Extend this call to also include `'selectorRegistry'` and `'selectorSessionMisses'`.

**Existing `loadError` state:** Already used in dashboard for failed storage reads. `SelectorView` receives an `error` prop or the parent's `loadError` surfaces it.

**Placement:** After the second existing `s.card` (the "Posts hidden" metrics card) and before the "Data management" card. [CITED: UI-SPEC.md — Placement in Dashboard section]

**`handleResetSelectors()` signature:**
```typescript
async function handleResetSelectors(): Promise<void> {
  await storageSet({ selectorRegistry: buildSeedRegistry() });
  // onChanged fires → dashboard state updates → SelectorView re-renders
}
```

**`SelectorView` props interface:**
```typescript
interface SelectorViewProps {
  registry: SelectorRegistrySchema | null;
  sessionMisses: Set<SelectorTarget>;
  onReset: () => Promise<void>;
  error: string | null;
}
```

[VERIFIED: `src/dashboard/index.tsx` — full file read; storage pattern, style record, card placement]

---

## Common Pitfalls

### Pitfall 1: resolve() called before load()

**What goes wrong:** If `startObserving()` fires before `load()` resolves, the cache is null and `resolve()` returns the seed constant directly from `SEED_MAP`. This is safe but means winner-rotation won't persist on the first mutation batch.

**Why it happens:** `init()` currently calls `startObserving()` synchronously after the storage await. If `seedIfNeeded()` / `load()` are not inserted before `startObserving()`, the first posts processed use the seed fallback rather than the cached registry.

**How to avoid:** The plan must sequence `await selectorRegistry.seedIfNeeded()` and `await selectorRegistry.load()` before `startObserving()` in `init()`. The seed fallback is a safety net, not the normal path.

**Warning signs:** Winner-rotation never fires (no `updateCandidate` calls) when inspecting with `DEBUG=true`.

### Pitfall 2: Seed overwrites adapted candidates on normal load

**What goes wrong:** `seedIfNeeded()` is called on every page load and always writes the seed, clearing any Phase 23 healed candidates.

**Why it happens:** Missing version check — calling `storageSet` unconditionally.

**How to avoid:** `seedIfNeeded()` must read storage first and only write when the key is absent OR `stored.version !== SELECTORS_VERSION`. Use the additive migration path for version bumps.

[CITED: PITFALLS.md — ADAPT-MOD-1]

### Pitfall 3: Multi-tab cache race on winner rotation

**What goes wrong:** Two LinkedIn tabs open simultaneously; both call `updateCandidate()` within the same second; last-write-wins erases one rotation.

**Why it happens:** `chrome.storage.local.set` is last-write-wins. Neither tab re-reads before writing.

**How to avoid (Phase 22):** The `onChanged` listener refreshes `_cache` when another tab writes. The worst case is that one tab's rotation is overwritten by another's rotation — an acceptable loss in Phase 22 since no heuristic candidates exist yet. The planner may choose to do a read-before-write in `updateCandidate()` to minimize race window. Document as a known limitation acceptable for Wave 1.

[CITED: PITFALLS.md — ADAPT-MOD-5]

### Pitfall 4: POST_URN_ATTR / COMPANY_PAGE_MARKER used as non-querySelector strings

**What goes wrong:** These constants are passed to `getAttribute(POST_URN_ATTR)` and `String.includes(COMPANY_PAGE_MARKER)`, not to `querySelector()`. If the registry returns an unexpected value (e.g., from a future heuristic), these calls break silently.

**Why it happens:** The registry schema treats all targets as querySelectors by default.

**How to avoid:** The planner must decide whether to model these as registry targets at all. Safest option: include them in the registry schema (so the type is complete and Phase 23 can adapt them if needed), but in `resolve()` document that these targets return attribute-name strings, not CSS selectors. `updateCandidate()` is never called for these targets during Phase 22 (no matches to rotate).

### Pitfall 5: Session-miss Set lost on SPA navigation

**What goes wrong:** SPA navigation (pushState/popstate) clears module-scope state in `index.ts` (confirmed: `profileSignalCache.clear()`, `hiddenPostNodes.clear()` are called on nav). If `selectorSessionMisses` is also module-scope, it resets silently on nav.

**Why it happens:** The SPA navigation handler in `index.ts` explicitly clears module-scope caches.

**How to avoid:** The session-miss Set should persist across SPA navigations within the same content-script lifetime (it represents the whole session, not just one page). Do NOT clear it in the SPA navigation handler. The set is cleared only when the content script is first loaded (new tab or extension reload).

### Pitfall 6: Candidate list grows unbounded (cap enforcement)

**What goes wrong:** Phase 23 will add candidates via heuristics and LLM. Without a cap check in `updateCandidate()`, lists exceed ≤10 entries.

**Why it happens:** Winner rotation always prepends; nothing removes from the tail.

**How to avoid:** `updateCandidate()` must enforce the cap: after prepending, if `entry.candidates.length > 10`, slice to 10 (drop the tail). The seed candidate is always preserved at the front or somewhere in the list — never in tail position after a rotation.

[CITED: REQUIREMENTS.md SELECTOR-05 — "list capped at ≤10 entries; always retains the default seed"]

---

## Migration Build Order (from ARCHITECTURE.md)

The ARCHITECTURE.md documents the verified build order for Wave 1. The planner should follow this sequence:

1. **types.ts** — Add `SelectorTarget`, `CandidateSource`, `SelectorCandidate`, `TargetEntry`, `SelectorRegistrySchema`, extend `StorageSchema`.
2. **selector-registry.ts** — Implement singleton with `resolve()`, `seedIfNeeded()`, `load()`, `updateCandidate()`, `onChanged` listener. Write unit tests (fixture-DOM, no LinkedIn).
3. **index.ts** — Insert `await selectorRegistry.seedIfNeeded()` + `await selectorRegistry.load()` before `startObserving()`.
4. **Migrate consumer files one at a time** — start with `POST_BODY_TEXT` in `observer.ts` (least risky; most tested). After each migration: run `npx vitest run`.
5. **Migrate remaining consumers** — `exclusions.ts`, `comment-expand.ts`, `signals/profile.ts`.
6. **SelectorView.tsx** — Implement health panel per UI-SPEC.md.
7. **dashboard/index.tsx** — Wire `SelectorView`, `handleResetSelectors`, `selectorRegistry`/`selectorSessionMisses` state.
8. **CLAUDE.md + selectors.ts header** — Doc updates (D-08, SELECTOR-10).

[CITED: ARCHITECTURE.md — Build Order section]

---

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| Direct `import { SELECTOR } from './selectors'` in consumer files | `selectorRegistry.resolve('TARGET')` via in-memory cache | Phase 22 (this phase) | Enables Phase 23 healing without changing call sites |
| `selectors.ts` as sole source of truth at runtime | `selectors.ts` = seed defaults; `SelectorRegistry` = runtime source | Phase 22 | Selectors become adaptable; `selectors.ts` becomes the fallback |
| Static selector constants | Rank-ordered candidate lists with metadata | Phase 22 | Foundation for winner rotation and TTL-based candidate eviction |

**CLAUDE.md constraint #1 updated wording (D-08):**
> *All hard-coded LinkedIn selector strings live in `selectors.ts` and only there. At runtime the content script reads selectors exclusively through `SelectorRegistry`, which hydrates from `chrome.storage.local` and falls back to the `selectors.ts` seed. Only `SelectorRegistry` may write selector strings to storage.*

---

## Assumptions Log

| # | Claim | Section | Risk if Wrong |
|---|-------|---------|---------------|
| A1 | `POST_URN_ATTR_FALLBACK` is not imported by any consumer file (left as potential dead constant) | Exact Call Sites table | If a file does import it, it also needs migration; grep before planning |
| A2 | Writing `selectorSessionMisses` to storage once per target miss per content-script lifetime is sufficient for dashboard display freshness | Session-miss Tracking pattern | Dashboard might show stale miss data if content script reloads mid-session; acceptable in Phase 22 |
| A3 | Winner rotation in Phase 22 will never rotate (all candidates are seed-source at index 0, so index check `idx <= 0` returns true and no splice occurs) — the rotation code is exercised but does nothing in practice until Phase 23 adds heuristic candidates | Winner rotation pitfall | If this assumption is wrong, rotation would still work correctly; risk is only that tests won't cover the splice path with real data |

**If this table is empty:** All other claims were verified directly from source files or cited from CONTEXT.md / ARCHITECTURE.md.

---

## Open Questions

1. **`POST_URN_ATTR_FALLBACK` — dead constant or used?**
   - What we know: `POST_URN_ATTR_FALLBACK = 'componentkey'` is exported from `selectors.ts`. Not found imported in any of the four consumer files by direct inspection.
   - What's unclear: Whether any other file (e.g., a test fixture) imports it.
   - Recommendation: Planner adds a grep task: `grep -r 'POST_URN_ATTR_FALLBACK' src/`. If found, add to migration list. If not, include in `SelectorTarget` type for completeness but no consumer migration needed.

2. **Attribute-name targets in registry — model or exclude?**
   - What we know: `POST_URN_ATTR` ('componentkey'), `COMPANY_PAGE_MARKER` ('/company/') are used with `getAttribute()` and `String.includes()`, not `querySelector()`. The schema comment in ARCHITECTURE.md says "selector string or attribute name".
   - What's unclear: Whether the planner should include these in the registry (complete schema, Phase 23 can adapt) or keep them as static seed constants (simpler, no rotation risk).
   - Recommendation: Include in registry schema as `SelectorTarget` entries for type completeness, but `updateCandidate()` is never called for these in Phase 22. Document in code that these targets return attribute-name/URL-pattern strings, not CSS selectors.

3. **`selectorSessionMisses` write timing**
   - What we know: Dashboard needs to read which targets had zero matches. UI-SPEC.md says content script writes this.
   - What's unclear: Whether to write on each mutation (noisy) or on a timer/page unload (may lose data on crash).
   - Recommendation: Write once per target on first miss (module-scope `Set` guards duplicates). Call `storageSet` async fire-and-forget. This minimizes writes while ensuring the dashboard always has fresh data within one mutation cycle.

---

## Environment Availability

Step 2.6: SKIPPED — this phase is pure code/config changes. No external tools, services, CLI utilities, or databases beyond what the project already uses (Node.js 22.22.3 confirmed available, vitest 4.1.7 installed).

---

## Security Domain

No new network calls, auth, cryptography, input parsing from external sources, or user data collection in Phase 22. All data flows through `chrome.storage.local` (same-extension, sandboxed). The selector health view is read-only. The reset control writes only to the extension's own storage.

ASVS is not applicable to this phase — it adds no new trust boundary crossings.

---

## Sources

### Primary (HIGH confidence)
- `src/content/selectors.ts` — all 15 exported constants, their values, and documentation
- `src/content/observer.ts` — all selector import call sites and usage patterns; bootstrap flow
- `src/content/exclusions.ts` — selector imports and `checkExclusions` implementation
- `src/content/detector/comment-expand.ts` — `COMMENT_EXPAND_BUTTON` and `COMMENT_TEXT` import sites
- `src/content/detector/signals/profile.ts` — `AUTHOR_HEADLINE` and `CONNECTION_DEGREE` import sites
- `src/content/index.ts` — `init()` async structure; `storageGet` await-before-observe; existing `onChanged` listener pattern
- `src/shared/storage.ts` — `storageGet`/`storageSet` typed wrapper implementation
- `src/shared/types.ts` — existing `StorageSchema` to extend
- `src/dashboard/index.tsx` — existing style record (`s`), card layout, `useEffect` storage reads, `loadError`, insertion point
- `src/popup/BatchBlockBar.tsx` — `barStyles` confirm-strip pattern to reuse for reset control
- `.planning/phases/22-externalize-selectors-to-storage/22-CONTEXT.md` — all locked decisions (D-01 through D-08)
- `.planning/phases/22-externalize-selectors-to-storage/22-UI-SPEC.md` — visual contract for `SelectorView` and reset control
- `.planning/research/ARCHITECTURE.md` — schema definition, build order, sync-resolve rationale, migration rules
- `.planning/research/PITFALLS.md` — ADAPT-MOD-1 (schema/stale candidates), ADAPT-MOD-5 (multi-tab race)
- `.planning/research/STACK.md` — no new dependencies confirmed
- `.planning/config.json` — `nyquist_validation: false` (Validation Architecture section omitted)

### Secondary (MEDIUM confidence)
- `.planning/REQUIREMENTS.md` — SELECTOR-01..10 requirement text
- `.planning/STATE.md` — key decisions table, session continuity

---

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH — no new packages; all existing infrastructure verified by source inspection
- Architecture: HIGH — all call sites read directly; bootstrap order confirmed from `index.ts`
- Schema: HIGH — ARCHITECTURE.md schema copied and cross-checked with existing `types.ts` patterns
- Pitfalls: HIGH — grounded in direct code reading + PITFALLS.md verified research
- UI component: HIGH — UI-SPEC.md fully specified; `dashboard/index.tsx` and `BatchBlockBar.tsx` read directly

**Research date:** 2026-06-07
**Valid until:** Stable — no external dependencies. Invalidated only if LinkedIn changes `selectors.ts` constants or project adds new consumer files.
