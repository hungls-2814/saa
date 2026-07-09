import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { ProfileHeader } from "./profile-header";

// Same convention as the Kudos board's own component tests (e.g.
// `filter-bar.test.tsx`): mock next-intl directly rather than wrapping every
// test in a NextIntlClientProvider, since this component only needs the
// single `iconCollection` key.
vi.mock("next-intl", () => ({
  useTranslations: () => (key: string) => key,
}));

const baseProps = {
  fullName: "Huỳnh Dương Xuân Nhật",
  avatarUrl: "",
  department: "CEVC3",
  starTier: 0 as const,
  heroBadge: "none" as const,
};

describe("ProfileHeader", () => {
  it("renders the full name and department", () => {
    render(<ProfileHeader {...baseProps} />);
    expect(screen.getByRole("heading", { name: "Huỳnh Dương Xuân Nhật" })).toBeInTheDocument();
    expect(screen.getByText("CEVC3")).toBeInTheDocument();
  });

  it("falls back to initials when avatarUrl is empty", () => {
    render(<ProfileHeader {...baseProps} avatarUrl="" />);
    expect(screen.getByText("HN")).toBeInTheDocument();
  });

  it("renders the real avatar photo when avatarUrl is set", () => {
    // The Avatar image is decorative (alt=""), so it's excluded from the
    // accessibility tree — query the DOM directly instead of by role.
    const { container } = render(
      <ProfileHeader {...baseProps} avatarUrl="https://example.com/avatar.png" />,
    );
    const img = container.querySelector("img");
    expect(img).toHaveAttribute("src", "https://example.com/avatar.png");
  });

  it("renders one star glyph per starTier and omits it at tier 0", () => {
    const { rerender } = render(<ProfileHeader {...baseProps} starTier={0} />);
    expect(screen.queryByText("✱")).not.toBeInTheDocument();

    rerender(<ProfileHeader {...baseProps} starTier={2} />);
    expect(screen.getByText("✱✱")).toBeInTheDocument();
  });

  it("renders the Hero badge image when heroBadge is not none, and omits it otherwise", () => {
    const { rerender } = render(<ProfileHeader {...baseProps} heroBadge="none" />);
    expect(screen.queryByAltText("Legend Hero")).not.toBeInTheDocument();

    rerender(<ProfileHeader {...baseProps} heroBadge="legend" />);
    expect(screen.getByAltText("Legend Hero")).toBeInTheDocument();
  });

  it("renders 6 static gray locked icon-collection placeholders with the i18n label", () => {
    render(<ProfileHeader {...baseProps} />);
    expect(screen.getAllByTestId("locked-icon")).toHaveLength(6);
    expect(screen.getByText("iconCollection")).toBeInTheDocument();
  });
});
