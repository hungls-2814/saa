# Research: Supabase Auth (Google OAuth) in Next.js 16.2.9 App Router

Date: 2026-07-02. Stack: Next.js 16.2.9, React 19.2.4, TS5, Tailwind v4, npm, linux.

## 1. Packages & versions

```bash
npm install @supabase/supabase-js @supabase/ssr
```

- `@supabase/supabase-js@2.110.0` (latest, npm registry verified) — engines: `node >=22.0.0`. Project should run Node 22+ (Next 16 itself only requires Node 20.9+, so pin Node to whatever satisfies both; 22 LTS is safe).
- `@supabase/ssr@0.12.0` (latest, npm registry verified) — peer dep `@supabase/supabase-js: ^2.108.0`, satisfied by 2.110.0.
- `@supabase/ssr` is the **only current recommended approach**. `@supabase/auth-helpers-nextjs` is deprecated — official Supabase docs and migration guide (supabase.com/docs/guides/auth/server-side/migrating-to-ssr-from-auth-helpers) explicitly say to move off it. Do not install `auth-helpers-nextjs`.
- Confirmed via 3 independent sources: npm registry (authoritative version truth), Supabase official "Creating a client for SSR" docs, Supabase's own "AI Prompt: Bootstrap Next.js v16 app with Supabase Auth" page (supabase.com/docs/guides/getting-started/ai-prompts/nextjs-supabase-auth) — this last one is Supabase's **first-party guidance written specifically for Next.js v16**, strong signal the pattern below is current.

## 2. Supabase clients (App Router)

Cookie handling contract, stated explicitly by Supabase docs and enforced by their AI-prompt guide: **use only `getAll()`/`setAll()`**. Never `get`/`set`/`remove` — those are the deprecated auth-helpers shape and "will break in production."

### (a) Browser client — `lib/supabase/client.ts`

```ts
import { createBrowserClient } from '@supabase/ssr'

export function createClient() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  )
}
```

### (b) Server client — `lib/supabase/server.ts`

**Next 16 gotcha:** `cookies()` from `next/headers` is fully async in Next 16 (sync access removed, not just deprecated as in v15). Must `await cookies()`.

```ts
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'

export async function createClient() {
  const cookieStore = await cookies()

  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll()
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options)
            )
          } catch {
            // setAll called from a Server Component (cookies are read-only there).
            // Safe to ignore IF middleware is also refreshing sessions (see below).
          }
        },
      },
    }
  )
}
```

Call `createClient()` fresh per request (it's async now) — do not module-scope a singleton.

### (c) Middleware client for session refresh — `lib/supabase/middleware.ts`

Server Components can't write cookies, so token refresh has to happen in middleware, which writes to both the incoming request (so downstream Server Components see the refreshed cookie in the same request) and the outgoing response (so the browser gets it).

```ts
import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

export async function updateSession(request: NextRequest) {
  let supabaseResponse = NextResponse.next({ request })

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll()
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value)
          )
          supabaseResponse = NextResponse.next({ request })
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          )
        },
      },
    }
  )

  // IMPORTANT: do not run code between createServerClient and getUser().
  // A stray error would skip token refresh and randomly log users out.
  const {
    data: { user },
  } = await supabase.auth.getUser()

  return { supabaseResponse, user }
}
```

**Security note (official docs, repeated across multiple sources):** never trust `supabase.auth.getSession()` in middleware/server code — it reads the JWT from cookies without revalidating. Always use `supabase.auth.getUser()`, which round-trips to the Supabase Auth server.

## 3. Google OAuth flow

### Client component — sign-in button

```tsx
'use client'
import { createClient } from '@/lib/supabase/client'

export function GoogleSignInButton() {
  const supabase = createClient()

  const handleSignIn = async () => {
    await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: `${location.origin}/auth/callback`,
      },
    })
  }

  return <button onClick={handleSignIn}>Sign in with Google</button>
}
```

### Callback route handler — `app/auth/callback/route.ts`

Next 16 route handler signature: exported HTTP-method functions receive `(request: Request, ctx: RouteContext)` — `ctx.params` is a Promise (use `next typegen` for the `RouteContext<'/path'>` helper if params are needed; this route has none).

```ts
import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url)
  const code = searchParams.get('code')
  const next = searchParams.get('next') ?? '/todo'

  if (code) {
    const supabase = await createClient()
    const { error } = await supabase.auth.exchangeCodeForSession(code)
    if (!error) {
      return NextResponse.redirect(`${origin}${next}`)
    }
  }

  return NextResponse.redirect(`${origin}/login?error=auth_callback_failed`)
}
```

## 4. Route protection — Next 16 middleware/proxy gotcha

**This is the single biggest Next 16-specific gotcha for this task.** Confirmed directly from the official Next.js 16 upgrade guide (nextjs.org/docs/app/guides/upgrading/version-16):

- `middleware.ts`/`middleware.js` filename and the `middleware` export are **deprecated** in Next 16, renamed to `proxy.ts` / exported function `proxy`.
- `proxy` runs **only on the `nodejs` runtime** — edge runtime is not supported and not configurable for `proxy`. If you need edge, you must keep using the old `middleware.ts` (still functional, just deprecated, will be removed in a future major).
- Supabase's own Next-16-targeted guidance already reflects this: their AI-prompt doc for bootstrapping v16 apps refers to a "Proxy" (not "Middleware") to refresh tokens — Supabase has adapted their docs to the new naming.
- **Recommendation for this project:** name the file `proxy.ts` at the project root (or `src/proxy.ts`) with an exported `proxy` function, since `@supabase/ssr`'s cookie read/write pattern is plain `NextRequest`/`NextResponse` and has no edge-runtime-only dependency — nothing is lost by running on `nodejs`. If migrating an existing `middleware.ts`, the official codemod handles the rename: `npx @next/codemod@canary upgrade latest`.

### `proxy.ts` (root of project)

```ts
import { type NextRequest, NextResponse } from 'next/server'
import { updateSession } from '@/lib/supabase/middleware'

const PROTECTED_PATHS = ['/todo']
const AUTH_PATHS = ['/login']

export async function proxy(request: NextRequest) {
  const { supabaseResponse, user } = await updateSession(request)
  const { pathname } = request.nextUrl

  const isProtected = PROTECTED_PATHS.some((p) => pathname.startsWith(p))
  const isAuthPage = AUTH_PATHS.some((p) => pathname.startsWith(p))

  if (!user && isProtected) {
    const url = request.nextUrl.clone()
    url.pathname = '/login'
    return NextResponse.redirect(url)
  }

  if (user && isAuthPage) {
    const url = request.nextUrl.clone()
    url.pathname = '/todo'
    return NextResponse.redirect(url)
  }

  return supabaseResponse
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
}
```

If the team prefers staying on the deprecated-but-working `middleware.ts` name during this cycle (e.g. to match existing tutorials/tooling), the same code works verbatim with `export function middleware(...)` instead of `proxy` — just expect a deprecation warning and a future forced migration.

## 5. Reading current user / sign-out

### Server component

```tsx
import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'

export default async function TodoPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) redirect('/login') // defense in depth; proxy already guards this route

  return <div>Welcome {user.email}</div>
}
```

### Sign-out (Server Action, recommended so cookies clear server-side)

```ts
'use server'
import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'

export async function signOut() {
  const supabase = await createClient()
  await supabase.auth.signOut()
  redirect('/login')
}
```

Wire to a client-rendered form button: `<form action={signOut}><button type="submit">Sign out</button></form>`.

## 6. Env vars & dashboard setup

```bash
# .env.local
NEXT_PUBLIC_SUPABASE_URL=https://<project-ref>.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=<anon-public-key>
```

(Supabase's newest docs are transitioning naming to `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` for the new-style publishable key, but `ANON_KEY` is the classic name, still fully supported and what the task specified — either works, keep them equivalent in the dashboard's API settings page.)

### Google Cloud Console
1. console.cloud.google.com → create/select project.
2. APIs & Services → OAuth consent screen → configure (External, app name, support email).
3. APIs & Services → Credentials → Create Credentials → OAuth client ID → Application type: **Web application**.
4. **Authorized JavaScript origins:** `http://localhost:3000` (dev), plus prod origin.
5. **Authorized redirect URIs:** `https://<project-ref>.supabase.co/auth/v1/callback` — this is the Supabase Auth server callback, NOT your app's `/auth/callback` route. Format confirmed by official Supabase Google login guide.
6. Copy Client ID + Client Secret.

### Supabase Dashboard
1. Authentication → Providers → Google → toggle enabled.
2. Paste Client ID + Client Secret from Google Cloud.
3. Authentication → URL Configuration:
   - **Site URL:** `http://localhost:3000` for local dev (swap to prod domain at deploy).
   - **Redirect URLs** (allow-list, supports wildcards): add `http://localhost:3000/auth/callback` so `exchangeCodeForSession` redirect target passes Supabase's allow-list check.

## Other Next 16 gotchas relevant to this feature

- `next lint` removed — use ESLint CLI directly (`eslint.config.mjs` already present in this repo, confirmed via package.json `"lint": "eslint"`).
- Route handler `params`/`searchParams` and `cookies()`/`headers()` are async everywhere — any dynamic auth route reading params must `await`.
- Turbopack is default for `next dev`/`next build` — no impact on Supabase code, but if the project has custom webpack config, `next build` fails unless flagged; not applicable here (no custom webpack config found in this repo).
- Node.js 20.9+ required by Next 16; `@supabase/supabase-js` 2.110 wants Node 22+ — use Node 22 to satisfy both.

## Unresolved questions
- Whether this project wants the file named `proxy.ts` (new, forward-compatible) or `middleware.ts` (deprecated but still functional) — recommendation above is `proxy.ts`, needs explicit confirmation before implementation since it's a naming/convention decision, not a technical blocker.
- WebFetch could not retrieve fully-rendered literal code blocks from supabase.com/docs pages directly (JS-rendered tabs) — code above was reconstructed from verified fragments (Google OAuth page, AI-prompt page, WebSearch-extracted snippets, community writeups) that agree on the `getAll`/`setAll`-only contract; not literally copy-pasted from one single doc page. Recommend a quick manual cross-check against supabase.com/docs/guides/auth/server-side/nextjs in-browser before finalizing if pixel-exact doc parity matters.
- context7 (search-docs skill) returned "not found" for all Next.js/Supabase queries in this environment — likely an API/network issue in this sandbox, not a documentation-availability issue. Fell back to WebSearch/WebFetch/npm registry per skill's built-in fallback rule.

**Status:** DONE
