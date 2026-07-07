import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { SidebarStats } from "./sidebar-stats";

vi.mock("next-intl", () => ({
  useTranslations: () => (key: string) => key,
}));

describe("SidebarStats", () => {
  it("renders the received, sent, and hearts-received counts", () => {
    render(<SidebarStats stats={{ kudosReceived: 25, kudosSent: 12, heartsReceived: 7 }} />);
    expect(screen.getByText("25")).toBeInTheDocument();
    expect(screen.getByText("12")).toBeInTheDocument();
    expect(screen.getByText("7")).toBeInTheDocument();
  });

  it("renders a label for each of the three stats", () => {
    render(<SidebarStats stats={{ kudosReceived: 0, kudosSent: 0, heartsReceived: 0 }} />);
    expect(screen.getByText("received")).toBeInTheDocument();
    expect(screen.getByText("sent")).toBeInTheDocument();
    expect(screen.getByText("heartsReceived")).toBeInTheDocument();
  });

  it("renders the Mở Secret Box stub button and fires onOpenSecretBox on click", async () => {
    const user = userEvent.setup();
    const onOpenSecretBox = vi.fn();
    render(
      <SidebarStats
        stats={{ kudosReceived: 0, kudosSent: 0, heartsReceived: 0 }}
        onOpenSecretBox={onOpenSecretBox}
      />,
    );
    await user.click(screen.getByText("openSecretBox"));
    expect(onOpenSecretBox).toHaveBeenCalledTimes(1);
  });

  it("does not throw when onOpenSecretBox is omitted", async () => {
    const user = userEvent.setup();
    render(<SidebarStats stats={{ kudosReceived: 0, kudosSent: 0, heartsReceived: 0 }} />);
    await user.click(screen.getByText("openSecretBox"));
  });
});
