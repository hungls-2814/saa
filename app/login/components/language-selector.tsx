"use client";

import Image from "next/image";
import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { useLocale, useTranslations } from "next-intl";
import { setLocale } from "@/lib/i18n/set-locale";
import { SUPPORTED_LOCALES, type Locale } from "@/i18n/config";

/**
 * Functional language selector (flag + code + chevron trigger, dropdown menu).
 * Switching writes the NEXT_LOCALE cookie via a Server Action, then
 * router.refresh() re-renders Server Components with the new locale — no URL change.
 */
export function LanguageSelector() {
  const activeLocale = useLocale() as Locale;
  const t = useTranslations("Common");
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [isPending, startTransition] = useTransition();

  const labels: Record<Locale, string> = {
    vi: t("langVi"),
    en: t("langEn"),
  };

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
            {activeLocale.toUpperCase()}
          </span>
        </span>
        <Image
          src="/login/icons/chevron-down.png"
          alt=""
          width={24}
          height={24}
          className={`size-6 shrink-0 transition-transform duration-200 ${open ? "rotate-180" : ""}`}
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
            className="absolute right-0 top-full z-20 mt-1 min-w-[168px] overflow-hidden rounded-lg border border-white/10 bg-[#0B0F12] py-1 shadow-xl"
          >
            {SUPPORTED_LOCALES.map((code) => (
              <li key={code} role="option" aria-selected={code === activeLocale}>
                <button
                  type="button"
                  onClick={() => choose(code)}
                  className="flex w-full items-center gap-2 px-4 py-2.5 text-left text-sm font-semibold text-white transition-colors hover:bg-white/10"
                >
                  <LocaleFlag locale={code} />
                  <span className="flex-1">{labels[code]}</span>
                  {code === activeLocale && (
                    <svg
                      viewBox="0 0 24 24"
                      className="size-4 shrink-0 text-[#FFEA9E]"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2.5"
                      aria-hidden
                    >
                      <path d="M5 13l4 4L19 7" />
                    </svg>
                  )}
                </button>
              </li>
            ))}
          </ul>
        </>
      )}
    </div>
  );
}

/** VN uses the design's flag asset; other locales fall back to a globe glyph. */
function LocaleFlag({ locale }: { locale: Locale }) {
  if (locale === "vi") {
    return (
      <Image
        src="/login/icons/vn-flag.png"
        alt=""
        width={24}
        height={24}
        className="size-6 shrink-0"
      />
    );
  }
  return (
    <svg
      viewBox="0 0 24 24"
      className="size-6 shrink-0 text-white"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.75"
      aria-hidden
    >
      <circle cx="12" cy="12" r="9" />
      <path d="M3 12h18M12 3c2.6 2.7 2.6 15.3 0 18M12 3c-2.6 2.7-2.6 15.3 0 18" />
    </svg>
  );
}
