/**
 * Idempotent dev/staging seed for the Kudos Live board (F005).
 *
 * Run via `npm run db:seed` — AFTER `supabase db push` has applied the
 * migrations in supabase/migrations/. Requires SUPABASE_SERVICE_ROLE_KEY
 * (server/tooling-only, NEVER prefix NEXT_PUBLIC_) and
 * NEXT_PUBLIC_SUPABASE_URL in the environment (.env.local).
 *
 * Idempotency: every write in ./seed-kudos-domain.ts and ./seed-kudos-auth.ts
 * is an upsert keyed on a natural or fixed key, so running this script twice
 * produces zero duplicate rows.
 *
 * No generated `Database` types exist yet for this project, so the
 * supabase-js client below is untyped (falls back to `any` column shapes
 * internally) — acceptable for a one-off dev seed script; do not carry this
 * pattern into application query modules (see lib/kudos/* in later phases).
 */
import { createClient } from "@supabase/supabase-js";
import { resolveOrCreateAuthUser, upsertSunnerProfile } from "./seed-kudos-auth";
import { DEPARTMENTS, GIFT_IDS, HASHTAGS, KUDOS_IDS, SUNNERS } from "./seed-kudos-data";
import {
  upsertDepartments,
  upsertGifts,
  upsertHashtags,
  upsertHearts,
  upsertKudos,
  upsertKudosHashtags,
  upsertKudosImages,
} from "./seed-kudos-domain";

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_URL || !SERVICE_ROLE_KEY) {
  throw new Error(
    "NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are required to seed — " +
      "the service role key must never be exposed to the client bundle.",
  );
}

const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
  auth: { autoRefreshToken: false, persistSession: false },
});

async function main(): Promise<void> {
  console.log("Seeding Kudos Live board data…");

  const departmentIds = await upsertDepartments(supabase);
  const hashtagIds = await upsertHashtags(supabase);

  const profileIds: Record<string, string> = {};
  for (const sunner of SUNNERS) {
    const userId = await resolveOrCreateAuthUser(supabase, sunner);
    await upsertSunnerProfile(supabase, sunner, userId, departmentIds);
    profileIds[sunner.email] = userId;
  }

  await upsertKudos(supabase, profileIds);
  await upsertKudosHashtags(supabase, hashtagIds);
  await upsertKudosImages(supabase);
  await upsertHearts(supabase, profileIds);
  await upsertGifts(supabase, profileIds);

  console.log(
    `Seed complete: ${DEPARTMENTS.length} departments, ${HASHTAGS.length} hashtags, ` +
      `${SUNNERS.length} sunners, ${KUDOS_IDS.length} kudos, ${GIFT_IDS.length} gifts.`,
  );
}

main().catch((error: unknown) => {
  console.error("Seed failed:", error);
  process.exitCode = 1;
});
