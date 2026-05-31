---
plan: 15-01
status: complete
completed_at: "2026-05-31"
---

# Phase 15-01 Summary — URL Rename

## What was done

Replaced all occurrences of `ed-is-ai/linkedinblock` with `ed-is-ai/linkedinaivoiceblock` across live source files and archived planning docs, updated the git remote, and rebuilt the extension ZIP.

## Files updated

### Live source files (4)

| File | Occurrences replaced |
|------|---------------------|
| `src/manifest.json` | 1 (`homepage_url`) |
| `PRIVACY.md` | 1 (GitHub Issues link) |
| `store/LISTING.md` | 2 (detailed description + privacy policy URL) |
| `store/SUBMISSION_GUIDE.md` | 2 (homepage URL + privacy policy URL) |

### Archived planning docs (7)

| File | Occurrences replaced |
|------|---------------------|
| `.planning/phases/12-manifest-icons/12-CONTEXT.md` | 1 |
| `.planning/phases/12-manifest-icons/12-02-PLAN.md` | 1 |
| `.planning/phases/13-store-assets/13-CONTEXT.md` | 1 |
| `.planning/phases/13-store-assets/13-01-PLAN.md` | 2 |
| `.planning/phases/13-store-assets/13-02-PLAN.md` | 2 |
| `.planning/phases/14-package-submit/14-CONTEXT.md` | 1 |
| `.planning/phases/14-package-submit/14-02-PLAN.md` | 1 |

## Verification results

- Live file scan: all 4 files confirmed free of old URL
- Git remote: `https://github.com/ed-is-ai/linkedinaivoiceblock.git` confirmed
- `npm run package` completed successfully

## ZIP

`dist/linkedin-blocker-v1.2.0.zip` — 28 KB
