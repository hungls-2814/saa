import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { AwardsSection } from "./awards-section";

vi.mock("next-intl/server", () => ({
  getTranslations: () => (key: string) => key, // Return key as-is
}));

vi.mock("./award-card", () => ({
  AwardCard: ({ award }: { award: { slug: string } }) => (
    <div data-testid={`award-card-${award.slug}`}>Award Card: {award.slug}</div>
  ),
}));

describe("AwardsSection", () => {
  it("renders section heading and eyebrow", async () => {
    const { container } = render(await AwardsSection());
    expect(container.textContent).toContain("eyebrow");
    expect(container.textContent).toContain("heading");
  });

  it("renders exactly 6 award cards", async () => {
    render(await AwardsSection());
    expect(screen.getByTestId("award-card-top-talent")).toBeInTheDocument();
    expect(screen.getByTestId("award-card-top-project")).toBeInTheDocument();
    expect(screen.getByTestId("award-card-top-project-leader")).toBeInTheDocument();
    expect(screen.getByTestId("award-card-best-manager")).toBeInTheDocument();
    expect(screen.getByTestId("award-card-signature-2025-creator")).toBeInTheDocument();
    expect(screen.getByTestId("award-card-mvp")).toBeInTheDocument();
  });

  it("renders all award categories in the correct order", async () => {
    render(await AwardsSection());
    const cards = screen.getAllByTestId(/^award-card-/);
    expect(cards).toHaveLength(6);
    expect(cards[0]).toHaveTextContent("top-talent");
    expect(cards[1]).toHaveTextContent("top-project");
    expect(cards[2]).toHaveTextContent("top-project-leader");
    expect(cards[3]).toHaveTextContent("best-manager");
    expect(cards[4]).toHaveTextContent("signature-2025-creator");
    expect(cards[5]).toHaveTextContent("mvp");
  });

  it("has dark background styling", async () => {
    const { container } = render(await AwardsSection());
    const section = container.querySelector("section");
    expect(section).toHaveClass("bg-[#00101A]");
  });

  it("uses grid layout (1 col mobile, 2 cols on tablet, 3 cols on desktop)", async () => {
    const { container } = render(await AwardsSection());
    const grid = container.querySelector(".grid");
    expect(grid).toHaveClass("grid-cols-1", "sm:grid-cols-2", "lg:grid-cols-3");
  });
});
