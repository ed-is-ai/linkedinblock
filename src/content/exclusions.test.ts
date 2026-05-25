/**
 * Tests for checkExclusions — pre-detection hard-exclusion guard.
 * Covers DETECT-02 (sponsored), DETECT-03 (company page), DETECT-04 (non-English),
 * and D-12.4 (Open to Work metadata passthrough).
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { checkExclusions } from './exclusions';
import type { PostData } from '../shared/types';

// Stub for isNonEnglish — we mock the module to control language detection independently
vi.mock('./detector/language', () => ({
  isNonEnglish: vi.fn().mockReturnValue(false),
}));

import { isNonEnglish } from './detector/language';

/** Creates a minimal PostData object for testing. */
function makePostData(overrides: Partial<PostData> = {}): PostData {
  return {
    urn: 'urn:li:activity:1',
    authorId: 'user1',
    authorName: 'Test User',
    authorProfileUrl: 'https://linkedin.com/in/test-user/',
    postText: 'Some English post text for testing.',
    ...overrides,
  };
}

/**
 * Creates a minimal Element mock that supports querySelector and getAttribute.
 * querySelector returns a truthy element when the query matches the sponsored marker,
 * and null otherwise.
 */
function makePostNode(options: {
  sponsoredMatch?: boolean;
  openToWorkMatch?: boolean;
} = {}): Element {
  return {
    querySelector: vi.fn((selector: string) => {
      // Match sponsored marker selectors
      if (
        options.sponsoredMatch &&
        (selector.includes('Promoted') || selector.includes('Sponsored'))
      ) {
        return document.createElement('span');
      }
      // Match Open to Work marker selectors
      if (
        options.openToWorkMatch &&
        (selector.includes('Open to work') || selector.includes('open to work'))
      ) {
        return document.createElement('span');
      }
      return null;
    }),
    closest: vi.fn().mockReturnValue(null),
  } as unknown as Element;
}

describe('checkExclusions', () => {
  beforeEach(() => {
    vi.mocked(isNonEnglish).mockReturnValue(false);
  });

  it('returns excluded=true, reason="sponsored" for sponsored posts (DETECT-02)', () => {
    const postData = makePostData();
    const postNode = makePostNode({ sponsoredMatch: true });
    const result = checkExclusions(postData, postNode);
    expect(result.excluded).toBe(true);
    expect(result.reason).toBe('sponsored');
  });

  it('returns excluded=true, reason="company-page" for company author URLs (DETECT-03)', () => {
    const postData = makePostData({
      authorProfileUrl: 'https://linkedin.com/company/google/',
    });
    const postNode = makePostNode();
    const result = checkExclusions(postData, postNode);
    expect(result.excluded).toBe(true);
    expect(result.reason).toBe('company-page');
  });

  it('returns excluded=true, reason="non-english" when isNonEnglish returns true (DETECT-04)', () => {
    vi.mocked(isNonEnglish).mockReturnValue(true);
    const postData = makePostData({ postText: '今日はとても良い天気です。' });
    const postNode = makePostNode();
    const result = checkExclusions(postData, postNode);
    expect(result.excluded).toBe(true);
    expect(result.reason).toBe('non-english');
  });

  it('returns excluded=false, openToWork=true when Open to Work marker is present (D-12.4)', () => {
    const postData = makePostData();
    const postNode = makePostNode({ openToWorkMatch: true });
    const result = checkExclusions(postData, postNode);
    expect(result.excluded).toBe(false);
    expect(result.openToWork).toBe(true);
  });

  it('returns excluded=false, openToWork=false for a clean post', () => {
    const postData = makePostData();
    const postNode = makePostNode();
    const result = checkExclusions(postData, postNode);
    expect(result.excluded).toBe(false);
    expect(result.openToWork).toBe(false);
  });

  it('sponsored takes precedence over Open to Work — priority check (D-12)', () => {
    // A post that is both sponsored AND Open to Work should return sponsored exclusion
    const postData = makePostData();
    const postNode = makePostNode({
      sponsoredMatch: true,
      openToWorkMatch: true,
    });
    const result = checkExclusions(postData, postNode);
    expect(result.excluded).toBe(true);
    expect(result.reason).toBe('sponsored');
  });
});
