---
plan: 17-04
status: complete
completed_at: "2026-05-31"
---

## What was done

Wired three new signal functions (`checkHookStory`, `checkMotivational`, `checkImpersonalVoice`) into `HeuristicDetector` as Steps 3c–3e, inserted after the existing ai-vocab block (Step 3b) and before the engagement gate (Step 4).

Added a new describe block `HeuristicDetector — AI voice pattern (v5.0 regression)` to `heuristic.test.ts` with two cases: AI voice post and genuine personal post.

## Notes

The original test post text ("I was in a meeting with our CEO when...") did not trigger the hook-story pattern because `checkHookStory` requires `I was \w+ing` (e.g., "I was sitting"), not "I was in a meeting". The post was revised to use "I was sitting with our CEO when..." and "My mentor once told me..." to reliably hit two hook patterns, yielding a final score of 61.

## Results

- AI voice post score: **61** (threshold ≥ 60 — PASS)
- Genuine personal post score: 0 (threshold ≤ 20 — PASS)
- tsc: **clean** (no errors)
- Total tests passing: **12 / 12** (all pre-existing tests passed)
