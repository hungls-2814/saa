import { describe, it, expect, vi, beforeEach } from 'vitest';
import { createQueryMock } from './test-helpers/supabase-query-mock';
import { createKudoAction } from './compose-actions';
import type { ComposeKudosInput } from './compose-schema';

vi.mock('@/lib/supabase/server', () => ({
  createClient: vi.fn(),
}));

vi.mock('next/cache', () => ({
  revalidatePath: vi.fn(),
}));

import { createClient } from '@/lib/supabase/server';
import { revalidatePath } from 'next/cache';

const mockCreateClient = vi.mocked(createClient);
const mockRevalidatePath = vi.mocked(revalidatePath);

describe('compose-actions: createKudoAction', () => {
  const USER_ID = 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa';
  const KUDO_ID = 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb';
  const HASHTAG_ID_1 = 'cccccccc-cccc-cccc-cccc-cccccccccccc';
  const HASHTAG_ID_2 = 'dddddddd-dddd-dddd-dddd-dddddddddddd';

  const makeInput = (overrides: Partial<ComposeKudosInput> = {}): ComposeKudosInput => ({
    receiverId: 'rcv-1',
    title: 'Great work',
    content: 'Really impressed',
    hashtagLabels: ['teamwork'],
    imageUrls: [],
    isAnonymous: false,
    anonymousAlias: '',
    ...overrides,
  });

  let from: ReturnType<typeof vi.fn>;

  function authedSupabase() {
    return {
      auth: {
        getUser: vi.fn().mockResolvedValue({
          data: { user: { id: USER_ID } },
        }),
      },
      from,
    };
  }

  beforeEach(() => {
    vi.clearAllMocks();
    from = vi.fn();
    mockCreateClient.mockResolvedValue(authedSupabase() as never);
  });

  describe('authentication', () => {
    it('returns unauthenticated when no user', async () => {
      const noUserSupabase = {
        auth: {
          getUser: vi.fn().mockResolvedValue({ data: { user: null } }),
        },
        from,
      };
      mockCreateClient.mockResolvedValue(noUserSupabase as never);

      const result = await createKudoAction(makeInput());

      expect(result).toEqual({ ok: false, error: 'unauthenticated' });
    });

    it('handles user object with proper id', async () => {
      const mockKudosQuery = createQueryMock({
        data: { id: KUDO_ID },
        error: null,
      });

      const mockHashtagsQuery = createQueryMock({
        data: [],
        error: null,
      });

      from.mockReturnValueOnce(mockKudosQuery).mockReturnValue(mockHashtagsQuery);

      const result = await createKudoAction(makeInput());

      expect(result.ok).toBe(true);
      if (result.ok) {
        expect(result.kudosId).toBe(KUDO_ID);
      }
    });
  });

  describe('validation', () => {
    it('returns validation error for empty title', async () => {
      const result = await createKudoAction(makeInput({ title: '' }));

      expect(result.ok).toBe(false);
      if (!result.ok) {
        expect(result.error).toBe('validation');
        expect(result.errors?.title).toBe('required');
      }
    });

    it('returns validation error for empty content', async () => {
      const result = await createKudoAction(makeInput({ content: '  ' }));

      expect(result.ok).toBe(false);
      if (!result.ok) {
        expect(result.error).toBe('validation');
        expect(result.errors?.content).toBe('required');
      }
    });

    it('returns validation error for no hashtags', async () => {
      const result = await createKudoAction(makeInput({ hashtagLabels: [] }));

      expect(result.ok).toBe(false);
      if (!result.ok) {
        expect(result.error).toBe('validation');
        expect(result.errors?.hashtags).toBe('required');
      }
    });

    it('returns validation error for too many hashtags', async () => {
      const result = await createKudoAction(makeInput({ hashtagLabels: Array(6).fill('tag') }));

      expect(result.ok).toBe(false);
      if (!result.ok) {
        expect(result.error).toBe('validation');
        expect(result.errors?.hashtags).toBe('tooMany');
      }
    });

    it('respects self-recipient validation', async () => {
      const result = await createKudoAction(makeInput({ receiverId: USER_ID }));

      expect(result.ok).toBe(false);
      if (!result.ok) {
        expect(result.error).toBe('validation');
        expect(result.errors?.receiver).toBe('self');
      }
    });

    it('returns validation error for anonymous without alias', async () => {
      const result = await createKudoAction(
        makeInput({ isAnonymous: true, anonymousAlias: '' })
      );

      expect(result.ok).toBe(false);
      if (!result.ok) {
        expect(result.error).toBe('validation');
        expect(result.errors?.alias).toBe('required');
      }
    });

    it('collects multiple validation errors', async () => {
      const result = await createKudoAction(
        makeInput({
          title: '',
          content: '',
          hashtagLabels: [],
        })
      );

      expect(result.ok).toBe(false);
      if (!result.ok) {
        expect(result.error).toBe('validation');
        expect(result.errors).toMatchObject({
          title: 'required',
          content: 'required',
          hashtags: 'required',
        });
      }
    });
  });

  describe('happy path: insert', () => {
    it('inserts kudos with text fields trimmed', async () => {
      const mockKudosQuery = createQueryMock({
        data: { id: KUDO_ID },
        error: null,
      });

      const mockHashtagsQuery = createQueryMock({
        data: [],
        error: null,
      });

      from
        .mockReturnValueOnce(mockKudosQuery) // kudos insert
        .mockReturnValue(mockHashtagsQuery); // hashtags select/insert

      const result = await createKudoAction(
        makeInput({
          title: '  Great work  ',
          content: '  Really impressed  ',
          hashtagLabels: ['teamwork'],
        })
      );

      expect(result.ok).toBe(true);

      expect(mockKudosQuery.insert).toHaveBeenCalledWith(
        expect.objectContaining({
          sender_id: USER_ID,
          receiver_id: 'rcv-1',
          title: 'Great work',
          content: 'Really impressed',
          is_anonymous: false,
          anonymous_alias: null,
        })
      );

      expect(mockRevalidatePath).toHaveBeenCalledWith('/kudos');
    });

    it('returns kudosId on success', async () => {
      const mockKudosQuery = createQueryMock({
        data: { id: KUDO_ID },
        error: null,
      });

      const mockHashtagsQuery = createQueryMock({
        data: [],
        error: null,
      });

      from
        .mockReturnValueOnce(mockKudosQuery)
        .mockReturnValue(mockHashtagsQuery);

      const result = await createKudoAction(makeInput());

      expect(result).toEqual({ ok: true, kudosId: KUDO_ID });
    });

    it('handles kudos insert error', async () => {
      const mockKudosQuery = createQueryMock({
        data: null,
        error: new Error('Insert failed'),
      });

      from.mockReturnValue(mockKudosQuery);

      const result = await createKudoAction(makeInput());

      expect(result).toEqual({ ok: false, error: 'unknown' });
    });
  });

  describe('hashtag resolution', () => {
    it('resolves existing hashtags and creates new ones', async () => {
      const mockKudosQuery = createQueryMock({
        data: { id: KUDO_ID },
        error: null,
      });

      const mockHashtagSelectQuery = createQueryMock({
        data: [{ id: HASHTAG_ID_1, label: 'teamwork' }],
        error: null,
      });

      const mockHashtagInsertQuery = createQueryMock({
        data: { id: HASHTAG_ID_2 },
        error: null,
      });

      const mockKudosHashtagsQuery = createQueryMock({
        data: null,
        error: null,
      });

      let callCount = 0;
      from.mockImplementation((table: string) => {
        if (table === 'kudos') {
          return mockKudosQuery;
        } else if (table === 'hashtags') {
          callCount++;
          if (callCount === 1) return mockHashtagSelectQuery; // select existing
          if (callCount === 2) return mockHashtagInsertQuery; // insert new
          if (callCount === 3) return mockKudosHashtagsQuery; // insert junction
        }
        return mockKudosHashtagsQuery;
      });

      await createKudoAction(makeInput({ hashtagLabels: ['teamwork', 'innovation'] }));

      expect(mockHashtagSelectQuery.in).toHaveBeenCalledWith('label', ['teamwork', 'innovation']);
      expect(mockHashtagInsertQuery.insert).toHaveBeenCalledWith({ label: 'innovation' });
    });

    it('handles 23505 race condition (duplicate hashtag)', async () => {
      const mockKudosQuery = createQueryMock({
        data: { id: KUDO_ID },
        error: null,
      });

      const mockHashtagSelectQuery = createQueryMock({
        data: [],
        error: null,
      });

      const mockHashtagInsertQuery = createQueryMock({
        data: null,
        error: { code: '23505' }, // unique violation
      });

      const mockHashtagReselectQuery = createQueryMock({
        data: { id: HASHTAG_ID_1 },
        error: null,
      });

      const mockKudosHashtagsQuery = createQueryMock({
        data: null,
        error: null,
      });

      let callCount = 0;
      from.mockImplementation((table: string) => {
        if (table === 'kudos') {
          return mockKudosQuery;
        } else if (table === 'hashtags') {
          callCount++;
          if (callCount === 1) return mockHashtagSelectQuery; // select existing
          if (callCount === 2) return mockHashtagInsertQuery; // insert fails with 23505
          if (callCount === 3) return mockHashtagReselectQuery; // reselect after race
          if (callCount === 4) return mockKudosHashtagsQuery; // insert junction
        }
        return mockKudosHashtagsQuery;
      });

      const result = await createKudoAction(makeInput({ hashtagLabels: ['teamwork'] }));

      expect(result.ok).toBe(true);
    });

    it('rethrows non-23505 hashtag errors', async () => {
      const mockKudosQuery = createQueryMock({
        data: { id: KUDO_ID },
        error: null,
      });

      const mockHashtagSelectQuery = createQueryMock({
        data: [],
        error: null,
      });

      const mockHashtagInsertQuery = createQueryMock({
        data: null,
        error: { code: '42P01' }, // different error
      });

      let callCount = 0;
      from.mockImplementation((table: string) => {
        if (table === 'kudos') {
          return mockKudosQuery;
        } else if (table === 'hashtags') {
          callCount++;
          if (callCount === 1) return mockHashtagSelectQuery;
          if (callCount === 2) return mockHashtagInsertQuery;
        }
      });

      const result = await createKudoAction(makeInput({ hashtagLabels: ['teamwork'] }));

      expect(result).toEqual({ ok: false, error: 'unknown' });
    });

    it('handles hashtags insert error', async () => {
      const mockKudosQuery = createQueryMock({
        data: { id: KUDO_ID },
        error: null,
      });

      const mockHashtagSelectQuery = createQueryMock({
        data: [{ id: HASHTAG_ID_1, label: 'teamwork' }],
        error: null,
      });

      const mockKudosHashtagsQuery = createQueryMock({
        data: null,
        error: new Error('Junction insert failed'),
      });

      let callCount = 0;
      from.mockImplementation((table: string) => {
        if (table === 'kudos') {
          return mockKudosQuery;
        } else if (table === 'hashtags' && callCount === 0) {
          callCount++;
          return mockHashtagSelectQuery;
        }
        return mockKudosHashtagsQuery;
      });

      const result = await createKudoAction(makeInput());

      expect(result).toEqual({ ok: false, error: 'unknown' });
    });
  });

  describe('image insertion', () => {
    it('inserts images with dedupe', async () => {
      const mockKudosQuery = createQueryMock({
        data: { id: KUDO_ID },
        error: null,
      });

      const mockHashtagsQuery = createQueryMock({
        data: [{ id: HASHTAG_ID_1, label: 'teamwork' }],
        error: null,
      });

      const mockKudosHashtagsQuery = createQueryMock({
        data: null,
        error: null,
      });

      const mockKudosImagesQuery = createQueryMock({
        data: null,
        error: null,
      });

      let callCount = 0;
      from.mockImplementation((table: string) => {
        if (table === 'kudos') {
          return mockKudosQuery;
        } else if (table === 'hashtags') {
          if (callCount === 0) {
            callCount++;
            return mockHashtagsQuery;
          }
          return mockKudosHashtagsQuery;
        } else if (table === 'kudos_hashtags') {
          return mockKudosHashtagsQuery;
        } else if (table === 'kudos_images') {
          return mockKudosImagesQuery;
        }
      });

      await createKudoAction(
        makeInput({
          imageUrls: ['https://example.com/img1.jpg', 'https://example.com/img1.jpg'],
        })
      );

      expect(mockKudosImagesQuery.insert).toHaveBeenCalledWith([
        { kudos_id: KUDO_ID, url: 'https://example.com/img1.jpg' },
      ]);
    });

    it('handles images insert error', async () => {
      const mockKudosQuery = createQueryMock({
        data: { id: KUDO_ID },
        error: null,
      });

      const mockHashtagsQuery = createQueryMock({
        data: [{ id: HASHTAG_ID_1, label: 'teamwork' }],
        error: null,
      });

      const mockKudosHashtagsQuery = createQueryMock({
        data: null,
        error: null,
      });

      const mockKudosImagesQuery = createQueryMock({
        data: null,
        error: new Error('Images insert failed'),
      });

      let callCount = 0;
      from.mockImplementation((table: string) => {
        if (table === 'kudos') {
          return mockKudosQuery;
        } else if (table === 'hashtags') {
          if (callCount === 0) {
            callCount++;
            return mockHashtagsQuery;
          }
          return mockKudosHashtagsQuery;
        } else if (table === 'kudos_hashtags') {
          return mockKudosHashtagsQuery;
        }
        return mockKudosImagesQuery;
      });

      const result = await createKudoAction(
        makeInput({ imageUrls: ['https://example.com/img1.jpg'] })
      );

      expect(result).toEqual({ ok: false, error: 'unknown' });
    });
  });

  describe('anonymous kudos', () => {
    it('stores anonymous flag and alias correctly', async () => {
      const mockKudosQuery = createQueryMock({
        data: { id: KUDO_ID },
        error: null,
      });

      const mockHashtagsQuery = createQueryMock({
        data: [],
        error: null,
      });

      from
        .mockReturnValueOnce(mockKudosQuery)
        .mockReturnValue(mockHashtagsQuery);

      await createKudoAction(
        makeInput({
          isAnonymous: true,
          anonymousAlias: 'Secret Friend',
        })
      );

      expect(mockKudosQuery.insert).toHaveBeenCalledWith(
        expect.objectContaining({
          is_anonymous: true,
          anonymous_alias: 'Secret Friend',
        })
      );
    });

    it('trims alias whitespace', async () => {
      const mockKudosQuery = createQueryMock({
        data: { id: KUDO_ID },
        error: null,
      });

      const mockHashtagsQuery = createQueryMock({
        data: [],
        error: null,
      });

      from
        .mockReturnValueOnce(mockKudosQuery)
        .mockReturnValue(mockHashtagsQuery);

      await createKudoAction(
        makeInput({
          isAnonymous: true,
          anonymousAlias: '  Mysterious Person  ',
        })
      );

      expect(mockKudosQuery.insert).toHaveBeenCalledWith(
        expect.objectContaining({
          anonymous_alias: 'Mysterious Person',
        })
      );
    });

    it('sets alias to null when not anonymous', async () => {
      const mockKudosQuery = createQueryMock({
        data: { id: KUDO_ID },
        error: null,
      });

      const mockHashtagsQuery = createQueryMock({
        data: [],
        error: null,
      });

      from
        .mockReturnValueOnce(mockKudosQuery)
        .mockReturnValue(mockHashtagsQuery);

      await createKudoAction(
        makeInput({
          isAnonymous: false,
          anonymousAlias: 'Should be null',
        })
      );

      expect(mockKudosQuery.insert).toHaveBeenCalledWith(
        expect.objectContaining({
          anonymous_alias: null,
        })
      );
    });
  });

  describe('normalization', () => {
    it('normalizes hashtag labels (trim, dedupe case-insensitive)', async () => {
      const mockKudosQuery = createQueryMock({
        data: { id: KUDO_ID },
        error: null,
      });

      const mockHashtagSelectQuery = createQueryMock({
        data: [],
        error: null,
      });

      const mockHashtagInsertQuery = createQueryMock({
        data: { id: HASHTAG_ID_1 },
        error: null,
      });

      let callCount = 0;
      from.mockImplementation((table: string) => {
        if (table === 'kudos') {
          return mockKudosQuery;
        } else if (table === 'hashtags') {
          callCount++;
          if (callCount === 1) return mockHashtagSelectQuery;
          return mockHashtagInsertQuery;
        }
      });

      await createKudoAction(
        makeInput({
          hashtagLabels: ['  Teamwork  ', 'teamwork', 'INNOVATION'],
        })
      );

      // Normalized to 2 unique labels (case-insensitive)
      expect(mockHashtagSelectQuery.in).toHaveBeenCalledWith('label', ['Teamwork', 'INNOVATION']);
    });
  });

  describe('error handling', () => {
    it('returns unknown error when junction table insert fails', async () => {
      const mockKudosQuery = createQueryMock({
        data: { id: KUDO_ID },
        error: null,
      });

      const mockHashtagSelectQuery = createQueryMock({
        data: [],
        error: null,
      });

      const mockHashtagInsertQuery = createQueryMock({
        data: null,
        error: new Error('Hashtag insert failed'),
      });

      const mockDeleteQuery = createQueryMock({
        data: null,
        error: null,
      });

      from
        .mockReturnValueOnce(mockKudosQuery) // kudos insert
        .mockReturnValueOnce(mockHashtagSelectQuery) // hashtags select
        .mockReturnValueOnce(mockHashtagInsertQuery) // hashtags insert fails
        .mockReturnValueOnce(mockDeleteQuery); // rollback delete

      const result = await createKudoAction(makeInput({ hashtagLabels: ['newTag'] }));

      expect(result).toEqual({ ok: false, error: 'unknown' });
    });
  });
});
