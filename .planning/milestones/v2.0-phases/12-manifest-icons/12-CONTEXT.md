---
phase: 12-manifest-icons
milestone: v2.0
requirements: [CWS-01, CWS-02]
status: planning
---

# Phase 12 Context — Manifest Compliance & Icons

## Goal

Make the extension technically ready for Chrome Web Store submission: correct manifest fields, branded icons at all required sizes.

## Current State (gap analysis)

| Field | Current | Required |
|-------|---------|---------|
| `version` | `"0.1.0"` | `"1.2.0"` (matches milestone history) |
| `icons` | absent | `{"16": ..., "48": ..., "128": ...}` |
| `action.default_icon` | absent | `{"16": ..., "48": ...}` |
| `homepage_url` | absent | GitHub repo URL |
| Icon PNG files | none | `src/icons/icon-16.png`, `icon-48.png`, `icon-128.png` |
| `api.anthropic.com` in `host_permissions` | present, undocumented | Keep + add store justification note |

## Design Decisions

| Decision | Outcome |
|----------|---------|
| Icon location | `src/icons/` — relative to `src/manifest.json`, so paths in manifest are `"icons/icon-16.png"` |
| Icon generation | SVG source at `src/icons/icon.svg` + `scripts/generate-icons.js` using `sharp` |
| Icon design | LinkedIn blue (#0a66c2) rounded square, white shield, blue diagonal slash (content filter/block) |
| `api.anthropic.com` | Keep in `host_permissions` — LLM feature is real; add justification in `store/LISTING.md` (Phase 13) |
| `homepage_url` | `https://github.com/ed-is-ai/linkedinaivoiceblock` |
| Version | `1.2.0` in both `manifest.json` and `package.json` |

## Files Touched

| Plan | Files |
|------|-------|
| 12-01 | `src/icons/icon.svg`, `scripts/generate-icons.js`, `src/icons/icon-16.png`, `src/icons/icon-48.png`, `src/icons/icon-128.png`, `package.json` (add sharp devDep + generate script) |
| 12-02 | `src/manifest.json`, `package.json` (version bump) |

## Vite / vite-plugin-web-extension notes

- Root is `src/`, manifest is at `src/manifest.json`
- Icon paths in manifest are relative to the manifest — `"icons/icon-16.png"` resolves to `src/icons/icon-16.png`
- The plugin copies all manifest-referenced assets into `dist/`
- `sharp` is a devDependency; the generate-icons script runs once and the PNG outputs are committed
