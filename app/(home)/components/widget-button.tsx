"use client";

import { useEffect, useId, useRef, useState } from "react";
import { useTranslations } from "next-intl";

/**
 * Fixed bottom-right Floating Action Button (MoMorph _hphd32jN2 / Sv7DFwBw1h).
 * Collapsed = a cream pill (pen `/` Sun-mark). Expanded = cream action pills
 * ("Thể lệ" · "Viết KUDOS") stacked above a red ✕ close button. "Viết KUDOS"
 * opens the compose-Kudos modal via `onWriteKudos`; "Thể lệ" opens the Rules
 * modal via `onOpenRules`.
 */
export interface WidgetButtonProps {
  onWriteKudos?: () => void;
  onOpenRules?: () => void;
}

export function WidgetButton({ onWriteKudos, onOpenRules }: WidgetButtonProps) {
  const t = useTranslations("Home.widget");
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") setOpen(false);
    }
    function handleClickOutside(e: MouseEvent) {
      if (!containerRef.current?.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("keydown", handleKeyDown);
    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("keydown", handleKeyDown);
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [open]);

  return (
    <div ref={containerRef} className="fixed bottom-8 right-5 z-30 flex flex-col items-end gap-5">
      {open && (
        <div role="menu" aria-label={t("label")} className="flex flex-col items-end gap-5">
          <ActionPill
            onClick={() => {
              setOpen(false);
              onOpenRules?.();
            }}
            icon={<SunMarkIcon className="size-6" />}
          >
            {t("saaRules")}
          </ActionPill>
          <ActionPill
            onClick={() => {
              setOpen(false);
              onWriteKudos?.();
            }}
            icon={<PenIcon className="size-6 text-[#00101A]" />}
          >
            {t("writeKudos")}
          </ActionPill>
        </div>
      )}

      {open ? (
        <button
          type="button"
          onClick={() => setOpen(false)}
          aria-label={t("close")}
          className="flex size-14 items-center justify-center rounded-full bg-[#D4271D] text-white shadow-[0_4px_4px_rgba(0,0,0,0.25)] transition-transform duration-200 ease-out hover:-translate-y-0.5"
        >
          <CloseIcon className="size-6" />
        </button>
      ) : (
        <button
          type="button"
          onClick={() => setOpen(true)}
          aria-haspopup="true"
          aria-expanded={false}
          aria-label={t("label")}
          className="flex h-16 w-[106px] items-center justify-center gap-2 rounded-full bg-[#FFEA9E] px-4 shadow-[0_4px_4px_rgba(0,0,0,0.25),0_0_6px_#FAE287] transition-transform duration-200 ease-out hover:-translate-y-0.5"
        >
          <PenIcon className="size-6 text-[#00101A]" />
          <span className="text-2xl font-bold text-[#00101A]">/</span>
          <SunMarkIcon className="size-6" />
        </button>
      )}
    </div>
  );
}

function ActionPill({
  children,
  icon,
  onClick,
}: {
  children: React.ReactNode;
  icon: React.ReactNode;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      role="menuitem"
      onClick={onClick}
      className="flex items-center gap-2 whitespace-nowrap rounded bg-[#FFEA9E] p-4 text-2xl leading-8 font-bold text-[#00101A] shadow-[0_4px_4px_rgba(0,0,0,0.25)] transition-transform duration-200 ease-out hover:-translate-y-0.5"
    >
      {icon}
      {children}
    </button>
  );
}

function PenIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={className} fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <path d="M12 20h9" />
      <path d="M16.5 3.5a2.12 2.12 0 0 1 3 3L7 19l-4 1 1-4Z" />
    </svg>
  );
}

/**
 * Sun* brand mark — the red "flag" glyph used in "Thể lệ" / the collapsed
 * pill. Paths and gradient stops extracted verbatim from MoMorph node
 * `214:3752` (component set `178:1020`); gradient ids are namespaced per
 * instance via `useId` so two renders on the same page never collide.
 */
function SunMarkIcon({ className }: { className?: string }) {
  const uid = useId();
  const softShade = `sun-mark-soft-${uid}`;
  const darkShade = `sun-mark-dark-${uid}`;
  return (
    <svg viewBox="0 0 24 24" className={className} aria-hidden>
      <path
        d="M7.26547 9.37812L13.0705 11.4714C13.6575 11.7001 14.1668 12.4425 13.6964 13.2496C13.3856 13.8582 11.0679 16.3831 11.0679 16.3831C11.055 16.4305 3.57957 13.6553 3.57957 13.6553C2.97101 13.4222 2.6171 12.7878 2.81563 12.0497C3.01417 11.3117 6.56196 9.09758 7.26547 9.3738V9.37812Z"
        fill="#B72927"
      />
      <path
        d="M7.2706 9.37397L13.0757 11.4672C13.6627 11.696 14.1719 12.4384 13.7015 13.2455C13.3907 13.854 11.073 16.3789 11.073 16.3789C11.0601 16.4264 3.5847 13.6512 3.5847 13.6512C2.97614 13.4181 2.62222 12.7836 2.82076 12.0456C3.0193 11.3076 6.56708 9.09343 7.2706 9.36965V9.37397Z"
        fill={`url(#${softShade})`}
        style={{ mixBlendMode: "multiply" }}
      />
      <path
        d="M7.26547 9.37397L13.0705 11.4672C13.6575 11.696 14.1668 12.4384 13.6964 13.2455C13.3856 13.854 11.0679 16.3789 11.0679 16.3789C11.055 16.4264 3.57957 13.6512 3.57957 13.6512C2.97101 13.4181 2.6171 12.7836 2.81563 12.0456C3.01417 11.3076 6.56196 9.09343 7.26547 9.36965V9.37397Z"
        fill={`url(#${darkShade})`}
        style={{ mixBlendMode: "multiply" }}
      />
      <path
        d="M14.6935 9.05447C14.905 8.86025 17.9996 5.99872 21.979 2.55452C22.0308 2.50704 21.979 2.42503 21.9142 2.45525C20.0799 3.39183 16.394 4.25504 16.394 4.25504L8.8323 5.66206C6.25563 6.18862 6.01825 6.62023 4.97808 8.29485L4.70185 8.73077C4.68891 8.75235 4.24867 9.5465 2.83301 12.0023C3.26461 11.2557 3.75232 11.1952 6.6527 10.6514C7.20516 10.5349 8.52155 10.2328 9.34591 10.0644C10.4897 9.83136 14.387 9.1149 14.6633 9.0631C14.6762 9.0631 14.6805 9.05879 14.6892 9.05016L14.6935 9.05447Z"
        fill="#E73928"
      />
      <path
        d="M4.9608 15.4035L2 20.7252L7.81371 19.3527C10.3861 18.8132 10.6234 18.3816 11.6593 16.7027L11.9355 16.2624C11.9355 16.2624 12.2679 15.7531 13.6965 13.2542C13.2908 13.9965 11.6981 13.9836 9.98036 14.3547C9.4279 14.4756 4.96512 15.4035 4.96512 15.4035H4.9608Z"
        fill="#E73928"
      />
      <defs>
        <linearGradient id={softShade} x1="10.1149" y1="16.8752" x2="7.36987" y2="10.2544" gradientUnits="userSpaceOnUse">
          <stop stopColor="white" />
          <stop offset="0.32" stopColor="#FDFCFD" />
          <stop offset="0.47" stopColor="#F9F5F6" />
          <stop offset="0.57" stopColor="#F2E9EA" />
          <stop offset="0.66" stopColor="#E8D7DA" />
          <stop offset="0.74" stopColor="#DABFC4" />
          <stop offset="0.81" stopColor="#CAA3AA" />
          <stop offset="0.87" stopColor="#B6818B" />
          <stop offset="0.93" stopColor="#A05966" />
          <stop offset="0.98" stopColor="#872D3E" />
          <stop offset="1" stopColor="#7E1E30" />
        </linearGradient>
        <linearGradient id={darkShade} x1="8.73724" y1="13.3275" x2="10.8219" y2="17.1342" gradientUnits="userSpaceOnUse">
          <stop stopColor="white" />
          <stop offset="0.22" stopColor="#FCFCFC" />
          <stop offset="0.35" stopColor="#F3F3F3" />
          <stop offset="0.47" stopColor="#E5E5E5" />
          <stop offset="0.57" stopColor="#D0D0D0" />
          <stop offset="0.66" stopColor="#B5B5B5" />
          <stop offset="0.75" stopColor="#959595" />
          <stop offset="0.83" stopColor="#6D6D6D" />
          <stop offset="0.91" stopColor="#404040" />
          <stop offset="0.98" stopColor="#0E0E0E" />
          <stop offset="1" stopColor="#000000" />
        </linearGradient>
      </defs>
    </svg>
  );
}

function CloseIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={className} fill="none" stroke="currentColor" strokeWidth="2.25" strokeLinecap="round" aria-hidden>
      <path d="M6 6l12 12M18 6 6 18" />
    </svg>
  );
}
