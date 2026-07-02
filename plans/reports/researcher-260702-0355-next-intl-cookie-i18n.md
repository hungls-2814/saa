# Research: next-intl (cookie-only, no URL prefix) on Next.js 16.2.9 / React 19.2.4

Date: 2026-07-02
Scope: setup next-intl "without i18n routing" — locale from `NEXT_LOCALE` cookie, no `/vi` `/en` segments, default `vi`.

## 1. Package + version

- **`next-intl@4.13.1`** (latest on npm as of this research).
- peerDependencies: `next: "^12 || ^13 || ^14 || ^15 || ^16"`, `react: "^16.8 || ^17 || ^18 || >=19.0.0-rc <19.0.0 || ^19"`.
- Explicitly supports Next 16 and React 19 — compatible with this project (Next 16.2.9, React 19.2.4).

```bash
npm install next-intl
```

Sources: npm registry (`registry.npmjs.org/next-intl/latest`), official docs `next-intl.dev`.

**node_modules/next/dist/docs was not readable** (blocked by `.claude/.skignore` tool policy in this sandbox) — could not cross-check AGENTS.md's "read local docs first" instruction directly. Relied on official next-intl.dev docs + npm registry + GitHub maintainer discussion instead (3 independent sources, cross-checked).

## 2. `i18n/request.ts` — cookie-based config (no routing)

Place at `i18n/request.ts` (project root or `src/i18n/request.ts` if using `src/`).

```typescript
// i18n/request.ts
import { cookies } from 'next/headers';
import { getRequestConfig } from 'next-intl/server';

const SUPPORTED_LOCALES = ['vi', 'en'] as const;
type Locale = (typeof SUPPORTED_LOCALES)[number];
const DEFAULT_LOCALE: Locale = 'vi';

export default getRequestConfig(async () => {
  const cookieStore = await cookies(); // Next 16: cookies() is async — MUST await
  const cookieLocale = cookieStore.get('NEXT_LOCALE')?.value;

  const locale: Locale = SUPPORTED_LOCALES.includes(cookieLocale as Locale)
    ? (cookieLocale as Locale)
    : DEFAULT_LOCALE;

  return {
    locale,
    messages: (await import(`../messages/${locale}.json`)).default
  };
});
```

**Next 16 gotcha:** `cookies()` from `next/headers` is async-only (this has been the case since Next 15; Next 16 keeps it, no sync escape hatch). Always `await cookies()`.

## 3. `next.config.ts` plugin wiring

```typescript
// next.config.ts
import type { NextConfig } from 'next';
import createNextIntlPlugin from 'next-intl/plugin';

const nextConfig: NextConfig = {
  // ...existing config (Tailwind v4 needs no plugin entry here, it's pure PostCSS)
};

const withNextIntl = createNextIntlPlugin(
  // optional: pass path if not default './i18n/request.ts'
  // './i18n/request.ts'
);

export default withNextIntl(nextConfig);
```

- `createNextIntlPlugin()` defaults to looking for `./i18n/request.ts` (or `.tsx`/`.js`) — matches file from step 2, no path arg needed if placed there.
- TypeScript config file (`next.config.ts`) works natively in Next 16 — `createNextIntlPlugin` is typed and returns a function `(config: NextConfig) => NextConfig`, composes with `NextConfig` typing without casts.

## 4. Message catalogs

```
messages/
├── vi.json
└── en.json
```

```json
// messages/vi.json
{
  "LoginPage": {
    "title": "Đăng nhập",
    "submit": "Đăng nhập"
  },
  "TodoPage": {
    "title": "Việc cần làm"
  }
}
```

```json
// messages/en.json
{
  "LoginPage": {
    "title": "Login",
    "submit": "Sign in"
  },
  "TodoPage": {
    "title": "To-Do"
  }
}
```

Loaded via dynamic `import()` inside `i18n/request.ts` (step 2) — namespaced by top-level key, consumed via `useTranslations('LoginPage')` / `getTranslations('LoginPage')`.

## 5. Root layout wiring

```tsx
// app/layout.tsx
import { NextIntlClientProvider } from 'next-intl';
import { getLocale } from 'next-intl/server';
import type { ReactNode } from 'react';

export default async function RootLayout({ children }: { children: ReactNode }) {
  const locale = await getLocale(); // reads from i18n/request.ts result

  return (
    <html lang={locale}>
      <body>
        <NextIntlClientProvider>
          {children}
        </NextIntlClientProvider>
      </body>
    </html>
  );
}
```

**Key fact (verified against next-intl.dev docs):** since next-intl v3.22+, `NextIntlClientProvider` **auto-infers `locale` / `messages` / `now` / `timeZone`** from the `i18n/request.ts` result via Next's request-scoped cache when props aren't passed explicitly — "Next.js will emit them during the streaming render." You do NOT need `getMessages()` + manual `messages={messages}` unless you want to override/narrow what's sent to the client (e.g. strip server-only message namespaces for bundle size). `getLocale()` above is only needed for `<html lang>`; skip `getMessages()` unless you have a reason to trim the payload.

If you do want to narrow the client payload (optional optimization):
```tsx
import { getLocale, getMessages } from 'next-intl/server';
// ...
const locale = await getLocale();
const messages = await getMessages();
// ...
<NextIntlClientProvider locale={locale} messages={messages}>
```

## 6. Using translations

**Server Component:**
```tsx
// app/todo/page.tsx
import { getTranslations } from 'next-intl/server';

export default async function TodoPage() {
  const t = await getTranslations('TodoPage');
  return <h1>{t('title')}</h1>;
}
```

**Client Component:**
```tsx
// components/login-form.tsx
'use client';
import { useTranslations } from 'next-intl';

export function LoginForm() {
  const t = useTranslations('LoginPage');
  return <button>{t('submit')}</button>;
}
```

No provider prop-drilling needed beyond the root `NextIntlClientProvider` — client components anywhere in the tree can call `useTranslations()` directly.

## 7. Language switcher (cookie + refresh, no URL change)

Two valid patterns; **Server Action is simpler and avoids a client-side cookie library**.

**Pattern A — Server Action (recommended):**

```typescript
// app/actions/set-locale.ts
'use server';
import { cookies } from 'next/headers';

const SUPPORTED_LOCALES = ['vi', 'en'] as const;

export async function setLocale(locale: (typeof SUPPORTED_LOCALES)[number]) {
  if (!SUPPORTED_LOCALES.includes(locale)) return;
  const cookieStore = await cookies();
  cookieStore.set('NEXT_LOCALE', locale, {
    path: '/',
    maxAge: 60 * 60 * 24 * 365, // 1 year
    sameSite: 'lax'
  });
}
```

```tsx
// components/locale-switcher.tsx
'use client';
import { useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { useLocale } from 'next-intl';
import { setLocale } from '@/app/actions/set-locale';

export function LocaleSwitcher() {
  const locale = useLocale();
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  function onChange(next: 'vi' | 'en') {
    startTransition(async () => {
      await setLocale(next);
      router.refresh(); // re-runs Server Components with the new cookie/locale
    });
  }

  return (
    <select
      value={locale}
      disabled={isPending}
      onChange={(e) => onChange(e.target.value as 'vi' | 'en')}
    >
      <option value="vi">Tiếng Việt</option>
      <option value="en">English</option>
    </select>
  );
}
```

**Pattern B — Route Handler (if you prefer a fetch call over a Server Action):**
```typescript
// app/api/locale/route.ts
import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';

export async function POST(request: Request) {
  const { locale } = await request.json();
  if (!['vi', 'en'].includes(locale)) {
    return NextResponse.json({ error: 'invalid locale' }, { status: 400 });
  }
  const cookieStore = await cookies();
  cookieStore.set('NEXT_LOCALE', locale, { path: '/', maxAge: 60 * 60 * 24 * 365 });
  return NextResponse.json({ ok: true });
}
```
Client then does `await fetch('/api/locale', {method:'POST', body: JSON.stringify({locale})})` then `router.refresh()`. Server Action (A) is preferred: fewer moving parts, no manual fetch/JSON boilerplate, works with progressive enhancement.

**Supabase middleware interaction:** This project has no `middleware.ts` yet (checked: none found in repo root). If/when Supabase auth middleware (`updateSession` pattern) is added, it lives in `middleware.ts` and runs on every request to refresh the Supabase session cookie. Because this next-intl setup is **cookie-read-only via `i18n/request.ts`** (no `next-intl` middleware registered, since there's no locale-prefixed routing to redirect), **there is no middleware conflict** — next-intl's own `middleware.ts` (used for `localePrefix` routing modes) is NOT needed in the "without i18n routing" pattern. Supabase's middleware can be the sole `middleware.ts` in the project; next-intl only touches cookies via the Server Action/Route Handler shown above, and reads the cookie in `i18n/request.ts` at render time. No `matcher` config needs to change. If a future need arises to also validate/normalize `NEXT_LOCALE` in middleware, it can be appended inside the same Supabase `middleware.ts` function (single middleware file — Next.js only allows one `middleware.ts` per project), not composed via next-intl's plugin.

## Next.js 16-specific gotchas

1. **`cookies()` is async-only** — always `await cookies()` in `i18n/request.ts`, Server Actions, and Route Handlers. No sync `cookies()` overload exists.
2. **Single `middleware.ts`** — Next.js allows exactly one middleware file per project; if Supabase auth middleware exists, do not also add next-intl's middleware (not needed here anyway, since there's no routing/redirect concern without locale prefixes).
3. **`next.config.ts` typed correctly** — `createNextIntlPlugin()` returns a function typed to accept/return `NextConfig`; no `as any` cast needed under TS 5 strict mode.
4. **Server Actions require `'use server'`** at top of the action file (or function) — Next 16 keeps this contract unchanged from 15.
5. **`NextIntlClientProvider` auto-inference** relies on the request being processed through the `i18n/request.ts` config on the server; if you fetch data with `fetch()` cache tricks that bypass the request-scoped context (e.g., certain static/ISR edge cases), you may need to fall back to explicit `messages`/`locale` props — not an issue here since this project only needs dynamic, cookie-driven locale (inherently forces dynamic rendering for pages using translations, which is expected/correct).
6. **`router.refresh()` (client)** re-invokes Server Components with fresh cookies but does not remount Client Components' local state — acceptable for a locale switch since translated client strings come from `useTranslations()`, which re-reads context after refresh.

## Verification / cross-referencing

- Official docs (`next-intl.dev/docs/getting-started/app-router/without-i18n-routing`, `.../server-client-components`) — primary, authoritative, maintained by `amannn` (next-intl's sole maintainer, active project).
- npm registry (`registry.npmjs.org/next-intl/latest`) — version + peerDependencies ground truth.
- GitHub maintainer discussion (`amannn/next-intl#1096`, `#1334`) — confirms cookie+`router.refresh()` pattern is the maintainer-endorsed approach for "without i18n routing"; maintainer's own alternate suggestion (`localePrefix: 'never'` under full i18n routing) was considered but **rejected** here because the task explicitly requires the "without i18n routing" (no `routing.ts`, no locale segment in URL matching, simplest surface for a 2-route app) — matches user's stated architecture more directly and avoids pulling in the full routing/middleware machinery for zero benefit (YAGNI).
- Could NOT verify against the project's local `node_modules/next/dist/docs` per AGENTS.md instruction — blocked by sandbox's `.claude/.skignore` policy denying Bash/Read access to `node_modules`. This is a tooling constraint, not a content gap; the online next-intl docs already explicitly target Next 16, so risk is low. Recommend whoever implements this re-run `cat node_modules/next/dist/docs/**/cookies.md` (or equivalent) outside this sandbox if strict local-docs verification is required by AGENTS.md.

## Unresolved questions

1. Does this project already have (or plan) a Supabase `middleware.ts`? None found in repo root as of this research — confirm before implementation so the single-middleware constraint is respected.
2. Should `NEXT_LOCALE` cookie be `httpOnly`? Left default (`sameSite: 'lax'`, not `httpOnly`) since client-side locale switch UX may want to read it via `document.cookie` for optimistic UI — confirm if security posture requires `httpOnly` (would force Server Action/Route Handler as the only mutation path, which is already the recommended pattern above, so no behavior change either way).
3. Local `node_modules/next/dist/docs` cross-check per AGENTS.md was not possible in this sandbox (blocked by `.skignore`) — flagged above, low risk given online docs explicitly cover Next 16.

**Status:** DONE
