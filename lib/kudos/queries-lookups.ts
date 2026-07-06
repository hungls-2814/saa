/**
 * Server-only lookup/aggregate queries for the `/kudos` board: spotlight,
 * per-user stats, top gifts, and the hashtag/department filter option
 * lists. Split out of `queries.ts` purely to stay under the NFR3 200-line
 * budget — all of these are re-exported from `./queries`, which is the
 * documented public module.
 */
import { createClient } from '@/lib/supabase/server';
import type { DepartmentRef, GiftItem, HashtagRef, PerUserStats, SpotlightNode } from './types';

interface GiftRow {
  id: string;
  description: string;
  awarded_at: string;
  recipient: { full_name: string; avatar_url: string | null } | null;
}

interface SpotlightRow {
  receiver_id: string;
  created_at: string;
  receiver: { full_name: string } | null;
}

/** FR2: total kudos count + one word-cloud node per receiver. */
export async function getSpotlight(): Promise<{ totalKudos: number; nodes: SpotlightNode[] }> {
  const supabase = await createClient();

  const [countResult, rowsResult] = await Promise.all([
    supabase.from('kudos').select('*', { count: 'exact', head: true }),
    supabase
      .from('kudos')
      .select('receiver_id, created_at, receiver:profiles!kudos_receiver_id_fkey(full_name)')
      .order('created_at', { ascending: false }),
  ]);
  if (countResult.error) throw countResult.error;
  if (rowsResult.error) throw rowsResult.error;

  const nodesByReceiver = new Map<string, SpotlightNode>();
  for (const row of (rowsResult.data ?? []) as unknown as SpotlightRow[]) {
    const existing = nodesByReceiver.get(row.receiver_id);
    if (existing) {
      existing.weight += 1;
    } else {
      // Rows are ordered created_at desc, so the first hit per receiver is
      // their most recent kudos.
      nodesByReceiver.set(row.receiver_id, {
        receiverId: row.receiver_id,
        name: row.receiver?.full_name ?? '',
        weight: 1,
        lastReceivedAt: row.created_at,
      });
    }
  }

  return { totalKudos: countResult.count ?? 0, nodes: Array.from(nodesByReceiver.values()) };
}

/** FR5: current-user counters from `profile_kudos_stats`. */
export async function getPerUserStats(userId: string): Promise<PerUserStats> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from('profile_kudos_stats')
    .select('sent_count, received_count, hearts_received')
    .eq('profile_id', userId)
    .maybeSingle();
  if (error) throw error;

  const row = data as { sent_count: number; received_count: number; hearts_received: number } | null;
  return {
    kudosReceived: row?.received_count ?? 0,
    kudosSent: row?.sent_count ?? 0,
    heartsReceived: row?.hearts_received ?? 0,
  };
}

/** FR6: top-10 most recent gift recipients. */
export async function getTopGifts(): Promise<GiftItem[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from('gifts')
    .select('id, description, awarded_at, recipient:profiles!gifts_recipient_id_fkey(full_name, avatar_url)')
    .order('awarded_at', { ascending: false })
    .limit(10);
  if (error) throw error;

  return ((data ?? []) as unknown as GiftRow[]).map((row) => ({
    id: row.id,
    recipientName: row.recipient?.full_name ?? '',
    recipientAvatarUrl: row.recipient?.avatar_url ?? '',
    description: row.description,
    awardedAt: row.awarded_at,
  }));
}

/** FR4 filter option list: all hashtags. */
export async function getHashtags(): Promise<HashtagRef[]> {
  const supabase = await createClient();
  const { data, error } = await supabase.from('hashtags').select('id, label').order('label');
  if (error) throw error;
  return ((data ?? []) as { id: string; label: string }[]).map((row) => ({ id: row.id, label: row.label }));
}

/** FR4 filter option list: all departments. */
export async function getDepartments(): Promise<DepartmentRef[]> {
  const supabase = await createClient();
  const { data, error } = await supabase.from('departments').select('id, name').order('name');
  if (error) throw error;
  return ((data ?? []) as { id: string; name: string }[]).map((row) => ({ id: row.id, name: row.name }));
}
