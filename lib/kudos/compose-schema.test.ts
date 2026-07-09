import { describe, it, expect } from 'vitest';
import {
  validateComposeInput,
  isSubmittable,
  validateImageFile,
  normalizeHashtagLabels,
  type ComposeKudosInput,
  MAX_HASHTAGS,
  MAX_IMAGES,
  MAX_IMAGE_BYTES,
} from './compose-schema';

describe('compose-schema: pure validation', () => {
  const makeInput = (overrides: Partial<ComposeKudosInput> = {}): ComposeKudosInput => ({
    receiverId: 'rcv-1',
    title: 'Great work',
    content: 'Really impressed',
    hashtagLabels: ['teamwork'],
    imageUrls: [],
    isAnonymous: false,
    anonymousAlias: '',
    ...overrides,
  });

  describe('validateComposeInput', () => {
    it('accepts a fully valid input', () => {
      const result = validateComposeInput(makeInput());
      expect(result).toEqual({ ok: true });
    });

    it('rejects empty receiverId', () => {
      const result = validateComposeInput(makeInput({ receiverId: '   ' }));
      expect(result).toEqual({ ok: false, errors: { receiver: 'required' } });
    });

    it('rejects empty title', () => {
      const result = validateComposeInput(makeInput({ title: '' }));
      expect(result).toEqual({ ok: false, errors: { title: 'required' } });
    });

    it('rejects empty content', () => {
      const result = validateComposeInput(makeInput({ content: '  \n  ' }));
      expect(result).toEqual({ ok: false, errors: { content: 'required' } });
    });

    it('rejects no hashtags', () => {
      const result = validateComposeInput(makeInput({ hashtagLabels: [] }));
      expect(result).toEqual({ ok: false, errors: { hashtags: 'required' } });
    });

    it('rejects only blank hashtags', () => {
      const result = validateComposeInput(makeInput({ hashtagLabels: ['  ', '', '\t'] }));
      expect(result).toEqual({ ok: false, errors: { hashtags: 'required' } });
    });

    it('rejects more than MAX_HASHTAGS', () => {
      const result = validateComposeInput(
        makeInput({ hashtagLabels: Array(MAX_HASHTAGS + 1).fill('tag') })
      );
      expect(result).toEqual({ ok: false, errors: { hashtags: 'tooMany' } });
    });

    it('accepts exactly MAX_HASHTAGS', () => {
      const result = validateComposeInput(
        makeInput({ hashtagLabels: Array(MAX_HASHTAGS).fill('tag').map((t, i) => `${t}${i}`) })
      );
      expect(result.ok).toBe(true);
    });

    it('rejects more than MAX_IMAGES', () => {
      const result = validateComposeInput(
        makeInput({ imageUrls: Array(MAX_IMAGES + 1).fill('url') })
      );
      expect(result).toEqual({ ok: false, errors: { images: 'tooMany' } });
    });

    it('accepts exactly MAX_IMAGES', () => {
      const result = validateComposeInput(
        makeInput({ imageUrls: Array(MAX_IMAGES).fill('https://example.com/img.png') })
      );
      expect(result.ok).toBe(true);
    });

    describe('self-recipient check', () => {
      it('rejects sender === receiver when selfId provided', () => {
        const result = validateComposeInput(makeInput({ receiverId: 'self-id' }), 'self-id');
        expect(result).toEqual({ ok: false, errors: { receiver: 'self' } });
      });

      it('allows different receiver when selfId provided', () => {
        const result = validateComposeInput(makeInput({ receiverId: 'other-id' }), 'self-id');
        expect(result.ok).toBe(true);
      });

      it('allows same receiver when selfId not provided', () => {
        const result = validateComposeInput(makeInput({ receiverId: 'any-id' }));
        expect(result.ok).toBe(true);
      });
    });

    describe('anonymous field', () => {
      it('rejects anonymous=true with blank alias', () => {
        const result = validateComposeInput(
          makeInput({ isAnonymous: true, anonymousAlias: '   ' })
        );
        expect(result).toEqual({ ok: false, errors: { alias: 'required' } });
      });

      it('accepts anonymous=true with non-blank alias', () => {
        const result = validateComposeInput(
          makeInput({ isAnonymous: true, anonymousAlias: 'Secret Friend' })
        );
        expect(result.ok).toBe(true);
      });

      it('ignores alias when anonymous=false', () => {
        const result = validateComposeInput(
          makeInput({ isAnonymous: false, anonymousAlias: '' })
        );
        expect(result.ok).toBe(true);
      });
    });

    it('collects multiple errors', () => {
      const result = validateComposeInput(
        makeInput({
          receiverId: '',
          title: '',
          hashtagLabels: [],
          isAnonymous: true,
          anonymousAlias: '',
        })
      );
      expect(result.ok).toBe(false);
      if (!result.ok) {
        expect(Object.keys(result.errors).sort()).toEqual(
          ['receiver', 'title', 'hashtags', 'alias'].sort()
        );
      }
    });
  });

  describe('isSubmittable', () => {
    it('returns true for valid input', () => {
      const result = isSubmittable(makeInput());
      expect(result).toBe(true);
    });

    it('returns false for invalid input', () => {
      const result = isSubmittable(makeInput({ title: '' }));
      expect(result).toBe(false);
    });

    it('respects selfId constraint', () => {
      expect(isSubmittable(makeInput({ receiverId: 'me' }), 'me')).toBe(false);
      expect(isSubmittable(makeInput({ receiverId: 'me' }), 'not-me')).toBe(true);
    });
  });

  describe('validateImageFile', () => {
    it('accepts jpg', () => {
      const result = validateImageFile({ type: 'image/jpeg', size: 1024 });
      expect(result).toEqual({ ok: true });
    });

    it('accepts png', () => {
      const result = validateImageFile({ type: 'image/png', size: 1024 });
      expect(result).toEqual({ ok: true });
    });

    it('accepts webp', () => {
      const result = validateImageFile({ type: 'image/webp', size: 1024 });
      expect(result).toEqual({ ok: true });
    });

    it('accepts gif', () => {
      const result = validateImageFile({ type: 'image/gif', size: 1024 });
      expect(result).toEqual({ ok: true });
    });

    it('rejects pdf', () => {
      const result = validateImageFile({ type: 'application/pdf', size: 1024 });
      expect(result).toEqual({ ok: false, code: 'type' });
    });

    it('rejects text', () => {
      const result = validateImageFile({ type: 'text/plain', size: 1024 });
      expect(result).toEqual({ ok: false, code: 'type' });
    });

    it('rejects video', () => {
      const result = validateImageFile({ type: 'video/mp4', size: 1024 });
      expect(result).toEqual({ ok: false, code: 'type' });
    });

    it('rejects oversized jpg', () => {
      const result = validateImageFile({ type: 'image/jpeg', size: MAX_IMAGE_BYTES + 1 });
      expect(result).toEqual({ ok: false, code: 'size' });
    });

    it('accepts exactly max size', () => {
      const result = validateImageFile({ type: 'image/png', size: MAX_IMAGE_BYTES });
      expect(result).toEqual({ ok: true });
    });

    it('accepts empty file (size 0)', () => {
      const result = validateImageFile({ type: 'image/jpeg', size: 0 });
      expect(result).toEqual({ ok: true });
    });
  });

  describe('normalizeHashtagLabels', () => {
    it('trims whitespace', () => {
      const result = normalizeHashtagLabels(['  teamwork  ', 'innovation']);
      expect(result).toEqual(['teamwork', 'innovation']);
    });

    it('drops blank labels', () => {
      const result = normalizeHashtagLabels(['teamwork', '  ', '', 'innovation']);
      expect(result).toEqual(['teamwork', 'innovation']);
    });

    it('dedupes case-insensitively (first spelling wins)', () => {
      const result = normalizeHashtagLabels(['Teamwork', 'teamwork', 'TEAMWORK']);
      expect(result).toEqual(['Teamwork']);
    });

    it('preserves original case for first occurrence', () => {
      const result = normalizeHashtagLabels(['CamelCase', 'camelcase']);
      expect(result).toEqual(['CamelCase']);
    });

    it('handles multi-word tags', () => {
      const result = normalizeHashtagLabels(['product launched', 'Product Launched']);
      expect(result).toEqual(['product launched']);
    });

    it('returns empty array for all-blank input', () => {
      const result = normalizeHashtagLabels(['', '  ', '\n']);
      expect(result).toEqual([]);
    });

    it('maintains order for unique tags', () => {
      const result = normalizeHashtagLabels(['z', 'a', 'm']);
      expect(result).toEqual(['z', 'a', 'm']);
    });
  });
});
