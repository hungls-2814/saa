import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { createClient } from "@/lib/supabase/server";
import { isSupabaseConfigured } from "@/lib/supabase/config";
import { montserrat, montserratAlternates } from "@/app/(home)/fonts";
import { SiteHeader } from "@/app/(home)/components/site-header";
import { SiteFooter } from "@/app/(home)/components/site-footer";
import { SidebarStats } from "@/app/kudos/components/sidebar-stats";
import { getPerUserStats } from "@/lib/kudos/queries";
import { getKudosByUser, getMyProfileHeader, type ProfileHeaderData } from "@/lib/kudos/queries-profile";
import type { KudosCard, PerUserStats } from "@/lib/kudos/types";
import { ProfileHeader } from "./components/profile-header";
import { ProfileKudosSection } from "./components/profile-kudos-section";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("ProfilePage");
  return { title: t("title") };
}

/** Safe defaults if any profile read fails — the shell (header/footer/nav)
 * still renders so the page stays usable, mirroring `/kudos`'s resilience. */
const EMPTY_HEADER: ProfileHeaderData = {
  fullName: "",
  avatarUrl: "",
  department: "",
  starTier: 0,
  heroBadge: "none",
};
const EMPTY_STATS: PerUserStats = {
  kudosReceived: 0,
  kudosSent: 0,
  heartsReceived: 0,
  secretBoxOpened: 0,
  secretBoxUnopened: 0,
};

/**
 * Personal Profile page (`/profile`, F008). Own-profile only, auth-gated
 * (proxy guard + this defense-in-depth redirect, mirroring `/kudos` and
 * `/he-thong-giai`). Composes region A (`ProfileHeader`), region B stats
 * (`SidebarStats`, reused from the Kudos board), and regions C+D
 * (`ProfileKudosSection`). All four reads run concurrently; a failure falls
 * back to empty data rather than blanking the page.
 *
 * Secret Box counters + icon collection are deferred (static placeholders per
 * `clarifications.md`): `getPerUserStats` returns 0 for the box counts and
 * `SidebarStats` gets no `onOpenSecretBox` handler, so its button is inert.
 */
export default async function ProfilePage() {
  const user = isSupabaseConfigured()
    ? (await (await createClient()).auth.getUser()).data.user
    : null;

  if (!user) {
    redirect("/login");
  }

  let header: ProfileHeaderData;
  let stats: PerUserStats;
  let sent: KudosCard[];
  let received: KudosCard[];
  try {
    [header, stats, sent, received] = await Promise.all([
      getMyProfileHeader(user.id),
      getPerUserStats(user.id),
      getKudosByUser({ userId: user.id, direction: "sent" }),
      getKudosByUser({ userId: user.id, direction: "received" }),
    ]);
  } catch {
    header = EMPTY_HEADER;
    stats = EMPTY_STATS;
    sent = [];
    received = [];
  }

  return (
    <div
      className={`${montserrat.variable} ${montserratAlternates.variable} relative flex min-h-screen w-full flex-col bg-[#00101A] font-[family-name:var(--font-montserrat)]`}
    >
      <SiteHeader user={user} active="profile" />
      <main className="relative flex flex-1 flex-col">
        <ProfileHeader {...header} />
        <section className="w-full px-6 pb-24 sm:px-10 lg:px-36">
          <div className="mx-auto flex w-full max-w-[720px] flex-col gap-16">
            <SidebarStats stats={stats} />
            <ProfileKudosSection sent={sent} received={received} />
          </div>
        </section>
      </main>
      <SiteFooter />
    </div>
  );
}
