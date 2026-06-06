# Phase 22: Externalize Selectors to Storage - Context

**Gathered:** 2026-06-06
**Status:** Ready for planning

<domain>
## Phase Boundary

Move all runtime selector lookups off direct `selectors.ts` imports and onto a new storage-backed `SelectorRegistry` (key `selectorRegistry` in `chrome.storage.local`). The registry holds, per target, a rank-ordered `SelectorCandidate[]` (index 0 = active) with metadata, seeded **once** from `selectors.ts` defaults, with versioned/additive migration, 30-day TTL on adapted candidates, an in-memory cache refreshed via `chrome.storage.onChanged`, a winner-rotation-on-match behavior, a **read-only health view** (dashboard), and a **reset-to-defaults** escape hatch.

This is **Wave 1** of v7.0. It ships with **zero user-visible behavior change** beyond the new health view + reset control — the extension must behave identically to v6.1 on a live feed. No self-healing/breakage detection/LLM work happens here (that is Phase 23). No new runtime dependencies.

</domain>

<decisions>
## Implementation Decisions

### Health View (SELECTOR-07)
- **D-01:** The read-only selector health view lives in the **dashboard** (`src/dashboard/`), **always visible** — not in the popup. Rationale: keeps the popup compact (it's the hot path for reviewing flagged accounts); the dashboard already hosts diagnostic/feed-health data, so selector health is a natural fit. (Chosen over popup-disclosure and dual-surface options.)
- **D-02:** The health view lists, per target: active selector value, source badge (`seed` / `heuristic` / `llm` — in Phase 22 only `seed` will appear in practice), and last-matched / last-verified info.

### Stale-Selector Warning (SELECTOR-07)
- **D-03:** Warning model is **session-miss based** (warn on targets that produced zero matches during the current feed session), but **split by criticality to avoid crying wolf**:
  - **Feed-essential targets → real warning ("red"):** `FEED_CONTAINER`, `POST_CARD`, `POST_AUTHOR_LINK`, `POST_BODY_TEXT`. These MUST match on any active feed page; a session miss is a genuine breakage signal.
  - **Contextual/optional targets → neutral ("grey", no alarm):** comments (`COMMENT_EXPAND_BUTTON`, `COMMENT_TEXT`), `AUTHOR_HEADLINE`, `CONNECTION_DEGREE`, `RESHARE_INDICATOR`, `SPONSORED_MARKER`, etc. These legitimately don't appear on a plain feed scroll, so a miss is shown as "not seen this session" without raising an alarm.
- **D-04:** This session-miss warning is **distinct from the 30-day TTL** (SELECTOR-05). TTL governs demotion/expiry of *adapted* candidates; the warning governs *health surfacing* of the active selector. Both coexist.

### Reset to Defaults (SELECTOR-06)
- **D-05:** Reset uses an **inline confirm step** — click "Reset to defaults" → control morphs into a "Confirm reset?" state before any write commits. Reuse the **Phase 20 batch-block confirmation pattern** already in the codebase (`BatchBlockBar` inline confirm) for consistency.
- **D-06:** Reset restores **all** registry entries to the `selectors.ts` seed (all-or-nothing; per-selector reset is explicitly deferred — see REQUIREMENTS "Future"). The health view must reflect the reset **immediately** (success criterion 5) — leverage the same `onChanged` cache refresh.

### Migration Scope (SELECTOR-02, SELECTOR-10)
- **D-07:** Migrate **all four runtime selector consumers** to `selectorRegistry.resolve('TARGET')`, not just the two named in the success criteria. Confirmed by scout — these files import selector constants directly today:
  - `src/content/observer.ts`
  - `src/content/exclusions.ts`
  - `src/content/detector/comment-expand.ts` (`COMMENT_EXPAND_BUTTON`, `COMMENT_TEXT`)
  - `src/content/detector/signals/profile.ts` (`AUTHOR_HEADLINE`, `CONNECTION_DEGREE`)
  - (Note: `src/content/index.ts` imports only `SELECTORS_VERSION`, not a selector string — leave that import as-is; the version constant is metadata, not a runtime DOM selector.)
  Rationale: full migration is what actually satisfies CLAUDE.md constraint #1 ("no direct selector imports remain at runtime") and is what lets these selectors self-heal in Phase 23. Migrate one selector/file at a time, regression-testing each (per ARCHITECTURE build order).
- **D-08:** SELECTOR-10 doc updates are **in scope for this phase**: update CLAUDE.md constraint #1 wording and the `selectors.ts` header comment to the seed-vs-runtime model — *"All hard-coded LinkedIn selector strings live in `selectors.ts` and only there. At runtime the content script reads selectors exclusively through `SelectorRegistry`, which hydrates from `chrome.storage.local` and falls back to the `selectors.ts` seed. Only `SelectorRegistry` may write selector strings to storage."* (Use the exact wording proposed in ARCHITECTURE.md §"Constraint #1 Reconciliation".)

### Claude's Discretion
- Source-badge label strings, exact health-table layout/styling, candidate-list cap enforcement mechanics (≤10), and the cross-tab `onChanged` test approach are left to research/planning — they were offered but not flagged as user concerns.
- Whether `POST_URN_ATTR` / `POST_AUTHOR_NAME` / `FEED_CONTAINER_FALLBACK` / `COMPANY_PAGE_MARKER` (attribute-name and URL-pattern "selectors" rather than querySelector strings) are modeled as registry targets or kept as seed constants is a planner call — the registry schema must accommodate both selector strings and attribute-name/URL-pattern values (see `POST_URN_ATTR = 'componentkey'`, `COMPANY_PAGE_MARKER = '/company/'`).

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Requirements & Roadmap
- `.planning/REQUIREMENTS.md` — SELECTOR-01..10 (the locked scope for this phase) + Out-of-Scope list (no detection/block/dashboard-stats changes; no `chrome.storage.sync`; no manual selector editing).
- `.planning/ROADMAP.md` §"Phase 22" — goal + 5 success criteria.

### v7.0 Research (read before planning — directly shapes this phase)
- `.planning/research/SUMMARY.md` — synthesis; "Critical guards" item #6 (schema versioning + migration + TTL + reset from day one) and the Wave-1 phase shape.
- `.planning/research/ARCHITECTURE.md` — **most important**: candidate registry schema (`SelectorTarget`, `SelectorCandidate`, `TargetEntry`, `SelectorRegistrySchema`), new-vs-modified component table, sync-`resolve()` rationale, additive-migration rules, build order, and the exact constraint #1 reconciliation wording.
- `.planning/research/PITFALLS.md` — schema/stale-candidate and multi-tab-race pitfalls relevant to Wave 1.
- `.planning/research/STACK.md` — confirms no new deps.

### Project constraints & decisions
- `CLAUDE.md` §"Critical Constraints" #1 (the constraint being extended — must be updated per D-08) and §"Pluggable Detector Interface".
- `.planning/STATE.md` §"Key Decisions" — "Selector runtime model" (Phase 22) row already records the seed-vs-runtime decision; storage-schema and stateless-service-worker constraints apply.
- `.planning/phases/01-foundation/DOM-INSPECTION.md` — referenced by `selectors.ts` header; live-DOM provenance for current selector values.

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- `src/popup/BatchBlockBar.tsx` — inline confirm-step pattern (Phase 20) to reuse for the reset-to-defaults confirmation (D-05).
- `src/shared/storage.ts` (storage wrappers `storageGet`/`storageSet`) — reuse for registry persistence; do not hand-roll `chrome.storage` access.
- Existing `chrome.storage.onChanged` listeners in `src/content/index.ts` (blocked authors, threshold authors rebuilt live) — established pattern for the registry's live cache refresh (SELECTOR-08).
- `SELECTORS_VERSION = '1.3.0'` in `selectors.ts` — the version the registry mirrors for re-seed/migration (SELECTOR-03).

### Established Patterns
- `init()` in `src/content/index.ts` is already `async` and `await`s `storageGet(...)` **before** `startObserving()` (line ~260). Insert `await selectorRegistry.seedIfNeeded()` + `await selectorRegistry.load()` here so the sync `resolve()` cache is warm before the observer hot path runs.
- Popup/dashboard styling: inline style objects only, no CSS class selectors (Phase 4 decision) — applies to the new health view in the dashboard.
- Selector consumers currently import named constants from `./selectors` — replace each with `selectorRegistry.resolve('TARGET')` (D-07).

### Integration Points
- New module: `src/content/selector-registry.ts` (sync `resolve(target)`, `seedIfNeeded()`, async `load()`, `updateCandidate()`/winner-rotation, migration, `onChanged` cache, singleton).
- New dashboard panel: a `SelectorView`-style read-only component in `src/dashboard/` (D-01).
- Modified: `src/shared/types.ts` (+`selectorRegistry` schema type); `observer.ts`, `exclusions.ts`, `detector/comment-expand.ts`, `detector/signals/profile.ts` (imports → `resolve()`); `content/index.ts` (seed+load before observe); dashboard entry (+ health view).
- Winner rotation (SELECTOR-04): observer's successful match must call back into the registry to prepend/re-rank the matching candidate and persist — wire this without changing what gets hidden/flagged.

</code_context>

<specifics>
## Specific Ideas

- Health view should read like a diagnostic table: one row per target, source badge, last-matched, with feed-essential targets visually escalated (red) on session miss and contextual targets shown neutrally (grey) — see D-03.
- Reset control should feel like the existing batch-block confirm (click → "Confirm reset?" → commit), not a browser `confirm()` dialog.
- Migrate selectors **one at a time, regression-testing each** (ARCHITECTURE build order suggests starting with `POST_BODY_TEXT`).

</specifics>

<deferred>
## Deferred Ideas

- **Manual selector editing / override UI** — paste a corrected selector. Deferred (REQUIREMENTS "Future") to keep v7.0 read-only and avoid class-name input risk.
- **Per-selector reset** — reset a single target rather than all. Deferred; v7.0 reset is all-or-nothing (D-06).
- **Breakage event log in health view** ("recovered via heuristic 2 days ago") — deferred to Phase 23 / future.
- **Auto-promotion of a non-active candidate after N consecutive matches** — deferred (Phase 23 introduces confidence ranking ADAPT-08).
- **All self-healing** (breakage detection, heuristic re-derivation, LLM fallback, privacy disclosure) — Phase 23 (ADAPT-01..10). Phase 22 only lays the storage/registry foundation with zero behavior change.

</deferred>

---

*Phase: 22-externalize-selectors-to-storage*
*Context gathered: 2026-06-06*
