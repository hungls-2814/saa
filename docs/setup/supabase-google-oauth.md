# Setup — Supabase + Google OAuth (Login)

The login page runs Google OAuth through Supabase Auth. Follow these steps once to
enable real login on your machine. All Google accounts are allowed (no domain restriction).

## 1. Create a Supabase project
1. Go to <https://supabase.com/dashboard> → **New project**.
2. Note your **Project URL** and **anon public key**: Project → **Settings → API**.

## 2. Create a Google OAuth client
1. <https://console.cloud.google.com> → create/select a project.
2. **APIs & Services → OAuth consent screen** → configure (External; app name; support email).
3. **APIs & Services → Credentials → Create Credentials → OAuth client ID** → type **Web application**.
4. **Authorized JavaScript origins:** `http://localhost:3000`
5. **Authorized redirect URIs:**
   `https://<your-project-ref>.supabase.co/auth/v1/callback`
   (This is the **Supabase** callback, NOT the app's `/auth/callback`.)
6. Copy the **Client ID** and **Client Secret**.

## 3. Enable Google in Supabase
1. Supabase Dashboard → **Authentication → Providers → Google** → enable.
2. Paste the Google **Client ID** + **Client Secret**.
3. **Authentication → URL Configuration:**
   - **Site URL:** `http://localhost:3000`
   - **Redirect URLs:** add `http://localhost:3000/auth/callback`

## 4. Wire the app
```bash
cp .env.local.example .env.local
```
Fill `.env.local`:
```
NEXT_PUBLIC_SUPABASE_URL=https://<your-project-ref>.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=<anon-public-key>
```
Restart the dev server (`npm run dev`). Env changes require a restart.

> Until `.env.local` holds real values, login is disabled by design: the app detects the
> placeholder/unset config (`lib/supabase/config.ts`) and shows the failure toast instead
> of hitting a broken OAuth URL. The rest of the UI and the VN/EN switcher work regardless.

## 5. Verify end-to-end
1. Open <http://localhost:3000/login> → click **LOGIN With Google**.
2. Complete Google sign-in → you land on `/todo` showing your email + a sign-out button.
3. Visit `/login` while signed in → redirected to `/todo`.
4. Sign out → back to `/login`. Visit `/todo` while signed out → redirected to `/login`.

## How it fits together
- Route guards + session refresh: `proxy.ts` → `lib/supabase/middleware.ts` (Next 16 renamed `middleware.ts` → `proxy.ts`).
- OAuth code exchange: `app/auth/callback/route.ts`.
- Clients: `lib/supabase/{client,server}.ts`. Sign-out: `lib/auth/sign-out.ts`.
- Auth decisions use `getUser()` (revalidated), never `getSession()`.
