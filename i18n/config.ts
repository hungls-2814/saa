/**
 * Client-safe i18n constants. Kept separate from request.ts (which imports
 * next/headers and is server-only) so Client Components can import these
 * without dragging server-only code into the browser bundle.
 */
export const SUPPORTED_LOCALES = ["vi", "en"] as const;
export type Locale = (typeof SUPPORTED_LOCALES)[number];
export const DEFAULT_LOCALE: Locale = "vi";
export const LOCALE_COOKIE = "NEXT_LOCALE";
