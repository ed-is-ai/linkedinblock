/**
 * Unit tests for the five pure signal functions.
 *
 * Covers:
 * - Happy-path assertions per plan <behavior> spec
 * - Edge cases (short text, no signal, partial signal)
 * - ReDoS regression: each signal must complete in < 50ms on a 3000-char adversarial string
 */

import { describe, it, expect } from 'vitest';
import { checkListicle } from '../listicle';
import { checkBuzzwords } from '../buzzwords';
import { checkEmDash } from '../em-dash';
import { checkCta } from '../cta';
import { checkGenericComments } from '../comments';

// ---------------------------------------------------------------------------
// Helper: time a synchronous function call
// ---------------------------------------------------------------------------
function elapsed(fn: () => unknown): number {
  const start = performance.now();
  fn();
  return performance.now() - start;
}

// ---------------------------------------------------------------------------
// checkListicle
// ---------------------------------------------------------------------------
describe('checkListicle', () => {
  it('returns >= 8 for a numbered listicle with >= 3 lines', () => {
    const text = 'Some intro text\n1. Foo\n2. Bar\n3. Baz\nSome outro';
    expect(checkListicle(text)).toBeGreaterThanOrEqual(8);
  });

  it('returns 12 for a listicle header + >= 2 numbered items', () => {
    const text =
      'Here are 5 things you must do to succeed in your career\n1. Wake up early\n2. Read every day\n3. Network constantly';
    expect(checkListicle(text)).toBe(12);
  });

  it('returns 0 for plain prose', () => {
    const text = 'I went to the store today. It was a wonderful experience.';
    expect(checkListicle(text)).toBe(0);
  });

  it('returns 6 for a header with no numbered lines (truncated content)', () => {
    const text = 'Here are 3 reasons why you should invest in yourself.';
    expect(checkListicle(text)).toBe(6);
  });

  it('ReDoS: 3000-char repeated pattern completes in < 50ms', () => {
    const adversarial = '1. 1. 1. '.repeat(334); // ~3006 chars of repeated numbered pattern
    const ms = elapsed(() => checkListicle(adversarial));
    expect(ms).toBeLessThan(50);
  });
});

// ---------------------------------------------------------------------------
// checkBuzzwords
// ---------------------------------------------------------------------------
describe('checkBuzzwords', () => {
  it('returns 15 for high buzzword density (> 3/100 words)', () => {
    const text =
      'We will leverage synergy to pivot to a disruptive paradigm shift across actionable insights for thought leaders who seek scalable bandwidth with bleeding edge value-add and innovative holistic low-hanging fruit that moves the needle.';
    expect(checkBuzzwords(text)).toBe(15);
  });

  it('returns 0 for ordinary prose', () => {
    const text =
      'I had coffee with a friend today and we talked about the weather and our weekend plans together and made arrangements to meet again next week.';
    expect(checkBuzzwords(text)).toBe(0);
  });

  it('returns 0 for text under 20 words even with buzzwords', () => {
    const text = 'We will leverage synergy';
    expect(checkBuzzwords(text)).toBe(0);
  });

  it('returns 8 for moderate buzzword density (1.5–3/100 words)', () => {
    // ~100 neutral words + 2 buzzword hits → density ~2/100
    const filler = new Array(98).fill('word').join(' ');
    const text = `${filler} leverage synergy`;
    expect(checkBuzzwords(text)).toBe(8);
  });

  it('ReDoS: 3000-char string of repeated chars completes in < 50ms', () => {
    const adversarial = 'a'.repeat(3000);
    const ms = elapsed(() => checkBuzzwords(adversarial));
    expect(ms).toBeLessThan(50);
  });
});

// ---------------------------------------------------------------------------
// checkEmDash
// ---------------------------------------------------------------------------
describe('checkEmDash', () => {
  it('returns >= 5 for text of 50 words with 2 em-dashes (density ~4/100)', () => {
    const words = new Array(48).fill('word').join(' ');
    const text = `First part — second part ${words} — final`;
    const wordCount = text.trim().split(/\s+/).length;
    expect(wordCount).toBeGreaterThanOrEqual(50);
    expect(checkEmDash(text)).toBeGreaterThanOrEqual(5);
  });

  it('returns 10 for density > 2/100 words on a 50-word text with 2 em-dashes', () => {
    // 50 words, 2 em-dashes → 4/100 → returns 10
    const words = new Array(46).fill('word').join(' ');
    const text = `word — word — ${words}`;
    expect(checkEmDash(text)).toBe(10);
  });

  it('returns 0 for text with no em-dashes', () => {
    const text = new Array(50).fill('ordinary word').join(' ');
    expect(checkEmDash(text)).toBe(0);
  });

  it('returns 0 for text under 30 words even with em-dashes', () => {
    const text = 'Short — text — with — five — em — dashes here now.';
    // Should be < 30 words
    expect(checkEmDash(text)).toBe(0);
  });

  it('ReDoS: 3000-char string of em-dashes completes in < 50ms', () => {
    const adversarial = '— '.repeat(1500); // 3000 chars of em-dashes
    const ms = elapsed(() => checkEmDash(adversarial));
    expect(ms).toBeLessThan(50);
  });
});

// ---------------------------------------------------------------------------
// checkCta
// ---------------------------------------------------------------------------
describe('checkCta', () => {
  it("returns 10 for text containing both opener and closer", () => {
    const text =
      "I'm excited to announce my new project. We've worked hard on this. What do you think?";
    expect(checkCta(text)).toBe(10);
  });

  it('returns 6 for text with only a closer phrase', () => {
    const text = 'Here is some insight. Drop a comment below if you agree.';
    expect(checkCta(text)).toBe(6);
  });

  it('returns 4 for text with only an opener phrase', () => {
    // "humbled and honored" = opener; no closer phrase present
    const text = 'Humbled and honored by this recognition from my colleagues. It means a lot.';
    expect(checkCta(text)).toBe(4);
  });

  it('returns 0 for plain text with no CTA patterns', () => {
    const text = 'I had a productive meeting today and learned something new.';
    expect(checkCta(text)).toBe(0);
  });

  it('ReDoS: 3000-char string completes in < 50ms', () => {
    const adversarial = 'aaa'.repeat(1000); // 3000 'a' chars
    const ms = elapsed(() => checkCta(adversarial));
    expect(ms).toBeLessThan(50);
  });
});

// ---------------------------------------------------------------------------
// checkGenericComments
// ---------------------------------------------------------------------------
describe('checkGenericComments', () => {
  it('returns 0 when all comments are too short (<= 20 chars)', () => {
    const comments = ['Great insights!', "Couldn't agree more!", 'This is gold!'];
    // All are <= 20 chars, so eligible list is empty
    expect(checkGenericComments(comments)).toBe(0);
  });

  it('returns 15 when >= 2 comments exactly match the generic phrase list', () => {
    const comments = [
      'great insights! this really resonated with me.', // exact match (>20 chars)
      "couldn't agree more! this is exactly what i needed.", // exact match (>20 chars)
      'A different comment that is longer than twenty characters.',
    ];
    expect(checkGenericComments(comments)).toBe(15);
  });

  it('returns 10 when >= 2 near-duplicate pairs exist (Levenshtein < 10)', () => {
    // Three near-identical long strings — will produce >= 2 near-dup pairs
    const comments = [
      'This is a wonderful and insightful post thank you',
      'This is a wonderful and insightful post thank you!', // 1 char diff
      'This is a wonderful and insightful post thank yoU', // 1 char diff (capital)
    ];
    expect(checkGenericComments(comments)).toBe(10);
  });

  it('returns 0 when there is only one long unique comment', () => {
    const comments = ['A single long unique comment that is definitely more than twenty chars.'];
    expect(checkGenericComments(comments)).toBe(0);
  });

  it('returns 0 for diverse long comments with no near-duplicates', () => {
    const comments = [
      'This post made me think about the complexity of modern work environments.',
      'I disagree with this perspective — the evidence suggests otherwise.',
      'Great story, but I think the conclusion could be stronger with data.',
    ];
    expect(checkGenericComments(comments)).toBe(0);
  });

  it('ReDoS: 3000-char repeated string completes in < 50ms', () => {
    const adversarial = new Array(20).fill('a'.repeat(150));
    const ms = elapsed(() => checkGenericComments(adversarial));
    expect(ms).toBeLessThan(50);
  });
});
