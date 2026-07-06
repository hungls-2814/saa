/**
 * Static seed content for scripts/seed-kudos.ts.
 *
 * Drawn from the MoMorph design (screen MaZUn5xHXZ / figma node 2940:13431):
 * sender/receiver names, department codes, hashtags, the thank-you message,
 * and the gift description all appear verbatim or near-verbatim in the
 * Figma mockup's placeholder content.
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

export const THANK_YOU_CONTENT =
  "Cảm ơn người em bình thường nhưng phi thường :D Cảm ơn sự chăm chỉ, cần mẫn của " +
  "em đã tạo động lực rất nhiều cho team, để luôn nhắc mình luôn phải nỗ lực hơn " +
  "nữa trong công việc. <3 và cuộc sống…";
export const GIFT_DESCRIPTION = "Nhận được 1 áo phông SAA";

export const SUNNERS: SeedSunner[] = [
  { email: "huynh.duong.xuan@seed.saa.local", fullName: "Huỳnh Dương Xuân", avatarUrl: "https://i.pravatar.cc/150?u=huynh-duong-xuan", departmentName: "CECV2", title: "Legend Hero" },
  { email: "do.hoang.hiep@seed.saa.local", fullName: "Đỗ Hoàng Hiệp", avatarUrl: "https://i.pravatar.cc/150?u=do-hoang-hiep", departmentName: "CEVC10", title: "Super Hero" },
  { email: "duong.thuy.an@seed.saa.local", fullName: "Dương Thúy An", avatarUrl: "https://i.pravatar.cc/150?u=duong-thuy-an", departmentName: "DXC1", title: "Rising Hero" },
  { email: "mai.phuong.thuy@seed.saa.local", fullName: "Mai Phương Thúy", avatarUrl: "https://i.pravatar.cc/150?u=mai-phuong-thuy", departmentName: "QAQC2", title: "New Hero" },
  { email: "nguyen.van.quy@seed.saa.local", fullName: "Nguyễn Văn Quy", avatarUrl: "https://i.pravatar.cc/150?u=nguyen-van-quy", departmentName: "CECV2", title: "Rising Hero" },
  { email: "le.kieu.trang@seed.saa.local", fullName: "Lê Kiều Trang", avatarUrl: "https://i.pravatar.cc/150?u=le-kieu-trang", departmentName: "CEVC10", title: "New Hero" },
  { email: "nguyen.ba.chuc@seed.saa.local", fullName: "Nguyễn Bá Chức", avatarUrl: "https://i.pravatar.cc/150?u=nguyen-ba-chuc", departmentName: "DXC1", title: "Super Hero" },
  { email: "nguyen.hoang.linh@seed.saa.local", fullName: "Nguyễn Hoàng Linh", avatarUrl: "https://i.pravatar.cc/150?u=nguyen-hoang-linh", departmentName: "QAQC2", title: "Legend Hero" },
];

// Fixed, deterministic uuids so re-running the seed upserts the same rows.
export const KUDOS_IDS = Array.from(
  { length: 12 },
  (_, i) => `b0a10000-0000-4000-8000-${i.toString().padStart(12, "0")}`,
);
export const GIFT_IDS = Array.from(
  { length: 10 },
  (_, i) => `d0a10000-0000-4000-8000-${i.toString().padStart(12, "0")}`,
);
