import { describe, it, expect, afterEach } from "vitest";
import {
  parseEventDate,
  getCountdown,
  resolveEventTarget,
  resolveEventTargetIso,
  isBeforeLaunch,
  DEFAULT_EVENT_DATETIME,
} from "./countdown";

describe("parseEventDate", () => {
  it("parses a valid ISO-8601 datetime", () => {
    const result = parseEventDate("2026-12-26T18:30:00+07:00");
    expect(result).toBeInstanceOf(Date);
    expect(result?.toISOString()).toBe("2026-12-26T11:30:00.000Z");
  });

  it("returns null for undefined input", () => {
    expect(parseEventDate(undefined)).toBeNull();
  });

  it("returns null for an empty string", () => {
    expect(parseEventDate("")).toBeNull();
  });

  it("returns null for an invalid datetime string", () => {
    expect(parseEventDate("invalid-format")).toBeNull();
  });
});

describe("getCountdown", () => {
  it("returns null when target is null", () => {
    expect(getCountdown(null, new Date())).toBeNull();
  });

  it("computes days/hours/minutes remaining before the event", () => {
    const now = new Date("2026-12-24T18:30:00+07:00");
    const target = new Date("2026-12-26T20:31:00+07:00");
    const result = getCountdown(target, now);
    expect(result).toEqual({ days: 2, hours: 2, minutes: 1, ended: false });
  });

  it("marks ended=true and zeros out the fields when now equals target", () => {
    const target = new Date("2026-12-26T18:30:00+07:00");
    const result = getCountdown(target, target);
    expect(result).toEqual({ days: 0, hours: 0, minutes: 0, ended: true });
  });

  it("marks ended=true when now is after target", () => {
    const target = new Date("2026-12-26T18:30:00+07:00");
    const now = new Date("2027-01-01T00:00:00+07:00");
    const result = getCountdown(target, now);
    expect(result).toEqual({ days: 0, hours: 0, minutes: 0, ended: true });
  });

  it("floors partial minutes rather than rounding", () => {
    const now = new Date("2026-12-26T18:29:59+07:00");
    const target = new Date("2026-12-26T18:30:00+07:00");
    const result = getCountdown(target, now);
    // Less than 1 minute remaining but still before target -> not ended, 0 minutes.
    expect(result).toEqual({ days: 0, hours: 0, minutes: 0, ended: false });
  });
});

describe("resolveEventTarget", () => {
  afterEach(() => {
    delete process.env.NEXT_PUBLIC_EVENT_DATETIME;
  });

  it("uses NEXT_PUBLIC_EVENT_DATETIME when set and valid", () => {
    process.env.NEXT_PUBLIC_EVENT_DATETIME = "2030-01-02T03:04:00+07:00";
    expect(resolveEventTarget()?.toISOString()).toBe(
      "2030-01-01T20:04:00.000Z",
    );
  });

  it("falls back to DEFAULT_EVENT_DATETIME when the env var is unset", () => {
    delete process.env.NEXT_PUBLIC_EVENT_DATETIME;
    expect(resolveEventTarget()?.toISOString()).toBe(
      parseEventDate(DEFAULT_EVENT_DATETIME)?.toISOString(),
    );
  });

  it("falls back to DEFAULT_EVENT_DATETIME when the env var is invalid", () => {
    process.env.NEXT_PUBLIC_EVENT_DATETIME = "not-a-date";
    expect(resolveEventTarget()?.toISOString()).toBe(
      parseEventDate(DEFAULT_EVENT_DATETIME)?.toISOString(),
    );
  });
});

describe("resolveEventTargetIso", () => {
  afterEach(() => {
    delete process.env.NEXT_PUBLIC_EVENT_DATETIME;
  });

  it("returns the resolved target as an ISO string from a valid env value", () => {
    process.env.NEXT_PUBLIC_EVENT_DATETIME = "2030-01-02T03:04:00+07:00";
    expect(resolveEventTargetIso()).toBe("2030-01-01T20:04:00.000Z");
  });

  it("falls back to DEFAULT (parse-aware) for an invalid env value — matching the gate", () => {
    process.env.NEXT_PUBLIC_EVENT_DATETIME = "";
    // Must NOT return the raw "" the page would otherwise treat as ended: it
    // resolves to the same instant the middleware gate uses, so no split-brain.
    expect(resolveEventTargetIso()).toBe(
      parseEventDate(DEFAULT_EVENT_DATETIME)?.toISOString(),
    );
  });
});

describe("isBeforeLaunch", () => {
  it("returns true when now is before the target", () => {
    const target = new Date("2026-12-26T18:30:00+07:00");
    expect(isBeforeLaunch(new Date("2026-12-26T18:29:59+07:00"), target)).toBe(
      true,
    );
  });

  it("returns false when now equals the target (launch moment)", () => {
    const target = new Date("2026-12-26T18:30:00+07:00");
    expect(isBeforeLaunch(target, target)).toBe(false);
  });

  it("returns false when now is after the target", () => {
    const target = new Date("2026-12-26T18:30:00+07:00");
    expect(isBeforeLaunch(new Date("2027-01-01T00:00:00+07:00"), target)).toBe(
      false,
    );
  });

  it("fails open (false) when the target is unresolvable", () => {
    expect(isBeforeLaunch(new Date(), null)).toBe(false);
  });
});
