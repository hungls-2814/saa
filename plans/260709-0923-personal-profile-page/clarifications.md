# Clarifications — Personal Profile Page (Profile bản thân)

MoMorph: Profile bản thân — https://momorph.ai/files/9ypp4enmFmdK3YAFJLIu6C/screens/3FoIx6ALVb
Screen: 3FoIx6ALVb · File: 9ypp4enmFmdK3YAFJLIu6C (SAA 2025 - Internal Live Coding)

## Session 2026-07-09
- Q: Secret Box (B.4/B.5 counts, B.6 button) + icon collection (A.3/B2–B7) have zero backend — how to handle? → A: Defer — static placeholders (0/0, gray locked icons, button links to /kudos or disabled). No new schema.
- Q: Post list (C+D) — which kudos and default view? → A: Sent + Received toggle, default Sent; reuse existing kudos card + new per-user filtered query.
- Q: Should profile kudos cards be interactive (add hearts)? → A: Read-only display (show hearts count + copy-link, no adding hearts from profile).
- Q: Orange "Spam" tag on cards — no schema backing — how to handle? → A: Omit the Spam tag.
