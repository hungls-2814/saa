/**
 * Pure, dependency-free validation for the compose-Kudos form (F006). Shared
 * by the client modal (live field errors + Gửi enable/disable) and the server
 * action (authoritative re-check). Returns error CODES, not prose — the UI maps
 * codes to localized `ComposeKudos` strings, so this stays i18n-agnostic and
 * unit-testable with zero mocks (NFR1).
 */

export const MIN_HASHTAGS = 1;
export const MAX_HASHTAGS = 5;
export const MAX_IMAGES = 5;
export const MAX_IMAGE_BYTES = 5 * 1024 * 1024; // 5 MB
export const ACCEPTED_IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'] as const;

/** The structured payload the client submits and the server action re-validates. */
export interface ComposeKudosInput {
  receiverId: string;
  /** "Danh hiệu" — per-kudos award title. */
  title: string;
  /** Markdown body. */
  content: string;
  hashtagLabels: string[];
  /** Already-uploaded Storage public URLs. */
  imageUrls: string[];
  isAnonymous: boolean;
  anonymousAlias: string;
}

export type FieldErrorCode = 'required' | 'tooMany' | 'self';

/** Per-field error codes; absent key = that field is valid. */
export interface ComposeErrors {
  receiver?: FieldErrorCode;
  title?: FieldErrorCode;
  content?: FieldErrorCode;
  hashtags?: FieldErrorCode;
  images?: FieldErrorCode;
  alias?: FieldErrorCode;
}

export type ValidateResult = { ok: true } | { ok: false; errors: ComposeErrors };

const isBlank = (value: string): boolean => value.trim().length === 0;

/**
 * Validates a compose payload. `selfId` (the current user) is optional; when
 * provided, a recipient equal to the author is rejected (`self`) — the DB CHECK
 * blocks it too, but a typed error gives a friendly message instead of a 500.
 */
export function validateComposeInput(input: ComposeKudosInput, selfId?: string): ValidateResult {
  const errors: ComposeErrors = {};

  if (isBlank(input.receiverId)) errors.receiver = 'required';
  else if (selfId && input.receiverId === selfId) errors.receiver = 'self';

  if (isBlank(input.title)) errors.title = 'required';
  if (isBlank(input.content)) errors.content = 'required';

  const tags = input.hashtagLabels.map((t) => t.trim()).filter((t) => t.length > 0);
  if (tags.length < MIN_HASHTAGS) errors.hashtags = 'required';
  else if (tags.length > MAX_HASHTAGS) errors.hashtags = 'tooMany';

  if (input.imageUrls.length > MAX_IMAGES) errors.images = 'tooMany';

  if (input.isAnonymous && isBlank(input.anonymousAlias)) errors.alias = 'required';

  return Object.keys(errors).length === 0 ? { ok: true } : { ok: false, errors };
}

/** True when the required fields are filled — drives the "Gửi" enable state. */
export function isSubmittable(input: ComposeKudosInput, selfId?: string): boolean {
  return validateComposeInput(input, selfId).ok;
}

export type ImageRejectCode = 'type' | 'size';
export type ImageCheckResult = { ok: true } | { ok: false; code: ImageRejectCode };

/** Validates a single image before upload. Takes the minimal file shape so it is testable. */
export function validateImageFile(file: { type: string; size: number }): ImageCheckResult {
  if (!(ACCEPTED_IMAGE_TYPES as readonly string[]).includes(file.type)) return { ok: false, code: 'type' };
  if (file.size > MAX_IMAGE_BYTES) return { ok: false, code: 'size' };
  return { ok: true };
}

/** Normalizes hashtag labels: trim, drop blanks, de-dupe case-insensitively (first spelling wins). */
export function normalizeHashtagLabels(labels: string[]): string[] {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const raw of labels) {
    const label = raw.trim();
    if (label.length === 0) continue;
    const key = label.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(label);
  }
  return out;
}
