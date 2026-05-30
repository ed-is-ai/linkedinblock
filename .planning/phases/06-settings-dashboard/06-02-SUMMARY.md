---
phase: 06-settings-dashboard
plan: 02
status: complete
completed: 2026-05-29
---

# 06-02 Summary — Threshold Slider & Dashboard Link

## What Changed

**Single file modified:** `src/popup/index.tsx`

### State & effects
- Added `const [threshold, setThreshold] = useState(60)` alongside existing state.
- Extended the first `useEffect` to call `chrome.storage.local.get(['anthropicApiKey', 'settings'])` and read `settings.autoHideThreshold` into `threshold` state on mount.

### New handlers
- `saveThreshold(value: number)` — updates local state and writes `{ settings: { autoHideThreshold: value } }` to `chrome.storage.local` immediately on slider drag.
- `openDashboard()` — opens `chrome.runtime.getURL('dashboard/index.html')` in a new tab via `window.open`.

### JSX additions (inside `<div style={styles.settingsBody}>`, before the existing `modeRow` div)
1. **Threshold slider row** — label "Hide posts scoring above:" with live `{threshold} / 100` display; `<input type="range" min={35} max={90} step={5}>` wired to `saveThreshold` on `onInput`.
2. **Dashboard button** — `📊 View Dashboard` button that calls `openDashboard`.
3. **`<hr>`** separator between the new controls and the existing API key section.

### New styles
`settingRow`, `settingLabel`, `thresholdValue`, `slider`, `dashboardLink`, `divider` added to the `styles` Record.

## Verification
- String-presence check: all required tokens (`autoHideThreshold`, `threshold`, `saveThreshold`, `openDashboard`, `type="range"`, `min={35}`, `max={90}`, `dashboard/index.html`) confirmed present.
- `npx tsc --noEmit` exits 0 — no type errors.

## Requirements Satisfied
- **CONFIG-01**: threshold is now user-configurable from the popup Settings section.
- Dashboard is reachable from the popup (link wired; page itself created in Plan 03).
