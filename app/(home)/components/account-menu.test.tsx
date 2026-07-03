import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { AccountMenu } from "./account-menu";
import type { User } from "@supabase/supabase-js";

vi.mock("next-intl", () => ({
  useTranslations: () => (key: string) => key, // Return key as-is (simulates i18n)
}));

vi.mock("@/lib/auth/sign-out", () => ({
  signOut: vi.fn(),
}));

describe("AccountMenu", () => {
  const mockUser: User = {
    id: "user-123",
    aud: "authenticated",
    role: "authenticated",
    email: "test@example.com",
    email_confirmed_at: new Date().toISOString(),
    phone: undefined,
    confirmed_at: new Date().toISOString(),
    last_sign_in_at: new Date().toISOString(),
    app_metadata: {},
    user_metadata: {},
    identities: [],
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  };

  describe("when user is logged in", () => {
    it("renders account icon button", () => {
      render(<AccountMenu user={mockUser} />);
      const button = screen.getByRole("button", { name: /Account/i });
      expect(button).toBeInTheDocument();
    });

    it("opens menu on button click", async () => {
      const user = userEvent.setup();
      render(<AccountMenu user={mockUser} />);
      const button = screen.getByRole("button", { name: /Account/i });

      expect(screen.queryByRole("menu")).not.toBeInTheDocument();
      await user.click(button);
      expect(screen.getByRole("menu", { name: /Account/i })).toBeInTheDocument();
    });

    it("renders Profile and Sign Out menu items", async () => {
      const user = userEvent.setup();
      render(<AccountMenu user={mockUser} />);
      const button = screen.getByRole("button", { name: "accountLabel" });

      await user.click(button);
      const menuitems = screen.getAllByRole("menuitem");
      expect(menuitems.length).toBe(2);
      expect(menuitems[0].textContent).toContain("profile");
      expect(menuitems[1].textContent).toContain("signOut");
    });

    it("Profile link points to /profile", async () => {
      const user = userEvent.setup();
      render(<AccountMenu user={mockUser} />);
      const button = screen.getByRole("button", { name: "accountLabel" });

      await user.click(button);
      const menuitems = screen.getAllByRole("menuitem");
      const profileLink = menuitems[0] as HTMLAnchorElement;
      expect(profileLink).toHaveAttribute("href", "/profile");
    });

    it("closes menu when Profile link is clicked", async () => {
      const user = userEvent.setup();
      render(<AccountMenu user={mockUser} />);
      const button = screen.getByRole("button", { name: "accountLabel" });

      await user.click(button);
      expect(screen.getByRole("menu")).toBeInTheDocument();

      const menuitems = screen.getAllByRole("menuitem");
      const profileLink = menuitems[0];
      await user.click(profileLink);
      expect(screen.queryByRole("menu")).not.toBeInTheDocument();
    });

    it("closes menu when clicking outside", async () => {
      const user = userEvent.setup();
      render(<AccountMenu user={mockUser} />);
      const button = screen.getByRole("button", { name: /Account/i });

      await user.click(button);
      expect(screen.getByRole("menu")).toBeInTheDocument();

      const overlay = screen.getByRole("menu").parentElement?.querySelector(
        "[aria-hidden]",
      ) as HTMLElement;
      if (overlay) {
        await user.click(overlay);
      }
      expect(screen.queryByRole("menu")).not.toBeInTheDocument();
    });

    it("closes menu when pressing Escape key", async () => {
      const user = userEvent.setup();
      render(<AccountMenu user={mockUser} />);
      const button = screen.getByRole("button", { name: /Account/i });

      await user.click(button);
      expect(screen.getByRole("menu")).toBeInTheDocument();

      await user.keyboard("{Escape}");
      expect(screen.queryByRole("menu")).not.toBeInTheDocument();
    });

    it("toggles menu on repeated button clicks", async () => {
      const user = userEvent.setup();
      render(<AccountMenu user={mockUser} />);
      const button = screen.getByRole("button", { name: /Account/i });

      await user.click(button);
      expect(screen.getByRole("menu")).toBeInTheDocument();

      await user.click(button);
      expect(screen.queryByRole("menu")).not.toBeInTheDocument();

      await user.click(button);
      expect(screen.getByRole("menu")).toBeInTheDocument();
    });

    it("sets aria-expanded attribute correctly", async () => {
      const user = userEvent.setup();
      render(<AccountMenu user={mockUser} />);
      const button = screen.getByRole("button", { name: /Account/i });

      expect(button).toHaveAttribute("aria-expanded", "false");

      await user.click(button);
      expect(button).toHaveAttribute("aria-expanded", "true");

      await user.click(button);
      expect(button).toHaveAttribute("aria-expanded", "false");
    });
  });

  describe("when user is logged out", () => {
    it("renders Guest Login link", () => {
      render(<AccountMenu user={null} />);
      const link = screen.getByRole("link", { name: "guestLogin" });
      expect(link).toBeInTheDocument();
    });

    it("Guest Login link points to /login", () => {
      render(<AccountMenu user={null} />);
      const link = screen.getByRole("link", { name: "guestLogin" });
      expect(link).toHaveAttribute("href", "/login");
    });

    it("does not render account button", () => {
      render(<AccountMenu user={null} />);
      expect(screen.queryByRole("button", { name: "accountLabel" })).not.toBeInTheDocument();
    });

    it("does not render menu items", () => {
      render(<AccountMenu user={null} />);
      expect(screen.queryByRole("menu")).not.toBeInTheDocument();
      expect(screen.queryByRole("menuitem")).not.toBeInTheDocument();
    });
  });
});
