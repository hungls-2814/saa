import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { isSupabaseConfigured } from './config';

describe('isSupabaseConfigured()', () => {
  const originalEnv = process.env;

  beforeEach(() => {
    process.env = { ...originalEnv };
  });

  afterEach(() => {
    process.env = originalEnv;
  });

  it('returns false when NEXT_PUBLIC_SUPABASE_URL is unset', () => {
    delete process.env.NEXT_PUBLIC_SUPABASE_URL;
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = 'some-key';
    expect(isSupabaseConfigured()).toBe(false);
  });

  it('returns false when NEXT_PUBLIC_SUPABASE_ANON_KEY is unset', () => {
    process.env.NEXT_PUBLIC_SUPABASE_URL = 'https://project.supabase.co';
    delete process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
    expect(isSupabaseConfigured()).toBe(false);
  });

  it('returns false when URL contains placeholder "your-project-ref"', () => {
    process.env.NEXT_PUBLIC_SUPABASE_URL = 'https://your-project-ref.supabase.co';
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = 'valid-key';
    expect(isSupabaseConfigured()).toBe(false);
  });

  it('returns false when ANON_KEY is the placeholder "your-anon-public-key"', () => {
    process.env.NEXT_PUBLIC_SUPABASE_URL = 'https://project.supabase.co';
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = 'your-anon-public-key';
    expect(isSupabaseConfigured()).toBe(false);
  });

  it('returns false when both env vars are missing', () => {
    delete process.env.NEXT_PUBLIC_SUPABASE_URL;
    delete process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
    expect(isSupabaseConfigured()).toBe(false);
  });

  it('returns true when both valid env vars are set', () => {
    process.env.NEXT_PUBLIC_SUPABASE_URL = 'https://myproject.supabase.co';
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9';
    expect(isSupabaseConfigured()).toBe(true);
  });

  it('returns false when URL is empty string', () => {
    process.env.NEXT_PUBLIC_SUPABASE_URL = '';
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = 'valid-key';
    expect(isSupabaseConfigured()).toBe(false);
  });

  it('returns false when ANON_KEY is empty string', () => {
    process.env.NEXT_PUBLIC_SUPABASE_URL = 'https://project.supabase.co';
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = '';
    expect(isSupabaseConfigured()).toBe(false);
  });

  it('returns true with realistic Supabase prod values', () => {
    process.env.NEXT_PUBLIC_SUPABASE_URL = 'https://abc123def456.supabase.co';
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY =
      'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImFiYzEyM2RlZjQ1NiIsInJvbGUiOiJhbm9uIiwiaWF0IjoxNjk5NzI4MDAwLCJleHAiOjE3MzEyNjQwMDB9.abcd1234';
    expect(isSupabaseConfigured()).toBe(true);
  });
});
