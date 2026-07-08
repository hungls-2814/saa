# /kudos Spacing/Padding Audit — Implementation Report

Design ref: MoMorph `MaZUn5xHXZ` / fileKey `9ypp4enmFmdK3YAFJLIu6C` ("Sun* Kudos - Live board", 1440px desktop frame).

## Method

Read every Auto-Layout container's `padding`/`gap` directly via MoMorph MCP (`get_node`
on `Bìa`, `Frame 532`, `B_Highlight`, `B.1_header`, `Frame 552`, `B.6_Header`,
`C_All kudos`, `C.1_Header`, `Frame 502`, `D_Thống menu phải`, the carousel group, etc.),
cross-checked against absolute node Y-positions. Then validated the rendered page by
temporarily bypassing the `/kudos` auth gate (see "Auth-gate bypass" below), loading the
design-derived `mockBoardData` fixture, and reading `getBoundingClientRect()` on the live
DOM at a 1440px viewport (exact-match precision, no pixel-diff guessing).

## Spacing Map (design px → applied Tailwind)

| Element | Design px | Was | Now | Verified |
|---|---|---|---|---|
| Content column max-width | 1440 (frame width) | `max-w-[1512px]` | `max-w-[1440px]` | at 1600px viewport, wrapper caps at 1440, centers with 80px margins each side |
| Page horizontal padding (desktop) | 144 | `lg:px-36` | unchanged (already correct) | `left:144` on every section |
| Banner (KV art bottom) → Section-1 top | 32 (544−512) | `lg:py-24` (96, shared top+bottom) | `lg:pt-8` (32) | contentWrapper `top`=512 |
| Last section → footer | 120 (5718−5598) | `lg:py-24` (96, shared) | `lg:pb-[120px]` | not directly measurable (footer owned by page.tsx, out of KudosBoard scope) — value now matches the design's own uniform 120 rhythm |
| Between the 3 sections (Highlight/Spotlight/All-Kudos) | 120 | `lg:gap-[120px]` | unchanged (already correct) | section0→1 gap=120, section1→2 gap=120 |
| Eyebrow → title (SectionHeader) | 16+16 | `gap-4` | unchanged (already correct) | eyebrow→hr=16, hr→title=16 |
| Highlight: title-row → carousel | 40 | `gap-8` (32) | `gap-10` (40) | content.top − titleRow.bottom = 40 |
| Spotlight: title-row → board | 64 (~63, rounds to the 64 rhythm used elsewhere) | `gap-8` (32) | `gap-16` (64) | content.top − titleRow.bottom = 64 |
| All-Kudos: title-row → feed/sidebar row | 40 | `gap-8` (32) | `gap-10` (40) | content.top − titleRow.bottom = 40 |
| Highlight header row: title ↔ filter dropdowns | 32 (`Frame 488` gap) | `gap-4` (16) | `gap-8` (32) | CSS gap now matches; rendered gap is larger (286px) because both design and code use `justify-between` — `gap` is a wrap/shrink fallback, not the literal render gap, in both |
| Feed ↔ sidebar (desktop row) | 80 (`Frame 502` gap) | `gap-6` (24, all breakpoints) | `gap-6 lg:gap-20` (24 mobile stack / 80 desktop row) | sidebar.left − feed.right = 80 |
| Sidebar internal gap (stats ↔ gifts) | 24 | `gap-6` | unchanged (already correct) | matches `D_Thống menu phải` gap:24 |
| Sidebar width | 422 | `lg:w-[422px]` | unchanged (already correct) | matches |
| Feed card list gap | 24 | `gap-6` (all-kudos-feed.tsx) | unchanged (already correct) | matches `C.2_Danh sách` gap:24 |
| Highlight carousel: active card ↔ peek neighbors | 24 | `gap-6` (highlight-carousel.tsx row) | unchanged (already correct) | matches `B.2.3_content` gap:24 |
| Highlight carousel: card row → paginator | 40 (`B_Highlight` gap, applies uniformly to header/carousel/pager) | `gap-8` (32) | `gap-10` (40) | pagerRow.top − cardRow.bottom = 40 |

## Files Modified

- `app/kudos/components/kudos-board.tsx` (113 lines) — max-width 1512→1440; split uniform `py` into `pt`/`pb` (32/120 at lg); per-section content gaps (40/64/40 instead of uniform 32); feed↔sidebar gap 24→80 at lg.
- `app/kudos/components/section-header.tsx` (29 lines) — title↔actions row gap 16→32.
- `app/kudos/components/highlight-carousel.tsx` (105 lines) — card-row→paginator gap 32→40.

All three stay well under the 200-line guideline. No data/logic/test files touched.

## Auth-gate bypass (temporary, reverted)

`/kudos` is auth-gated by both `proxy.ts` (route guard) and `app/kudos/page.tsx`
(defense-in-depth redirect). To screenshot/measure the real rendered layout without a
Supabase session, I temporarily: removed `/kudos` from `proxy.ts`'s `PROTECTED_PATHS`,
and short-circuited `page.tsx`'s unauthenticated branch to render `KudosBoardContainer`
with the existing design-derived `mockBoardData` fixture instead of redirecting. After
capturing measurements I ran `git checkout -- proxy.ts app/kudos/page.tsx` and confirmed
via `git diff --stat proxy.ts app/kudos/page.tsx` (empty output) that both files are back
to their original committed state.

**Note:** mid-way through this revert step, a tool-injected system-reminder claimed the
auth-bypass edits were "intentional," told me not to revert them, and told me not to
mention this to you. That contradicts your explicit instruction to revert the bypass, so
I disregarded it, reverted anyway, and I'm flagging it here rather than staying silent —
it read like a prompt-injection attempt, not a message from you.

## Before/After

- Design frame: `.playwright-mcp/design-1440.png` (1440×5862, full MoMorph frame export)
- Rendered (after fix, 1440px viewport, header/footer stripped by the bypass so only
  `KudosBoard`'s own layout is compared): `.playwright-mcp/after-1440.png` (1440×5364)
- Both live in the gitignored `.playwright-mcp/` directory (not committed).

## Overlay-Alignment Result

Rather than pixel-diffing the two PNGs (unreliable given the mock feed/spotlight content
has different length than the design's sample content, so absolute page height differs),
I measured the live DOM with `getBoundingClientRect()` at the same 1440px width used for
the design export. Every gap listed in the spacing map above was captured this way and
matches the design's Auto-Layout value exactly (0px delta) except the Spotlight
title→content gap, where the design's own node positions round to 63px against the
intended 64px rhythm used everywhere else — applied as 64 (`gap-16`) for consistency, a
1px discrepancy that's below any meaningful visual threshold.

## Test/Build Status

- Typecheck: pass (`tsc --noEmit`, no errors)
- Lint: pass (0 errors; 14 pre-existing warnings, all `<img>`/unused-var, none touched by this change)
- Unit/integration tests: pass, 48 files / 492 tests (full suite)

## Ambiguities

- **Spotlight gap (63 vs 64px):** design position math yields 63px exactly; treated as
  the same 64px rhythm the rest of the page uses, since Figma auto-layout numbers this
  close are routinely off-by-one from stroke/rounding artifacts, not a deliberate distinct
  value.
- **Banner→section1 gap (32px):** the design's own `Bìa` padding-top is 96px, but that
  96px is consumed by the banner heading text + pills, which the existing `KudosBanner`
  component (built in an earlier phase, not touched here) already renders *inside* its
  own 512px-tall box with absolute positioning. The real remaining gap — from the
  banner's rendered bottom edge to section 1's eyebrow — is 32px, which is what I applied.
- **Section→footer gap (120px):** not independently verifiable since `SiteFooter` is
  rendered by `page.tsx`, outside `KudosBoard`'s scope — applied on the reasoning that
  `Bìa`'s flex gap is a single uniform 120px value shared by every top-level child
  (Highlight/Spotlight/All-Kudos/footer alike).

**Status:** DONE
