import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import { isSupabaseConfigured } from "./config";

// Warn once (not per-request) so a misconfigured deploy leaves an operator signal.
let warnedUnconfigured = false;

/**
 * Refresh the Supabase auth session on each request. Writes refreshed cookies
 * to both the request (so downstream Server Components see them this request)
 * and the response (so the browser stores them). Invoked from proxy.ts.
 */
export async function updateSession(request: NextRequest) {
  let supabaseResponse = NextResponse.next({ request });

  // Supabase not configured yet: treat everyone as unauthenticated so the app
  // (and the /login UI) still renders. Real guards activate once env is set.
  if (!isSupabaseConfigured()) {
    if (!warnedUnconfigured) {
      warnedUnconfigured = true;
      console.warn(
        "[auth] Supabase env not set — auth disabled, all requests treated as " +
          "unauthenticated. See docs/setup/supabase-google-oauth.md",
      );
    }
    return { supabaseResponse, user: null };
  }

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value),
          );
          supabaseResponse = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options),
          );
        },
      },
    },
  );

  // Do NOT run code between createServerClient and getUser(): a stray throw
  // would skip the refresh and randomly sign users out. getUser() revalidates
  // the token against Supabase (never trust getSession() for authz).
  const {
    data: { user },
  } = await supabase.auth.getUser();

  return { supabaseResponse, user };
}
