# PITFALLS Research — v7.0 Adaptive DOM Scraper

**Milestone:** v7.0 — Adaptive DOM Scraper
**Researched:** 2026-06-06
**Confidence:** HIGH (codebase inspection + established MV3/browser-extension knowledge), except where noted.

## Pitfall → Wave map

| ID | Pitfall | Wave | Severity |
|---|---|---|---|
| ADAPT-CRIT-1 | False-positive breakage detection | W2 | Critical |
| ADAPT-CRIT-2 | Healing onto ads / wrong element | W2 | Critical |
| ADAPT-CRIT-3 | LLM fallback PII (innerHTML) | W2 | Critical |
| ADAPT-CRIT-4 | LLM cost loop (no latch/cool-off) | W2 | Critical |
| ADAPT-CRIT-5 | Prompt injection via page content | W2 | Critical |
| ADAPT-MOD-1 | Schema migration + stale candidates | **W1** | Moderate |
| ADAPT-MOD-2 | Heuristic perf (innerHTML serialization) | W2 | Moderate |
| ADAPT-MOD-3 | LinkedIn detectability of query bursts | W2 | Moderate (LOW conf) |
| ADAPT-MOD-4 | Fixtures miss PARTIAL breakage | W2 | Moderate |
| ADAPT-MOD-5 | Multi-tab storage race | W1+W2 | Moderate |
| ADAPT-MIN-1 | Candidate list unbounded growth | W2 | Minor |
| ADAPT-MIN-2 | Duplicate LLM calls across tabs | W2 | Minor |
| ADAPT-MIN-3 | FEED_CONTAINER_FALLBACK `main` too broad | W1 | Minor |

## Critical

**ADAPT-CRIT-1 — False-positive breakage.** Zero matches is ambiguous: skeleton loader, logged-out/expired session, non-feed page, genuinely empty feed, or scrolled-to-bottom all produce zero post-cards legitimately. **Guards (all):** (1) URL gate (`/feed` or `/`); (2) feed container must be present; (3) min session activity (≥10s on feed + ≥1 mutation) to skip skeleton phase; (4) detect LinkedIn's "no posts" placeholder; (5) auth check (feed nav element present); (6) debounce — zero for ≥30s rolling, not one-shot.

**ADAPT-CRIT-2 — Healing onto the wrong element.** Feed mixes sponsored cards, "People you may know", job inserts, upsell banners — structurally similar to posts. **Validation gate (ALL before write):** ≥3 matches; ≥80% contain `a[href*="/in/"]`; ≥60% contain text >40 chars; reject if >50% match `SPONSORED_MARKER`; not the container/empty; must be inside the feed container.

**ADAPT-CRIT-3 — LLM PII.** Feed `innerHTML` contains other users' names, headlines, post text, photo URLs, URNs — PRIVACY.md says local-only. **Send a structural skeleton only:** strip all text nodes → `[TEXT]`, strip `href`/`src`/`aria-label`, keep tag names + `data-*`/`role`/`componentkey` + nesting; depth-limit ~3–8; truncate ~6k chars. Gate behind a user-configured key. If shipped, **update PRIVACY.md**.

**ADAPT-CRIT-4 — LLM cost loop.** MutationObserver fires hundreds/min; without a latch the LLM is called repeatedly. **Controls (all):** module-level single-flight latch; ≥5-min cool-off persisted to storage (survives SW restart); persist healed candidate immediately; hard cap (e.g. 3 LLM heals/day) surfaced in popup; heuristics-first, LLM only on heuristic failure.

**ADAPT-CRIT-5 — Prompt injection.** Attacker-crafted post text could manipulate the LLM into returning an over-broad selector. **Prevention:** text-stripping (CRIT-3) doubles as injection defense; strict response validation (reject `body`/`html`/`*`/`document`; require 2–50 matches + full CRIT-2 gate); structured JSON output treated as a plain string for `querySelectorAll` (never `eval`); log heals (capped).

## Moderate

**ADAPT-MOD-1 (W1) — schema/stale candidates.** Write `selectorsSchemaVersion` from day 1; `onInstalled` migration; **TTL** on adapted candidates (demote `source:'heuristic'|'llm'` older than 30d below defaults); **mandatory "Reset to defaults"** action in popup; consider separate `selectorDefaults` vs `selectorAdapted` keys so reset clears only adapted.

**ADAPT-MOD-2 (W2) — perf.** Never serialize `document.body.innerHTML` (300–600 KB) on the hot path. Tree-walk the live DOM; run heuristics in `requestIdleCallback`; scope `querySelectorAll` to the feed container; cap ~20 candidate patterns; one attempt per page load (latch).

**ADAPT-MOD-3 (W2, LOW conf) — detectability.** Burst of broad `querySelectorAll` is unusual; use idle-time, stop at first valid candidate, do not touch `window.__initialData__`/`voyager` internals.

**ADAPT-MOD-4 (W2) — fixture blind spots.** The most damaging real breakage is **partial** (e.g. 3 of 20 posts still match) — count never hits zero, healing never fires. Tests must cover: partial-breakage DOM, logged-out fixture, skeleton-loader fixture, heal-to-wrong-element (only sponsored cards → gate must reject), reset-to-defaults round-trip.

**ADAPT-MOD-5 (W1+W2) — multi-tab race.** Two tabs heal concurrently; `storage.set` is last-write-wins; in-memory cache goes stale. Listen for `storage.onChanged` and refresh cache (W1 read path); re-read + compare `adaptedAt` before writing a winner (W2).

## Minor

- **MIN-1 (W2):** cap each candidate list at 10; drop lowest-ranked on write.
- **MIN-2 (W2):** before an LLM call, re-check storage for a candidate healed in the last ~60min and reuse it.
- **MIN-3 (W1):** `FEED_CONTAINER_FALLBACK='main'` is broad — when falling back, still apply the CRIT-2 gate to post-card queries; consider an intermediate `main > div > [data-component-type]` fallback.

## Preserved (v1–v6.1, still valid)

CRIT-1 class-name instability (extended by ranked candidates) · CRIT-2 SW termination (latch/cool-off/healed candidate must persist to storage immediately) · CRIT-3 SPA nav (breakage detector re-runs URL gate; latch resets on nav) · CRIT-4 programmatic block ToS (unchanged). COMMON-1..10 unchanged.

## Research Gaps (verify before locking implementation)

1. LinkedIn deploy atomicity — atomic blue-green vs rolling hydration (decides how critical partial-breakage handling is).
2. LinkedIn client-side telemetry on query patterns (sets MOD-3 risk).
3. Current Anthropic rate limits (calibrate the per-day heal cap).
4. CWS policy on extensions making LLM calls with user-supplied keys.
5. `requestIdleCallback` availability vs target min Chrome version (low risk).
