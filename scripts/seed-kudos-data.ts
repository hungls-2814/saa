/**
 * Static seed content for scripts/seed-kudos.ts.
 *
 * The first 8 Sunners (names, departments, hashtags, the thank-you message,
 * the gift description) are drawn verbatim/near-verbatim from the MoMorph
 * design (screen MaZUn5xHXZ / figma node 2940:13431). The remaining Sunners
 * are deterministically-generated fakes whose only purpose is to give the
 * Spotlight board a dense, design-like word-cloud (one node per distinct
 * receiver). Identity keys (email / avatar `u=`) are index-based so they are
 * guaranteed unique and the seed stays idempotent across re-runs.
 */

export type SeedSunner = {
  email: string;
  fullName: string;
  avatarUrl: string;
  departmentName: string;
  title: string;
};

export const DEPARTMENTS = ["CECV2", "CEVC10", "DXC1", "QAQC2"] as const;
export const HASHTAGS = ["Dedicated", "Inspring", "IDOL GIỚI TRẺ"] as const;
const TITLES = ["New Hero", "Rising Hero", "Super Hero", "Legend Hero"] as const;

export const THANK_YOU_CONTENT =
  "Cảm ơn người em bình thường nhưng phi thường :D Cảm ơn sự chăm chỉ, cần mẫn của " +
  "em đã tạo động lực rất nhiều cho team, để luôn nhắc mình luôn phải nỗ lực hơn " +
  "nữa trong công việc. <3 và cuộc sống…";
export const GIFT_DESCRIPTION = "Nhận được 1 áo phông SAA";

/** The 8 named Sunners that appear in the design mockup. */
const DESIGN_SUNNERS: SeedSunner[] = [
  { email: "huynh.duong.xuan@seed.saa.local", fullName: "Huỳnh Dương Xuân", avatarUrl: "https://i.pravatar.cc/150?u=huynh-duong-xuan", departmentName: "CECV2", title: "Legend Hero" },
  { email: "do.hoang.hiep@seed.saa.local", fullName: "Đỗ Hoàng Hiệp", avatarUrl: "https://i.pravatar.cc/150?u=do-hoang-hiep", departmentName: "CEVC10", title: "Super Hero" },
  { email: "duong.thuy.an@seed.saa.local", fullName: "Dương Thúy An", avatarUrl: "https://i.pravatar.cc/150?u=duong-thuy-an", departmentName: "DXC1", title: "Rising Hero" },
  { email: "mai.phuong.thuy@seed.saa.local", fullName: "Mai Phương Thúy", avatarUrl: "https://i.pravatar.cc/150?u=mai-phuong-thuy", departmentName: "QAQC2", title: "New Hero" },
  { email: "nguyen.van.quy@seed.saa.local", fullName: "Nguyễn Văn Quy", avatarUrl: "https://i.pravatar.cc/150?u=nguyen-van-quy", departmentName: "CECV2", title: "Rising Hero" },
  { email: "le.kieu.trang@seed.saa.local", fullName: "Lê Kiều Trang", avatarUrl: "https://i.pravatar.cc/150?u=le-kieu-trang", departmentName: "CEVC10", title: "New Hero" },
  { email: "nguyen.ba.chuc@seed.saa.local", fullName: "Nguyễn Bá Chức", avatarUrl: "https://i.pravatar.cc/150?u=nguyen-ba-chuc", departmentName: "DXC1", title: "Super Hero" },
  { email: "nguyen.hoang.linh@seed.saa.local", fullName: "Nguyễn Hoàng Linh", avatarUrl: "https://i.pravatar.cc/150?u=nguyen-hoang-linh", departmentName: "QAQC2", title: "Legend Hero" },
];

// Common Vietnamese name parts, combined deterministically below to fabricate
// extra distinct receivers for Spotlight density.
const SURNAMES = ["Nguyễn", "Trần", "Lê", "Phạm", "Hoàng", "Huỳnh", "Phan", "Vũ", "Đặng", "Bùi", "Đỗ", "Ngô", "Dương", "Lý"];
const MIDDLES = ["Văn", "Thị", "Hoàng", "Đức", "Minh", "Thanh", "Quang", "Ngọc", "Gia", "Bá", "Kiều", "Phương", "Hữu", "Xuân"];
const GIVENS = ["An", "Bình", "Chi", "Dũng", "Giang", "Hà", "Hải", "Hùng", "Khánh", "Lan", "Linh", "Mai", "Nam", "Nga", "Phúc", "Quân", "Sơn", "Tâm", "Trang", "Tú", "Việt", "Yến", "Khoa", "Long", "Thảo", "Vy"];

const EXTRA_SUNNER_COUNT = 44;
const GENERATED_SUNNERS: SeedSunner[] = Array.from({ length: EXTRA_SUNNER_COUNT }, (_, i) => {
  const n = i + 1;
  const fullName = `${SURNAMES[(i * 5) % SURNAMES.length]} ${MIDDLES[(i * 3) % MIDDLES.length]} ${GIVENS[(i * 7) % GIVENS.length]}`;
  return {
    email: `seed-sunner-${n}@seed.saa.local`,
    fullName,
    avatarUrl: `https://i.pravatar.cc/150?u=seed-sunner-${n}`,
    departmentName: DEPARTMENTS[i % DEPARTMENTS.length],
    title: TITLES[i % TITLES.length],
  };
});

/** ~52 Sunners: the 8 design names + 44 generated, so the Spotlight cloud
 * reads dense (one node per distinct receiver) like the design. */
export const SUNNERS: SeedSunner[] = [...DESIGN_SUNNERS, ...GENERATED_SUNNERS];

// Fixed, deterministic uuids so re-running the seed upserts the same rows.
// 200 kudos spread across the Sunners (receiver = sender offset by 3, never
// self) so every Sunner receives several — the whole roster shows on the board.
export const KUDOS_IDS = Array.from(
  { length: 200 },
  (_, i) => `b0a10000-0000-4000-8000-${i.toString().padStart(12, "0")}`,
);

// "Danh hiệu" (per-kudos award title) shown as the card heading (F006). Assigned
// round-robin per kudos so every seeded card carries one, like the design.
export const KUDOS_TITLES = [
  "Người truyền động lực cho tôi",
  "IDOL giới trẻ",
  "Người đồng đội tuyệt vời",
  "Chiến binh thầm lặng",
  "Nguồn cảm hứng bất tận",
  "Người hùng của team",
  "Ngôi sao sáng nhất",
  "Người luôn hết mình",
] as const;

export const GIFT_IDS = Array.from(
  { length: 10 },
  (_, i) => `d0a10000-0000-4000-8000-${i.toString().padStart(12, "0")}`,
);
