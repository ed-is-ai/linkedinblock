/**
 * Tombstone DOM utility — injects a sibling div before a hidden post.
 *
 * When a post is hidden (class 'llb-hidden' added by content/index.ts), the tombstone
 * provides a click-to-reveal control to the user.
 *
 * Injection design (D-08, Pitfall 4 / T-02-12):
 *   The tombstone is inserted as a SIBLING before postNode using parentNode.insertBefore().
 *   It is NEVER injected inside postNode. Injecting inside postNode would allow LinkedIn's
 *   React reconciler to remove it when the virtual DOM syncs, breaking the reveal control.
 *   Injecting at the parent (a feed list container) is stable across reconciliation cycles.
 *
 * Security note (D-09, T-02-09 XSS mitigation):
 *   authorName is set via `tombstone.textContent = ...` ONLY — never via the inner-HTML
 *   property. authorName originates from DOM text (observer.ts innerText), but passing it
 *   through textContent ensures any HTML characters are treated as literal text, not markup.
 *
 * CSS note:
 *   `.llb-tombstone` styling and `.llb-hidden { display: none !important }` are NOT
 *   injected here — they live in the `<style>` block added by content/index.ts (Plan 04).
 *   This keeps DOM manipulation separate from style injection.
 *
 * CLAUDE.md constraint #2:
 *   `element.remove()` is forbidden on LinkedIn-owned nodes (breaks React VDom).
 *   `postNode` is LinkedIn-owned — this function only toggles its class, never removes it.
 *   `tombstone.remove()` in the click handler is allowed because the tombstone is OUR
 *   injected node; removing our own node is safe and expected.
 */

/**
 * Injects a tombstone element as a sibling before postNode.
 *
 * The tombstone displays "Post by [authorName] hidden ([score]/100)" and removes itself
 * while revealing the hidden post when clicked.
 *
 * @param postNode - The hidden post card element (LinkedIn-owned; only its class is touched).
 * @param authorName - The author's display name (passed through textContent only; never via the inner-HTML property).
 * @param score - The composite detection score (0–100) shown in the tombstone text.
 */
export function injectTombstone(
  postNode: Element,
  authorName: string,
  score: number,
): void {
  const tombstone = document.createElement('div');
  tombstone.className = 'llb-tombstone';
  tombstone.setAttribute('role', 'button');
  tombstone.setAttribute('aria-label', `Reveal post by ${authorName}`);

  // Use textContent only — NOT the inner-HTML property (D-09 / T-02-09 XSS mitigation)
  tombstone.textContent = `Post by ${authorName} hidden (${score}/100)`;

  // Click handler: reveal the post by removing the hidden class, then remove our tombstone.
  // postNode.classList.remove() is allowed — we are modifying the class, not the node itself.
  // tombstone.remove() is allowed — the tombstone is our own injected node.
  tombstone.addEventListener('click', () => {
    postNode.classList.remove('llb-hidden');
    tombstone.remove();
  });

  // Insert as sibling BEFORE the post — not inside — to survive React VDom reconciliation
  // (Pitfall 4, T-02-12). postNode.parentNode may be null if the post was removed from
  // the DOM between scoring and tombstone injection; the optional chain handles this safely.
  postNode.parentNode?.insertBefore(tombstone, postNode);
}
