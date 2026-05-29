import { SELECTORS_VERSION } from './selectors';
import { startObserving } from './observer';
import { HeuristicDetector } from './detector/heuristic';
import { LLMDetector } from './detector/llm';
import { checkExclusions } from './exclusions';
import { injectTombstone } from './detector/tombstone';
import { expandComments, resetExpansionBudget } from './detector/comment-expand';
import { storageGet, storageSet } from '../shared/storage';
import type { Detector, PostData, ObservedPost, FlaggedAccountStub } from '../shared/types';

// ---------------------------------------------------------------------------
// Debug flag — set to true locally to log per-post extraction details
// ---------------------------------------------------------------------------

const DEBUG = true;

// ---------------------------------------------------------------------------
// Threshold constants (D-04)
// ---------------------------------------------------------------------------

const AUTO_HIDE_THRESHOLD = 60;
const FLAG_THRESHOLD = 35;
const OPEN_TO_WORK_PENALTY = 20;

// ---------------------------------------------------------------------------
// CSS injection — runs once at script startup
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

console.log('[LLB] content script starting on', location.href, 'selectors v', SELECTORS_VERSION);

// ---------------------------------------------------------------------------
// persistFlaggedAccount helper
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
    existing.compositeScore = Math.max(existing.compositeScore, compositeScore);
    existing.lastSeenAt = now;
    existing.authorName = authorName;
    existing.authorProfileUrl = authorProfileUrl;
    for (const [key, val] of Object.entries(signals)) {
      existing.signals[key] = Math.max(existing.signals[key] ?? 0, val);
    }
    if (hiddenPostUrn !== null && !existing.hiddenPostUrns.includes(hiddenPostUrn)) {
      existing.hiddenPostUrns.push(hiddenPostUrn);
    }
    flaggedAccounts[authorId] = existing;
  } else {
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
// Async init — reads API key, picks detector, starts observation
// ---------------------------------------------------------------------------

async function init(): Promise<void> {
  const { anthropicApiKey } = await storageGet(['anthropicApiKey']);

  let currentPostNode: Element | null = null;

  const heuristic = new HeuristicDetector({
    fetchComments: async (_post: PostData) =>
      currentPostNode ? expandComments(currentPostNode) : [],
  });

  const detector: Detector = anthropicApiKey
    ? new LLMDetector(heuristic)
    : heuristic;

  console.log('[LLB] detector:', detector.name, anthropicApiKey ? '(LLM mode)' : '(heuristic mode)');

  // SPA navigation reset for comment-expansion budget
  globalThis.addEventListener('popstate', () => resetExpansionBudget());
  const _originalPushState = history.pushState.bind(history);
  history.pushState = function (...args: Parameters<typeof history.pushState>) {
    _originalPushState(...args);
    resetExpansionBudget();
  };

  startObserving((observed: ObservedPost) => {
    const { urn, authorId, authorName, authorProfileUrl, postText, postNode } = observed;
    currentPostNode = postNode;

    const postData: PostData = { urn, authorId, authorName, authorProfileUrl, postText };

    const exclusion = checkExclusions(postData, postNode);
    if (exclusion.excluded) return;

    const effectiveHideThreshold = exclusion.openToWork
      ? AUTO_HIDE_THRESHOLD + OPEN_TO_WORK_PENALTY
      : AUTO_HIDE_THRESHOLD;

    detector.detect(postData).then(async (result) => {
      if (DEBUG) {
        const signals = Object.entries(result.signalBreakdown).map(([k, v]) => `${k}:${v}`).join(' ') || '—';
        console.log(`[LLB] ${result.score.toString().padStart(3)} | ${result.engineUsed} | ${authorName || '<unknown>'} | ${signals}\n${postText}`);
      }

      if (result.score < FLAG_THRESHOLD) return;

      const hide = result.score >= effectiveHideThreshold;

      await persistFlaggedAccount({
        authorId: authorId || urn,
        authorName,
        authorProfileUrl,
        compositeScore: result.score,
        signals: result.signalBreakdown,
        hiddenPostUrn: hide ? urn : null,
      });

      if (hide) {
        postNode.classList.add('llb-hidden');
        injectTombstone(postNode, authorName, result.score);
        chrome.runtime.sendMessage({ type: 'POST_HIDDEN' }).catch(() => {});
      }
    }).catch((err) => {
      console.warn('[LLB] detector failure', err);
    });
  });
}

init();
