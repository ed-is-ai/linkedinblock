# LinkedIn Blocker

## What This Is

A Chrome extension (Manifest V3) that detects and hides AI-generated posts on LinkedIn, surfaces suspicious accounts in a popup for review, and lets the user decide whether to block them permanently. The goal is a clean, human-authored feed.

## Core Value

**One thing that must work:** AI-bot posts are hidden automatically before the user sees them, with a reviewable list of flagged accounts in the extension popup.

## Who It's For

Personal tool first (the author's own LinkedIn feed). Architecture should support publishing to the Chrome Web Store later if desired.

## The Problem

LinkedIn feeds are increasingly polluted with AI-generated content from fake or automated accounts — motivational fluff, listicles, generic inspiration, and accounts with no real history posting at high frequency. There is no native way to filter these out.

## How It Works

### Detection (heuristics-first, LLM-ready)

Three signal types are combined to produce a bot-probability score per account/post:

1. **Post content signals** — AI writing patterns: listicles, buzzwords, suspiciously clean grammar, generic inspiration, no personal specificity
2. **Profile signals** — AI-generated headshot, thin history, generic bio, no meaningful connections
3. **Engagement patterns** — identical comments, mutual bot interactions, unusual reaction ratios

Detection starts as rule-based heuristics. The architecture must allow plugging in an LLM API call later without a rewrite.

### Actions

- **Auto-hide** posts that cross a suspicion threshold (user never sees them in the feed)
- **Flag** the source account and add it to the review queue
- **Extension popup** shows the queue of suspicious accounts with post counts and signals detected
- **User review** — from the popup, user can: confirm block (trigger LinkedIn block), dismiss (mark as false positive), or ignore for now

## Constraints

- Chrome Manifest V3 (service workers, no persistent background pages)
- No backend — all data stored locally (chrome.storage)
- LinkedIn DOM is the data source — no official API
- Detection must work entirely client-side for v1 (no API calls)
- Must not break LinkedIn's own functionality

## Key Decisions

| Decision | Rationale | Outcome |
|----------|-----------|---------|
| Chrome MV3 only (v1) | Mainstream browser, required for Web Store publishing | Proceed with MV3 |
| Heuristic detection first | Ship fast, private, no API cost — LLM pluggable later | Implement scoring rules, design for LLM upgrade |
| Extension popup for review | Least intrusive — doesn't inject permanent UI into LinkedIn | Popup as primary review surface |
| Local-only storage | No backend, no account, no privacy risk | chrome.storage.local |

## Requirements

### Validated

(None yet — ship to validate)

### Active

- [ ] Extension detects AI-pattern posts using content heuristics
- [ ] Extension detects suspicious profiles using profile signals
- [ ] Extension detects bot-like engagement patterns
- [ ] Suspicious posts are hidden automatically in the LinkedIn feed
- [ ] Flagged accounts are queued for review
- [ ] Extension popup displays the review queue with signals
- [ ] User can confirm block from popup (triggers LinkedIn block)
- [ ] User can dismiss false positives from popup
- [ ] Detection thresholds are configurable
- [ ] Detection engine is pluggable (heuristic → LLM swap)

### Out of Scope (v1)

- Firefox support — ship Chrome first
- LLM-based detection — heuristics only in v1
- Cloud sync or shared blocklists — local only
- Backend / user accounts — no server
- Posting frequency signals — excluded from detection (user did not select this)

## Evolution

This document evolves at phase transitions and milestone boundaries.

**After each phase transition** (via `/gsd-transition`):
1. Requirements invalidated? → Move to Out of Scope with reason
2. Requirements validated? → Move to Validated with phase reference
3. New requirements emerged? → Add to Active
4. Decisions to log? → Add to Key Decisions
5. "What This Is" still accurate? → Update if drifted

**After each milestone** (via `/gsd-complete-milestone`):
1. Full review of all sections
2. Core Value check — still the right priority?
3. Audit Out of Scope — reasons still valid?
4. Update Context with current state

---
*Last updated: 2026-05-25 after initialization*
