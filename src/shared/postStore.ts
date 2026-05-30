/**
 * LinkedIn Blocker — Post Store
 *
 * Manages persistence of hidden posts in chrome.storage.local for later review.
 * Implements deduplication by URN, text truncation, newest-first ordering,
 * and a 200-entry cap with oldest-entry eviction.
 *
 * Shared module — must NOT import from content/ and must NOT reference the
 * document or the extension runtime. Only chrome.storage.local (via storage wrappers).
 */

import { storageGet, storageSet } from './storage';
import type { StoredPost } from './types';

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

/** Maximum number of stored posts before oldest is evicted. */
const POST_STORE_CAP = 200;

/** Maximum characters of post text to store. */
const POST_TEXT_MAX_CHARS = 1000;

// ---------------------------------------------------------------------------
// persistStoredPost
// ---------------------------------------------------------------------------

/**
 * Persist a hidden post to chrome.storage.local for later review.
 *
 * - Deduplicates by URN (skips if already stored)
 * - Truncates text at POST_TEXT_MAX_CHARS
 * - Prepends to array (newest first)
 * - Evicts oldest entry when POST_STORE_CAP is reached
 */
export async function persistStoredPost(opts: {
  urn: string;
  authorId: string;
  authorName: string;
  score: number;
  text: string;
}): Promise<void> {
  const { urn, authorId, authorName, score, text } = opts;
  const { storedPosts = [] } = await storageGet(['storedPosts']);

  // Dedup: skip if this URN is already stored
  if (storedPosts.some((p: StoredPost) => p.urn === urn)) return;

  const entry: StoredPost = {
    urn,
    authorId,
    authorName,
    score,
    text: text.trim().slice(0, POST_TEXT_MAX_CHARS),
    hiddenAt: Date.now(),
  };

  // Prepend (newest first), then evict oldest if over cap
  const updated = [entry, ...(storedPosts as StoredPost[])];
  if (updated.length > POST_STORE_CAP) updated.pop();

  await storageSet({ storedPosts: updated });
}
