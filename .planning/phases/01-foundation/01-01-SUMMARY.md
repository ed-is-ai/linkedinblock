---
phase: 01-foundation
plan: 01
subsystem: build-toolchain
tags:
  - chrome-mv3
  - vite
  - typescript
  - scaffold
dependency_graph:
  requires: []
  provides:
    - npm-build-pipeline
    - d04-folder-layout
    - mv3-manifest
    - stub-entry-files
  affects:
    - 01-02
    - 01-03
    - 01-04
    - all-subsequent-phases
tech_stack:
  added:
    - vite@5.4.21
    - vite-plugin-web-extension@4.5.1
    - typescript@5.9.3
    - preact@10.29.2
    - "@preact/preset-vite@2.10.5"
    - "@types/chrome@0.1.42"
    - eslint@9.39.4
    - prettier@3.8.3
  patterns:
    - D-03 fallback (manual config instead of interactive scaffold CLI)
    - root:'src' vite config so plugin resolves manifest entries from src/
    - .ts extensions in manifest source; plugin outputs .js in dist/
key_files:
  created:
    - package.json
    - package-lock.json
    - vite.config.ts
    - tsconfig.json
    - .gitignore
    - .prettierrc
    - eslint.config.js
    - src/manifest.json
    - src/content/index.ts
    - src/background/index.ts
    - src/popup/index.html
    - src/popup/index.tsx
  modified: []
decisions:
  - "D-03 fallback used: npm create vite-plugin-web-extension cannot run non-interactively (interactive prompt blocks); all config written manually from research docs"
  - "vite.config.ts sets root:'src' so the plugin resolves manifest entry paths relative to src/"
  - "Manifest source uses .ts extensions (content/index.ts, background/index.ts); plugin rewrites to .js in dist/manifest.json"
  - "eslint.config.js uses @eslint/js (transitive dep of eslint) for recommended config; no TypeScript ESLint parser added in this phase (no type-aware linting yet)"
metrics:
  duration: "~15 minutes"
  completed_date: "2026-05-25"
  tasks_completed: 2
  tasks_total: 3
  files_created: 12
  files_modified: 0
requirements:
  - INFRA-01
---

# Phase 1 Plan 1: Scaffold Chrome MV3 Extension Summary

**One-liner:** Vite 5 + vite-plugin-web-extension 4.5.1 + TypeScript strict mode scaffold with D-04 folder layout and MV3 manifest targeting linkedin.com; `npm run build` produces loadable dist/.

## What Was Built

The full build toolchain and D-04 source layout for the LinkedIn Blocker Chrome MV3 extension:

- **Build pipeline:** `npm run build` via Vite 5 + vite-plugin-web-extension produces `dist/` with separate bundles for popup, background service worker, and content script
- **D-04 folder layout:** `src/content/`, `src/background/`, `src/popup/`, `src/shared/` (empty, populated by plan 03) under `src/`
- **MV3 manifest:** Targets `https://www.linkedin.com/*`, `storage` + `activeTab` permissions, ISOLATED world content script (default, no `"world": "MAIN"` — T-01-02 mitigation)
- **Stub entry files:** Content script logs `[LLB] content script loaded`, service worker logs `[LLB] service worker started` and registers onMessage listener (no module-scope state — T-01-04 mitigation)
- **TypeScript:** Strict mode, ES2022 target, bundler module resolution, chrome types
- **ESLint:** Flat config (ESLint 9+) with `no-eval: error` rule (T-01-03 mitigation)
- **Prettier:** Configured for project conventions

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] D-03 fallback used — interactive scaffold CLI cannot run non-interactively**
- **Found during:** Task 1
- **Issue:** `npm create vite-plugin-web-extension@latest .` and `npm create vite@latest . -- --template vanilla-ts` both require interactive prompts (overwrite confirmation for non-empty directory); not automatable in this environment
- **Fix:** Wrote all files manually based on research docs (vite.config.ts, tsconfig.json, package.json, .gitignore), then ran `npm install`. This is explicitly the D-03 fallback documented in CONTEXT.md
- **Files modified:** package.json, vite.config.ts, tsconfig.json, .gitignore (created directly)
- **Commits:** 071c931

**2. [Rule 3 - Blocking] Manifest source uses .ts extensions, not .js**
- **Found during:** Task 2 build verification
- **Issue:** Manifest entries `background/index.js` and `content/index.js` caused `Could not resolve entry module` errors — Vite lib mode requires the actual source file (`.ts`), not the output extension (`.js`). The plugin does support `.ts` extensions in manifest entries (per SCRIPT_ENTRY_REGEX in source) and rewrites them to `.js` in the output manifest
- **Fix:** Changed `"service_worker": "background/index.js"` → `"background/index.ts"` and `"js": ["content/index.js"]` → `["content/index.ts"]` in `src/manifest.json`. The plugin correctly outputs `background/index.js` and `content/index.js` in `dist/manifest.json`
- **Files modified:** src/manifest.json, vite.config.ts
- **Commits:** 8660fa4

**3. [Rule 3 - Blocking] vite.config.ts root set to 'src'**
- **Found during:** Task 2 build verification
- **Issue:** With default root (project root), plugin resolved `popup/index.html` from project root but could not find it (file is at `src/popup/index.html`)
- **Fix:** Set `root: 'src'` and `outDir: '../dist'` in vite.config.ts so all manifest paths are resolved relative to `src/`. This is the standard pattern for this plugin when source files live in a `src/` subdirectory
- **Files modified:** vite.config.ts
- **Commits:** 8660fa4

## Checkpoint Pending

**Task 3** (human-verify) is pending. The extension has been built successfully. Human verification in Chrome is required to satisfy INFRA-01.

## Known Stubs

| File | Content | Reason |
|------|---------|--------|
| src/popup/index.tsx | Renders `<div>LinkedIn Blocker</div>` | Full popup built in Phase 4 |
| src/content/index.ts | Single console.log | Observer/selector logic in plans 01-03 and 01-04 |
| src/background/index.ts | No-op onMessage handler | Business logic in later phases |
| src/shared/ | Empty directory | Populated in plan 01-03 (storage.ts, types.ts) |

## Threat Surface

All threat mitigations from the plan's threat model applied:

| Threat | Mitigation Applied |
|--------|-------------------|
| T-01-01 host_permissions | Restricted to `https://www.linkedin.com/*` only |
| T-01-02 content script world | No `"world": "MAIN"` in manifest; ISOLATED (default) |
| T-01-03 eval/CSP | ESLint `no-eval: error` rule in eslint.config.js |
| T-01-04 SW state | No module-scope mutable state in background/index.ts |
| T-01-SC supply chain | All packages [VERIFIED] per research; no legitimacy gate needed |

## Installed Package Versions

| Package | Version |
|---------|---------|
| vite | 5.4.21 |
| vite-plugin-web-extension | 4.5.1 |
| typescript | 5.9.3 |
| preact | 10.29.2 |
| @preact/preset-vite | 2.10.5 |
| @types/chrome | 0.1.42 |
| eslint | 9.39.4 |
| prettier | 3.8.3 |

## Self-Check: PASSED

Verified:
- `src/manifest.json`: exists, contains `"manifest_version": 3`
- `src/content/index.ts`: exists, contains `[LLB] content script loaded`
- `src/background/index.ts`: exists, contains `chrome.runtime.onMessage.addListener`
- `src/popup/index.tsx`: exists, imports from `preact`
- `tsconfig.json`: exists, contains `"strict": true`
- `eslint.config.js`: exists, exports array, contains `no-eval`
- `dist/manifest.json`: present after build
- `dist/content/index.js`: present after build
- `dist/background/index.js`: present after build
- `dist/popup/index.html`: present after build
- Commits 071c931 and 8660fa4: verified in git log
