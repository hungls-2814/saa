---
feature: F007
name: Kudos Hero Badges + Thể lệ (Rules) Modal
lang: en
screen: Thể lệ UPDATE — momorph b1Filzi9i6 (figma 3204:6051, file 9ypp4enmFmdK3YAFJLIu6C)
status: draft
---

# F007 — Kudos Hero Badges + Thể lệ (Rules) Modal

## Purpose
Two coupled additions to the Kudos experience:
1. **Thể lệ (Rules) modal** — the homepage Floating Action Button's "Thể lệ" pill (currently a
   stub) opens a scrollable modal presenting the program rules: the Hero-badge tiers, the 6-icon
   collectible reward, and the "Kudos Quốc Dân" prize. Footer = Đóng + Viết KUDOS (opens compose).
2. **Hero badges on Kudos cards** — each Sunner's name pill on a Kudos card shows a Hero badge
   (New / Rising / Super / Legend) DERIVED from the number of **distinct senders** who sent them
   Kudos. Replaces the honorific `title` pill.

## Hero badge rule (from design b1Filzi9i6)
Tier by distinct-sender count (people who sent Kudos to this receiver):
| Tier | Distinct senders | Asset |
|------|------------------|-------|
| — (none) | 0 | no badge |
| New Hero | 1–4 | hero-new.png |
| Rising Hero | 5–9 | hero-rising.png |
| Super Hero | 10–20 | hero-super.png |
| Legend Hero | > 20 (≥21) | hero-legend.png |

Derived (pure fn, never stored) — analogous to the existing star-tier. Source metric is a NEW
`distinct_sender_count` aggregate added to the `profile_kudos_stats` view (`count(distinct sender_id)`
per `receiver_id`) — distinct from the existing `received_count` (total `count(*)`).

## Requirements
### Functional
- **FR1 — FAB opens Rules modal.** Homepage FAB "Thể lệ" pill opens the Rules modal (home only).
  Esc / backdrop / "Đóng" close it. "Viết KUDOS" closes it and opens the compose-Kudos modal.
- **FR2 — Rules modal content** (static, from design): title "Thể lệ"; section "NGƯỜI NHẬN KUDOS:
  HUY HIỆU HERO" with the 4 tiers (badge image + range + blurb); section "NGƯỜI GỬI KUDOS: SƯU TẬP
  TRỌN BỘ 6 ICON" with the 6 collectible icons (image + caps label) + reward blurb; section "KUDOS
  QUỐC DÂN" blurb; scrollable when tall; footer Đóng + Viết KUDOS.
- **FR3 — Hero badge derivation.** Pure fn maps distinct-sender count → tier per the table above.
- **FR4 — Hero badge display.** Kudos card name pill renders the tier's badge image (replacing the
  `title` pill) when tier ≠ none; nothing when 0 senders. Anonymous sender → no badge.
- **FR5 — Data layer.** `profile_kudos_stats` gains `distinct_sender_count`; the batched stats fetch
  in the card query reads it; `mapPerson` derives `heroBadge` from it.
- **FR6 — i18n.** Rules-modal strings + badge alt text in `messages/{vi,en}.json` where dynamic; the
  long Vietnamese marketing copy may live under a `Rules` namespace (vi primary, en mirror).

### Non-functional
- **NFR1** Pure helper (`hero-badge` derivation) unit-tested with zero mocks; query change covered.
- **NFR2** Files < 200 lines, kebab-case, YAGNI/KISS/DRY. Modal split into subcomponents if > 200.
- **NFR3** Badge/icon assets served from `public/kudos/badges/` (next/image or plain img).
- **NFR4** Migration additive & idempotent; `revalidatePath` unaffected (view is read-only).

## Success criteria
- **SC1** FAB "Thể lệ" opens the modal; Đóng/Esc/backdrop close it; "Viết KUDOS" opens compose. (FR1)
- **SC2** Modal shows all 3 sections, 4 hero badges, 6 icons, footer — matching design b1Filzi9i6. (FR2)
- **SC3** hero-badge derivation correct at boundaries 0/1/4/5/9/10/20/21 (pure-fn unit tests). (FR3)
- **SC4** Kudos card pill shows the correct Hero badge image per receiver/sender distinct-sender
  count; hidden at 0; anonymous sender hidden. (FR4)
- **SC5** `profile_kudos_stats` exposes `distinct_sender_count`; card query maps it end-to-end. (FR5)
- **SC6** All new visible strings resolve from vi + en. (FR6)
- **SC7** Migration applies cleanly; existing queries/tests still pass.

## Out of scope
Secret Box "Mở quà" flow · profile page hero-badge display · real 6-icon collection tracking
(the modal describes the reward; collection state has no data source here) · hero badge on the
Spotlight word-cloud.
