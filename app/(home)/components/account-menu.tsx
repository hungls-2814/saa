"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import type { User } from "@supabase/supabase-js";
import { signOut } from "@/lib/auth/sign-out";

/**
 * Account affordance in the header. Logged-in: icon button opening a menu
 * with Profile + Sign out (Admin Dashboard omitted — no role system yet).
 * Logged-out: a direct link to /login.
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
            className="absolute right-0 top-full z-20 mt-2 min-w-[168px] overflow-hidden rounded-lg border border-white/10 bg-[#0B0F12] py-1 shadow-xl"
          >
            <li role="none">
              <Link
                href="/profile"
                role="menuitem"
                className="block px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-white/10"
                onClick={() => setOpen(false)}
              >
                {t("profile")}
              </Link>
            </li>
            {/* TODO: gate on admin role when a role system exists */}
            <li role="none">
              <form action={signOut}>
                <button
                  type="submit"
                  role="menuitem"
                  className="block w-full px-4 py-2.5 text-left text-sm font-semibold text-white transition-colors hover:bg-white/10"
                >
                  {t("signOut")}
                </button>
              </form>
            </li>
          </ul>
        </>
      )}
    </div>
  );
}

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
