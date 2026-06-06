# Research Summary — v7.0 Adaptive DOM Scraper

**Milestone:** v7.0 — Adaptive DOM Scraper
**Synthesized:** 2026-06-06 (from STACK / FEATURES / ARCHITECTURE / PITFALLS)
**Overall confidence:** HIGH on architecture, storage model, and the critical-guard set; MEDIUM on the LLM-repair contract; LOW on LinkedIn-specific heuristic attribute names (need live DOM verification).

## One-paragraph synthesis

Externalize the selector registry into a versioned, ranked **candidate list + metadata** in `chrome.storage.local` (seeded once from `selectors.ts`), accessed at runtime through a new synchronous `SelectorRegistry` module — this is **Wave 1**, ships with zero user-visible behavior change, and is independently regression-testable. Then add a **self-healing adapter** (**Wave 2**): a breakage detector (zero post-card matches over an *active* feed window), structural heuristic re-derivation, and an LLM (Claude) fallback — each gated by a strict candidate-validation step before anything is written back. **No new runtime dependencies**; everything reuses existing infra (Anthropic client, storage wrappers, MutationObserver, vitest).

## Key recommendations

- **No new deps.** Hand-roll the heuristic scorer (~60 lines), DOM sanitiser (~15), LLM response guard (~10). Reuse `fast-levenshtein` (already present) only if attribute-name fuzzy matching is needed.
- **Storage:** one versioned `selectorRegistry` key; each target = ordered `SelectorCandidate[]` (`value, source, lastMatched/Verified, matchCount/failCount`); index 0 = active; prepend winners; seed **once** when key absent (never on every load).
- **Runtime resolution:** `SelectorRegistry.resolve()` is synchronous, cache warmed by `load()` awaited before `startObserving()`; `chrome.storage.onChanged` refreshes the cache live.
- **Constraint #1 is preserved, extended:** `selectors.ts` stays the only hard-coded selector source (now "seed/defaults"); runtime reads go through `SelectorRegistry`; only the registry may write selectors to storage. **Update CLAUDE.md constraint #1 wording in Wave 1.**
- **Heuristics first, LLM last,** API-key-gated, with a strict validation gate on every recovered candidate.

## ⚠ Must resolve before Wave 2 planning — LLM call location

The reports **conflict**: STACK says the Anthropic `fetch` must live in the **service worker** (CORS blocks content scripts on `linkedin.com`); ARCHITECTURE + FEATURES say it already runs in the **content script** via the existing `llm.ts` (with `anthropic-dangerous-direct-browser-access` + host_permissions). **Action:** read `src/content/detector/llm.ts` and `src/background/index.ts` and reuse whatever pattern the existing detector already uses. This is a code-verifiable fact, not a design choice.

## Critical guards the roadmap MUST bake in (from PITFALLS)

1. **Breakage false-positives** — 6 guards: URL gate, container-present, min session activity, "no posts" placeholder, auth check, 30s rolling debounce. (Skeleton/logged-out/non-feed must NOT trigger healing.)
2. **Heal-to-wrong-element** — validation gate before any write: ≥3 matches, ≥80% have `/in/` links, ≥60% have >40-char text, reject if >50% sponsored, must be inside the feed container.
3. **LLM privacy** — send a **structural skeleton only** (strip text/href/src/aria-label); update PRIVACY.md if shipped.
4. **LLM cost loop** — single-flight latch + ≥5-min cool-off (persisted) + per-day hard cap; heuristics-first.
5. **Prompt injection** — text-stripping + strict response validation (no `body`/`html`/`*`; 2–50 matches; never `eval`).
6. **Schema/stale candidates (Wave 1!)** — `selectorsSchemaVersion` from day one, `onInstalled` migration, 30-day TTL/demotion on adapted candidates, **mandatory "Reset to defaults"** escape hatch.
7. **Fixtures must cover PARTIAL breakage** (not just total) + logged-out + skeleton + heal-to-wrong-element + reset round-trip.
8. **Multi-tab race** — `storage.onChanged` cache refresh + re-read-before-write.

## Proposed phase shape (continues numbering from 21)

- **Phase 22 — Externalize selectors to storage (Wave 1).** TS-1, TS-2, TS-6, D-2, schema versioning + migration + reset action (ADAPT-MOD-1), `storage.onChanged` cache (ADAPT-MOD-5 read path), fallback-scope guard (ADAPT-MIN-3), TS-7 (registry coverage). Update CLAUDE.md constraint #1. **Ships with zero behavior change.**
- **Phase 23 — Self-healing adapter (Wave 2).** TS-3 (breakage detection + 6 guards), TS-4 (heuristics + validation gate), TS-5 (LLM fallback + sanitiser + cost/injection controls), D-1/D-3/D-4, breakage alert in SelectorView, TS-7 (healing + partial-breakage + logged-out + skeleton + heal-to-wrong + reset fixtures). LLM live-key integration test is **manual, not CI**. DOM-sanitisation review is a **named deliverable**.

## Watch out for (carry into planning)

- SPA `reinit()` must pick up the refreshed selector cache — explicit test.
- Heuristic/serialization work belongs in `requestIdleCallback`, scoped to the feed container — never `document.body.innerHTML` on the hot path.
- Heuristic attribute vocabulary is **assumed** — verify against live LinkedIn DOM before trusting.

## Open questions (manual verification)

LLM call location (resolve from code) · LinkedIn deploy atomicity (partial vs total breakage) · LinkedIn client-side telemetry · Anthropic rate limits (calibrate cap) · CWS policy on user-key LLM calls.
