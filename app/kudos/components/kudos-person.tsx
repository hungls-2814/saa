import Link from "next/link";
import type { KudosPerson as KudosPersonType } from "@/lib/kudos/types";
import { starGlyph } from "./render-helpers";
import { Avatar } from "./avatar";
import { HeroBadgeImage } from "./hero-badge-image";

/**
 * Sender/receiver identity block used inside a Kudos card: avatar (initials
 * fallback — no stock photo is invented), name, department code, star tier
 * ("số hoa thị"), and the derived Hero badge (New/Rising/Super/Legend) — the
 * badge replaces the honorific "danh hiệu" pill per design b1Filzi9i6 (F007).
 *
 * Avatar + name link to the Sunner's profile — a route stub per the
 * clarified nav-stub rule (no profile page exists yet).
 */
export function KudosPersonInfo({ person }: { person: KudosPersonType }) {
  const stars = starGlyph(person.starTier);

  return (
    <div className="flex flex-col items-center gap-2 text-center">
      <Link href={`/sunners/${person.id}`} aria-label={person.fullName}>
        <Avatar name={person.fullName} avatarUrl={person.avatarUrl} />
      </Link>
      <div className="flex flex-col items-center gap-0.5">
        <Link
          href={`/sunners/${person.id}`}
          className="text-base font-bold tracking-[0.15px] text-[#00101A] hover:underline"
        >
          {person.fullName}
        </Link>
        {/* flex-wrap: in the narrow sender/receiver column of a Kudos card, the
            wide Hero badge (~115px) can't sit beside the department on one line
            without leaking past the card — let it wrap to its own line instead. */}
        <div className="flex flex-wrap items-center justify-center gap-2.5 text-sm font-bold tracking-[0.1px] text-[#999]">
          {stars && <span className="text-[#998C5F]">{stars}</span>}
          <span>{person.department}</span>
          {person.heroBadge !== "none" && (
            <>
              <span aria-hidden className="size-1 rounded-full bg-[#999] opacity-40" />
              <HeroBadgeImage badge={person.heroBadge} />
            </>
          )}
        </div>
      </div>
    </div>
  );
}
