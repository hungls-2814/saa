import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { LOGIN_ERROR_PATH } from "@/lib/auth/constants";

/**
 * Only allow same-origin relative redirect targets. Rejects absolute URLs and
 * protocol-relative `//host` paths to prevent an open-redirect via `?next=`.
 */
function safeNext(next: string | null): string {
  if (next && next.startsWith("/") && !next.startsWith("//")) return next;
  return "/";
}

/**
 * Google OAuth callback: Supabase redirects here with a `code`. Exchange it
 * for a session (sets auth cookies), then redirect into the app. On failure,
 * bounce back to /login with an error flag the page turns into a toast.
 */
export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");
  const next = safeNext(searchParams.get("next"));

  if (code) {
    const supabase = await createClient();
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (!error) {
      return NextResponse.redirect(`${origin}${next}`);
    }
  }

  return NextResponse.redirect(`${origin}${LOGIN_ERROR_PATH}`);
}
