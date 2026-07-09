import { describe, it, expect, vi } from 'vitest';
import { listRecipients, listHashtags, uploadKudosImages } from './compose-data';
import type { SupabaseClient } from '@supabase/supabase-js';

describe('compose-data: client-safe helpers', () => {
  describe('listRecipients function', () => {
    it('is a function', () => {
      expect(typeof listRecipients).toBe('function');
    });

    it('returns a promise', async () => {
      const mockSupabase = {
        from: vi.fn().mockReturnValue({
          select: vi.fn().mockReturnValue({
            neq: vi.fn().mockReturnValue({
              order: vi.fn().mockReturnValue({
                limit: vi.fn().mockResolvedValue({
                  data: [],
                  error: null,
                }),
              }),
            }),
          }),
        }),
      } as unknown as SupabaseClient;

      const result = listRecipients(mockSupabase, 'self-id');
      expect(result instanceof Promise).toBe(true);
    });

    it('queries profiles table', async () => {
      const mockSupabase = {
        from: vi.fn().mockReturnValue({
          select: vi.fn().mockReturnValue({
            neq: vi.fn().mockReturnValue({
              order: vi.fn().mockReturnValue({
                limit: vi.fn().mockResolvedValue({
                  data: [
                    {
                      id: 'user-1',
                      full_name: 'Alice',
                      avatar_url: 'https://example.com/alice.png',
                      department: { name: 'Engineering' },
                    },
                  ],
                  error: null,
                }),
              }),
            }),
          }),
        }),
      } as unknown as SupabaseClient;

      const result = await listRecipients(mockSupabase, 'self-id');

      expect(mockSupabase.from).toHaveBeenCalledWith('profiles');
      expect(result.length).toBe(1);
      expect(result[0].fullName).toBe('Alice');
    });

    it('returns empty array when no data', async () => {
      const mockSupabase = {
        from: vi.fn().mockReturnValue({
          select: vi.fn().mockReturnValue({
            neq: vi.fn().mockReturnValue({
              order: vi.fn().mockReturnValue({
                limit: vi.fn().mockResolvedValue({
                  data: null,
                  error: null,
                }),
              }),
            }),
          }),
        }),
      } as unknown as SupabaseClient;

      const result = await listRecipients(mockSupabase, 'self-id');

      expect(result).toEqual([]);
    });
  });

  describe('listHashtags function', () => {
    it('is a function', () => {
      expect(typeof listHashtags).toBe('function');
    });

    it('returns a promise', async () => {
      const mockSupabase = {
        from: vi.fn().mockReturnValue({
          select: vi.fn().mockReturnValue({
            order: vi.fn().mockResolvedValue({
              data: [],
              error: null,
            }),
          }),
        }),
      } as unknown as SupabaseClient;

      const result = listHashtags(mockSupabase);
      expect(result instanceof Promise).toBe(true);
    });

    it('queries hashtags table', async () => {
      const mockSupabase = {
        from: vi.fn().mockReturnValue({
          select: vi.fn().mockReturnValue({
            order: vi.fn().mockResolvedValue({
              data: [
                { id: 'h1', label: 'teamwork' },
                { id: 'h2', label: 'innovation' },
              ],
              error: null,
            }),
          }),
        }),
      } as unknown as SupabaseClient;

      const result = await listHashtags(mockSupabase);

      expect(mockSupabase.from).toHaveBeenCalledWith('hashtags');
      expect(result).toEqual([
        { id: 'h1', label: 'teamwork' },
        { id: 'h2', label: 'innovation' },
      ]);
    });

    it('returns empty array when no data', async () => {
      const mockSupabase = {
        from: vi.fn().mockReturnValue({
          select: vi.fn().mockReturnValue({
            order: vi.fn().mockResolvedValue({
              data: null,
              error: null,
            }),
          }),
        }),
      } as unknown as SupabaseClient;

      const result = await listHashtags(mockSupabase);

      expect(result).toEqual([]);
    });
  });

  describe('uploadKudosImages function', () => {
    it('is a function', () => {
      expect(typeof uploadKudosImages).toBe('function');
    });

    it('rejects too many files', async () => {
      const files = Array(6).fill(new File([''], 'test.jpg', { type: 'image/jpeg' }));
      const uuid = () => 'test-uuid';
      const mockSupabase = {} as unknown as SupabaseClient;

      const result = await uploadKudosImages(mockSupabase, 'user-1', files, uuid);

      expect(result).toEqual({ ok: false, error: 'too_many' });
    });

    it('rejects invalid file type', async () => {
      const files = [new File([''], 'test.pdf', { type: 'application/pdf' })];
      const uuid = () => 'test-uuid';
      const mockSupabase = {} as unknown as SupabaseClient;

      const result = await uploadKudosImages(mockSupabase, 'user-1', files, uuid);

      expect(result).toEqual({ ok: false, error: 'invalid' });
    });

    it('accepts jpg', async () => {
      const files = [new File([''], 'test.jpg', { type: 'image/jpeg' })];
      const uuid = () => 'uuid-1';
      const mockStorageBucket = {
        upload: vi.fn().mockResolvedValue({ error: null }),
        getPublicUrl: vi.fn().mockReturnValue({
          data: { publicUrl: 'https://example.com/uuid-1.jpg' },
        }),
      };

      const mockSupabase = {
        storage: {
          from: vi.fn().mockReturnValue(mockStorageBucket),
        },
      } as unknown as SupabaseClient;

      const result = await uploadKudosImages(mockSupabase, 'user-1', files, uuid);

      expect(result.ok).toBe(true);
      if (result.ok) {
        expect(result.urls.length).toBe(1);
      }
    });

    it('accepts png', async () => {
      const files = [new File([''], 'test.png', { type: 'image/png' })];
      const uuid = () => 'uuid-1';
      const mockStorageBucket = {
        upload: vi.fn().mockResolvedValue({ error: null }),
        getPublicUrl: vi.fn().mockReturnValue({
          data: { publicUrl: 'https://example.com/uuid-1.png' },
        }),
      };

      const mockSupabase = {
        storage: {
          from: vi.fn().mockReturnValue(mockStorageBucket),
        },
      } as unknown as SupabaseClient;

      const result = await uploadKudosImages(mockSupabase, 'user-1', files, uuid);

      expect(result.ok).toBe(true);
    });

    it('accepts webp', async () => {
      const files = [new File([''], 'test.webp', { type: 'image/webp' })];
      const uuid = () => 'uuid-1';
      const mockStorageBucket = {
        upload: vi.fn().mockResolvedValue({ error: null }),
        getPublicUrl: vi.fn().mockReturnValue({
          data: { publicUrl: 'https://example.com/uuid-1.webp' },
        }),
      };

      const mockSupabase = {
        storage: {
          from: vi.fn().mockReturnValue(mockStorageBucket),
        },
      } as unknown as SupabaseClient;

      const result = await uploadKudosImages(mockSupabase, 'user-1', files, uuid);

      expect(result.ok).toBe(true);
    });

    it('accepts gif', async () => {
      const files = [new File([''], 'test.gif', { type: 'image/gif' })];
      const uuid = () => 'uuid-1';
      const mockStorageBucket = {
        upload: vi.fn().mockResolvedValue({ error: null }),
        getPublicUrl: vi.fn().mockReturnValue({
          data: { publicUrl: 'https://example.com/uuid-1.gif' },
        }),
      };

      const mockSupabase = {
        storage: {
          from: vi.fn().mockReturnValue(mockStorageBucket),
        },
      } as unknown as SupabaseClient;

      const result = await uploadKudosImages(mockSupabase, 'user-1', files, uuid);

      expect(result.ok).toBe(true);
    });

    it('rejects oversized file', async () => {
      // 5 MB + 1 byte
      const bigBuffer = new ArrayBuffer(5 * 1024 * 1024 + 1);
      const files = [new File([bigBuffer], 'test.jpg', { type: 'image/jpeg' })];
      const uuid = () => 'uuid-1';
      const mockSupabase = {} as unknown as SupabaseClient;

      const result = await uploadKudosImages(mockSupabase, 'user-1', files, uuid);

      expect(result).toEqual({ ok: false, error: 'invalid' });
    });

    it('handles upload error', async () => {
      const files = [new File([''], 'test.jpg', { type: 'image/jpeg' })];
      const uuid = () => 'uuid-1';
      const mockStorageBucket = {
        upload: vi.fn().mockResolvedValue({ error: new Error('Upload failed') }),
        getPublicUrl: vi.fn(),
      };

      const mockSupabase = {
        storage: {
          from: vi.fn().mockReturnValue(mockStorageBucket),
        },
      } as unknown as SupabaseClient;

      const result = await uploadKudosImages(mockSupabase, 'user-1', files, uuid);

      expect(result).toEqual({ ok: false, error: 'upload_failed' });
    });
  });
});
