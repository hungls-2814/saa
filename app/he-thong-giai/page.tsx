import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { isSupabaseConfigured } from "@/lib/supabase/config";
import { montserrat, montserratAlternates } from "@/app/(home)/fonts";
import { SiteHeader } from "@/app/(home)/components/site-header";
import { SiteFooter } from "@/app/(home)/components/site-footer";
import { KudosSection } from "@/app/(home)/components/kudos-section";
import { AwardsHero } from "./components/awards-hero";
import { AwardsSidebar } from "./components/awards-sidebar";
import { AwardDetailSection } from "./components/award-detail-section";
import { AWARD_DETAILS } from "./data/awards-detail-data";

export const metadata: Metadata = {
  title: "Hệ thống giải thưởng SAA 2025",
};

/**
 * Awards System detail page (`/he-thong-giai`). Auth-gated: unauthenticated
 * visitors are redirected to `/login` (defense-in-depth alongside the
 * `proxy.ts` route guard). Reuses the homepage's header/footer/Kudos promo.
 */
export default async function AwardsSystemPage() {
  const user = isSupabaseConfigured()
    ? (await (await createClient()).auth.getUser()).data.user
    : null;

  if (!user) {
    redirect("/login");
  }

  return (
    <div
      className={`${montserrat.variable} ${montserratAlternates.variable} relative flex min-h-screen w-full flex-col bg-[#00101A] font-[family-name:var(--font-montserrat)]`}
    >
      <SiteHeader user={user} active="awards" />
      <main className="relative flex flex-1 flex-col">
        {/*
         * Design keyvisual: node 2167:5138 — the 1440×547 full-width art band
         * that sits directly below the 80px header (design y80–627). Exported
         * from Figma to /home/awards-hero-keyvisual.png (2880×1094 @2x). Placed
         * at top-20 (below the header) at the band's native aspect; the Cover
         * gradient (node 313:8439) fades its lower half to solid #00101A so the
         * awards content section below blends in. Content sits above (z-10).
         */}
        <div aria-hidden className="pointer-events-none absolute inset-x-0 top-20 z-0">
          <div
            className="h-[420px] w-full bg-cover bg-top bg-no-repeat sm:h-[480px] lg:h-[547px]"
            style={{
              backgroundImage: "url(/home/awards-hero-keyvisual.png)",
            }}
          />
          {/* Cover gradient (node 313:8439): art up top, fading to solid
              #00101A over the lower half so the content section blends in. */}
          <div
            className="absolute inset-0"
            style={{
              background:
                "linear-gradient(0deg, #00101A -4.23%, rgba(0,19,32,0) 52.79%)",
            }}
          />
        </div>
        <div className="relative z-10 flex flex-col">
          <AwardsHero />

          <section className="w-full px-6 pb-24 sm:px-10 lg:px-36">
            <div className="mx-auto flex w-full max-w-[1224px] flex-col gap-16 lg:flex-row lg:items-start lg:gap-20">
              <AwardsSidebar />
              <div className="flex flex-1 flex-col gap-16 lg:gap-20">
                {AWARD_DETAILS.map((detail, index) => (
                  <AwardDetailSection key={detail.slug} detail={detail} index={index} />
                ))}
              </div>
            </div>
          </section>

          <KudosSection />
        </div>
      </main>
      <SiteFooter />
    </div>
  );
}
