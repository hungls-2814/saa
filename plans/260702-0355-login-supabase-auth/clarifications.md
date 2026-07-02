# Clarifications — Login Page (Supabase Auth)

MoMorph refs:
- Login: https://momorph.ai/files/9ypp4enmFmdK3YAFJLIu6C/screens/GzbNeVGJHz

## Session 2026-07-02
- Q: How much of the VN/EN i18n should this iteration build? → A: Full functional i18n (next-intl, VN/EN message catalogs, NEXT_LOCALE cookie, real content switching)
- Q: Do you already have a Supabase project with Google OAuth configured? → A: No — wire the code AND write setup docs (create project, enable Google provider, redirect URLs) + .env.local.example
- Q: What to do about the /todo redirect target that doesn't exist yet? → A: Create a minimal protected /todo placeholder (redirects to /login when unauthenticated)
- Q: How should the login failure message be displayed? → A: Toast notification
- Q: Auth scope for Google login? → A: All Google accounts allowed (no domain restriction) — from spec item 2.2.1
- Q: Default language? → A: VN (Vietnamese), from spec item 1.2
