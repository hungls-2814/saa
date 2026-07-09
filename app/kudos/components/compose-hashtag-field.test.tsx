import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
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

  describe('dropdown interaction', () => {
    it('opens dropdown on button click', async () => {
      const { getByRole, queryByRole } = render(<ComposeHashtagField {...defaultProps} />);
      const triggerButton = getByRole('button', { name: /hashtagAdd/ });

      // Dropdown should not be in DOM initially
      expect(queryByRole('listbox')).not.toBeInTheDocument();

      await userEvent.click(triggerButton);
      // After click, listbox should be visible
      const listbox = getByRole('listbox');
      expect(listbox).toBeInTheDocument();
    });

    it('closes dropdown when button is clicked again', async () => {
      const { getByRole, queryByRole } = render(<ComposeHashtagField {...defaultProps} />);
      const triggerButton = getByRole('button', { name: /hashtagAdd/ });

      await userEvent.click(triggerButton);
      expect(getByRole('listbox')).toBeInTheDocument();

      await userEvent.click(triggerButton);
      // Listbox removed from DOM when closed
      expect(queryByRole('listbox')).not.toBeInTheDocument();
    });

    it('closes dropdown on Escape key', async () => {
      const { getByRole, queryByRole } = render(<ComposeHashtagField {...defaultProps} />);
      const triggerButton = getByRole('button', { name: /hashtagAdd/ });

      await userEvent.click(triggerButton);
      expect(getByRole('listbox')).toBeInTheDocument();

      fireEvent.keyDown(document, { key: 'Escape' });
      expect(queryByRole('listbox')).not.toBeInTheDocument();
    });

    it('closes dropdown when clicking outside', async () => {
      const { getByRole, queryByRole } = render(
        <div>
          <ComposeHashtagField {...defaultProps} />
          <div data-testid="outside">Outside element</div>
        </div>
      );
      const triggerButton = getByRole('button', { name: /hashtagAdd/ });

      await userEvent.click(triggerButton);
      expect(getByRole('listbox')).toBeInTheDocument();

      const outside = screen.getByTestId('outside');
      fireEvent.mouseDown(outside);

      expect(queryByRole('listbox')).not.toBeInTheDocument();
    });
  });

  describe('selecting hashtags', () => {
    it('calls onAddHashtag when clicking unselected row', async () => {
      const onAddHashtag = vi.fn();
      const { getByRole } = render(
        <ComposeHashtagField
          {...defaultProps}
          onAddHashtag={onAddHashtag}
        />
      );

      const triggerButton = getByRole('button', { name: /hashtagAdd/ });
      await userEvent.click(triggerButton);

      const options = screen.getAllByRole('option');
      await userEvent.click(options[0]);

      expect(onAddHashtag).toHaveBeenCalledWith('teamwork');
    });

    it('calls onRemoveHashtag when clicking selected row', async () => {
      const onRemoveHashtag = vi.fn();
      const { getByRole } = render(
        <ComposeHashtagField
          {...defaultProps}
          hashtags={[{ id: 'h1', label: 'teamwork' }]}
          onRemoveHashtag={onRemoveHashtag}
        />
      );

      const triggerButton = getByRole('button', { name: /hashtagAdd/ });
      await userEvent.click(triggerButton);

      const options = screen.getAllByRole('option');
      const selectedOption = options.find(opt => opt.getAttribute('aria-selected') === 'true');
      expect(selectedOption).toBeInTheDocument();

      await userEvent.click(selectedOption!);
      expect(onRemoveHashtag).toHaveBeenCalledWith('h1');
    });

    it('marks selected rows with aria-selected=true', async () => {
      const { getByRole } = render(
        <ComposeHashtagField
          {...defaultProps}
          hashtags={[{ id: 'h1', label: 'teamwork' }]}
        />
      );

      const triggerButton = getByRole('button', { name: /hashtagAdd/ });
      await userEvent.click(triggerButton);

      const options = screen.getAllByRole('option');
      expect(options[0]).toHaveAttribute('aria-selected', 'true');
      expect(options[1]).toHaveAttribute('aria-selected', 'false');
    });

    it('shows check icon for selected rows', async () => {
      const { getByRole } = render(
        <ComposeHashtagField
          {...defaultProps}
          hashtags={[{ id: 'h1', label: 'teamwork' }]}
        />
      );

      const triggerButton = getByRole('button', { name: /hashtagAdd/ });
      await userEvent.click(triggerButton);

      const options = screen.getAllByRole('option');
      const selectedOption = options[0];

      // Check icon should be present in selected option
      const svgs = selectedOption.querySelectorAll('svg');
      expect(svgs.length).toBeGreaterThan(0);
    });

    it('disables unselected rows when at max (5 hashtags)', async () => {
      const extraSuggestions = Array(8)
        .fill(null)
        .map((_, i) => ({ id: `s${i}`, label: `suggestion${i}` }));

      // Create hashtags that match the first 5 suggestions
      const maxHashtags = Array(5)
        .fill(null)
        .map((_, i) => ({ id: `s${i}`, label: `suggestion${i}` }));

      const { getByRole } = render(
        <ComposeHashtagField
          {...defaultProps}
          hashtags={maxHashtags}
          suggestions={extraSuggestions}
        />
      );

      const triggerButton = getByRole('button', { name: /hashtagAdd/ });
      await userEvent.click(triggerButton);

      const options = screen.getAllByRole('option');
      // All 8 suggestions are in the options; first 5 are selected, last 3 are unselected+disabled
      const selectedOptions = options.filter(opt => opt.getAttribute('aria-selected') === 'true');
      const disabledOptions = options.filter(opt => opt.hasAttribute('disabled'));

      expect(selectedOptions.length).toBe(5);
      expect(disabledOptions.length).toBeGreaterThan(0);
    });

    it('allows selecting when below max', async () => {
      const onAddHashtag = vi.fn();
      const hashtags = Array(4)
        .fill(null)
        .map((_, i) => ({ id: `h${i}`, label: `tag${i}` }));

      const { getByRole } = render(
        <ComposeHashtagField
          {...defaultProps}
          hashtags={hashtags}
          onAddHashtag={onAddHashtag}
        />
      );

      const triggerButton = getByRole('button', { name: /hashtagAdd/ });
      await userEvent.click(triggerButton);

      const options = screen.getAllByRole('option');
      // Should have unselected options that are NOT disabled
      const unselected = options.find(opt => opt.getAttribute('aria-selected') === 'false');
      expect(unselected).not.toHaveAttribute('disabled');
    });
  });

  describe('chips rendering', () => {
    it('renders selected hashtags as removable chips', async () => {
      render(
        <ComposeHashtagField
          {...defaultProps}
          hashtags={[
            { id: 'h1', label: 'teamwork' },
            { id: 'h2', label: 'innovation' },
          ]}
        />
      );

      // Check that chip text is visible
      expect(screen.getByText('#teamwork')).toBeInTheDocument();
      expect(screen.getByText('#innovation')).toBeInTheDocument();
    });

    it('calls onRemoveHashtag when clicking chip close button', async () => {
      const onRemoveHashtag = vi.fn();
      const { getByRole } = render(
        <ComposeHashtagField
          {...defaultProps}
          hashtags={[{ id: 'h1', label: 'teamwork' }]}
          onRemoveHashtag={onRemoveHashtag}
        />
      );

      const removeButton = getByRole('button', { name: /hashtagLabel teamwork/ });
      await userEvent.click(removeButton);

      expect(onRemoveHashtag).toHaveBeenCalledWith('h1');
    });

    it('renders multiple chips with individual close buttons', async () => {
      const onRemoveHashtag = vi.fn();
      const { getAllByRole } = render(
        <ComposeHashtagField
          {...defaultProps}
          hashtags={[
            { id: 'h1', label: 'teamwork' },
            { id: 'h2', label: 'innovation' },
          ]}
          onRemoveHashtag={onRemoveHashtag}
        />
      );

      const removeButtons = getAllByRole('button', { name: /hashtagLabel/ });
      expect(removeButtons).toHaveLength(2);

      await userEvent.click(removeButtons[0]);
      expect(onRemoveHashtag).toHaveBeenCalledWith('h1');
    });
  });

  describe('empty state', () => {
    it('shows empty message when no suggestions', async () => {
      const { getByRole } = render(
        <ComposeHashtagField
          {...defaultProps}
          suggestions={[]}
        />
      );

      const triggerButton = getByRole('button', { name: /hashtagAdd/ });
      await userEvent.click(triggerButton);

      expect(screen.getByText('hashtagEmpty')).toBeInTheDocument();
    });
  });

  describe('case-insensitive matching', () => {
    it('matches hashtag case-insensitively', async () => {
      render(
        <ComposeHashtagField
          {...defaultProps}
          hashtags={[{ id: 'h1', label: 'TeamWork' }]}
          suggestions={[{ id: 'h1', label: 'teamwork' }]}
        />
      );

      const triggerButton = screen.getByRole('button', { name: /hashtagAdd/ });
      await userEvent.click(triggerButton);

      const option = screen.getByRole('option');
      expect(option).toHaveAttribute('aria-selected', 'true');
    });
  });
});
