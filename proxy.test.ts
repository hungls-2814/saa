/* eslint-disable @typescript-eslint/no-explicit-any */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NextRequest } from 'next/server';
import { proxy } from './proxy';

// Mock updateSession
vi.mock('@/lib/supabase/middleware', () => ({
  updateSession: vi.fn(),
}));

import { updateSession } from '@/lib/supabase/middleware';

describe('proxy(request)', () => {
  let mockUpdateSession: any;

  beforeEach(() => {
    vi.clearAllMocks();
    mockUpdateSession = vi.mocked(updateSession);
  });

  describe('authenticated user on login page (/login)', () => {
    beforeEach(() => {
      mockUpdateSession.mockResolvedValue({
        supabaseResponse: new Response(),
        user: { id: 'user-123', email: 'test@example.com' },
      });
    });

    it('redirects to / (home) when authenticated user accesses /login', async () => {
      const request = new NextRequest('http://localhost:3000/login');
      const response = await proxy(request);

      expect(response.status).toBe(307);
      expect(new URL(response.headers.get('location')!).pathname).toBe('/');
    });

    it('allows unauthenticated users to access /login', async () => {
      mockUpdateSession.mockResolvedValue({
        supabaseResponse: new Response(null, { status: 200 }),
        user: null,
      });

      const request = new NextRequest('http://localhost:3000/login');
      const response = await proxy(request);

      expect(response.status).toBe(200);
    });
  });

  describe('public routes (no protected routes currently)', () => {
    beforeEach(() => {
      mockUpdateSession.mockResolvedValue({
        supabaseResponse: new Response(null, { status: 200 }),
        user: null,
      });
    });

    it('allows access to / (home) when unauthenticated', async () => {
      const request = new NextRequest('http://localhost:3000/');
      const response = await proxy(request);

      expect(response.status).toBe(200);
    });

    it('allows access to arbitrary public routes when unauthenticated', async () => {
      const request = new NextRequest('http://localhost:3000/about');
      const response = await proxy(request);

      expect(response.status).toBe(200);
    });

    it('does not gate the former /todo path — it is no longer protected', async () => {
      const request = new NextRequest('http://localhost:3000/todo');
      const response = await proxy(request);

      // /todo was removed; unauthenticated access now flows through, not redirected.
      expect(response.status).toBe(200);
    });

    it('allows authenticated users to access public routes', async () => {
      mockUpdateSession.mockResolvedValue({
        supabaseResponse: new Response(null, { status: 200 }),
        user: { id: 'user-123', email: 'test@example.com' },
      });

      const request = new NextRequest('http://localhost:3000/about');
      const response = await proxy(request);

      expect(response.status).toBe(200);
    });
  });

  describe('session refresh + pass-through', () => {
    it('calls updateSession for every request', async () => {
      mockUpdateSession.mockResolvedValue({
        supabaseResponse: new Response(),
        user: null,
      });

      const request = new NextRequest('http://localhost:3000/public');
      await proxy(request);

      expect(mockUpdateSession).toHaveBeenCalledWith(request);
    });

    it('returns supabaseResponse from updateSession for pass-through', async () => {
      const mockResponse = new Response('content', { status: 200 });
      mockUpdateSession.mockResolvedValue({
        supabaseResponse: mockResponse,
        user: null,
      });

      const request = new NextRequest('http://localhost:3000/public');
      const response = await proxy(request);

      expect(response).toBe(mockResponse);
    });
  });
});
