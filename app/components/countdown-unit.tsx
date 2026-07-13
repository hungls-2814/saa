"use client";

import { useEffect, useState } from "react";

/**
 * Shared LED-style countdown building blocks, used by both the homepage hero
 * countdown (`app/(home)/components/countdown.tsx`) and the prelaunch
 * countdown (`app/prelaunch/components/prelaunch-countdown.tsx`). Extracted
 * so the visual + clock-ticking logic has exactly one source (DRY).
 */

/**
 * SSR-safe ticking clock: stays `null` until after mount so the server render
 * and the first client render are identical (no time-variant hydration
 * mismatch), then refreshes once per minute — matching the display's minute
 * granularity.
 */
export function useCountdownClock(): Date | null {
  const [now, setNow] = useState<Date | null>(null);

  useEffect(() => {
    // One-time client clock sync on mount: SSR and the first client render
    // both use `now === null` (identical output), so the time-variant digits
    // never cause a hydration mismatch. Setting it here is intentional, not a
    // cascade.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setNow(new Date());
    const id = setInterval(() => setNow(new Date()), 60_000);
    return () => clearInterval(id);
  }, []);

  return now;
}

/** One LED unit: two zero-padded digit boxes + an uppercase label underneath. */
export function CountdownUnit({
  value,
  label,
}: {
  value: number;
  label: string;
}) {
  const padded = String(Math.max(0, value)).padStart(2, "0");
  return (
    <div className="flex flex-col items-start gap-2 sm:gap-3.5">
      <div className="flex items-center gap-2 sm:gap-3.5">
        {padded.split("").map((digit, i) => (
          <div
            key={i}
            className="relative flex h-[60px] w-[38px] items-center justify-center overflow-hidden rounded-lg border-[0.5px] border-white/10 bg-gradient-to-b from-[#23272d] to-[#15181c] shadow-[0_1px_0_0_rgba(255,255,255,0.06)_inset] sm:h-[82px] sm:w-[51px]"
          >
            <span className="text-[28px] font-bold leading-[45px] text-white sm:text-[40px] sm:leading-[63px]">
              {digit}
            </span>
            {/* Flip-clock mid-split line */}
            <div className="pointer-events-none absolute inset-x-0 top-1/2 h-px -translate-y-1/2 bg-black/40" />
          </div>
        ))}
      </div>
      <span className="text-lg font-bold leading-6 tracking-normal text-white sm:text-2xl sm:leading-8">
        {label}
      </span>
    </div>
  );
}
