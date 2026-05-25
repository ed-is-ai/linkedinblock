# Phase 2: Detection Engine - Discussion Log

> **Audit trail only.** Do not use as input to planning, research, or execution agents.
> Decisions are captured in CONTEXT.md — this log preserves the alternatives considered.

**Date:** 2026-05-25
**Phase:** 2-Detection Engine
**Areas discussed:** Signal scope, Hidden post UX, Scoring defaults, First-post treatment, Reshare handling, Badge update timing

---

## Signal Scope

### Profile signals (DETECT-06)

| Option | Description | Selected |
|--------|-------------|----------|
| Include profile signals | Headline formula, connection count, job title — in feed DOM without navigating | |
| Content signals only | Just DETECT-01–05, simpler and faster to build | ✓ |

**User's choice:** Content signals only — DETECT-06 deferred to Phase 3
**Notes:** None

---

### Engagement signals (DETECT-07)

| Option | Description | Selected |
|--------|-------------|----------|
| No — defer engagement signals | Comment DOM only available when user expands; better suited to Phase 3 | |
| Yes — include comment/reaction signals | Generic comment patterns, reaction ratio anomalies | ✓ |

**User's choice:** Include engagement signals in Phase 2

### Comment loading approach

| Option | Description | Selected |
|--------|-------------|----------|
| Only when already expanded | Score comments if user has already opened them | |
| Automatically expand all comments | Pro-actively click expand to read comments | ✓ |

**User's choice:** Auto-expand comments on high-scoring posts
**Notes:** Researcher must verify whether programmatic click on comment expand button is ToS-safe (read-only action)

---

## Hidden Post UX

### What users see when a post is hidden

| Option | Description | Selected |
|--------|-------------|----------|
| Collapsed tombstone | "1 post hidden (74/100) ▼ reveal" — click to expand | ✓ |
| Invisible — display:none | Post disappears entirely | |
| Score badge on post | Post stays visible with a warning badge | |

**User's choice:** Collapsed tombstone

### Tombstone content

| Option | Description | Selected |
|--------|-------------|----------|
| Score + author name | "Post by John Smith hidden (74/100) ▼ reveal" | ✓ |
| Score only | "1 post hidden (74/100) ▼ reveal" | |
| Just a toggle | "1 post hidden ▼ reveal" | |

**User's choice:** Score + author name

---

## Scoring Defaults

### Auto-hide threshold

| Option | Description | Selected |
|--------|-------------|----------|
| 60/100 — conservative | Research-recommended; minimises false positives | ✓ |
| 45/100 — moderate | Catches more borderline cases | |
| 75/100 — strict | Very few false positives; may miss AI content | |

**User's choice:** 60/100

### Flag-only tier

| Option | Description | Selected |
|--------|-------------|----------|
| Yes — two tiers (35–59 flag, 60+ hide) | Borderline posts visible in review queue | ✓ |
| No — hide-or-ignore only | Simpler; no borderline category | |

**User's choice:** Yes — two tiers. 35–59 = flag only, 60+ = auto-hide

---

## First-Post Treatment

| Option | Description | Selected |
|--------|-------------|----------|
| Flag-only on first post, hide from second | Benefit of the doubt for new accounts | |
| Auto-hide immediately if score ≥ 60 | Consistent with threshold; no grace period | ✓ |

**User's choice:** Auto-hide immediately

---

## Reshare Handling

| Option | Description | Selected |
|--------|-------------|----------|
| Score original author | Original post is the problem; resharer is amplifying it | ✓ |
| Score resharer | Person in user's feed is the resharer | |
| Skip reshares entirely | Avoid ambiguity | |

**User's choice:** Score original author, not resharer
**Notes:** Requires detecting reshare DOM structure; researcher to identify selector

---

## Badge Update Timing

| Option | Description | Selected |
|--------|-------------|----------|
| Posts hidden this session | Resets on browser restart; shows session activity | ✓ |
| Total all-time | Cumulative lifetime count | |

**User's choice:** Session count only

---

## Claude's Discretion

- Exact regex patterns for listicle/CTA detection (FEATURES.md has starting sets)
- Buzzword list composition
- Internal file structure for HeuristicDetector (one file vs. signal modules)
- Tombstone CSS injection approach (extend existing style tag or separate)
- Language detection implementation detail

## Deferred Ideas

- DETECT-06 profile signals → Phase 3
- Recruiter threshold penalty → Phase 3 (depends on headline reading = profile signals)
- Score decay (rolling 30-day history) → Phase 3
- First-post grace period → explicitly rejected by user
