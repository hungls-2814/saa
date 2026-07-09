'use server';

/**
 * F006 compose-Kudos write path. The board's only insert action — validates the
 * payload server-side (never trusts the client), resolves-or-creates hashtags,
 * inserts the kudos + its hashtag/image junction rows, then
 * `revalidatePath('/kudos')` so the new post appears on the board. Reads
 * (recipient/hashtag lookup, image upload) stay client-side in `compose-data.ts`.
 */
import { revalidatePath } from 'next/cache';
import type { SupabaseClient } from '@supabase/supabase-js';
import { createClient } from '@/lib/supabase/server';
import { normalizeHashtagLabels, validateComposeInput, type ComposeErrors, type ComposeKudosInput } from './compose-schema';

const UNIQUE_VIOLATION_CODE = '23505';

export type CreateKudoError = 'unauthenticated' | 'validation' | 'unknown';
export type CreateKudoResult =
  | { ok: true; kudosId: string }
  | { ok: false; error: CreateKudoError; errors?: ComposeErrors };

/**
 * Resolves each label to a hashtag id, creating rows that don't exist yet
 * (INSERT allowed by the F006 `insert hashtags` policy). A concurrent create of
 * the same label races to a 23505 on the unique `label` — swallowed and
 * re-selected, so two simultaneous authors of a new tag converge on one row.
 */
async function resolveOrCreateHashtags(supabase: SupabaseClient, labels: string[]): Promise<string[]> {
  if (labels.length === 0) return [];

  const { data: existing, error } = await supabase.from('hashtags').select('id, label').in('label', labels);
  if (error) throw error;

  const idByLabel = new Map<string, string>();
  for (const row of (existing ?? []) as { id: string; label: string }[]) idByLabel.set(row.label, row.id);

  const missing = labels.filter((label) => !idByLabel.has(label));
  for (const label of missing) {
    const { data: inserted, error: insertError } = await supabase
      .from('hashtags')
      .insert({ label })
      .select('id')
      .single();
    if (insertError) {
      if ((insertError as { code?: string }).code !== UNIQUE_VIOLATION_CODE) throw insertError;
      const { data: reselected, error: reselectError } = await supabase
        .from('hashtags')
        .select('id')
        .eq('label', label)
        .single();
      if (reselectError) throw reselectError;
      idByLabel.set(label, (reselected as { id: string }).id);
    } else {
      idByLabel.set(label, (inserted as { id: string }).id);
    }
  }

  return labels.map((label) => idByLabel.get(label)).filter((id): id is string => Boolean(id));
}

/** FR7: create a kudos with its hashtags + images, then revalidate the board. */
export async function createKudoAction(input: ComposeKudosInput): Promise<CreateKudoResult> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: 'unauthenticated' };

  const validation = validateComposeInput(input, user.id);
  if (!validation.ok) return { ok: false, error: 'validation', errors: validation.errors };

  const isAnonymous = input.isAnonymous;
  const { data: kudos, error: kudosError } = await supabase
    .from('kudos')
    .insert({
      sender_id: user.id,
      receiver_id: input.receiverId,
      title: input.title.trim(),
      content: input.content.trim(),
      is_anonymous: isAnonymous,
      anonymous_alias: isAnonymous ? input.anonymousAlias.trim() : null,
    })
    .select('id')
    .single();
  if (kudosError || !kudos) return { ok: false, error: 'unknown' };

  const kudosId = (kudos as { id: string }).id;

  try {
    const hashtagIds = await resolveOrCreateHashtags(supabase, normalizeHashtagLabels(input.hashtagLabels));
    if (hashtagIds.length > 0) {
      const { error } = await supabase
        .from('kudos_hashtags')
        .insert(hashtagIds.map((hashtagId) => ({ kudos_id: kudosId, hashtag_id: hashtagId })));
      if (error) throw error;
    }

    const imageUrls = Array.from(new Set(input.imageUrls));
    if (imageUrls.length > 0) {
      const { error } = await supabase
        .from('kudos_images')
        .insert(imageUrls.map((url) => ({ kudos_id: kudosId, url })));
      if (error) throw error;
    }
  } catch {
    // Compensating rollback: the kudos row is already committed, but its
    // hashtags/images failed — delete the orphan so no zero-hashtag post
    // lingers (and a user retry can't leave a duplicate). Cascade FKs drop any
    // partially-written junction/image rows. Best-effort; delete is RLS-scoped
    // to the author via the "delete own kudos" policy.
    await supabase.from('kudos').delete().eq('id', kudosId);
    return { ok: false, error: 'unknown' };
  }

  revalidatePath('/kudos');
  return { ok: true, kudosId };
}
