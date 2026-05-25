/**
 * Language detection utility for non-English exclusion.
 *
 * Implements DETECT-04: non-English posts are hard-excluded before any heuristic runs.
 *
 * Algorithm (two-step):
 * 1. Check the `lang` attribute on the post node's nearest ancestor. If present and does
 *    not start with "en", return true immediately (O(1), deterministic).
 * 2. Sample the first 500 characters of postText. Count characters above U+007F (non-ASCII)
 *    and tally those that fall into known non-Latin script Unicode ranges (CJK, Arabic,
 *    Cyrillic, Hebrew, Devanagari, Thai, Hangul, Kana). If > 10 non-ASCII chars are present
 *    and > 30% are non-Latin, classify as non-English.
 *
 * Limitation (accepted for v1): Latin-script non-English languages (French, German, Turkish,
 * Spanish, etc.) pass the codepoint test. The content heuristics are English-specific enough
 * that false positives on these languages are unlikely to reach the auto-hide threshold.
 *
 * Pure DOM reads only: reads `lang` attribute and iterates codepoints. No side effects.
 */

/**
 * Unicode codepoint ranges for non-Latin scripts.
 * Declared at module scope — computed once, never reallocated per call.
 */
const NON_LATIN_RANGES: Array<[number, number]> = [
  [0x4e00, 0x9fff], // CJK Unified Ideographs
  [0x3040, 0x30ff], // Hiragana + Katakana
  [0xac00, 0xd7af], // Korean Hangul
  [0x0600, 0x06ff], // Arabic
  [0x0590, 0x05ff], // Hebrew
  [0x0400, 0x04ff], // Cyrillic
  [0x0900, 0x097f], // Devanagari
  [0x0e00, 0x0e7f], // Thai
];

/**
 * Determines whether a LinkedIn post should be excluded as non-English.
 *
 * @param postNode - The post card DOM element (used to read nearest `lang` ancestor).
 * @param postText - The extracted text content of the post.
 * @returns `true` if the post should be excluded as non-English; `false` if detection
 *          should proceed normally.
 */
export function isNonEnglish(postNode: Element, postText: string): boolean {
  // Step 1: lang attribute on the post node or its nearest ancestor
  const langEl = postNode.closest('[lang]');
  if (langEl) {
    const lang = langEl.getAttribute('lang') ?? '';
    if (lang && !lang.startsWith('en')) return true;
  }

  // Step 2: Script character sampling (first 500 chars only — avoids processing long posts)
  const sample = postText.slice(0, 500);
  let nonLatin = 0;
  let total = 0;

  // Use `for...of` for proper Unicode codepoint iteration
  // (avoids double-counting surrogate pairs from for...i loops)
  for (const ch of sample) {
    const cp = ch.codePointAt(0) ?? 0;
    if (cp > 127) {
      total++;
      if (NON_LATIN_RANGES.some(([lo, hi]) => cp >= lo && cp <= hi)) {
        nonLatin++;
      }
    }
  }

  // Require at least 11 non-ASCII chars before classifying (avoids tiny-sample false positives)
  return total > 10 && nonLatin / total > 0.3;
}
