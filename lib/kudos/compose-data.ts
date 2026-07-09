/**
 * Client-safe data helpers for the compose-Kudos modal (F006). These run in the
 * browser against the authenticated Supabase session (cookie-backed anon key),
 * relying on the F005 `authenticated read ...` RLS policies — no server action
 * round-trip for the autocomplete/list reads. Each takes the Supabase client as
 * a parameter so the same code works server-side and is mock-testable.
 */
import type { SupabaseClient } from '@supabase/supabase-js';
import type { HashtagRef, RecipientOption } from './types';
import { MAX_IMAGES, validateImageFile } from './compose-schema';

const KUDOS_IMAGES_BUCKET = 'kudos-images';

interface RecipientRow {
  id: string;
  full_name: string;
  avatar_url: string | null;
  department: { name: string } | null;
}

/**
 * Loads all Sunners (except the current user) for the recipient combobox — the
 * modal filters this list locally as the user types (event-scale ≈ dozens of
 * profiles, so one load beats a query per keystroke). Ordered by name.
 */
export async function listRecipients(
  supabase: SupabaseClient,
  excludeUserId: string,
  limit = 200,
): Promise<RecipientOption[]> {
  const { data, error } = await supabase
    .from('profiles')
    .select('id, full_name, avatar_url, department:departments(name)')
    .neq('id', excludeUserId)
    .order('full_name')
    .limit(limit);
  if (error) throw error;

  return ((data ?? []) as unknown as RecipientRow[]).map((row) => ({
    id: row.id,
    fullName: row.full_name,
    department: row.department?.name ?? '',
    avatarUrl: row.avatar_url ?? '',
  }));
}

/** FR4: the hashtag suggestion list (existing tags) for the "+ Hashtag" autocomplete. */
export async function listHashtags(supabase: SupabaseClient): Promise<HashtagRef[]> {
  const { data, error } = await supabase.from('hashtags').select('id, label').order('label');
  if (error) throw error;
  return ((data ?? []) as { id: string; label: string }[]).map((row) => ({ id: row.id, label: row.label }));
}

export type ImageUploadError = 'invalid' | 'too_many' | 'upload_failed';
export type ImageUploadResult = { ok: true; urls: string[] } | { ok: false; error: ImageUploadError };

const EXT_BY_TYPE: Record<string, string> = {
  'image/jpeg': 'jpg',
  'image/png': 'png',
  'image/webp': 'webp',
  'image/gif': 'gif',
};

/**
 * FR5: upload images to the public `kudos-images` bucket under the user's
 * folder, returning their public URLs. Validates type/size per image first
 * (rejects the whole batch on the first bad file — the UI screens files before
 * calling, this is the defensive backstop). `uuid` is injected so the caller
 * owns randomness (keeps this deterministic under test).
 */
export async function uploadKudosImages(
  supabase: SupabaseClient,
  userId: string,
  files: File[],
  uuid: () => string,
): Promise<ImageUploadResult> {
  if (files.length > MAX_IMAGES) return { ok: false, error: 'too_many' };

  const urls: string[] = [];
  for (const file of files) {
    if (!validateImageFile({ type: file.type, size: file.size }).ok) return { ok: false, error: 'invalid' };

    const ext = EXT_BY_TYPE[file.type] ?? 'bin';
    const path = `${userId}/${uuid()}.${ext}`;
    const { error } = await supabase.storage
      .from(KUDOS_IMAGES_BUCKET)
      .upload(path, file, { contentType: file.type, upsert: false });
    if (error) return { ok: false, error: 'upload_failed' };

    const { data } = supabase.storage.from(KUDOS_IMAGES_BUCKET).getPublicUrl(path);
    urls.push(data.publicUrl);
  }

  return { ok: true, urls };
}
