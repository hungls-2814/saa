import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen } from "@testing-library/react";
import { PrelaunchCountdown } from "./prelaunch-countdown";

// Mock next/navigation
const mockReplace = vi.fn();
vi.mock("next/navigation", () => ({
  useRouter: () => ({
    replace: mockReplace,
  }),
}));

// Mock next-intl
vi.mock("next-intl", () => ({
  useTranslations: (namespace: string) => {
    return (key: string) => {
      const translations: Record<string, Record<string, string>> = {
        "Home.hero": {
          days: "DAYS",
          hours: "HOURS",
          minutes: "MINUTES",
        },
      };
      return translations[namespace]?.[key] || key;
    };
  },
}));

// Mock countdown utilities
vi.mock("@/lib/event/countdown", () => ({
  parseEventDate: (iso: string | undefined) => {
    if (!iso) return null;
    const date = new Date(iso);
    return Number.isNaN(date.getTime()) ? null : date;
  },
  getCountdown: (target: Date | null, now: Date) => {
    if (!target) return null;
    const diffMs = target.getTime() - now.getTime();
    if (diffMs <= 0) {
      return { days: 0, hours: 0, minutes: 0, ended: true };
    }
    const totalMinutes = Math.floor(diffMs / 60_000);
    const days = Math.floor(totalMinutes / (24 * 60));
    const hours = Math.floor((totalMinutes % (24 * 60)) / 60);
    const minutes = totalMinutes % 60;
    return { days, hours, minutes, ended: false };
  },
}));

describe("PrelaunchCountdown", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("renders three CountdownUnit components (days, hours, minutes)", () => {
    vi.setSystemTime(new Date("2026-12-24T18:30:00+07:00"));
    render(
      <PrelaunchCountdown targetIso="2026-12-26T20:31:00+07:00" />,
    );

    expect(screen.getByText("DAYS")).toBeInTheDocument();
    expect(screen.getByText("HOURS")).toBeInTheDocument();
    expect(screen.getByText("MINUTES")).toBeInTheDocument();
  });

  it("displays correct zero-padded countdown values before the event", () => {
    vi.setSystemTime(new Date("2026-12-24T18:30:00+07:00"));
    render(
      <PrelaunchCountdown targetIso="2026-12-26T20:31:00+07:00" />,
    );

    // Expected: 2 days, 2 hours, 1 minute
    expect(screen.getAllByText("0")).toHaveLength(3); // tens place of each
    expect(screen.getAllByText("2")).toHaveLength(2); // days + hours ones
    expect(screen.getByText("1")).toBeInTheDocument(); // minutes ones
  });

  it("shows all zeros (00 00 00) when the event has started", () => {
    vi.setSystemTime(new Date("2027-01-01T00:00:00+07:00"));
    render(
      <PrelaunchCountdown targetIso="2026-12-26T18:30:00+07:00" />,
    );

    expect(screen.getAllByText("0")).toHaveLength(6); // All digits are 0
    expect(screen.getByText("DAYS")).toBeInTheDocument();
    expect(screen.getByText("HOURS")).toBeInTheDocument();
    expect(screen.getByText("MINUTES")).toBeInTheDocument();
  });

  it("does NOT redirect when countdown has not ended", () => {
    vi.setSystemTime(new Date("2026-12-24T18:30:00+07:00"));
    render(
      <PrelaunchCountdown targetIso="2026-12-26T20:31:00+07:00" />,
    );

    // Immediately after render with fake timers, effect won't have run yet
    // but the countdown value.ended should be false
    expect(mockReplace).not.toHaveBeenCalled();
  });

  it("calls router.replace when the countdown has ended", () => {
    vi.useRealTimers(); // Use real timers for this test so effects can run

    vi.setSystemTime(new Date("2027-01-01T00:00:00+07:00"));
    render(
      <PrelaunchCountdown targetIso="2026-12-26T18:30:00+07:00" />,
    );

    // With real timers, the effect should run and trigger the redirect
    expect(mockReplace).toHaveBeenCalledWith("/");
  });

  it("immediately redirects when target is in the past", () => {
    vi.useRealTimers();

    vi.setSystemTime(new Date("2026-12-27T00:00:00+07:00"));
    render(
      <PrelaunchCountdown targetIso="2026-12-26T18:30:00+07:00" />,
    );

    expect(mockReplace).toHaveBeenCalledWith("/");
  });

  it("handles undefined targetIso gracefully and shows 00 00 00", () => {
    vi.setSystemTime(new Date("2026-12-24T18:30:00+07:00"));
    render(
      <PrelaunchCountdown targetIso={undefined} />,
    );

    expect(screen.getAllByText("0")).toHaveLength(6);
    expect(screen.getByText("DAYS")).toBeInTheDocument();
  });

  it("treats invalid datetime string as ended and redirects", () => {
    vi.useRealTimers();

    vi.setSystemTime(new Date("2026-12-24T18:30:00+07:00"));
    render(
      <PrelaunchCountdown targetIso="not-a-valid-date" />,
    );

    expect(screen.getAllByText("0")).toHaveLength(6);
    expect(mockReplace).toHaveBeenCalledWith("/");
  });

  it("displays consistent labels across re-renders", () => {
    vi.setSystemTime(new Date("2026-12-24T18:30:00+07:00"));
    const { rerender } = render(
      <PrelaunchCountdown targetIso="2026-12-26T20:31:00+07:00" />,
    );

    expect(screen.getByText("DAYS")).toBeInTheDocument();

    // Re-render with a different target (countdown still running)
    rerender(
      <PrelaunchCountdown targetIso="2026-12-27T20:31:00+07:00" />,
    );

    // Labels should still be present
    expect(screen.getByText("DAYS")).toBeInTheDocument();
    expect(screen.getByText("HOURS")).toBeInTheDocument();
    expect(screen.getByText("MINUTES")).toBeInTheDocument();
  });
});
