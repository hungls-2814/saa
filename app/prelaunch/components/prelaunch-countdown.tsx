"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { getCountdown, parseEventDate } from "@/lib/event/countdown";
import { INTRO_STORAGE_KEY } from "@/lib/prelaunch/cookies";
import { CountdownUnit, useCountdownClock } from "@/app/components/countdown-unit";

/**
 * Prelaunch countdown: DAYS / HOURS / MINUTES ticking down to `targetIso`.
 * Once the countdown reaches zero, redirects to the homepage — the launch
 * gate (proxy.ts) unlocks all other routes at the same moment, so this is
 * just the client-side nudge for anyone already sitting on `/prelaunch`.
 *
 * When `demoSeconds` is set (reviewer preview OR the first-visit intro splash),
 * a short visible timer counts down from `demoSeconds`, then marks the intro as
 * done for this browser tab (sessionStorage) and redirects to `/`. The
 * sessionStorage flag stops `IntroGate` from bouncing `/` straight back here,
 * while remaining tab-scoped so a fresh/reopened tab replays the splash.
 * `demoVariant` only picks the copy: a "preview" warning for reviewers vs a
 * friendly "welcome" for real visitors.
 */
export function PrelaunchCountdown({
  targetIso,
  demoSeconds,
  demoVariant = "preview",
}: {
  targetIso: string | undefined;
  demoSeconds?: number;
  demoVariant?: "preview" | "intro";
}) {
  const t = useTranslations("Home.hero");
  const tp = useTranslations("Prelaunch");
  const router = useRouter();
  const target = parseEventDate(targetIso);
  const now = useCountdownClock();

  const value = now
    ? (getCountdown(target, now) ?? { days: 0, hours: 0, minutes: 0, ended: true })
    : { days: 0, hours: 0, minutes: 0, ended: false };

  useEffect(() => {
    // In splash mode the demo timer below owns the redirect (and stamps the
    // per-tab flag). After launch the real target is already in the past, so
    // without this guard `value.ended` would redirect instantly and the splash
    // would never show — and, with IntroGate sending `/` back here, loop.
    if (demoSeconds != null) return;
    if (value.ended) {
      router.replace("/");
    }
  }, [value.ended, router, demoSeconds]);

  const [demoRemaining, setDemoRemaining] = useState(demoSeconds ?? 0);
  useEffect(() => {
    if (demoSeconds == null) return;
    if (demoRemaining <= 0) {
      // Mark done for THIS tab so IntroGate won't bounce `/` back here; then go.
      try {
        sessionStorage.setItem(INTRO_STORAGE_KEY, "1");
      } catch {
        // sessionStorage unavailable (e.g. privacy mode) — redirect anyway.
      }
      router.replace("/");
      return;
    }
    const id = setTimeout(() => setDemoRemaining((s) => s - 1), 1000);
    return () => clearTimeout(id);
  }, [demoSeconds, demoRemaining, router]);

  return (
    <div className="flex flex-col items-center gap-6">
      <div className="flex flex-wrap items-center justify-center gap-6 sm:gap-10 lg:gap-[60px]">
        <CountdownUnit value={value.days} label={t("days")} />
        <CountdownUnit value={value.hours} label={t("hours")} />
        <CountdownUnit value={value.minutes} label={t("minutes")} />
      </div>
      {demoSeconds != null && (
        <div
          role="status"
          aria-live="polite"
          className="mt-2 flex flex-col items-center gap-2 rounded-2xl border border-amber-300/60 bg-amber-400/15 px-6 py-4 text-center backdrop-blur-sm sm:px-8 sm:py-5"
        >
          <p className="text-xl font-extrabold tracking-wide text-amber-300 uppercase sm:text-2xl lg:text-3xl">
            {demoVariant === "preview"
              ? tp("previewHeading")
              : tp("introHeading")}
          </p>
          <p className="text-base font-medium text-white sm:text-lg lg:text-xl">
            {demoVariant === "preview"
              ? tp("previewNotice")
              : tp("introNotice")}{" "}
            <span className="font-bold text-amber-300">{demoRemaining}s</span>
          </p>
        </div>
      )}
    </div>
  );
}
