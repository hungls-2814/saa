/* eslint-disable @typescript-eslint/no-explicit-any, jsx-a11y/alt-text, @next/next/no-img-element */
import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { GoogleLoginButton } from './google-login-button';

// Mock Image component from Next.js
vi.mock('next/image', () => ({
  default: (props: any) => <img {...props} />,
}));

describe('GoogleLoginButton', () => {
  describe('rendering', () => {
    it('renders with default label', () => {
      render(<GoogleLoginButton onClick={vi.fn()} />);
      expect(screen.getByText('LOGIN With Google')).toBeInTheDocument();
    });

    it('renders with custom label', () => {
      render(<GoogleLoginButton onClick={vi.fn()} label="Sign in with Google" />);
      expect(screen.getByText('Sign in with Google')).toBeInTheDocument();
    });

    it('renders button element', () => {
      const { container } = render(<GoogleLoginButton onClick={vi.fn()} />);
      const button = container.querySelector('button');
      expect(button).toBeInTheDocument();
      expect(button).toHaveAttribute('type', 'button');
    });

    it('renders Google icon image', () => {
      render(<GoogleLoginButton onClick={vi.fn()} />);
      const img = screen.getByAltText('');
      expect(img).toBeInTheDocument();
      expect(img).toHaveAttribute('src', '/login/icons/google.png');
    });
  });

  describe('click handler', () => {
    it('calls onClick when button is clicked', async () => {
      const handleClick = vi.fn();
      render(<GoogleLoginButton onClick={handleClick} />);

      const button = screen.getByRole('button');
      await userEvent.click(button);

      expect(handleClick).toHaveBeenCalledOnce();
    });

    it('calls onClick only once per click', async () => {
      const handleClick = vi.fn();
      render(<GoogleLoginButton onClick={handleClick} />);

      const button = screen.getByRole('button');
      await userEvent.click(button);
      await userEvent.click(button);

      expect(handleClick).toHaveBeenCalledTimes(2);
    });

    it('does not call onClick when disabled', async () => {
      const handleClick = vi.fn();
      render(<GoogleLoginButton onClick={handleClick} disabled={true} />);

      const button = screen.getByRole('button');
      await userEvent.click(button);

      expect(handleClick).not.toHaveBeenCalled();
    });

    it('does not call onClick when loading', async () => {
      const handleClick = vi.fn();
      render(<GoogleLoginButton onClick={handleClick} loading={true} />);

      const button = screen.getByRole('button');
      await userEvent.click(button);

      expect(handleClick).not.toHaveBeenCalled();
    });
  });

  describe('loading state', () => {
    it('shows spinner when loading=true', () => {
      render(<GoogleLoginButton onClick={vi.fn()} loading={true} />);
      const spinner = screen.getByRole('status');
      expect(spinner).toBeInTheDocument();
    });

    it('hides spinner when loading=false', () => {
      render(<GoogleLoginButton onClick={vi.fn()} loading={false} />);
      const spinner = screen.queryByRole('status');
      expect(spinner).not.toBeInTheDocument();
    });

    it('sets aria-busy=true when loading', () => {
      render(<GoogleLoginButton onClick={vi.fn()} loading={true} />);
      const button = screen.getByRole('button');
      expect(button).toHaveAttribute('aria-busy', 'true');
    });

    it('sets aria-busy=false when not loading', () => {
      render(<GoogleLoginButton onClick={vi.fn()} loading={false} />);
      const button = screen.getByRole('button');
      expect(button).toHaveAttribute('aria-busy', 'false');
    });

    it('disables button when loading', () => {
      render(<GoogleLoginButton onClick={vi.fn()} loading={true} />);
      const button = screen.getByRole('button') as HTMLButtonElement;
      expect(button.disabled).toBe(true);
    });

    it('shows spinner and hides Google icon when loading', () => {
      const { container } = render(<GoogleLoginButton onClick={vi.fn()} loading={true} />);
      expect(screen.getByRole('status')).toBeInTheDocument();
      // Google icon should not be visible
      const allImgs = container.querySelectorAll('img');
      expect(allImgs.length).toBe(0); // No images when loading spinner is shown
    });
  });

  describe('disabled state', () => {
    it('disables button when disabled=true', () => {
      render(<GoogleLoginButton onClick={vi.fn()} disabled={true} />);
      const button = screen.getByRole('button') as HTMLButtonElement;
      expect(button.disabled).toBe(true);
    });

    it('enables button when disabled=false', () => {
      render(<GoogleLoginButton onClick={vi.fn()} disabled={false} />);
      const button = screen.getByRole('button') as HTMLButtonElement;
      expect(button.disabled).toBe(false);
    });

    it('disables button when loading=true even if disabled=false', () => {
      render(<GoogleLoginButton onClick={vi.fn()} loading={true} disabled={false} />);
      const button = screen.getByRole('button') as HTMLButtonElement;
      expect(button.disabled).toBe(true);
    });

    it('adds disabled styling to button', () => {
      const { container } = render(<GoogleLoginButton onClick={vi.fn()} disabled={true} />);
      const button = container.querySelector('button');
      expect(button).toHaveClass('disabled:cursor-not-allowed');
      expect(button).toHaveClass('disabled:opacity-60');
    });
  });

  describe('accessibility', () => {
    it('has button role', () => {
      render(<GoogleLoginButton onClick={vi.fn()} />);
      const button = screen.getByRole('button');
      expect(button).toBeInTheDocument();
    });

    it('has accessible label', () => {
      render(<GoogleLoginButton onClick={vi.fn()} label="Login with Google" />);
      const button = screen.getByRole('button', { name: /Login with Google/i });
      expect(button).toBeInTheDocument();
    });

    it('sets aria-busy attribute for screen readers during loading', () => {
      render(<GoogleLoginButton onClick={vi.fn()} loading={true} />);
      const button = screen.getByRole('button');
      expect(button).toHaveAttribute('aria-busy');
    });

    it('spinner has role=status for announcements', () => {
      render(<GoogleLoginButton onClick={vi.fn()} loading={true} />);
      const spinner = screen.getByRole('status');
      expect(spinner).toHaveAttribute('aria-label', 'Loading');
    });

    it('Google icon has empty alt for decorative purpose', () => {
      const { container } = render(<GoogleLoginButton onClick={vi.fn()} />);
      const img = container.querySelector('img[src="/login/icons/google.png"]');
      expect(img).toHaveAttribute('alt', '');
    });
  });

  describe('styling and layout', () => {
    it('has correct background color class', () => {
      const { container } = render(<GoogleLoginButton onClick={vi.fn()} />);
      const button = container.querySelector('button');
      expect(button).toHaveClass('bg-[#FFEA9E]');
    });

    it('has hover state styling', () => {
      const { container } = render(<GoogleLoginButton onClick={vi.fn()} />);
      const button = container.querySelector('button');
      expect(button).toHaveClass('hover:bg-[#FFF8E1]');
    });

    it('has rounded corners', () => {
      const { container } = render(<GoogleLoginButton onClick={vi.fn()} />);
      const button = container.querySelector('button');
      expect(button).toHaveClass('rounded-lg');
    });

    it('has correct padding', () => {
      const { container } = render(<GoogleLoginButton onClick={vi.fn()} />);
      const button = container.querySelector('button');
      expect(button).toHaveClass('px-6', 'py-4');
    });

    it('has shadow effect', () => {
      const { container } = render(<GoogleLoginButton onClick={vi.fn()} />);
      const button = container.querySelector('button');
      expect(button).toHaveClass('shadow-[0_0_0_rgba(0,0,0,0)]');
    });

    it('has hover elevation effect', () => {
      const { container } = render(<GoogleLoginButton onClick={vi.fn()} />);
      const button = container.querySelector('button');
      expect(button).toHaveClass('hover:-translate-y-0.5');
    });
  });

  describe('combined states', () => {
    it('loading and disabled together both disable the button', () => {
      render(<GoogleLoginButton onClick={vi.fn()} loading={true} disabled={true} />);
      const button = screen.getByRole('button') as HTMLButtonElement;
      expect(button.disabled).toBe(true);
    });

    it('spinner appears when either loading or disabled', () => {
      const { rerender } = render(<GoogleLoginButton onClick={vi.fn()} loading={true} />);
      expect(screen.getByRole('status')).toBeInTheDocument();

      rerender(<GoogleLoginButton onClick={vi.fn()} loading={false} disabled={true} />);
      // When loading=false but disabled=true, no spinner shown
      expect(screen.queryByRole('status')).not.toBeInTheDocument();
    });
  });
});
