---
feature: header-dropdowns
belongs_to: [F001-login, F002-homepage]
lang: en
spec_lang: en
status: draft
momorph:
  - screen: Dropdown-ngôn ngữ
    fileKey: 9ypp4enmFmdK3YAFJLIu6C
    screenId: hUyaaugye2
  - screen: Dropdown-profile
    fileKey: 9ypp4enmFmdK3YAFJLIu6C
    screenId: z4sCl3_Qtk
---

# Header Dropdowns — Language Selector & Account Menu

Scope: **visual re-alignment** of two existing header dropdowns to their MoMorph
designs. No new behavior, data, or API — interaction logic (locale cookie switch,
sign-out server action, profile navigation) is unchanged.

## Shared dropdown surface (both menus)

Authoritative design values (MoMorph node styles):
- Container: background `#00070C`, border `1px solid #998C5F` (gold), border-radius `8px`, padding `6px`, flex column.
- Highlight state: gold-tint background over the brand gold `#FFEA9E`
  - language selected row → `rgba(255,234,158,0.2)`
  - profile hovered/focused row → `rgba(255,234,158,0.1)`
- Glow (highlighted/active text): `text-shadow: 0 4px 4px rgba(0,0,0,.25), 0 0 6px #FAE287` (same token as the active nav link).
- Row typography: Montserrat 700, 16px / line-height 24px, letter-spacing 0.15px, text `#FFFFFF`.
- Rows ~56px tall.

## Language selector (Dropdown-ngôn ngữ)

- Each option row = locale flag + short **code** (`VN` / `EN`). No full name, no checkmark.
- Currently-selected locale row carries the persistent gold-tint highlight (`0.2`) + glow text.
- Hover on any row adds highlight feedback.
- VN flag = existing `/login/icons/vn-flag.png`; EN flag = inline SVG Union Jack.
- Interaction unchanged: choosing a locale writes `NEXT_LOCALE` cookie via server action, then `router.refresh()`.

## Account menu (Dropdown-profile, signed-in)

- Row 1 `Profile` + user icon (right of label); links to `/profile`.
- Row 2 `Logout` + chevron-right icon (right of label); triggers sign-out server action.
- Label change: `Home.header.signOut` → "Logout" (en) / "Đăng xuất" (vi); vi mistranslation fixed.
- Hovered/focused row → gold-tint highlight (`0.1`) + glow text.
- Trigger button (bordered account icon) unchanged.

## Out of scope
- Trigger button restyling, notification bell, role-gated Admin item, profile page itself.
