---
plan: 13-02
status: complete
completed_at: "2026-05-30"
---

## Summary

Created `store/LISTING.md` — the Chrome Web Store listing copy ready to paste into the CWS Developer Dashboard.

The file contains all required sections:

- **Name** — "LinkedIn Blocker" (15 chars, within 45-char limit)
- **Short description** — 132 chars, exactly at the CWS limit
- **Detailed description** — full copy covering how it works, review queue, dashboard, configuration, optional AI detection, and privacy statement
- **Category** — Productivity
- **Keywords / tags** — 8 relevant tags
- **Permissions justification** — table covering `storage`, `activeTab`, `https://www.linkedin.com/*`, and `https://api.anthropic.com/*`; includes single-purpose statement
- **Screenshots checklist** — 5 screenshots specified with captions and recommended dimensions (1280×800 or 640×400)
- **Store icon** — references `src/public/icons/icon-128.png`
- **Privacy policy URL** — points to the GitHub raw PRIVACY.md

Permissions and host_permissions were confirmed against `src/manifest.json` (version 1.2.0) before writing.
