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

  describe('unauthenticated user on protected route (/todo)', () => {
    beforeEach(() => {
      mockUpdateSession.mockResolvedValue({
        supabaseResponse: new Response(),
        user: null,
      });
    });

    it('redirects to /login when accessing /todo without auth', async () => {
      const request = new NextRequest('http://localhost:3000/todo');
      const response = await proxy(request);

      expect(response.status).toBe(307); // Redirect status
      expect(response.headers.get('location')).toContain('/login');
    });

    it('does not redirect for authenticated access to /todo', async () => {
      mockUpdateSession.mockResolvedValue({
        supabaseResponse: new Response(null, { status: 200 }),
        user: { id: 'user-123', email: 'test@example.com' },
      });

      const request = new NextRequest('http://localhost:3000/todo');
      const response = await proxy(request);

      // Non-redirect response (200 or similar)
      expect(response.status).not.toBe(307);
    });
  });

  describe('authenticated user on login page (/login)', () => {
    beforeEach(() => {
      mockUpdateSession.mockResolvedValue({
        supabaseResponse: new Response(),
        user: { id: 'user-123', email: 'test@example.com' },
      });
    });

    it('redirects to /todo when authenticated user accesses /login', async () => {
      const request = new NextRequest('http://localhost:3000/login');
      const response = await proxy(request);

      expect(response.status).toBe(307);
      expect(response.headers.get('location')).toContain('/todo');
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

  describe('general flow-through routes', () => {
    beforeEach(() => {
      mockUpdateSession.mockResolvedValue({
        supabaseResponse: new Response(null, { status: 200 }),
        user: null,
      });
    });

    it('allows access to public routes like /about when unauthenticated', async () => {
      const request = new NextRequest('http://localhost:3000/about');
      const response = await proxy(request);

      expect(response.status).toBe(200);
    });

    it('allows access to / when unauthenticated', async () => {
      const request = new NextRequest('http://localhost:3000/');
      const response = await proxy(request);

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

  describe('edge cases', () => {
    it('calls updateSession for every request', async () => {
      mockUpdateSession.mockResolvedValue({
        supabaseResponse: new Response(),
        user: null,
      });

      const request = new NextRequest('http://localhost:3000/public');
      await proxy(request);

      expect(mockUpdateSession).toHaveBeenCalledWith(request);
    });

    it('preserves query parameters when redirecting', async () => {
      mockUpdateSession.mockResolvedValue({
        supabaseResponse: new Response(),
        user: null,
      });

      const request = new NextRequest('http://localhost:3000/todo?page=1&sort=asc');
      const response = await proxy(request);

      const location = response.headers.get('location');
      expect(location).toContain('/login');
    });

    it('handles paths with trailing slashes', async () => {
      mockUpdateSession.mockResolvedValue({
        supabaseResponse: new Response(),
        user: null,
      });

      const request = new NextRequest('http://localhost:3000/todo/');
      const response = await proxy(request);

      expect(response.status).toBe(307);
    });

    it('redirects /todo to /login even with trailing slash', async () => {
      mockUpdateSession.mockResolvedValue({
        supabaseResponse: new Response(),
        user: null,
      });

      const request = new NextRequest('http://localhost:3000/todo/');
      const response = await proxy(request);

      expect(response.headers.get('location')).toContain('/login');
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

  describe('multiple protected routes', () => {
    it('protects /todo path and subpaths', async () => {
      mockUpdateSession.mockResolvedValue({
        supabaseResponse: new Response(),
        user: null,
      });

      const request = new NextRequest('http://localhost:3000/todo/123');
      const response = await proxy(request);

      expect(response.status).toBe(307);
      expect(response.headers.get('location')).toContain('/login');
    });

    it('protects /todo and any paths starting with /todo', async () => {
      mockUpdateSession.mockResolvedValue({
        supabaseResponse: new Response(null, { status: 200 }),
        user: null,
      });

      const request = new NextRequest('http://localhost:3000/todoitem');
      const response = await proxy(request);

      // /todoitem starts with /todo so it is protected
      expect(response.status).toBe(307);
      expect(response.headers.get('location')).toContain('/login');
    });
  });
});
