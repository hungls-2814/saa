/* eslint-disable @typescript-eslint/no-explicit-any */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import { LoginToast } from './login-toast';

// Mock next/navigation - already mocked in setup but we need to control it
const mockUseSearchParams = vi.fn();
const mockUseRouter = vi.fn();

vi.mock('next/navigation', () => ({
  useRouter: () => mockUseRouter(),
  useSearchParams: () => mockUseSearchParams(),
  usePathname: vi.fn(() => '/login'),
}));

vi.mock('next-intl', () => ({
  useTranslations: (namespace: string) => {
    return (translationKey: string) => {
      const translations: Record<string, Record<string, string>> = {
        Login: {
          errorToast: 'Authentication failed. Please try again.',
        },
      };
      return translations[namespace]?.[translationKey] || translationKey;
    };
  },
}));

describe('LoginToast', () => {
  let mockRouterReplace: any;

  beforeEach(() => {
    vi.clearAllMocks();
    mockRouterReplace = vi.fn();
    mockUseRouter.mockReturnValue({
      replace: mockRouterReplace,
      push: vi.fn(),
      back: vi.fn(),
      refresh: vi.fn(),
    });
  });

  describe('when error param is present', () => {
    beforeEach(() => {
      mockUseSearchParams.mockReturnValue({
        get: (key: string) => {
          if (key === 'error') return 'auth_callback_failed';
          return null;
        },
        getAll: vi.fn(() => []),
        has: vi.fn(),
        entries: vi.fn(() => []),
      });
    });

    it('renders error toast when ?error=auth_callback_failed', () => {
      render(<LoginToast />);
      expect(screen.getByRole('alert')).toBeInTheDocument();
    });

    it('displays error message from translation', () => {
      render(<LoginToast />);
      expect(
        screen.getByText('Authentication failed. Please try again.')
      ).toBeInTheDocument();
    });

    it('removes error param from URL on mount', () => {
      render(<LoginToast />);
      expect(mockRouterReplace).toHaveBeenCalledWith('/login');
    });

    it('shows dismiss button', () => {
      render(<LoginToast />);
      expect(screen.getByLabelText('Close')).toBeInTheDocument();
    });

    it('sets a timer for 5 second auto-dismiss', async () => {
      // Just verify that a timer is set (not checking exact timing due to React act warnings)
      const spy = vi.spyOn(window, 'setTimeout');
      render(<LoginToast />);

      expect(spy).toHaveBeenCalled();
      spy.mockRestore();
    });

    it('clears timeout on unmount', () => {
      const clearSpy = vi.spyOn(window, 'clearTimeout');
      const { unmount } = render(<LoginToast />);

      unmount();
      // After unmount, timers should be cleared
      expect(clearSpy).toHaveBeenCalled();
      clearSpy.mockRestore();
    });
  });

  describe('when error param is not present', () => {
    beforeEach(() => {
      mockUseSearchParams.mockReturnValue({
        get: () => null,
        getAll: vi.fn(() => []),
        has: vi.fn(),
        entries: vi.fn(() => []),
      });
    });

    it('does not render toast when error param is missing', () => {
      render(<LoginToast />);
      expect(screen.queryByRole('alert')).not.toBeInTheDocument();
    });

    it('does not call router.replace when no error param', () => {
      render(<LoginToast />);
      expect(mockRouterReplace).not.toHaveBeenCalled();
    });

    it('does not render error message', () => {
      render(<LoginToast />);
      expect(
        screen.queryByText('Authentication failed. Please try again.')
      ).not.toBeInTheDocument();
    });
  });

  describe('when error param is different value', () => {
    beforeEach(() => {
      mockUseSearchParams.mockReturnValue({
        get: (key: string) => {
          if (key === 'error') return 'different_error';
          return null;
        },
        getAll: vi.fn(() => []),
        has: vi.fn(),
        entries: vi.fn(() => []),
      });
    });

    it('does not render toast for unrelated error param', () => {
      render(<LoginToast />);
      expect(screen.queryByRole('alert')).not.toBeInTheDocument();
    });

    it('does not call router.replace for unrelated errors', () => {
      render(<LoginToast />);
      expect(mockRouterReplace).not.toHaveBeenCalled();
    });
  });

  describe('dismiss button', () => {
    beforeEach(() => {
      mockUseSearchParams.mockReturnValue({
        get: (key: string) => {
          if (key === 'error') return 'auth_callback_failed';
          return null;
        },
        getAll: vi.fn(() => []),
        has: vi.fn(),
        entries: vi.fn(() => []),
      });
    });

    it('shows dismiss button when toast is visible', () => {
      render(<LoginToast />);
      expect(screen.getByLabelText('Close')).toBeInTheDocument();
    });

    it('dismiss button is clickable', () => {
      render(<LoginToast />);
      const dismissBtn = screen.getByLabelText('Close') as HTMLButtonElement;
      expect(dismissBtn.disabled).toBe(false);
    });
  });

  describe('auto-dismiss timing', () => {
    beforeEach(() => {
      mockUseSearchParams.mockReturnValue({
        get: (key: string) => {
          if (key === 'error') return 'auth_callback_failed';
          return null;
        },
        getAll: vi.fn(() => []),
        has: vi.fn(),
        entries: vi.fn(() => []),
      });
    });

    it('sets a timeout for auto-dismiss on mount', () => {
      const spy = vi.spyOn(window, 'setTimeout');
      render(<LoginToast />);

      // Should have called setTimeout
      expect(spy).toHaveBeenCalled();
      spy.mockRestore();
    });

    it('passes 5000ms to setTimeout', () => {
      const spy = vi.spyOn(window, 'setTimeout');
      render(<LoginToast />);

      // Check that 5000 was passed as the timeout delay
      const calls = spy.mock.calls;
      const timeoutCalls = calls.filter((call) => call[1] === 5000);
      expect(timeoutCalls.length).toBeGreaterThan(0);
      spy.mockRestore();
    });

    it('clears the timeout when the component unmounts', () => {
      const clearSpy = vi.spyOn(window, 'clearTimeout');
      const { unmount } = render(<LoginToast />);

      unmount();

      // Should have called clearTimeout when unmounting
      expect(clearSpy).toHaveBeenCalled();
      clearSpy.mockRestore();
    });
  });

  describe('URL cleaning', () => {
    beforeEach(() => {
      mockUseSearchParams.mockReturnValue({
        get: (key: string) => {
          if (key === 'error') return 'auth_callback_failed';
          return null;
        },
        getAll: vi.fn(() => []),
        has: vi.fn(),
        entries: vi.fn(() => []),
      });
    });

    it('calls router.replace with /login path', () => {
      render(<LoginToast />);
      expect(mockRouterReplace).toHaveBeenCalledWith('/login');
    });

    it('removes error param from history', () => {
      render(<LoginToast />);
      // router.replace should have been called to clean the URL
      expect(mockRouterReplace).toHaveBeenCalled();
      // Verify it's replacing with clean path
      expect(mockRouterReplace.mock.calls[0][0]).not.toContain('error');
    });

    it('does external sync via router', () => {
      render(<LoginToast />);
      // Using router (external sync) not direct URL manipulation
      expect(mockRouterReplace).toHaveBeenCalledWith('/login');
    });
  });

  describe('accessibility', () => {
    beforeEach(() => {
      mockUseSearchParams.mockReturnValue({
        get: (key: string) => {
          if (key === 'error') return 'auth_callback_failed';
          return null;
        },
        getAll: vi.fn(() => []),
        has: vi.fn(),
        entries: vi.fn(() => []),
      });
    });

    it('has role="alert" for announcements', () => {
      render(<LoginToast />);
      const alert = screen.getByRole('alert');
      expect(alert).toBeInTheDocument();
    });

    it('dismiss button has proper aria-label', () => {
      render(<LoginToast />);
      const dismissBtn = screen.getByLabelText('Close');
      expect(dismissBtn).toBeInTheDocument();
    });

    it('renders as fixed position overlay', () => {
      const { container } = render(<LoginToast />);
      const toast = container.querySelector('[role="alert"]');
      expect(toast).toHaveClass('fixed');
    });

    it('renders alert with role="alert" for screen readers', () => {
      mockUseSearchParams.mockReturnValue({
        get: (key: string) => {
          if (key === 'error') return 'auth_callback_failed';
          return null;
        },
        getAll: vi.fn(() => []),
        has: vi.fn(),
        entries: vi.fn(() => []),
      });

      render(<LoginToast />);
      expect(screen.getByRole('alert')).toBeInTheDocument();
    });
  });

  describe('edge cases', () => {
    it('handles multiple re-renders gracefully', () => {
      mockUseSearchParams.mockReturnValue({
        get: (key: string) => {
          if (key === 'error') return 'auth_callback_failed';
          return null;
        },
        getAll: vi.fn(() => []),
        has: vi.fn(),
        entries: vi.fn(() => []),
      });

      const { rerender } = render(<LoginToast />);
      expect(screen.getByRole('alert')).toBeInTheDocument();

      rerender(<LoginToast />);
      expect(screen.getByRole('alert')).toBeInTheDocument();

      rerender(<LoginToast />);
      expect(screen.getByRole('alert')).toBeInTheDocument();
    });

    it('renders consistently across re-renders', () => {
      mockUseSearchParams.mockReturnValue({
        get: (key: string) => {
          if (key === 'error') return 'auth_callback_failed';
          return null;
        },
        getAll: vi.fn(() => []),
        has: vi.fn(),
        entries: vi.fn(() => []),
      });

      const { rerender } = render(<LoginToast />);
      const firstAlert = screen.getByRole('alert');

      rerender(<LoginToast />);
      const secondAlert = screen.getByRole('alert');

      // Both should exist and be alert elements
      expect(firstAlert).toBeInTheDocument();
      expect(secondAlert).toBeInTheDocument();
    });
  });
});
