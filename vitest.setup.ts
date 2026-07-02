import '@testing-library/jest-dom';
import { afterEach, vi } from 'vitest';
import { cleanup } from '@testing-library/react';

// Cleanup after each test
afterEach(() => {
  cleanup();
  vi.clearAllMocks();
});

// Mock next/navigation
vi.mock('next/navigation', () => ({
  useRouter: vi.fn(() => ({
    push: vi.fn(),
    replace: vi.fn(),
    back: vi.fn(),
    refresh: vi.fn(),
  })),
  useSearchParams: vi.fn(() => ({
    get: vi.fn(),
    getAll: vi.fn(),
    has: vi.fn(),
    entries: vi.fn(() => []),
  })),
  usePathname: vi.fn(() => '/'),
}));

// Mock next-intl
vi.mock('next-intl', () => ({
  useTranslations: vi.fn(() => (key: string) => key),
}));
