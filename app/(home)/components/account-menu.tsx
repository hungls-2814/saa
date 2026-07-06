"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import type { User } from "@supabase/supabase-js";
import { signOut } from "@/lib/auth/sign-out";

/**
 * Account affordance in the header. Logged-in: icon button opening a menu
 * with Profile + Logout (Admin Dashboard omitted — no role system yet).
 * Logged-out: a direct link to /login.
 *
 * Design (MoMorph "Dropdown-profile", z4sCl3_Qtk): gold-bordered dark card;
 * Profile row carries a user icon, Logout row a right chevron; the hovered/focused
 * row gets a gold-tint highlight + glow.
 */
export function AccountMenu({ user }: { user: User | null }) {
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

  if (!user) {
    return (
      <Link
        href="/login"
        className="flex items-center gap-2 rounded px-4 py-2 text-sm font-bold text-white transition-colors duration-200 ease-out hover:bg-white/5"
      >
        {t("guestLogin")}
      </Link>
    );
  }

  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-haspopup="true"
        aria-expanded={open}
        aria-label={t("accountLabel")}
        className="flex size-10 items-center justify-center rounded border border-[#998C5F] transition-colors duration-200 ease-out hover:bg-white/5"
      >
        <UserIcon className="size-6 text-white" />
      </button>

      {open && (
        <>
          <div
            className="fixed inset-0 z-10"
            aria-hidden
            onClick={() => setOpen(false)}
          />
          <ul
            role="menu"
            aria-label={t("accountLabel")}
            className="absolute right-0 top-full z-20 mt-2 flex min-w-[132px] flex-col gap-1 overflow-hidden rounded-lg border border-[#998C5F] bg-[#00070C] p-1.5 shadow-xl"
          >
            <li role="none">
              <Link
                href="/profile"
                role="menuitem"
                className={ROW}
                onClick={() => setOpen(false)}
              >
                <span>{t("profile")}</span>
                <UserIcon className="size-5 shrink-0" />
              </Link>
            </li>
            {/* TODO: gate on admin role when a role system exists */}
            <li role="none">
              <form action={signOut}>
                <button type="submit" role="menuitem" className={`${ROW} w-full`}>
                  <span>{t("signOut")}</span>
                  <ChevronRightIcon className="size-5 shrink-0" />
                </button>
              </form>
            </li>
          </ul>
        </>
      )}
    </div>
  );
}

/** Shared menu-row styling: 56px tall, gold-tint highlight + glow on hover/focus. */
const ROW =
  "flex h-14 items-center gap-1 rounded px-4 text-left text-base leading-6 font-bold tracking-[0.15px] text-white transition-colors hover:bg-[rgba(255,234,158,0.1)] hover:[text-shadow:0_4px_4px_rgba(0,0,0,0.25),0_0_6px_#FAE287] focus-visible:bg-[rgba(255,234,158,0.1)] focus-visible:[text-shadow:0_4px_4px_rgba(0,0,0,0.25),0_0_6px_#FAE287] focus-visible:outline-none";

function UserIcon({ className }: { className?: string }) {
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
      <circle cx="12" cy="8" r="4" />
      <path d="M4 20c1.5-4 5-6 8-6s6.5 2 8 6" />
    </svg>
  );
}

function ChevronRightIcon({ className }: { className?: string }) {
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
      <path d="M9 6l6 6-6 6" />
    </svg>
  );
}
