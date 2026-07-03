import { describe, it, expect } from "vitest";
import { parseEventDate, getCountdown } from "./countdown";

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
