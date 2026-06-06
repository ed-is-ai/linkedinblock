# Phase 21: Dashboard Button Reposition - Context

**Gathered:** 2026-06-06
**Status:** Ready for planning

<domain>
## Phase Boundary

Move the "📊 View Dashboard" action out of the ⚙ Settings disclosure and into the popup header region, so the dashboard is discoverable on popup open without any interaction. The button keeps its existing behavior (opens `dashboard/index.html` in a new tab via `openDashboard()`).

Scope is the popup only, confined to a single file: `src/popup/index.tsx`. No new component files, no other files modified. This is a relocation + cleanup, not a redesign — no new capability.

</domain>

<decisions>
## Implementation Decisions

### Label & Form Factor (discussed)
- **D-01:** **Full-width button** — keep the same button form factor as today (not a compact inline control or text link). Reuses the existing `styles.dashboardLink` full-width button style.
- **D-02:** **Label unchanged** — the button text stays exactly `📊 View Dashboard`.
- **D-03:** **Placement: directly under the title header, above the feed-health line.** The button is the first element below the `<div style={styles.header}>` title/badge row, rendered before the `feedPct` line (`index.tsx:144`). This makes it the first thing the user sees under the title, always visible (not gated behind any disclosure or list state).

### Visual Prominence (sensible default)
- **D-04:** **Reuse the existing grey `dashboardLink` button style** as-is (subtle grey `#f3f4f6` fill, `#374151` text, 1px border, centered). No new accent color or restyling — keep it visually consistent with the prior treatment. Spacing may be adjusted (e.g. `marginBottom`) so it sits cleanly above the feed-health line / list; the planner has discretion on exact spacing.

### Settings Cleanup (sensible default)
- **D-05:** **Fully remove** the in-settings `<button onClick={openDashboard}>` (`index.tsx:219-221`) — moved, not duplicated. The `openDashboard()` handler stays (now called from the new header button). After removal, Settings retains only: threshold slider, API key / mode section, and export/cleanse controls.
- **D-06:** The `styles.dashboardLink` style object is **kept and reused** by the relocated button — it is not orphaned. (If the planner instead inlines/renames, the old key must not be left dangling.)

### Claude's Discretion
- Exact vertical spacing/margins around the relocated button.
- Whether the `divider`/`<hr>` that followed the old in-settings button (`index.tsx:223`) is kept in Settings or removed (it separated the dashboard button from the mode row — removing the button may make it redundant). Planner decides based on resulting Settings layout.

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Phase requirements
- `.planning/REQUIREMENTS.md` — POPUP-04 (button appears at top of popup, visible without opening Settings) and POPUP-05 (button removed from Settings, moved not duplicated; Settings retains threshold slider + export/cleanse controls).
- `.planning/ROADMAP.md` §"Phase 21: Dashboard Button Reposition" — goal + 4 success criteria (esp. SC#4: change confined to `src/popup/index.tsx`).

### Implementation target
- `src/popup/index.tsx` — the ONLY file to change. Relevant anchors: `openDashboard()` handler (line ~101), title header block (line ~137), feed-health line (line ~144), in-settings dashboard button (line ~219), `styles.dashboardLink` (line ~361).

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- `openDashboard()` (`src/popup/index.tsx:101`): existing handler — `window.open(chrome.runtime.getURL('dashboard/index.html'), '_blank', 'noreferrer')`. Reused verbatim from the new location; no behavior change.
- `styles.dashboardLink` (`src/popup/index.tsx:361`): existing full-width grey button style. Relocated button reuses it (D-01, D-06).

### Established Patterns
- **Inline style objects only** — all popup styling lives in the `styles` record; no CSS class selectors (Phase 4 decision). The relocated button must follow this.
- **Stateless popup** — reads `chrome.storage.local` on open; no new state needed for this change.

### Integration Points
- Render insertion point is between `<div style={styles.header}>…</div>` (`index.tsx:137-142`) and the `feedPct` paragraph (`index.tsx:144-146`).
- Deletion point is the in-settings button at `index.tsx:219-221` (inside the `<details>` Settings body).

</code_context>

<specifics>
## Specific Ideas

- Keep the exact label "📊 View Dashboard" — user confirmed no wording change.
- Button placement is specifically "directly under the title, above the feed-health line" — not below feed-health, not inline in the title row.

</specifics>

<deferred>
## Deferred Ideas

None — discussion stayed within phase scope.

</deferred>

---

*Phase: 21-dashboard-button-reposition*
*Context gathered: 2026-06-06*
