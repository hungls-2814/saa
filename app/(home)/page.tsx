import type { Metadata } from "next";
import { createClient } from "@/lib/supabase/server";
import { isSupabaseConfigured } from "@/lib/supabase/config";
import { montserrat, montserratAlternates } from "./fonts";
import { SiteHeader } from "./components/site-header";
import { HeroSection } from "./components/hero-section";
import { RootFurtherSection } from "./components/root-further-section";
import { AwardsSection } from "./components/awards-section";
import { KudosSection } from "./components/kudos-section";
import { SiteFooter } from "./components/site-footer";
import { HomeComposeWidget } from "./components/home-compose-widget";

export const metadata: Metadata = {
  title: "Sun* Annual Awards 2025",
};

/**
 * SAA 2025 homepage. Reads the Supabase session server-side (treating an
 * unconfigured Supabase project the same as logged-out) and passes the user
 * down so the header can render its auth-aware controls.
 */
export default async function HomePage() {
  const user = isSupabaseConfigured()
    ? (await (await createClient()).auth.getUser()).data.user
    : null;

  return (
    <div
      className={`${montserrat.variable} ${montserratAlternates.variable} relative flex min-h-screen w-full flex-col bg-[#00101A] font-[family-name:var(--font-montserrat)]`}
    >
      <SiteHeader user={user} />
      <main className="relative flex flex-1 flex-col">
        {/*
         * Design keyvisual (clean art node 2167:9028, 1512×1392): a full-width
         * art layer behind the hero + top of the content section — dark on the
         * left where the text sits, colourful ribbons sweeping down-and-left on
         * the right, extending into the "ROOT FURTHER"/intro section. Painted as
         * one full-bleed, aspect-locked layer + the design's Cover gradient
         * (node 2167:9029) which fades the lower-left to solid #00101A so the
         * hero text stays readable. Content sits above it (z-10).
         */}
        <div aria-hidden className="pointer-events-none absolute inset-x-0 top-0 z-0">
          <div
            className="w-full bg-cover bg-top bg-no-repeat"
            style={{
              aspectRatio: "1512 / 1392",
              backgroundImage: "url(/home/home-hero-keyvisual.png)",
            }}
          />
          <div
            className="absolute inset-0"
            style={{
              background:
                "linear-gradient(12deg, #00101A 23.7%, rgba(0,18,29,0.46) 38.34%, rgba(0,19,32,0) 48.92%)",
            }}
          />
        </div>
        <div className="relative z-10 flex flex-col">
          <HeroSection />
          <RootFurtherSection />
          <AwardsSection />
          <KudosSection />
        </div>
      </main>
      <SiteFooter />
      <HomeComposeWidget currentUserId={user?.id ?? null} />
    </div>
  );
}
