import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { KudosBoard } from "./kudos-board";
import { mockBoardData } from "../mock-data";

vi.mock("next-intl", () => ({
  useTranslations: () => (key: string) => key,
}));

describe("KudosBoard", () => {
  it("renders the three section titles", () => {
    render(<KudosBoard data={mockBoardData} filters={{}} onFilterChange={vi.fn()} />);
    expect(screen.getByText("highlight.title")).toBeInTheDocument();
    expect(screen.getByText("spotlight.title")).toBeInTheDocument();
    expect(screen.getByText("feed.title")).toBeInTheDocument();
  });

  it("renders the sidebar stats and gifts", () => {
    render(<KudosBoard data={mockBoardData} filters={{}} onFilterChange={vi.fn()} />);
    expect(screen.getAllByText("25").length).toBeGreaterThan(0);
    expect(screen.getAllByText("Huỳnh Dương Xuân").length).toBeGreaterThan(0);
  });

  it("merges a hashtag chip click into the existing filters via onFilterChange", async () => {
    const user = userEvent.setup();
    const onFilterChange = vi.fn();
    render(
      <KudosBoard
        data={mockBoardData}
        filters={{ departmentId: "cecv10" }}
        onFilterChange={onFilterChange}
      />,
    );
    await user.click(screen.getAllByText("#Dedicated")[0]);
    expect(onFilterChange).toHaveBeenCalledWith({ departmentId: "cecv10", hashtagId: "dedicated" });
  });

  it("passes onOpenCompose through to the banner", async () => {
    const user = userEvent.setup();
    const onOpenCompose = vi.fn();
    render(
      <KudosBoard
        data={mockBoardData}
        filters={{}}
        onFilterChange={vi.fn()}
        onOpenCompose={onOpenCompose}
      />,
    );
    await user.click(screen.getByText("sendPrompt"));
    expect(onOpenCompose).toHaveBeenCalledTimes(1);
  });
});
