# Clarifications — Viết Kudo (Compose Kudos) — F006

MoMorph refs:
- Viết Kudo (modal): https://momorph.ai/files/9ypp4enmFmdK3YAFJLIu6C/screens/ihQ26W78P2
- FAB collapsed: https://momorph.ai/files/9ypp4enmFmdK3YAFJLIu6C/screens/_hphd32jN2
- FAB expanded: https://momorph.ai/files/9ypp4enmFmdK3YAFJLIu6C/screens/Sv7DFwBw1h
- Homepage SAA: https://momorph.ai/files/9ypp4enmFmdK3YAFJLIu6C/screens/i87tDx10uM

## Session 260708-1505

- Q: Delivery form (modal vs route)? → A: Modal opened from the homepage Floating Action Button. The FAB "Viết KUDOS" action opens the modal over the homepage. FAB expanded state must match design (cream pills "Thể lệ" + "Viết KUDOS", trigger morphs to red ✕ close). Existing WidgetButton dark-dropdown is a placeholder to be replaced.
- Q: Persistence depth? → A: Full — real Supabase writes (insert kudos + hashtags + images to Storage; new RLS insert policies; recipient autocomplete queries profiles; new kudos appears on the board).
- Q: Rich-text toolbar + @mention? → A: Markdown-functional — toolbar inserts markdown (**bold** etc.), @mention picks a real Sunner, content stored as markdown, F005 board cards render markdown.
- Q: "Danh hiệu" (image-only field, absent from spec) + anonymous? → A: Include both — add kudos.title (danh hiệu) shown as the card title, plus anonymity columns.
- Q: Anonymous display on board? → A: Show the typed alias as the sender name with a generic/anonymous avatar; real sender_id stored (RLS/audit) but hidden. Alias required when the box is checked.
- Q: Hashtag source ("+ Hashtag", min 1, max 5)? → A: Create + pick existing — autocomplete existing hashtags AND allow creating a new one on submit (INSERT RLS on hashtags, dedupe by label).
- Q: Update F005 board cards this iteration? → A: Yes — update kudos-card render to show Danh hiệu title, markdown content (within 3/5-line truncation), and anonymous sender (alias + anon avatar).

## Adopted defaults (not asked — sensible, stated for the record)

- Q: Accepted image types / limits / bucket? → A: jpg/png/webp/gif accepted; reject others (pdf/mp4/txt → error); max 5 images; ~5 MB each; public-read Supabase Storage bucket `kudos-images`; per-user upload path.
- Q: @mention storage/render? → A: mention picks a real Sunner, stored inline as `@Full Name` markdown text; board renders it emphasized (not a link).
- Q: Recipient list scope? → A: all profiles except the current user (self-kudos blocked by DB CHECK).
- Q: Also wire the /kudos board's existing `onOpenCompose` stubs? → A: Yes — same modal, low cost since stubs already exist.
- Q: Spec language? → A: en (inherited from existing F005 feature docs); UI strings vi-primary + en mirror.
