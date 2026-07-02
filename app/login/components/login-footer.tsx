import { useTranslations } from "next-intl";

/**
 * Fixed bottom footer with centered copyright text.
 * Design: top divider border (#2E3940), Montserrat Alternates bold 16px.
 * next-intl's useTranslations works in Server Components — no "use client".
 */
export function LoginFooter() {
  const t = useTranslations("Common");

  return (
    <footer className="absolute inset-x-0 bottom-0 z-10 flex items-center justify-center border-t border-[#2E3940] px-6 py-10 sm:px-[90px]">
      <p className="font-[family-name:var(--font-montserrat-alternates)] text-base font-bold leading-6 text-white">
        {t("footer")}
      </p>
    </footer>
  );
}
