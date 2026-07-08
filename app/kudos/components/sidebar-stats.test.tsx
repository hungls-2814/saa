import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import type { PerUserStats } from "@/lib/kudos/types";
import { SidebarStats } from "./sidebar-stats";

vi.mock("next-intl", () => ({
  useTranslations: () => (key: string) => key,
}));

const emptyStats: PerUserStats = {
  kudosReceived: 0,
  kudosSent: 0,
  heartsReceived: 0,
  secretBoxOpened: 0,
  secretBoxUnopened: 0,
};

describe("SidebarStats", () => {
  it("renders every stat count, including the two Secret Box counters", () => {
    render(
      <SidebarStats
        stats={{
          kudosReceived: 25,
          kudosSent: 12,
          heartsReceived: 7,
          secretBoxOpened: 3,
          secretBoxUnopened: 9,
        }}
      />,
    );
    expect(screen.getByText("25")).toBeInTheDocument();
    expect(screen.getByText("12")).toBeInTheDocument();
    expect(screen.getByText("7")).toBeInTheDocument();
    expect(screen.getByText("3")).toBeInTheDocument();
    expect(screen.getByText("9")).toBeInTheDocument();
  });

  it("renders a label for each of the five stats", () => {
    render(<SidebarStats stats={emptyStats} />);
    expect(screen.getByText("received")).toBeInTheDocument();
    expect(screen.getByText("sent")).toBeInTheDocument();
    expect(screen.getByText("heartsReceived")).toBeInTheDocument();
    expect(screen.getByText("secretBoxOpened")).toBeInTheDocument();
    expect(screen.getByText("secretBoxUnopened")).toBeInTheDocument();
  });

  it("renders the Mở Secret Box stub button and fires onOpenSecretBox on click", async () => {
    const user = userEvent.setup();
    const onOpenSecretBox = vi.fn();
    render(<SidebarStats stats={emptyStats} onOpenSecretBox={onOpenSecretBox} />);
    await user.click(screen.getByText("openSecretBox"));
    expect(onOpenSecretBox).toHaveBeenCalledTimes(1);
  });

  it("does not throw when onOpenSecretBox is omitted", async () => {
    const user = userEvent.setup();
    render(<SidebarStats stats={emptyStats} />);
    await user.click(screen.getByText("openSecretBox"));
  });
});
