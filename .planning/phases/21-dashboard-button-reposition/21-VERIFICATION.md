---
phase: 21-dashboard-button-reposition
verified: 2026-06-06T20:00:00Z
status: human_needed
score: 5/5 must-haves verified
overrides_applied: 0
human_verification:
  - test: "Open the extension popup on a live LinkedIn feed tab"
    expected: "The 📊 View Dashboard button is immediately visible below the title/badge row, above any feed-health line and the account list, without opening Settings"
    why_human: "Visual rendering and popup open state cannot be verified by grep — requires loaded extension in Chrome"
  - test: "Click the 📊 View Dashboard button in the popup header"
    expected: "dashboard/index.html opens in a new tab (no Settings interaction required)"
    why_human: "chrome.runtime.getURL and window.open behavior requires a live extension context"
  - test: "Open ⚙ Settings disclosure in the popup"
    expected: "Settings shows only: threshold slider, mode indicator, API key input, Save/Clear buttons, and hint paragraph — no View Dashboard button"
    why_human: "Disclosure open state and rendered contents require visual inspection of the live popup"
---

# Phase 21: Dashboard Button Reposition Verification Report

**Phase Goal:** The "View Dashboard" button is visible at the top of the popup without any interaction, making the dashboard immediately discoverable.
**Verified:** 2026-06-06T20:00:00Z
**Status:** human_needed
**Re-verification:** No — initial verification

---

## Goal Achievement

### Observable Truths

| # | Truth | Status | Evidence |
|---|-------|--------|----------|
| 1 | Opening the popup shows the 📊 View Dashboard button in the header region, above the feed-health line and the pending account list, without opening Settings (POPUP-04) | VERIFIED | `src/popup/index.tsx` line 144: `<button onClick={openDashboard} style={styles.dashboardLink}>📊 View Dashboard</button>` rendered at line 144, after `</div>` closing the `styles.header` block (line 142) and before `{feedPct !== null && ...}` at line 146. Unconditional — not gated by any state or disclosure. |
| 2 | Clicking the relocated button opens dashboard/index.html in a new tab — identical behavior to the prior in-settings button | VERIFIED | `openDashboard()` at line 101–103: `window.open(chrome.runtime.getURL('dashboard/index.html'), '_blank', 'noreferrer')`. The relocated button's `onClick={openDashboard}` at line 144 references this unchanged handler verbatim. |
| 3 | The ⚙ Settings disclosure no longer contains a View Dashboard button; it retains only the threshold slider, mode/API-key section, and Save/Clear controls (POPUP-05) | VERIFIED | The `<details>` block (lines 202–256) contains: threshold slider `settingRow` (lines 205–219), mode row `modeRow` (lines 221–226), API key `input` (lines 229–235), `buttonRow` Save/Clear (lines 237–246), and hint `p` (lines 248–254). No `openDashboard` reference anywhere in this block. |
| 4 | The View Dashboard button is moved, not duplicated — exactly one openDashboard call site remains | VERIFIED | Grep over `src/popup/index.tsx` returns exactly 2 hits for `openDashboard`: line 101 (function definition) and line 144 (single onClick call site). Zero occurrences inside the `<details>` Settings body. |
| 5 | The change is confined to src/popup/index.tsx; no other files are modified (ROADMAP SC#4) | VERIFIED | `git show effcb3a --name-only` lists only `src/popup/index.tsx` as modified. |

**Score:** 5/5 truths verified

---

### Required Artifacts

| Artifact | Expected | Status | Details |
|----------|----------|--------|---------|
| `src/popup/index.tsx` | Relocated 📊 View Dashboard button rendered between styles.header block and feedPct paragraph, reusing styles.dashboardLink | VERIFIED | Button at line 144, header closes at line 142, feedPct conditional at line 146. `styles.dashboardLink` referenced at line 144 (call site) and defined at lines 357–368. |

---

### Key Link Verification

| From | To | Via | Status | Details |
|------|----|-----|--------|---------|
| `src/popup/index.tsx` header region button (line 144) | `openDashboard()` | `onClick={openDashboard}` | WIRED | Line 144: `onClick={openDashboard}`. Handler defined at line 101. |
| Relocated button (line 144) | `styles.dashboardLink` | `style={styles.dashboardLink}` | WIRED | Line 144 references `styles.dashboardLink`; key defined at lines 357–368 in the styles record. |

---

### Data-Flow Trace (Level 4)

Not applicable — this phase repositions a static-literal button with no data state. The button label and URL are compile-time string literals; no dynamic data flows through the relocated element.

---

### Behavioral Spot-Checks

Step 7b: SKIPPED — the popup is a Chrome extension UI component that requires a loaded extension context in Chrome. No standalone runnable entry point can be invoked without the extension host.

---

### Probe Execution

No probe scripts declared in PLAN.md or present under `scripts/`. Step 7c: N/A.

---

### Requirements Coverage

| Requirement | Source Plan | Description | Status | Evidence |
|-------------|------------|-------------|--------|----------|
| POPUP-04 | 21-01-PLAN.md | "View Dashboard" action appears at the top of the popup (in/near the title header, above the pending account list), visible without opening Settings | SATISFIED | Button at line 144, unconditionally rendered between `styles.header` close and `feedPct` conditional. |
| POPUP-05 | 21-01-PLAN.md | "View Dashboard" button removed from ⚙ Settings disclosure (moved, not duplicated); Settings retains threshold slider and export/cleanse controls | SATISFIED | `<details>` block (lines 202–256) contains no `openDashboard` reference. Retains: settingRow, modeRow, API key input, buttonRow, hint. |

No orphaned requirements — both POPUP-04 and POPUP-05 are the only requirements mapped to Phase 21 in REQUIREMENTS.md, and both are claimed and verified.

---

### Anti-Patterns Found

| File | Line | Pattern | Severity | Impact |
|------|------|---------|----------|--------|
| `src/popup/index.tsx` | 233 | `placeholder="sk-ant-..."` | Info | Input placeholder attribute for API key field — not a stub indicator; this is a UX affordance, not a hardcoded data value. |

No `TBD`, `FIXME`, or `XXX` markers found. No `TODO` or `HACK` markers. No empty implementations, return null, or hardcoded empty data that flows to rendering. The `placeholder` at line 233 is an HTML form affordance, not a debt marker.

**`styles.divider` cleanup confirmed:** Zero grep matches for `divider` in `src/popup/index.tsx` — the style key was removed and no dangling reference remains.

**`styles.dashboardLink` confirmed not orphaned:** Referenced at line 144 (call site) and defined at lines 357–368. Both present and connected.

---

### Human Verification Required

#### 1. Button visible at popup open

**Test:** Load the extension in Chrome, navigate to linkedin.com, and open the extension popup.
**Expected:** The 📊 View Dashboard button appears immediately below the "LinkedIn Blocker" title/badge row, above the feed-health percentage line and above the pending accounts list, without the user opening or expanding anything.
**Why human:** Visual rendering position and popup open state require a live Chrome extension context — grep confirms the JSX structure but not the rendered pixel layout.

#### 2. Button opens dashboard in new tab

**Test:** Click the 📊 View Dashboard button in the popup header.
**Expected:** A new browser tab opens showing `dashboard/index.html` (the extension dashboard). The popup may close (expected Chrome popup behavior).
**Why human:** `chrome.runtime.getURL` and `window.open` with `'_blank'` behavior requires a live extension context with Chrome APIs available.

#### 3. Settings disclosure is clean (no View Dashboard button)

**Test:** Open the popup, then click ⚙ Settings to expand the disclosure.
**Expected:** Settings shows only: (a) "Hide posts scoring above" threshold slider, (b) mode indicator dot + label, (c) Anthropic API key input, (d) Save/Clear buttons, (e) hint paragraph. No 📊 View Dashboard button appears anywhere inside Settings.
**Why human:** The `<details>` disclosure open state and its rendered child contents require visual confirmation in the live popup.

---

### Gaps Summary

No gaps. All 5 must-haves are verified in the codebase. The only items requiring resolution are the 3 human verification checks above, which test live extension rendering behavior that cannot be confirmed by static analysis.

---

_Verified: 2026-06-06T20:00:00Z_
_Verifier: Claude (gsd-verifier)_
