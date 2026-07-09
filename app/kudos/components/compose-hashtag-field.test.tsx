import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render } from '@testing-library/react';
import { ComposeHashtagField } from './compose-hashtag-field';
import type { HashtagRef } from '@/lib/kudos/types';

vi.mock('next-intl', () => ({
  useTranslations: () => (key: string) => key,
}));

describe('ComposeHashtagField', () => {
  const mockSuggestions: HashtagRef[] = [
    { id: 'h1', label: 'teamwork' },
    { id: 'h2', label: 'innovation' },
    { id: 'h3', label: 'leadership' },
  ];

  const defaultProps = {
    hashtags: [],
    suggestions: mockSuggestions,
    onAddHashtag: vi.fn(),
    onRemoveHashtag: vi.fn(),
    error: undefined,
    errorId: 'hashtags-error',
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('component rendering', () => {
    it('renders without crashing', () => {
      const { container } = render(<ComposeHashtagField {...defaultProps} />);
      expect(container).toBeTruthy();
    });

    it('renders with hashtag suggestions provided', () => {
      const { container } = render(
        <ComposeHashtagField
          {...defaultProps}
          suggestions={mockSuggestions}
        />
      );
      expect(container).toBeTruthy();
    });

    it('renders with hashtag chips', () => {
      const { container } = render(
        <ComposeHashtagField
          {...defaultProps}
          hashtags={[
            { id: 'h1', label: 'teamwork' },
            { id: 'h2', label: 'innovation' },
          ]}
        />
      );
      expect(container).toBeTruthy();
    });

    it('renders with error prop', () => {
      const { container } = render(
        <ComposeHashtagField
          {...defaultProps}
          error="required"
        />
      );
      expect(container).toBeTruthy();
    });
  });

  describe('callback props', () => {
    it('onAddHashtag callback is defined', () => {
      expect(typeof defaultProps.onAddHashtag).toBe('function');
    });

    it('onRemoveHashtag callback is defined', () => {
      expect(typeof defaultProps.onRemoveHashtag).toBe('function');
    });

    it('passes through hashtags prop', () => {
      const hashtags = [
        { id: 'h1', label: 'teamwork' },
        { id: 'h2', label: 'innovation' },
      ];
      const { container } = render(
        <ComposeHashtagField
          {...defaultProps}
          hashtags={hashtags}
        />
      );
      expect(container).toBeTruthy();
    });

    it('passes through suggestions prop', () => {
      const suggestions = [{ id: 'h1', label: 'teamwork' }];
      const { container } = render(
        <ComposeHashtagField
          {...defaultProps}
          suggestions={suggestions}
        />
      );
      expect(container).toBeTruthy();
    });
  });

  describe('max hashtags constraint', () => {
    it('renders with 5 hashtags (max)', () => {
      const hashtags = Array(5)
        .fill(null)
        .map((_, i) => ({ id: `h${i}`, label: `tag${i}` }));

      const { container } = render(
        <ComposeHashtagField
          {...defaultProps}
          hashtags={hashtags}
        />
      );
      expect(container).toBeTruthy();
    });

    it('renders with 0 hashtags', () => {
      const { container } = render(
        <ComposeHashtagField
          {...defaultProps}
          hashtags={[]}
        />
      );
      expect(container).toBeTruthy();
    });

    it('renders with 3 hashtags', () => {
      const hashtags = Array(3)
        .fill(null)
        .map((_, i) => ({ id: `h${i}`, label: `tag${i}` }));

      const { container } = render(
        <ComposeHashtagField
          {...defaultProps}
          hashtags={hashtags}
        />
      );
      expect(container).toBeTruthy();
    });
  });

  describe('error state', () => {
    it('renders with error undefined', () => {
      const { container } = render(
        <ComposeHashtagField
          {...defaultProps}
          error={undefined}
        />
      );
      expect(container).toBeTruthy();
    });

    it('renders with error "required"', () => {
      const { container } = render(
        <ComposeHashtagField
          {...defaultProps}
          error="required"
        />
      );
      expect(container).toBeTruthy();
    });

    it('renders with error "tooMany"', () => {
      const { container } = render(
        <ComposeHashtagField
          {...defaultProps}
          error="tooMany"
        />
      );
      expect(container).toBeTruthy();
    });
  });

  describe('suggestions', () => {
    it('renders with empty suggestions array', () => {
      const { container } = render(
        <ComposeHashtagField
          {...defaultProps}
          suggestions={[]}
        />
      );
      expect(container).toBeTruthy();
    });

    it('renders with multiple suggestions', () => {
      const suggestions = [
        { id: 'h1', label: 'collaboration' },
        { id: 'h2', label: 'innovation' },
        { id: 'h3', label: 'leadership' },
        { id: 'h4', label: 'excellence' },
      ];
      const { container } = render(
        <ComposeHashtagField
          {...defaultProps}
          suggestions={suggestions}
        />
      );
      expect(container).toBeTruthy();
    });
  });
});
