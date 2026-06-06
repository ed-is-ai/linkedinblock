# FEATURES Research — v7.0 Adaptive DOM Scraper

**Milestone:** v7.0 — Adaptive DOM Scraper
**Researched:** 2026-06-06
**Scope:** Adaptive / self-healing selector system ONLY (detection features unchanged from v1–v6).
**Confidence:** HIGH for candidate-ranking + breakage detection (established self-healing-selector literature); MEDIUM for LLM-repair contract; LOW for LinkedIn-specific heuristic attribute names (needs live DOM).

## Table Stakes (must-have to ship)

**TS-1 — Externalized selector registry in storage.** All `selectors.ts` strings → `chrome.storage.local`; `selectors.ts` becomes seed/defaults only. Each named target → ordered array of candidates; index 0 = active. Candidate record: `value, source('default'|'adapted'|'llm'), addedAt, lastMatchedAt, matchCount, consecutiveFailures`. Complexity: Low.

**TS-2 — Runtime candidate resolution in the observer.** `observer.ts` resolves selectors from the registry (cached in module scope, refreshed via `chrome.storage.onChanged`), not from hardcoded imports. Healed selectors take effect within the session without reload. **Critical:** the SPA `reinit()` path must pick up the refreshed cache — test explicitly. Depends on TS-1. Complexity: Low-Med.

**TS-3 — Active-feed breakage detection.** Zero post-card matches over a window during which the feed is confirmed active. "Active" = feed URL + `visibilityState==='visible'` + ≥10s since last SPA reinit. Window: zero matches for ~30–60s of active observation; reset on any match / SPA nav. Two tiers: **SOFT** (inner selector fails, container still matches → heuristic re-derive that selector) vs **HARD** (container also fails → re-derive container + post-card). Depends on TS-1/2. Complexity: Medium (most bug-prone piece).

**TS-4 — Structural heuristic re-derivation.** On breakage, re-derive candidates from stable DOM anchors locally (no API). Score candidates (data-testid > other data-* > `div[componentkey]` ancestor > repetition count > shallow depth). **Validation gate before trusting any candidate:** matches ≥ 2 (ideally 2–200), ≥1 match has non-empty text, post-body candidates sit inside a `div[componentkey]` ancestor. On success, **prepend** winner at index 0 (keep old at index 1 — may recover). Depends on TS-3. Complexity: Med-High.

**TS-5 — LLM fallback selector repair.** When heuristics yield no valid candidate AND an API key is configured AND cool-off elapsed: send a **sanitized structural DOM skeleton** (text/href/src/aria-label stripped) to Claude requesting ranked JSON candidates; validate response through the same gate. Mark `source:'llm'`. Reuse existing Anthropic auth infra (see ARCHITECTURE/STACK conflict on call location). Complexity: Medium (prompt + sanitizer).

**TS-6 — Read-only selector health view.** Popup/dashboard table: target / active value (truncated) / source / last-matched; banner if a critical selector hasn't matched in >24h on a feed URL; "last breakage" line. Read-only this milestone. Complexity: Low.

**TS-7 — Fixture-DOM automated tests.** vitest against static HTML fixtures: seed-from-defaults, candidate resolution (uses index-0 not the `selectors.ts` constant), breakage-timer + feed-URL guard, heuristic re-derivation on a "renamed" fixture, validation gate rejects 0/1-match candidates, LLM fallback trigger + sanitization (mocked), storage write/prepend. Main effort: extract DOM-coupled observer logic into pure functions. Complexity: Medium.

## Differentiators (high ROI after table stakes)

- **D-1 Candidate confidence score** — internal ordering from matchCount × recency × source weight. Low.
- **D-2 Candidate expiry/pruning** — drop 0-match candidates >14d; demote `consecutiveFailures ≥ 10` to end (never below the seed default); always keep ≥1 default. Low.
- **D-3 Breakage event log** — capped (~20) structured events for the health view ("recovered via heuristic 2d ago"). Low.
- **D-4 Candidate promotion** — a non-active candidate matching 5 posts in a row promotes to index 0 (auto-recovers when LinkedIn reverts). Low-Med.

## Anti-Features (explicitly excluded)

- **AF-1** Auto-trusting unvalidated candidates (validation gate mandatory).
- **AF-2** Sending post content/PII to the LLM (structural skeleton only; tests must verify stripping).
- **AF-3** Continuous/polling DOM inspection (event-driven on breakage only).
- **AF-4** Over-broad heuristics ("first div with any data-attr") — specificity enforced by the gate.
- **AF-5** Re-seeding from defaults on every load (seed once when key absent only).
- **AF-6** LLM-only recovery skipping heuristics (heuristics first, LLM last, API-key-gated).
- **AF-7** Manual selector editing (deferred to a Future Requirement — read-only this milestone).

## Dependency Graph

```
TS-1 → TS-2 → TS-3 → TS-4 → (on fail) TS-5      (TS-4/TS-5 write back to TS-1)
                    ↘ TS-6 (reads registry)
TS-7 validates TS-1..TS-5
D-1/D-2 ← TS-1 metadata · D-3 ← TS-3 · D-4 ← TS-2 match tracking
```

## Wave Structure

- **Wave 1 (lower risk):** TS-1, TS-2, TS-6, D-2, TS-7(reg coverage).
- **Wave 2 (higher complexity):** TS-3, TS-4, TS-5, D-1, D-3, D-4, TS-7(healing coverage).
- **Deferred:** AF-7 (manual editing), full candidate-management UI.

## Complexity / Risk Summary

| Feature | Complexity | Primary risk |
|---|---|---|
| TS-1 registry | Low | StorageSchema migration |
| TS-2 resolution | Low-Med | SPA reinit() cache refresh |
| TS-3 breakage | Med | false alarms (active-feed confirmation) |
| TS-4 heuristics | Med-High | matching wrong element |
| TS-5 LLM | Med | DOM sanitization + JSON reliability |
| TS-6 health view | Low | — |
| TS-7 fixtures | Med | extracting DOM-coupled logic |
