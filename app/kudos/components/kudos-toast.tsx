"use client";

import { useEffect } from "react";

export interface KudosToastProps {
  /** The message to show, or `null`/`undefined` to render nothing. */
  message: string | null;
  onDismiss: () => void;
}

const AUTO_DISMISS_MS = 4000;

/**
 * Dismissible, auto-expiring toast for the `/kudos` board's Copy-Link
 * confirmation (FR8) and the accepted-scope-gap error notices raised by the
 * client container when a Server Action fails (Integration, Phase 06).
 */
export function KudosToast({ message, onDismiss }: KudosToastProps) {
  useEffect(() => {
    if (!message) return;
    const timer = window.setTimeout(onDismiss, AUTO_DISMISS_MS);
    return () => window.clearTimeout(timer);
  }, [message, onDismiss]);

  if (!message) return null;

  return (
    <div
      role="alert"
      className="fixed left-1/2 top-6 z-50 flex -translate-x-1/2 items-center gap-3 rounded-lg border border-[#FFEA9E]/30 bg-[#00101A] px-5 py-3 text-sm font-semibold text-white shadow-xl"
    >
      <span>{message}</span>
      <button
        type="button"
        onClick={onDismiss}
        aria-label="Close"
        className="text-white/70 transition-colors duration-200 ease-out hover:text-white"
      >
        ✕
      </button>
    </div>
  );
}
