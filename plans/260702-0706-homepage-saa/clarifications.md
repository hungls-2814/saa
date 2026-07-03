# Clarifications — Homepage SAA (screen i87tDx10uM)

## Session 2026-07-02
- Q: Routing scope for nav/CTA/card links to pages that don't exist yet? → A: Build homepage only at `/`; wire links to their intended real hrefs (`/awards-information#<slug>`, `/kudos`, etc.); target pages built later.
- Q: Countdown target datetime + env var (design date 26/12/2025 is in the past)? → A: Add `NEXT_PUBLIC_EVENT_DATETIME` (ISO-8601), default `2026-12-26T18:30:00+07:00`; show `00 00 00` + hide "Coming soon" when reached; graceful fallback on invalid value.
- Q: How much auth-aware header behavior to build (no role system exists)? → A: Session-aware — logged-in shows notification bell + account menu (Profile, Sign out); logged-out shows guest/login affordance; language switcher always; notification panel + widget menu are presentational placeholders; Admin Dashboard item omitted with a TODO.
- Q: EN localization for the Vietnamese design copy? → A: Use exact VN copy from design; author faithful EN translations so both locales are complete.
