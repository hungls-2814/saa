"use client";

import { useTranslations } from "next-intl";
import { getCountdown, parseEventDate } from "@/lib/event/countdown";
import { CountdownUnit, useCountdownClock } from "@/app/components/countdown-unit";

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
  const now = useCountdownClock();

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
      {/* flex-wrap so a 3-digit days value (e.g. "365") can't push the row past
          a narrow viewport — units wrap to the next line instead of overflowing
          (mirrors prelaunch-countdown). Gaps restore at sm:/lg:. */}
      <div className="flex flex-wrap items-center gap-6 sm:gap-10">
        <CountdownUnit value={value.days} label={t("days")} />
        <CountdownUnit value={value.hours} label={t("hours")} />
        <CountdownUnit value={value.minutes} label={t("minutes")} />
      </div>
    </div>
  );
}
