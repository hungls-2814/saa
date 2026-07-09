---
feature: F006
name: Viết Kudo (Compose Kudos)
lang: en
screen: Viết Kudo modal — momorph ihQ26W78P2 (figma 520:11602, file 9ypp4enmFmdK3YAFJLIu6C); FAB _hphd32jN2 / Sv7DFwBw1h; Homepage i87tDx10uM
status: draft
---

# F006 — Viết Kudo (Compose Kudos)

## Purpose
The compose-Kudos dialog deferred by F005. An authenticated Sunner writes a kudos
(recipient + award title + rich content + hashtags + images + optional anonymity)
that persists to the F005 Supabase data layer and appears on the `/kudos` board.
Opened as a **modal** from the homepage Floating Action Button ("Viết KUDOS") and
from the existing `/kudos` board `onOpenCompose` stubs.

## User-facing surface (MoMorph ihQ26W78P2)
Modal titled "Gửi lời cám ơn và ghi nhận đến đồng đội", fields top→bottom:
1. **Người nhận*** — autocomplete search over Sunners (exclude self); select one.
2. **Danh hiệu*** — per-kudos award title; shown as the kudos card title on the board.
3. **Nội dung*** — markdown editor: toolbar (bold/italic/strike/numbered-list/link/quote)
   inserts markdown; `@`+name mentions a real Sunner (stored inline as `@Full Name`).
4. **Hashtag*** — 1..5 tags; autocomplete existing + create-new-on-submit (dedupe by label).
5. **Image** — 0..5 images (jpg/png/webp/gif ≤5 MB); upload to Supabase Storage.
6. **Gửi ẩn danh** — optional; when on, an alias input (required) replaces the sender's
   identity on the board (real `sender_id` still stored for RLS/audit, never sent to client).
7. **Footer** — "Hủy" (close, discard) · "Gửi" (validate → submit; disabled until required
   fields valid; loading; close on success).

FAB (homepage): collapsed cream pill → expands to cream pills "Thể lệ" + "Viết KUDOS",
trigger morphs to a red ✕ close. "Viết KUDOS" opens this modal. "Thể lệ" stays a stub.

## Data model (extends F005)
`kudos` gains: `title text` (danh hiệu, nullable — legacy rows have none),
`is_anonymous boolean not null default false`, `anonymous_alias text`;
CHECK `is_anonymous = false OR anonymous_alias <> ''` (alias required when anonymous).
Reuses `kudos_hashtags`, `kudos_images`, `hashtags`. New Storage bucket `kudos-images`
(public read; authenticated insert).

RLS/grants (the dormant F005 insert policy activates):
- `kudos` insert: existing `sender_id = auth.uid()` policy (self-kudos blocked by CHECK).
- NEW insert policies: `kudos_hashtags` / `kudos_images` — only for a kudos the caller
  authored (`EXISTS kudos k WHERE k.id = kudos_id AND k.sender_id = auth.uid()`);
  `hashtags` — any authenticated (create-new).
- GRANT insert on `kudos`, `kudos_hashtags`, `kudos_images`, `hashtags` to `authenticated`.

## Requirements
### Functional
- **FR1** Recipient autocomplete: search `profiles.full_name` (trimmed, ≥1 char), exclude self.
- **FR2** Required-field validation (recipient, title, content, ≥1 hashtag); typed errors; red
  border + message; "Gửi" disabled until valid; test IDs 7/11/14/48/49/50/51/52/56.
- **FR3** Markdown content: toolbar wraps/inserts markdown; `@`-mention picker; board renders it.
- **FR4** Hashtag: min 1 / max 5; "+ Hashtag" disabled/blocked at 5 ("Tối đa 5 hashtag");
  chip remove; create-or-link on submit.
- **FR5** Images: max 5 (hide "+ Image" at 5, reappear on remove); type validation
  (accept jpg/png/webp/gif, reject others); upload to Storage; store public URLs.
- **FR6** Anonymity: toggle reveals required alias; board shows alias + generic avatar, hides
  real sender.
- **FR7** Submit: `createKudoAction` inserts kudos + hashtags + images atomically-enough,
  `revalidatePath('/kudos')`; modal closes; new kudos on board.
- **FR8** Board render update (F005 cards): show Danh hiệu title, render markdown within the
  3/5-line truncation, render anonymous sender.
- **FR9** Auth: unauthenticated cannot compose (action returns `unauthenticated`; homepage/board
  already auth-aware). Test IDs 0/1/2.
- **FR10** i18n: new `ComposeKudos` namespace (vi primary + en mirror); reuse `Home.widget`.

### Non-functional
- **NFR1** Pure validation (`compose-schema.ts`) + pure helpers unit-testable with zero mocks.
- **NFR2** Service-role key server-only; client image upload uses the anon/authenticated browser client.
- **NFR3** Files < 200 lines, kebab-case, YAGNI/KISS/DRY. No new heavy deps (no rich-text lib;
  a tiny markdown renderer is acceptable, or a minimal in-repo renderer).
- **NFR4** Anonymity: real sender identity NEVER serialized into a client `KudosCard` when
  `is_anonymous`.

## Success criteria
- **SC1** Migration applies cleanly (columns + CHECK + 3 insert policies + grants + storage bucket).
- **SC2** Authenticated user composes a valid kudos → row(s) inserted → appears on `/kudos`. (FR7)
- **SC3** All required-field + max-limit + file-type test cases (specs' 57 TCs) behave as specified.
- **SC4** Anonymous kudos shows alias + generic avatar on the board; real sender not in client payload. (FR6/NFR4)
- **SC5** Danh hiệu title + markdown render correctly on F005 cards. (FR8)
- **SC6** FAB expanded state matches design; "Viết KUDOS" opens the modal from the homepage. 
- **SC7** All visible strings resolve from `ComposeKudos` vi + en. (FR10)

## Out of scope
"Thể lệ"/SAA-rules flow · realtime · editing/deleting a posted kudos · notifying the recipient ·
mention → profile link (styled text only) · image reordering/cropping.
