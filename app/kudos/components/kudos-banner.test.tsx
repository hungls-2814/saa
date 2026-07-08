import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { KudosBanner } from "./kudos-banner";

vi.mock("next-intl", () => ({
  useTranslations: () => (key: string) => key,
}));

describe("KudosBanner", () => {
  it("renders the KUDOS wordmark", () => {
    render(<KudosBanner />);
    expect(screen.getByText("KUDOS")).toBeInTheDocument();
  });

  it("calls onOpenCompose when the send-kudos pill is clicked", async () => {
    const user = userEvent.setup();
    const onOpenCompose = vi.fn();
    render(<KudosBanner onOpenCompose={onOpenCompose} />);
    await user.click(screen.getByText("sendPrompt"));
    expect(onOpenCompose).toHaveBeenCalledTimes(1);
  });

  it("calls onSearchSunner when the search pill is clicked", async () => {
    const user = userEvent.setup();
    const onSearchSunner = vi.fn();
    render(<KudosBanner onSearchSunner={onSearchSunner} />);
    await user.click(screen.getByText("searchSunner"));
    expect(onSearchSunner).toHaveBeenCalledTimes(1);
  });

  it("does not throw when callbacks are omitted", async () => {
    const user = userEvent.setup();
    render(<KudosBanner />);
    await user.click(screen.getByText("sendPrompt"));
    await user.click(screen.getByText("searchSunner"));
  });
});
