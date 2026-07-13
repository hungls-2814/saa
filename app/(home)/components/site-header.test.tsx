import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { SiteHeader } from "./site-header";
import type { User } from "@supabase/supabase-js";

vi.mock("next-intl/server", () => ({
  getTranslations: () => (key: string) => key, // Return key as-is
}));

vi.mock("./notification-button", () => ({
  NotificationButton: () => <div data-testid="notification-button">Bell</div>,
}));

vi.mock("@/app/components/language-selector", () => ({
  LanguageSelector: () => <div data-testid="language-selector">Lang</div>,
}));

vi.mock("./account-menu", () => ({
  AccountMenu: ({ user }: { user: User | null }) => (
    <div data-testid="account-menu">
      {user ? `Account: ${user.id}` : "Login"}
    </div>
  ),
}));

describe("SiteHeader", () => {
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

  it("renders the SAA logo and links to home", async () => {
    render(await SiteHeader({ user: null }));
    const images = screen.getAllByAltText(/Sun\* Annual Awards 2025/i);
    expect(images.length).toBeGreaterThan(0);
    const logoLink = images[0].closest("a");
    expect(logoLink).toHaveAttribute("href", "/");
  });

  it("renders nav links with About SAA 2025 active styling when user is null", async () => {
    const { container } = render(await SiteHeader({ user: null }));
    const navLinks = container.querySelectorAll("nav a");

    // Check for presence of expected hrefs
    const hrefs = Array.from(navLinks).map((link) => link.getAttribute("href"));
    expect(hrefs).toContain("/");
    expect(hrefs).toContain("/he-thong-giai");
    expect(hrefs).toContain("/kudos");

    // Check active styling on first link (About SAA 2025)
    const aboutLink = navLinks[0] as HTMLElement;
    expect(aboutLink).toHaveClass("border-b");
  });

  it("renders notification bell only when user is logged in", async () => {
    const { rerender } = render(await SiteHeader({ user: null }));
    expect(screen.queryByTestId("notification-button")).not.toBeInTheDocument();

    rerender(await SiteHeader({ user: mockUser }));
    expect(screen.getByTestId("notification-button")).toBeInTheDocument();
  });

  it("always renders language selector and account menu", async () => {
    render(await SiteHeader({ user: null }));
    expect(screen.getByTestId("language-selector")).toBeInTheDocument();
    expect(screen.getByTestId("account-menu")).toBeInTheDocument();
  });

  it("passes user to account menu", async () => {
    render(await SiteHeader({ user: mockUser }));
    expect(screen.getByText(`Account: ${mockUser.id}`)).toBeInTheDocument();
  });

  it("shows login link in account menu when user is null", async () => {
    render(await SiteHeader({ user: null }));
    expect(screen.getByText("Login")).toBeInTheDocument();
  });

  it("renders the mobile-nav hamburger toggle (collapsed by default)", async () => {
    // getTranslations mock returns the key verbatim, so the toggle's aria-label
    // resolves to the raw "nav.menu" key.
    render(await SiteHeader({ user: null }));
    const toggle = screen.getByRole("button", { name: "nav.menu" });
    expect(toggle).toHaveAttribute("aria-expanded", "false");
  });
});
