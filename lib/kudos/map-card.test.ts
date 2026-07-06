import { describe, it, expect } from 'vitest';
import { mapKudosRowToCard, type KudosRow } from './map-card';

function makeRow(overrides: Partial<KudosRow> = {}): KudosRow {
  return {
    id: 'kudos-1',
    content: 'Great work!',
    created_at: '2026-07-06T10:00:00.000Z',
    heart_count: 3,
    sender: {
      id: 'sender-1',
      full_name: 'Alice',
      avatar_url: 'https://example.com/alice.png',
      title: 'Senior Dev',
      department: { name: 'Engineering' },
    },
    receiver: {
      id: 'receiver-1',
      full_name: 'Bob',
      avatar_url: 'https://example.com/bob.png',
      title: null,
      department: null,
    },
    kudos_hashtags: [
      { hashtag: { id: 'h1', label: 'teamwork' } },
      { hashtag: { id: 'h2', label: 'innovation' } },
    ],
    kudos_images: [{ url: 'img1' }, { url: 'img2' }],
    ...overrides,
  };
}

describe('mapKudosRowToCard', () => {
  it('maps a full row into a KudosCard', () => {
    const card = mapKudosRowToCard(makeRow(), {
      likedByMe: new Set(),
      receivedCounts: new Map([['sender-1', 15]]),
    });

    expect(card).toEqual({
      id: 'kudos-1',
      sender: {
        id: 'sender-1',
        fullName: 'Alice',
        department: 'Engineering',
        avatarUrl: 'https://example.com/alice.png',
        title: 'Senior Dev',
        starTier: 1,
      },
      receiver: {
        id: 'receiver-1',
        fullName: 'Bob',
        department: '',
        avatarUrl: 'https://example.com/bob.png',
        title: '',
        starTier: 0,
      },
      content: 'Great work!',
      createdAt: '2026-07-06T10:00:00.000Z',
      heartCount: 3,
      likedByMe: false,
      hashtags: [
        { id: 'h1', label: 'teamwork' },
        { id: 'h2', label: 'innovation' },
      ],
      images: ['img1', 'img2'],
    });
  });

  it('folds likedByMe = true when the kudos id is in the liked set', () => {
    const card = mapKudosRowToCard(makeRow({ id: 'kudos-42' }), {
      likedByMe: new Set(['kudos-42']),
      receivedCounts: new Map(),
    });
    expect(card.likedByMe).toBe(true);
  });

  it('derives receiver star tier from the batched received-count map', () => {
    const card = mapKudosRowToCard(makeRow(), {
      likedByMe: new Set(),
      receivedCounts: new Map([
        ['sender-1', 0],
        ['receiver-1', 50],
      ]),
    });
    expect(card.receiver.starTier).toBe(3);
    expect(card.sender.starTier).toBe(0);
  });

  it('caps images at 5 thumbnails', () => {
    const row = makeRow({
      kudos_images: [
        { url: '1' },
        { url: '2' },
        { url: '3' },
        { url: '4' },
        { url: '5' },
        { url: '6' },
        { url: '7' },
      ],
    });
    const card = mapKudosRowToCard(row, { likedByMe: new Set(), receivedCounts: new Map() });
    expect(card.images).toEqual(['1', '2', '3', '4', '5']);
  });

  it('handles null sender/receiver/hashtags/images gracefully', () => {
    const row = makeRow({
      sender: null,
      receiver: null,
      kudos_hashtags: null,
      kudos_images: null,
    });
    const card = mapKudosRowToCard(row, { likedByMe: new Set(), receivedCounts: new Map() });
    expect(card.sender).toEqual({
      id: '',
      fullName: '',
      department: '',
      avatarUrl: '',
      title: '',
      starTier: 0,
    });
    expect(card.hashtags).toEqual([]);
    expect(card.images).toEqual([]);
  });

  it('drops null hashtag junction rows (orphaned join rows)', () => {
    const row = makeRow({
      kudos_hashtags: [{ hashtag: { id: 'h1', label: 'teamwork' } }, { hashtag: null }],
    });
    const card = mapKudosRowToCard(row, { likedByMe: new Set(), receivedCounts: new Map() });
    expect(card.hashtags).toEqual([{ id: 'h1', label: 'teamwork' }]);
  });
});
