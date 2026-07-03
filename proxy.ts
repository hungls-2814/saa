import { type NextRequest, NextResponse } from "next/server";
import { updateSession } from "@/lib/supabase/middleware";

// Next 16 renamed middleware.ts -> proxy.ts (exported `proxy`, nodejs runtime).
// Refreshes the Supabase session and enforces route guards.

// The homepage is public; /he-thong-giai (Awards System detail page) is the
// first auth-gated route. Kept as the extension point for future
// auth-gated pages (e.g. /profile).
const PROTECTED_PATHS: string[] = ["/he-thong-giai"];
const AUTH_PATHS = ["/login"];

export async function proxy(request: NextRequest) {
  const { supabaseResponse, user } = await updateSession(request);
  const { pathname } = request.nextUrl;

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
