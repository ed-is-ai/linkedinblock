---
plan: 13-01
status: complete
completed_at: "2026-05-30"
---

## Summary

Created `PRIVACY.md` in the project root (3223 characters). The policy covers:

- All five data types stored in `chrome.storage.local` (flagged accounts, post text, daily stats, dismissed IDs, optional API key)
- LinkedIn data access scope (feed page only; no credentials, messages, or connections)
- Opt-in AI-powered detection via Anthropic API with instructions to set/remove the key
- Data deletion paths: dashboard "Cleanse data before" control and uninstall
- Third-party services table (Anthropic API only, no analytics or ads)

Permissions confirmed against `src/manifest.json`: `storage`, `activeTab`, host permissions for `linkedin.com` and `api.anthropic.com`.

Verification passed: all required terms present (`chrome.storage.local`, `api.anthropic.com`, `opt-in`, `Cleanse`, `uninstall`).
