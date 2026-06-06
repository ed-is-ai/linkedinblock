# Phase 3: Storage & Queue - Context

**Gathered:** 2026-05-29
**Status:** Ready for planning

<domain>
## Phase Boundary

Deliver a robust storage layer that:
1. Persists flagged accounts across browser sessions and service worker restarts (QUEUE-01, QUEUE-02)
2. Accumulates account scores using an EMA rolling average (not just peak) with a tracked post count
3. Implements profile signals (DETECT-06): headline formula and connection degree proxy, extracted once per authorId and cached in memory
4. Enforces a 500-entry cap with lowest-score eviction
5. Declares `dismissedAccounts` in StorageSchema (Phase 5 writes to it; Phase 3 defines the type and key)

**Not in Phase 3:**
- Popup UI (Phase 4)
- User decisions: dismiss / block actions (Phase 5)
- Configurable threshold UI (Phase 6)
- AI headshot detection (no LLM in v1; too fragile client-side)

</domain>

<decisions>
## Implementation Decisions

### Rolling Score Strategy

- **D-01:** Use **EMA (exponential moving average)** for `compositeScore`:
  `compositeScore = compositeScore × 0.8 + newScore × 0.2` (α = 0.2)
  Score drifts toward recent posts; an account can rehabilitate over time if they post more human-looking content. α is a named constant for easy tuning.

- **D-02:** Track `peakScore` separately as `Math.max(existing.peakScore, newScore)`. Popup Phase 4 can sort/display by either. Both fields live on `FlaggedAccount`.

- **D-03:** Track `postCount` (integer, incremented on every detection result ≥ 35 that is persisted). Used as context for the EMA and displayed in the popup.

- **D-04:** **Migration for Phase 2 entries** — when reading an existing entry that lacks `postCount`, initialise `postCount = 1`. No migration script needed: the next write from Phase 3 code adds the field.

### FlaggedAccount Type Expansion

- **D-05:** Rename `FlaggedAccountStub` → `FlaggedAccount`. Add fields:
  - `postCount: number` — total posts seen from this account that were flagged (score ≥ 35)
  - `peakScore: number` — highest single-post score ever seen
  `compositeScore` changes meaning: was "peak" in Phase 2, is now "EMA rolling average" in Phase 3.

- **D-06:** `status` union stays `'pending'` in Phase 3. Phase 5 expands it to `'pending' | 'blocked' | 'dismissed'`. Phase 3 only declares `dismissedAccounts` as a separate key — it does not change the `status` field.

### Profile Signals (DETECT-06)

- **D-07:** Phase 3 implements **two profile signals**, extracted from the post card DOM (no profile page visits):
  1. **Headline formula** — pipe-separated role combo (`Speaker | Coach | Mentor`), and buzzword-heavy titles (`Visionary`, `Guru`, `Ninja`, `Evangelist`, `Thought Leader`, `Disruptor`). Researcher determines the final pattern list.
  2. **Connection degree proxy** — `3rd+` connection indicator signals slightly less social proximity. `1st` and `2nd` carry no suspicion.

- **D-08:** Profile signal **weights**: 5–10 pts each (low). Named constants — easy to tune post-launch. Profile signals alone cannot push a post over any threshold.

- **D-09:** Profile signals merge into the existing `signals: Record<string, number>` on `FlaggedAccount` — no new field. Signal keys: e.g. `"headline-formula"`, `"degree-3"`.

- **D-10:** Profile signals are extracted **once per authorId per session** and cached in a module-scoped `Map<string, Record<string, number>>` in the content script. On subsequent posts from the same author, the cached result is added directly to the detection result's `signalBreakdown`.

- **D-11:** All new LinkedIn DOM selectors for headline and connection degree must be added to `src/content/selectors.ts` — never hardcoded inline.

### Storage Cap & Eviction

- **D-12:** `flaggedAccounts` cap: **500 entries**. When at cap and a new unknown account arrives, evict the entry with the **lowest `compositeScore`**. If tied, evict the oldest `firstSeenAt`.

- **D-13:** No proactive/background eviction. Eviction only triggers on cap hit during a `persistFlaggedAccount` write.

- **D-14:** `dismissedAccounts` is a **separate StorageSchema key** — `dismissedAccounts?: string[]` (array of authorId strings). Cap: **200 entries** (FIFO if needed, but less critical). Phase 3 declares the key with an empty array default. Phase 5 writes to it.

### Claude's Discretion

- Exact EMA α constant name (e.g., `EMA_ALPHA`, `SCORE_EMA_WEIGHT`) — use a named constant
- Whether the in-memory profile signal cache is a `Map` or a plain `Record` — whichever TypeScript handles most cleanly
- Whether `persistFlaggedAccount` stays in `content/index.ts` or is extracted to `src/shared/queue.ts` — extract if it grows beyond ~60 lines after Phase 3 additions
- Exact headline buzzword list — researcher determines from FEATURES.md + common patterns; document as a named const array

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Requirements & Roadmap
- `.planning/REQUIREMENTS.md` — Phase 3 requirements: QUEUE-01, QUEUE-02, DETECT-06
- `.planning/ROADMAP.md` §Phase 3 — success criteria (3 specific things that must be TRUE)
- `.planning/STATE.md` — key decisions log; note "Storage schema: flat-keyed account-centric; cap 500 entries; never store post text"

### Detection Signal Design
- `.planning/research/FEATURES.md` — DETECT-06 profile signals section: headshot indicator, thin connection count, bio/headline patterns. Phase 3 implements headline + degree signals only.
- `.planning/research/FEATURES.md` §Scoring Approach — weighted additive model; profile signals are additive on top of content signals

### Architecture
- `.planning/research/ARCHITECTURE.md` — What lives where; data flow for content script → storage
- `.planning/research/PITFALLS.md` — CRIT-1 (selector registry): all new DOM selectors in `selectors.ts`

### Existing Code (Phase 2 output — Phase 3 expands these)
- `src/shared/types.ts` — `FlaggedAccountStub` (rename to `FlaggedAccount`), `StorageSchema` (add `dismissedAccounts`); see type comments foreshadowing Phase 3 additions
- `src/shared/storage.ts` — typed `storageGet`/`storageSet` wrappers; Phase 3 uses these as-is
- `src/content/index.ts` — `persistFlaggedAccount()` function; Phase 3 rewrites this to implement EMA + eviction + profile signal merge
- `src/content/selectors.ts` — all new LinkedIn DOM selectors for headline text and connection degree indicator must go here

### Prior Phase Context
- `.planning/phases/02-detection-engine/02-CONTEXT.md` — D-03 (profile signals deferred here), D-05 (signal weights), D-13 (HeuristicDetector interface — profile signals plug in without changing the call site)

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- `src/content/index.ts` `persistFlaggedAccount()` — Phase 3 rewrites this function in-place (or extracts to `src/shared/queue.ts`). The EMA formula, eviction logic, and profile signal merge all go here.
- `src/shared/storage.ts` — `storageGet(['flaggedAccounts', 'dismissedAccounts'])`, `storageSet({ flaggedAccounts, dismissedAccounts })` — no changes needed to storage.ts itself
- `src/content/selectors.ts` — add `AUTHOR_HEADLINE`, `CONNECTION_DEGREE` constants for Phase 3 profile signal extraction
- `src/content/detector/heuristic.ts` — `HeuristicDetector.detect()` currently returns only content + engagement signals. Phase 3 passes profile signal scores in from the content script (via `PostData` extension or separate injection point — researcher to advise)

### Established Patterns
- **No inline selector strings** — INFRA-04: any new LinkedIn DOM selector must go in `selectors.ts`
- **Never store post text** — security constraint from STATE.md + types.ts comment; `PostData` is memory-only
- **SW is stateless** — no state in service worker; all persistence to `chrome.storage.local` immediately
- **Profile signal cache** — new pattern: `Map<authorId, Record<signalName, score>>` in content script module scope; reset on SPA navigation (same hook as `resetExpansionBudget`)

### Integration Points
- `src/content/index.ts` `startObserving()` callback — Phase 3 adds profile signal extraction here (before `detector.detect()` or after, merging into result)
- `src/shared/types.ts` `StorageSchema` — add `dismissedAccounts?: string[]`
- `src/shared/types.ts` `FlaggedAccountStub` → `FlaggedAccount` — add `postCount`, `peakScore`; update `status` comment (expansion to happen in Phase 5)

</code_context>

<specifics>
## Specific Ideas

- EMA formula as a constant: `const EMA_ALPHA = 0.2` — document that changing this value changes how quickly accounts can rehabilitate
- `dismissedAccounts` array: content script loads it once at init, stores in module scope as `Set<string>` for O(1) lookup; writes happen in Phase 5
- Profile signal cache should reset on SPA navigation (`popstate` / `pushState` hook) — same pattern as `resetExpansionBudget` in `comment-expand.ts`
- Connection degree "3rd+" is a visual indicator in the post card (aria-label or text node near the author name) — researcher must verify which stable `data-*` or aria attribute carries this

</specifics>

<deferred>
## Deferred Ideas

- **AI headshot detection** — Excluded. Client-side image analysis without an LLM is too fragile. Deferred to a future LLM-enabled phase.
- **`status` field expansion** (`'blocked' | 'dismissed'`) — Phase 5 expands the union. Phase 3 leaves `status: 'pending'` only on the type.
- **Score decay** (rolling score toward neutral after 30+ days inactive) — discussed in 02-CONTEXT.md deferred section. Still deferred; EMA handles some of this naturally.
- **Recruiter threshold penalty** — Requires headline reading (which Phase 3 adds). Could be enabled in Phase 6 with a configurable threshold adjustment. Deferred for now.
- **`'Helping X achieve Y'` headline pattern** — User mentioned reviewing this pattern but left final pattern list to the researcher. Include in researcher scope.

</deferred>

---

*Phase: 3-Storage & Queue*
*Context gathered: 2026-05-29*
