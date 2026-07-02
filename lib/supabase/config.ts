/**
 * Whether Supabase env vars are set to real values. Lets the app render
 * (UI preview, guarded routes) before a Supabase project is configured,
 * instead of crashing on every request. NEXT_PUBLIC_* vars are inlined into
 * both server and client bundles, so this works in the browser too.
 */
export function isSupabaseConfigured(): boolean {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  return Boolean(
    url &&
      key &&
      !url.includes("your-project-ref") &&
      key !== "your-anon-public-key",
  );
}
