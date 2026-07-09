import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { AllKudosFeed } from "./all-kudos-feed";
import type { KudosCard as KudosCardType } from "@/lib/kudos/types";

vi.mock("next-intl", () => ({
  useTranslations: () => (key: string) => key,
}));

function makeKudos(id: string): KudosCardType {
  return {
    id,
    title: "",
    isAnonymous: false,
    sender: { id: `${id}-s`, fullName: `Sender ${id}`, department: "CECV10", avatarUrl: "", title: "New Hero", starTier: 1 },
    receiver: { id: `${id}-r`, fullName: "Receiver", department: "CECV10", avatarUrl: "", title: "Legend Hero", starTier: 3 },
    content: "Content",
    createdAt: "2025-10-30T10:00:00.000Z",
    heartCount: 100,
    likedByMe: false,
    hashtags: [],
    images: [],
  };
}

describe("AllKudosFeed", () => {
  it("shows the empty state when the feed is empty", () => {
    render(<AllKudosFeed feed={[]} hasMore={false} />);
    expect(screen.getByText("empty")).toBeInTheDocument();
  });

  it("renders one card per feed item, newest-first order as given", () => {
    const feed = [makeKudos("1"), makeKudos("2")];
    render(<AllKudosFeed feed={feed} hasMore={false} />);
    expect(screen.getByText("Sender 1")).toBeInTheDocument();
    expect(screen.getByText("Sender 2")).toBeInTheDocument();
  });

  it("hides the load-more control when hasMore is false", () => {
    render(<AllKudosFeed feed={[makeKudos("1")]} hasMore={false} />);
    expect(screen.queryByText("loadMore")).not.toBeInTheDocument();
  });

  it("shows the load-more button and calls onLoadMore when clicked", async () => {
    const user = userEvent.setup();
    const onLoadMore = vi.fn();
    render(<AllKudosFeed feed={[makeKudos("1")]} hasMore onLoadMore={onLoadMore} />);
    await user.click(screen.getByText("loadMore"));
    expect(onLoadMore).toHaveBeenCalledTimes(1);
  });

  it("forwards onToggleLike to the underlying cards", async () => {
    const user = userEvent.setup();
    const onToggleLike = vi.fn();
    render(<AllKudosFeed feed={[makeKudos("1")]} hasMore={false} onToggleLike={onToggleLike} />);
    await user.click(screen.getByRole("button", { name: /100/ }));
    expect(onToggleLike).toHaveBeenCalledWith("1");
  });
});
