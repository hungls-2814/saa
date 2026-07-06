/** Opaque keyset-pagination cursor for the kudos feed: `(created_at desc, id desc)`. */
export interface KudosCursor {
  createdAt: string;
  id: string;
}

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

// Strict ISO-8601 (`YYYY-MM-DDTHH:MM:SS` + optional fractional seconds + optional
// Z/±HH:MM offset). Deliberately stricter than `Date.parse`, which also accepts
// RFC-2822 strings carrying literal commas/spaces — those would inject extra
// clauses into the PostgREST `.or()` predicate this value flows into (queries.ts).
const ISO_TIMESTAMP_RE =
  /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d+)?(?:Z|[+-]\d{2}:\d{2})?$/;

function isValidIsoTimestamp(value: unknown): value is string {
  return (
    typeof value === 'string' &&
    ISO_TIMESTAMP_RE.test(value) &&
    !Number.isNaN(Date.parse(value))
  );
}

function isValidUuid(value: unknown): value is string {
  return typeof value === 'string' && UUID_RE.test(value);
}

/** Encodes a cursor as an opaque base64 string for the client to round-trip. */
export function encodeCursor(cursor: KudosCursor): string {
  return Buffer.from(JSON.stringify(cursor), 'utf-8').toString('base64');
}

/**
 * Decodes + validates a client-supplied cursor. This is an untrusted-input
 * boundary: the decoded value is later template-interpolated into a
 * PostgREST `.or()` keyset predicate (see `queries.ts`), so a malformed or
 * tampered value here must never make it downstream. Any failure — bad
 * base64, invalid JSON, wrong shape, invalid ISO timestamp, invalid UUID —
 * returns `null` (treated as "no cursor" / page 1). Never throws.
 */
export function decodeCursor(raw: string | null | undefined): KudosCursor | null {
  if (!raw) return null;

  let parsed: unknown;
  try {
    parsed = JSON.parse(Buffer.from(raw, 'base64').toString('utf-8'));
  } catch {
    return null;
  }

  if (typeof parsed !== 'object' || parsed === null || Array.isArray(parsed)) {
    return null;
  }

  const { createdAt, id } = parsed as Record<string, unknown>;
  if (!isValidIsoTimestamp(createdAt) || !isValidUuid(id)) {
    return null;
  }

  return { createdAt, id };
}
