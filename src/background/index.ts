console.log('[LLB] service worker started');

chrome.runtime.onInstalled.addListener(() => {
  console.log('[LLB] extension installed');
});

chrome.runtime.onMessage.addListener((_message, _sender, _sendResponse) => {
  // Phase 1 stub: no-op handler
  return false;
});
