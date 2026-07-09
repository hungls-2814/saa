import Image from "next/image";
import Link from "next/link";
import { getTranslations } from "next-intl/server";
import type { User } from "@supabase/supabase-js";
import { LanguageSelector } from "@/app/components/language-selector";
import { NotificationButton } from "./notification-button";
import { AccountMenu } from "./account-menu";

/**
 * Fixed top navigation: logo, primary nav links, notification bell (signed-in
 * only), language selector (always), and account menu / guest login affordance.
 *
 * Design: 80px tall, semi-transparent dark background (rgba(16,20,23,0.8)).
 */
// "profile" is a valid active value (own-profile page, reached via the account
// menu) but has no top-nav link, so it simply leaves every nav item unhighlighted.
type NavKey = "home" | "awards" | "kudos" | "profile";

const NAV_ACTIVE =
  "border-b border-[#FFEA9E] px-4 py-4 text-sm font-bold tracking-[0.1px] text-[#FFEA9E] [text-shadow:0_4px_4px_rgba(0,0,0,0.25),0_0_6px_#FAE287]";
const NAV_NORMAL =
  "rounded px-4 py-4 text-sm font-bold tracking-[0.1px] text-white transition-colors duration-200 ease-out hover:bg-white/5";

export async function SiteHeader({
  user,
  active = "home",
}: {
  user: User | null;
  /** Which nav item is the current page (gold + underline). Defaults to home. */
  active?: NavKey;
}) {
  const t = await getTranslations("Home");
  const cls = (key: NavKey) => (active === key ? NAV_ACTIVE : NAV_NORMAL);

  return (
    <header className="absolute inset-x-0 top-0 z-20 flex h-20 items-center bg-[rgba(16,20,23,0.8)]">
      <div className="mx-auto flex w-full max-w-[1440px] items-center justify-between px-6 py-3 sm:px-10 lg:px-36">
        <div className="flex items-center gap-16">
          {/* No badge background: the logo PNG is transparent (mark only) so it
              inherits THIS header's background on every screen — never a fixed
              color. (login-header renders it the same way.) */}
          <Link href="/" aria-label={t("nav.aboutSaa")}>
            <Image
              src="/login/logo.png"
              alt="Sun* Annual Awards 2025"
              width={52}
              height={48}
              className="h-12 w-[52px] object-contain"
              priority
            />
          </Link>

          <nav className="hidden items-center gap-6 md:flex">
            <Link href="/" className={cls("home")}>
              {t("nav.aboutSaa")}
            </Link>
            <Link href="/he-thong-giai" className={cls("awards")}>
              {t("nav.awardsInformation")}
            </Link>
            <Link href="/kudos" className={cls("kudos")}>
              {t("nav.sunKudos")}
            </Link>
          </nav>
        </div>

        <div className="flex items-center gap-4">
          {user && <NotificationButton />}
          <LanguageSelector />
          <AccountMenu user={user} />
        </div>
      </div>
    </header>
  );
}
