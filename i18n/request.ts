import { cookies } from "next/headers";
import { getRequestConfig } from "next-intl/server";
import {
  DEFAULT_LOCALE,
  LOCALE_COOKIE,
  SUPPORTED_LOCALES,
  type Locale,
} from "./config";

/**
 * next-intl "without i18n routing": the active locale is read from the
 * NEXT_LOCALE cookie at render time (no /vi or /en URL segment). Falls back
 * to Vietnamese when the cookie is missing or holds an unsupported value.
 */
export default getRequestConfig(async () => {
  const cookieStore = await cookies(); // Next 16: cookies() is async-only
  const cookieLocale = cookieStore.get(LOCALE_COOKIE)?.value;

  const locale: Locale = SUPPORTED_LOCALES.includes(cookieLocale as Locale)
    ? (cookieLocale as Locale)
    : DEFAULT_LOCALE;

  return {
    locale,
    messages: (await import(`../messages/${locale}.json`)).default,
  };
});
