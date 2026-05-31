# LinkedIn Blocker

## What This Is

A Chrome extension (Manifest V3) that detects and hides AI-generated posts on LinkedIn, surfaces suspicious accounts in a popup for review, and lets the user decide whether to block them permanently. The goal is a clean, human-authored feed.

## Core Value

**One thing that must work:** AI-bot posts are hidden automatically before the user sees them, with a reviewable list of flagged accounts in the extension popup.

## Who It's For

Personal tool first (the author's own LinkedIn feed). Architecture supports publishing to the Chrome Web Store — v2.0 completes that path.

## The Problem

LinkedIn feeds are increasingly polluted with AI-generated content from fake or automated accounts — motivational fluff, listicles, generic inspiration, and accounts with no real history posting at high frequency. There is no native way to filter these out.

## How It Works

### Detection (heuristics-first, LLM-ready)

Three signal types are combined to produce a bot-probability score per account/post:

1. **Post content signals** — AI writing patterns: listicles, buzzwords, em-dash overuse, generic inspiration, no personal specificity
2. **Profile signals** — AI-generated headshot indicator, thin connection count, generic bio patterns
3. **Engagement signals** — identical or near-identical comments, unusual reaction-to-comment ratios

Detection starts as rule-based heuristics. The architecture allows plugging in an LLM API call (Claude) without a rewrite — the `Detector` interface is already in place.

### Actions

- **Auto-hide** posts that cross a suspicion threshold (user never sees them in the feed)
- **Flag** the source account and add it to the review queue
- **Extension popup** shows the queue of suspicious accounts with post counts and signals detected
- **User review** — from the popup, user can: confirm block (trigger LinkedIn block), dismiss (mark as false positive), or ignore for now

## Key Decisions

| Decision | Rationale | Outcome |
|----------|-----------|---------|
| Chrome MV3 only (v1) | Mainstream browser, required for Web Store publishing | Proceed with MV3 |
| Heuristic detection first | Ship fast, private, no API cost — LLM pluggable later | Implement scoring rules, design for LLM upgrade |
| Extension popup for review | Least intrusive — doesn't inject permanent UI into LinkedIn | Popup as primary review surface |
| Local-only storage | No backend, no account, no privacy risk | chrome.storage.local |
| Block action | ToS risk with programmatic clicks | Deep-link to /overlay/report-or-block/ only |
| Icons in src/public/icons/ | Vite publicDir with root: 'src' — copied verbatim to dist/ | Required for vite-plugin-web-extension |

## Requirements

### Validated (v1.0 complete)

- Extension detects AI-pattern posts using content heuristics ✓
- Suspicious posts are hidden automatically in the LinkedIn feed ✓
- Flagged accounts are queued for review ✓
- Extension popup displays the review queue with signals ✓
- User can confirm block from popup ✓
- User can dismiss false positives from popup ✓
- Detection thresholds are configurable ✓
- Detection engine is pluggable (heuristic → LLM swap) ✓
- Dedicated dashboard page with % flagged, signal categories, 7/30-day window ✓

### Validated (v1.1 complete)

- Post text and metadata are stored locally when a post is hidden ✓
- Popup account rows are expandable (signal score table + post snippets) ✓
- Stored posts viewable per account in popup ✓
- Export JSON (accounts + posts) and Export CSV (accounts) ✓
- Date-based cleanse with preview and confirm ✓

### Validated (v1.2 complete)

- Dashboard shows "profile bot rate": % of unique profiles seen in the time window that are flagged accounts ✓
- Posts CSV export: download stored hidden posts with their text as a CSV file ✓

### Validated (v2.0 complete)

- Branded extension icons at 16/48/128px ✓
- manifest.json v1.2.0 with all CWS-required fields ✓
- PRIVACY.md data policy accessible as raw GitHub URL ✓
- store/LISTING.md with name, short/long descriptions, permissions justification, screenshot checklist ✓
- npm run package → CWS-ready ZIP (27.6 KB) ✓
- store/SUBMISSION_GUIDE.md — 6-step first-time CWS submission walkthrough ✓

### Out of Scope (deferred post-v2)

- Firefox support — Chrome only; WebExtensions API differences deferred
- LLM-based detection — heuristics only in v1/v2; pluggable interface prepared for v3
- Cloud sync or shared blocklists — local only
- Backend / user accounts — no server
- Posting frequency signals — excluded (scheduling tools cause too many false positives)

## Milestone History

| Milestone | Goal | Status |
|-----------|------|--------|
| v1.0 | Core detection, popup queue, block/dismiss, settings & dashboard | Complete 2026-05-30 |
| v1.1 | Post storage, signal detail view, export, date-based cleanse | Complete 2026-05-30 |
| v1.2 | Profile bot-rate stat, posts CSV export | Complete 2026-05-30 |
| v2.0 | Chrome Web Store release — icons, privacy policy, store listing, packaging | Complete 2026-05-31 |
| v3.0 | Repo rename cleanup — update all `linkedinblock` → `linkedinaivoiceblock` references | Complete 2026-05-31 |
| v4.0 | Prompt caching — reduce LLM API cost ~90% on cache hits | Active |

---
*Last updated: 2026-05-31 — v4.0 milestone started (prompt caching)*
