import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { AwardCard } from "./award-card";
import type { AwardCategory } from "../data/awards-data";

vi.mock("next-intl", () => ({
  useTranslations: () => (key: string) => key, // Return key as-is
}));

describe("AwardCard", () => {
  const testCases: { award: AwardCategory; expectedSlug: string }[] = [
    {
      award: {
        slug: "top-talent",
        titleKey: "Home.awards.topTalent.title",
        descKey: "Home.awards.topTalent.desc",
      },
      expectedSlug: "top-talent",
    },
    {
      award: {
        slug: "top-project",
        titleKey: "Home.awards.topProject.title",
        descKey: "Home.awards.topProject.desc",
      },
      expectedSlug: "top-project",
    },
    {
      award: {
        slug: "top-project-leader",
        titleKey: "Home.awards.topProjectLeader.title",
        descKey: "Home.awards.topProjectLeader.desc",
      },
      expectedSlug: "top-project-leader",
    },
    {
      award: {
        slug: "best-manager",
        titleKey: "Home.awards.bestManager.title",
        descKey: "Home.awards.bestManager.desc",
      },
      expectedSlug: "best-manager",
    },
    {
      award: {
        slug: "signature-2025-creator",
        titleKey: "Home.awards.signatureCreator.title",
        descKey: "Home.awards.signatureCreator.desc",
      },
      expectedSlug: "signature-2025-creator",
    },
    {
      award: {
        slug: "mvp",
        titleKey: "Home.awards.mvp.title",
        descKey: "Home.awards.mvp.desc",
      },
      expectedSlug: "mvp",
    },
  ];

  testCases.forEach(({ award, expectedSlug }) => {
    it(`renders ${award.slug} award card with correct link to #${expectedSlug}`, () => {
      render(<AwardCard award={award} />);
      const link = screen.getByRole("link");
      expect(link).toHaveAttribute("href", `/awards-information#${expectedSlug}`);
    });
  });

  it("renders title and description text", () => {
    const award: AwardCategory = {
      slug: "top-talent",
      titleKey: "Home.awards.topTalent.title",
      descKey: "Home.awards.topTalent.desc",
    };
    const { container } = render(<AwardCard award={award} />);
    expect(container.textContent).toContain("Home.awards.topTalent.title");
    expect(container.textContent).toContain("Home.awards.topTalent.desc");
  });

  it("renders detail link text", () => {
    const award: AwardCategory = {
      slug: "top-talent",
      titleKey: "Home.awards.topTalent.title",
      descKey: "Home.awards.topTalent.desc",
    };
    const { container } = render(<AwardCard award={award} />);
    expect(container.textContent).toContain("detailLink");
  });

  it("has group hover styling applied", () => {
    const award: AwardCategory = {
      slug: "top-talent",
      titleKey: "Home.awards.topTalent.title",
      descKey: "Home.awards.topTalent.desc",
    };
    render(<AwardCard award={award} />);
    const link = screen.getByRole("link");
    expect(link).toHaveClass("group");
  });
});
