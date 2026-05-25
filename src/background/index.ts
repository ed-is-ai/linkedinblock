console.log('[LLB] service worker started');

/**
 * Session-scoped counter. Resets on SW termination, which aligns with
 * session semantics per D-11. This is intentionally NOT persisted to
 * local storage — the badge count is ephemeral by design.
 */
let sessionHiddenCount = 0;

chrome.runtime.onInstalled.addListener(() => {
  console.log('[LLB] extension installed');
  // Set badge background colour at install so it is correct on first hide.
  chrome.action.setBadgeBackgroundColor({ color: '#0077B5' });
});

chrome.runtime.onMessage.addListener((message, _sender, _sendResponse) => {
  // Use optional chaining to defend against non-object messages (T-02-19).
  if (message?.type === 'POST_HIDDEN') {
    sessionHiddenCount++;
    chrome.action.setBadgeText({ text: String(sessionHiddenCount) });
    chrome.action.setBadgeBackgroundColor({ color: '#0077B5' });
  }
  // Return false: synchronous handler, no async sendResponse path.
  return false;
});
