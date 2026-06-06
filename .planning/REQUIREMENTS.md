# Requirements — Milestone v7.0: Adaptive DOM Scraper

**Status:** Active
**Milestone:** v7.0
**Last updated:** 2026-06-06

> Prior milestone requirements (v6.1 POPUP-04/05 and earlier) are validated and recorded in `PROJECT.md` → Requirements. This file scopes v7.0 only.

---

## Selector Registry (Wave 1 — externalize to storage)

- [ ] **SELECTOR-01**: All selector-registry entries are stored in `chrome.storage.local` as rank-ordered candidate lists with metadata (`value`, `source`, `lastMatchedAt`, `lastVerifiedAt`, `matchCount`), seeded from `selectors.ts` defaults.
- [ ] **SELECTOR-02**: At runtime the content script resolves every selector through the candidate registry in priority order; `selectors.ts` is reduced to the seed/defaults source (no direct selector imports remain in `observer.ts` / `exclusions.ts`).
- [ ] **SELECTOR-03**: The registry is versioned; it seeds from defaults only when absent or on a version bump, and never overwrites adapted candidates on a normal page load.
- [ ] **SELECTOR-04**: A successful match rotates the winning candidate to the front of its list and persists the change.
- [ ] **SELECTOR-05**: Adapted candidates carry a timestamp and are demoted/expired after 30 days; each candidate list is capped (≤10 entries) and always retains the default seed.
- [ ] **SELECTOR-06**: The user can reset selectors to bundled defaults from the popup/dashboard (escape hatch from a bad adaptation).
- [ ] **SELECTOR-07**: A read-only view shows each target's active selector, its source (default/adapted/llm), and last-matched info, and warns when a critical selector has not matched recently on a feed page.
- [ ] **SELECTOR-08**: The in-memory selector cache refreshes via `chrome.storage.onChanged` so healed selectors take effect within the session and stay consistent across tabs.
- [ ] **SELECTOR-09**: After migration the extension behaves identically to v6.1 (regression-safe), verified by fixture-DOM tests covering seeding, runtime resolution, versioned migration, and reset-to-defaults.
- [ ] **SELECTOR-10**: Project documentation (CLAUDE.md constraint #1) is updated to describe the seed-vs-runtime selector model (`selectors.ts` = defaults; `SelectorRegistry` = runtime source; only the registry writes selectors to storage).

## Adaptive Self-Healing (Wave 2 — recover broken selectors)

- [ ] **ADAPT-01**: The system detects total scraping breakage — zero post-card matches over an active-feed window — guarded against false positives (feed-URL gate, feed-container present, minimum session activity, no-posts placeholder, auth check, rolling debounce) so skeleton/logged-out/non-feed/empty states do not trigger healing.
- [ ] **ADAPT-02**: On breakage, structural heuristics re-derive candidate selectors locally (no API call) from stable DOM anchors (role/aria/semantic/href/structure).
- [ ] **ADAPT-03**: No re-derived candidate is trusted or written until it passes a validation gate (minimum match count, author-link ratio, post-text presence, sponsored-contamination rejection, feed-context containment).
- [ ] **ADAPT-04**: When heuristics produce no valid candidate and an API key is configured, an LLM (Claude) fallback proposes ranked candidates from a sanitized **structural** DOM skeleton (all text/href/src/aria-label stripped — no post content or PII leaves the browser), validated through the same gate.
- [ ] **ADAPT-05**: LLM fallback is rate-bounded — single-flight latch, ≥5-minute cool-off persisted across service-worker restarts, and a per-day hard cap — and is only reached after heuristics fail.
- [ ] **ADAPT-06**: LLM responses are strictly validated before use (reject overly-broad selectors such as `body`/`html`/`*`; bounded match count; selector treated as a plain string, never evaluated) to prevent prompt-injection via page content.
- [ ] **ADAPT-07**: A recovered winning candidate is prepended and persisted, with the previously-active candidate retained so detection auto-recovers if LinkedIn reverts.
- [ ] **ADAPT-08**: Candidates within a target are ordered by a confidence signal (match count × recency × source weight), not pure insertion order.
- [ ] **ADAPT-09**: Fixture-DOM tests cover partial breakage, logged-out, skeleton-loader, heal-to-wrong-element rejection, and the reset round-trip; the LLM live-key path is verified by a manual (non-CI) test.
- [ ] **ADAPT-10**: If the LLM fallback ships, `PRIVACY.md` discloses that a sanitized structural description of the feed layout (no text/PII) may be sent to the Anthropic API to repair broken selectors.

---

## Future Requirements (deferred)

- Manual selector editing / override UI (a power-user could paste a corrected selector; deferred to keep v7.0 read-only and avoid class-name input risk).
- Breakage event log surfaced in the health view ("recovered via heuristic 2 days ago").
- Auto-promotion of a non-active candidate after N consecutive matches.
- Full candidate-list management UI (reorder/delete individual candidates).
- Partial-breakage as an explicit healing *trigger* (v7.0 triggers on total breakage only; heuristics degrade gracefully on partial).
- Blocked-accounts manager page (carried over from v6.0 deferral: BLOCK-01/02/03).

## Out of Scope

- Sending post content / personal data to the LLM (structural skeleton only — hard rule).
- A per-selector manual "repair" button (not in scope; total-breakage auto-detection + reset cover v7.0).
- Bundling an Anthropic API key (LLM fallback uses the user's configured key only).
- Cross-device sync of the selector registry (`chrome.storage.sync`) — candidates are local-feed-derived.
- Any change to detection scoring, block/dismiss, dashboard stats, or export behavior.

---

## Traceability

| REQ-ID | Phase | Status |
|--------|-------|--------|
| SELECTOR-01..10 | Phase 22 | Pending |
| ADAPT-01..10 | Phase 23 | Pending |

*(Per-ID phase mapping is finalized by the roadmapper.)*
