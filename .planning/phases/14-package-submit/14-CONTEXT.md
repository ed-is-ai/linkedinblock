---
phase: 14-package-submit
milestone: v2.0
requirements: [CWS-05, CWS-06]
status: planning
---

# Phase 14 Context — Package & Submission Guide

## Goal

Last phase of v2.0:
1. `npm run package` → `dist/linkedin-blocker-v1.2.0.zip` (CWS-05)
2. `store/SUBMISSION_GUIDE.md` — step-by-step walkthrough for first-time CWS submission (CWS-06)

## Packaging approach

- Tool: `archiver` npm package (devDependency) — cross-platform, ESM-compatible
- Script: `scripts/package-zip.js` — reads version from `package.json`, zips `dist/` contents (excluding existing `*.zip` files), outputs to `dist/linkedin-blocker-v{version}.zip`
- npm script: `"package": "npm run build && node scripts/package-zip.js"`

## dist/ structure to zip

```
background/
content/
dashboard/
hooks.module.js
icons/
manifest.json
popup/
```

The zip must contain these files at the root level (not nested in a `dist/` folder), matching what Chrome expects when loading an extension package.

## Submission guide coverage

| Step | Notes |
|------|-------|
| Developer account | https://chrome.google.com/webstore/devconsole/register — one-time $5 USD fee |
| Upload ZIP | From the developer dashboard — "New Item" |
| Store listing | Paste from `store/LISTING.md` |
| Privacy policy URL | `https://raw.githubusercontent.com/ed-is-ai/linkedinblock/master/PRIVACY.md` |
| Screenshots | 5 required (1280×800 or 640×400) — see checklist in `store/LISTING.md` |
| Category | Productivity |
| Review timeline | Typically 1–7 business days for new items; can be longer (2–3 weeks) if flagged |

## Files Touched

| Plan | Files |
|------|-------|
| 14-01 | `scripts/package-zip.js`, `package.json` (archiver devDep + package script) |
| 14-02 | `store/SUBMISSION_GUIDE.md` |
