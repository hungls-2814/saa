"use client";

import Image from "next/image";
import { useEffect, useId, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { useLocale } from "next-intl";
import { setLocale } from "@/lib/i18n/set-locale";
import { SUPPORTED_LOCALES, type Locale } from "@/i18n/config";

/**
 * Functional language selector (flag + code + chevron trigger, dropdown menu).
 * Switching writes the NEXT_LOCALE cookie via a Server Action, then
 * router.refresh() re-renders Server Components with the new locale — no URL change.
 *
 * Shared across routes (login, homepage) — do not fork a per-route copy.
 *
 * Design (MoMorph "Dropdown-ngôn ngữ", hUyaaugye2): each row is flag + short code
 * (VN / EN); the selected locale carries a gold-tint highlight + glow — no checkmark.
 */

/** Display code shown to the user — note VI locale surfaces as "VN" per design. */
const DISPLAY_CODE: Record<Locale, string> = { vi: "VN", en: "EN" };

export function LanguageSelector() {
  const activeLocale = useLocale() as Locale;
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [isPending, startTransition] = useTransition();

  useEffect(() => {
    if (!open) return;
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") setOpen(false);
    }
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [open]);

  function choose(next: Locale) {
    setOpen(false);
    if (next === activeLocale) return;
    startTransition(async () => {
      await setLocale(next);
      router.refresh();
    });
  }

  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        disabled={isPending}
        aria-haspopup="listbox"
        aria-expanded={open}
        className="flex items-center gap-2 rounded px-4 py-4 transition-colors duration-200 ease-out hover:bg-white/5 disabled:opacity-60"
      >
        <span className="flex items-center gap-1">
          <LocaleFlag locale={activeLocale} />
          <span className="text-center text-base leading-6 font-bold tracking-[0.15px] text-white">
            {DISPLAY_CODE[activeLocale]}
          </span>
        </span>
        <ChevronDownIcon
          className={`size-6 shrink-0 text-white transition-transform duration-200 ${open ? "rotate-180" : ""}`}
        />
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
            className="absolute right-0 top-full z-20 mt-1 flex min-w-[132px] flex-col gap-1 overflow-hidden rounded-lg border border-[#998C5F] bg-[#00070C] p-1.5 shadow-xl"
          >
            {SUPPORTED_LOCALES.map((code) => {
              const selected = code === activeLocale;
              return (
                <li key={code} role="option" aria-selected={selected}>
                  <button
                    type="button"
                    onClick={() => choose(code)}
                    className={`flex h-14 w-full items-center gap-2 rounded-[2px] px-4 text-left text-base leading-6 font-bold tracking-[0.15px] text-white transition-colors focus-visible:bg-[rgba(255,234,158,0.1)] focus-visible:outline-none focus-visible:[text-shadow:0_4px_4px_rgba(0,0,0,0.25),0_0_6px_#FAE287] ${
                      selected
                        ? "bg-[rgba(255,234,158,0.2)] [text-shadow:0_4px_4px_rgba(0,0,0,0.25),0_0_6px_#FAE287]"
                        : "hover:bg-[rgba(255,234,158,0.1)]"
                    }`}
                  >
                    <LocaleFlag locale={code} />
                    <span>{DISPLAY_CODE[code]}</span>
                  </button>
                </li>
              );
            })}
          </ul>
        </>
      )}
    </div>
  );
}

/**
 * Locale flag chip (24×16). VN uses the design's flag asset; EN renders an inline
 * SVG Union Jack (no binary asset), per the MoMorph design.
 */
function LocaleFlag({ locale }: { locale: Locale }) {
  if (locale === "vi") {
    return (
      <Image
        src="/login/icons/vn-flag.png"
        alt=""
        width={24}
        height={16}
        className="h-4 w-6 shrink-0 rounded-[2px] object-cover"
      />
    );
  }
  return <GbFlag />;
}

/**
 * Inline Union Jack (3:2), rendered as a 24×16 flag chip. Clip-path ids are made
 * unique per instance (useId) so the trigger + list flags don't collide.
 */
function GbFlag() {
  const uid = useId().replace(/:/g, "");
  const clipId = `gb-clip-${uid}`;
  const quadId = `gb-quad-${uid}`;
  return (
    <svg
      viewBox="0 0 36 24"
      className="h-4 w-6 shrink-0 rounded-[2px]"
      aria-hidden
    >
      <clipPath id={clipId}>
        <rect width="36" height="24" rx="2" />
      </clipPath>
      <clipPath id={quadId}>
        <path d="M18,12 h18 v12 z v12 h-18 z h-18 v-12 z v-12 h18 z" />
      </clipPath>
      <g clipPath={`url(#${clipId})`}>
        <rect width="36" height="24" fill="#012169" />
        <path d="M0,0 L36,24 M36,0 L0,24" stroke="#fff" strokeWidth="4.8" />
        <path
          d="M0,0 L36,24 M36,0 L0,24"
          clipPath={`url(#${quadId})`}
          stroke="#C8102E"
          strokeWidth="3.2"
        />
        <path d="M18,0 V24 M0,12 H36" stroke="#fff" strokeWidth="8" />
        <path d="M18,0 V24 M0,12 H36" stroke="#C8102E" strokeWidth="4.8" />
      </g>
    </svg>
  );
}

/** Inline chevron (no background) — replaces the opaque chevron-down.png asset. */
function ChevronDownIcon({ className }: { className?: string }) {
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
      <path d="M6 9l6 6 6-6" />
    </svg>
  );
}
