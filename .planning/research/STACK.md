# Stack Research

**Project:** LinkedIn Blocker
**Researched:** 2026-05-25
**Note on sources:** WebSearch, WebFetch, and Bash tools were unavailable in this research session. All findings are drawn from training data (knowledge cutoff August 2025) and are marked with confidence levels. Verify against current Chrome developer docs before implementation.

---

## Recommended Stack

| Layer | Technology | Version | Rationale |
|-------|-----------|---------|-----------|
| Manifest | Chrome Manifest V3 | 3 | Required for Web Store; MV2 deprecated |
| Background | Service Worker (no framework) | native | MV3 mandates SW; plain JS is sufficient for message routing + storage |
| Content Script | Vanilla TypeScript | ~5.4 | Direct DOM access; no overhead; LinkedIn's DOM mutates, framework adds no value here |
| Popup UI | Preact + htm | preact@10.x, htm@3.x | ~4 KB gzipped; JSX-compatible; no build-time transform needed with htm; ideal for small popup |
| Build tool | Vite + vite-plugin-web-extension | vite@5.x, vite-plugin-web-extension@4.x | First-class MV3 support; handles multi-entry bundling (SW + content script + popup separately); HMR in popup during dev |
| Language | TypeScript | ~5.4 | Type-safe chrome.* API calls; catches message shape mismatches at compile time |
| Storage | chrome.storage.local | native | Required by spec; no wrapper needed for simple KV; use a thin typed wrapper |
| Linting/Format | ESLint + Prettier | eslint@9.x, prettier@3.x | Flat config (eslint.config.js) is now default in ESLint 9 |
| Type defs | @types/chrome | ~0.0.270+ | Covers all MV3 APIs including service worker lifecycle |

---

## Key Decisions

### 1. Service Worker vs. Background Page

MV3 replaces persistent background pages with service workers. The critical behavioral difference:

- **Service workers are not persistent.** Chrome terminates idle SWs after ~30 seconds of inactivity. Any in-memory state is lost on termination.
- **For this project:** The SW is only needed as a message router between content script and popup, and as the writer to `chrome.storage.local`. No persistent in-memory state is required — storage is the source of truth. This constraint is already met by the project design.
- **Do not** try to keep the SW alive via timers or `chrome.alarms` unless genuinely needed. Design around stateless handlers.

**Confidence: HIGH** — This is core MV3 behavior, well-documented and stable.

---

### 2. Content Script Isolation (Isolated World)

Content scripts in MV3 run in an "isolated world":

- They share the page's DOM but have a separate JavaScript scope from the page's own scripts.
- LinkedIn's own JS cannot access the content script's variables and vice versa.
- **Implication:** DOM mutation observation (MutationObserver) works fine. There is no way for LinkedIn JS to detect or interfere with the content script directly.
- **LinkedIn CSP:** LinkedIn sets a strict Content-Security-Policy on its pages, but this applies to scripts the page itself loads — content scripts injected by Chrome extensions are **exempt** from the page CSP. Extension CSP is governed by the manifest, not the host page.
- **What to avoid:** Do not use `chrome.scripting.executeScript` with `MAIN` world unless you need to call a LinkedIn-specific page function. Stick to `ISOLATED` (default) world for safety.

**Manifest content_scripts entry:**
```json
"content_scripts": [
  {
    "matches": ["https://www.linkedin.com/*"],
    "js": ["content-script.js"],
    "run_at": "document_idle",
    "all_frames": false
  }
]
```

`document_idle` is correct here — the feed is rendered client-side after the initial HTML, so waiting until idle and then using MutationObserver is the right pattern.

**Confidence: HIGH** — Isolated world and MV3 CSP exemption for extensions are well-established and stable.

---

### 3. Popup UI — Preact over React or Svelte

**Why not React (18/19):** React's runtime is ~45 KB min+gzip. For a popup that renders a list of flagged accounts and a few buttons, this is disproportionate overhead. Bundle size matters in extensions because the entire bundle ships with the extension ZIP on install.

**Why not Svelte 5:** Svelte compiles to small output and has no runtime penalty — it would work well. However, Svelte 5 introduced the runes reactivity model (a breaking change from Svelte 4), and the ecosystem/tooling is still stabilizing. For a small popup with simple state, the complexity cost of learning the runes model is not justified.

**Why Preact + htm:** Preact is API-compatible with React but ships at ~4 KB. With `htm` (tagged template literals as JSX), you avoid a JSX transform step entirely — useful for avoiding CRXJS/Vite complications. If you want JSX syntax instead, Vite handles it natively and Preact works with `@preact/preset-vite`.

**Alternative worth knowing:** Plain vanilla JS + HTML template strings is viable if the popup UI stays simple (< 3 interactive states). Preact adds ~4 KB but removes imperative DOM management, which pays off as soon as the queue list needs sorting, filtering, or per-item state.

**Decision: Preact 10 with JSX via `@preact/preset-vite`.**

```bash
npm install preact
npm install -D @preact/preset-vite
```

**Confidence: MEDIUM** — Preact's fitness for extensions is well-established. Svelte 5 runes assessment reflects state as of mid-2025; verify current maturity.

---

### 4. Build Tooling — Vite + vite-plugin-web-extension

Chrome extensions require multiple entry points bundled separately:
- `manifest.json` (not bundled, but referenced)
- `background/service-worker.js` (one bundle, no DOM)
- `content-script.js` (one bundle, DOM access, injected into LinkedIn)
- `popup/popup.html` + `popup.js` (another bundle, extension popup context)

**Why Vite over webpack:** Vite is the current default for new JS/TS projects. Its dev server and HMR make popup development fast. The `vite-plugin-web-extension` plugin (by `aklinker1`, the most maintained option) handles multi-entry bundling and manifest processing automatically.

**Why not CRXJS:** CRXJS (`@crxjs/vite-plugin`) was a popular choice but had long periods of inactivity and compatibility issues with Vite 5. As of mid-2025, `vite-plugin-web-extension` is the more actively maintained and stable option. CRXJS may be usable if it has been updated — verify before adopting.

**Why not esbuild directly:** esbuild is fast but requires manual configuration for the multi-entry extension structure. Vite wraps esbuild for production builds anyway; you get esbuild's speed with less configuration.

**Minimal Vite config for this project:**
```typescript
// vite.config.ts
import { defineConfig } from 'vite'
import preact from '@preact/preset-vite'
import webExtension from 'vite-plugin-web-extension'

export default defineConfig({
  plugins: [
    preact(),
    webExtension({
      manifest: () => require('./src/manifest.json'),
    }),
  ],
})
```

**Confidence: MEDIUM-HIGH** — Vite as the build tool is HIGH confidence. `vite-plugin-web-extension` vs CRXJS recommendation is MEDIUM — verify current maintenance status of both on GitHub before committing.

---

### 5. chrome.storage.local Patterns

`chrome.storage.local` is the only sensible choice for this project (as confirmed in PROJECT.md). Key patterns:

**Schema design — use a flat keyed structure:**
```typescript
interface StorageSchema {
  flaggedAccounts: Record<string, FlaggedAccount>   // keyed by LinkedIn profile ID or URL
  dismissedAccounts: Record<string, true>            // false positives
  blockedAccounts: Record<string, true>              // confirmed blocks
  settings: DetectionSettings
  schemaVersion: number                              // for future migrations
}

interface FlaggedAccount {
  profileId: string
  profileUrl: string
  displayName: string
  signals: string[]          // e.g. ['ai-headshot', 'generic-bio', 'listicle-pattern']
  score: number              // 0–100 suspicion score
  postCount: number
  firstFlagged: number       // timestamp
  lastFlagged: number
}

interface DetectionSettings {
  autoHideThreshold: number   // default: 70 (score 0-100)
  enabled: boolean
}
```

**Avoid storing entire post content** — LinkedIn pages have many posts; storing post HTML will bloat storage fast. Store only account-level signals and scores.

**Storage limits:** `chrome.storage.local` allows 10 MB by default (can be requested up to unlimited with the `unlimitedStorage` permission). For an account blocklist, 10 MB is more than sufficient.

**Read/write pattern — always async:**
```typescript
// Read
const data = await chrome.storage.local.get(['flaggedAccounts', 'settings'])

// Write (merge, not replace)
await chrome.storage.local.set({ flaggedAccounts: updated })

// Listen for changes (useful in popup to react to content script writes)
chrome.storage.onChanged.addListener((changes, area) => {
  if (area === 'local' && changes.flaggedAccounts) {
    refreshPopupList()
  }
})
```

**Confidence: HIGH** — chrome.storage.local API is stable and well-documented.

---

### 6. Message Passing Architecture

Three contexts communicate:
- **Content script** (runs in LinkedIn page): detects posts, writes storage, sends notifications
- **Service worker** (background): receives messages, can orchestrate cross-tab logic if needed
- **Popup** (extension UI): reads storage on open, listens for storage changes

**Recommended pattern: storage-first, messages for actions only.**

The popup should read `chrome.storage.local` directly on open and use `chrome.storage.onChanged` to react to updates. This avoids the popup needing the service worker to be alive to display data.

Messages (via `chrome.runtime.sendMessage`) should be used only for imperative actions:
- Content script → SW: `{ type: 'FLAG_ACCOUNT', payload: FlaggedAccount }` (if you want SW to centralize writes)
- Popup → Content script: `{ type: 'TRIGGER_BLOCK', profileId: string }` (to click LinkedIn's block UI)

**Message shape — use discriminated unions in TypeScript:**
```typescript
type Message =
  | { type: 'FLAG_ACCOUNT'; payload: FlaggedAccount }
  | { type: 'TRIGGER_BLOCK'; profileId: string }
  | { type: 'DISMISS_ACCOUNT'; profileId: string }
```

**Important service worker caveat:** When the popup sends a message and the SW is not running, Chrome will wake it. But if the content script sends a message and there is no listener registered, the message is dropped. Always register `chrome.runtime.onMessage.addListener` in the SW at the top level (not inside an event handler).

**Simpler alternative for v1:** Skip the service worker as a message hub entirely. Content script writes directly to `chrome.storage.local`. Popup reads directly from storage. Service worker exists only to satisfy the manifest requirement and handle any future background tasks. This is the right choice for v1 — add SW message routing only when cross-tab or background-scheduling needs arise.

**Confidence: HIGH** — Message passing and storage APIs are stable MV3 patterns.

---

### 7. Manifest V3 Permissions Model

Minimal permissions for this project:
```json
{
  "manifest_version": 3,
  "name": "LinkedIn Blocker",
  "version": "0.1.0",
  "description": "Hides AI-generated posts and fake accounts on LinkedIn.",
  "permissions": [
    "storage",
    "activeTab"
  ],
  "host_permissions": [
    "https://www.linkedin.com/*"
  ],
  "background": {
    "service_worker": "background.js",
    "type": "module"
  },
  "content_scripts": [
    {
      "matches": ["https://www.linkedin.com/*"],
      "js": ["content-script.js"],
      "run_at": "document_idle"
    }
  ],
  "action": {
    "default_popup": "popup/index.html",
    "default_title": "LinkedIn Blocker"
  }
}
```

**`activeTab` vs `tabs`:** Use `activeTab` — it grants temporary tab access when the user clicks the extension icon, without requiring the broader `tabs` permission (which triggers a warning in the Web Store review). Only add `tabs` if you need to query tabs without user action.

**`host_permissions`:** `https://www.linkedin.com/*` is a sensitive permission. The Web Store will scrutinize this. Have a clear justification ready: "Required to inject content script into LinkedIn pages to detect and hide AI-generated posts."

**No `webRequest` needed:** This project does not intercept network requests. Avoid this permission — it triggers extra review scrutiny and is restricted under MV3 anyway (blocking webRequest requires `declarativeNetRequest`).

**Confidence: HIGH** — Permissions model is stable and well-documented.

---

## What NOT to Use

| Technology | Reason |
|-----------|--------|
| **React 18/19** | ~45 KB runtime is excessive for an extension popup. Use Preact instead. |
| **Vue 3** | Similar bundle size concern; adds Composition API complexity without benefit for a small popup. |
| **Webpack** | Valid choice but verbose config for MV3 multi-entry; Vite + plugin handles this better in 2025. |
| **CRXJS (`@crxjs/vite-plugin`)** | Had maintenance gaps and Vite 5 compatibility issues as of mid-2025. Verify status before using; prefer `vite-plugin-web-extension` unless CRXJS has recovered. |
| **`chrome.storage.sync`** | Syncs across devices via Google account. Blocked account lists are personal/local — do not sync without explicit user opt-in. Stick to `.local`. |
| **`chrome.storage.session`** | Cleared when the extension is reloaded or Chrome restarts. Not appropriate for persistent blocklists. |
| **Persistent background page (MV2 pattern)** | Not available in MV3. Do not attempt to port MV2 patterns; design for stateless SW handlers from the start. |
| **`eval()` or dynamic script injection** | Blocked by extension CSP by default. MV3 tightened this significantly. All code must be bundled at build time. |
| **`MAIN` world content script** | Runs in the page's JS scope — LinkedIn can detect it. Use `ISOLATED` (default) for safety and to avoid detection. |
| **`webRequest` blocking API** | MV3 replaced blocking webRequest with declarativeNetRequest. This project does not need network interception at all — avoid both. |
| **IndexedDB from content script** | Technically possible but the database is scoped to the extension's origin only when accessed from extension contexts (popup, SW). Content scripts accessing IndexedDB from the page origin creates a mess. Use `chrome.storage.local` via messaging instead. |

---

## Confidence Notes

| Area | Confidence | Basis |
|------|-----------|-------|
| MV3 service worker lifecycle | HIGH | Core MV3 spec, stable since Chrome 88; no major changes expected |
| Isolated world / CSP exemption | HIGH | Long-standing extension platform behavior |
| chrome.storage.local API | HIGH | Stable API, consistent behavior |
| Message passing patterns | HIGH | Well-established MV3 patterns |
| Permissions model | HIGH | Stable; Web Store policy may have evolved — verify sensitivePermissions guidelines |
| Vite as build tool | HIGH | Dominant choice in the ecosystem as of mid-2025 |
| vite-plugin-web-extension vs CRXJS | MEDIUM | Based on GitHub activity observations up to mid-2025; verify current maintenance status of both before adopting |
| Preact over React for popup | MEDIUM-HIGH | Well-established pattern; Svelte 5 runes maturity assessment may be outdated |
| LinkedIn DOM structure for MutationObserver | LOW | LinkedIn's DOM changes frequently; this cannot be researched from static docs — requires live inspection during implementation |

**Most important gap:** LinkedIn's DOM structure is entirely opaque from research. The content script's heuristic detection selectors will need to be developed against a live LinkedIn feed. Plan a dedicated spike for this — it is the highest implementation risk in the project.

---

## Suggested dev dependencies install

```bash
npm create vite@latest linkedin-blocker -- --template vanilla-ts
npm install preact
npm install -D @preact/preset-vite vite-plugin-web-extension @types/chrome typescript eslint prettier
```

Replace the default `vite.config.ts` with the multi-entry config shown above. The `@types/chrome` package provides full type coverage for all MV3 APIs including service worker globals.
