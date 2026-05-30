# Chrome Web Store Listing — LinkedIn Blocker

> Paste each section into the corresponding field in the CWS Developer Dashboard.
> https://chrome.google.com/webstore/devconsole

---

## Name

```
LinkedIn Blocker
```
*(15 characters — limit 45)*

---

## Short description

```
Automatically hides AI-generated posts in your LinkedIn feed and flags suspicious accounts for review. All data stays on your device.
```
*(132 characters — limit 132)*

---

## Detailed description

```
LinkedIn Blocker automatically detects and hides AI-generated posts in your LinkedIn feed, so you see fewer bot-written listicles, generic motivational fluff, and low-effort content.

HOW IT WORKS

As you scroll through LinkedIn, the extension analyses each post using heuristic scoring across several signal categories:

• AI language signals — em-dash overuse, listicle structure, generic calls-to-action, buzzword density, motivational templates
• Profile signals — AI-generated headlines, low connection degrees, thin account history
• Engagement signals — identical or near-identical comments on multiple posts

Posts that exceed a configurable score threshold are automatically hidden in your feed with a dismissible tombstone. Hard exclusions prevent false positives: sponsored posts, company-page posts, and non-English content are never flagged.

REVIEW QUEUE

Every flagged account is added to a review queue accessible from the extension popup. Each entry shows the account name, the signals that fired, the composite score, and the number of suspicious posts seen. You can expand any row to see the full signal breakdown and snippets of the hidden posts.

From the popup you can:
• Block — opens LinkedIn's own block/report overlay so you can act through LinkedIn's official flow
• Dismiss — marks the account as a false positive and unhides their posts

DASHBOARD

Click "View Dashboard" to open a feed-health summary showing:
• Total posts hidden (all time)
• Percentage of posts flagged in the last 7 or 30 days
• Profile bot rate — what percentage of the unique people you saw in the feed are flagged accounts
• Signal category breakdown (AI language vs bot behaviour)

You can also export your data as JSON or CSV for your own analysis, and use the date-based cleanse tool to remove old records.

CONFIGURATION

Adjust the auto-hide threshold (35–90) from the popup settings panel. Lower values flag more content; higher values flag less. The default (60) is conservative to minimise false positives.

OPTIONAL AI-POWERED DETECTION

Advanced users can enable Claude AI-powered detection by setting an Anthropic API key. When active, the extension sends post text to Anthropic's API for a second-opinion score. This feature is entirely opt-in — the extension works fully offline by default.

PRIVACY

All data is stored locally using Chrome's built-in storage (chrome.storage.local). Nothing is transmitted to any server in the default configuration. Full privacy policy: https://raw.githubusercontent.com/ed-is-ai/linkedinblock/master/PRIVACY.md
```

---

## Category

```
Productivity
```

---

## Keywords / tags

```
linkedin, AI, spam, content filter, bot, feed cleaner, heuristic, AI detection
```

---

## Permissions justification
*(For the CWS review form — "Single purpose" and "Permissions" fields)*

| Permission | Justification |
|------------|---------------|
| `storage` | Stores flagged accounts, hidden post history, daily statistics, and user settings in `chrome.storage.local`. All data remains on the user's device. |
| `activeTab` | Reads the active LinkedIn tab to display the badge count of hidden posts. |
| `https://www.linkedin.com/*` | The extension's content script runs only on LinkedIn to observe the feed and hide flagged posts. |
| `https://api.anthropic.com/*` | Used only when the user explicitly sets an Anthropic API key to enable optional AI-powered detection. Not contacted in default operation. |

**Single purpose statement:**
> LinkedIn Blocker has a single purpose: detecting and hiding AI-generated posts on LinkedIn using local heuristic scoring, with an optional AI-powered second-opinion mode.

---

## Screenshots checklist
*(5 screenshots required — capture at 1280×800 or 640×400 pixels)*

- [ ] **Screenshot 1 — Feed with hidden posts**
      Browse LinkedIn with the extension active. Scroll until several tombstones ("Post hidden by LinkedIn Blocker") are visible. Capture the feed.

- [ ] **Screenshot 2 — Extension popup (flagged accounts)**
      Click the extension icon to open the popup. Show a list of flagged accounts with signal chips and scores.

- [ ] **Screenshot 3 — Popup expanded row**
      Expand one account row to show the signal score table and post snippets.

- [ ] **Screenshot 4 — Dashboard feed health stats**
      Open the dashboard (Settings → View Dashboard). Show the stats card with post-hide rate and profile bot rate.

- [ ] **Screenshot 5 — Dashboard data management**
      Scroll to the Data management card showing the Export JSON / Export CSV / Export Posts CSV buttons and the Cleanse control.

---

## Store icon

Use `src/public/icons/icon-128.png` (128×128 PNG) as the store icon.

---

## Privacy policy URL

```
https://raw.githubusercontent.com/ed-is-ai/linkedinblock/master/PRIVACY.md
```
