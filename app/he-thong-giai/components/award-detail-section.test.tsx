/* eslint-disable @typescript-eslint/no-explicit-any */
import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { AwardDetailSection } from "./award-detail-section";
import type { AwardDetail } from "../data/awards-detail-data";

vi.mock("next/image", () => ({
  default: ({ src, alt, fill, className, sizes }: any) => (
    <img src={src} alt={alt} data-testid={`image-${alt}`} />
  ),
}));

vi.mock("next-intl/server", () => {
  const mockT = (key: string) => {
    return `AwardsPage.items.${key}`;
  };
  mockT.has = (key: string) => true;

  return {
    getTranslations: (namespace: string) => {
      const t = (key: string) => `${namespace}:${key}`;
      t.has = (key: string) => true;
      return t;
    },
  };
});

vi.mock("./award-icons", () => ({
  TargetIcon: ({ className }: any) => (
    <svg data-testid="target-icon" className={className} />
  ),
  DiamondIcon: ({ className }: any) => (
    <svg data-testid="diamond-icon" className={className} />
  ),
  LicenseIcon: ({ className }: any) => (
    <svg data-testid="license-icon" className={className} />
  ),
}));

describe("AwardDetailSection", () => {
  const testCases: Array<{
    detail: AwardDetail;
    index: number;
    expectedOrbPosition: "left" | "right";
    isSpecialDualPrize: boolean;
  }> = [
    {
      detail: {
        slug: "top-talent",
        itemKey: "topTalent",
        orbSrc: "/home/award-top-talent.png",
      },
      index: 0,
      expectedOrbPosition: "left",
      isSpecialDualPrize: false,
    },
    {
      detail: {
        slug: "top-project",
        itemKey: "topProject",
        orbSrc: "/home/award-top-project.png",
      },
      index: 1,
      expectedOrbPosition: "right",
      isSpecialDualPrize: false,
    },
    {
      detail: {
        slug: "signature-2025-creator",
        itemKey: "signatureCreator",
        orbSrc: "/home/award-signature-2025-creator.png",
        hasDualPrize: true,
      },
      index: 4,
      expectedOrbPosition: "left",
      isSpecialDualPrize: true,
    },
  ];

  testCases.forEach(({ detail, index, expectedOrbPosition, isSpecialDualPrize }) => {
    it(`renders ${detail.slug} section with id="${detail.slug}"`, async () => {
      const { container } = render(
        await AwardDetailSection({ detail, index })
      );
      const section = container.querySelector("section");
      expect(section).toHaveAttribute("id", detail.slug);
    });

    it(`renders ${detail.slug} with orb on the ${expectedOrbPosition}`, async () => {
      const { container } = render(
        await AwardDetailSection({ detail, index })
      );
      const section = container.querySelector("section");
      if (expectedOrbPosition === "right") {
        expect(section).toHaveClass("lg:flex-row-reverse");
      } else {
        expect(section).not.toHaveClass("lg:flex-row-reverse");
      }
    });

    it(`renders ${detail.slug} with correct orb image source`, async () => {
      render(await AwardDetailSection({ detail, index }));
      const image = screen.getByAltText(
        `AwardsPage.items.${detail.itemKey}:title`
      );
      expect(image).toHaveAttribute("src", detail.orbSrc);
    });

    it(`renders ${detail.slug} title, description, quantity, and prize labels`, async () => {
      const { container } = render(
        await AwardDetailSection({ detail, index })
      );
      const content = container.textContent || "";
      expect(content).toContain(`AwardsPage.items.${detail.itemKey}:title`);
      expect(content).toContain(`AwardsPage.items.${detail.itemKey}:desc`);
      expect(content).toContain("AwardsPage:quantityLabel");
      expect(content).toContain("AwardsPage:prizeLabel");
    });

    if (isSpecialDualPrize) {
      it(`renders ${detail.slug} with dual prize values (cá nhân/tập thể)`, async () => {
        const { container } = render(
          await AwardDetailSection({ detail, index })
        );
        const content = container.textContent || "";
        expect(content).toContain(
          `AwardsPage.items.${detail.itemKey}:prizeIndividualValue`
        );
        expect(content).toContain(
          `AwardsPage.items.${detail.itemKey}:prizeGroupValue`
        );
        expect(content).toContain("AwardsPage:orLabel");
      });
    } else {
      it(`renders ${detail.slug} with single prize value`, async () => {
        const { container } = render(
          await AwardDetailSection({ detail, index })
        );
        const content = container.textContent || "";
        expect(content).toContain(
          `AwardsPage.items.${detail.itemKey}:prizeValue`
        );
      });
    }
  });

  it("renders all 6 award sections in order", async () => {
    const details: AwardDetail[] = [
      {
        slug: "top-talent",
        itemKey: "topTalent",
        orbSrc: "/home/award-top-talent.png",
      },
      {
        slug: "top-project",
        itemKey: "topProject",
        orbSrc: "/home/award-top-project.png",
      },
      {
        slug: "top-project-leader",
        itemKey: "topProjectLeader",
        orbSrc: "/home/award-top-project-leader.png",
      },
      { slug: "best-manager", itemKey: "bestManager", orbSrc: "/home/award-best-manager.png" },
      {
        slug: "signature-2025-creator",
        itemKey: "signatureCreator",
        orbSrc: "/home/award-signature-2025-creator.png",
        hasDualPrize: true,
      },
      { slug: "mvp", itemKey: "mvp", orbSrc: "/home/award-mvp.png" },
    ];

    for (let i = 0; i < details.length; i++) {
      const { container } = render(
        await AwardDetailSection({ detail: details[i], index: i })
      );
      const section = container.querySelector("section");
      expect(section).toHaveAttribute("id", details[i].slug);
    }
  });

  it("renders section with scroll-mt-28 for proper scroll offset", async () => {
    const detail: AwardDetail = {
      slug: "top-talent",
      itemKey: "topTalent",
      orbSrc: "/home/award-top-talent.png",
    };
    const { container } = render(
      await AwardDetailSection({ detail, index: 0 })
    );
    const section = container.querySelector("section");
    expect(section).toHaveClass("scroll-mt-28");
  });

  it("renders quantity value from translations", async () => {
    const detail: AwardDetail = {
      slug: "top-talent",
      itemKey: "topTalent",
      orbSrc: "/home/award-top-talent.png",
    };
    const { container } = render(
      await AwardDetailSection({ detail, index: 0 })
    );
    const content = container.textContent || "";
    expect(content).toContain("AwardsPage.items.topTalent:quantityValue");
    expect(content).toContain("AwardsPage.items.topTalent:quantityUnit");
  });

  it("renders icons with proper styling", async () => {
    const detail: AwardDetail = {
      slug: "top-talent",
      itemKey: "topTalent",
      orbSrc: "/home/award-top-talent.png",
    };
    render(await AwardDetailSection({ detail, index: 0 }));

    // Check for target icon (title), diamond icon (quantity), license icon (prize)
    const targetIcons = screen.getAllByTestId("target-icon");
    expect(targetIcons.length).toBeGreaterThan(0);
    expect(screen.getByTestId("diamond-icon")).toBeInTheDocument();
    expect(screen.getByTestId("license-icon")).toBeInTheDocument();
  });

  it("applies gold color to icons and title", async () => {
    const detail: AwardDetail = {
      slug: "top-talent",
      itemKey: "topTalent",
      orbSrc: "/home/award-top-talent.png",
    };
    const { container } = render(
      await AwardDetailSection({ detail, index: 0 })
    );
    const h3 = container.querySelector("h3");
    expect(h3).toHaveClass("text-[#FFEA9E]");
  });
});
