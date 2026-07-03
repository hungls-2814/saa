"use client";

import { useEffect, useRef, useState } from "react";
import { useTranslations } from "next-intl";

/**
 * Fixed bottom-right pill button opening a quick-action menu (Write Kudos /
 * SAA Rules). Presentational placeholder — the design's target flows for
 * each menu item don't exist as pages yet.
 */
export function WidgetButton() {
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
    <div ref={containerRef} className="fixed bottom-8 right-5 z-30">
      {open && (
        <ul
          role="menu"
          aria-label={t("label")}
          className="absolute bottom-full right-0 mb-2 min-w-[180px] overflow-hidden rounded-lg border border-white/10 bg-[#0B0F12] py-1 shadow-xl"
        >
          <li role="none">
            <button
              type="button"
              role="menuitem"
              className="flex w-full items-center gap-2 px-4 py-2.5 text-left text-sm font-semibold text-white transition-colors hover:bg-white/10"
              onClick={() => setOpen(false)}
            >
              {t("writeKudos")}
            </button>
          </li>
          <li role="none">
            <button
              type="button"
              role="menuitem"
              className="flex w-full items-center gap-2 px-4 py-2.5 text-left text-sm font-semibold text-white transition-colors hover:bg-white/10"
              onClick={() => setOpen(false)}
            >
              {t("saaRules")}
            </button>
          </li>
        </ul>
      )}

      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-haspopup="true"
        aria-expanded={open}
        aria-label={t("label")}
        className="flex h-16 w-[106px] items-center justify-center gap-2 rounded-full bg-[#FFEA9E] px-4 shadow-[0_4px_4px_rgba(0,0,0,0.25),0_0_6px_#FAE287] transition-transform duration-200 ease-out hover:-translate-y-0.5"
      >
        <PenIcon className="size-6 text-[#00101A]" />
        <span className="text-2xl font-bold text-[#00101A]">/</span>
        <KudosMarkIcon className="size-6 text-[#00101A]" />
      </button>
    </div>
  );
}

function PenIcon({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      className={className}
      fill="none"
      stroke="currentColor"
      strokeWidth="1.75"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
    >
      <path d="M12 20h9" />
      <path d="M16.5 3.5a2.12 2.12 0 0 1 3 3L7 19l-4 1 1-4Z" />
    </svg>
  );
}

function KudosMarkIcon({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      className={className}
      fill="currentColor"
      aria-hidden
    >
      <path d="M12 2 2 7v10l10 5 10-5V7Zm0 4.5 5.5 2.75L12 12l-5.5-2.75Z" />
    </svg>
  );
}
