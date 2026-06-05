# Phase 18: Popup Interaction Fixes - Discussion Log

> **Audit trail only.** Do not use as input to planning, research, or execution agents.
> Decisions are captured in CONTEXT.md — this log preserves the alternatives considered.

**Date:** 2026-06-05
**Phase:** 18-popup-interaction-fixes
**Areas discussed:** BUG-01 mechanism, POPUP-02 block semantics, POPUP-03 blocked display

---

## BUG-01 Mechanism

| Option | Description | Selected |
|--------|-------------|----------|
| Proactive hide map | Load thresholdAuthors at init; observer hides immediately without re-scoring | ✓ |
| Re-score but short-circuit | Run detector but skip threshold check if stored peakScore qualifies | |
| You decide | Leave to planner to meet success criteria | |

**User's choice:** Proactive hide map (mirrors blockedAuthors pattern)
**Notes:** —

| Option | Description | Selected |
|--------|-------------|----------|
| Same tombstone (grey, score) | Use existing injectTombstone — consistent UX | ✓ |
| Blocked tombstone (red) | Use red llb-tombstone--blocked style | |
| No tombstone, just hide | llb-hidden only | |

**User's choice:** Same tombstone as scored posts
**Notes:** Not manually blocked, so red tombstone would be misleading

| Option | Description | Selected |
|--------|-------------|----------|
| Yes — live via storage.onChanged | thresholdAuthors updates when threshold changes | ✓ |
| No — page reload only | Map loaded once at init | |

**User's choice:** Live update via storage.onChanged

---

## POPUP-02 Block Semantics

| Option | Description | Selected |
|--------|-------------|----------|
| Local only — no navigation | Write status: 'blocked', remove window.open entirely | ✓ |
| Local + report link | Write to storage AND show optional 'Report on LinkedIn' link | |

**User's choice:** Local only — no navigation
**Notes:** window.open call removed from handleBlock

| Option | Description | Selected |
|--------|-------------|----------|
| Keep in flaggedAccounts | status: 'blocked' in same key — no schema change | ✓ |
| Separate blockedAccounts key | Move blocked entries to new storage key | |

**User's choice:** Keep in flaggedAccounts (status: 'blocked')

---

## POPUP-03 Blocked Display

| Option | Description | Selected |
|--------|-------------|----------|
| Same list, bottom | Blocked rows after pending, greyed, one unified list | |
| Separate section below | Divider + collapsible 'Blocked (N)' section | ✓ |
| Same list, sorted by status | Pending then blocked with light divider | |

**User's choice:** Separate section below

| Option | Description | Selected |
|--------|-------------|----------|
| Greyed name + 'Blocked' badge, no buttons | Name #9ca3af, small chip, Block/Dismiss hidden | ✓ |
| Full row greyed out + disabled button | opacity: 0.5, disabled 'Blocked' button | |
| You decide | Leave visual to planner | |

**User's choice:** Greyed name + 'Blocked' badge, no buttons

| Option | Description | Selected |
|--------|-------------|----------|
| Collapsible with count | 'Blocked (N) ▾' toggle — compact | ✓ |
| Always visible | Always expanded | |

**User's choice:** Collapsible with count

---

## Claude's Discretion

- Default expand/collapse state of the Blocked section
- Exact grey shade for name text and chip (within existing palette)

## Deferred Ideas

- "Report on LinkedIn" link — out of scope for Phase 18; user chose local-only block
- Unblock from popup — deferred to Phase 19 (BLOCK-02)
