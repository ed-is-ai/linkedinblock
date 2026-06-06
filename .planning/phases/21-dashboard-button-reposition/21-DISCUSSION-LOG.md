# Phase 21: Dashboard Button Reposition - Discussion Log

> **Audit trail only.** Do not use as input to planning, research, or execution agents.
> Decisions are captured in CONTEXT.md — this log preserves the alternatives considered.

**Date:** 2026-06-06
**Phase:** 21-dashboard-button-reposition
**Areas discussed:** Label & form factor

---

## Gray Area Selection

| Option | Description | Selected |
|--------|-------------|----------|
| Exact placement | Where in the header region the button sits | |
| Visual prominence | Keep subtle grey vs more discoverable accent | |
| Label & form factor | Full-width button vs compact inline vs text link | ✓ |
| Settings cleanup | Confirm full removal of in-settings copy | |

**User's choice:** Label & form factor only. Other areas left to sensible defaults.

---

## Label & Form Factor

### Form factor

| Option | Description | Selected |
|--------|-------------|----------|
| Full-width button | Keep '📊 View Dashboard' full-width button, relocated. Reuses dashboardLink style. | ✓ |
| Compact inline button | Small '📊 Dashboard' button beside the title in the header row | |
| Text link | Lightweight '📊 Dashboard' LinkedIn-blue text link, no button chrome | |

**User's choice:** Full-width button

### Label & position

| Option | Description | Selected |
|--------|-------------|----------|
| Keep '📊 View Dashboard', below feed-health | Same label, button under the feed-health line above the list | |
| Keep label, directly under title | Same label, placed immediately under the title header, above the feed-health line | ✓ |
| Shorten to '📊 Dashboard', below feed-health | Tighter label, full-width button under feed-health | |

**User's choice:** Keep label, directly under title
**Notes:** Label text unchanged ("📊 View Dashboard"); placed as the first element below the title header row, above the feed-health line.

---

## Claude's Discretion

- **Visual prominence:** default applied — reuse existing grey `dashboardLink` button style as-is; no new accent.
- **Settings cleanup:** default applied — fully remove the in-settings button (moved, not duplicated); keep `openDashboard()` handler and reuse `dashboardLink` style.
- Exact vertical spacing/margins around the relocated button.
- Whether the `<hr>` divider that followed the old in-settings button is kept or removed.

## Deferred Ideas

None — discussion stayed within phase scope.
