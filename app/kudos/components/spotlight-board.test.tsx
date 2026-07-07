import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { SpotlightBoard } from "./spotlight-board";
import type { SpotlightNode } from "@/lib/kudos/types";

vi.mock("next-intl", () => ({
  useTranslations: () => (key: string, params?: Record<string, unknown>) =>
    params ? `${key}:${JSON.stringify(params)}` : key,
}));

const nodes: SpotlightNode[] = [
  { receiverId: "a", name: "Đỗ hoàng Hiệp", weight: 42, lastReceivedAt: "2025-10-30T13:30:00.000Z" },
  { receiverId: "b", name: "Nguyễn Bá Chức", weight: 20, lastReceivedAt: "2025-10-30T20:30:00.000Z" },
];

describe("SpotlightBoard", () => {
  it("renders the total-kudos header", () => {
    render(<SpotlightBoard totalKudos={388} nodes={nodes} />);
    expect(screen.getByText(/kudosCount/)).toHaveTextContent('{"count":388}');
  });

  it("renders one node per receiver", () => {
    render(<SpotlightBoard totalKudos={388} nodes={nodes} />);
    expect(screen.getByText("Đỗ hoàng Hiệp")).toBeInTheDocument();
    expect(screen.getByText("Nguyễn Bá Chức")).toBeInTheDocument();
  });

  it("shows the empty state when there are no nodes", () => {
    render(<SpotlightBoard totalKudos={0} nodes={[]} />);
    expect(screen.getByText("empty")).toBeInTheDocument();
  });

  it("filters nodes by the search input", async () => {
    const user = userEvent.setup();
    render(<SpotlightBoard totalKudos={388} nodes={nodes} />);
    await user.type(screen.getByPlaceholderText("searchPlaceholder"), "Chức");
    expect(screen.queryByText("Đỗ hoàng Hiệp")).not.toBeInTheDocument();
    expect(screen.getByText("Nguyễn Bá Chức")).toBeInTheDocument();
  });

  it("caps the search input at 100 characters", () => {
    render(<SpotlightBoard totalKudos={388} nodes={nodes} />);
    expect(screen.getByPlaceholderText("searchPlaceholder")).toHaveAttribute("maxLength", "100");
  });

  it("calls onSelectNode when a node is clicked", async () => {
    const user = userEvent.setup();
    const onSelectNode = vi.fn();
    render(<SpotlightBoard totalKudos={388} nodes={nodes} onSelectNode={onSelectNode} />);
    await user.click(screen.getByText("Đỗ hoàng Hiệp"));
    expect(onSelectNode).toHaveBeenCalledWith("a");
  });

  it("toggles the panel between compact (expand affordance) and expanded (collapse affordance)", async () => {
    const user = userEvent.setup();
    render(<SpotlightBoard totalKudos={388} nodes={nodes} />);
    const toggle = screen.getByRole("button", { name: "expand" });
    await user.click(toggle);
    expect(screen.getByRole("button", { name: "collapse" })).toBeInTheDocument();
  });
});
