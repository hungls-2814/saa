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
      </main>
      <SiteFooter />
    </div>
  );
}
