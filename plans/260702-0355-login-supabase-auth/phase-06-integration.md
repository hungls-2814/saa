# Phase 06 — Integration (UI ↔ i18n ↔ Supabase)

**Priority:** High · **Status:** done · Integrates 02/03/04/05.

## Steps
1. **i18n into UI:** replace static VN strings in the login screen with `useTranslations('Login')` / `Common`. Move all copy into `messages/vi.json` + `en.json`.
2. **Login button → Supabase:** wire the button `onClick` to a client handler calling `supabase.auth.signInWithOAuth({ provider:'google', options:{ redirectTo: location.origin + '/auth/callback' }})`; manage `loading` state (disable + spinner) until redirect.
3. **Toast:** lightweight toast (custom, no heavy dep) shown when `?error=auth_callback_failed` present on `/login`; message = `Login.errorToast` ("Đăng nhập không thành công. Vui lòng thử lại."). Read the param, show toast, then clean the URL.
4. **Locale switcher:** replace the presentational language trigger in the header with a functional `LocaleSwitcher` (VN/EN dropdown → `setLocale` action + `router.refresh()`), styled to match the Figma trigger (flag + label + chevron).
5. Verify `/login` guarded-redirect (authed → /todo) and `/todo` guard (unauth → /login) work with proxy.

## Success
End-to-end: login flow triggers Google OAuth; error → toast; language toggles VN/EN persistently; guards enforced. `npx tsc --noEmit` + `npm run lint` clean.
