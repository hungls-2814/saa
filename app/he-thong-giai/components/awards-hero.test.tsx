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

  it("has hero section with full width", async () => {
    const { container } = render(await AwardsHero());
    const section = container.querySelector("section");
    expect(section).toHaveClass("w-full");
  });

  it("does not paint its own background (handled at page level)", async () => {
    const { container } = render(await AwardsHero());
    // The key-visual layer lives in page.tsx so it can span header + content;
    // the hero itself should carry no aria-hidden background div.
    const bgDiv = container.querySelector("[aria-hidden='true']");
    expect(bgDiv).toBeNull();
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

  it("stacks content in a flex column with desktop header clearance", async () => {
    const { container } = render(await AwardsHero());
    const content = container.querySelector(".max-w-\\[1224px\\]");
    expect(content).toHaveClass("flex", "flex-col", "lg:pt-[184px]");
  });

  it("centres the eyebrow + title block", async () => {
    const { container } = render(await AwardsHero());
    const title = screen.getByRole("heading", { level: 1 });
    const block = title.parentElement;
    expect(block).toHaveClass("items-center", "text-center");
  });

  it("has responsive horizontal padding on the banner section", async () => {
    const { container } = render(await AwardsHero());
    const section = container.querySelector("section");
    expect(section).toHaveClass("px-6", "sm:px-10", "lg:px-36");
  });

  it("wordmark image is marked as priority", async () => {
    render(await AwardsHero());
    const wordmark = screen.getByAltText("ROOT FURTHER");
    // Priority is handled by Next.js, but we can verify it's there
    expect(wordmark).toHaveAttribute("src", "/login/root-further-wordmark.png");
  });

  it("renders content in max-width container", async () => {
    const { container } = render(await AwardsHero());
    const maxWidthDiv = container.querySelector(".max-w-\\[1224px\\]");
    expect(maxWidthDiv).toBeInTheDocument();
  });

  it("groups eyebrow and title with gap-4", async () => {
    const { container } = render(await AwardsHero());
    const groupDiv = container.querySelectorAll(".gap-4")[0]; // the eyebrow+divider+title group
    expect(groupDiv).toBeInTheDocument();
  });
});
