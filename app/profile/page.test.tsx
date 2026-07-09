import { describe, it, expect, vi, beforeEach } from "vitest";

const mockGetUser = vi.fn();
const mockRedirect = vi.fn((path: string) => {
  throw new Error(`REDIRECT:${path}`);
});
const mockGetPerUserStats = vi.fn();
const mockGetMyProfileHeader = vi.fn();
const mockGetKudosByUser = vi.fn();
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
  getPerUserStats: (...args: unknown[]) => mockGetPerUserStats(...args),
}));

vi.mock("@/lib/kudos/queries-profile", () => ({
  getMyProfileHeader: (...args: unknown[]) => mockGetMyProfileHeader(...args),
  getKudosByUser: (...args: unknown[]) => mockGetKudosByUser(...args),
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

vi.mock("./components/profile-header", () => ({
  ProfileHeader: () => null,
}));

vi.mock("./components/profile-kudos-section", () => ({
  ProfileKudosSection: () => null,
}));

vi.mock("@/app/kudos/components/sidebar-stats", () => ({
  SidebarStats: () => null,
}));

import ProfilePage from "./page";

describe("ProfilePage guard (SC2: /profile auth gate, defense-in-depth)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockIsSupabaseConfigured.mockReturnValue(true);
    mockRedirect.mockImplementation((path: string) => {
      throw new Error(`REDIRECT:${path}`);
    });
  });

  it("redirects to /login when unauthenticated", async () => {
    mockGetUser.mockResolvedValue({ data: { user: null } });

    await expect(ProfilePage()).rejects.toThrow("REDIRECT:/login");
    expect(mockRedirect).toHaveBeenCalledWith("/login");
    expect(mockGetMyProfileHeader).not.toHaveBeenCalled();
    expect(mockGetPerUserStats).not.toHaveBeenCalled();
    expect(mockGetKudosByUser).not.toHaveBeenCalled();
  });

  it("redirects to /login when Supabase is not configured (treated as logged out)", async () => {
    mockIsSupabaseConfigured.mockReturnValue(false);

    await expect(ProfilePage()).rejects.toThrow("REDIRECT:/login");
    expect(mockGetUser).not.toHaveBeenCalled();
  });

  it("fetches profile data concurrently and renders for an authenticated user", async () => {
    mockGetUser.mockResolvedValue({ data: { user: { id: "user-123" } } });
    mockGetMyProfileHeader.mockResolvedValue({
      fullName: "John Doe",
      avatarUrl: "https://example.com/avatar.jpg",
      department: "Engineering",
      starTier: 2,
      heroBadge: "diamond",
    });
    mockGetPerUserStats.mockResolvedValue({
      kudosReceived: 10,
      kudosSent: 5,
      heartsReceived: 3,
      secretBoxOpened: 0,
      secretBoxUnopened: 0,
    });
    mockGetKudosByUser.mockResolvedValue([]);

    const result = await ProfilePage();

    expect(mockRedirect).not.toHaveBeenCalled();
    expect(mockGetMyProfileHeader).toHaveBeenCalledWith("user-123");
    expect(mockGetPerUserStats).toHaveBeenCalledWith("user-123");
    expect(mockGetKudosByUser).toHaveBeenCalledWith({ userId: "user-123", direction: "sent" });
    expect(mockGetKudosByUser).toHaveBeenCalledWith({ userId: "user-123", direction: "received" });
    expect(result).toBeTruthy();
  });

  it("falls back to empty profile data instead of crashing when profile queries throw", async () => {
    mockGetUser.mockResolvedValue({ data: { user: { id: "user-456" } } });
    mockGetMyProfileHeader.mockRejectedValue(new Error("supabase down"));
    mockGetPerUserStats.mockRejectedValue(new Error("supabase down"));
    mockGetKudosByUser.mockRejectedValue(new Error("supabase down"));

    const result = await ProfilePage();

    expect(mockRedirect).not.toHaveBeenCalled();
    expect(result).toBeTruthy();
  });
});
