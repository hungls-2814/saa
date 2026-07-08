import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { FilterBar } from "./filter-bar";

vi.mock("next-intl", () => ({
  useTranslations: () => (key: string) => key,
}));

const hashtags = [
  { id: "dedicated", label: "Dedicated" },
  { id: "inspring", label: "Inspring" },
];
const departments = [{ id: "cecv10", name: "CECV10" }];

describe("FilterBar", () => {
  it("opens the hashtag dropdown and lists options", async () => {
    const user = userEvent.setup();
    render(
      <FilterBar hashtags={hashtags} departments={departments} value={{}} onFilterChange={vi.fn()} />,
    );
    await user.click(screen.getByText("hashtagFilter"));
    expect(screen.getByText("Dedicated")).toBeInTheDocument();
    expect(screen.getByText("Inspring")).toBeInTheDocument();
  });

  it("calls onFilterChange with the hashtagId, preserving the department filter (AND-combined)", async () => {
    const user = userEvent.setup();
    const onFilterChange = vi.fn();
    render(
      <FilterBar
        hashtags={hashtags}
        departments={departments}
        value={{ departmentId: "cecv10" }}
        onFilterChange={onFilterChange}
      />,
    );
    await user.click(screen.getByText("hashtagFilter"));
    await user.click(screen.getByText("Dedicated"));
    expect(onFilterChange).toHaveBeenCalledWith({ departmentId: "cecv10", hashtagId: "dedicated" });
  });

  it("clears the hashtag filter when the 'all' option is selected", async () => {
    const user = userEvent.setup();
    const onFilterChange = vi.fn();
    render(
      <FilterBar
        hashtags={hashtags}
        departments={departments}
        value={{ hashtagId: "dedicated" }}
        onFilterChange={onFilterChange}
      />,
    );
    await user.click(screen.getByText("Dedicated"));
    await user.click(screen.getByText("allHashtags"));
    expect(onFilterChange).toHaveBeenCalledWith({ hashtagId: undefined });
  });

  it("selecting a department calls onFilterChange with the departmentId", async () => {
    const user = userEvent.setup();
    const onFilterChange = vi.fn();
    render(
      <FilterBar hashtags={hashtags} departments={departments} value={{}} onFilterChange={onFilterChange} />,
    );
    await user.click(screen.getByText("departmentFilter"));
    await user.click(screen.getByText("CECV10"));
    expect(onFilterChange).toHaveBeenCalledWith({ departmentId: "cecv10" });
  });
});
