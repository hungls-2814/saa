import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { CountdownUnit } from "./countdown-unit";

describe("CountdownUnit", () => {
  it("renders value as zero-padded two-digit string", () => {
    render(<CountdownUnit value={5} label="DAYS" />);

    // 5 should be rendered as "05"
    expect(screen.getByText("0")).toBeInTheDocument();
    expect(screen.getByText("5")).toBeInTheDocument();
    expect(screen.getByText("DAYS")).toBeInTheDocument();
  });

  it("renders zero as two-digit '00'", () => {
    render(<CountdownUnit value={0} label="HOURS" />);

    // Both digits should be 0
    const zeros = screen.getAllByText("0");
    expect(zeros).toHaveLength(2);
    expect(screen.getByText("HOURS")).toBeInTheDocument();
  });

  it("renders two-digit numbers (10-23 for hours, 0-59 for minutes)", () => {
    render(<CountdownUnit value={23} label="HOURS" />);

    // 23 should stay as "23"
    expect(screen.getByText("2")).toBeInTheDocument();
    expect(screen.getByText("3")).toBeInTheDocument();
  });

  it("renders three-digit numbers without truncation", () => {
    render(<CountdownUnit value={365} label="DAYS" />);

    // 365 should still be rendered as "365" (padStart only adds leading zeros,
    // doesn't truncate)
    const digits = screen.queryAllByText(/[0-9]/);
    // Should have 3 digit elements (one for each digit in "365")
    expect(digits.length).toBeGreaterThanOrEqual(3);
  });

  it("clamps negative numbers to zero", () => {
    render(<CountdownUnit value={-5} label="DAYS" />);

    // Negative numbers should be clamped to 0 via Math.max(0, value)
    const zeros = screen.getAllByText("0");
    expect(zeros).toHaveLength(2); // "00"
    expect(screen.getByText("DAYS")).toBeInTheDocument();
  });

  it("renders each digit in its own box (two boxes for two-digit numbers)", () => {
    const { container } = render(
      <CountdownUnit value={12} label="MINUTES" />,
    );

    // Find all digit boxes by their mobile-first base size (they scale up to
    // h-[82px] w-[51px] at the sm: breakpoint — see responsive countdown-unit).
    const digitBoxes = container.querySelectorAll(
      "div.h-\\[60px\\].w-\\[38px\\]",
    );
    expect(digitBoxes).toHaveLength(2); // Two digits
    // Lock in the responsive scale-up so the desktop size can't silently regress.
    digitBoxes.forEach((box) => {
      expect(box.className).toContain("sm:h-[82px]");
      expect(box.className).toContain("sm:w-[51px]");
    });
  });

  it("renders the label text below the digits", () => {
    render(<CountdownUnit value={7} label="DAYS" />);

    const labelElement = screen.getByText("DAYS");
    expect(labelElement).toBeInTheDocument();
    // Label is mobile-first text-lg, scaling to text-2xl at sm:.
    expect(labelElement.className).toContain("text-lg");
    expect(labelElement.className).toContain("sm:text-2xl");
    expect(labelElement.className).toContain("font-bold");
  });

  it("handles uppercase labels correctly", () => {
    render(<CountdownUnit value={42} label="HOURS" />);

    const label = screen.getByText("HOURS");
    expect(label.textContent).toBe("HOURS");
  });

  it("renders individual digits correctly when split from padded string", () => {
    render(<CountdownUnit value={9} label="TEST" />);

    // 9 becomes "09", so we should see both 0 and 9
    expect(screen.getByText("0")).toBeInTheDocument();
    expect(screen.getByText("9")).toBeInTheDocument();
  });
});

