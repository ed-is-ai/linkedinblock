---
plan: 14-01
status: complete
completed_at: "2026-05-31"
---

## Summary

Added `npm run package` command to the LinkedIn Blocker extension project.

## What Was Built

- **`package.json`** — added `"package": "npm run build && node scripts/package-zip.js"` script and `archiver@^7.0.0` + `@types/archiver@^6.0.0` devDependencies.
- **`scripts/package-zip.js`** — ESM script that reads the version from `package.json`, zips `dist/` (excluding any existing `.zip` files) at compression level 9, and writes `dist/linkedin-blocker-v{version}.zip`.

## Result

`npm run package` passed successfully.

ZIP output: `dist/linkedin-blocker-v1.2.0.zip`
ZIP size: **27.6 KB** (28 KB on disk)
