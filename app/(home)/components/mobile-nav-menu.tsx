"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

export interface MobileNavLink {
  href: string;
  label: string;
  /** Highlighted (gold) when it matches the current page. */
  active: boolean;
}

/**
 * Mobile-only (`md:hidden`) primary navigation: a hamburger toggle that opens a
 * right-anchored drawer listing the nav links the desktop bar hides below 768px.
 * Mirrors the `saa-rules-modal` drawer idiom (fixed overlay, `w-full max-w-[…]`
 * panel, backdrop-click + Escape close). Links + active state are resolved
 * server-side in `SiteHeader` and passed in — this component owns only the
 * open/close UI state (hence "use client").
 */
export function MobileNavMenu({
  links,
  menuLabel,
}: {
  links: MobileNavLink[];
  /** Accessible label for the toggle button (e.g. "Menu"). */
  menuLabel: string;
}) {
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
    <div className="md:hidden">
      <button
        type="button"
        aria-label={menuLabel}
        aria-expanded={open}
        onClick={() => setOpen(true)}
        className="flex size-10 items-center justify-center rounded text-white transition-colors duration-200 ease-out hover:bg-white/5"
      >
        <HamburgerIcon className="size-6" />
      </button>

      {open && (
        <div
          className="fixed inset-0 z-50 flex justify-end bg-black/60"
          onClick={(e) => {
            if (e.target === e.currentTarget) setOpen(false);
          }}
        >
          <nav
            aria-label={menuLabel}
            className="flex h-full w-full max-w-[320px] flex-col gap-2 overflow-y-auto bg-[#00070C] px-6 pt-6 pb-10"
          >
            <div className="mb-4 flex justify-end">
              <button
                type="button"
                aria-label={menuLabel}
                onClick={() => setOpen(false)}
                className="flex size-10 items-center justify-center rounded text-white transition-colors duration-200 ease-out hover:bg-white/5"
              >
                <CloseIcon className="size-6" />
              </button>
            </div>
            {links.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                onClick={() => setOpen(false)}
                className={
                  link.active
                    ? "rounded px-4 py-4 text-base font-bold tracking-[0.1px] text-[#FFEA9E]"
                    : "rounded px-4 py-4 text-base font-bold tracking-[0.1px] text-white transition-colors duration-200 ease-out hover:bg-white/5"
                }
              >
                {link.label}
              </Link>
            ))}
          </nav>
        </div>
      )}
    </div>
  );
}

function HamburgerIcon({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      className={className}
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      aria-hidden
    >
      <path d="M4 6h16M4 12h16M4 18h16" />
    </svg>
  );
}

function CloseIcon({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      className={className}
      fill="none"
      stroke="currentColor"
      strokeWidth="2.25"
      strokeLinecap="round"
      aria-hidden
    >
      <path d="M6 6l12 12M18 6 6 18" />
    </svg>
  );
}
