# Phase 22: Externalize Selectors to Storage - Discussion Log

> **Audit trail only.** Do not use as input to planning, research, or execution agents.
> Decisions are captured in CONTEXT.md — this log preserves the alternatives considered.

**Date:** 2026-06-06
**Phase:** 22-externalize-selectors-to-storage
**Areas discussed:** Health view location, Reset-to-defaults UX, Migration scope, Stale-selector warning policy

---

## Health View Location

| Option | Description | Selected |
|--------|-------------|----------|
| Dashboard, always visible | SelectorView panel in dashboard; keeps popup compact; dashboard already hosts feed-health/diagnostic data | ✓ |
| Popup, behind disclosure | Collapsible section in popup (like Settings); reachable without a new tab | |
| Both popup + dashboard | Compact warning in popup + full table in dashboard; max discoverability, two render sites | |

**User's choice:** Dashboard, always visible
**Notes:** Selector health is diagnostic data — natural fit for the dashboard alongside existing feed-health stats.

---

## Reset-to-Defaults UX

| Option | Description | Selected |
|--------|-------------|----------|
| Inline confirm step | Click Reset → morphs into "Confirm reset?" before commit; reuses Phase 20 batch-block pattern | ✓ |
| One-click, no confirm | Immediate reset; defensible since no adapted candidates exist yet in Phase 22 | |
| Confirm + result toast | Inline confirm plus a "reset to defaults" confirmation message | |

**User's choice:** Inline confirm step
**Notes:** Consistency with the existing BatchBlockBar inline-confirm pattern; prevents accidental wipe once Phase 23 healing produces adapted candidates.

---

## Migration Scope

| Option | Description | Selected |
|--------|-------------|----------|
| All consumers (full) | Migrate observer.ts, exclusions.ts, detector/comment-expand.ts, detector/signals/profile.ts | ✓ |
| Only the two named | Migrate just observer.ts + exclusions.ts (success-criteria text); leaves 2 files importing directly | |
| All consumers + selectors.ts header note | Full migration + CLAUDE.md / selectors.ts doc update (SELECTOR-10) in same phase | |

**User's choice:** All consumers (full)
**Notes:** Scout found 4 runtime consumers, not the 2 named in success criteria. Full migration is what actually satisfies constraint #1 and lets all selectors self-heal in Phase 23. SELECTOR-10 doc update is a locked requirement and folded in regardless (captured as D-08).

---

## Stale-Selector Warning Policy

| Option | Description | Selected |
|--------|-------------|----------|
| Core targets, 7-day warn | Warn for detection-gating selectors not matched in 7 days; distinct from 30-day TTL | |
| All targets, on session miss | Warn for any target with zero matches this session; more immediate, noisier | ✓ (then refined) |
| You decide at plan time | Defer critical-set and threshold to planner | |

**User's choice:** All targets, on session miss — refined to: feed-essential targets warn ("red") on session miss; contextual/optional targets shown neutral ("grey", no alarm)

### Refinement: Warn scope

| Option | Description | Selected |
|--------|-------------|----------|
| Feed-essential = red, rest = grey | FEED_CONTAINER, POST_CARD, POST_AUTHOR_LINK, POST_BODY_TEXT warn on miss; comments/headline/degree/reshare neutral | ✓ |
| Any target on miss (as picked) | Every zero-match target warns, including contextual ones | |

**User's choice:** Feed-essential = red, rest = grey
**Notes:** Avoids false alarms on selectors (comments, headline, connection-degree, reshare) that legitimately don't appear during a plain feed scroll. Warning is distinct from the 30-day adapted-candidate TTL.

---

## Claude's Discretion

- Source-badge label strings, health-table layout/styling.
- Candidate-list cap (≤10) enforcement mechanics.
- Cross-tab `onChanged` test approach.
- Whether attribute-name / URL-pattern "selectors" (`POST_URN_ATTR`, `COMPANY_PAGE_MARKER`, `FEED_CONTAINER_FALLBACK`, `POST_AUTHOR_NAME`) are modeled as registry targets or kept as seed constants — schema must accommodate both.

## Deferred Ideas

- Manual selector editing / override UI — future (keep v7.0 read-only).
- Per-selector reset — future; v7.0 reset is all-or-nothing.
- Breakage event log in health view — Phase 23 / future.
- Auto-promotion after N consecutive matches — Phase 23 (ADAPT-08).
- All self-healing (breakage detection, heuristics, LLM fallback, privacy disclosure) — Phase 23.
