import { type NextRequest, NextResponse } from "next/server";
import { updateSession } from "@/lib/supabase/middleware";
import { isBeforeLaunch } from "@/lib/event/countdown";

// Next 16 renamed middleware.ts -> proxy.ts (exported `proxy`, nodejs runtime).
// Refreshes the Supabase session and enforces route guards.

// The homepage is public; /he-thong-giai (Awards System detail page) is the
// first auth-gated route. Kept as the extension point for future
// auth-gated pages (e.g. /profile).
const PROTECTED_PATHS: string[] = ["/he-thong-giai"];
const AUTH_PATHS = ["/login"];
// The public countdown page. Until SAA opens, every route funnels here.
const PRELAUNCH_PATH = "/prelaunch";

export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Pre-launch gate: while the countdown is still running, lock the whole app
  // to the countdown page. `/auth/*` and static assets (incl. the countdown's
  // own background image) are already excluded by `config.matcher`, so the
  // OAuth callback and page assets keep working. After launch the countdown
  // page has no purpose, so it redirects to the homepage instead.
  if (isBeforeLaunch(new Date())) {
    if (pathname !== PRELAUNCH_PATH) {
      const url = request.nextUrl.clone();
      url.pathname = PRELAUNCH_PATH;
      return NextResponse.redirect(url);
    }
  } else if (pathname === PRELAUNCH_PATH) {
    const url = request.nextUrl.clone();
    url.pathname = "/";
    return NextResponse.redirect(url);
  }

  const { supabaseResponse, user } = await updateSession(request);

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
