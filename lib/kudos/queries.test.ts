import { describe, it, expect, vi, beforeEach } from 'vitest';
import { createQueryMock } from './test-helpers/supabase-query-mock';

vi.mock('@/lib/supabase/server', () => ({ createClient: vi.fn() }));
import { createClient } from '@/lib/supabase/server';
import {
  getHighlights,
  getKudosFeed,
  getSpotlight,
  getPerUserStats,
  getTopGifts,
  getHashtags,
  getDepartments,
  getSenderStats,
  getBoardData,
} from './queries';
import { encodeCursor } from './cursor';

type Builder = ReturnType<typeof createQueryMock>;

function mockTables(tables: Record<string, Builder>) {
  const mockFrom = vi.fn((table: string) => {
    const builder = tables[table];
    if (!builder) throw new Error(`Unexpected table queried: ${table}`);
    return builder;
  });
  vi.mocked(createClient).mockResolvedValue({ from: mockFrom } as never);
  return mockFrom;
}

const emptyRow = (id: string) => ({
  id,
  content: 'x',
  created_at: '2026-07-06T10:00:00.000Z',
  heart_count: 0,
  sender: null,
  receiver: null,
  kudos_hashtags: [],
  kudos_images: [],
});

describe('getHighlights', () => {
  beforeEach(() => vi.clearAllMocks());

  it('queries kudos_with_heart_count ordered by heart_count desc, limit 5, and maps rows', async () => {
    const row = {
      ...emptyRow('k1'),
      heart_count: 9,
      sender: { id: 's1', full_name: 'Alice', avatar_url: null, title: null, department: null },
      receiver: { id: 'r1', full_name: 'Bob', avatar_url: null, title: null, department: null },
    };
    const kudosBuilder = createQueryMock({ data: [row], error: null });
    const heartsBuilder = createQueryMock({ data: [], error: null });
    const statsBuilder = createQueryMock({ data: [], error: null });
    const mockFrom = mockTables({
      kudos_with_heart_count: kudosBuilder,
      hearts: heartsBuilder,
      profile_kudos_stats: statsBuilder,
    });

    const result = await getHighlights({ userId: 'u1' });

    expect(mockFrom).toHaveBeenCalledWith('kudos_with_heart_count');
    expect(kudosBuilder.order).toHaveBeenCalledWith('heart_count', { ascending: false });
    expect(kudosBuilder.limit).toHaveBeenCalledWith(5);
    expect(result).toHaveLength(1);
    expect(result[0]).toMatchObject({ id: 'k1', heartCount: 9 });
  });

  it('applies the receiver department filter with the !inner embed hint', async () => {
    const kudosBuilder = createQueryMock({ data: [], error: null });
    mockTables({ kudos_with_heart_count: kudosBuilder });

    await getHighlights({ userId: 'u1', filter: { departmentId: 'd1' } });

    const selectArg = (kudosBuilder.select as ReturnType<typeof vi.fn>).mock.calls[0][0] as string;
    expect(selectArg).toContain('profiles!kudos_receiver_id_fkey!inner');
    expect(kudosBuilder.eq).toHaveBeenCalledWith('receiver.department_id', 'd1');
  });

  it('resolves the hashtag filter via kudos_hashtags first, short-circuiting when no matches', async () => {
    const hashtagsBuilder = createQueryMock({ data: [], error: null });
    const mockFrom = mockTables({ kudos_hashtags: hashtagsBuilder });

    const result = await getHighlights({ userId: 'u1', filter: { hashtagId: 'h1' } });

    expect(mockFrom).toHaveBeenCalledWith('kudos_hashtags');
    expect(hashtagsBuilder.eq).toHaveBeenCalledWith('hashtag_id', 'h1');
    expect(result).toEqual([]);
  });

  it('applies the resolved hashtag kudos ids via .in on the main query', async () => {
    const hashtagsBuilder = createQueryMock({ data: [{ kudos_id: 'k1' }], error: null });
    const kudosBuilder = createQueryMock({ data: [], error: null });
    mockTables({ kudos_hashtags: hashtagsBuilder, kudos_with_heart_count: kudosBuilder });

    await getHighlights({ userId: 'u1', filter: { hashtagId: 'h1' } });

    expect(kudosBuilder.in).toHaveBeenCalledWith('id', ['k1']);
  });
});

describe('getKudosFeed', () => {
  beforeEach(() => vi.clearAllMocks());

  it('orders by created_at desc, id desc and over-fetches by 1 to detect a next page', async () => {
    const rows = Array.from({ length: 21 }, (_, i) => emptyRow(`k${i}`));
    const kudosBuilder = createQueryMock({ data: rows, error: null });
    const heartsBuilder = createQueryMock({ data: [], error: null });
    const statsBuilder = createQueryMock({ data: [], error: null });
    mockTables({
      kudos_with_heart_count: kudosBuilder,
      hearts: heartsBuilder,
      profile_kudos_stats: statsBuilder,
    });

    const result = await getKudosFeed({ userId: 'u1', limit: 20 });

    expect(kudosBuilder.order).toHaveBeenNthCalledWith(1, 'created_at', { ascending: false });
    expect(kudosBuilder.order).toHaveBeenNthCalledWith(2, 'id', { ascending: false });
    expect(kudosBuilder.limit).toHaveBeenCalledWith(21);
    expect(result.items).toHaveLength(20);
    expect(result.nextCursor).not.toBeNull();
  });

  it('returns nextCursor: null when fewer rows than the limit come back', async () => {
    const kudosBuilder = createQueryMock({ data: [], error: null });
    mockTables({ kudos_with_heart_count: kudosBuilder });

    const result = await getKudosFeed({ userId: 'u1', limit: 20 });
    expect(result.items).toEqual([]);
    expect(result.nextCursor).toBeNull();
  });

  it('applies a valid cursor as a compound .or() keyset predicate', async () => {
    const cursor = encodeCursor({
      createdAt: '2026-07-06T09:00:00.000Z',
      id: '3f9e1a2b-4c5d-4e6f-8a9b-0c1d2e3f4a5b',
    });
    const kudosBuilder = createQueryMock({ data: [], error: null });
    mockTables({ kudos_with_heart_count: kudosBuilder });

    await getKudosFeed({ userId: 'u1', cursor });

    expect(kudosBuilder.or).toHaveBeenCalledWith(
      'created_at.lt.2026-07-06T09:00:00.000Z,and(created_at.eq.2026-07-06T09:00:00.000Z,id.lt.3f9e1a2b-4c5d-4e6f-8a9b-0c1d2e3f4a5b)',
    );
  });

  it('ignores an invalid/tampered cursor (treated as page 1, no .or() call)', async () => {
    const kudosBuilder = createQueryMock({ data: [], error: null });
    mockTables({ kudos_with_heart_count: kudosBuilder });

    await getKudosFeed({ userId: 'u1', cursor: 'tampered-garbage' });

    expect(kudosBuilder.or).not.toHaveBeenCalled();
  });

  it('short-circuits when hashtag filter resolves to 0 matching kudos', async () => {
    const hashtagsBuilder = createQueryMock({ data: [], error: null });
    const kudosBuilder = createQueryMock({ data: [], error: null });
    const mockFrom = mockTables({
      kudos_hashtags: hashtagsBuilder,
      kudos_with_heart_count: kudosBuilder,
    });

    const result = await getKudosFeed({ userId: 'u1', filter: { hashtagId: 'h1' } });

    expect(mockFrom).toHaveBeenCalledWith('kudos_hashtags');
    expect(result).toEqual({ items: [], nextCursor: null });
    // Verify kudos_with_heart_count is not queried when hashtag has no matches
    expect(kudosBuilder.select).not.toHaveBeenCalled();
  });
});

describe('getSpotlight', () => {
  beforeEach(() => vi.clearAllMocks());

  it('returns total kudos count and one node per receiver, weighted by received count', async () => {
    const countBuilder = createQueryMock({ data: null, error: null, count: 12 });
    const rowsBuilder = createQueryMock({
      data: [
        { receiver_id: 'r1', created_at: '2026-07-06T10:00:00.000Z', receiver: { full_name: 'Bob' } },
        { receiver_id: 'r1', created_at: '2026-07-05T10:00:00.000Z', receiver: { full_name: 'Bob' } },
        { receiver_id: 'r2', created_at: '2026-07-04T10:00:00.000Z', receiver: { full_name: 'Cara' } },
      ],
      error: null,
    });
    const mockFrom = vi.fn().mockReturnValueOnce(countBuilder).mockReturnValueOnce(rowsBuilder);
    vi.mocked(createClient).mockResolvedValue({ from: mockFrom } as never);

    const result = await getSpotlight();

    expect(result.totalKudos).toBe(12);
    expect(result.nodes).toEqual([
      { receiverId: 'r1', name: 'Bob', weight: 2, lastReceivedAt: '2026-07-06T10:00:00.000Z' },
      { receiverId: 'r2', name: 'Cara', weight: 1, lastReceivedAt: '2026-07-04T10:00:00.000Z' },
    ]);
  });
});

describe('getPerUserStats', () => {
  beforeEach(() => vi.clearAllMocks());

  it('reads profile_kudos_stats by profile_id and maps to PerUserStats', async () => {
    const statsBuilder = createQueryMock({
      data: { sent_count: 3, received_count: 7, hearts_received: 15 },
      error: null,
    });
    const mockFrom = mockTables({ profile_kudos_stats: statsBuilder });

    const result = await getPerUserStats('u1');

    expect(mockFrom).toHaveBeenCalledWith('profile_kudos_stats');
    expect(statsBuilder.eq).toHaveBeenCalledWith('profile_id', 'u1');
    expect(result).toEqual({ kudosReceived: 7, kudosSent: 3, heartsReceived: 15 });
  });

  it('defaults to zeros when no stats row exists', async () => {
    const statsBuilder = createQueryMock({ data: null, error: null });
    mockTables({ profile_kudos_stats: statsBuilder });

    const result = await getPerUserStats('u1');
    expect(result).toEqual({ kudosReceived: 0, kudosSent: 0, heartsReceived: 0 });
  });
});

describe('getSenderStats', () => {
  beforeEach(() => vi.clearAllMocks());

  it('batches a single .in() query on profile_kudos_stats (no N+1)', async () => {
    const statsBuilder = createQueryMock({
      data: [
        { profile_id: 's1', received_count: 12 },
        { profile_id: 's2', received_count: 25 },
      ],
      error: null,
    });
    const mockFrom = mockTables({ profile_kudos_stats: statsBuilder });

    const result = await getSenderStats(['s1', 's2']);

    expect(mockFrom).toHaveBeenCalledTimes(1);
    expect(statsBuilder.in).toHaveBeenCalledWith('profile_id', ['s1', 's2']);
    expect(result.get('s1')).toBe(12);
    expect(result.get('s2')).toBe(25);
  });

  it('returns an empty map without querying when given no ids', async () => {
    const mockFrom = vi.fn();
    vi.mocked(createClient).mockResolvedValue({ from: mockFrom } as never);

    const result = await getSenderStats([]);
    expect(result.size).toBe(0);
    expect(mockFrom).not.toHaveBeenCalled();
  });
});

describe('getTopGifts', () => {
  beforeEach(() => vi.clearAllMocks());

  it('orders gifts by awarded_at desc, limit 10, and maps to GiftItem', async () => {
    const giftsBuilder = createQueryMock({
      data: [
        {
          id: 'g1',
          description: 'Voucher',
          awarded_at: '2026-07-06T10:00:00.000Z',
          recipient: { full_name: 'Dan', avatar_url: 'dan.png' },
        },
      ],
      error: null,
    });
    const mockFrom = mockTables({ gifts: giftsBuilder });

    const result = await getTopGifts();

    expect(mockFrom).toHaveBeenCalledWith('gifts');
    expect(giftsBuilder.order).toHaveBeenCalledWith('awarded_at', { ascending: false });
    expect(giftsBuilder.limit).toHaveBeenCalledWith(10);
    expect(result).toEqual([
      {
        id: 'g1',
        recipientName: 'Dan',
        recipientAvatarUrl: 'dan.png',
        description: 'Voucher',
        awardedAt: '2026-07-06T10:00:00.000Z',
      },
    ]);
  });
});

describe('getHashtags / getDepartments', () => {
  beforeEach(() => vi.clearAllMocks());

  it('getHashtags returns { id, label } rows', async () => {
    const builder = createQueryMock({ data: [{ id: 'h1', label: 'teamwork' }], error: null });
    mockTables({ hashtags: builder });
    expect(await getHashtags()).toEqual([{ id: 'h1', label: 'teamwork' }]);
  });

  it('getDepartments returns { id, name } rows', async () => {
    const builder = createQueryMock({ data: [{ id: 'd1', name: 'Engineering' }], error: null });
    mockTables({ departments: builder });
    expect(await getDepartments()).toEqual([{ id: 'd1', name: 'Engineering' }]);
  });

  it('propagates a Supabase error instead of swallowing it', async () => {
    const builder = createQueryMock({ data: null, error: new Error('boom') });
    mockTables({ hashtags: builder });
    await expect(getHashtags()).rejects.toThrow('boom');
  });
});

describe('getBoardData', () => {
  beforeEach(() => vi.clearAllMocks());

  it('composes highlights + feed + spotlight + stats + gifts + option lists', async () => {
    const mockFrom = vi.fn((table: string) => {
      if (table === 'profile_kudos_stats') {
        return createQueryMock({ data: null, error: null, count: 0 });
      }
      return createQueryMock({ data: [], error: null, count: 0 });
    });
    vi.mocked(createClient).mockResolvedValue({ from: mockFrom } as never);

    const result = await getBoardData('u1', {});

    expect(result.highlights).toEqual([]);
    expect(result.feed).toEqual([]);
    expect(result.feedNextCursor).toBeNull();
    expect(result.spotlight).toEqual({ totalKudos: 0, nodes: [] });
    expect(result.stats).toEqual({ kudosReceived: 0, kudosSent: 0, heartsReceived: 0 });
    expect(result.gifts).toEqual([]);
    expect(result.hashtags).toEqual([]);
    expect(result.departments).toEqual([]);
  });
});
