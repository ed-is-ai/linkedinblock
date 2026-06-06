---
phase: 02-detection-engine
plan: "02"
subsystem: signal-functions
tags: [signals, language-detection, heuristics, unit-tests, vitest, fast-levenshtein]
dependency_graph:
  requires: [02-01]
  provides: [checkListicle, checkBuzzwords, checkEmDash, checkCta, checkGenericComments, isNonEnglish]
  affects:
    - src/content/detector/signals/listicle.ts
    - src/content/detector/signals/buzzwords.ts
    - src/content/detector/signals/em-dash.ts
    - src/content/detector/signals/cta.ts
    - src/content/detector/signals/comments.ts
    - src/content/detector/signals/__tests__/signals.test.ts
    - src/content/detector/language.ts
    - src/content/detector/language.test.ts
    - package.json
    - package-lock.json
    - vitest.config.ts
tech_stack:
  added:
    - fast-levenshtein@3.0.0 (direct dependency, Levenshtein edit distance for DETECT-07)
    - "@types/fast-levenshtein@0.0.4 (devDependency, TS declarations)"
    - vitest@4.x (devDependency, test runner — was absent from repo)
    - jsdom (devDependency, DOM environment for language.test.ts)
  patterns:
    - pure-function-signal-modules
    - module-scope-compiled-regex
    - noUncheckedIndexedAccess-non-null-assertion
    - for-of-codepoint-iteration
    - set-based-o1-lookup-before-n2-levenshtein
decisions:
  - "vitest@4.x installed as devDependency (was not in repo); test script added via vitest.config.ts; reporter flag --reporter=basic is not valid in vitest 4.x"
  - "GENERIC_PHRASES set expanded to 15 phrases with > 20 chars each to satisfy the eligibility filter in tests — shorter canonical phrases from RESEARCH.md would all be filtered out by the 20-char minimum"
  - "CTA closer regex \\bshare (this|your thoughts)\\b is intentional and matches 'to share this' — test updated to use text without that substring when testing opener-only path"
metrics:
  duration: ~45min
  completed: "2026-05-25"
  tasks_total: 4
  tasks_completed: 3
  files_changed: 11
---

# Phase 2 Plan 02: Signal Functions Summary

**One-liner:** Five pure text-analysis signal functions (listicle, buzzword, em-dash, CTA, generic-comments) plus a two-step language exclusion utility shipped with 36 passing Vitest assertions, ReDoS regression coverage, and zero DOM references in any signal file.

---

## Tasks Completed

### Task 1: Package legitimacy checkpoint (approved by user — skipped by executor)

`fast-levenshtein@3.0.0` and `@types/fast-levenshtein@0.0.4` were approved by the user at the checkpoint gate before execution. No work required by this executor.

### Task 2: Install fast-levenshtein as direct dependency

Ran `npm install fast-levenshtein@3.0.0` and `npm install --save-dev @types/fast-levenshtein@0.0.4`.

- `package.json` `dependencies["fast-levenshtein"]` = `"^3.0.0"`
- `package.json` `devDependencies["@types/fast-levenshtein"]` = `"^0.0.4"`
- `node -e "require('fast-levenshtein')"` exits 0
- No other dependency entries were added or removed

**Commit:** `b5dcd05`

### Task 3: Five signal functions + Vitest unit tests

Created six files:

**`src/content/detector/signals/listicle.ts`**
- `checkListicle(text): number` — returns 12 (header + numbered items), 8 (numbered items only), 6 (header only), 0
- Module-scope: `NUMBERED_LINE` regex, `LISTICLE_HEADER` regex, `MIN_NUMBERED_ITEMS` const

**`src/content/detector/signals/buzzwords.ts`**
- `checkBuzzwords(text): number` — returns 15 (density > 3/100 words), 8 (> 1.5/100 words), 0
- Module-scope: `BUZZWORDS` array (21 terms), `BUZZ_RE` compiled alternation regex
- 20-word minimum floor (returns 0 for short text)

**`src/content/detector/signals/em-dash.ts`**
- `checkEmDash(text): number` — returns 10 (density > 2/100 words), 5 (> 1/100 words), 0
- 30-word minimum floor

**`src/content/detector/signals/cta.ts`**
- `checkCta(text): number` — returns 10 (opener + closer), 6 (closer only), 4 (opener only), 0
- Module-scope: `CTA_OPENERS` (5 regexes), `CTA_CLOSERS` (7 regexes)

**`src/content/detector/signals/comments.ts`**
- `checkGenericComments(commentTexts): number` — returns 15 (>= 2 exact generic phrase matches), 10 (>= 2 Levenshtein near-dup pairs, distance < 10), 0
- `import levenshtein from 'fast-levenshtein'` (default import)
- Module-scope: `GENERIC_PHRASES` Set (15 entries > 20 chars), `MIN_COMMENT_LENGTH = 20`, `MAX_ELIGIBLE = 20`
- `noUncheckedIndexedAccess` guards: `eligible[i]!` and `eligible[j]!` on inner loop

**`src/content/detector/signals/__tests__/signals.test.ts`**
- 26 assertions across 5 describe blocks
- 1 ReDoS test per signal (3000-char adversarial input, < 50ms threshold)
- Test runner: `vitest@4.x` with `vitest.config.ts` (jsdom environment)

**Commit:** `125fe93`

### Task 4: isNonEnglish language exclusion + tests

**`src/content/detector/language.ts`**
- `isNonEnglish(postNode: Element, postText: string): boolean`
- Step 1: `postNode.closest('[lang]')` — returns true if lang attribute does not start with `"en"`
- Step 2: Samples first 500 chars; counts codepoints > 127 (total) and in `NON_LATIN_RANGES` (nonLatin); returns `total > 10 && nonLatin / total > 0.3`
- `NON_LATIN_RANGES`: 8 ranges covering CJK, Kana, Hangul, Arabic, Hebrew, Cyrillic, Devanagari, Thai
- Uses `for (const ch of sample)` — proper codepoint iteration, avoids surrogate-pair double-counting

**`src/content/detector/language.test.ts`**
- 10 assertions covering: English (false), CJK (true), Cyrillic (true), Arabic (true), French/German accented Latin (false), lang="fr" ancestor (true), lang="en-US" fallthrough (false), tiny-sample guard (false), lang="ja" (true)
- DOM element mocked via a minimal stub satisfying the `Element` shape used by `closest()`

**Commit:** `c3e2762`

---

## Deviations from Plan

### Auto-added: vitest@4.x installed as devDependency

**Rule:** Rule 3 (blocking issue — task requires a test runner that was absent)
**Found during:** Task 3
**Issue:** `node -e "try{require.resolve('vitest');console.log('ok')}catch{console.log('missing')}"` returned `missing`. The plan specifies "install vitest if not already present."
**Fix:** `npm install --save-dev vitest @vitest/coverage-v8 jsdom`. Added `vitest.config.ts` with `environment: 'jsdom'`.
**Files modified:** `package.json`, `package-lock.json`, `vitest.config.ts`
**Commit:** `125fe93`

### Auto-fixed: Test for CTA opener-only case

**Rule:** Rule 1 (bug — test input triggered both opener and closer)
**Found during:** Task 3
**Issue:** The initial test text "Humbled and honored to share this news with my network." contains both an opener (`humbled and honored`) and matched the closer regex `\bshare (this|your thoughts)\b` via "to share this", returning 10 instead of 4.
**Fix:** Updated test text to "Humbled and honored by this recognition from my colleagues. It means a lot." — contains opener phrase only, no closer match.
**Files modified:** `signals.test.ts`
**Commit:** `125fe93`

### Auto-fixed: GENERIC_PHRASES expanded for > 20 char eligibility filter

**Rule:** Rule 2 (missing critical functionality — tests would have silently returned 0 with short phrases)
**Found during:** Task 3
**Issue:** The canonical generic phrases from RESEARCH.md (e.g., "great insights!", "this is gold!") are all ≤ 20 characters and would be filtered out by `t.length > MIN_COMMENT_LENGTH`. The `checkGenericComments` function correctly requires > 20 chars to avoid false positives on short replies.
**Fix:** `GENERIC_PHRASES` set populated with 15 full-sentence variants (> 20 chars each) that represent realistic generic AI-engagement comments. The core algorithm is unchanged; only the canonical phrase list is expanded to match what real bot comments look like.
**Files modified:** `comments.ts`
**Commit:** `125fe93`

---

## Threat Surface Scan

No new network endpoints, auth paths, or file access patterns introduced. Threat mitigations implemented:

| Threat ID | Mitigation Applied |
|-----------|-------------------|
| T-02-05 | All five signal regexes use bounded alternation with `\b` anchors, no nested quantifiers. ReDoS regression test per signal (3000-char adversarial, < 50ms). |
| T-02-06 | `checkGenericComments` caps eligible list at `MAX_ELIGIBLE = 20` (190 comparisons max). |
| T-02-07 | Package legitimacy gate approved by user at Task 1 checkpoint. |
| T-02-08 | Comment text in-memory only; `checkGenericComments` returns a number, not the comment text. |

---

## Known Stubs

None. All signal functions are fully implemented with correct return values.

---

## Self-Check

### Files created/modified

- `src/content/detector/signals/listicle.ts` — FOUND
- `src/content/detector/signals/buzzwords.ts` — FOUND
- `src/content/detector/signals/em-dash.ts` — FOUND
- `src/content/detector/signals/cta.ts` — FOUND
- `src/content/detector/signals/comments.ts` — FOUND
- `src/content/detector/signals/__tests__/signals.test.ts` — FOUND
- `src/content/detector/language.ts` — FOUND
- `src/content/detector/language.test.ts` — FOUND
- `vitest.config.ts` — FOUND
- `package.json` — FOUND (fast-levenshtein, @types/fast-levenshtein, vitest)

### Acceptance criteria checklist

- [x] Five signal files exist under `src/content/detector/signals/`
- [x] Each file exports exactly one named function matching the filename
- [x] No `document.`, `chrome.`, `window.` references in any signal file
- [x] `comments.ts` contains `import levenshtein from 'fast-levenshtein'`
- [x] `signals.test.ts` exists with >= 10 assertions and ReDoS tests per signal
- [x] `npx vitest run` exits 0 — 36 tests passing (26 signals + 10 language)
- [x] `npx tsc --noEmit` exits 0
- [x] `language.ts` exports `isNonEnglish(postNode: Element, postText: string): boolean`
- [x] `language.ts` contains `NON_LATIN_RANGES` at module scope
- [x] `language.ts` contains `for (const ch of` (codepoint iteration)
- [x] `language.test.ts` covers CJK, Cyrillic, Arabic, French, lang="fr" ancestor
- [x] `fast-levenshtein@3.0.0` in `dependencies`, `@types/fast-levenshtein@0.0.4` in `devDependencies`

## Self-Check: PASSED
