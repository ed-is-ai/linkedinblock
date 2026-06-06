---
phase: "01"
phase_slug: foundation
date: "2026-05-25"
---

# Phase 1: Foundation — Validation Strategy

## Test Framework

Phase 1 is a scaffold phase with minimal testable logic. No unit-test framework is introduced here.

**Rationale:** The selector registry and TypeScript types are pure data/interfaces with no logic. The `waitForFeedContainer` retry loop and SPA navigation handler are DOM-dependent and cannot be meaningfully unit-tested without a browser DOM. A testing framework (Vitest) is planned for Phase 2 when the heuristic scoring logic becomes unit-testable.

| Framework | Value |
|-----------|-------|
| Framework | None |
| Config file | N/A — add in Phase 2 |
| Quick run command | `npm run build` |
| Full verification | Manual: load unpacked extension in Chrome, open LinkedIn, check DevTools console |

---

## Automated Gates

| Gate | Command | What it proves |
|------|---------|----------------|
| TypeScript compilation | `npm run build` | All types resolve; no type errors in any source file |
| Type-only check | `npx tsc --noEmit` | Same as above without emitting dist/ |
| INFRA-04 selector isolation | `grep -r "data-urn\|data-finite-scroll\|data-anonymize" src/ --include="*.ts" --exclude="selectors.ts"` exits non-zero | No selector strings exist outside `src/content/selectors.ts` |

The INFRA-04 grep gate is enforced as an acceptance criterion in plan 01-04 — it will block the plan if any TypeScript file outside `selectors.ts` contains raw LinkedIn selector strings.

---

## Manual Checkpoints

| Plan | Task | What to verify |
|------|------|----------------|
| 01-01 | Task 3 | Load unpacked extension in `chrome://extensions`; confirm it appears active with no errors in the service worker console |
| 01-02 | Task 1 | Open LinkedIn feed in DevTools; document actual `data-*` attributes on post cards and feed container in `DOM-INSPECTION.md` |
| 01-04 | Task 3 | On LinkedIn feed: scroll to trigger observer logs (URN + author per card); navigate to a profile and back; confirm logs resume |

---

## Phase Requirements → Validation Map

| Req ID | Behavior | Validation Type | Command / Action |
|--------|----------|-----------------|------------------|
| INFRA-01 | Extension loads without errors | Automated + Manual | `npm run build` succeeds; load in `chrome://extensions` without error |
| INFRA-02 | MutationObserver logs URN + author per post card | Manual | DevTools console on LinkedIn feed shows `[LLB]` logs with URN and author name |
| INFRA-03 | Typed `chrome.storage.local` wrapper compiles | Automated | `npm run build` / `npx tsc --noEmit` exits 0 |
| INFRA-04 | All selectors in `selectors.ts`, none elsewhere | Automated (grep) | INFRA-04 grep gate exits non-zero if any violation found |
| INFRA-05 | Observer survives SPA navigation | Manual | Navigate LinkedIn feed → profile → feed; console logs resume without page reload |

---

## Wave 0 Gaps

- [ ] `eslint.config.js` — custom lint rule or CI grep to enforce "no querySelector calls outside selectors.ts"
- [ ] `tsconfig.json` — TypeScript strict mode confirmed in plan 01-01

*(No unit test files needed in Phase 1 — logic unit tests begin in Phase 2 with HeuristicDetector.)*
