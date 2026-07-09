/**
 * Domain-table upsert helpers for scripts/seed-kudos.ts.
 * Every write is keyed on a natural or fixed key so re-running the seed
 * produces zero duplicate rows.
 */
import type { SupabaseClient } from "@supabase/supabase-js";
import {
  DEPARTMENTS,
  GIFT_DESCRIPTION,
  GIFT_IDS,
  HASHTAGS,
  KUDOS_IDS,
  KUDOS_TITLES,
  SUNNERS,
  THANK_YOU_CONTENT,
} from "./seed-kudos-data";

export async function upsertDepartments(supabase: SupabaseClient): Promise<Record<string, string>> {
  const map: Record<string, string> = {};
  for (const name of DEPARTMENTS) {
    const { data, error } = await supabase
      .from("departments")
      .upsert({ name }, { onConflict: "name" })
      .select("id")
      .single();
    if (error) throw error;
    map[name] = data.id;
  }
  return map;
}

export async function upsertHashtags(supabase: SupabaseClient): Promise<Record<string, string>> {
  const map: Record<string, string> = {};
  for (const label of HASHTAGS) {
    const { data, error } = await supabase
      .from("hashtags")
      .upsert({ label }, { onConflict: "label" })
      .select("id")
      .single();
    if (error) throw error;
    map[label] = data.id;
  }
  return map;
}

export async function upsertKudos(
  supabase: SupabaseClient,
  profileIds: Record<string, string>,
): Promise<void> {
  const rows = KUDOS_IDS.map((id, i) => ({
    id,
    sender_id: profileIds[SUNNERS[i % SUNNERS.length].email],
    receiver_id: profileIds[SUNNERS[(i + 3) % SUNNERS.length].email], // offset 3, never 0 mod 8 → no self-kudos
    title: KUDOS_TITLES[i % KUDOS_TITLES.length], // Danh hiệu — shown as the card heading (F006)
    content: THANK_YOU_CONTENT,
  }));
  const { error } = await supabase.from("kudos").upsert(rows, { onConflict: "id" });
  if (error) throw error;
}

export async function upsertKudosHashtags(
  supabase: SupabaseClient,
  hashtagIds: Record<string, string>,
): Promise<void> {
  const rows = KUDOS_IDS.flatMap((kudosId, i) => [
    { kudos_id: kudosId, hashtag_id: hashtagIds[HASHTAGS[i % HASHTAGS.length]] },
    { kudos_id: kudosId, hashtag_id: hashtagIds[HASHTAGS[(i + 1) % HASHTAGS.length]] },
  ]);
  const { error } = await supabase
    .from("kudos_hashtags")
    .upsert(rows, { onConflict: "kudos_id,hashtag_id" });
  if (error) throw error;
}

export async function upsertKudosImages(supabase: SupabaseClient): Promise<void> {
  const rows = KUDOS_IDS.slice(0, 3).flatMap((kudosId, i) => [
    { kudos_id: kudosId, url: `https://picsum.photos/seed/kudos-${i}-a/480/360` },
    { kudos_id: kudosId, url: `https://picsum.photos/seed/kudos-${i}-b/480/360` },
  ]);
  const { error } = await supabase.from("kudos_images").upsert(rows, { onConflict: "kudos_id,url" });
  if (error) throw error;
}

export async function upsertHearts(
  supabase: SupabaseClient,
  profileIds: Record<string, string>,
): Promise<void> {
  const rows: { user_id: string; kudos_id: string }[] = [];
  for (let i = 0; i < KUDOS_IDS.length; i++) {
    const senderEmail = SUNNERS[i % SUNNERS.length].email;
    for (const offset of [1, 5]) {
      const hearter = SUNNERS[(i + offset) % SUNNERS.length];
      if (hearter.email === senderEmail) continue; // no self-likes
      rows.push({ user_id: profileIds[hearter.email], kudos_id: KUDOS_IDS[i] });
    }
  }
  const { error } = await supabase.from("hearts").upsert(rows, { onConflict: "user_id,kudos_id" });
  if (error) throw error;
}

export async function upsertGifts(
  supabase: SupabaseClient,
  profileIds: Record<string, string>,
): Promise<void> {
  const rows = GIFT_IDS.map((id, i) => ({
    id,
    recipient_id: profileIds[SUNNERS[i % SUNNERS.length].email],
    description: GIFT_DESCRIPTION,
    awarded_at: new Date(Date.now() - i * 60 * 60 * 1000).toISOString(),
  }));
  const { error } = await supabase.from("gifts").upsert(rows, { onConflict: "id" });
  if (error) throw error;
}
