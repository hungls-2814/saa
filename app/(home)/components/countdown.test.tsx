import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen } from "@testing-library/react";
import { Countdown } from "./countdown";

vi.mock("next-intl", () => ({
  useTranslations: (namespace: string) => {
    return (key: string) => {
      const translations: Record<string, Record<string, string>> = {
        "Home.hero": {
          comingSoon: "Coming soon",
          days: "DAYS",
          hours: "HOURS",
          minutes: "MINUTES",
        },
      };
      return translations[namespace]?.[key] || key;
    };
  },
}));

describe("Countdown", () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("renders 0-padded days/hours/minutes (one digit per tile) and the Coming soon label before the event", () => {
    vi.setSystemTime(new Date("2026-12-24T18:30:00+07:00"));
    render(<Countdown targetIso="2026-12-26T20:31:00+07:00" />);

    // 2 days, 2 hours, 1 minute -> digits: 0,2 / 0,2 / 0,1
    expect(screen.getByText("Coming soon")).toBeInTheDocument();
    expect(screen.getAllByText("0")).toHaveLength(3); // tens digit of each unit
    expect(screen.getAllByText("2")).toHaveLength(2); // days + hours ones digit
    expect(screen.getByText("1")).toBeInTheDocument(); // minutes ones digit
    expect(screen.getByText("DAYS")).toBeInTheDocument();
    expect(screen.getByText("HOURS")).toBeInTheDocument();
    expect(screen.getByText("MINUTES")).toBeInTheDocument();
  });

  it("shows 00 00 00 (all-zero digit tiles) and hides Coming soon once the event has started", () => {
    vi.setSystemTime(new Date("2027-01-01T00:00:00+07:00"));
    render(<Countdown targetIso="2026-12-26T18:30:00+07:00" />);

    expect(screen.queryByText("Coming soon")).not.toBeInTheDocument();
    expect(screen.getAllByText("0")).toHaveLength(6); // 3 units x 2 digits
  });

  it("falls back to the ended state for an invalid datetime instead of throwing", () => {
    vi.setSystemTime(new Date("2026-12-24T18:30:00+07:00"));
    expect(() =>
      render(<Countdown targetIso="not-a-real-date" />),
    ).not.toThrow();
    expect(screen.queryByText("Coming soon")).not.toBeInTheDocument();
    expect(screen.getAllByText("0")).toHaveLength(6);
  });
});
