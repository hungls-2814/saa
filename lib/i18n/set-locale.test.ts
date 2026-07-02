/* eslint-disable @typescript-eslint/no-explicit-any */
import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock next/headers BEFORE importing setLocale
vi.mock('next/headers', () => {
  const mockCookieStore = {
    set: vi.fn(),
  };
  const mockCookies = vi.fn(async () => mockCookieStore);
  return { cookies: mockCookies };
});

import { setLocale } from './set-locale';
import { cookies } from 'next/headers';

describe('setLocale(locale)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('sets the NEXT_LOCALE cookie when locale is "vi"', async () => {
    await setLocale('vi');

    const mockCookieStore = await cookies();
    const mockSet = (mockCookieStore.set as any).mock;
    expect(mockSet.calls).toHaveLength(1);
    const call = mockSet.calls[0];
    expect(call[0]).toBe('NEXT_LOCALE');
    expect(call[1]).toBe('vi');
    expect(call[2]).toEqual({
      path: '/',
      maxAge: 60 * 60 * 24 * 365,
      sameSite: 'lax',
    });
  });

  it('sets the NEXT_LOCALE cookie when locale is "en"', async () => {
    await setLocale('en');

    const mockCookieStore = await cookies();
    const mockSet = (mockCookieStore.set as any).mock;
    expect(mockSet.calls).toHaveLength(1);
    const call = mockSet.calls[0];
    expect(call[0]).toBe('NEXT_LOCALE');
    expect(call[1]).toBe('en');
    expect(call[2]).toEqual({
      path: '/',
      maxAge: 60 * 60 * 24 * 365,
      sameSite: 'lax',
    });
  });

  it('does not set cookie when locale is invalid', async () => {
    await setLocale('fr' as any);

    const mockCookieStore = await cookies();
    const mockSet = (mockCookieStore.set as any).mock;
    expect(mockSet.calls).toHaveLength(0);
  });

  it('does not set cookie when locale is empty string', async () => {
    await setLocale('' as any);

    const mockCookieStore = await cookies();
    const mockSet = (mockCookieStore.set as any).mock;
    expect(mockSet.calls).toHaveLength(0);
  });

  it('does not set cookie when locale is null', async () => {
    await setLocale(null as any);

    const mockCookieStore = await cookies();
    const mockSet = (mockCookieStore.set as any).mock;
    expect(mockSet.calls).toHaveLength(0);
  });

  it('does not set cookie when locale is undefined', async () => {
    await setLocale(undefined as any);

    const mockCookieStore = await cookies();
    const mockSet = (mockCookieStore.set as any).mock;
    expect(mockSet.calls).toHaveLength(0);
  });

  it('sets cookie with correct maxAge (1 year in seconds)', async () => {
    await setLocale('vi');

    const mockCookieStore = await cookies();
    const mockSet = (mockCookieStore.set as any).mock;
    const call = mockSet.calls[0];
    const options = call[2];
    // 60 * 60 * 24 * 365 = 31536000 seconds
    expect(options.maxAge).toBe(31536000);
  });

  it('sets cookie with sameSite=lax for CSRF protection', async () => {
    await setLocale('en');

    const mockCookieStore = await cookies();
    const mockSet = (mockCookieStore.set as any).mock;
    const call = mockSet.calls[0];
    const options = call[2];
    expect(options.sameSite).toBe('lax');
  });

  it('sets cookie with path="/" for app-wide access', async () => {
    await setLocale('vi');

    const mockCookieStore = await cookies();
    const mockSet = (mockCookieStore.set as any).mock;
    const call = mockSet.calls[0];
    const options = call[2];
    expect(options.path).toBe('/');
  });

  it('rejects unsupported locale like "de"', async () => {
    await setLocale('de' as any);

    const mockCookieStore = await cookies();
    const mockSet = (mockCookieStore.set as any).mock;
    expect(mockSet.calls).toHaveLength(0);
  });

  it('rejects unsupported locale like "es"', async () => {
    await setLocale('es' as any);

    const mockCookieStore = await cookies();
    const mockSet = (mockCookieStore.set as any).mock;
    expect(mockSet.calls).toHaveLength(0);
  });

  it('rejects unsupported locale like "ja"', async () => {
    await setLocale('ja' as any);

    const mockCookieStore = await cookies();
    const mockSet = (mockCookieStore.set as any).mock;
    expect(mockSet.calls).toHaveLength(0);
  });
});
