import { SELECTORS_VERSION } from './selectors';
import { startObserving } from './observer';
import { HeuristicDetector } from './detector/heuristic';
import { checkExclusions } from './exclusions';
import { injectTombstone } from './detector/tombstone';
import { expandComments, resetExpansionBudget } from './detector/comment-expand';
import { storageGet, storageSet } from '../shared/storage';
import type { PostData, ObservedPost, FlaggedAccountStub } from '../shared/types';

// ---------------------------------------------------------------------------
// Threshold constants (D-04)
// ---------------------------------------------------------------------------

/** Posts scoring >= AUTO_HIDE_THRESHOLD are hidden immediately. */
const AUTO_HIDE_THRESHOLD = 60;
/** Posts scoring >= FLAG_THRESHOLD are written to storage for review. */
const FLAG_THRESHOLD = 35;
/** Added to AUTO_HIDE_THRESHOLD when the author has Open to Work enabled (D-12.4). */
const OPEN_TO_WORK_PENALTY = 20;

// ---------------------------------------------------------------------------
// CSS injection — runs once at script startup
// .llb-* class names are OUR own, not LinkedIn selectors (CLAUDE.md constraint #1 is satisfied)
// ---------------------------------------------------------------------------

if (!document.getElementById('llb-styles')) {
  const style = document.createElement('style');
  style.id = 'llb-styles';
  style.textContent = [
    '.llb-hidden { display: none !important; }',
    '.llb-tombstone {',
    '  padding: 8px 16px;',
    '  background: #f3f2ef;',
    '  border: 1px solid #e0e0e0;',
    '  border-radius: 4px;',
    '  color: #666;',
    '  font-size: 14px;',
    '  cursor: pointer;',
    '  margin: 4px 0;',
    '}',
    '.llb-tombstone:hover { background: #e8e8e8; }',
  ].join('\n');
  document.head.appendChild(style);
}

// ---------------------------------------------------------------------------
// Startup log (retained from Phase 1)
// ---------------------------------------------------------------------------

console.log(
  '[LLB] content script starting on',
  location.href,
  'selectors v',
  SELECTORS_VERSION
);

// ---------------------------------------------------------------------------
// Detector instantiation
// ---------------------------------------------------------------------------

/**
 * Captures the post card element currently being processed.
 * The closure below uses this so that HeuristicDetector can call expandComments
 * without PostData needing to carry a DOM reference (PostData stays serialisable).
 */
let currentPostNode: Element | null = null;

const detector = new HeuristicDetector({
  fetchComments: async (_post: PostData) =>
    currentPostNode ? expandComments(currentPostNode) : [],
});

// ---------------------------------------------------------------------------
// SPA navigation reset for comment-expansion budget
//
// observer.ts owns its own SPA reinit via pushState patching and popstate.
// We register a second, independent popstate listener here that ONLY resets
// the expansion budget. This is a defensive double-hook and does not interfere
// with observer.ts's own SPA handling — each listener is independent.
// ---------------------------------------------------------------------------

window.addEventListener('popstate', () => {
  resetExpansionBudget();
});

// Also hook pushState so direct SPA navigations (LinkedIn's primary nav) reset the budget.
// We wrap AFTER observer.ts has already wrapped it; chaining is safe because each wrapper
// calls the prior function first (observer.ts does the same).
const _originalPushState = history.pushState.bind(history);
history.pushState = function (...args: Parameters<typeof history.pushState>) {
  _originalPushState(...args);
  resetExpansionBudget();
};

// ---------------------------------------------------------------------------
// persistFlaggedAccount helper
// Writes a FlaggedAccountStub to storage via storageGet/storageSet wrappers ONLY.
// NEVER stores postText (privacy decision in STATE.md / T-02-14).
// ---------------------------------------------------------------------------

async function persistFlaggedAccount(opts: {
  authorId: string;
  authorName: string;
  authorProfileUrl: string;
  compositeScore: number;
  signals: Record<string, number>;
  hiddenPostUrn: string | null;
}): Promise<void> {
  const { authorId, authorName, authorProfileUrl, compositeScore, signals, hiddenPostUrn } = opts;

  const { flaggedAccounts = {} } = await storageGet(['flaggedAccounts']);

  const existing = flaggedAccounts[authorId];
  const now = Date.now();

  if (existing) {
    // Merge: take the peak composite score (conservative rolling-score per Plan 03 notes)
    existing.compositeScore = Math.max(existing.compositeScore, compositeScore);
    existing.lastSeenAt = now;
    existing.authorName = authorName;
    existing.authorProfileUrl = authorProfileUrl;

    // Merge per-signal scores: keep the max value seen for each signal
    for (const [key, val] of Object.entries(signals)) {
      existing.signals[key] = Math.max(existing.signals[key] ?? 0, val);
    }

    // Append the post URN to hiddenPostUrns if this post was hidden and not already recorded
    if (hiddenPostUrn !== null && !existing.hiddenPostUrns.includes(hiddenPostUrn)) {
      existing.hiddenPostUrns.push(hiddenPostUrn);
    }

    flaggedAccounts[authorId] = existing;
  } else {
    // New entry
    const stub: FlaggedAccountStub = {
      authorId,
      authorName,
      authorProfileUrl,
      compositeScore,
      signals: { ...signals },
      hiddenPostUrns: hiddenPostUrn !== null ? [hiddenPostUrn] : [],
      firstSeenAt: now,
      lastSeenAt: now,
      status: 'pending',
    };
    flaggedAccounts[authorId] = stub;
  }

  await storageSet({ flaggedAccounts });
}

// ---------------------------------------------------------------------------
// Detection pipeline — wires observer -> exclusions -> detector -> routing
// ---------------------------------------------------------------------------

startObserving((observed: ObservedPost) => {
  const { urn, authorId, authorName, authorProfileUrl, postText, postNode } = observed;

  // Update the module-scope capture so fetchComments closure has the current node
  currentPostNode = postNode;

  const postData: PostData = { urn, authorId, authorName, authorProfileUrl, postText };

  // Hard-exclusions run FIRST (DETECT-02/03/04). If excluded, abort immediately.
  const exclusion = checkExclusions(postData, postNode);
  if (exclusion.excluded) return;

  // Raise threshold by +20 when author has Open to Work enabled (D-12.4)
  const effectiveHideThreshold = exclusion.openToWork
    ? AUTO_HIDE_THRESHOLD + OPEN_TO_WORK_PENALTY
    : AUTO_HIDE_THRESHOLD;

  detector.detect(postData).then(async (result) => {
    // Below FLAG_THRESHOLD: no storage write, no hide (D-04)
    if (result.score < FLAG_THRESHOLD) return;

    const hide = result.score >= effectiveHideThreshold;

    // Write to storage for both flag-only AND hide cases.
    // NEVER includes postText in the stored record (privacy decision / T-02-14).
    await persistFlaggedAccount({
      authorId: authorId || urn, // fall back to urn if no /in/ slug was parsed
      authorName,
      authorProfileUrl,
      compositeScore: result.score,
      signals: result.signalBreakdown,
      hiddenPostUrn: hide ? urn : null,
    });

    if (hide) {
      // Apply CSS hide — classList.add is safe; element.remove() is forbidden (CLAUDE.md #2)
      postNode.classList.add('llb-hidden');
      injectTombstone(postNode, authorName, result.score);
      // Notify the service worker to increment the badge counter (D-11).
      // .catch() swallows errors when the SW is sleeping or the extension context
      // has been invalidated (PITFALLS COMMON-4 / T-02-17).
      chrome.runtime.sendMessage({ type: 'POST_HIDDEN' }).catch(() => {
        // SW may be sleeping or extension context may be invalidated — acceptable per D-11
      });
    }
  }).catch((err) => {
    console.warn('[LLB] detector failure', err);
  });
});
