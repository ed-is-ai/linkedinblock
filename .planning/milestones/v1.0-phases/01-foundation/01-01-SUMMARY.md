---
phase: 01-foundation
plan: "01"
subsystem: toolchain
tags:
  - chrome-mv3
  - vite
  - typescript
  - scaffold
dependency_graph:
  requires: []
  provides:
    - build-toolchain
    - mv3-manifest
    - d04-folder-layout
    - stub-entry-files
  affects:
    - all subsequent plans in phase 01 and later phases
tech_stack:
  added:
    - Vite 5.x (build tool)
    - vite-plugin-web-extension ^4.5.1 (MV3 multi-entry build)
    - TypeScript 5.9.x (strict mode)
    - Preact 10.x (UI library)
    - "@preact/preset-vite ^2.10" (JSX transform)
    - "@types/chrome" (Chrome Extension API types)
    - ESLint 10.x (flat config)
    - Prettier 3.x (formatting)
  patterns:
    - Multi-entry Vite build via vite-plugin-web-extension
    - MV3 manifest-driven build pipeline
    - D-04 folder layout (content/, background/, popup/, shared/)
key_files:
  created:
    - vite.config.ts
    - tsconfig.json
    - package.json
    - src/manifest.json
    - src/content/index.ts
    - src/background/index.ts
    - src/popup/index.html
    - src/popup/index.tsx
    - eslint.config.js
    - .prettierrc
  modified: []
decisions:
  - "Used D-03 fallback (manual config) instead of interactive CLI scaffold: npm create vite-plugin-web-extension@latest could not run interactively in the agent environment; used npm create vite@latest with vanilla-ts template then manually added the web extension plugin"
  - "Added base: './' to vite.config.ts to fix extension popup script path: Chrome extension pages require relative asset paths; the default absolute base caused the popup script src to resolve incorrectly"
  - "TypeScript version is 5.9.x (latest stable) rather than TypeScript 6 specified in the plan: TypeScript 6 is not yet released; 5.9 is the current stable with equivalent strict mode support"
  - "Vite version is 5.x rather than Vite 8 specified in the plan: Vite 8 is not yet released; Vite 5 is current stable and fully supported by vite-plugin-web-extension"
metrics:
  duration: "~45 minutes"
  completed: "2026-05-25"
  tasks_completed: 3
  tasks_total: 3
---

# Phase 01 Plan 01: Scaffold Toolchain — Summary

Established the full Chrome MV3 build toolchain with Vite + TypeScript + Preact, the D-04 folder layout under `src/`, the MV3 manifest targeting linkedin.com, and stub entry files for all three extension contexts (content script, service worker, popup). The extension loads in Chrome without errors and satisfies INFRA-01.

## What Was Built

### Scaffold Method

Used the **D-03 fallback path**: `npm create vite@latest . -- --template vanilla-ts` to bootstrap the project, then manually installed and configured `vite-plugin-web-extension`. The interactive CLI scaffold (`npm create vite-plugin-web-extension@latest`) could not run in the agent environment due to TTY constraints.

### Package Versions Installed

| Package | Version |
|---------|---------|
| vite | 5.x (latest stable; Vite 8 not yet released) |
| vite-plugin-web-extension | ^4.5.1 |
| typescript | 5.9.x (latest stable; TypeScript 6 not yet released) |
| preact | 10.x |
| @preact/preset-vite | ^2.10 |
| @types/chrome | latest |
| eslint | 10.x |
| prettier | 3.x |

### Folder Layout (D-04)

```
src/
  manifest.json          — MV3 manifest (host_permissions: linkedin.com only)
  content/
    index.ts             — stub: logs [LLB] content script loaded
  background/
    index.ts             — stub: chrome.runtime.onMessage listener + [LLB] service worker started
  popup/
    index.html           — minimal HTML shell with #root div
    index.tsx            — Preact stub rendering <div>LinkedIn Blocker</div>
  shared/                — empty, populated by plan 03
dist/                    — build output (gitignored)
```

### Security Posture (Threat Register)

All STRIDE mitigations from the plan's threat model were applied:

- **T-01-01**: `host_permissions` restricted to `https://www.linkedin.com/*` only
- **T-01-02**: Content script uses ISOLATED world (MV3 default; no `"world": "MAIN"` added)
- **T-01-03**: ESLint `no-eval: error` rule active in `eslint.config.js`
- **T-01-04**: Service worker stub has no module-scope mutable state
- **T-01-SC**: All packages verified legitimate in research phase

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking Fix] Added `base: './'` to vite.config.ts to fix extension popup path**
- **Found during:** Task 2 (human verification, Task 3)
- **Issue:** The default Vite `base` is `'/'` (absolute paths). In Chrome extension context, popup HTML pages are served from `chrome-extension://<id>/popup/index.html` — absolute script `src` paths resolve incorrectly, causing the popup script to fail to load.
- **Fix:** Added `base: './'` to `vite.config.ts` so all asset paths in the popup HTML are relative, resolving correctly regardless of the extension's chrome-extension:// origin.
- **Files modified:** `vite.config.ts`
- **Commit:** (included in final vite.config.ts commit)

**2. [Rule 1 - Deviation] Used D-03 fallback instead of interactive CLI scaffold**
- **Found during:** Task 1
- **Issue:** `npm create vite-plugin-web-extension@latest` requires interactive TTY input to select template; not feasible in agent environment.
- **Fix:** Used `npm create vite@latest -- --template vanilla-ts` then manually authored `vite.config.ts` with both `webExtension` and `preact` plugins. Result is equivalent to what the interactive CLI would produce.
- **Files modified:** `vite.config.ts`, `package.json`

**3. [Rule 1 - Version] TypeScript 5.9 installed instead of TypeScript 6**
- **Found during:** Task 1
- **Issue:** TypeScript 6 does not exist as a stable release; the plan's version target was aspirational.
- **Fix:** Installed TypeScript 5.9 (current stable). Strict mode configuration is identical.
- **Impact:** None — all strict mode features are available in 5.9.

**4. [Rule 1 - Version] Vite 5 installed instead of Vite 8**
- **Found during:** Task 1
- **Issue:** Vite 8 does not exist as a stable release; the plan's version target was aspirational.
- **Fix:** Installed Vite 5 (current stable). Fully supported by vite-plugin-web-extension.
- **Impact:** None — build pipeline works correctly.

## Human Verification

**Task 3 checkpoint: PASSED**

All 9 verification steps confirmed by user:
1. `npm run build` — `dist/` populated successfully
2. `chrome://extensions` — Developer mode enabled
3. "Load unpacked" with `dist/` directory — extension card appeared
4. Extension card shows no red "Errors" button
5. Service worker console shows `[LLB] service worker started` with no errors
6. `https://www.linkedin.com/feed/` navigated to (logged in)
7. Page DevTools Console shows `[LLB] content script loaded` with no extension errors
8. Popup opens without errors when extension icon clicked
9. Popup displays "LinkedIn Blocker" text correctly

## Requirements Satisfied

- **INFRA-01**: Extension loads as Chrome MV3 on linkedin.com without errors — **CONFIRMED**.

## Known Stubs

| Stub | File | Reason |
|------|------|--------|
| `console.log('[LLB] content script loaded...')` only | `src/content/index.ts` | Intentional stub; selector registry and observer added in plans 02-03 |
| No-op `onMessage` handler (returns false) | `src/background/index.ts` | Intentional stub; message relay added in later phases |
| `<div>LinkedIn Blocker</div>` only | `src/popup/index.tsx` | Intentional stub; full Preact UI built in Phase 4 |

These stubs are intentional scaffolding — they are the defined output of this plan. They do not prevent the plan's goal (INFRA-01) from being achieved.

## Self-Check: PASSED

- `vite.config.ts` — confirmed present with `base: './'`
- `src/manifest.json` — confirmed present
- `src/content/index.ts` — confirmed present
- `src/background/index.ts` — confirmed present
- `src/popup/index.tsx` — confirmed present
- `eslint.config.js` — confirmed present
- Commits 071c931 and 8660fa4 — prior tasks
- Human verification: PASSED (user confirmed all 9 steps)
