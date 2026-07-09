import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderHook, waitFor } from "@testing-library/react";
import { useKudosFeed } from "./use-kudos-feed";
import type { KudosCard } from "@/lib/kudos/types";

vi.mock("@/lib/kudos/actions", () => ({
  loadMoreFeedAction: vi.fn(),
}));

import { loadMoreFeedAction } from "@/lib/kudos/actions";

const mockLoadMoreFeedAction = vi.mocked(loadMoreFeedAction);

const CARD: KudosCard = {
  id: "fd-5",
  title: "",
  isAnonymous: false,
  sender: { id: "s", fullName: "S", department: "D", avatarUrl: "", title: "", starTier: 0, heroBadge: "none" },
  receiver: { id: "r", fullName: "R", department: "D", avatarUrl: "", title: "", starTier: 0, heroBadge: "none" },
  content: "c",
  createdAt: "2025-10-30T10:00:00.000Z",
  heartCount: 0,
  likedByMe: false,
  hashtags: [],
  images: [],
};

describe("useKudosFeed", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("does nothing when cursor is null (no more pages)", async () => {
    const onAppend = vi.fn();
    const onError = vi.fn();
    const { result } = renderHook(() => useKudosFeed({ onAppend, onError }));

    await result.current.loadMore(null, {});

    expect(mockLoadMoreFeedAction).not.toHaveBeenCalled();
    expect(onAppend).not.toHaveBeenCalled();
  });

  it("appends the fetched page and advances the cursor on success", async () => {
    mockLoadMoreFeedAction.mockResolvedValue({ ok: true, items: [CARD], nextCursor: "next-1" });
    const onAppend = vi.fn();
    const onError = vi.fn();
    const { result } = renderHook(() => useKudosFeed({ onAppend, onError }));

    await result.current.loadMore("cursor-0", { hashtagId: "dedicated" });

    expect(mockLoadMoreFeedAction).toHaveBeenCalledWith({
      cursor: "cursor-0",
      filter: { hashtagId: "dedicated" },
    });
    expect(onAppend).toHaveBeenCalledWith([CARD], "next-1");
    expect(onError).not.toHaveBeenCalled();
  });

  it("calls onError when the action returns a typed failure", async () => {
    mockLoadMoreFeedAction.mockResolvedValue({ ok: false, error: "invalid_cursor", nextCursor: null });
    const onAppend = vi.fn();
    const onError = vi.fn();
    const { result } = renderHook(() => useKudosFeed({ onAppend, onError }));

    await result.current.loadMore("bad-cursor", {});

    expect(onAppend).not.toHaveBeenCalled();
    expect(onError).toHaveBeenCalledTimes(1);
  });

  it("calls onError when the action throws", async () => {
    mockLoadMoreFeedAction.mockRejectedValue(new Error("network down"));
    const onAppend = vi.fn();
    const onError = vi.fn();
    const { result } = renderHook(() => useKudosFeed({ onAppend, onError }));

    await result.current.loadMore("cursor-0", {});

    expect(onAppend).not.toHaveBeenCalled();
    expect(onError).toHaveBeenCalledTimes(1);
  });

  it("drops a second call while the first is still in flight (double-click guard)", async () => {
    let resolveFirst: (value: { ok: true; items: KudosCard[]; nextCursor: string | null }) => void;
    mockLoadMoreFeedAction.mockImplementationOnce(
      () =>
        new Promise((resolve) => {
          resolveFirst = resolve;
        }),
    );
    const onAppend = vi.fn();
    const onError = vi.fn();
    const { result } = renderHook(() => useKudosFeed({ onAppend, onError }));

    const first = result.current.loadMore("cursor-0", {});
    const second = result.current.loadMore("cursor-0", {});

    resolveFirst!({ ok: true, items: [CARD], nextCursor: null });
    await Promise.all([first, second]);

    expect(mockLoadMoreFeedAction).toHaveBeenCalledTimes(1);
    expect(onAppend).toHaveBeenCalledTimes(1);
  });

  it("allows a new load-more once the previous one has settled", async () => {
    mockLoadMoreFeedAction.mockResolvedValue({ ok: true, items: [CARD], nextCursor: "next-2" });
    const onAppend = vi.fn();
    const onError = vi.fn();
    const { result } = renderHook(() => useKudosFeed({ onAppend, onError }));

    await result.current.loadMore("cursor-0", {});
    await result.current.loadMore("next-2", {});

    await waitFor(() => expect(mockLoadMoreFeedAction).toHaveBeenCalledTimes(2));
  });
});
