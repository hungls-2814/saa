import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { SidebarGifts } from "./sidebar-gifts";
import type { GiftItem } from "@/lib/kudos/types";

vi.mock("next-intl", () => ({
  useTranslations: () => (key: string) => key,
}));

const gifts: GiftItem[] = [
  { id: "g1", recipientName: "Huỳnh Dương Xuân", recipientAvatarUrl: "", description: "Nhận được 1 áo phông SAA", awardedAt: "2025-10-30T20:30:00.000Z" },
];

describe("SidebarGifts", () => {
  it("renders each gift's recipient name and description", () => {
    render(<SidebarGifts gifts={gifts} />);
    expect(screen.getByText("Huỳnh Dương Xuân")).toBeInTheDocument();
    expect(screen.getByText("Nhận được 1 áo phông SAA")).toBeInTheDocument();
  });

  it("shows the empty state when there are no gifts", () => {
    render(<SidebarGifts gifts={[]} />);
    expect(screen.getByText("empty")).toBeInTheDocument();
  });

  it("renders an initials fallback avatar per gift row", () => {
    render(<SidebarGifts gifts={gifts} />);
    expect(screen.getByText("HX")).toBeInTheDocument();
  });
});
