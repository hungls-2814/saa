import { describe, it, expect, vi, beforeEach } from 'vitest';
import { createQueryMock } from './test-helpers/supabase-query-mock';
import type { KudosCard } from './types';

vi.mock('@/lib/supabase/server', () => ({
  createClient: vi.fn(),
}));

vi.mock('next/cache', () => ({
  revalidatePath: vi.fn(),
}));

vi.mock('./queries', () => ({
  getHighlights: vi.fn(),
  getKudosFeed: vi.fn(),
}));

import { createClient } from '@/lib/supabase/server';
import { revalidatePath } from 'next/cache';
import { getHighlights, getKudosFeed } from './queries';
import { applyFiltersAction, loadMoreFeedAction, toggleHeartAction } from './actions';

const mockCreateClient = vi.mocked(createClient);
const mockRevalidatePath = vi.mocked(revalidatePath);
const mockGetHighlights = vi.mocked(getHighlights);
const mockGetKudosFeed = vi.mocked(getKudosFeed);

const USER_ID = 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa';
const KUDOS_ID = 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb';

function authedSupabase(from: ReturnType<typeof vi.fn>) {
  return {
    auth: { getUser: vi.fn().mockResolvedValue({ data: { user: { id: USER_ID } } }) },
    from,
  };
}

function unauthedSupabase() {
  return {
    auth: { getUser: vi.fn().mockResolvedValue({ data: { user: null } }) },
    from: vi.fn(),
  };
}

const CARD: KudosCard = {
  id: KUDOS_ID,
  title: '',
  isAnonymous: false,
  sender: { id: 's1', fullName: 'Sender', department: '', avatarUrl: '', title: '', starTier: 0 },
  receiver: { id: 'r1', fullName: 'Receiver', department: '', avatarUrl: '', title: '', starTier: 0 },
  content: 'nice work',
  createdAt: '2026-07-06T00:00:00.000Z',
  heartCount: 1,
  likedByMe: false,
  hashtags: [],
  images: [],
};

beforeEach(() => {
  vi.clearAllMocks();
});

describe('toggleHeartAction', () => {
  it('returns unauthenticated failure without querying hearts', async () => {
    mockCreateClient.mockResolvedValue(unauthedSupabase() as never);

    const result = await toggleHeartAction(KUDOS_ID);

    expect(result).toEqual({ ok: false, error: 'unauthenticated' });
    expect(mockRevalidatePath).not.toHaveBeenCalled();
  });

  it('inserts a heart when none exists and returns liked:true with fresh count', async () => {
    const from = vi
      .fn()
      .mockReturnValueOnce(createQueryMock({ data: null, error: null })) // existence lookup
      .mockReturnValueOnce(createQueryMock({ data: null, error: null })) // insert
      .mockReturnValueOnce(createQueryMock({ data: { heart_count: 4 }, error: null })); // weighted count
    mockCreateClient.mockResolvedValue(authedSupabase(from) as never);

    const result = await toggleHeartAction(KUDOS_ID);

    expect(result).toEqual({ ok: true, liked: true, heartCount: 4 });
    expect(from.mock.results[1]!.value.insert).toHaveBeenCalledWith({
      user_id: USER_ID,
      kudos_id: KUDOS_ID,
    });
    expect(mockRevalidatePath).toHaveBeenCalledWith('/kudos');
  });

  it('deletes an existing heart and returns liked:false with fresh count', async () => {
    const from = vi
      .fn()
      .mockReturnValueOnce(createQueryMock({ data: { user_id: USER_ID }, error: null })) // existence lookup
      .mockReturnValueOnce(createQueryMock({ data: null, error: null })) // delete
      .mockReturnValueOnce(createQueryMock({ data: { heart_count: 0 }, error: null })); // weighted count
    mockCreateClient.mockResolvedValue(authedSupabase(from) as never);

    const result = await toggleHeartAction(KUDOS_ID);

    expect(result).toEqual({ ok: true, liked: false, heartCount: 0 });
    expect(from.mock.results[1]!.value.delete).toHaveBeenCalled();
    expect(mockRevalidatePath).toHaveBeenCalledWith('/kudos');
  });

  it('maps a self-like RLS violation to a typed failure, never throwing', async () => {
    const from = vi
      .fn()
      .mockReturnValueOnce(createQueryMock({ data: null, error: null })) // existence lookup
      .mockReturnValueOnce(
        createQueryMock({ data: null, error: { code: '42501', message: 'RLS violation' } }),
      ); // insert
    mockCreateClient.mockResolvedValue(authedSupabase(from) as never);

    const result = await toggleHeartAction(KUDOS_ID);

    expect(result).toEqual({ ok: false, error: 'self_like' });
    expect(mockRevalidatePath).not.toHaveBeenCalled();
  });

  it('treats a duplicate-insert race (unique violation) as an already-liked success', async () => {
    const from = vi
      .fn()
      .mockReturnValueOnce(createQueryMock({ data: null, error: null })) // existence lookup
      .mockReturnValueOnce(
        createQueryMock({ data: null, error: { code: '23505', message: 'duplicate key' } }),
      ) // insert
      .mockReturnValueOnce(createQueryMock({ data: { heart_count: 2 }, error: null })); // weighted count
    mockCreateClient.mockResolvedValue(authedSupabase(from) as never);

    const result = await toggleHeartAction(KUDOS_ID);

    expect(result).toEqual({ ok: true, liked: true, heartCount: 2 });
  });

  it('returns an unknown-error typed failure for an unmapped insert error', async () => {
    const from = vi
      .fn()
      .mockReturnValueOnce(createQueryMock({ data: null, error: null })) // existence lookup
      .mockReturnValueOnce(
        createQueryMock({ data: null, error: { code: '500', message: 'boom' } }),
      ); // insert
    mockCreateClient.mockResolvedValue(authedSupabase(from) as never);

    const result = await toggleHeartAction(KUDOS_ID);

    expect(result).toEqual({ ok: false, error: 'unknown' });
    expect(mockRevalidatePath).not.toHaveBeenCalled();
  });

  it('returns unknown-error when the initial lookup query fails', async () => {
    const from = vi
      .fn()
      .mockReturnValueOnce(
        createQueryMock({ data: null, error: { code: '500', message: 'lookup failed' } }),
      ); // existence lookup
    mockCreateClient.mockResolvedValue(authedSupabase(from) as never);

    const result = await toggleHeartAction(KUDOS_ID);

    expect(result).toEqual({ ok: false, error: 'unknown' });
    expect(mockRevalidatePath).not.toHaveBeenCalled();
  });

  it('returns unknown-error when the delete operation fails', async () => {
    const from = vi
      .fn()
      .mockReturnValueOnce(createQueryMock({ data: { user_id: USER_ID }, error: null })) // existence lookup (heart exists)
      .mockReturnValueOnce(
        createQueryMock({ data: null, error: { code: '500', message: 'delete failed' } }),
      ); // delete
    mockCreateClient.mockResolvedValue(authedSupabase(from) as never);

    const result = await toggleHeartAction(KUDOS_ID);

    expect(result).toEqual({ ok: false, error: 'unknown' });
    expect(mockRevalidatePath).not.toHaveBeenCalled();
  });

  it('returns unknown-error when the count query fails', async () => {
    const from = vi
      .fn()
      .mockReturnValueOnce(createQueryMock({ data: null, error: null })) // existence lookup
      .mockReturnValueOnce(createQueryMock({ data: null, error: null })) // insert
      .mockReturnValueOnce(
        createQueryMock({ data: null, error: { code: '500', message: 'count failed' } }),
      ); // weighted count
    mockCreateClient.mockResolvedValue(authedSupabase(from) as never);

    const result = await toggleHeartAction(KUDOS_ID);

    expect(result).toEqual({ ok: false, error: 'unknown' });
    expect(mockRevalidatePath).not.toHaveBeenCalled();
  });
});

describe('loadMoreFeedAction', () => {
  it('returns unauthenticated failure without calling getKudosFeed', async () => {
    mockCreateClient.mockResolvedValue(unauthedSupabase() as never);

    const result = await loadMoreFeedAction({ cursor: null });

    expect(result).toEqual({ ok: false, error: 'unauthenticated', nextCursor: null });
    expect(mockGetKudosFeed).not.toHaveBeenCalled();
  });

  it('threads userId, cursor, and filter into getKudosFeed', async () => {
    mockCreateClient.mockResolvedValue(authedSupabase(vi.fn()) as never);
    const validCursor = Buffer.from(
      JSON.stringify({ createdAt: '2026-07-06T00:00:00.000Z', id: KUDOS_ID }),
      'utf-8',
    ).toString('base64');
    mockGetKudosFeed.mockResolvedValue({ items: [CARD], nextCursor: null });

    const result = await loadMoreFeedAction({
      cursor: validCursor,
      filter: { hashtagId: 'ht1' },
    });

    expect(mockGetKudosFeed).toHaveBeenCalledWith({
      userId: USER_ID,
      cursor: validCursor,
      filter: { hashtagId: 'ht1' },
    });
    expect(result).toEqual({ ok: true, items: [CARD], nextCursor: null });
  });

  it('returns a typed failure with nextCursor:null for a tampered cursor, never calling getKudosFeed', async () => {
    mockCreateClient.mockResolvedValue(authedSupabase(vi.fn()) as never);

    const result = await loadMoreFeedAction({ cursor: 'not-valid-base64-json' });

    expect(result).toEqual({ ok: false, error: 'invalid_cursor', nextCursor: null });
    expect(mockGetKudosFeed).not.toHaveBeenCalled();
  });

  it('treats a null cursor as page 1 (valid, not tampered)', async () => {
    mockCreateClient.mockResolvedValue(authedSupabase(vi.fn()) as never);
    mockGetKudosFeed.mockResolvedValue({ items: [], nextCursor: null });

    const result = await loadMoreFeedAction({ cursor: null });

    expect(result).toEqual({ ok: true, items: [], nextCursor: null });
    expect(mockGetKudosFeed).toHaveBeenCalledWith({ userId: USER_ID, cursor: null, filter: undefined });
  });
});

describe('applyFiltersAction', () => {
  it('returns unauthenticated failure without querying', async () => {
    mockCreateClient.mockResolvedValue(unauthedSupabase() as never);

    const result = await applyFiltersAction({ departmentId: 'd1' });

    expect(result).toEqual({ ok: false, error: 'unauthenticated' });
    expect(mockGetHighlights).not.toHaveBeenCalled();
    expect(mockGetKudosFeed).not.toHaveBeenCalled();
  });

  it('threads userId + filter into getHighlights and getKudosFeed, resetting to page 1', async () => {
    mockCreateClient.mockResolvedValue(authedSupabase(vi.fn()) as never);
    mockGetHighlights.mockResolvedValue([CARD]);
    mockGetKudosFeed.mockResolvedValue({ items: [CARD], nextCursor: 'cursor-2' });

    const filter = { hashtagId: 'ht1', departmentId: 'd1' };
    const result = await applyFiltersAction(filter);

    expect(mockGetHighlights).toHaveBeenCalledWith({ userId: USER_ID, filter });
    expect(mockGetKudosFeed).toHaveBeenCalledWith({ userId: USER_ID, filter });
    expect(result).toEqual({
      ok: true,
      highlights: [CARD],
      feed: [CARD],
      nextCursor: 'cursor-2',
    });
  });
});
