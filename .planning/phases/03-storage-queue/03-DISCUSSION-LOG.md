# Phase 3: Storage & Queue - Discussion Log

> **Audit trail only.** Do not use as input to planning, research, or execution agents.
> Decisions are captured in CONTEXT.md — this log preserves the alternatives considered.

**Date:** 2026-05-29
**Phase:** 3-Storage & Queue
**Areas discussed:** Rolling score strategy, Profile signals (DETECT-06), Storage cap & eviction, dismissedAccounts schema

---

## Rolling Score Strategy

| Option | Description | Selected |
|--------|-------------|----------|
| Keep peak (Math.max) | compositeScore = Math.max(existing, new). Phase 2 already does this. | |
| Weighted rolling average | (existing × postCount + new) / (postCount + 1). Equal weight per post. | ✓ initial |
| Latest score wins | compositeScore = new score every time. Volatile. | |

**User's choice:** Weighted rolling average — then refined to EMA

Follow-up questions:

| Option | Description | Selected |
|--------|-------------|----------|
| Yes, keep peakScore too | Store both compositeScore (rolling avg) and peakScore (Math.max). | ✓ |
| Average only | Drop peakScore. One score per account. | |

| Option | Description | Selected |
|--------|-------------|----------|
| Assume postCount = 1 | Initialise existing Phase 2 entries without postCount to 1. | ✓ |
| Assume postCount = hiddenPostUrns.length | Closer to reality but undercounts flag-only posts. | |
| Reset postCount to 0 | Treat all Phase 2 entries as stale. | |

| Option | Description | Selected |
|--------|-------------|----------|
| Equal weight | (existing × postCount + new) / (postCount + 1). Simple, stable. | |
| Recency-weighted (EMA) | compositeScore = compositeScore × 0.8 + newScore × 0.2. Recent posts matter more. | ✓ |
| You decide | Leave strategy to planner. | |

| Option | Description | Selected |
|--------|-------------|----------|
| α = 0.2 | 80% old, 20% new. Conservative, stable. | ✓ |
| α = 0.3 | Faster rehabilitation/condemnation. | |
| You decide | Leave to planner as named constant. | |

**Notes:** User refined from a simple rolling average to EMA after seeing the options. α = 0.2 chosen as conservative default — makes rehabilitation slow, which is the right bias for a bot-detection tool.

---

## Profile Signals (DETECT-06)

| Option | Description | Selected |
|--------|-------------|----------|
| Include in Phase 3 | Phase 3 adds headline formula + degree signals alongside storage work. | ✓ |
| Defer to Phase 6 | Bundle DETECT-06 into Settings & Dashboard phase. | |
| Defer indefinitely | Post-v1 backlog. | |

**Signals selected (multi-select):**

| Signal | Selected |
|--------|----------|
| Headline formula patterns | ✓ |
| Connection degree proxy (3rd+) | ✓ |
| AI headshot detection | |

**User's choice:** Headline formula + connection degree only. AI headshot excluded as too fragile.

| Option | Description | Selected |
|--------|-------------|----------|
| Low weight 5–10 pts each | Profile signals tip borderline posts, can't auto-hide alone. | ✓ |
| Medium weight 10–20 pts each | Higher recall, higher false positive risk. | |
| You decide | Leave to planner. | |

| Option | Description | Selected |
|--------|-------------|----------|
| Same signals Record | Merge into existing signalBreakdown. No new schema field. | ✓ |
| Separate profileSignals field | Keeps profile vs content distinct. New field needed. | |

**Headline patterns (multi-select):**

| Pattern | Selected |
|---------|----------|
| Speaker \| Coach \| Mentor combos | ✓ |
| 'Helping X achieve Y' templates | Not selected |
| Buzzword-heavy job titles | ✓ |
| You decide | ✓ (researcher picks further patterns) |

| Option | Description | Selected |
|--------|-------------|----------|
| Once per authorId, cached | Extract once, cache in Map. Skip re-extraction same session. | ✓ |
| Every post, same pipeline | Fresh extraction per post. Simpler but redundant. | |

**Notes:** 'Helping X achieve Y' was deferred to researcher to decide on inclusion. Profile signal cache resets on SPA navigation (same hook as comment-expand budget).

---

## Storage Cap & Eviction

| Option | Description | Selected |
|--------|-------------|----------|
| Lowest compositeScore | Evict least suspicious account. | ✓ |
| Oldest firstSeenAt | FIFO. Risk: high-scorer evicted for low-scorer. | |
| Longest since lastSeenAt | Evict stalest entry. | |

| Option | Description | Selected |
|--------|-------------|----------|
| No proactive eviction | Only evict on cap hit. | ✓ |
| Evict entries below score 20 | Cleanup on each write. | |
| TTL-based 90 days | Remove stale entries on write. | |

| Option | Description | Selected |
|--------|-------------|----------|
| Separate dismissedAccounts key, own cap | dismissedAccounts: string[], cap 200. | ✓ |
| Same flaggedAccounts object, status field | All 500 slots shared. | |

**Notes:** Dismissed accounts stored separately to avoid competing with pending queue entries for the 500-slot cap.

---

## dismissedAccounts Schema

| Option | Description | Selected |
|--------|-------------|----------|
| Set of authorIds (string[]) | dismissedAccounts: string[]. Minimal storage, simple lookup. Cap 200. | ✓ |
| Record with timestamps | Record<string, { dismissedAt: number }>. Enables future decay. | |

**Notes:** Simple array sufficient for v1. Phase 5 writes to it; Phase 3 just declares the key and type.

---

## Claude's Discretion

- EMA α constant name (`EMA_ALPHA` or similar)
- Whether profile signal cache is `Map<string, Record<string, number>>` or plain Record
- Whether `persistFlaggedAccount` moves to `src/shared/queue.ts` (only if it grows beyond ~60 lines)
- Exact headline buzzword list — researcher determines from FEATURES.md + common patterns

## Deferred Ideas

- AI headshot detection — excluded from Phase 3, too fragile without LLM
- `status` field expansion (`'blocked' | 'dismissed'`) — Phase 5 expands this
- Score decay / time-based rehabilitation — EMA handles this partially; full decay deferred
- Recruiter threshold penalty — requires headline reading (Phase 3 adds it) but configuration is Phase 6
- `'Helping X achieve Y'` headline pattern — left to researcher to include or exclude
