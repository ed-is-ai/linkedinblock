/**
 * Tests for injectTombstone — sibling-div injection with click-to-reveal.
 * Uses jsdom (configured in vitest.config.ts) for DOM operations.
 */
import { describe, it, expect, beforeEach } from 'vitest';
import { injectTombstone } from './tombstone';

describe('injectTombstone', () => {
  let parent: HTMLDivElement;
  let postNode: HTMLDivElement;

  beforeEach(() => {
    parent = document.createElement('div');
    postNode = document.createElement('div');
    postNode.setAttribute('data-urn', 'urn:li:activity:123');
    parent.appendChild(postNode);
    document.body.appendChild(parent);
  });

  it('inserts tombstone as sibling BEFORE postNode (sibling injection, not inside)', () => {
    injectTombstone(postNode, 'Jane Smith', 74);
    // Parent should now have [tombstone, postNode]
    expect(parent.children.length).toBe(2);
    expect(parent.children[0]?.classList.contains('llb-tombstone')).toBe(true);
    expect(parent.children[1]).toBe(postNode);
  });

  it('sets textContent to the correct hidden format (D-08/D-09)', () => {
    injectTombstone(postNode, 'Jane Smith', 74);
    const tombstone = parent.children[0] as HTMLElement;
    expect(tombstone.textContent).toBe('Post by Jane Smith hidden (74/100)');
  });

  it('sets role="button" on the tombstone (accessibility)', () => {
    injectTombstone(postNode, 'Jane Smith', 74);
    const tombstone = parent.children[0] as HTMLElement;
    expect(tombstone.getAttribute('role')).toBe('button');
  });

  it('click removes llb-hidden class from postNode and removes tombstone from DOM', () => {
    // Give postNode the hidden class first (as content/index.ts would)
    postNode.classList.add('llb-hidden');
    injectTombstone(postNode, 'Jane Smith', 74);

    const tombstone = parent.children[0] as HTMLElement;
    expect(postNode.classList.contains('llb-hidden')).toBe(true);

    // Simulate click
    tombstone.click();

    expect(postNode.classList.contains('llb-hidden')).toBe(false);
    expect(tombstone.parentNode).toBeNull();
  });

  it('aria-label on tombstone includes author name', () => {
    injectTombstone(postNode, 'Jane Smith', 74);
    const tombstone = parent.children[0] as HTMLElement;
    expect(tombstone.getAttribute('aria-label')).toContain('Jane Smith');
  });
});
