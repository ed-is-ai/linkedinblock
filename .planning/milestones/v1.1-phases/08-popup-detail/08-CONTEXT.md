# Phase 8: Popup Signal Detail & Post Preview — Context

**Gathered:** 2026-05-30
**Status:** Ready for planning

<domain>
## Phase Boundary

Make account rows in the popup expandable. Clicking a row body opens a detail panel showing:
1. Full per-signal score breakdown — signal name | pts for each signal that fired (UX-01)
2. Up to 3 stored post snippets from that account with their scores (UX-02)
3. Accordion: only one row is expanded at a time — opening a new row closes the previous (UX-03)

**Not in Phase 8:**
- Editing or deleting stored posts
- Sorting or filtering the queue
- Viewing all stored posts in a flat list (Phase 9 Export covers that)

</domain>

<decisions>
## Implementation Decisions

### State Management

- **D-01:** Accordion state is controlled by the parent `App` component: `const [expandedId, setExpandedId] = useState<string | null>(null)`. When a row is clicked, `setExpandedId(prev => prev === account.authorId ? null : account.authorId)` — toggle: click same row to collapse.

- **D-02:** `App` reads `storedPosts` from storage alongside `flaggedAccounts` in the existing `useEffect`. Filter per-account posts at render time: `storedPosts.filter(p => p.authorId === account.authorId).slice(0, 3)`.

### AccountRow Props Extension

- **D-03:** Add three optional props to `AccountRowProps` (optional so Plan 01 compiles without App changes):
  - `isExpanded?: boolean` — controls detail panel visibility
  - `onToggle?: () => void` — called when the row summary is clicked
  - `posts?: StoredPost[]` — the ≤3 stored posts to show (already filtered/sliced by parent)

- **D-04:** The **click target for expansion** is the top section of the row (name + score + meta + chips), NOT the Block/Dismiss buttons. Add an `onClick` handler to a wrapper `<div>` around those elements with `cursor: pointer`. The action buttons have their own `onClick` — they should call `e.stopPropagation()` to prevent row toggle firing on button clicks.

- **D-05:** The detail panel renders below the chip row and above the action buttons when `isExpanded` is true.

### Detail Panel Layout

- **D-06:** Signal breakdown table — sorted by score desc, all signals where value > 0:
  ```
  listicle          25
  buzzwords         15
  em-dash           10
  headline-formula   8
  ```
  Rendered as a `<div>` with two-column flex rows (signal name left, score right). No `<table>` element needed.

- **D-07:** Post snippets — up to 3 stored posts, newest first. Each snippet shows:
  - Score badge (small, LinkedIn blue) on the right
  - First 120 chars of `post.text` followed by `…` if truncated
  - Subtle separator between snippets

- **D-08:** Signal names are displayed as-is (e.g. `listicle`, `em-dash`) — no prettification. Consistent with existing chip display.

- **D-09:** If `posts` is empty or undefined, the post preview section is omitted entirely (no empty state needed — the account may be new with no stored posts yet).

### Styling

- **D-10:** Detail panel background: `#f9fafb` (slightly off-white), `border-radius: 4px`, `padding: 8px`, `marginTop: 6px`, `marginBottom: 4px`.
- **D-11:** Chevron indicator on the top-line right side: `▸` when collapsed, `▾` when expanded. Replace the static "Peak: X" display OR keep Peak and add a small chevron. Keep both: `Peak: X  ▾`.
- **D-12:** Popup container width stays 280px. Signal table is compact (font-size 11px). Post snippets font-size 11px.

</decisions>

<canonical_refs>
## Canonical References

- `.planning/REQUIREMENTS.md` — UX-01, UX-02, UX-03
- `.planning/ROADMAP.md` §Phase 8 — success criteria
- `src/popup/AccountRow.tsx` — the component to extend (import StoredPost; optional expansion props)
- `src/popup/index.tsx` — App to update (expandedId state, storedPosts read, prop passing)
- `src/shared/types.ts` — `StoredPost` interface (added in Phase 7)

</canonical_refs>

<code_context>
## Existing Code Insights

### AccountRow current structure
- Props: `{ account: FlaggedAccount, onBlock: () => void, onDismiss: () => void }`
- Renders: topLine (name link + peak score), meta (avg + postCount), chipRow, actionRow (Dismiss + Block buttons)
- Styles: `rowStyles` Record at module scope

### App current state
- `accounts: FlaggedAccount[]` — all flagged accounts from storage
- `expandedId` not yet declared — Plan 02 adds this
- Storage read: `chrome.storage.local.get(['flaggedAccounts', 'dailyStats'])` — Plan 02 adds `'storedPosts'`

### New import needed in AccountRow
- `import type { StoredPost } from '../shared/types'` — for the `posts` prop type

</code_context>

<specifics>
## Specific Ideas

- `e.stopPropagation()` on Block and Dismiss button `onClick` — prevents row toggle when clicking action buttons
- Chevron character: `▸` (collapsed) and `▾` (expanded) — no external icon library needed
- Signal score display: `{score} pts` — clear unit
- Post text overflow: `text.length > 120 ? text.slice(0, 120) + '…' : text` — inline in JSX

</specifics>

<deferred>
## Deferred

- Keyboard navigation (Tab to expand/collapse)
- Sorting signals by category (AI language vs bot behaviour)
- "Show all posts" expand beyond 3

</deferred>

---

*Phase: 8 — Popup Signal Detail & Post Preview*
*Context gathered: 2026-05-30*
