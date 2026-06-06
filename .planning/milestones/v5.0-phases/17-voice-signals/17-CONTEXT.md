---
phase: 17-voice-signals
milestone: v5.0
requirements: [VOICE-01, VOICE-02, VOICE-03, VOICE-04, VOICE-05]
status: planning
---

# Phase 17 Context — Voice Signal Functions

## Problem

AI "voice" style posts score 0 under the current heuristic. These posts use a
first-person narrative hook, motivational punch rhythm, and generic third-person
framing — none of which fire any existing signal (listicle/buzzword/em-dash/ai-vocab).

Example post that currently scores ~6 (CTA closer only):

> "I was in a meeting with our CEO when he said something that changed how I think
> about leadership. He looked at me and said: 'Most people want to be successful.
> But very few want to do what success actually requires.'
> 
> That hit me differently.
> 
> Most people focus on the result. The top performers focus on the process.
> 
> Stop chasing outcomes. Start building habits.
> 
> What process are you focusing on this week?"

Target score after v5: ≥ 60 (hook-story 20 + motivational 20 + impersonal 15 + cta 6 = 61).

## New signals

| Signal | File | Max | What it detects |
|--------|------|-----|----------------|
| `checkHookStory` | `hook-story.ts` | 20 | Fictional/neat first-person anecdote openers |
| `checkMotivational` | `motivational.ts` | 20 | Punchy motivational rhythm ("Stop X. Start Y.", "Most people...") |
| `checkImpersonalVoice` | `impersonal.ts` | 15 | Generic third-person claims ("Successful leaders do...", "Most professionals...") |

## Style rules (from existing signals)

- Pure function: `export function checkX(text: string): number`
- Regex arrays compiled at module scope: `const X: readonly RegExp[] = [...]`
- Reset `lastIndex = 0` before reusing global regexes
- Return 0 for texts under 20 words
- Avoid ReDoS: no unbounded `.+` in loops; use `.{0,N}` bounded quantifiers
- Each signal gets its own test file in `signals/__tests__/`

## Integration target (VOICE-05)

A representative AI voice post (hook + motivational + impersonal, no listicle/buzzwords)
must score ≥ 60 in an integration test in `heuristic.test.ts`. This validates that the
three signals combine correctly to exceed the hide threshold.
