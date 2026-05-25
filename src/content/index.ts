import { SELECTORS_VERSION } from './selectors';
import { startObserving } from './observer';

console.log(
  '[LLB] content script starting on',
  location.href,
  'selectors v',
  SELECTORS_VERSION
);

startObserving(({ urn, authorName }) => {
  console.log('[LLB] post', urn, 'by', authorName);
});
