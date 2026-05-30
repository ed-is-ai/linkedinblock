# Chrome Web Store — Submission Guide

First-time submission walkthrough for LinkedIn Blocker v1.2.0.

---

## Prerequisites

Before you start, ensure you have:

- [ ] Run `npm run package` — produces `dist/linkedin-blocker-v1.2.0.zip`
- [ ] Taken the 5 screenshots listed in `store/LISTING.md` (Screenshots checklist section)
- [ ] A Google account to use as the developer account

---

## Step 1 — Register as a Chrome Web Store developer

**One-time setup. Skip if already registered.**

1. Go to: https://chrome.google.com/webstore/devconsole/register
2. Sign in with your Google account
3. Pay the **one-time $5 USD registration fee**
4. Accept the developer agreement
5. Your developer dashboard will open at: https://chrome.google.com/webstore/devconsole

---

## Step 2 — Create a new item

1. Go to: https://chrome.google.com/webstore/devconsole
2. Click **"New item"**
3. Click **"Choose file"** and upload `dist/linkedin-blocker-v1.2.0.zip`
4. Click **"Upload"** — Chrome will parse the manifest and create a draft listing

---

## Step 3 — Fill in the Store listing tab

All copy-paste text is in `store/LISTING.md`.

| Field | Value / Source |
|-------|---------------|
| **Name** | `LinkedIn Blocker` |
| **Short description** | Copy from `store/LISTING.md` → "Short description" (132 chars) |
| **Detailed description** | Copy from `store/LISTING.md` → "Detailed description" code block |
| **Category** | `Productivity` |
| **Language** | English |
| **Store icon** | Upload `src/public/icons/icon-128.png` (128×128 PNG) |
| **Screenshots** | Upload the 5 screenshots from your checklist |
| **Homepage URL** | `https://github.com/ed-is-ai/linkedinblock` |

### Screenshots

You need **exactly 5** at 1280×800 or 640×400 pixels. See the checklist in `store/LISTING.md` for what to capture. Tips:
- Use Chrome DevTools device toolbar to lock the viewport to 1280×800
- Take screenshots before and after scrolling to show both the hidden-post tombstones and the popup

---

## Step 4 — Fill in the Privacy practices tab

1. Click the **"Privacy practices"** tab
2. Under **"privacy policy"**, paste:
   ```
   https://raw.githubusercontent.com/ed-is-ai/linkedinblock/master/PRIVACY.md
   ```
3. Under **"Single purpose"**, paste the statement from `store/LISTING.md` → "Single purpose statement":
   > LinkedIn Blocker has a single purpose: detecting and hiding AI-generated posts on LinkedIn using local heuristic scoring, with an optional AI-powered second-opinion mode.
4. Under **"Permissions justification"**, use the table from `store/LISTING.md` → "Permissions justification" — one entry per permission.

---

## Step 5 — Submit for review

1. Review all tabs — ensure no fields show a red error indicator
2. Click **"Submit for review"**
3. Confirm the submission dialog

---

## Step 6 — Wait for review

| Outcome | Typical timeline |
|---------|-----------------|
| Approved | 1–7 business days for first submission |
| Needs changes | You'll receive an email with the rejection reason; fix and resubmit |
| Extended review | Can take 2–3 weeks if the extension is flagged for manual review |

Monitor the **"Status"** column in your developer dashboard. You'll also get an email when the status changes.

---

## Updating the extension after approval

For future updates:
1. Bump the version in `package.json` and `src/manifest.json` (keep them in sync)
2. Run `npm run package`
3. In the developer dashboard, click the extension → **"Package"** tab → **"Upload new package"**
4. Upload the new ZIP and submit for review

---

## Useful links

| Resource | URL |
|----------|-----|
| CWS Developer Dashboard | https://chrome.google.com/webstore/devconsole |
| CWS Developer Policies | https://developer.chrome.com/docs/webstore/program-policies |
| Extension review guidelines | https://developer.chrome.com/docs/webstore/review-process |
| MV3 migration guide | https://developer.chrome.com/docs/extensions/develop/migrate |
