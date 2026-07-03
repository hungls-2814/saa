# Phase 02 — Behavior & Integration (Track B)

## Goal
Provide and integrate the non-UI behavior the homepage depends on.

## Work items
1. **Countdown util** — `lib/event/countdown.ts`: pure functions
   - `parseEventDate(iso: string | undefined): Date | null` (invalid → null)
   - `getCountdown(target: Date | null, now: Date): { days, hours, minutes, ended } | null`
   - 0-pad handled at format time; `ended` true when now ≥ target.
2. **Env config** — add `NEXT_PUBLIC_EVENT_DATETIME=2026-12-26T18:30:00+07:00` to
   `.env.local.example`; document in `docs/setup/`.
3. **i18n** — add `Home` namespace to `messages/vi.json` (verbatim design copy) and
   `messages/en.json` (faithful EN). Keys for nav, hero, event info, CTAs, Root Further
   paragraphs + quote, awards heading + 6 titles/descriptions, Kudos block, footer,
   account/notification/widget labels.
4. **Auth-aware header** — `app/(home)/page.tsx` reads Supabase session
   (`lib/supabase/server.ts`) and passes `user` to `<SiteHeader>`; account menu uses the
   existing `signOut` action. Guest state when no session.
5. **Shared language selector** — extract login's `LanguageSelector` to
   `app/components/language-selector.tsx`; update login header import (DRY).
6. **Routing** — ensure hrefs match the map; `/` stays public (proxy.ts unchanged).

## Integration
Wire Track A components to these as each lands. No blocking merge point.

## Status
**COMPLETE**

## Delivery
- Countdown util `lib/event/countdown.ts`: pure functions with full test coverage.
- Env config: `NEXT_PUBLIC_EVENT_DATETIME` added to `.env.local.example` and setup docs.
- i18n: `Home` namespace with 80+ keys across `messages/vi.json` and `messages/en.json`.
- Auth-aware header: Supabase session read in `app/(home)/page.tsx`, account menu wired.
- Shared language selector extracted to `app/components/language-selector.tsx`; login header updated (DRY).
- All routing links verified against spec map.
