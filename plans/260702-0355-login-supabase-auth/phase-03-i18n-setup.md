# Phase 03 — i18n Setup (Track B)

**Priority:** High · **Status:** done
**Reference:** `../reports/researcher-260702-0355-next-intl-cookie-i18n.md` (full code)

## Files to create
- `i18n/request.ts` — `getRequestConfig`: `await cookies()`, read `NEXT_LOCALE`, validate against `['vi','en']`, default `vi`; load `messages/${locale}.json`.
- `messages/vi.json`, `messages/en.json` — namespaced catalogs. Namespaces: `Login` (title "ROOT FURTHER", subtitle, tagline, button label, error toast), `Common` (footer copyright, language names), `Todo` (placeholder).
- `lib/i18n/set-locale.ts` — `'use server'` action `setLocale(locale)`: validate, set `NEXT_LOCALE` cookie (path `/`, 1yr, sameSite lax).

## Files to modify
- `app/layout.tsx` — make async; `const locale = await getLocale()`; `<html lang={locale}>`; wrap children in `<NextIntlClientProvider>` (auto-infers messages). Keep Geist fonts.

## Content source
Vietnamese strings come verbatim from MoMorph design (see spec). English = faithful translations.

## Success
`npx tsc --noEmit` clean; layout renders with provider; translations resolvable server + client side.
