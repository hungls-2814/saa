# Clarifications — Hệ thống giải thưởng (screen zFYDgyj_pD)

## Session 2026-07-03
- Q: URL for this page (spec says `/he-thong-giai`, homepage links to `/awards-information`)? → A: Use `/he-thong-giai` (bám design); update homepage award cards + "Awards Information" nav + footer link to `/he-thong-giai#<slug>`.
- Q: Auth-protect the page (spec ID-1: unauthenticated → /login)? → A: Yes — add `/he-thong-giai` to `proxy.ts` PROTECTED_PATHS; server page also redirects to /login when no session. Homepage stays public.
- Q: Build base branch (reuses homepage components in unmerged PR #2)? → A: Build on `feat/homepage-saa` (reuse SiteHeader/SiteFooter/LanguageSelector, `public/home/award-*.png` orbs, hero art, KudosSection, awards-data); deliver as its own branch/PR (stacked on / after PR #2).
