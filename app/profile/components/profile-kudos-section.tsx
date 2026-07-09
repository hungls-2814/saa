"use client";

import { useEffect, useRef, useState } from "react";
import { useTranslations } from "next-intl";
import type { KudosCard as KudosCardType } from "@/lib/kudos/types";
import { KudosCard } from "@/app/kudos/components/kudos-card";
import { SectionHeader } from "@/app/kudos/components/section-header";
import { ChevronDownIcon } from "@/app/kudos/components/icons";

export interface ProfileKudosSectionProps {
  /** Kudos the current user sent, newest-first. */
  sent: KudosCardType[];
  /** Kudos the current user received, newest-first. */
  received: KudosCardType[];
}

type Direction = "sent" | "received";

/**
 * Region C (awards header + Sent/Received toggle) + Region D (read-only
 * kudos list) of the personal profile page — design node `362:5083`
 * (`Frame 530`). Reuses `SectionHeader` for the "Sun* Annual Awards 2025" /
 * "KUDOS" header and the existing `KudosCard` for each list item; owns the
 * toggle state locally (default "sent") since this section receives both
 * lists as props rather than fetching.
 *
 * Read-only per clarifications: cards get `onCopyLink` but never
 * `onToggleLike` (no hearting from the profile page), and the orange "Spam"
 * tag (design node `3127:24095`, no schema backing) is omitted entirely.
 */
export function ProfileKudosSection({ sent, received }: ProfileKudosSectionProps) {
  const t = useTranslations("ProfilePage");
  const [direction, setDirection] = useState<Direction>("sent");
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);

  // Close the toggle listbox on Escape, mirroring `FilterDropdown`'s
  // interaction pattern used elsewhere on the Kudos board.
  useEffect(() => {
    if (!open) return;
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") setOpen(false);
    }
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [open]);

  const counts: Record<Direction, number> = { sent: sent.length, received: received.length };
  const list = direction === "sent" ? sent : received;

  function handleCopyLink(kudosId: string) {
    if (typeof navigator === "undefined" || !navigator.clipboard) return;
    const url = `${window.location.origin}/kudos/${kudosId}`;
    navigator.clipboard.writeText(url).catch(() => {
      // Best-effort copy; no toast in scope for this read-only section.
    });
  }

  const optionClass = (isActive: boolean) =>
    `w-full rounded px-4 py-3 text-left text-sm font-bold text-white transition-colors duration-150 ${
      isActive
        ? "bg-[rgba(255,234,158,0.15)] ring-1 ring-[#FFEA9E]/40"
        : "hover:bg-[rgba(255,234,158,0.1)]"
    }`;

  return (
    <section className="flex w-full flex-col gap-10">
      <SectionHeader
        eyebrow={t("awardsEyebrow")}
        title={t("kudosTitle")}
        actions={
          <div className="relative" ref={rootRef}>
            <button
              type="button"
              onClick={() => setOpen((o) => !o)}
              aria-haspopup="listbox"
              aria-expanded={open}
              className="flex items-center gap-2 rounded border border-[#998C5F] bg-[rgba(255,234,158,0.1)] px-4 py-4 text-base font-bold text-white transition-colors duration-200 ease-out hover:bg-[rgba(255,234,158,0.2)]"
            >
              {t(`toggle.${direction}`, { count: counts[direction] })}
              <ChevronDownIcon className="size-6" />
            </button>

            {open && (
              <>
                <div
                  className="fixed inset-0 z-10"
                  aria-hidden
                  onClick={() => setOpen(false)}
                />
                <ul
                  role="listbox"
                  aria-label={t("kudosTitle")}
                  className="absolute right-0 top-full z-20 mt-2 flex min-w-[200px] flex-col gap-1 rounded-lg border border-[#998C5F] bg-[#00070C] p-1.5 shadow-xl"
                >
                  {(["sent", "received"] as const).map((d) => (
                    <li key={d} role="none">
                      <button
                        type="button"
                        role="option"
                        aria-selected={d === direction}
                        onClick={() => {
                          setDirection(d);
                          setOpen(false);
                        }}
                        className={optionClass(d === direction)}
                      >
                        {t(`toggle.${d}`, { count: counts[d] })}
                      </button>
                    </li>
                  ))}
                </ul>
              </>
            )}
          </div>
        }
      />

      {list.length === 0 ? (
        <p className="w-full py-12 text-center text-base text-white/70">
          {t(`empty.${direction}`)}
        </p>
      ) : (
        <div className="flex w-full flex-col gap-6">
          {list.map((kudos) => (
            <KudosCard key={kudos.id} kudos={kudos} variant="feed" onCopyLink={handleCopyLink} />
          ))}
        </div>
      )}
    </section>
  );
}
