import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { HighlightCarousel } from "./highlight-carousel";
import type { KudosCard as KudosCardType } from "@/lib/kudos/types";

vi.mock("next-intl", () => ({
  useTranslations: () => (key: string) => key,
}));

function makeKudos(id: string, senderName: string): KudosCardType {
  return {
    id,
    sender: { id: `${id}-s`, fullName: senderName, department: "CECV10", avatarUrl: "", title: "New Hero", starTier: 1 },
    receiver: { id: `${id}-r`, fullName: "Receiver", department: "CECV10", avatarUrl: "", title: "Legend Hero", starTier: 3 },
    content: "Content",
    createdAt: "2025-10-30T10:00:00.000Z",
    heartCount: 100,
    likedByMe: false,
    hashtags: [],
    images: [],
  };
}

describe("HighlightCarousel", () => {
  it("shows the empty state when there are no highlights", () => {
    render(<HighlightCarousel highlights={[]} />);
    expect(screen.getByText("empty")).toBeInTheDocument();
  });

  it("shows the paginator as n/min(5,total) — e.g. 1/3 for 3 highlights", () => {
    const highlights = [makeKudos("a", "A"), makeKudos("b", "B"), makeKudos("c", "C")];
    render(<HighlightCarousel highlights={highlights} />);
    expect(screen.getByText("1/3")).toBeInTheDocument();
  });

  it("disables the prev button at the first slide", () => {
    const highlights = [makeKudos("a", "A"), makeKudos("b", "B")];
    render(<HighlightCarousel highlights={highlights} />);
    expect(screen.getByRole("button", { name: "prev" })).toBeDisabled();
    expect(screen.getByRole("button", { name: "next" })).toBeEnabled();
  });

  it("disables the next button at the last slide", async () => {
    const user = userEvent.setup();
    const highlights = [makeKudos("a", "A"), makeKudos("b", "B")];
    render(<HighlightCarousel highlights={highlights} />);
    await user.click(screen.getByRole("button", { name: "next" }));
    expect(screen.getByText("2/2")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "next" })).toBeDisabled();
  });

  it("advances to the next highlight's sender on click", async () => {
    const user = userEvent.setup();
    const highlights = [makeKudos("a", "Alice"), makeKudos("b", "Bob")];
    render(<HighlightCarousel highlights={highlights} />);
    expect(screen.getAllByText("Alice").length).toBeGreaterThan(0);
    await user.click(screen.getByRole("button", { name: "next" }));
    expect(screen.getAllByText("Bob").length).toBeGreaterThan(0);
  });

  it("clamps the active index (no crash) when highlights shrink after a filter", async () => {
    const user = userEvent.setup();
    const five = ["a", "b", "c", "d", "e"].map((id) => makeKudos(id, `S-${id}`));
    const { rerender } = render(<HighlightCarousel highlights={five} />);
    // Walk to the last slide (5/5).
    for (let i = 0; i < 4; i++) {
      await user.click(screen.getByRole("button", { name: "next" }));
    }
    expect(screen.getByText("5/5")).toBeInTheDocument();
    // A filter narrows highlights to 2 — the stale index (4) must clamp to 1.
    const two = [makeKudos("a", "S-a"), makeKudos("b", "S-b")];
    rerender(<HighlightCarousel highlights={two} />);
    expect(screen.getByText("2/2")).toBeInTheDocument();
    expect(screen.getAllByText("S-b").length).toBeGreaterThan(0);
    expect(screen.getByRole("button", { name: "next" })).toBeDisabled();
  });
});
