/* eslint-disable @typescript-eslint/no-explicit-any */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { GET } from './route';

// Mock @/lib/supabase/server
vi.mock('@/lib/supabase/server', () => ({
  createClient: vi.fn(),
}));

import { createClient } from '@/lib/supabase/server';

describe('GET /auth/callback', () => {
  let mockCreateClient: any;

  beforeEach(() => {
    vi.clearAllMocks();
    mockCreateClient = vi.mocked(createClient);
  });

  describe('successful OAuth exchange', () => {
    beforeEach(() => {
      mockCreateClient.mockResolvedValue({
        auth: {
          exchangeCodeForSession: vi.fn().mockResolvedValue({ error: null }),
        },
      });
    });

    it('redirects to /todo when code exchange succeeds', async () => {
      const url = 'http://localhost:3000/auth/callback?code=auth_code_123';
      const request = new Request(url);
      const response = await GET(request);

      expect(response.status).toBe(307);
      expect(response.headers.get('location')).toContain('/todo');
    });

    it('redirects to custom next parameter when provided', async () => {
      const url = 'http://localhost:3000/auth/callback?code=auth_code_123&next=/profile';
      const request = new Request(url);
      const response = await GET(request);

      expect(response.status).toBe(307);
      expect(response.headers.get('location')).toContain('/profile');
    });

    it('calls createClient to get supabase instance', async () => {
      const url = 'http://localhost:3000/auth/callback?code=auth_code_123';
      const request = new Request(url);
      await GET(request);

      expect(mockCreateClient).toHaveBeenCalledOnce();
    });

    it('calls exchangeCodeForSession with the provided code', async () => {
      const mockExchange = vi.fn().mockResolvedValue({ error: null });
      mockCreateClient.mockResolvedValue({
        auth: {
          exchangeCodeForSession: mockExchange,
        },
      });

      const url = 'http://localhost:3000/auth/callback?code=test_code_abc';
      const request = new Request(url);
      await GET(request);

      expect(mockExchange).toHaveBeenCalledWith('test_code_abc');
    });

    it('preserves the request origin in redirect URL', async () => {
      const url = 'https://example.com/auth/callback?code=code_123';
      const request = new Request(url);
      const response = await GET(request);

      const location = response.headers.get('location');
      expect(location).toContain('https://example.com');
    });
  });

  describe('OAuth exchange failure', () => {
    it('redirects to /login?error=auth_callback_failed when exchange fails', async () => {
      mockCreateClient.mockResolvedValue({
        auth: {
          exchangeCodeForSession: vi.fn().mockResolvedValue({
            error: new Error('Exchange failed'),
          }),
        },
      });

      const url = 'http://localhost:3000/auth/callback?code=invalid_code';
      const request = new Request(url);
      const response = await GET(request);

      expect(response.status).toBe(307);
      expect(response.headers.get('location')).toContain('/login?error=auth_callback_failed');
    });

    it('redirects to /login?error=auth_callback_failed when code is missing', async () => {
      const url = 'http://localhost:3000/auth/callback';
      const request = new Request(url);
      const response = await GET(request);

      expect(response.status).toBe(307);
      expect(response.headers.get('location')).toContain('/login?error=auth_callback_failed');
    });

    it('redirects to /login?error=auth_callback_failed when code is empty string', async () => {
      const url = 'http://localhost:3000/auth/callback?code=';
      const request = new Request(url);
      const response = await GET(request);

      expect(response.status).toBe(307);
      expect(response.headers.get('location')).toContain('/login?error=auth_callback_failed');
    });

    it('does not call exchangeCodeForSession when code is missing', async () => {
      const mockExchange = vi.fn();
      mockCreateClient.mockResolvedValue({
        auth: {
          exchangeCodeForSession: mockExchange,
        },
      });

      const url = 'http://localhost:3000/auth/callback';
      const request = new Request(url);
      await GET(request);

      expect(mockExchange).not.toHaveBeenCalled();
    });

    it('does not create a client when code is empty string', async () => {
      const url = 'http://localhost:3000/auth/callback?code=';
      const request = new Request(url);
      await GET(request);

      // Empty code is falsy, so createClient should not be called
      expect(mockCreateClient).not.toHaveBeenCalled();
    });
  });

  describe('redirect URL construction', () => {
    it('defaults next parameter to /todo when not provided', async () => {
      mockCreateClient.mockResolvedValue({
        auth: {
          exchangeCodeForSession: vi.fn().mockResolvedValue({ error: null }),
        },
      });

      const url = 'http://localhost:3000/auth/callback?code=code_123';
      const request = new Request(url);
      const response = await GET(request);

      expect(response.headers.get('location')).toContain('/todo');
    });

    it('uses next parameter when provided', async () => {
      mockCreateClient.mockResolvedValue({
        auth: {
          exchangeCodeForSession: vi.fn().mockResolvedValue({ error: null }),
        },
      });

      const url = 'http://localhost:3000/auth/callback?code=code_123&next=/dashboard';
      const request = new Request(url);
      const response = await GET(request);

      const location = response.headers.get('location');
      expect(location).toContain('/dashboard');
      expect(location).not.toContain('/todo');
    });

    it('rejects an absolute-URL next (open redirect) and falls back to /todo', async () => {
      mockCreateClient.mockResolvedValue({
        auth: {
          exchangeCodeForSession: vi.fn().mockResolvedValue({ error: null }),
        },
      });

      const url =
        'http://localhost:3000/auth/callback?code=code_123&next=https://evil.com';
      const request = new Request(url);
      const response = await GET(request);

      const location = response.headers.get('location');
      expect(location).toBe('http://localhost:3000/todo');
      expect(location).not.toContain('evil.com');
    });

    it('rejects a protocol-relative next (//host) and falls back to /todo', async () => {
      mockCreateClient.mockResolvedValue({
        auth: {
          exchangeCodeForSession: vi.fn().mockResolvedValue({ error: null }),
        },
      });

      const url =
        'http://localhost:3000/auth/callback?code=code_123&next=//evil.com/x';
      const request = new Request(url);
      const response = await GET(request);

      const location = response.headers.get('location');
      expect(location).toBe('http://localhost:3000/todo');
      expect(location).not.toContain('evil.com');
    });

    it('ignores next parameter on exchange failure', async () => {
      mockCreateClient.mockResolvedValue({
        auth: {
          exchangeCodeForSession: vi.fn().mockResolvedValue({
            error: new Error('Failed'),
          }),
        },
      });

      const url = 'http://localhost:3000/auth/callback?code=code_123&next=/dashboard';
      const request = new Request(url);
      const response = await GET(request);

      const location = response.headers.get('location');
      expect(location).toContain('/login?error=auth_callback_failed');
    });
  });

  describe('edge cases', () => {
    it('handles code with special characters', async () => {
      const mockExchange = vi.fn().mockResolvedValue({ error: null });
      mockCreateClient.mockResolvedValue({
        auth: {
          exchangeCodeForSession: mockExchange,
        },
      });

      const url = 'http://localhost:3000/auth/callback?code=abc-123_456.xyz';
      const request = new Request(url);
      await GET(request);

      expect(mockExchange).toHaveBeenCalledWith('abc-123_456.xyz');
    });

    it('handles multiple query parameters', async () => {
      mockCreateClient.mockResolvedValue({
        auth: {
          exchangeCodeForSession: vi.fn().mockResolvedValue({ error: null }),
        },
      });

      const url = 'http://localhost:3000/auth/callback?code=code_123&state=state_123&next=/profile';
      const request = new Request(url);
      const response = await GET(request);

      expect(response.status).toBe(307);
      const location = response.headers.get('location');
      expect(location).toContain('/profile');
    });

    it('handles HTTP origin (localhost)', async () => {
      mockCreateClient.mockResolvedValue({
        auth: {
          exchangeCodeForSession: vi.fn().mockResolvedValue({ error: null }),
        },
      });

      const url = 'http://localhost:3000/auth/callback?code=code_123';
      const request = new Request(url);
      const response = await GET(request);

      const location = response.headers.get('location');
      expect(location).toContain('http://localhost:3000');
    });

    it('handles HTTPS origin (production)', async () => {
      mockCreateClient.mockResolvedValue({
        auth: {
          exchangeCodeForSession: vi.fn().mockResolvedValue({ error: null }),
        },
      });

      const url = 'https://app.example.com/auth/callback?code=code_123';
      const request = new Request(url);
      const response = await GET(request);

      const location = response.headers.get('location');
      expect(location).toContain('https://app.example.com');
    });
  });
});
