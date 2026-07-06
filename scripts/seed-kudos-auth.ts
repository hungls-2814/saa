/**
 * Auth-user + profile resolution helpers for scripts/seed-kudos.ts.
 *
 * profiles rows are never plain-inserted here — the on_auth_user_created
 * trigger (supabase/migrations/20260706000200_handle_new_user.sql) already
 * creates the row synchronously as part of admin.createUser()'s INSERT, so
 * we only ever UPDATE its department_id/title/avatar_url fields.
 */
import type { SupabaseClient } from "@supabase/supabase-js";
import type { SeedSunner } from "./seed-kudos-data";

async function findAuthUserByEmail(supabase: SupabaseClient, email: string) {
  // Small dev seed dataset — one page is enough in practice, but loop
  // defensively in case the target project already has many users.
  let page = 1;
  const perPage = 200;
  for (;;) {
    const { data, error } = await supabase.auth.admin.listUsers({ page, perPage });
    if (error) throw error;
    const match = data.users.find((u) => u.email === email);
    if (match) return match;
    if (data.users.length < perPage) return null;
    page += 1;
  }
}

export async function resolveOrCreateAuthUser(
  supabase: SupabaseClient,
  sunner: SeedSunner,
): Promise<string> {
  const { data, error } = await supabase.auth.admin.createUser({
    email: sunner.email,
    email_confirm: true,
    user_metadata: { full_name: sunner.fullName, avatar_url: sunner.avatarUrl },
  });
  if (!error && data.user) return data.user.id;

  if (error && /already.*registered|already.*exists/i.test(error.message)) {
    const existing = await findAuthUserByEmail(supabase, sunner.email);
    if (existing) return existing.id;
  }
  throw error ?? new Error(`Failed to create auth user for ${sunner.email}`);
}

export async function upsertSunnerProfile(
  supabase: SupabaseClient,
  sunner: SeedSunner,
  userId: string,
  departmentIds: Record<string, string>,
): Promise<void> {
  const { data, error } = await supabase
    .from("profiles")
    .update({
      department_id: departmentIds[sunner.departmentName],
      title: sunner.title,
      avatar_url: sunner.avatarUrl,
    })
    .eq("id", userId)
    .select("id");
  if (error) throw error;
  if (!data || data.length === 0) {
    throw new Error(
      `Expected trigger-created profile row for ${sunner.email} (id=${userId}) but found none.`,
    );
  }
}
