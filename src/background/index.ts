console.log('[LLB] service worker started');

chrome.runtime.onMessage.addListener((_message, _sender, _sendResponse) => {
  // Phase 1 stub: no-op handler
  return false;
});
