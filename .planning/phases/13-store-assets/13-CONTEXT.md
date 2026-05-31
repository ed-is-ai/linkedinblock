---
phase: 13-store-assets
milestone: v2.0
requirements: [CWS-03, CWS-04]
status: planning
---

# Phase 13 Context — Store Assets

## Goal

Produce the two written artefacts needed before CWS submission:
1. `PRIVACY.md` — data practices disclosure (raw GitHub URL required by CWS)
2. `store/LISTING.md` — store listing copy: name, descriptions, category, keywords, screenshot checklist

## Data collected by the extension (for PRIVACY.md accuracy)

| Data | Where | User-initiated? |
|------|-------|----------------|
| Flagged account records (ID, name, URL, scores, signals, URNs) | `chrome.storage.local` | No — automatic on flag |
| Stored post text + metadata (urn, score, hiddenAt) | `chrome.storage.local` | Implicit — triggered when post is hidden |
| Daily stats (seen/hidden counts, seenProfileIds) | `chrome.storage.local` | No — automatic |
| Dismissed account IDs | `chrome.storage.local` | Yes — user clicks Dismiss |
| Anthropic API key | `chrome.storage.local` | Yes — user sets manually via DevTools |

**All data is local only.** The only external call is to `api.anthropic.com` when the user has explicitly set an API key — that is a deliberate opt-in.

## Privacy policy URL

Raw GitHub URL: `https://raw.githubusercontent.com/ed-is-ai/linkedinaivoiceblock/master/PRIVACY.md`

## Store listing decisions

| Field | Value |
|-------|-------|
| Name | LinkedIn Blocker |
| Version | 1.2.0 |
| Category | Productivity |
| Short description | ≤132 chars |
| Detailed description | ≥300 words |
| Permissions justification | `storage`, `activeTab`, `linkedin.com`, `api.anthropic.com` (opt-in LLM) |
| Screenshots needed | 5 (1280×800 or 640×400) — user captures manually |

## Files Touched

| Plan | Files |
|------|-------|
| 13-01 | `PRIVACY.md` |
| 13-02 | `store/LISTING.md` |
