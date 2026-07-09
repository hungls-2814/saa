import { describe, it, expect, vi, beforeEach } from 'vitest';
import { createQueryMock } from './test-helpers/supabase-query-mock';

vi.mock('@/lib/supabase/server', () => ({ createClient: vi.fn() }));
import { createClient } from '@/lib/supabase/server';
import { getKudosByUser, getMyProfileHeader } from './queries-profile';

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
  title: null,
  is_anonymous: null,
  anonymous_alias: null,
  sender: null,
  receiver: null,
  kudos_hashtags: [],
  kudos_images: [],
});

describe('getKudosByUser', () => {
  beforeEach(() => vi.clearAllMocks());

  it("direction 'sent' filters by sender_id and maps rows to cards", async () => {
    const kudosBuilder = createQueryMock({ data: [emptyRow('k1')], error: null });
    const heartsBuilder = createQueryMock({ data: [], error: null });
    const statsBuilder = createQueryMock({ data: [], error: null });
    const mockFrom = mockTables({
      kudos_with_heart_count: kudosBuilder,
      hearts: heartsBuilder,
      profile_kudos_stats: statsBuilder,
    });

    const result = await getKudosByUser({ userId: 'u1', direction: 'sent' });

    expect(mockFrom).toHaveBeenCalledWith('kudos_with_heart_count');
    expect(kudosBuilder.eq).toHaveBeenCalledWith('sender_id', 'u1');
    expect(kudosBuilder.order).toHaveBeenNthCalledWith(1, 'created_at', { ascending: false });
    expect(kudosBuilder.order).toHaveBeenNthCalledWith(2, 'id', { ascending: false });
    expect(result).toHaveLength(1);
    expect(result[0]).toMatchObject({ id: 'k1' });
  });

  it("direction 'received' filters by receiver_id", async () => {
    const kudosBuilder = createQueryMock({ data: [], error: null });
    const mockFrom = mockTables({ kudos_with_heart_count: kudosBuilder });

    await getKudosByUser({ userId: 'u1', direction: 'received' });

    expect(mockFrom).toHaveBeenCalledWith('kudos_with_heart_count');
    expect(kudosBuilder.eq).toHaveBeenCalledWith('receiver_id', 'u1');
    expect(kudosBuilder.eq).not.toHaveBeenCalledWith('sender_id', 'u1');
  });

  it('returns an empty array when no rows come back', async () => {
    const kudosBuilder = createQueryMock({ data: null, error: null });
    mockTables({ kudos_with_heart_count: kudosBuilder });

    const result = await getKudosByUser({ userId: 'u1', direction: 'sent' });
    expect(result).toEqual([]);
  });

  it('propagates a Supabase error instead of swallowing it', async () => {
    const kudosBuilder = createQueryMock({ data: null, error: new Error('boom') });
    mockTables({ kudos_with_heart_count: kudosBuilder });

    await expect(getKudosByUser({ userId: 'u1', direction: 'sent' })).rejects.toThrow('boom');
  });
});

describe('getMyProfileHeader', () => {
  beforeEach(() => vi.clearAllMocks());

  it('reads profiles + profile_kudos_stats and derives star tier / Hero badge', async () => {
    const profileBuilder = createQueryMock({
      data: { full_name: 'Alice', avatar_url: 'alice.png', title: 'Dev', department: { name: 'Engineering' } },
      error: null,
    });
    const statsBuilder = createQueryMock({
      data: { received_count: 25, distinct_sender_count: 12 },
      error: null,
    });
    const mockFrom = mockTables({ profiles: profileBuilder, profile_kudos_stats: statsBuilder });

    const result = await getMyProfileHeader('u1');

    expect(mockFrom).toHaveBeenCalledWith('profiles');
    expect(mockFrom).toHaveBeenCalledWith('profile_kudos_stats');
    expect(profileBuilder.eq).toHaveBeenCalledWith('id', 'u1');
    expect(statsBuilder.eq).toHaveBeenCalledWith('profile_id', 'u1');
    expect(result).toEqual({
      fullName: 'Alice',
      avatarUrl: 'alice.png',
      department: 'Engineering',
      starTier: 2,
      heroBadge: 'super',
    });
  });

  it('falls back to empty strings + tier/badge 0 when the profile row is missing', async () => {
    const profileBuilder = createQueryMock({ data: null, error: null });
    const statsBuilder = createQueryMock({
      data: { received_count: 5, distinct_sender_count: 2 },
      error: null,
    });
    mockTables({ profiles: profileBuilder, profile_kudos_stats: statsBuilder });

    const result = await getMyProfileHeader('u1');

    expect(result.fullName).toBe('');
    expect(result.avatarUrl).toBe('');
    expect(result.department).toBe('');
    // Stats row still present, so tier/badge derive from it.
    expect(result.starTier).toBe(0);
    expect(result.heroBadge).toBe('new');
  });

  it('never throws when the stats row is missing (new user, zero kudos)', async () => {
    const profileBuilder = createQueryMock({
      data: { full_name: 'Bob', avatar_url: null, title: null, department: null },
      error: null,
    });
    const statsBuilder = createQueryMock({ data: null, error: null });
    mockTables({ profiles: profileBuilder, profile_kudos_stats: statsBuilder });

    const result = await getMyProfileHeader('u1');

    expect(result).toEqual({
      fullName: 'Bob',
      avatarUrl: '',
      department: '',
      starTier: 0,
      heroBadge: 'none',
    });
  });

  it('propagates a Supabase error from either query instead of swallowing it', async () => {
    const profileBuilder = createQueryMock({ data: null, error: new Error('boom') });
    const statsBuilder = createQueryMock({ data: null, error: null });
    mockTables({ profiles: profileBuilder, profile_kudos_stats: statsBuilder });

    await expect(getMyProfileHeader('u1')).rejects.toThrow('boom');
  });
});
