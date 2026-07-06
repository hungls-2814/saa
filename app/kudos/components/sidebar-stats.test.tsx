import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
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
});
