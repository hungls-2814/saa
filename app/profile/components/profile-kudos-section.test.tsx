import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { ProfileKudosSection } from "./profile-kudos-section";
import type { KudosCard as KudosCardType } from "@/lib/kudos/types";

// Matches the fake-`t` convention used across the Kudos component suite
// (e.g. `spotlight-board.test.tsx`): stringifies interpolation params so
// count-aware keys (`toggle.sent`/`toggle.received`) are assertable without
// needing the real `ProfilePage` messages (Track B creates those in
// parallel — this test must not depend on that timing).
vi.mock("next-intl", () => ({
  useTranslations: () => (key: string, params?: Record<string, unknown>) =>
    params ? `${key}:${JSON.stringify(params)}` : key,
}));

// Stub out the real `KudosCard` so this suite verifies *this* component's
// own responsibilities (direction selection, prop wiring) rather than
// re-testing card rendering, which `kudos-card.test.tsx` already covers.
vi.mock("@/app/kudos/components/kudos-card", () => ({
  KudosCard: ({
    kudos,
    onToggleLike,
    onCopyLink,
  }: {
    kudos: KudosCardType;
    onToggleLike?: (id: string) => void;
    onCopyLink?: (id: string) => void;
  }) => (
    <div data-testid={`card-${kudos.id}`}>
      <span>{kudos.id}</span>
      <span data-testid={`haslike-${kudos.id}`}>{String(!!onToggleLike)}</span>
      <button onClick={() => onCopyLink?.(kudos.id)}>{`copy-${kudos.id}`}</button>
    </div>
  ),
}));

function makePerson(fullName: string) {
  return {
    id: fullName,
    fullName,
    department: "D1",
    avatarUrl: "",
    title: "",
    starTier: 0 as const,
    heroBadge: "none" as const,
  };
}

function makeKudos(id: string): KudosCardType {
  return {
    id,
    title: "",
    isAnonymous: false,
    sender: makePerson(`sender-${id}`),
    receiver: makePerson(`receiver-${id}`),
    content: "content",
    createdAt: "2025-10-30T10:00:00.000Z",
    heartCount: 5,
    likedByMe: false,
    hashtags: [],
    images: [],
  };
}

describe("ProfileKudosSection", () => {
  it("defaults to the Sent list and labels the toggle with the sent count", () => {
    const sent = [makeKudos("s1"), makeKudos("s2")];
    const received = [makeKudos("r1")];
    render(<ProfileKudosSection sent={sent} received={received} />);

    expect(screen.getByTestId("card-s1")).toBeInTheDocument();
    expect(screen.getByTestId("card-s2")).toBeInTheDocument();
    expect(screen.queryByTestId("card-r1")).not.toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: 'toggle.sent:{"count":2}' }),
    ).toBeInTheDocument();
  });

  it("switches the rendered list and the toggle label when Received is picked", async () => {
    const user = userEvent.setup();
    const sent = [makeKudos("s1")];
    const received = [makeKudos("r1"), makeKudos("r2")];
    render(<ProfileKudosSection sent={sent} received={received} />);

    await user.click(screen.getByRole("button", { name: 'toggle.sent:{"count":1}' }));
    await user.click(screen.getByRole("option", { name: 'toggle.received:{"count":2}' }));

    expect(screen.queryByTestId("card-s1")).not.toBeInTheDocument();
    expect(screen.getByTestId("card-r1")).toBeInTheDocument();
    expect(screen.getByTestId("card-r2")).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: 'toggle.received:{"count":2}' }),
    ).toBeInTheDocument();

    // And back to Sent again.
    await user.click(screen.getByRole("button", { name: 'toggle.received:{"count":2}' }));
    await user.click(screen.getByRole("option", { name: 'toggle.sent:{"count":1}' }));
    expect(screen.getByTestId("card-s1")).toBeInTheDocument();
    expect(screen.queryByTestId("card-r1")).not.toBeInTheDocument();
  });

  it("shows the direction-specific empty state when the active list is empty", async () => {
    const user = userEvent.setup();
    render(<ProfileKudosSection sent={[]} received={[makeKudos("r1")]} />);

    expect(screen.getByText("empty.sent")).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: 'toggle.sent:{"count":0}' }));
    await user.click(screen.getByRole("option", { name: 'toggle.received:{"count":1}' }));
    expect(screen.queryByText("empty.sent")).not.toBeInTheDocument();
    expect(screen.getByTestId("card-r1")).toBeInTheDocument();
  });

  it("never passes onToggleLike to the cards (read-only, no hearting from profile)", () => {
    const sent = [makeKudos("s1")];
    render(<ProfileKudosSection sent={sent} received={[]} />);
    expect(screen.getByTestId("haslike-s1")).toHaveTextContent("false");
  });

  it("wires onCopyLink to copy the /kudos/:id URL to the clipboard", async () => {
    // `userEvent.setup()` installs its own `navigator.clipboard` stub on
    // first use — call it before (re)installing a controllable spy, or
    // the spy gets silently replaced by jsdom's real no-op implementation.
    const user = userEvent.setup();
    const writeText = vi.fn().mockResolvedValue(undefined);
    Object.defineProperty(navigator, "clipboard", {
      value: { writeText },
      configurable: true,
    });

    const sent = [makeKudos("s1")];
    render(<ProfileKudosSection sent={sent} received={[]} />);

    await user.click(screen.getByText("copy-s1"));
    expect(writeText).toHaveBeenCalledWith(`${window.location.origin}/kudos/s1`);
  });
});
