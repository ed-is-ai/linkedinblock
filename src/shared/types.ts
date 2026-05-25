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
   * Aggregate AI likelihood score from 0.0 (human) to 1.0 (AI-generated).
   * Phase 2 heuristic detector maps signal counts to this range.
   */
  score: number;
  /** Human-readable list of signals that contributed to the score */
  signals: string[];
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
 * Typed schema for chrome.storage.local.
 *
 * Phase 1 stub — Phase 3 expands this with FlaggedAccount, dismissedAccounts, settings.
 *
 * This interface exists in Phase 1 so that storage.ts is generic over a real type
 * rather than `any`, satisfying INFRA-03 and enabling strict-mode compilation.
 */
export interface StorageSchema {
  /**
   * Map of LinkedIn author IDs to flagged account data.
   * Stub in Phase 1 — Phase 3 replaces `unknown` with the FlaggedAccount interface.
   */
  flaggedAccounts?: Record<string, unknown>;
}
