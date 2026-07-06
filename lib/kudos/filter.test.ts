import { describe, it, expect } from 'vitest';
import { buildKudosFilter } from './filter';

describe('buildKudosFilter', () => {
  it('returns nulls for an empty filter', () => {
    expect(buildKudosFilter({})).toEqual({ hashtagId: null, departmentId: null });
  });

  it('passes through a hashtag-only filter', () => {
    expect(buildKudosFilter({ hashtagId: 'h1' })).toEqual({ hashtagId: 'h1', departmentId: null });
  });

  it('passes through a department-only filter', () => {
    expect(buildKudosFilter({ departmentId: 'd1' })).toEqual({
      hashtagId: null,
      departmentId: 'd1',
    });
  });

  it('AND-combines both facets when both are set', () => {
    expect(buildKudosFilter({ hashtagId: 'h1', departmentId: 'd1' })).toEqual({
      hashtagId: 'h1',
      departmentId: 'd1',
    });
  });
});
