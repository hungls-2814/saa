import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { SiteFooter } from "./site-footer";

vi.mock("next-intl/server", () => ({
  getTranslations: () => (key: string) => key, // Return key as-is
}));

describe("SiteFooter", () => {
  it("renders logo that links to home", async () => {
    render(await SiteFooter());
    const logoLink = screen.getByAltText(/Sun\* Annual Awards 2025/i);
    expect(logoLink).toBeInTheDocument();
    const footerLogoLink = screen.getAllByRole("link", { name: "aboutSaa" })[0];
    expect(footerLogoLink).toHaveAttribute("href", "/");
  });

  it("renders all navigation links with correct hrefs", async () => {
    render(await SiteFooter());
    const links = screen.getAllByRole("link");
    const navLinks = links.filter((link) => {
      const href = link.getAttribute("href");
      return href === "/" || href === "/awards-information" || href === "/kudos" || href === "/standards";
    });
    expect(navLinks.some((l) => l.getAttribute("href") === "/")).toBe(true);
    expect(navLinks.some((l) => l.getAttribute("href") === "/awards-information")).toBe(true);
    expect(navLinks.some((l) => l.getAttribute("href") === "/kudos")).toBe(true);
    expect(navLinks.some((l) => l.getAttribute("href") === "/standards")).toBe(true);
  });

  it("renders copyright text", async () => {
    const { container } = render(await SiteFooter());
    const footer = container.querySelector("footer");
    expect(footer?.textContent).toContain("copyright");
  });

  it("renders 4 nav links plus logo link", async () => {
    render(await SiteFooter());
    const allLinks = screen.getAllByRole("link");
    const navLinks = allLinks.filter((link) => {
      const href = link.getAttribute("href");
      return href === "/" || href === "/awards-information" || href === "/kudos" || href === "/standards";
    });
    // Should have at least 5 links (logo + 4 nav)
    expect(navLinks.length).toBeGreaterThanOrEqual(5);
  });
});
