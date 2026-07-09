import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { WidgetButton } from './widget-button';

// The next-intl mock echoes the key, so `t("writeKudos")` renders "writeKudos".
vi.mock('next-intl', () => ({
  useTranslations: () => (key: string) => key,
}));

describe('WidgetButton (FAB)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders collapsed by default — trigger shown, action pills hidden', () => {
    render(<WidgetButton />);
    const trigger = screen.getByRole('button', { name: 'label' });
    expect(trigger).toHaveAttribute('aria-expanded', 'false');
    expect(screen.queryByRole('menuitem', { name: 'writeKudos' })).not.toBeInTheDocument();
    expect(screen.queryByRole('menuitem', { name: 'saaRules' })).not.toBeInTheDocument();
  });

  it('expands on trigger click — reveals "Viết KUDOS" + "Thể lệ" pills and a close button', async () => {
    const user = userEvent.setup();
    render(<WidgetButton />);
    await user.click(screen.getByRole('button', { name: 'label' }));

    expect(screen.getByRole('menuitem', { name: 'writeKudos' })).toBeInTheDocument();
    expect(screen.getByRole('menuitem', { name: 'saaRules' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'close' })).toBeInTheDocument();
  });

  it('calls onWriteKudos and collapses when "Viết KUDOS" is clicked', async () => {
    const user = userEvent.setup();
    const onWriteKudos = vi.fn();
    render(<WidgetButton onWriteKudos={onWriteKudos} />);

    await user.click(screen.getByRole('button', { name: 'label' }));
    await user.click(screen.getByRole('menuitem', { name: 'writeKudos' }));

    expect(onWriteKudos).toHaveBeenCalledTimes(1);
    // Collapsed again: the write-kudos pill is gone.
    expect(screen.queryByRole('menuitem', { name: 'writeKudos' })).not.toBeInTheDocument();
  });

  it('does not throw when "Viết KUDOS" is clicked without an onWriteKudos handler', async () => {
    const user = userEvent.setup();
    render(<WidgetButton />);
    await user.click(screen.getByRole('button', { name: 'label' }));
    await user.click(screen.getByRole('menuitem', { name: 'writeKudos' }));
    expect(screen.queryByRole('menuitem', { name: 'writeKudos' })).not.toBeInTheDocument();
  });

  it('"Thể lệ" is a stub — collapses the menu without calling onWriteKudos', async () => {
    const user = userEvent.setup();
    const onWriteKudos = vi.fn();
    render(<WidgetButton onWriteKudos={onWriteKudos} />);

    await user.click(screen.getByRole('button', { name: 'label' }));
    await user.click(screen.getByRole('menuitem', { name: 'saaRules' }));

    expect(onWriteKudos).not.toHaveBeenCalled();
    expect(screen.queryByRole('menuitem', { name: 'saaRules' })).not.toBeInTheDocument();
  });

  it('closes when the red ✕ close button is clicked', async () => {
    const user = userEvent.setup();
    render(<WidgetButton />);
    await user.click(screen.getByRole('button', { name: 'label' }));
    await user.click(screen.getByRole('button', { name: 'close' }));
    expect(screen.getByRole('button', { name: 'label' })).toHaveAttribute('aria-expanded', 'false');
  });

  it('closes on Escape', async () => {
    const user = userEvent.setup();
    render(<WidgetButton />);
    await user.click(screen.getByRole('button', { name: 'label' }));
    await user.keyboard('{Escape}');
    expect(screen.queryByRole('menuitem', { name: 'writeKudos' })).not.toBeInTheDocument();
  });

  it('closes on outside click', async () => {
    const user = userEvent.setup();
    render(
      <div>
        <button type="button">outside</button>
        <WidgetButton />
      </div>,
    );
    await user.click(screen.getByRole('button', { name: 'label' }));
    await user.click(screen.getByRole('button', { name: 'outside' }));
    expect(screen.queryByRole('menuitem', { name: 'writeKudos' })).not.toBeInTheDocument();
  });

  it('exposes an accessible expanded state on the trigger', async () => {
    const user = userEvent.setup();
    render(<WidgetButton />);
    const trigger = screen.getByRole('button', { name: 'label' });
    expect(trigger).toHaveAttribute('aria-haspopup', 'true');
    await user.click(trigger);
    // When open the menu is labelled and reachable.
    expect(screen.getByRole('menu', { name: 'label' })).toBeInTheDocument();
  });
});
