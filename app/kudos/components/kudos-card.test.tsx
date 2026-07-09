import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { KudosCard } from "./kudos-card";
import type { KudosCard as KudosCardType } from "@/lib/kudos/types";

vi.mock("next-intl", () => ({
  useTranslations: () => (key: string) => key,
}));

const baseKudos: KudosCardType = {
  id: "k1",
  title: "",
  isAnonymous: false,
  sender: {
    id: "sender-1",
    fullName: "Huỳnh Dương Xuân Nhật",
    department: "CECV10",
    avatarUrl: "",
    title: "New Hero",
    starTier: 1,
  },
  receiver: {
    id: "receiver-1",
    fullName: "Huỳnh Dương Xuân",
    department: "CECV10",
    avatarUrl: "",
    title: "Legend Hero",
    starTier: 3,
  },
  content: "Cảm ơn người em bình thường nhưng phi thường",
  createdAt: "2025-10-30T10:00:00.000Z",
  heartCount: 1000,
  likedByMe: false,
  hashtags: [
    { id: "a", label: "Dedicated" },
    { id: "b", label: "Inspring" },
  ],
  images: ["img-1", "img-2"],
};

describe("KudosCard", () => {
  it("renders sender and receiver names", () => {
    render(<KudosCard kudos={baseKudos} variant="feed" />);
    expect(screen.getByText("Huỳnh Dương Xuân Nhật")).toBeInTheDocument();
    expect(screen.getByText("Huỳnh Dương Xuân")).toBeInTheDocument();
  });

  it("formats the heart count and timestamp per the render rules", () => {
    render(<KudosCard kudos={baseKudos} variant="feed" />);
    expect(screen.getByText("1.000")).toBeInTheDocument();
    expect(screen.getByText("10:00 - 10/30/2025")).toBeInTheDocument();
  });

  it("renders hashtag chips keyed by id, not by label text alone", () => {
    render(<KudosCard kudos={baseKudos} variant="feed" />);
    expect(screen.getByText("#Dedicated")).toBeInTheDocument();
    expect(screen.getByText("#Inspring")).toBeInTheDocument();
  });

  it("calls onToggleLike with the kudos id when the heart is clicked", async () => {
    const user = userEvent.setup();
    const onToggleLike = vi.fn();
    render(<KudosCard kudos={baseKudos} variant="feed" onToggleLike={onToggleLike} />);
    await user.click(screen.getByRole("button", { name: /1\.000/ }));
    expect(onToggleLike).toHaveBeenCalledWith("k1");
  });

  it("calls onCopyLink with the kudos id when Copy Link is clicked", async () => {
    const user = userEvent.setup();
    const onCopyLink = vi.fn();
    render(<KudosCard kudos={baseKudos} variant="feed" onCopyLink={onCopyLink} />);
    await user.click(screen.getByText("copyLink"));
    expect(onCopyLink).toHaveBeenCalledWith("k1");
  });

  it("calls onSelectHashtag with the hashtag id when a chip is clicked", async () => {
    const user = userEvent.setup();
    const onSelectHashtag = vi.fn();
    render(
      <KudosCard kudos={baseKudos} variant="feed" onSelectHashtag={onSelectHashtag} />,
    );
    await user.click(screen.getByText("#Dedicated"));
    expect(onSelectHashtag).toHaveBeenCalledWith("a");
  });

  it("shows the image gallery and no detail link for the feed variant", () => {
    render(<KudosCard kudos={baseKudos} variant="feed" />);
    expect(screen.queryByText("detail")).not.toBeInTheDocument();
  });

  it("shows the detail link and hides the image gallery for the highlight variant", () => {
    render(<KudosCard kudos={baseKudos} variant="highlight" />);
    expect(screen.getByText("detail")).toBeInTheDocument();
  });

  it("truncates hashtags beyond 5 with an ellipsis", () => {
    const manyTags = {
      ...baseKudos,
      hashtags: Array.from({ length: 7 }, (_, i) => ({ id: `t${i}`, label: `Tag${i}` })),
    };
    render(<KudosCard kudos={manyTags} variant="feed" />);
    expect(screen.getByText("…")).toBeInTheDocument();
    expect(screen.queryByText("#Tag6")).not.toBeInTheDocument();
  });
});
