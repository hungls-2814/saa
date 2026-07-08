import type { FilterState } from './types';

/**
 * Query-shaped filter descriptor. Deliberately has no `.eq()`/`.or()` calls —
 * `queries.ts` is the only place that touches the Supabase query builder;
 * this stays a pure, mock-free-testable transform (NFR1).
 */
export interface KudosFilterDescriptor {
  hashtagId: string | null;
  departmentId: string | null;
}

/** Normalizes the UI's `FilterState` into the descriptor `queries.ts` applies. */
export function buildKudosFilter(filter: FilterState): KudosFilterDescriptor {
  return {
    hashtagId: filter.hashtagId ?? null,
    departmentId: filter.departmentId ?? null,
  };
}
