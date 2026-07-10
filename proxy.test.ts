/* eslint-disable @typescript-eslint/no-explicit-any */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { NextRequest, NextResponse } from 'next/server';
import { proxy } from './proxy';

// Mock updateSession
vi.mock('@/lib/supabase/middleware', () => ({
  updateSession: vi.fn(),
}));

import { updateSession } from '@/lib/supabase/middleware';

// A launch datetime safely in the PAST so the prelaunch gate is open
// (isBeforeLaunch === false) and the auth-guard behaviour below is exercised.
const PAST_LAUNCH = '2000-01-01T00:00:00+07:00';
// A launch datetime safely in the FUTURE for exercising the prelaunch gate.
const FUTURE_LAUNCH = '2999-12-26T18:30:00+07:00';

describe('proxy(request)', () => {
  let mockUpdateSession: any;

  beforeEach(() => {
    vi.clearAllMocks();
    // Default the whole suite to "after launch" so existing route-guard
    // expectations hold; the prelaunch-gate block overrides this to a future date.
    process.env.NEXT_PUBLIC_EVENT_DATETIME = PAST_LAUNCH;
    // Default: auto-preview flag OFF, so the gate is fully active; the
    // auto-preview block flips PRELAUNCH_AUTO_PREVIEW on.
    delete process.env.PRELAUNCH_AUTO_PREVIEW;
    mockUpdateSession = vi.mocked(updateSession);
  });

  afterEach(() => {
    delete process.env.NEXT_PUBLIC_EVENT_DATETIME;
    delete process.env.PRELAUNCH_AUTO_PREVIEW;
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

  describe('protected routes (/he-thong-giai)', () => {
    it('redirects to /login when unauthenticated user accesses /he-thong-giai', async () => {
      mockUpdateSession.mockResolvedValue({
        supabaseResponse: new Response(null, { status: 200 }),
        user: null,
      });

      const request = new NextRequest('http://localhost:3000/he-thong-giai');
      const response = await proxy(request);

      expect(response.status).toBe(307);
      expect(new URL(response.headers.get('location')!).pathname).toBe('/login');
    });

    it('allows authenticated user to access /he-thong-giai', async () => {
      mockUpdateSession.mockResolvedValue({
        supabaseResponse: new Response(null, { status: 200 }),
        user: { id: 'user-123', email: 'test@example.com' },
      });

      const request = new NextRequest('http://localhost:3000/he-thong-giai');
      const response = await proxy(request);

      expect(response.status).toBe(200);
    });
  });

  describe('protected routes (/kudos)', () => {
    it('redirects to /login when unauthenticated user accesses /kudos', async () => {
      mockUpdateSession.mockResolvedValue({
        supabaseResponse: new Response(null, { status: 200 }),
        user: null,
      });

      const request = new NextRequest('http://localhost:3000/kudos');
      const response = await proxy(request);

      expect(response.status).toBe(307);
      expect(new URL(response.headers.get('location')!).pathname).toBe('/login');
    });

    it('allows authenticated user to access /kudos', async () => {
      mockUpdateSession.mockResolvedValue({
        supabaseResponse: new Response(null, { status: 200 }),
        user: { id: 'user-123', email: 'test@example.com' },
      });

      const request = new NextRequest('http://localhost:3000/kudos');
      const response = await proxy(request);

      expect(response.status).toBe(200);
    });
  });

  describe('protected routes (/profile)', () => {
    it('redirects to /login when unauthenticated user accesses /profile', async () => {
      mockUpdateSession.mockResolvedValue({
        supabaseResponse: new Response(null, { status: 200 }),
        user: null,
      });

      const request = new NextRequest('http://localhost:3000/profile');
      const response = await proxy(request);

      expect(response.status).toBe(307);
      expect(new URL(response.headers.get('location')!).pathname).toBe('/login');
    });

    it('allows authenticated user to access /profile', async () => {
      mockUpdateSession.mockResolvedValue({
        supabaseResponse: new Response(null, { status: 200 }),
        user: { id: 'user-123', email: 'test@example.com' },
      });

      const request = new NextRequest('http://localhost:3000/profile');
      const response = await proxy(request);

      expect(response.status).toBe(200);
    });
  });

  describe('public routes', () => {
    beforeEach(() => {
      mockUpdateSession.mockResolvedValue({
        supabaseResponse: new Response(null, { status: 200 }),
        user: null,
      });
    });

    it('allows access to / (home) when unauthenticated', async () => {
      // After launch the server serves `/` directly; the first-visit intro is
      // handled client-side (IntroGate), not by a server redirect.
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

  describe('prelaunch gate (before SAA launch)', () => {
    beforeEach(() => {
      process.env.NEXT_PUBLIC_EVENT_DATETIME = FUTURE_LAUNCH;
      mockUpdateSession.mockResolvedValue({
        supabaseResponse: new Response(null, { status: 200 }),
        user: null,
      });
    });

    it.each(['/', '/home', '/login', '/he-thong-giai', '/about'])(
      'redirects %s to /prelaunch before launch',
      async (path) => {
        const request = new NextRequest(`http://localhost:3000${path}`);
        const response = await proxy(request);

        expect(response.status).toBe(307);
        expect(new URL(response.headers.get('location')!).pathname).toBe(
          '/prelaunch',
        );
      },
    );

    it('serves /prelaunch itself without redirecting (public, no loop)', async () => {
      const request = new NextRequest('http://localhost:3000/prelaunch');
      const response = await proxy(request);

      expect(response.status).toBe(200);
    });

    it('does not call updateSession on the redirect hot path', async () => {
      const request = new NextRequest('http://localhost:3000/home');
      await proxy(request);

      expect(mockUpdateSession).not.toHaveBeenCalled();
    });
  });

  describe('reviewer preview bypass', () => {
    beforeEach(() => {
      // Before launch, so the gate would normally lock everything down.
      process.env.NEXT_PUBLIC_EVENT_DATETIME = FUTURE_LAUNCH;
      mockUpdateSession.mockResolvedValue({
        // NextResponse so proxy can attach the preview cookie.
        supabaseResponse: NextResponse.next(),
        user: null,
      });
    });

    it('serves a public route when ?preview=1 is present, instead of gating to /prelaunch', async () => {
      const request = new NextRequest('http://localhost:3000/home?preview=1');
      const response = await proxy(request);

      expect(response.status).toBe(200);
    });

    it('sets the saa_preview cookie on ?preview=1 so the opt-in persists', async () => {
      const request = new NextRequest('http://localhost:3000/home?preview=1');
      const response = await proxy(request);

      expect(response.cookies.get('saa_preview')?.value).toBe('1');
    });

    it('bypasses the gate on subsequent routes when the saa_preview cookie is set', async () => {
      const request = new NextRequest('http://localhost:3000/home', {
        headers: { cookie: 'saa_preview=1' },
      });
      const response = await proxy(request);

      expect(response.status).toBe(200);
    });

    it('does not gate /prelaunch itself in preview mode', async () => {
      const request = new NextRequest('http://localhost:3000/prelaunch', {
        headers: { cookie: 'saa_preview=1' },
      });
      const response = await proxy(request);

      expect(response.status).toBe(200);
    });

    it('still redirects to /prelaunch before launch when no preview opt-in is present', async () => {
      const request = new NextRequest('http://localhost:3000/home');
      const response = await proxy(request);

      expect(response.status).toBe(307);
      expect(new URL(response.headers.get('location')!).pathname).toBe('/prelaunch');
    });
  });

  describe('auto-preview (PRELAUNCH_AUTO_PREVIEW flag)', () => {
    beforeEach(() => {
      process.env.NEXT_PUBLIC_EVENT_DATETIME = FUTURE_LAUNCH;
      // Explicit opt-in flag on — any environment can enable it.
      process.env.PRELAUNCH_AUTO_PREVIEW = 'true';
      mockUpdateSession.mockResolvedValue({
        supabaseResponse: NextResponse.next(),
        user: null,
      });
    });

    it('auto-redirects a bare /prelaunch hit to /prelaunch?preview=1 when the flag is on', async () => {
      const request = new NextRequest('http://localhost:3000/prelaunch');
      const response = await proxy(request);

      expect(response.status).toBe(307);
      const location = new URL(response.headers.get('location')!);
      expect(location.pathname).toBe('/prelaunch');
      expect(location.searchParams.get('preview')).toBe('1');
    });

    it('does not loop: /prelaunch?preview=1 is served, not re-redirected', async () => {
      const request = new NextRequest('http://localhost:3000/prelaunch?preview=1');
      const response = await proxy(request);

      expect(response.status).toBe(200);
    });

    it('is disabled when the flag is off — bare /prelaunch stays the real countdown', async () => {
      delete process.env.PRELAUNCH_AUTO_PREVIEW;
      const request = new NextRequest('http://localhost:3000/prelaunch');
      const response = await proxy(request);

      expect(response.status).toBe(200);
    });

    it('treats any non-"true" flag value as off', async () => {
      process.env.PRELAUNCH_AUTO_PREVIEW = '1';
      const request = new NextRequest('http://localhost:3000/prelaunch');
      const response = await proxy(request);

      expect(response.status).toBe(200);
    });

    it('does not auto-preview other routes — they still gate to /prelaunch', async () => {
      const request = new NextRequest('http://localhost:3000/home');
      const response = await proxy(request);

      expect(response.status).toBe(307);
      expect(new URL(response.headers.get('location')!).pathname).toBe('/prelaunch');
    });
  });

  describe('after launch', () => {
    beforeEach(() => {
      process.env.NEXT_PUBLIC_EVENT_DATETIME = PAST_LAUNCH;
      mockUpdateSession.mockResolvedValue({
        supabaseResponse: new Response(null, { status: 200 }),
        user: null,
      });
    });

    it('serves /prelaunch after launch (client shows the intro splash, no server redirect)', async () => {
      const request = new NextRequest('http://localhost:3000/prelaunch');
      const response = await proxy(request);

      expect(response.status).toBe(200);
    });
  });

  describe('after launch: no server-side intro gate (client-driven per tab)', () => {
    beforeEach(() => {
      process.env.NEXT_PUBLIC_EVENT_DATETIME = PAST_LAUNCH;
      mockUpdateSession.mockResolvedValue({
        supabaseResponse: new Response(null, { status: 200 }),
        user: null,
      });
    });

    it('serves / directly — the intro redirect is IntroGate (client), not the proxy', async () => {
      const request = new NextRequest('http://localhost:3000/');
      const response = await proxy(request);

      expect(response.status).toBe(200);
    });

    it('serves /prelaunch directly (no ?intro normalization, no cookie stamping)', async () => {
      const request = new NextRequest('http://localhost:3000/prelaunch');
      const response = await proxy(request);

      expect(response.status).toBe(200);
    });

    it('does not gate deep routes', async () => {
      const request = new NextRequest('http://localhost:3000/about');
      const response = await proxy(request);

      expect(response.status).toBe(200);
    });
  });
});
