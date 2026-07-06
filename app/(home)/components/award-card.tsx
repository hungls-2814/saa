import Image from "next/image";
import Link from "next/link";
import { useTranslations } from "next-intl";
import type { AwardCategory } from "../data/awards-data";

/**
 * One award category card: square orb-badge graphic, title, 2-line-clamped
 * description, and a "Chi tiết" link. The whole card (image, title, and the
 * link) navigates to the Awards Information page anchored at the category
 * slug, per the design's click behavior.
 *
 * The orb badge image (`/home/award-<slug>.png`) is the real gold-ring/crystal
 * artwork extracted from the MoMorph design render, one file per category
 * slug — the category title is already baked into that artwork, so no text
 * is rendered on top of it here.
 */
export function AwardCard({ award }: { award: AwardCategory }) {
  const t = useTranslations("Home.awards");
  const href = `/he-thong-giai#${award.slug}`;

  return (
    <Link
      href={href}
      className="group flex flex-col gap-6 rounded-3xl transition-transform duration-200 ease-out hover:-translate-y-1"
    >
      <div className="relative aspect-square w-full overflow-hidden rounded-3xl shadow-[0_4px_4px_rgba(0,0,0,0.25)] transition-shadow duration-200 ease-out group-hover:shadow-[0_0_16px_#FAE287]">
        <Image
          src={`/home/award-${award.slug}.png`}
          alt={t(award.titleKey)}
          fill
          className="object-cover"
          sizes="(min-width: 1024px) 33vw, (min-width: 640px) 50vw, 100vw"
        />
      </div>

      <div className="flex flex-col gap-1">
        <h3 className="text-2xl font-normal leading-8 text-[#FFEA9E]">
          {t(award.titleKey)}
        </h3>
        <p className="line-clamp-2 text-base font-normal leading-6 tracking-[0.5px] text-white">
          {t(award.descKey)}
        </p>
        <span className="inline-flex w-fit items-center gap-1 py-4 text-base font-medium tracking-[0.15px] text-white transition-colors duration-200 ease-out group-hover:text-[#FFEA9E]">
          {t("detailLink")}
          <ArrowUpRightIcon className="size-6" />
        </span>
      </div>
    </Link>
  );
}

function ArrowUpRightIcon({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      className={className}
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
    >
      <path d="M7 17 17 7M8 7h9v9" />
    </svg>
  );
}
