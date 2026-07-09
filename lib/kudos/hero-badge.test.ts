import { describe, it, expect } from 'vitest';
import { deriveHeroBadge } from './hero-badge';

describe('deriveHeroBadge', () => {
  it.each([
    [0, 'none'],
    [1, 'new'],
    [4, 'new'],
    [5, 'rising'],
    [9, 'rising'],
    [10, 'super'],
    [20, 'super'],
    [21, 'legend'],
    [1000, 'legend'],
  ] as const)('maps distinct_sender_count=%i to %s', (count, expected) => {
    expect(deriveHeroBadge(count)).toBe(expected);
  });
});
