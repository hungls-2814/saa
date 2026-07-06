import { describe, it, expect, vi, afterEach } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { KudosToast } from "./kudos-toast";

describe("KudosToast", () => {
  afterEach(() => {
    vi.useRealTimers();
  });

  it("renders nothing when message is null", () => {
    const { container } = render(<KudosToast message={null} onDismiss={vi.fn()} />);
    expect(container).toBeEmptyDOMElement();
  });

  it("renders the message with an alert role when set", () => {
    render(<KudosToast message="Link copied — ready to share!" onDismiss={vi.fn()} />);
    expect(screen.getByRole("alert")).toHaveTextContent("Link copied — ready to share!");
  });

  it("calls onDismiss when the close button is clicked", async () => {
    const user = userEvent.setup();
    const onDismiss = vi.fn();
    render(<KudosToast message="Something went wrong." onDismiss={onDismiss} />);

    await user.click(screen.getByLabelText("Close"));
    expect(onDismiss).toHaveBeenCalledTimes(1);
  });

  it("auto-dismisses after the timeout elapses", () => {
    vi.useFakeTimers();
    const onDismiss = vi.fn();
    render(<KudosToast message="Auto dismiss me" onDismiss={onDismiss} />);

    expect(onDismiss).not.toHaveBeenCalled();
    vi.advanceTimersByTime(4000);
    expect(onDismiss).toHaveBeenCalledTimes(1);
  });

  it("clears the previous timer when the message changes before it fires", () => {
    vi.useFakeTimers();
    const onDismiss = vi.fn();
    const { rerender } = render(<KudosToast message="first" onDismiss={onDismiss} />);

    vi.advanceTimersByTime(2000);
    rerender(<KudosToast message="second" onDismiss={onDismiss} />);
    vi.advanceTimersByTime(2000);
    // Only 2s have elapsed since "second" was set — the first timer must not fire late.
    expect(onDismiss).not.toHaveBeenCalled();

    vi.advanceTimersByTime(2000);
    expect(onDismiss).toHaveBeenCalledTimes(1);
  });
});
