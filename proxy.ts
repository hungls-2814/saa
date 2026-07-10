import { type NextRequest, NextResponse } from "next/server";
import { updateSession } from "@/lib/supabase/middleware";
import { isBeforeLaunch } from "@/lib/event/countdown";
import { PREVIEW_COOKIE, INTRO_COOKIE } from "@/lib/prelaunch/cookies";

// Next 16 renamed middleware.ts -> proxy.ts (exported `proxy`, nodejs runtime).
// Refreshes the Supabase session and enforces route guards.

// The homepage is public; /he-thong-giai (Awards System detail page),
// /kudos (Sun* Kudos Live board), and /profile (own-profile page) are
// auth-gated routes.
const PROTECTED_PATHS: string[] = ["/he-thong-giai", "/kudos", "/profile"];
const AUTH_PATHS = ["/login"];
// The public countdown page. Until SAA opens, every route funnels here.
const PRELAUNCH_PATH = "/prelaunch";
// Cookie names (PREVIEW_COOKIE / INTRO_COOKIE) are shared with the page via
// @/lib/prelaunch/cookies so the writer here and the reader there stay in sync.

export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Preview mode is active when the request already carries the cookie or the
  // opt-in `?preview=1` query param is present (which also (re)sets the cookie
  // on the way out, below).
  const optInPreview = request.nextUrl.searchParams.get("preview") === "1";
  const previewActive =
    optInPreview || request.cookies.get(PREVIEW_COOKIE)?.value === "1";
  const beforeLaunch = isBeforeLaunch(new Date());
  // First-visit intro state (only consulted after launch, below).
  const introSeen = request.cookies.get(INTRO_COOKIE)?.value === "1";
  const introParam = request.nextUrl.searchParams.get("intro") === "1";
  // Serving the intro splash this request -> stamp the session cookie below.
  const servingIntro =
    !previewActive &&
    !beforeLaunch &&
    pathname === PRELAUNCH_PATH &&
    introParam &&
    !introSeen;

  // Auto-preview: OUTSIDE production only, drop reviewers straight into preview
  // when they land on the countdown page — no need to know the `?preview=1`
  // flag. Local dev and Vercel preview deployments (VERCEL_ENV != "production")
  // opt in. NOTE: this env check gates only the AUTO-redirect below. The manual
  // `?preview=1` opt-in (see `previewActive`) works in EVERY environment,
  // including production — a deliberate, accepted escape hatch, not a secret.
  // The pre-launch embargo therefore relies on `/prelaunch` being unadvertised,
  // not on `?preview=1` being unreachable in production.
  const autoPreview = process.env.VERCEL_ENV !== "production";
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
  if (!previewActive) {
    if (beforeLaunch) {
      if (pathname !== PRELAUNCH_PATH) {
        const url = request.nextUrl.clone();
        url.pathname = PRELAUNCH_PATH;
        url.search = "";
        return NextResponse.redirect(url);
      }
      if (introParam) {
        // No intro splash before launch — strip the stray `?intro=1` so the
        // page renders the real countdown, not the post-launch welcome. (The
        // page only ever sees the request via this guard.)
        const url = request.nextUrl.clone();
        url.searchParams.delete("intro");
        return NextResponse.redirect(url);
      }
    } else {
      // After launch: play the first-visit intro splash once per session on the
      // home route, then let normal routing resume. Only `/` and `/prelaunch`
      // are involved — deep links and auth routes are never hijacked.
      if (pathname === PRELAUNCH_PATH) {
        if (introSeen) {
          // Already seen -> the countdown page has no purpose; go home.
          const url = request.nextUrl.clone();
          url.pathname = "/";
          url.search = "";
          return NextResponse.redirect(url);
        }
        if (!introParam) {
          // Normalize so the page receives the splash signal (`?intro=1`).
          const url = request.nextUrl.clone();
          url.searchParams.set("intro", "1");
          return NextResponse.redirect(url);
        }
        // `/prelaunch?intro=1`, not yet seen -> fall through to serve the
        // splash; the session cookie is stamped after updateSession.
      } else if (pathname === "/" && !introSeen) {
        const url = request.nextUrl.clone();
        url.pathname = PRELAUNCH_PATH;
        url.searchParams.set("intro", "1");
        return NextResponse.redirect(url);
      }
    }
  }

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

  // Mark the intro as seen for the rest of this session (no maxAge/expires ->
  // session cookie, cleared when the browser closes).
  if (servingIntro) {
    supabaseResponse.cookies.set(INTRO_COOKIE, "1", {
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
