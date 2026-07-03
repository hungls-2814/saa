---
feature: F002
name: Homepage SAA 2025
lang: en
screen: Homepage SAA — momorph i87tDx10uM (file 9ypp4enmFmdK3YAFJLIu6C)
status: active
---

# F002 — Homepage SAA 2025

## Purpose
Public landing page for Sun* Annual Awards 2025 at `/`. Introduces the "ROOT FURTHER"
theme, counts down to the event, presents the award-category system, and promotes
Sun* Kudos. Accessible to everyone; authenticated users additionally get a notification
bell and account menu in the header.

## User-facing surface (from MoMorph spec i87tDx10uM)
- **Header (A1)** — SAA logo (left → `/`); nav links `About SAA 2025` (active on home),
  `Awards Information`, `Sun* Kudos`; right controls: notification bell (auth only),
  language selector (VN/EN, always), account icon (auth only).
- **Hero (3.5 / B1–B3)** — full-bleed root-pattern key visual; `ROOT FURTHER` wordmark;
  `Coming soon`; countdown DAYS/HOURS/MINUTES; event info (time / location / livestream
  note); CTAs `ABOUT AWARDS` (filled) and `ABOUT KUDOS` (outline).
- **Root Further content (B4)** — decorative ROOT/FURTHER typography, description
  paragraphs, and the quote "A tree with deep roots fears no storm".
- **Awards system (C1/C2)** — section heading + responsive grid of 6 category cards
  (Top Talent, Top Project, Top Project Leader, Best Manager, Signature 2025 - Creator,
  MVP). Each: orb image + title + ≤2-line description + `Chi tiết` link.
- **Sun* Kudos (D1/D2)** — promo block: label, `Sun* Kudos` title, description, KUDOS
  key visual, `Chi tiết` button.
- **Footer (7)** — logo (→ `/`, top), nav links, copyright `Bản quyền thuộc về Sun* © 2025`.
- **Quick-action widget (6)** — floating pill (bottom-right), opens a placeholder menu.

## Behavior
1. **Countdown (B1.3)** — client timer reading `NEXT_PUBLIC_EVENT_DATETIME` (ISO-8601,
   default `2026-12-26T18:30:00+07:00`). Values 0-padded to 2 digits, refresh per minute.
   At/after the target: shows `00 00 00` and hides `Coming soon`. Invalid env value →
   graceful fallback (no crash), `Coming soon` hidden.
2. **Navigation** — logo & footer-logo → `/` (scroll top); `About SAA 2025` → home/top;
   `Awards Information` & `ABOUT AWARDS` → `/awards-information`; `Sun* Kudos`, `ABOUT
   KUDOS`, Kudos `Chi tiết` → `/kudos`; footer `Tiêu chuẩn chung` → `/standards`; each
   award card (image/title/`Chi tiết`) → `/awards-information#<slug>`.
3. **Auth-aware header** — server reads Supabase session; logged-in → notification bell +
   account menu (Profile, Sign out); logged-out → guest/login affordance. (Roles/Admin
   Dashboard deferred — no role system yet.)
4. **Language selector** — VN/EN via `NEXT_LOCALE` cookie (shared component, next-intl).
5. **Interactive menus** — account menu, notification panel, language menu, widget menu:
   open on click, close on outside-click / Esc, keyboard-operable (Enter/Space).

## Award category slugs
`top-talent`, `top-project`, `top-project-leader`, `best-manager`,
`signature-2025-creator`, `mvp`.

## Internationalization
All copy localized (`vi` default, `en`). VN copy verbatim from design; EN faithfully
translated. Countdown unit labels DAYS/HOURS/MINUTES per design.

## Out of scope (this iteration)
- Target pages `/awards-information`, `/kudos`, `/standards` (links are correct but 404).
- Real notification data, real quick-action commands (both placeholder).
- Role/permission gating (Admin Dashboard menu item).

## Acceptance criteria
- [x] Homepage renders at `/` for anonymous and authenticated users (public content).
- [x] Authenticated header shows notification bell + account menu; anonymous does not.
- [x] Countdown reads env datetime, decrements, 0-pads, and zeroes out + hides "Coming
      soon" at/after target; invalid datetime does not crash.
- [x] Awards grid: 3 cols desktop, 2 cols tablet/mobile; cards link to `#<slug>`.
- [x] All nav/CTA/footer/card links point to correct hrefs; logo scrolls to top.
- [x] VN/EN switch updates all copy and persists via `NEXT_LOCALE` cookie.
- [x] Layout matches the MoMorph design at desktop and narrow widths.

## Known deviations
- **Award descriptions** for Best Manager, Signature 2025 - Creator, and MVP reuse
  identical placeholder copy reproduced verbatim from the design (the source design
  itself repeats the same description text across these three cards).
- **Decorative bitmap art** (hero root-pattern key visual, Kudos key visual) recreated
  as CSS/SVG rather than exported images — MoMorph asset URLs were `null` and the
  Figma-image API returned 500 at implementation time.

## Key files (planned)
- UI: `app/(home)/page.tsx`, `app/(home)/components/**`, `app/components/language-selector.tsx`
- Logic: `lib/event/countdown.ts`
- i18n: `messages/{vi,en}.json` (Home namespace)
- Assets: `public/home/**`
- Config: `.env.local.example` (`NEXT_PUBLIC_EVENT_DATETIME`)
