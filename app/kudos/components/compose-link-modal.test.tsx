import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ComposeLinkModal } from './compose-link-modal';

vi.mock('next-intl', () => ({
  useTranslations: () => (key: string) => key,
}));

vi.mock('./icons', () => ({
  LinkIcon: ({ className }: { className?: string }) => <svg className={className} data-testid="link-icon" />,
}));

describe('ComposeLinkModal', () => {
  const defaultProps = {
    onCancel: vi.fn(),
    onSave: vi.fn(),
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('rendering', () => {
    it('renders modal with title', () => {
      render(<ComposeLinkModal {...defaultProps} />);
      expect(screen.getByText('linkTitle')).toBeInTheDocument();
    });

    it('renders content label and input', () => {
      render(<ComposeLinkModal {...defaultProps} />);
      expect(screen.getByText('linkContent')).toBeInTheDocument();
      const inputs = screen.getAllByRole('textbox');
      expect(inputs.length).toBeGreaterThanOrEqual(1);
    });

    it('renders url label and input', () => {
      const { container } = render(<ComposeLinkModal {...defaultProps} />);
      expect(screen.getByText('linkUrl')).toBeInTheDocument();
      const urlInput = container.querySelector('input[type="url"]');
      expect(urlInput).toBeInTheDocument();
    });

    it('renders cancel and save buttons', () => {
      render(<ComposeLinkModal {...defaultProps} />);
      expect(screen.getByRole('button', { name: /cancel/ })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /linkSave/ })).toBeInTheDocument();
    });

    it('renders dialog role', () => {
      const { container } = render(<ComposeLinkModal {...defaultProps} />);
      expect(container.querySelector('[role="dialog"]')).toBeInTheDocument();
    });
  });

  describe('initial content', () => {
    it('prefills content input with initialContent prop', () => {
      render(
        <ComposeLinkModal {...defaultProps} initialContent="click here" />
      );
      const contentInputs = screen.getAllByRole('textbox');
      // First textbox is the content input
      expect((contentInputs[0] as HTMLInputElement).value).toBe('click here');
    });

    it('leaves content empty when initialContent not provided', () => {
      render(<ComposeLinkModal {...defaultProps} />);
      const contentInputs = screen.getAllByRole('textbox');
      expect((contentInputs[0] as HTMLInputElement).value).toBe('');
    });

    it('has empty url input by default', async () => {
      const { container } = render(<ComposeLinkModal {...defaultProps} />);
      const urlInput = container.querySelector('input[type="url"]') as HTMLInputElement;
      expect(urlInput.value).toBe('');
    });
  });

  describe('save button state', () => {
    it('save button is disabled when url is empty', () => {
      render(<ComposeLinkModal {...defaultProps} />);
      const saveButton = screen.getByRole('button', { name: /linkSave/ });
      expect(saveButton).toHaveAttribute('disabled');
    });

    it('save button is disabled when url is only whitespace', async () => {
      const { container } = render(<ComposeLinkModal {...defaultProps} />);
      const urlInput = container.querySelector('input[type="url"]') as HTMLInputElement;
      await userEvent.type(urlInput, '   ');
      const saveButton = screen.getByRole('button', { name: /linkSave/ });
      expect(saveButton).toHaveAttribute('disabled');
    });

    it('save button is enabled when url has value', async () => {
      const { container } = render(<ComposeLinkModal {...defaultProps} />);
      const urlInput = container.querySelector('input[type="url"]') as HTMLInputElement;
      await userEvent.type(urlInput, 'https://example.com');
      const saveButton = screen.getByRole('button', { name: /linkSave/ });
      expect(saveButton).not.toHaveAttribute('disabled');
    });
  });

  describe('form interactions', () => {
    it('content input updates state', async () => {
      const onSave = vi.fn();
      render(
        <ComposeLinkModal {...defaultProps} onSave={onSave} />
      );
      const contentInputs = screen.getAllByRole('textbox');
      const contentInput = contentInputs[0] as HTMLInputElement;

      await userEvent.clear(contentInput);
      await userEvent.type(contentInput, 'new content');

      expect(contentInput.value).toBe('new content');
    });

    it('url input updates state', async () => {
      const { container } = render(<ComposeLinkModal {...defaultProps} />);
      const urlInput = container.querySelector('input[type="url"]') as HTMLInputElement;

      await userEvent.type(urlInput, 'https://example.com');
      expect(urlInput.value).toBe('https://example.com');
    });

    it('pressing Enter in url input calls onSave', async () => {
      const onSave = vi.fn();
      const { container } = render(
        <ComposeLinkModal
          {...defaultProps}
          initialContent="test"
          onSave={onSave}
        />
      );
      const urlInput = container.querySelector('input[type="url"]') as HTMLInputElement;

      await userEvent.type(urlInput, 'https://example.com');
      fireEvent.keyDown(urlInput, { key: 'Enter' });

      expect(onSave).toHaveBeenCalledWith('test', 'https://example.com');
    });
  });

  describe('cancel interaction', () => {
    it('cancel button calls onCancel', async () => {
      const onCancel = vi.fn();
      render(<ComposeLinkModal {...defaultProps} onCancel={onCancel} />);
      const cancelButton = screen.getByRole('button', { name: /cancel/ });

      await userEvent.click(cancelButton);
      expect(onCancel).toHaveBeenCalled();
    });

    it('Escape key calls onCancel', async () => {
      const onCancel = vi.fn();
      render(<ComposeLinkModal {...defaultProps} onCancel={onCancel} />);

      fireEvent.keyDown(document, { key: 'Escape' });
      expect(onCancel).toHaveBeenCalled();
    });

    it('clicking backdrop calls onCancel', async () => {
      const onCancel = vi.fn();
      const { container } = render(
        <ComposeLinkModal {...defaultProps} onCancel={onCancel} />
      );
      const backdrop = container.querySelector('[role="dialog"]')?.parentElement as HTMLElement;

      const clickEvent = new MouseEvent('click', {
        bubbles: true,
        cancelable: true,
      });
      Object.defineProperty(clickEvent, 'target', {
        value: backdrop,
        enumerable: true,
      });
      Object.defineProperty(clickEvent, 'currentTarget', {
        value: backdrop,
        enumerable: true,
      });

      backdrop.dispatchEvent(clickEvent);
      expect(onCancel).toHaveBeenCalled();
    });
  });

  describe('save interaction', () => {
    it('clicking save button calls onSave with content and url', async () => {
      const onSave = vi.fn();
      const { container } = render(
        <ComposeLinkModal
          {...defaultProps}
          initialContent="click here"
          onSave={onSave}
        />
      );
      const urlInput = container.querySelector('input[type="url"]') as HTMLInputElement;
      const saveButton = screen.getByRole('button', { name: /linkSave/ });

      await userEvent.type(urlInput, 'https://example.com');
      await userEvent.click(saveButton);

      expect(onSave).toHaveBeenCalledWith('click here', 'https://example.com');
    });

    it('save is called with modified content', async () => {
      const onSave = vi.fn();
      const { container } = render(
        <ComposeLinkModal
          {...defaultProps}
          initialContent="original"
          onSave={onSave}
        />
      );
      const contentInputs = screen.getAllByRole('textbox');
      const contentInput = contentInputs[0] as HTMLInputElement;
      const urlInput = container.querySelector('input[type="url"]') as HTMLInputElement;
      const saveButton = screen.getByRole('button', { name: /linkSave/ });

      await userEvent.clear(contentInput);
      await userEvent.type(contentInput, 'modified');
      await userEvent.type(urlInput, 'https://example.com');
      await userEvent.click(saveButton);

      expect(onSave).toHaveBeenCalledWith('modified', 'https://example.com');
    });

    it('save does not fire when url is empty', async () => {
      const onSave = vi.fn();
      render(
        <ComposeLinkModal
          {...defaultProps}
          initialContent="content"
          onSave={onSave}
        />
      );
      const saveButton = screen.getByRole('button', { name: /linkSave/ });

      await userEvent.click(saveButton);
      expect(onSave).not.toHaveBeenCalled();
    });
  });

  describe('accessibility', () => {
    it('modal has aria-modal=true', () => {
      const { container } = render(<ComposeLinkModal {...defaultProps} />);
      const dialog = container.querySelector('[role="dialog"]');
      expect(dialog).toHaveAttribute('aria-modal', 'true');
    });

    it('modal has aria-label', () => {
      const { container } = render(<ComposeLinkModal {...defaultProps} />);
      const dialog = container.querySelector('[role="dialog"]');
      expect(dialog).toHaveAttribute('aria-label', 'linkTitle');
    });
  });

  describe('field constraints', () => {
    it('content input has maxLength=200', async () => {
      render(<ComposeLinkModal {...defaultProps} />);
      const contentInputs = screen.getAllByRole('textbox');
      const contentInput = contentInputs[0] as HTMLInputElement;
      expect(contentInput.maxLength).toBe(200);
    });

    it('url input has type=url', () => {
      const { container } = render(<ComposeLinkModal {...defaultProps} />);
      const urlInput = container.querySelector('input[type="url"]');
      expect(urlInput).toBeInTheDocument();
    });

    it('url input has placeholder', () => {
      const { container } = render(<ComposeLinkModal {...defaultProps} />);
      const urlInput = container.querySelector('input[type="url"]') as HTMLInputElement;
      expect(urlInput.placeholder).toBe('https://');
    });
  });
});
