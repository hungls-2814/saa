import Link from "next/link";
import type { KudosPerson as KudosPersonType } from "@/lib/kudos/types";
import { initialsOf, starGlyph } from "./render-helpers";

/**
 * Sender/receiver identity block used inside a Kudos card: avatar (initials
 * fallback — no stock photo is invented), name, department code, star tier
 * ("số hoa thị"), and the honorific "danh hiệu" badge (FR1/FR11).
 *
 * Avatar + name link to the Sunner's profile — a route stub per the
 * clarified nav-stub rule (no profile page exists yet).
 */
export function KudosPersonInfo({ person }: { person: KudosPersonType }) {
  const stars = starGlyph(person.starTier);

  return (
    <div className="flex flex-col items-center gap-2 text-center">
      <Link href={`/sunners/${person.id}`} aria-label={person.fullName}>
        <span
          aria-hidden
          className="flex size-16 items-center justify-center rounded-full border-[1.87px] border-white bg-[#EEE] text-lg font-bold text-[#00101A]"
        >
          {initialsOf(person.fullName)}
        </span>
      </Link>
      <div className="flex flex-col items-center gap-0.5">
        <Link
          href={`/sunners/${person.id}`}
          className="text-base font-bold tracking-[0.15px] text-[#00101A] hover:underline"
        >
          {person.fullName}
        </Link>
        <div className="flex items-center gap-2.5 text-sm font-bold tracking-[0.1px] text-[#999]">
          {stars && <span className="text-[#998C5F]">{stars}</span>}
          <span>{person.department}</span>
          <span aria-hidden className="size-1 rounded-full bg-[#999] opacity-40" />
          <span className="rounded-full border-[0.5px] border-[#FFEA9E] px-2.5 py-0.5 text-xs font-bold text-[#00101A]">
            {person.title}
          </span>
        </div>
      </div>
    </div>
  );
}
