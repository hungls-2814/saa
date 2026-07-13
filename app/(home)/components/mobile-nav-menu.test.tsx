import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MobileNavMenu, type MobileNavLink } from "./mobile-nav-menu";

const links: MobileNavLink[] = [
  { href: "/", label: "About SAA 2025", active: true },
  { href: "/he-thong-giai", label: "Awards Information", active: false },
  { href: "/kudos", label: "Sun* Kudos", active: false },
];

describe("MobileNavMenu", () => {
  it("renders a labelled toggle button, collapsed by default", () => {
    render(<MobileNavMenu links={links} menuLabel="Menu" />);
    const toggle = screen.getByRole("button", { name: "Menu" });
    expect(toggle).toHaveAttribute("aria-expanded", "false");
    // Drawer links are not in the DOM until opened.
    expect(screen.queryByRole("link", { name: "Sun* Kudos" })).toBeNull();
  });

  it("opens the drawer with all links when the toggle is clicked", async () => {
    const user = userEvent.setup();
    render(<MobileNavMenu links={links} menuLabel="Menu" />);

    await user.click(screen.getByRole("button", { name: "Menu" }));

    const drawerLinks = screen.getAllByRole("link");
    const hrefs = drawerLinks.map((l) => l.getAttribute("href"));
    expect(hrefs).toEqual(["/", "/he-thong-giai", "/kudos"]);
  });

  it("closes the drawer when a link is clicked", async () => {
    const user = userEvent.setup();
    render(<MobileNavMenu links={links} menuLabel="Menu" />);

    await user.click(screen.getByRole("button", { name: "Menu" }));
    await user.click(screen.getByRole("link", { name: "Awards Information" }));

    expect(screen.queryByRole("link", { name: "Awards Information" })).toBeNull();
  });

  it("closes the drawer on Escape", async () => {
    const user = userEvent.setup();
    render(<MobileNavMenu links={links} menuLabel="Menu" />);

    await user.click(screen.getByRole("button", { name: "Menu" }));
    expect(screen.getByRole("link", { name: "Sun* Kudos" })).toBeInTheDocument();

    await user.keyboard("{Escape}");
    expect(screen.queryByRole("link", { name: "Sun* Kudos" })).toBeNull();
  });

  it("closes the drawer on backdrop click", async () => {
    const user = userEvent.setup();
    const { container } = render(<MobileNavMenu links={links} menuLabel="Menu" />);

    await user.click(screen.getByRole("button", { name: "Menu" }));
    // The backdrop is the fixed overlay wrapping the nav panel.
    const backdrop = container.querySelector(".fixed.inset-0") as HTMLElement;
    await user.click(backdrop);

    expect(screen.queryByRole("link", { name: "Sun* Kudos" })).toBeNull();
  });

  it("marks the active link with gold styling", async () => {
    const user = userEvent.setup();
    render(<MobileNavMenu links={links} menuLabel="Menu" />);

    await user.click(screen.getByRole("button", { name: "Menu" }));
    const activeLink = screen.getByRole("link", { name: "About SAA 2025" });
    expect(activeLink.className).toContain("text-[#FFEA9E]");
  });
});
