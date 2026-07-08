import type {
  BoardData,
  DepartmentRef,
  HashtagRef,
  KudosCard,
  KudosPerson,
} from "@/lib/kudos/types";

/**
 * Standalone mock payload for the `/kudos` board, extracted verbatim from the
 * MoMorph design (Sun* Kudos - Live board, `MaZUn5xHXZ`) — sender/receiver
 * names, department codes, honorific titles, content, hashtags, spotlight
 * names, stats and gift rows all come from the design's own sample content.
 * Avatars use a stable `pravatar.cc` placeholder per person/gift (seeded by
 * name slug) so `Avatar` (see `components/avatar.tsx`) has something to
 * render in standalone/mock/test contexts — real Sunners get their actual
 * `avatar_url` from Supabase via Track B's query layer.
 *
 * Track B's real query layer produces the same `BoardData` shape from
 * Supabase — this file only exists so the presentational components can be
 * developed/previewed without a backend.
 */

function pravatarUrl(seed: string): string {
  return `https://i.pravatar.cc/150?u=${seed}`;
}

const hashtags: HashtagRef[] = [
  { id: "dedicated", label: "Dedicated" },
  { id: "inspring", label: "Inspring" },
];

const departments: DepartmentRef[] = [{ id: "cecv10", name: "CECV10" }];

function person(
  fullName: string,
  title: string,
  starTier: KudosPerson["starTier"],
): KudosPerson {
  const slug = fullName.toLowerCase().replace(/\s+/g, "-");
  return {
    id: slug,
    fullName,
    department: "CECV10",
    avatarUrl: pravatarUrl(slug),
    title,
    starTier,
  };
}

const nhat = person("Huỳnh Dương Xuân Nhật", "New Hero", 1);
const xuan = person("Huỳnh Dương Xuân", "Legend Hero", 3);
const rising = person("Huỳnh Dương Xuân Nhật", "Rising Hero", 2);
const superHero = person("Huỳnh Dương Xuân Nhật", "Super Hero", 3);

const CONTENT =
  "Cảm ơn người em bình thường nhưng phi thường :D Cảm ơn sự chăm chỉ, cần mẫn của em đã tạo động lực rất nhiều cho team, để luôn nhắc mình luôn phải nỗ lực hơn nữa trong công việc. <3 cuộc sống...";

const IMAGES = ["gallery-1", "gallery-2", "gallery-3", "gallery-4", "gallery-5"];

function kudos(
  id: string,
  sender: KudosPerson,
  receiver: KudosPerson,
  createdAt: string,
  heartCount: number,
  images: string[] = [],
): KudosCard {
  return {
    id,
    sender,
    receiver,
    content: CONTENT,
    createdAt,
    heartCount,
    likedByMe: false,
    hashtags,
    images,
  };
}

export const mockHighlights: KudosCard[] = [
  kudos("hl-1", nhat, xuan, "2025-10-30T10:00:00.000Z", 1000),
  kudos("hl-2", rising, xuan, "2025-10-30T10:00:00.000Z", 1000),
  kudos("hl-3", superHero, xuan, "2025-10-30T10:00:00.000Z", 1000),
];

export const mockFeed: KudosCard[] = [
  kudos("fd-1", nhat, xuan, "2025-10-30T10:00:00.000Z", 1000, IMAGES),
  kudos("fd-2", rising, xuan, "2025-10-30T10:00:00.000Z", 1000, IMAGES),
  kudos("fd-3", superHero, xuan, "2025-10-30T10:00:00.000Z", 1000, IMAGES),
  kudos("fd-4", nhat, xuan, "2025-10-30T10:00:00.000Z", 1000, IMAGES),
];

/** Names + relative weights extracted from the Spotlight word-cloud
 * (`B.7_Spotlight`) — the design repeats each name many times at varying
 * sizes to simulate density; weights below are illustrative mock values,
 * not a literal per-occurrence count. */
export const mockSpotlightNodes = [
  { receiverId: "do-hoang-hiep", name: "Đỗ hoàng Hiệp", weight: 42, lastReceivedAt: "2025-10-30T13:30:00.000Z" },
  { receiverId: "nguyen-ba-chuc", name: "Nguyễn Bá Chức", weight: 38, lastReceivedAt: "2025-10-30T20:30:00.000Z" },
  { receiverId: "duong-thuy-an", name: "Dương thúy An", weight: 35, lastReceivedAt: "2025-10-30T12:15:00.000Z" },
  { receiverId: "mai-phuong-thuy", name: "Mai phương Thúy", weight: 33, lastReceivedAt: "2025-10-30T09:45:00.000Z" },
  { receiverId: "le-kieu-trang", name: "Lê Kiều Trang", weight: 30, lastReceivedAt: "2025-10-30T16:20:00.000Z" },
  { receiverId: "nguyen-van-quy", name: "Nguyễn Văn Quy", weight: 27, lastReceivedAt: "2025-10-30T11:05:00.000Z" },
  { receiverId: "nguyen-hoang-linh", name: "Nguyễn Hoàng Linh", weight: 24, lastReceivedAt: "2025-10-30T14:50:00.000Z" },
];

export const mockGifts = [
  { id: "gift-1", recipientName: "Huỳnh Dương Xuân", recipientAvatarUrl: pravatarUrl("gift-1"), description: "Nhận được 1 áo phông SAA", awardedAt: "2025-10-30T20:30:00.000Z" },
  { id: "gift-2", recipientName: "Huỳnh Dương Xuân", recipientAvatarUrl: pravatarUrl("gift-2"), description: "Nhận được 1 áo phông SAA", awardedAt: "2025-10-30T19:10:00.000Z" },
  { id: "gift-3", recipientName: "Huỳnh Dương Xuân", recipientAvatarUrl: pravatarUrl("gift-3"), description: "Nhận được 1 áo phông SAA", awardedAt: "2025-10-30T18:00:00.000Z" },
  { id: "gift-4", recipientName: "Huỳnh Dương Xuân", recipientAvatarUrl: pravatarUrl("gift-4"), description: "Nhận được 1 áo phông SAA", awardedAt: "2025-10-30T17:40:00.000Z" },
  { id: "gift-5", recipientName: "Huỳnh Dương Xuân", recipientAvatarUrl: pravatarUrl("gift-5"), description: "Nhận được 1 áo phông SAA", awardedAt: "2025-10-30T16:25:00.000Z" },
];

/** Full mock `BoardData` payload — matches the design's sample values
 * (388 total kudos, 25/25/25 + 25/25 secret-box sidebar stats). */
export const mockBoardData: BoardData = {
  highlights: mockHighlights,
  feed: mockFeed,
  feedNextCursor: "mock-cursor-2",
  spotlight: {
    totalKudos: 388,
    nodes: mockSpotlightNodes,
  },
  stats: {
    kudosReceived: 25,
    kudosSent: 25,
    heartsReceived: 25,
    secretBoxOpened: 25,
    secretBoxUnopened: 25,
  },
  gifts: mockGifts,
  hashtags,
  departments,
};
