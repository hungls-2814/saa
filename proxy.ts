import { type NextRequest, NextResponse } from "next/server";
import { updateSession } from "@/lib/supabase/middleware";
import { isBeforeLaunch } from "@/lib/event/countdown";
import { PREVIEW_COOKIE } from "@/lib/prelaunch/cookies";

// Next 16 renamed middleware.ts -> proxy.ts (exported `proxy`, nodejs runtime).
// Refreshes the Supabase session and enforces route guards.

// The homepage is public; /he-thong-giai (Awards System detail page),
// /kudos (Sun* Kudos Live board), and /profile (own-profile page) are
// auth-gated routes.
const PROTECTED_PATHS: string[] = ["/he-thong-giai", "/kudos", "/profile"];
const AUTH_PATHS = ["/login"];
// The public countdown page. Until SAA opens, every route funnels here.
const PRELAUNCH_PATH = "/prelaunch";
// PREVIEW_COOKIE is shared with the page via @/lib/prelaunch/cookies so the
// writer here and the reader there stay in sync.

export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Preview mode is active when the request already carries the cookie or the
  // opt-in `?preview=1` query param is present (which also (re)sets the cookie
  // on the way out, below).
  const optInPreview = request.nextUrl.searchParams.get("preview") === "1";
  const previewActive =
    optInPreview || request.cookies.get(PREVIEW_COOKIE)?.value === "1";
  const beforeLaunch = isBeforeLaunch(new Date());

  // Auto-preview: an explicit opt-in flag (PRELAUNCH_AUTO_PREVIEW=true) drops
  // reviewers straight into preview when they land on the countdown page — no
  // need to know the `?preview=1` flag. This is a plain server env var (not
  // NEXT_PUBLIC_, so it is read at runtime and can be toggled per environment
  // without a rebuild), decoupled from VERCEL_ENV so any environment can turn
  // it on/off independently. NOTE: this flag gates only the AUTO-redirect
  // below. The manual `?preview=1` opt-in (see `previewActive`) works in EVERY
  // environment regardless of this flag — a deliberate, accepted escape hatch,
  // not a secret. The pre-launch embargo relies on `/prelaunch` being
  // unadvertised, not on `?preview=1` being unreachable.
  const autoPreview = process.env.PRELAUNCH_AUTO_PREVIEW === "true";
  if (autoPreview && beforeLaunch && pathname === PRELAUNCH_PATH && !previewActive) {
    const url = request.nextUrl.clone();
    url.searchParams.set("preview", "1");
    return NextResponse.redirect(url);
  }

  // Pre-launch gate: while the countdown is still running, lock the whole app
  // to the countdown page. `/auth/*` and static assets (incl. the countdown's
  // own background image) are already excluded by `config.matcher`, so the
  // OAuth callback and page assets keep working. Preview mode skips this on
  // both sides.
  if (!previewActive && beforeLaunch && pathname !== PRELAUNCH_PATH) {
    const url = request.nextUrl.clone();
    url.pathname = PRELAUNCH_PATH;
    url.search = "";
    return NextResponse.redirect(url);
  }
  // After launch there is no server gate: the first-visit intro splash is
  // driven client-side per browser TAB (sessionStorage) by `IntroGate`, since
  // a cookie cannot be tab-scoped (it is shared across tabs and survives a tab
  // close). Serving `/` and `/prelaunch` normally lets that gate redirect
  // `/ -> /prelaunch` on a fresh tab without the server and client looping.

  const { supabaseResponse, user } = await updateSession(request);

  // Persist the preview opt-in so subsequent navigations stay unlocked without
  // repeating the query param. httpOnly, reviewer-only — never read by client
  // code (the prelaunch page reads it server-side).
  if (optInPreview) {
    supabaseResponse.cookies.set(PREVIEW_COOKIE, "1", {
      httpOnly: true,
      sameSite: "lax",
      path: "/",
    });
  }

  const isProtected = PROTECTED_PATHS.some((p) => pathname.startsWith(p));
  const isAuthPage = AUTH_PATHS.some((p) => pathname.startsWith(p));

  // Unauthenticated user on a protected route -> login.
  if (!user && isProtected) {
    const url = request.nextUrl.clone();
    url.pathname = "/login";
    return NextResponse.redirect(url);
  }

  // Authenticated user on the login page -> home.
  if (user && isAuthPage) {
    const url = request.nextUrl.clone();
    url.pathname = "/";
    return NextResponse.redirect(url);
  }

  return supabaseResponse;
}

export const config = {
  // Exclude /auth/* — the OAuth callback runs its own code exchange and does
  // not need the session-refresh round-trip on that hot path.
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|auth|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
