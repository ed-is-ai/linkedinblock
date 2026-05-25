/**
 * Unit tests for isNonEnglish language exclusion utility.
 *
 * Tests cover:
 * - English text → false
 * - CJK text → true
 * - Cyrillic text → true
 * - Arabic text → true
 * - Accented Latin (French) → false (Latin-script European languages pass through)
 * - lang="fr" ancestor attribute → true (regardless of text content)
 * - lang="en-US" ancestor → falls through to codepoint sampling
 * - Short text with < 11 non-ASCII chars → false (avoids tiny-sample false positives)
 */

import { describe, it, expect } from 'vitest';
import { isNonEnglish } from './language';

// ---------------------------------------------------------------------------
// Helper: create a minimal Element stub with a closest() implementation
// ---------------------------------------------------------------------------
interface LangStub {
  lang: string | null;
}

/**
 * Creates a mock DOM element whose `closest('[lang]')` returns either a stub element
 * with the given lang attribute, or null if `lang` is null.
 */
function makeNode(lang: string | null): Element {
  const stub: LangStub = { lang };

  return {
    closest(selector: string): Element | null {
      if (selector === '[lang]' && stub.lang !== null) {
        return {
          getAttribute(attr: string): string | null {
            return attr === 'lang' ? stub.lang : null;
          },
        } as unknown as Element;
      }
      return null;
    },
  } as unknown as Element;
}

/** A node with no lang ancestor. */
const noLangNode = makeNode(null);

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('isNonEnglish', () => {
  it('returns false for plain English text', () => {
    const text = 'Hello world this is English text and it has plenty of words here.';
    expect(isNonEnglish(noLangNode, text)).toBe(false);
  });

  it('returns true for CJK text (> 30% non-Latin codepoints)', () => {
    const text = '你好世界今天天气很好我们一起去散步好不好这真的很美妙';
    expect(isNonEnglish(noLangNode, text)).toBe(true);
  });

  it('returns true for Cyrillic text', () => {
    const text = 'Привет всем сегодня прекрасный день для прогулки по городу';
    expect(isNonEnglish(noLangNode, text)).toBe(true);
  });

  it('returns true for Arabic text', () => {
    const text = 'مرحبا بالعالم اليوم يوم جميل جداً وأتمنى أن يكون يومكم رائعاً';
    expect(isNonEnglish(noLangNode, text)).toBe(true);
  });

  it('returns false for accented Latin (French) — Latin-script passes through', () => {
    const text = "Bonjour à tous, comment allez-vous aujourd'hui ? J'espère que vous allez bien.";
    expect(isNonEnglish(noLangNode, text)).toBe(false);
  });

  it('returns true when closest ancestor has lang="fr" regardless of text', () => {
    const frNode = makeNode('fr');
    const text = 'This text is in English but the lang attribute says otherwise.';
    expect(isNonEnglish(frNode, text)).toBe(true);
  });

  it('falls through to codepoint sampling when lang="en-US" on ancestor', () => {
    const enUsNode = makeNode('en-US');
    // English text + en-US lang → should return false
    const text = 'This is a straightforward English sentence with no unusual characters.';
    expect(isNonEnglish(enUsNode, text)).toBe(false);
  });

  it('returns false when text has < 11 non-ASCII chars (tiny-sample protection)', () => {
    // Only 5 non-ASCII characters — below the 10-char floor
    const text = 'Hello café résumé naïve élite and many more English words to pad the count.';
    // Count non-ASCII: é, é, é, a, ï, v, é — let's check a clean minimal case
    const shortNonAscii = 'Hello à è ì ò ù — these are only 5 non-ASCII vowels in an English sentence.';
    expect(isNonEnglish(noLangNode, shortNonAscii)).toBe(false);
  });

  it('returns false for German text (Latin-script European — passes through)', () => {
    const text =
      'Guten Tag, wie geht es Ihnen heute? Ich hoffe, dass alles in Ordnung ist bei Ihnen.';
    expect(isNonEnglish(noLangNode, text)).toBe(false);
  });

  it('returns true when lang="ja" on ancestor', () => {
    const jaNode = makeNode('ja');
    const text = 'This could be any text';
    expect(isNonEnglish(jaNode, text)).toBe(true);
  });
});
