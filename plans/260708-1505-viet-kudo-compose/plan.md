# Plan — F006 Viết Kudo (Compose Kudos)

Modal compose-Kudos flow extending the F005 Supabase data layer. Opened from the
homepage FAB "Viết KUDOS" (and the `/kudos` board `onOpenCompose` stubs).
Spec: `spec/F006-viet-kudo/overview.md` · Decisions: `clarifications.md`.

## Tracks (parallel-runnable; integrate incrementally)

### Track A — UI (background implementer) — COMPLETE
- **A1** `ComposeKudosModal` presentational component (+ sub-fields) from Figma, mock data,
  props contract for integration. → `app/kudos/components/compose-kudos-modal.tsx` (+ splits). ✓

### Track B — Backend / data (orchestrator, main thread) — COMPLETE
- **B1** Migration `20260708150000_kudos_compose.sql`: kudos columns (title, is_anonymous,
  anonymous_alias) + CHECK; insert policies (kudos_hashtags, kudos_images, hashtags);
  grants; storage bucket `kudos-images` + storage policies. ✓
- **B2** Types + mappers: extend `KudosCard` (title, isAnonymous), `KudosRow`, `map-card`
  (anon override — never leak sender), `queries-internal` card select (+title/anon cols). ✓
- **B3** Compose queries: `compose-queries.ts` — `searchRecipients`, `listHashtags`,
  `resolveOrCreateHashtags`. Pure validation `compose-schema.ts`. ✓
- **B4** Server action `compose-actions.ts` `createKudoAction` (validate → insert kudos +
  hashtags + images → revalidate). Client `upload-kudos-images.ts` (browser client). ✓
- **B5** i18n `ComposeKudos` namespace in `messages/{vi,en}.json`. ✓

### Integration (C) — COMPLETE
- **C1** Wire modal props → real data (recipient search, hashtag autocomplete, image upload,
  markdown toolbar insert, @mention) + `createKudoAction`; toast on success. ✓
- **C2** Homepage FAB: redesign `widget-button.tsx` expanded state (cream pills + red ✕) and
  open the modal on "Viết KUDOS". Wire `/kudos` board `onOpenCompose` → same modal. ✓
- **C3** F005 board cards: render Danh hiệu title + markdown content + anonymous sender. ✓

### Temper (tester) → Inspect (reviewer) → Deliver — COMPLETE
- Unit tests for pure schema/helpers + mapper anon-safety; component tests for modal;
  migration applies; then reviewer; then docs + commit. ✓ 695 tests passing; reviewer signed off.

## Key constraints
- Anonymity: real sender identity never serialized into a client `KudosCard` (NFR4).
- No heavy rich-text dep; markdown insert is plain-string manipulation + a light renderer.
- Files < 200 lines; match existing `lib/kudos/*` typed-Supabase + test conventions.
