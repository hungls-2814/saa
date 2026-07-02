/* eslint-disable @typescript-eslint/no-explicit-any */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NextResponse, NextRequest } from 'next/server';
import { updateSession } from './middleware';

// Mock isSupabaseConfigured
vi.mock('./config', () => ({
  isSupabaseConfigured: vi.fn(),
}));

// Mock @supabase/ssr
vi.mock('@supabase/ssr', () => ({
  createServerClient: vi.fn(),
}));

import { isSupabaseConfigured } from './config';
import { createServerClient } from '@supabase/ssr';

describe('updateSession(request)', () => {
  let mockCreateServerClient: any;
  let mockIsSupabaseConfigured: any;

  beforeEach(() => {
    vi.clearAllMocks();
    mockIsSupabaseConfigured = vi.mocked(isSupabaseConfigured);
    mockCreateServerClient = vi.mocked(createServerClient);
  });

  describe('when Supabase is not configured', () => {
    beforeEach(() => {
      mockIsSupabaseConfigured.mockReturnValue(false);
    });

    it('returns user: null without calling Supabase client', async () => {
      const request = new NextRequest('http://localhost:3000/');
      const result = await updateSession(request);

      expect(result.user).toBeNull();
      expect(mockCreateServerClient).not.toHaveBeenCalled();
    });

    it('returns a NextResponse for the current request', async () => {
      const request = new NextRequest('http://localhost:3000/');
      const result = await updateSession(request);

      expect(result.supabaseResponse).toBeInstanceOf(NextResponse);
    });

    it('does not make network calls to Supabase', async () => {
      const request = new NextRequest('http://localhost:3000/');
      await updateSession(request);

      // No calls to createServerClient means no network requests
      expect(mockCreateServerClient).not.toHaveBeenCalled();
    });
  });

  describe('when Supabase is configured', () => {
    beforeEach(() => {
      mockIsSupabaseConfigured.mockReturnValue(true);
      process.env.NEXT_PUBLIC_SUPABASE_URL = 'https://test.supabase.co';
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = 'test-anon-key';
    });

    it('calls createServerClient with correct credentials', async () => {
      const mockGetUser = vi.fn().mockResolvedValue({ data: { user: null } });
      mockCreateServerClient.mockReturnValue({
        auth: {
          getUser: mockGetUser,
        },
      });

      const request = new NextRequest('http://localhost:3000/');
      await updateSession(request);

      expect(mockCreateServerClient).toHaveBeenCalledWith(
        'https://test.supabase.co',
        'test-anon-key',
        expect.any(Object)
      );
    });

    it('calls supabase.auth.getUser() to validate session', async () => {
      const mockGetUser = vi.fn().mockResolvedValue({ data: { user: null } });
      mockCreateServerClient.mockReturnValue({
        auth: {
          getUser: mockGetUser,
        },
      });

      const request = new NextRequest('http://localhost:3000/');
      await updateSession(request);

      expect(mockGetUser).toHaveBeenCalledOnce();
    });

    it('returns null user when no session is active', async () => {
      const mockGetUser = vi.fn().mockResolvedValue({ data: { user: null } });
      mockCreateServerClient.mockReturnValue({
        auth: {
          getUser: mockGetUser,
        },
      });

      const request = new NextRequest('http://localhost:3000/');
      const result = await updateSession(request);

      expect(result.user).toBeNull();
    });

    it('returns user object when session is valid', async () => {
      const mockUser = {
        id: 'user-123',
        email: 'test@example.com',
        user_metadata: { name: 'Test User' },
      };
      const mockGetUser = vi.fn().mockResolvedValue({ data: { user: mockUser } });
      mockCreateServerClient.mockReturnValue({
        auth: {
          getUser: mockGetUser,
        },
      });

      const request = new NextRequest('http://localhost:3000/');
      const result = await updateSession(request);

      expect(result.user).toEqual(mockUser);
    });

    it('returns a NextResponse', async () => {
      const mockGetUser = vi.fn().mockResolvedValue({ data: { user: null } });
      mockCreateServerClient.mockReturnValue({
        auth: {
          getUser: mockGetUser,
        },
      });

      const request = new NextRequest('http://localhost:3000/');
      const result = await updateSession(request);

      expect(result.supabaseResponse).toBeInstanceOf(NextResponse);
    });

    it('sets up cookie sync handler in createServerClient', async () => {
      const mockGetUser = vi.fn().mockResolvedValue({ data: { user: null } });
      mockCreateServerClient.mockReturnValue({
        auth: {
          getUser: mockGetUser,
        },
      });

      const request = new NextRequest('http://localhost:3000/');
      await updateSession(request);

      const config = mockCreateServerClient.mock.calls[0][2];
      expect(config).toHaveProperty('cookies');
      expect(config.cookies).toHaveProperty('getAll');
      expect(config.cookies).toHaveProperty('setAll');
    });
  });
});
