# Clarifications — Kudos Hero Badges + Thể lệ (Rules) Modal

MoMorph: Thể lệ UPDATE — https://momorph.ai/files/9ypp4enmFmdK3YAFJLIu6C/screens/b1Filzi9i6

## Session 2026-07-09
- Q: Hero badge count metric — distinct senders vs total received_count? → A: Distinct senders (count of distinct `sender_id` per receiver). Requires new `distinct_sender_count` aggregate in `profile_kudos_stats` view + migration + query update.
- Q: Hero badge placement in the name pill (currently renders `person.title`)? → A: Replace the title pill with the hero badge.
- Q: Render badges as MoMorph image assets or CSS pills? → A: Use MoMorph image assets (downloaded to `public/kudos/badges/`).
- Q: Where does the FAB "Thể lệ" button open the modal? → A: Home page only (existing FAB location via HomeComposeWidget).

## Derived rules (from design b1Filzi9i6)
- Hero tiers by distinct-sender count: New 1–4, Rising 5–9, Super 10–20, Legend >20. 0 senders → no badge.
- Rules modal content is static (from design): "NGƯỜI NHẬN KUDOS" hero section (4 tiers), "NGƯỜI GỬI KUDOS" 6-icon section, "KUDOS QUỐC DÂN" section, footer buttons Đóng + Viết KUDOS.
- "Viết KUDOS" in the rules modal opens the compose-Kudos modal.

## Assets (public/kudos/badges/)
- hero-new.png, hero-rising.png, hero-super.png, hero-legend.png (New Hero + REVIVAL cropped from frame render — MoMorph media null for those two nodes)
- icon-revival.png, icon-touch-of-light.png, icon-stay-gold.png, icon-flow-to-horizon.png, icon-beyond-the-boundary.png, icon-root-further.png
