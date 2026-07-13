import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { NotificationButton } from "./notification-button";

vi.mock("next-intl", () => ({
  useTranslations: () => (key: string) => key, // Return key as-is
}));

describe("NotificationButton", () => {
  it("renders bell icon button with aria label", () => {
    render(<NotificationButton />);
    const button = screen.getByRole("button", { name: /Notifications/i });
    expect(button).toBeInTheDocument();
  });

  it("shows no unread dot by default (no notifications)", () => {
    const { container } = render(<NotificationButton />);
    const badge = container.querySelector("span.bg-\\[\\#D4271D\\]");
    expect(badge).toBeNull();
  });

  it("shows the unread dot only when unreadCount > 0", () => {
    const { container } = render(<NotificationButton unreadCount={3} />);
    const badge = container.querySelector("span.bg-\\[\\#D4271D\\]");
    expect(badge).not.toBeNull();
    expect(badge).toHaveClass("bg-[#D4271D]");
  });

  it("opens notification panel on button click", async () => {
    const user = userEvent.setup();
    render(<NotificationButton />);
    const button = screen.getByRole("button");

    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    await user.click(button);
    expect(screen.getByRole("dialog")).toBeInTheDocument();
  });

  it("displays empty state message in the panel", async () => {
    const user = userEvent.setup();
    render(<NotificationButton />);
    const button = screen.getByRole("button");

    await user.click(button);
    const panel = screen.getByRole("dialog");
    expect(panel.textContent).toContain("notificationsEmpty");
  });

  it("closes panel when clicking outside", async () => {
    const user = userEvent.setup();
    render(<NotificationButton />);
    const button = screen.getByRole("button");

    await user.click(button);
    expect(screen.getByRole("dialog")).toBeInTheDocument();

    const overlay = screen.getByRole("dialog").parentElement?.querySelector(
      "[aria-hidden]",
    ) as HTMLElement;
    if (overlay) {
      await user.click(overlay);
    }
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  });

  it("closes panel when pressing Escape key", async () => {
    const user = userEvent.setup();
    render(<NotificationButton />);
    const button = screen.getByRole("button");

    await user.click(button);
    expect(screen.getByRole("dialog")).toBeInTheDocument();

    await user.keyboard("{Escape}");
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  });

  it("toggles panel on repeated clicks", async () => {
    const user = userEvent.setup();
    render(<NotificationButton />);
    const button = screen.getByRole("button");

    await user.click(button);
    expect(screen.getByRole("dialog")).toBeInTheDocument();

    await user.click(button);
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();

    await user.click(button);
    expect(screen.getByRole("dialog")).toBeInTheDocument();
  });

  it("sets aria-expanded attribute correctly", async () => {
    const user = userEvent.setup();
    render(<NotificationButton />);
    const button = screen.getByRole("button");

    expect(button).toHaveAttribute("aria-expanded", "false");

    await user.click(button);
    expect(button).toHaveAttribute("aria-expanded", "true");

    await user.click(button);
    expect(button).toHaveAttribute("aria-expanded", "false");
  });
});
