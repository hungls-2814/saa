import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { AwardsSidebar } from "./awards-sidebar";

vi.mock("next-intl", () => ({
  useTranslations: (namespace: string) => {
    return (key: string) => `${namespace}.${key}`;
  },
}));

vi.mock("./use-active-section", () => ({
  useActiveSection: vi.fn(),
}));

import { useActiveSection } from "./use-active-section";

describe("AwardsSidebar", () => {
  const mockUseActiveSection = vi.mocked(useActiveSection);

  beforeEach(() => {
    vi.clearAllMocks();
    mockUseActiveSection.mockReturnValue({
      active: "top-talent",
      scrollTo: vi.fn(),
    });
  });

  it("renders 6 award category buttons in correct order", () => {
    render(<AwardsSidebar />);
    const buttons = screen.getAllByRole("button");
    expect(buttons).toHaveLength(6);
    // Check order by text content (using mocked keys from useTranslations)
    expect(buttons[0]).toHaveTextContent("AwardsPage.items.topTalent.title");
    expect(buttons[1]).toHaveTextContent("AwardsPage.items.topProject.title");
    expect(buttons[2]).toHaveTextContent("AwardsPage.items.topProjectLeader.title");
    expect(buttons[3]).toHaveTextContent("AwardsPage.items.bestManager.title");
    expect(buttons[4]).toHaveTextContent("AwardsPage.items.signatureCreator.title");
    expect(buttons[5]).toHaveTextContent("AwardsPage.items.mvp.title");
  });

  it("renders active item with gold styling and underline", () => {
    render(<AwardsSidebar />);
    const buttons = screen.getAllByRole("button");
    const activeButton = buttons[0]; // top-talent is active
    expect(activeButton).toHaveClass("border-b");
    expect(activeButton).toHaveClass("border-[#FFEA9E]");
    expect(activeButton).toHaveClass("text-[#FFEA9E]");
  });

  it("renders inactive items with white text and no gold styling", () => {
    render(<AwardsSidebar />);
    const buttons = screen.getAllByRole("button");
    const inactiveButton = buttons[1]; // top-project is inactive
    expect(inactiveButton).toHaveClass("text-white");
    expect(inactiveButton).not.toHaveClass("text-[#FFEA9E]");
    expect(inactiveButton).not.toHaveClass("border-[#FFEA9E]");
  });

  it("calls scrollTo when a button is clicked", async () => {
    const mockScrollTo = vi.fn();
    mockUseActiveSection.mockReturnValue({
      active: "top-talent",
      scrollTo: mockScrollTo,
    });

    const user = userEvent.setup();
    render(<AwardsSidebar />);
    const buttons = screen.getAllByRole("button");

    await user.click(buttons[1]); // Click top-project
    expect(mockScrollTo).toHaveBeenCalledWith("top-project");
  });

  it("sets aria-current attribute on active button", () => {
    render(<AwardsSidebar />);
    const buttons = screen.getAllByRole("button");
    expect(buttons[0]).toHaveAttribute("aria-current", "true");
    expect(buttons[1]).not.toHaveAttribute("aria-current");
  });

  it("updates active styling when different item becomes active", () => {
    const { rerender } = render(<AwardsSidebar />);
    let buttons = screen.getAllByRole("button");
    expect(buttons[0]).toHaveClass("text-[#FFEA9E]");
    expect(buttons[1]).not.toHaveClass("text-[#FFEA9E]");

    mockUseActiveSection.mockReturnValue({
      active: "top-project",
      scrollTo: vi.fn(),
    });

    rerender(<AwardsSidebar />);
    buttons = screen.getAllByRole("button");
    expect(buttons[0]).not.toHaveClass("text-[#FFEA9E]");
    expect(buttons[1]).toHaveClass("text-[#FFEA9E]");
  });

  it("has nav element with proper aria-label", () => {
    render(<AwardsSidebar />);
    const nav = screen.getByRole("navigation", { name: /Award categories/i });
    expect(nav).toBeInTheDocument();
  });

  it("has sticky positioning on desktop", () => {
    const { container } = render(<AwardsSidebar />);
    const nav = container.querySelector("nav");
    expect(nav).toHaveClass("lg:sticky");
  });
});
