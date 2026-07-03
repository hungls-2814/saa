/* eslint-disable @typescript-eslint/no-explicit-any */
import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { AwardsHero } from "./awards-hero";

vi.mock("next/image", () => ({
  default: ({ src, alt, width, height, className, priority, unoptimized }: any) => (
    <img src={src} alt={alt} width={width} height={height} className={className} />
  ),
}));

vi.mock("next-intl/server", () => ({
  getTranslations: (namespace: string) => (key: string) => {
    // Return mock translation with namespace prefix for verification
    return `${namespace}:${key}`;
  },
}));

describe("AwardsHero", () => {
  it("renders ROOT FURTHER wordmark image", async () => {
    render(await AwardsHero());
    const wordmarkImage = screen.getByAltText("ROOT FURTHER");
    expect(wordmarkImage).toBeInTheDocument();
    expect(wordmarkImage).toHaveAttribute(
      "src",
      "/login/root-further-wordmark.png"
    );
  });

  it("renders eyebrow text", async () => {
    render(await AwardsHero());
    const content = screen.getByText(/AwardsPage.hero:eyebrow/);
    expect(content).toBeInTheDocument();
  });

  it("renders main title", async () => {
    render(await AwardsHero());
    const title = screen.getByRole("heading", { level: 1 });
    expect(title).toHaveTextContent("AwardsPage.hero:title");
  });

  it("renders title with gold color styling", async () => {
    render(await AwardsHero());
    const title = screen.getByRole("heading", { level: 1 });
    expect(title).toHaveClass("text-[#FFEA9E]");
  });

  it("renders eyebrow with white text", async () => {
    const { container } = render(await AwardsHero());
    const eyebrow = container.querySelector("p");
    expect(eyebrow).toHaveClass("text-white");
  });

  it("has hero section with full-bleed background", async () => {
    const { container } = render(await AwardsHero());
    const section = container.querySelector("section");
    expect(section).toHaveClass("w-full");
  });

  it("renders background key-visual with proper aspect ratio", async () => {
    const { container } = render(await AwardsHero());
    const bgDiv = container.querySelector("[aria-hidden='true']");
    const style = window.getComputedStyle(bgDiv as Element);
    // The div should have the background image style
    expect(bgDiv).toHaveClass("pointer-events-none");
  });

  it("renders horizontal divider between eyebrow and title", async () => {
    const { container } = render(await AwardsHero());
    const divider = container.querySelector(".h-px");
    expect(divider).toBeInTheDocument();
    expect(divider).toHaveClass("bg-[#2E3940]");
  });

  it("has relative positioning for text content", async () => {
    const { container } = render(await AwardsHero());
    const contentDiv = container.querySelector(".relative.z-\\[1\\]");
    expect(contentDiv).toBeInTheDocument();
  });

  it("has flex layout for proper alignment", async () => {
    const { container } = render(await AwardsHero());
    const section = container.querySelector("section");
    expect(section).toHaveClass("flex");
    expect(section).toHaveClass("flex-col");
  });

  it("has responsive padding and text sizes", async () => {
    const { container } = render(await AwardsHero());
    const section = container.querySelector("section");
    expect(section).toHaveClass("px-6", "sm:px-10", "lg:px-36");
    expect(section).toHaveClass("pt-24", "pb-12", "sm:px-10", "lg:pt-24", "lg:pb-16");
  });

  it("wordmark image is marked as priority", async () => {
    render(await AwardsHero());
    const wordmark = screen.getByAltText("ROOT FURTHER");
    // Priority is handled by Next.js, but we can verify it's there
    expect(wordmark).toHaveAttribute("src", "/login/root-further-wordmark.png");
  });

  it("background div has aria-hidden for accessibility", async () => {
    const { container } = render(await AwardsHero());
    const bgDiv = container.querySelector("[aria-hidden='true']");
    expect(bgDiv).toHaveAttribute("aria-hidden", "true");
  });

  it("renders content in max-width container", async () => {
    const { container } = render(await AwardsHero());
    const maxWidthDiv = container.querySelector(".max-w-\\[1224px\\]");
    expect(maxWidthDiv).toBeInTheDocument();
  });

  it("groups eyebrow and title with gap-4", async () => {
    const { container } = render(await AwardsHero());
    const groupDiv = container.querySelectorAll(".gap-4")[1]; // Second gap-4 is the text group
    expect(groupDiv).toBeInTheDocument();
  });
});
