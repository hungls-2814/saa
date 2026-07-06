"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { getCountdown, parseEventDate } from "@/lib/event/countdown";
import { CountdownUnit, useCountdownClock } from "@/app/components/countdown-unit";

/**
 * Prelaunch countdown: DAYS / HOURS / MINUTES ticking down to `targetIso`.
 * Once the countdown reaches zero, redirects to the homepage — the launch
 * gate (proxy.ts) unlocks all other routes at the same moment, so this is
 * just the client-side nudge for anyone already sitting on `/prelaunch`.
 */
export function PrelaunchCountdown({
  targetIso,
}: {
  targetIso: string | undefined;
}) {
  const t = useTranslations("Home.hero");
  const router = useRouter();
  const target = parseEventDate(targetIso);
  const now = useCountdownClock();

  const value = now
    ? (getCountdown(target, now) ?? { days: 0, hours: 0, minutes: 0, ended: true })
    : { days: 0, hours: 0, minutes: 0, ended: false };

  useEffect(() => {
    if (value.ended) {
      router.replace("/");
    }
  }, [value.ended, router]);

  return (
    <div className="flex flex-wrap items-center justify-center gap-6 sm:gap-10 lg:gap-[60px]">
      <CountdownUnit value={value.days} label={t("days")} />
      <CountdownUnit value={value.hours} label={t("hours")} />
      <CountdownUnit value={value.minutes} label={t("minutes")} />
    </div>
  );
}
