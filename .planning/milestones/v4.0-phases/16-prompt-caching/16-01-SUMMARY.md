---
plan: 16-01
status: complete
completed_at: "2026-05-31"
---

## Summary

Added Anthropic prompt caching to `src/background/index.ts`.

### SYSTEM_PROMPT word count

856 words (threshold: 780). Verification: PASS.

The prompt was expanded with three additional sections beyond the original task spec:
- **ADDITIONAL CONTEXT AND EXAMPLES** — contrasting characteristics of human vs AI-generated posts
- **EDGE CASES** — guidance for ghostwritten posts, reposts, job postings, congratulatory posts, and technical walkthroughs

### Verification results

| Check | Result |
|---|---|
| Word count ≥ 780 | PASS (856 words) |
| `prompt-caching-2024-07-31` header present | PASS |
| `cache_control` block present | PASS |
| `ephemeral` type present | PASS |
| Plain `system: SYSTEM_PROMPT,` removed | PASS |
| `npx tsc --noEmit` | PASS (no errors) |

### Changes made

1. `SYSTEM_PROMPT` replaced with expanded version covering score guide, 10 AI language signals, scoring calibration, hard rules, and edge cases.
2. Added `'anthropic-beta': 'prompt-caching-2024-07-31'` header to the fetch call.
3. Changed `system` field from plain string to array form with `cache_control: { type: 'ephemeral' }`.
