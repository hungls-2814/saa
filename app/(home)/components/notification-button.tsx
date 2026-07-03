"use client";

import { useEffect, useState } from "react";
import { useTranslations } from "next-intl";

/**
 * Notification bell (signed-in only). Opens a presentational placeholder
 * panel — no real notification data/backend exists yet. The unread badge is
 * a static placeholder dot per the design; wiring it to real unread state is
 * future work once a notifications backend exists.
 */
export function NotificationButton() {
  const t = useTranslations("Home.header");
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (!open) return;
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") setOpen(false);
    }
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [open]);

  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-haspopup="true"
        aria-expanded={open}
        aria-label={t("notificationsLabel")}
        className="relative flex size-10 items-center justify-center rounded transition-colors duration-200 ease-out hover:bg-white/5"
      >
        <BellIcon className="size-6 text-white" />
        {/* Placeholder unread indicator — real state pending a notifications backend. */}
        <span
          aria-hidden
          className="absolute right-2 top-2 size-2 rounded-full bg-[#D4271D]"
        />
      </button>

      {open && (
        <>
          <div
            className="fixed inset-0 z-10"
            aria-hidden
            onClick={() => setOpen(false)}
          />
          <div
            role="dialog"
            aria-label={t("notificationsLabel")}
            className="absolute right-0 top-full z-20 mt-2 w-72 rounded-lg border border-white/10 bg-[#0B0F12] p-4 shadow-xl"
          >
            <p className="text-sm text-white/60">{t("notificationsEmpty")}</p>
          </div>
        </>
      )}
    </div>
  );
}

function BellIcon({ className }: { className?: string }) {
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
      <path d="M18 8a6 6 0 0 0-12 0c0 7-3 9-3 9h18s-3-2-3-9" />
      <path d="M13.73 21a2 2 0 0 1-3.46 0" />
    </svg>
  );
}
