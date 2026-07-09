import type { HeroBadge } from "@/lib/kudos/types";

/**
 * Renders a Sunner's Hero badge pill (New / Rising / Super / Legend) next to
 * their name on a Kudos card — the derived `heroBadge` replaces the honorific
 * `title` pill (design b1Filzi9i6). Assets live in `public/kudos/badges/`.
 * Returns null for `none` (0 distinct senders → no badge). Badge names are
 * proper nouns, identical across locales, so the alt text is static.
 */
const BADGE_META: Record<Exclude<HeroBadge, "none">, { src: string; alt: string }> = {
  new: { src: "/kudos/badges/hero-new.png", alt: "New Hero" },
  rising: { src: "/kudos/badges/hero-rising.png", alt: "Rising Hero" },
  super: { src: "/kudos/badges/hero-super.png", alt: "Super Hero" },
  legend: { src: "/kudos/badges/hero-legend.png", alt: "Legend Hero" },
};

export function HeroBadgeImage({ badge }: { badge: HeroBadge }) {
  if (badge === "none") return null;
  const { src, alt } = BADGE_META[badge];
  return (
    // eslint-disable-next-line @next/next/no-img-element -- small static local badge pill; intrinsic aspect kept via h-5 w-auto
    <img src={src} alt={alt} className="h-5 w-auto shrink-0" />
  );
}
