"use client";

import { useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import { getCountdown, parseEventDate } from "@/lib/event/countdown";

/**
 * Hero countdown: DAYS / HOURS / MINUTES ticking down to `targetIso`.
 * Recomputes once per minute. Invalid/missing `targetIso` is treated as
 * "ended" (00 00 00, no Coming soon label) rather than throwing.
 */
export function Countdown({ targetIso }: { targetIso: string | undefined }) {
  const t = useTranslations("Home.hero");
  const target = parseEventDate(targetIso);
  // `now` stays null until after mount so the server render and the first
  // client render are identical (no time-variant hydration mismatch). The
  // real countdown is computed on mount and refreshed every minute.
  const [now, setNow] = useState<Date | null>(null);

  useEffect(() => {
    // One-time client clock sync on mount: SSR and the first client render both
    // use `now === null` (identical output), so the time-variant digits never
    // cause a hydration mismatch. Setting it here is intentional, not a cascade.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setNow(new Date());
    const id = setInterval(() => setNow(new Date()), 60_000);
    return () => clearInterval(id);
  }, []);

  const value = now
    ? (getCountdown(target, now) ?? { days: 0, hours: 0, minutes: 0, ended: true })
    : { days: 0, hours: 0, minutes: 0, ended: false };

  return (
    <div className="flex flex-col items-start gap-4">
      {!value.ended && (
        <p className="text-2xl font-bold leading-8 text-white">
          {t("comingSoon")}
        </p>
      )}
      <div className="flex items-center gap-10">
        <CountdownUnit value={value.days} label={t("days")} />
        <CountdownUnit value={value.hours} label={t("hours")} />
        <CountdownUnit value={value.minutes} label={t("minutes")} />
      </div>
    </div>
  );
}

function CountdownUnit({ value, label }: { value: number; label: string }) {
  const padded = String(Math.max(0, value)).padStart(2, "0");
  return (
    <div className="flex flex-col items-start gap-3.5">
      <div className="flex items-center gap-3.5">
        {padded.split("").map((digit, i) => (
          <div
            key={i}
            className="relative flex h-[82px] w-[51px] items-center justify-center overflow-hidden rounded-lg border-[0.5px] border-white/10 bg-gradient-to-b from-[#23272d] to-[#15181c] shadow-[0_1px_0_0_rgba(255,255,255,0.06)_inset]"
          >
            <span className="text-[40px] font-bold leading-[63px] text-white">
              {digit}
            </span>
            {/* Flip-clock mid-split line */}
            <div className="pointer-events-none absolute inset-x-0 top-1/2 h-px -translate-y-1/2 bg-black/40" />
          </div>
        ))}
      </div>
      <span className="text-2xl font-bold leading-8 tracking-normal text-white">
        {label}
      </span>
    </div>
  );
}
