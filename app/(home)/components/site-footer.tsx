import Image from "next/image";
import Link from "next/link";
import { getTranslations } from "next-intl/server";

/**
 * Footer: logo (links home), nav links, and copyright — matching the login
 * footer's divider/typography treatment but with the homepage nav links.
 */
export async function SiteFooter() {
  const t = await getTranslations("Home.footer");

  const links = [
    { href: "/", label: t("aboutSaa") },
    { href: "/he-thong-giai", label: t("awardsInformation") },
    { href: "/kudos", label: t("sunKudos") },
    { href: "/standards", label: t("standards") },
  ];

  return (
    <footer className="w-full border-t border-[#2E3940] bg-[#00101A]">
      <div className="mx-auto flex w-full max-w-[1440px] flex-col items-center gap-6 px-6 py-10 sm:flex-row sm:justify-between sm:px-10 lg:px-[90px]">
        <div className="flex flex-wrap items-center justify-center gap-6 sm:gap-12">
          {/* No badge background: the logo PNG is transparent (mark only) so it
              inherits THIS footer's background on every screen — never a fixed color. */}
          <Link href="/" aria-label={t("aboutSaa")}>
            <Image
              src="/login/logo.png"
              alt="Sun* Annual Awards 2025"
              width={69}
              height={64}
              className="h-16 w-[69px] object-contain"
            />
          </Link>
          <nav className="flex flex-wrap items-center justify-center gap-4 sm:gap-8">
            {links.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className="rounded px-2 py-2 text-sm font-bold text-white transition-colors duration-200 ease-out hover:bg-white/5"
              >
                {link.label}
              </Link>
            ))}
          </nav>
        </div>

        <p className="font-[family-name:var(--font-montserrat-alternates)] text-base font-bold leading-6 text-white">
          {t("copyright")}
        </p>
      </div>
    </footer>
  );
}
