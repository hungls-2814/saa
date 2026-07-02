"use server";

import { cookies } from "next/headers";
import {
  LOCALE_COOKIE,
  SUPPORTED_LOCALES,
  type Locale,
} from "@/i18n/config";

/**
 * Server Action: persist the chosen UI language in the NEXT_LOCALE cookie.
 * The client calls this then router.refresh() to re-render with the new locale.
 */
export async function setLocale(locale: Locale) {
  if (!SUPPORTED_LOCALES.includes(locale)) return;

  const cookieStore = await cookies();
  cookieStore.set(LOCALE_COOKIE, locale, {
    path: "/",
    maxAge: 60 * 60 * 24 * 365, // 1 year
    sameSite: "lax",
  });
}
