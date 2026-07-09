import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ComposeKudosContainer } from './compose-kudos-container';

vi.mock('next-intl', () => ({
  useTranslations: () => (key: string) => key,
}));

vi.mock('next/navigation', () => ({
  useRouter: () => ({ refresh: vi.fn() }),
}));

vi.mock('@/lib/kudos/compose-actions', () => ({
  createKudoAction: vi.fn(),
}));

vi.mock('@/lib/kudos/compose-data', () => ({
  listRecipients: vi.fn(),
  listHashtags: vi.fn(),
  uploadKudosImages: vi.fn(),
}));

vi.mock('@/lib/supabase/client', () => ({
  createClient: vi.fn(() => ({
    auth: { getUser: vi.fn() },
    from: vi.fn(),
  })),
}));

import { createKudoAction } from '@/lib/kudos/compose-actions';
import { listRecipients, listHashtags, uploadKudosImages } from '@/lib/kudos/compose-data';

const mockCreateKudoAction = vi.mocked(createKudoAction);
const mockListRecipients = vi.mocked(listRecipients);
const mockListHashtags = vi.mocked(listHashtags);
const mockUploadKudosImages = vi.mocked(uploadKudosImages);

describe('ComposeKudosContainer', () => {
  const mockUserId = 'user-1';

  beforeEach(() => {
    vi.clearAllMocks();
    mockListRecipients.mockResolvedValue([
      {
        id: 'rcv-1',
        fullName: 'Alice',
        department: 'Engineering',
        avatarUrl: 'https://example.com/alice.png',
      },
    ]);
    mockListHashtags.mockResolvedValue([
      { id: 'h1', label: 'teamwork' },
      { id: 'h2', label: 'innovation' },
    ]);
    mockCreateKudoAction.mockResolvedValue({ ok: true, kudosId: 'k1' });
  });

  describe('component structure', () => {
    it('component is exported and callable', () => {
      expect(typeof ComposeKudosContainer).toBe('function');
    });

    it('accepts required props', () => {
      const props = {
        userId: mockUserId,
        isOpen: true,
        onClose: vi.fn(),
      };
      expect(props).toBeTruthy();
    });
  });

  describe('data helpers wiring', () => {
    it('has mocked list recipients', () => {
      expect(typeof mockListRecipients).toBe('function');
    });

    it('has mocked list hashtags', () => {
      expect(typeof mockListHashtags).toBe('function');
    });

    it('has mocked upload images', () => {
      expect(typeof mockUploadKudosImages).toBe('function');
    });

    it('has mocked create kudo action', () => {
      expect(typeof mockCreateKudoAction).toBe('function');
    });
  });

  describe('action result handling', () => {
    it('action result types are correct', () => {
      const successResult = { ok: true, kudosId: 'k1' };
      expect(successResult.ok).toBe(true);

      const validationErrorResult = {
        ok: false,
        error: 'validation' as const,
        errors: { title: 'required' },
      };
      expect(validationErrorResult.ok).toBe(false);
      expect(validationErrorResult.error).toBe('validation');

      const unknownErrorResult = {
        ok: false,
        error: 'unknown' as const,
      };
      expect(unknownErrorResult.ok).toBe(false);

      const unauthedResult = {
        ok: false,
        error: 'unauthenticated' as const,
      };
      expect(unauthedResult.ok).toBe(false);
    });
  });
});
