---
phase: 09-export-cleanse
type: ui-review
overall_score: 14
max_score: 24
audited_at: "2026-05-30"
baseline: abstract-6-pillar
---

# UI Review — Phase 9: Export & Cleanse

**Overall Score: 14/24**
**Baseline:** Abstract 6-pillar standards (no UI-SPEC.md for this phase)

---

## Pillar Summary

| Pillar | Score | Key Finding |
|--------|-------|-------------|
| 1. Copywriting | 3/4 | Precise, action-oriented copy; no zero-state or error messaging |
| 2. Visuals | 2/4 | Export buttons styled as toggles; missing card-level heading; no accessible labels |
| 3. Color | 2/4 | 10 hardcoded hex values; `#0a66c2` serves 3 semantic roles; no token layer |
| 4. Typography | 2/4 | 5 distinct font sizes; 11px below legibility floor; no hierarchy in new card |
| 5. Spacing | 3/4 | Internally consistent; date input uses inline styles rather than `s` Record |
| 6. Experience Design | 2/4 | No loading/error state; no export feedback; dismissed count never rendered |

---

## Top 3 Priority Fixes

### 1. BLOCKER — No error handling on `chrome.storage.local.get`
**File:** `src/dashboard/index.tsx` lines 27–35

If storage read fails (extension context invalidated, quota exceeded, etc.), the component silently renders with empty arrays. Users see "Posts hidden — all time: 0" and clicking Export produces an empty file with no feedback.

**Fix:**
```typescript
const [loadError, setLoadError] = useState<string | null>(null);

useEffect(() => {
  chrome.storage.local.get([...]).then((result) => {
    // existing code
  }).catch(() => {
    setLoadError('Could not load data. Try reopening the dashboard.');
  });
}, []);
```
Render `{loadError && <div style={s.errorMsg}>{loadError}</div>}` near the top of the card area.

---

### 2. WARNING — No zero-state copy for the Data management card
**File:** `src/dashboard/index.tsx` — Data management card

When `accounts.length === 0`, Export produces an empty file and the Cleanse preview always shows "Will remove 0 account(s)". There is no guidance that there is nothing to act on yet.

**Fix:** Add a conditional message and disable export buttons when empty:
```tsx
{accounts.length === 0 && (
  <div style={s.statSub}>No flagged accounts yet — browse LinkedIn to collect data.</div>
)}
```
Consider `disabled={accounts.length === 0}` on both export buttons.

---

### 3. WARNING — Missing card-level "Data management" heading
**File:** `src/dashboard/index.tsx` — Data management card

The card opens directly with `<div style={s.statLabel}>Export data</div>`. Without a card-level heading the card has no visual identity distinct from the stat cards above it. D-12 describes a "Data management" card with "Export data" and "Cleanse data before:" as sub-sections.

**Fix:**
```tsx
<div style={{ ...s.statLabel, fontWeight: 600, color: '#374151', marginBottom: 12 }}>
  Data management
</div>
<div style={s.statLabel}>Export data</div>
```

---

## Detailed Findings

### Pillar 1: Copywriting (3/4)

**Passing:**
- CTA labels are specific and action-oriented: "Export JSON", "Export CSV", "Confirm cleanse" — no generic "Submit" or "OK"
- `window.confirm` message is explicit and quantified: `Delete ${N} account(s), ${M} post(s), and all dismissed entries? This cannot be undone.`
- Live preview copy "Will remove N account(s) and M post(s)" is clear
- Section labels match design decisions D-12

**Failing:**
- WARNING: No empty-state copy when `accounts.length === 0`
- WARNING: No error copy at all — zero `error`/`catch` strings in the file

---

### Pillar 2: Visuals (2/4)

**Passing:**
- Visual hierarchy exists between stat values (`fontSize: 40`, brand blue) and supporting text
- Bar chart provides clear focal point with colour-differentiated fills
- Destructive button correctly signals danger via red background

**Failing:**
- WARNING: Export buttons (`s.actionBtn`) are styled identically to inactive toggles — same border, background, font size. They read as filter controls, not action triggers
- WARNING: Card has no card-level heading; all three cards open with `s.statLabel` style (13px, grey), making them visually indistinguishable at a glance
- WARNING: No visual treatment signals the Cleanse section as a destructive zone until the red button appears; the `<hr>` separator provides no semantic cue
- WARNING: No `aria-label`, `role`, or `<label>` elements. The date input is associated only with a preceding `<div>`, breaking screen reader label association

---

### Pillar 3: Color (2/4)

**Color inventory (10 hardcoded hex values):**

| Value | Usage |
|-------|-------|
| `#1a1a1a` | Body text |
| `#0a66c2` | Stat value, active toggle bg/border, AI bar fill |
| `#e5e7eb` | Card border, HR separator |
| `#d1d5db` | Toggle/button borders, date input border |
| `#6b7280` | Label text |
| `#9ca3af` | Sub-text, disabled button text |
| `#f3f4f6` | Bar track, disabled button bg |
| `#f59e0b` | Bot behaviour bar fill |
| `#dc2626` | Destructive button |
| `#fff` | Backgrounds |

**Failing:**
- WARNING: 10 raw hex strings with no CSS token layer — future brand changes require find-and-replace
- WARNING: `#0a66c2` serves three semantic roles: decorative emphasis, interactive state, data visualisation
- WARNING: `#f59e0b` is an orphaned accent — single use, no definition context

**Passing:**
- Destructive red (`#dc2626`) used exactly once, only on the destructive action
- 60/30/10 distribution is approximately correct in neutral/text/accent split

---

### Pillar 4: Typography (2/4)

**Sizes in use:**

| Size | Usage |
|------|-------|
| 11px | `categoryNote` |
| 12px | `statSub`, `barLabel`, `barCount` |
| 13px | Labels, buttons, inputs |
| 22px | H1 heading |
| 40px | `statValue` |

**Failing:**
- WARNING: 5 distinct sizes exceeds the 4-size guideline
- WARNING: 11px (`categoryNote`) is below the 12px practical legibility floor
- WARNING: Jump from 22px (heading) to 13px (everything else) with no intermediate size; new card has no typographic hierarchy — all labels render at the same 13px secondary-text style

**Passing:**
- Font weights are disciplined: only 3 values (normal, 600, 700)

---

### Pillar 5: Spacing (3/4)

**Spacing inventory:**
- Card padding: `20px 24px` — consistent
- Card margin-bottom: `16` — consistent
- Button padding: `6px 16px` — consistent across toggle, action, destructive buttons
- Gap values: 8 (export row), 10 (bar rows) — minor inconsistency

**Failing:**
- WARNING: Date input styles are inline (`style={{ marginTop: 8, padding: '4px 8px', ... }}`) rather than in `s` Record — inconsistent with every other element
- WARNING: Gap values mix 8 and 10 without a clear semantic reason

**Passing:**
- All spacing values are multiples of 4 (4, 6, 8, 10, 16, 20, 24, 40) — internally coherent scale

---

### Pillar 6: Experience Design (2/4)

**State coverage:**

| State | Implemented | Notes |
|-------|-------------|-------|
| Loading (storage read) | No | Zero loading/skeleton/spinner code |
| Error (storage failure) | No | Zero error/catch code |
| Empty (no accounts) | Partial | Renders 0 numerically; no guidance message |
| Disabled (no cleanse date) | Yes | `disabled={!cleanseDate}` + `s.destructiveBtnDisabled` |
| Confirmation (destructive) | Yes | `window.confirm` with quantified message |
| Post-action state reset | Yes | `setCleanseDate(''); setCleansePreview(null)` |

**Failing:**
- BLOCKER: No loading state — dashboard renders with 0s while storage read is in progress
- BLOCKER: No error handling on storage promise — MV3 extension context invalidation (common) causes silent empty UI
- WARNING: No export feedback — button state doesn't change after triggering download; no transient confirmation
- WARNING: `dismissed` state is loaded from storage but never rendered; user cannot see dismissed count before cleanse wipes it

**Passing:**
- Destructive action is double-gated: disabled button + `window.confirm` with explicit count
- Post-cleanse in-memory state update avoids page reload

---

## Files Audited

| File | Lines | Role |
|------|-------|------|
| `src/dashboard/index.tsx` | 230 | Primary audit target |
| `src/dashboard/dataManagement.ts` | 93 | Pure functions context |
| `.planning/phases/09-export-cleanse/09-CONTEXT.md` | — | Design decisions D-01–D-15 |
| `.planning/phases/09-export-cleanse/09-01-PLAN.md` | — | Intended behaviour |
| `.planning/phases/09-export-cleanse/09-02-PLAN.md` | — | Intended behaviour |
| `.planning/phases/09-export-cleanse/09-01-SUMMARY.md` | — | Execution summary |
| `.planning/phases/09-export-cleanse/09-02-SUMMARY.md` | — | Execution summary |
