/**
 * LinkedIn Blocker — Shared TypeScript Interfaces
 *
 * These interfaces are the contracts between all extension entry points:
 * content script, service worker, popup, and dashboard.
 *
 * Phase 1 provides the foundation types. Phase 2 implements Detector.
 * Phase 3 expands StorageSchema with FlaggedAccount and settings.
 */

/**
 * Represents a single LinkedIn post as extracted from the DOM by the content script.
 * Passed from the content script to detectors (Phase 2+).
 *
 * Security note (T-03-04): PostData passes through memory only and is NEVER persisted
 * to chrome.storage.local. Storing post text would constitute a privacy risk.
 * See STATE.md decision: "never store post text".
 */
export interface PostData {
  /** LinkedIn post URN, e.g. "urn:li:activity:7123456789012345678" */
  urn: string;
  /** Author profile identifier extracted from the profile URL slug */
  authorId: string;
  /** Author display name as shown in the feed */
  authorName: string;
  /** Full author profile URL, e.g. "https://www.linkedin.com/in/username/" */
  authorProfileUrl: string;
  /** Full text content of the post (memory only — never persisted) */
  postText: string;
}

/**
 * Result returned by a Detector implementation after scoring a post.
 * The content script uses the score + confidence to decide whether to flag the post.
 */
export interface DetectionResult {
  /**
   * Composite score 0–100 (integer). Phase 2 changes the range from the Phase 1 0.0–1.0 placeholder.
   * Values >= 60 trigger auto-hide; 35–59 flag for review; < 35 are ignored.
   */
  score: number;
  /** Human-readable list of signals that contributed to the score. Denormalised view of Object.keys(signalBreakdown). */
  signals: string[];
  /**
   * Per-signal numeric breakdown (DETECT-05) — stored alongside the composite score so each signal
   * can be displayed and tuned independently. Keys match the strings emitted in `signals[]`.
   */
  signalBreakdown: Record<string, number>;
  /** Qualitative confidence tier derived from the score */
  confidence: 'high' | 'medium' | 'low';
  /** Which detection engine produced this result */
  engineUsed: 'heuristic' | 'llm';
}

/**
 * Pluggable detector interface (CLAUDE.md §Pluggable Detector Interface).
 * Both HeuristicDetector (Phase 2) and any future LLMDetector implement this.
 * The call site in the content script never changes — only the implementation swaps.
 */
export interface Detector {
  /** Human-readable identifier for this detector, used in logging */
  name: string;
  /** Score a single post and return the detection result */
  detect(post: PostData): Promise<DetectionResult>;
}

/**
 * Phase 2 write shape for a flagged LinkedIn account stored in chrome.storage.local.
 *
 * Phase 3 will expand the `status` union to `'pending' | 'blocked' | 'dismissed'`
 * and add `postCount` and `peakScore` fields without breaking the Phase 2 writer —
 * the Phase 2 writer always sets `status: 'pending'` and Phase 3 readers handle the
 * expanded union gracefully.
 *
 * Keyed by `authorId` in StorageSchema.flaggedAccounts.
 */
export interface FlaggedAccountStub {
  /** LinkedIn profile slug (e.g. "some-user" from /in/some-user/) */
  authorId: string;
  /** Author display name as shown in the feed */
  authorName: string;
  /** Full author profile URL, e.g. "https://www.linkedin.com/in/username/" */
  authorProfileUrl: string;
  /** Highest composite detection score seen for this account (0–100) */
  compositeScore: number;
  /** Per-signal numeric scores — signal name to individual score */
  signals: Record<string, number>;
  /** URNs of posts from this account that have been hidden */
  hiddenPostUrns: string[];
  /** Unix timestamp (ms) when this account was first flagged */
  firstSeenAt: number;
  /** Unix timestamp (ms) when this account was most recently flagged */
  lastSeenAt: number;
  /** Review status — Phase 3 expands this union to include 'blocked' | 'dismissed' */
  status: 'pending';
}

/**
 * Argument shape the observer hands to the onPost callback.
 * The Element reference is memory-only and never persisted — used by exclusions,
 * CSS hide, and tombstone DOM writes.
 *
 * Note: `postNode` is intentionally NOT part of `PostData` (PostData stays serialisable
 * for detector input; postNode is added at the call boundary in content/index.ts).
 */
export interface ObservedPost {
  /** LinkedIn post URN, e.g. "urn:li:activity:7123456789012345678" */
  urn: string;
  /** Author profile identifier extracted from the profile URL slug */
  authorId: string;
  /** Author display name as shown in the feed */
  authorName: string;
  /** Full author profile URL, e.g. "https://www.linkedin.com/in/username/" */
  authorProfileUrl: string;
  /** Full text content of the post (memory only — never persisted) */
  postText: string;
  /** Reference to the outer post card DOM element — used for CSS hiding and tombstone injection */
  postNode: Element;
}

/**
 * Typed schema for chrome.storage.local.
 *
 * Phase 1 stub — Phase 3 expands this with dismissedAccounts and settings.
 *
 * This interface exists in Phase 1 so that storage.ts is generic over a real type
 * rather than `any`, satisfying INFRA-03 and enabling strict-mode compilation.
 */
export interface StorageSchema {
  /**
   * Map of LinkedIn author IDs to flagged account data.
   * Phase 2 writes FlaggedAccountStub entries; Phase 3 expands the type further.
   */
  flaggedAccounts?: Record<string, FlaggedAccountStub>;
}
