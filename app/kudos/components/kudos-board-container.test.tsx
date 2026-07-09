import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { KudosBoardContainer } from "./kudos-board-container";
import { mockBoardData } from "../mock-data";

vi.mock("next-intl", () => ({
  useTranslations: () => (key: string) => key,
}));

vi.mock("@/lib/kudos/actions", () => ({
  applyFiltersAction: vi.fn(),
  toggleHeartAction: vi.fn(),
}));

vi.mock("./use-kudos-feed", () => ({
  useKudosFeed: vi.fn(() => ({ loadMore: vi.fn() })),
}));

vi.mock("next/navigation", () => ({
  useRouter: () => ({ refresh: vi.fn() }),
}));

// The compose modal has its own dedicated tests; stub it here so these board
// tests don't pull in the Supabase browser client / file-input wiring.
vi.mock("./compose-kudos-container", () => ({
  ComposeKudosContainer: () => null,
}));

import { applyFiltersAction, toggleHeartAction } from "@/lib/kudos/actions";

const mockApplyFiltersAction = vi.mocked(applyFiltersAction);
const mockToggleHeartAction = vi.mocked(toggleHeartAction);

// mockBoardData's highlight/feed cards all start at heartCount 1000, which
// `formatHeartCount` renders as "1.000" (vi-VN thousands separator).
const ORIGINAL_COUNT_TEXT = "1.000";

const writeText = vi.fn().mockResolvedValue(undefined);

async function clickFirstLikeButton() {
  const user = userEvent.setup();
  const [likeButton] = screen.getAllByRole("button", { name: ORIGINAL_COUNT_TEXT });
  await user.click(likeButton);
}

async function selectFirstHashtagFilterOption() {
  const user = userEvent.setup();
  await user.click(screen.getByText("hashtagFilter"));
  await user.click(await screen.findByText("Dedicated"));
}

/**
 * `userEvent.setup()` installs its own `navigator.clipboard` stub the first
 * time it runs in a test — calling it AFTER this stub would silently
 * replace `writeText` with jsdom's real (no-op) implementation. Every
 * "copy link" test therefore calls `userEvent.setup()` first via this
 * helper, then (re)installs the controllable `writeText` spy.
 */
function setupClipboardUser() {
  const user = userEvent.setup();
  Object.defineProperty(navigator, "clipboard", {
    value: { writeText },
    configurable: true,
  });
  return user;
}

describe("KudosBoardContainer", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    writeText.mockResolvedValue(undefined);
  });

  it("renders the board with the initial SSR data", () => {
    render(<KudosBoardContainer initialData={mockBoardData} currentUserId="me" />);
    expect(screen.getAllByText("Huỳnh Dương Xuân Nhật").length).toBeGreaterThan(0);
  });

  describe("like toggle", () => {
    it("optimistically flips the heart then reconciles with the action result", async () => {
      mockToggleHeartAction.mockResolvedValue({ ok: true, liked: true, heartCount: 1001 });
      render(<KudosBoardContainer initialData={mockBoardData} currentUserId="me" />);

      await clickFirstLikeButton();

      // The highlight carousel's active card (hl-1) renders first in DOM order.
      await waitFor(() => expect(mockToggleHeartAction).toHaveBeenCalledWith("hl-1"));
      await waitFor(() => expect(screen.getAllByText("1.001").length).toBeGreaterThan(0));
    });

    it("reverts the optimistic update and shows a toast on self-like failure", async () => {
      mockToggleHeartAction.mockResolvedValue({ ok: false, error: "self_like" });
      render(<KudosBoardContainer initialData={mockBoardData} currentUserId="me" />);

      await clickFirstLikeButton();

      await waitFor(() => expect(screen.getByRole("alert")).toHaveTextContent("selfLike"));
      // Reverted back to the original count, not the optimistic +1.
      expect(screen.getAllByText(ORIGINAL_COUNT_TEXT).length).toBeGreaterThan(0);
    });

    it("shows a generic error toast and reverts when the action throws", async () => {
      mockToggleHeartAction.mockRejectedValue(new Error("network down"));
      render(<KudosBoardContainer initialData={mockBoardData} currentUserId="me" />);

      await clickFirstLikeButton();

      await waitFor(() => expect(screen.getByRole("alert")).toHaveTextContent("error"));
      expect(screen.getAllByText(ORIGINAL_COUNT_TEXT).length).toBeGreaterThan(0);
    });

    it("ignores a second click on the same card while the first toggle is in flight", async () => {
      let resolveToggle: (value: { ok: true; liked: boolean; heartCount: number }) => void;
      mockToggleHeartAction.mockImplementationOnce(
        () =>
          new Promise((resolve) => {
            resolveToggle = resolve;
          }),
      );
      const user = userEvent.setup();
      render(<KudosBoardContainer initialData={mockBoardData} currentUserId="me" />);

      const [likeButton] = screen.getAllByRole("button", { name: ORIGINAL_COUNT_TEXT });
      await user.click(likeButton);
      await user.click(likeButton);

      resolveToggle!({ ok: true, liked: true, heartCount: 1001 });
      await waitFor(() => expect(screen.getAllByText("1.001").length).toBeGreaterThan(0));
      expect(mockToggleHeartAction).toHaveBeenCalledTimes(1);
    });
  });

  describe("filter change", () => {
    it("replaces highlights and feed on a successful apply-filters call", async () => {
      mockApplyFiltersAction.mockResolvedValue({ ok: true, highlights: [], feed: [], nextCursor: null });
      render(<KudosBoardContainer initialData={mockBoardData} currentUserId="me" />);

      await selectFirstHashtagFilterOption();

      await waitFor(() =>
        expect(mockApplyFiltersAction).toHaveBeenCalledWith({ hashtagId: "dedicated" }),
      );
      await waitFor(() => expect(screen.getAllByText("empty").length).toBeGreaterThan(0));
    });

    it("shows an error toast when apply-filters fails", async () => {
      mockApplyFiltersAction.mockResolvedValue({ ok: false, error: "unauthenticated" });
      render(<KudosBoardContainer initialData={mockBoardData} currentUserId="me" />);

      await selectFirstHashtagFilterOption();

      await waitFor(() => expect(screen.getByRole("alert")).toHaveTextContent("error"));
    });
  });

  describe("copy link", () => {
    it("copies the kudos URL to the clipboard and shows a success toast", async () => {
      const user = setupClipboardUser();
      render(<KudosBoardContainer initialData={mockBoardData} currentUserId="me" />);

      const [copyButton] = screen.getAllByText("copyLink");
      await user.click(copyButton);

      await waitFor(() =>
        expect(writeText).toHaveBeenCalledWith(expect.stringContaining("/kudos/hl-1")),
      );
      await waitFor(() => expect(screen.getByRole("alert")).toHaveTextContent("copyLinkSuccess"));
    });

    it("shows an error toast when the clipboard write rejects", async () => {
      const user = setupClipboardUser();
      writeText.mockRejectedValueOnce(new Error("denied"));
      render(<KudosBoardContainer initialData={mockBoardData} currentUserId="me" />);

      const [copyButton] = screen.getAllByText("copyLink");
      await user.click(copyButton);

      await waitFor(() => expect(screen.getByRole("alert")).toHaveTextContent("error"));
    });
  });

  describe("Mở Secret Box stub", () => {
    it("shows a coming-soon toast — the Secret Box dialog itself is out of scope", async () => {
      const user = userEvent.setup();
      render(<KudosBoardContainer initialData={mockBoardData} currentUserId="me" />);

      await user.click(screen.getByText("openSecretBox"));

      await waitFor(() =>
        expect(screen.getByRole("alert")).toHaveTextContent("secretBoxComingSoon"),
      );
    });
  });
});
