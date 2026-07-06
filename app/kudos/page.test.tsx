import { describe, it, expect, vi, beforeEach } from "vitest";

const mockGetUser = vi.fn();
const mockRedirect = vi.fn((path: string) => {
  throw new Error(`REDIRECT:${path}`);
});
const mockGetBoardData = vi.fn();
const mockIsSupabaseConfigured = vi.fn();

vi.mock("next/navigation", () => ({
  redirect: (path: string) => mockRedirect(path),
}));

vi.mock("@/lib/supabase/server", () => ({
  createClient: async () => ({ auth: { getUser: mockGetUser } }),
}));

vi.mock("@/lib/supabase/config", () => ({
  isSupabaseConfigured: () => mockIsSupabaseConfigured(),
}));

vi.mock("@/lib/kudos/queries", () => ({
  getBoardData: (...args: unknown[]) => mockGetBoardData(...args),
}));

vi.mock("@/app/(home)/fonts", () => ({
  montserrat: { variable: "--font-montserrat" },
  montserratAlternates: { variable: "--font-montserrat-alternates" },
}));

vi.mock("@/app/(home)/components/site-header", () => ({
  SiteHeader: () => null,
}));

vi.mock("@/app/(home)/components/site-footer", () => ({
  SiteFooter: () => null,
}));

vi.mock("./components/kudos-board-container", () => ({
  KudosBoardContainer: () => null,
}));

import KudosPage from "./page";

describe("KudosPage guard (SC1: /kudos auth gate, defense-in-depth)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockIsSupabaseConfigured.mockReturnValue(true);
    mockRedirect.mockImplementation((path: string) => {
      throw new Error(`REDIRECT:${path}`);
    });
  });

  it("redirects to /login when unauthenticated", async () => {
    mockGetUser.mockResolvedValue({ data: { user: null } });

    await expect(KudosPage()).rejects.toThrow("REDIRECT:/login");
    expect(mockRedirect).toHaveBeenCalledWith("/login");
    expect(mockGetBoardData).not.toHaveBeenCalled();
  });

  it("redirects to /login when Supabase is not configured (treated as logged out)", async () => {
    mockIsSupabaseConfigured.mockReturnValue(false);

    await expect(KudosPage()).rejects.toThrow("REDIRECT:/login");
    expect(mockGetUser).not.toHaveBeenCalled();
  });

  it("fetches board data and renders for an authenticated user", async () => {
    mockGetUser.mockResolvedValue({ data: { user: { id: "user-123" } } });
    mockGetBoardData.mockResolvedValue({
      highlights: [],
      feed: [],
      feedNextCursor: null,
      spotlight: { totalKudos: 0, nodes: [] },
      stats: { kudosReceived: 0, kudosSent: 0, heartsReceived: 0 },
      gifts: [],
      hashtags: [],
      departments: [],
    });

    const result = await KudosPage();

    expect(mockRedirect).not.toHaveBeenCalled();
    expect(mockGetBoardData).toHaveBeenCalledWith("user-123");
    expect(result).toBeTruthy();
  });

  it("falls back to an empty board shell instead of crashing when getBoardData throws", async () => {
    mockGetUser.mockResolvedValue({ data: { user: { id: "user-123" } } });
    mockGetBoardData.mockRejectedValue(new Error("supabase down"));

    const result = await KudosPage();

    expect(mockRedirect).not.toHaveBeenCalled();
    expect(result).toBeTruthy();
  });
});
