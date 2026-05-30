---
phase: 09-export-cleanse
audited_at: "2026-05-30"
auditor: gsd-secure-phase
verdict: PASS — all mitigated threats verified; one accepted threat confirmed by design
---

# Phase 9 — Security Audit

## Trust Boundaries

| Boundary | Direction | Description |
|----------|-----------|-------------|
| user → date input | inbound | `cleanseDate` from `<input type="date">` (browser-validated YYYY-MM-DD or empty string) enters `deriveCleanseCount` / `filterCleansed` |
| dashboard page → chrome.storage.local | write | cleanse operation replaces `flaggedAccounts`, `storedPosts`, wipes `dismissedAccounts` |
| chrome.storage.local → download file | outbound | export functions serialise stored data (including post text in JSON) to a user-initiated filesystem download |

---

## Threat Verification

### T-09-01 — Tampering: invalid / empty date string entering cleanse logic

| Field | Value |
|-------|-------|
| Category | Tampering |
| Disposition | Mitigate |
| Component | `deriveCleanseCount`, `filterCleansed` in `src/dashboard/dataManagement.ts` |

**Mitigation plan:** `new Date('').getTime()` returns `NaN`; NaN comparisons are always `false`, so zero records are removed — a safe default.

**Verification:**
- [dataManagement.ts:67](../../../src/dashboard/dataManagement.ts#L67) — `const cutoffMs = new Date(beforeDateStr).getTime();` (no `.getTime()` guard needed; NaN propagates to comparisons at lines 69–71 and 85–89)
- [dataManagement.test.ts:211–215](../../../src/dashboard/dataManagement.test.ts#L211) — test `'returns { accountCount: 0, postCount: 0 } for empty date string'` asserts exactly this. ✅
- Source comment on line 66: *"date-only strings parse as UTC midnight — stored timestamps are UTC ms, so comparison is correct"* confirms intentional UTC parse. ✅

**Status: VERIFIED**

---

### T-09-02 — Information Disclosure: stored post text exported to filesystem

| Field | Value |
|-------|-------|
| Category | Information Disclosure |
| Disposition | Accept |
| Component | `buildJsonExport` in `src/dashboard/dataManagement.ts` |

**Rationale:** Post text inclusion in the JSON export is an intentional v1.1 feature (user-initiated, local filesystem only). CSV export explicitly excludes post text per requirement D-05.

**Verification:**
- [dataManagement.ts:29](../../../src/dashboard/dataManagement.ts#L29) — `text: p.text` present in JSON output (intentional).
- [dataManagement.ts:38–58](../../../src/dashboard/dataManagement.ts#L38) — `buildCsvExport` takes only `FlaggedAccount[]` — no post data is accessible.
- [dataManagement.test.ts:170–175](../../../src/dashboard/dataManagement.test.ts#L170) — test `'does not include post text in output'` asserts CSV contains no post text. ✅

**Status: ACCEPTED (by design)**

---

### T-09-03 — Tampering: CSV signals field malformed by missing quote-doubling

| Field | Value |
|-------|-------|
| Category | Tampering |
| Disposition | Mitigate |
| Component | `csvEscape` in `src/dashboard/dataManagement.ts` |

**Mitigation plan:** `csvEscape` doubles internal double-quotes _before_ outer-wrapping, preventing `{"key":"value"}` from being emitted as `"{"key":"value"}"` (malformed) instead of `"{""key"":""value""}"` (correct RFC 4180).

**Verification:**
- [dataManagement.ts:8–11](../../../src/dashboard/dataManagement.ts#L8) — guard checks for `,`, `"`, `\n`, `\r`; then `str.replace(/"/g, '""')` runs before wrapping. ✅
- [dataManagement.test.ts:57–59](../../../src/dashboard/dataManagement.test.ts#L57) — test `'doubles internal double-quotes before wrapping'` asserts `csvEscape('say "hi"') === '"say ""hi"""'`. ✅
- [dataManagement.test.ts:161–168](../../../src/dashboard/dataManagement.test.ts#L161) — test `'escapes signals JSON — internal quotes are doubled, field is wrapped'` asserts `""listicle""` and `""buzzwords""` are present in the CSV row. ✅

**Status: VERIFIED**

---

### T-09-04 — Tampering: `handleClean` fired with no date selected

| Field | Value |
|-------|-------|
| Category | Tampering |
| Disposition | Mitigate |
| Component | `handleClean`, Confirm cleanse button in `src/dashboard/index.tsx` |

**Mitigation plan:** Two independent layers:
1. Button `disabled={!cleanseDate}` prevents invocation from the UI entirely.
2. Early-return guard `if (!cleanseDate || !cleansePreview) return;` inside `handleClean` handles any programmatic call.

**Verification:**
- [index.tsx:62](../../../src/dashboard/index.tsx#L62) — `if (!cleanseDate || !cleansePreview) return;` — defense-in-depth guard. ✅
- [index.tsx:179–181](../../../src/dashboard/index.tsx#L179) — `disabled={!cleanseDate}` on the Confirm cleanse button; `style` also switches to `s.destructiveBtnDisabled` (muted visual). ✅
- The `chrome.storage.local.set` call at line 69 is unreachable without a valid `cleanseDate` and a non-null `cleansePreview`. ✅

**Status: VERIFIED**

---

### T-09-05 — Data Loss: cleanse over-deletes (wrong cutoff)

| Field | Value |
|-------|-------|
| Category | Denial of Service / Data Loss |
| Disposition | Mitigate |
| Component | `filterCleansed`, `handleClean` in `src/dashboard/index.tsx` |

**Mitigation plan:**
1. `filterCleansed` is a UTC-correct pure function with a fully-tested strictly-less-than removal boundary.
2. `window.confirm` dialog gates the destructive write and shows the exact count of records that will be removed, requiring explicit user acknowledgement.

**Verification:**
- [dataManagement.ts:74–92](../../../src/dashboard/dataManagement.ts#L74) — `filterCleansed` uses `>= cutoffMs` to keep; `< cutoffMs` to remove; non-mutating (new Record and new filtered array). ✅
- [dataManagement.test.ts:228–233](../../../src/dashboard/dataManagement.test.ts#L228) — test `'account with lastSeenAt exactly equal to cutoff is KEPT'` confirms the boundary. ✅
- [dataManagement.test.ts:250–259](../../../src/dashboard/dataManagement.test.ts#L250) — test `'does not mutate input arrays'`. ✅
- [index.tsx:64–66](../../../src/dashboard/index.tsx#L64) — `window.confirm` message is exactly `Delete ${accountCount} account(s), ${postCount} post(s), and all dismissed entries? This cannot be undone.` ✅
- [index.tsx:69](../../../src/dashboard/index.tsx#L69) — `chrome.storage.local.set` writes only `{ flaggedAccounts, storedPosts, dismissedAccounts: [] }` — `dailyStats` is untouched (D-10). ✅

**Status: VERIFIED**

---

### T-09-06 — Information Disclosure: Blob URL leaks after download

| Field | Value |
|-------|-------|
| Category | Information Disclosure |
| Disposition | Mitigate |
| Component | `triggerDownload` in `src/dashboard/index.tsx` |

**Mitigation plan:** `URL.revokeObjectURL(url)` called immediately after `a.click()`, releasing the Blob URL so the in-memory file content is not accessible beyond the navigation event.

**Verification:**
- [index.tsx:41–49](../../../src/dashboard/index.tsx#L41) — `triggerDownload` creates Blob, creates URL, creates anchor, calls `a.click()`, then immediately calls `URL.revokeObjectURL(url)`. ✅
- The anchor is **not** appended to the DOM (no `document.appendChild`), preventing any secondary access via DOM inspection. ✅

**Status: VERIFIED**

---

## Summary

| Threat ID | Category | Status |
|-----------|----------|--------|
| T-09-01 | Tampering (invalid date → NaN) | ✅ VERIFIED |
| T-09-02 | Information Disclosure (post text in JSON) | ✔ ACCEPTED |
| T-09-03 | Tampering (CSV signals malformed) | ✅ VERIFIED |
| T-09-04 | Tampering (handleClean with no date) | ✅ VERIFIED |
| T-09-05 | Data Loss (cleanse over-deletes) | ✅ VERIFIED |
| T-09-06 | Information Disclosure (Blob URL leak) | ✅ VERIFIED |

**All mitigated threats are present and exercised in code. The one accepted threat (T-09-02) is by design and scoped to local user action only. No unmitigated risks found.**
