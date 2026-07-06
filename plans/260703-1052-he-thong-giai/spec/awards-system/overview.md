---
feature: F003
name: Awards System page (Hệ thống giải thưởng)
lang: en
screen: Hệ thống giải — momorph zFYDgyj_pD (file 9ypp4enmFmdK3YAFJLIu6C)
status: draft
---

# F003 — Awards System page (Hệ thống giải thưởng)

## Purpose
Auth-gated detail page at `/he-thong-giai` presenting the six SAA 2025 award
categories in depth. It is the destination of the homepage award cards
(anchored per category) and the header "Awards Information" nav item.

## User-facing surface (MoMorph zFYDgyj_pD)
- **Hero banner (3):** Root Further key-visual art background, `ROOT FURTHER`
  wordmark (reused), eyebrow `Sun* Annual Awards 2025`, big gold title
  `Hệ thống giải thưởng SAA 2025`.
- **Sticky left sidebar (C):** 6 nav items (Top Talent, Top Project, Top Project
  Leader, Best Manager, Signature 2025 - Creator, MVP) with a leading icon;
  active item = gold + underline; scroll-spy updates active on scroll; click =
  smooth-scroll to that award section; hover = highlight.
- **Award detail sections (D.1–D.6):** one per category, each with `id="<slug>"`
  anchor: orb image (336×336, alternating left/right), title, description
  paragraph, `Số lượng giải thưởng: <n> <unit>`, `Giá trị giải thưởng: <value> VNĐ`
  + note (`cho mỗi giải thưởng`). Signature 2025 - Creator shows two prize values
  (cá nhân / tập thể).
- **Sun* Kudos promo (D1):** reused KudosSection; `Chi tiết` → `/kudos`.
- **Header + Footer:** reused; header "Awards Information" nav = active here.

## Award data (from specs; slugs shared with homepage)
| slug | title | quantity | prize |
|---|---|---|---|
| top-talent | Top Talent | 10 Cá nhân | 7.000.000 VNĐ / mỗi giải |
| top-project | Top Project | 02 Tập thể | 15.000.000 VNĐ / mỗi giải |
| top-project-leader | Top Project Leader | 03 Cá nhân | 7.000.000 VNĐ / mỗi giải |
| best-manager | Best Manager | 01 Cá nhân | 10.000.000 VNĐ |
| signature-2025-creator | Signature 2025 - Creator | 01 | 5.000.000 (cá nhân) + 8.000.000 (tập thể) |
| mvp | MVP (Most Valuable Person) | 01 Cá nhân | 15.000.000 VNĐ |

Full description paragraphs are extracted verbatim from the design.

## Behavior
1. **Access (ID-0/1):** authenticated → page renders; unauthenticated →
   redirect to `/login`. Enforced in `proxy.ts` (PROTECTED_PATHS += `/he-thong-giai`)
   and defense-in-depth in the server page (`getUser()` → redirect).
2. **Sidebar (ID-9/10/11):** click → smooth-scroll to section + set active;
   scroll → scroll-spy sets active (gold + underline); only one active at a time;
   hover highlight.
3. **Deep-link:** arriving with `#<slug>` (from homepage) scrolls to that section.
4. **Kudos (ID-12):** `Chi tiết` → `/kudos`.

## Internationalization
New `AwardsPage` i18n namespace (vi default + en). VN copy verbatim from design;
EN faithfully translated. Numbers/currency shown as in the design.

## Out of scope (this iteration)
- `/kudos` target page (link only). Real award winners/data. `/standards`.

## Acceptance criteria
- [ ] `/he-thong-giai` renders for authenticated users; unauthenticated → `/login`.
- [ ] Hero banner shows art + `ROOT FURTHER` + `Hệ thống giải thưởng SAA 2025`.
- [ ] Sidebar lists 6 awards in order; active = gold+underline; click scroll-spies.
- [ ] 6 detail sections render with correct title/desc/quantity/prize + `#slug` anchors.
- [ ] Deep-link `#<slug>` from homepage scrolls to the section.
- [ ] Homepage award cards / nav / footer now point to `/he-thong-giai(#slug)`.
- [ ] VN/EN localized; layout matches the design.

## Key files (planned)
- Route: `app/he-thong-giai/page.tsx` (+ `components/`, `data/awards-detail-data.ts`)
- Guard: `proxy.ts` (protect `/he-thong-giai`)
- Homepage link updates: `app/(home)/components/{award-card,site-header,site-footer,hero-section}.tsx`
- i18n: `messages/{vi,en}.json` (AwardsPage namespace)
- Reused: SiteHeader, SiteFooter, KudosSection, `public/home/award-*.png`, hero art
