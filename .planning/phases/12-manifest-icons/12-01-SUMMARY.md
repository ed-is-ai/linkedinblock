---
plan: 12-01
status: complete
completed_at: "2026-05-30"
---

## Summary

Created branded extension icons for the LinkedIn Blocker Chrome extension.

### Files Created

- `src/icons/icon.svg` — SVG source: LinkedIn blue rounded-square background (#0a66c2), white shield body, diagonal blue slash (block/filter symbol)
- `scripts/generate-icons.js` — Node ESM script using `sharp` to rasterise the SVG at 16, 48, and 128px
- `src/icons/icon-16.png` — 412 bytes
- `src/icons/icon-48.png` — 1,000 bytes
- `src/icons/icon-128.png` — 2,345 bytes

### package.json Changes

- Added `"sharp": "^0.33.0"` to `devDependencies`
- Added `"generate-icons": "node scripts/generate-icons.js"` to `scripts`
