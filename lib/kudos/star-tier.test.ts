import { describe, it, expect } from 'vitest';
import { deriveStarTier } from './star-tier';

describe('deriveStarTier', () => {
  it.each([
    [0, 0],
    [9, 0],
    [10, 1],
    [19, 1],
    [20, 2],
    [49, 2],
    [50, 3],
    [1000, 3],
  ])('maps received_count=%i to tier %i', (receivedCount, expected) => {
    expect(deriveStarTier(receivedCount)).toBe(expected);
  });
});
