import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { resolveEventTargetIso } from "@/lib/event/countdown";
import { montserrat } from "./fonts";
import { PrelaunchCountdown } from "./components/prelaunch-countdown";

export const metadata: Metadata = {
  title: "Sun* Annual Awards 2025",
};

/**
 * Public full-screen "coming soon" gate (MoMorph 8PJQswPZmU). While
 * `now < NEXT_PUBLIC_EVENT_DATETIME`, proxy.ts redirects every other route
 * here; once the countdown reaches zero the client redirects back to `/` and
 * normal routing resumes. No auth required — guests and logged-in users both
 * land here.
 *
 * Background: full-viewport art (`MM_MEDIA_BG Image`, node 2268:35129) with
 * the design's gradient cover (node 2268:35130) for text contrast. Title +
 * countdown are centered over it.
 */
export default async function PrelaunchPage() {
  const t = await getTranslations("Prelaunch");

  return (
    <div
      className={`${montserrat.variable} relative flex min-h-screen w-full flex-col items-center overflow-hidden bg-[#00101A] pt-32 sm:pt-40 lg:pt-[314px] font-[family-name:var(--font-montserrat)]`}
    >
      <div aria-hidden className="pointer-events-none absolute inset-0 z-0">
        <div
          className="absolute inset-0 bg-cover bg-center bg-no-repeat"
          style={{ backgroundImage: "url(/prelaunch/prelaunch-bg.png)" }}
        />
        <div
          className="absolute inset-0"
          style={{
            background:
              "linear-gradient(18deg, #00101A 15.48%, rgba(0, 18, 29, 0.46) 52.13%, rgba(0, 19, 32, 0.00) 63.41%)",
          }}
        />
      </div>

      <div className="relative z-[1] flex flex-col items-center gap-6 px-6 text-center">
        <p className="text-2xl leading-8 font-bold text-white sm:text-3xl sm:leading-10 lg:text-4xl lg:leading-[48px]">
          {t("title")}
        </p>
        <PrelaunchCountdown targetIso={resolveEventTargetIso()} />
      </div>
    </div>
  );
}
