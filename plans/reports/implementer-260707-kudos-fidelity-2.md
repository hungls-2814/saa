# Kudos `/kudos` — Design-Fidelity Pass 2 (F005)

MoMorph screen `MaZUn5xHXZ` (fileKey `9ypp4enmFmdK3YAFJLIu6C`). All 5 fixes done and verified (build + full unit-test suite green + manual browser QA with the auth gate temporarily bypassed and fully reverted).

## Fix 1 — Banner composition / KUDOS wordmark legibility

**Root cause echo:** the KV background asset showed the wrong crop of the swirl art (busy color starting almost at x=0, right behind the wordmark) instead of the design's actual composition (dark navy on the left ~2/3, swirl entering from the right), and there was no red Sun* flash icon.

**What I found extracting the design (`get_frame_image` full-page render, cropped/sampled with PIL/ImageMagick):**
- Keyvisual instance `2940:13432`: 1440×512, background rectangle uses `background-position: -0.163px -909.862px` / `size: 101.245% 393.038%` — i.e. a much taller source image panned/zoomed to a specific slice. Re-cropping the correct 1440×512 region (below the site's own 80px nav row → 1440×432) reproduced the actual design composition: dark navy field under the heading/wordmark, swirl sweeping in only from ~x700 onward.
- `MM_MEDIA_Kudos logo` group (`2940:13440`, 593×104 @ x144,y238): a red Sun* flash icon (`Group`, 120×94) directly followed by the "KUDOS" text node (`fontSize 139.78px`, `fontFamily SVN-Gotham`, `letterSpacing -13%`, `lineHeight 34.95px`, color `rgba(219,209,193,1)`). SVN-Gotham isn't in this project's font set, and the reported line-height would clip a 140px glyph — not something to reproduce as live CSS.
- `Cover` overlay (`I2940:13432;1210:12612`): `linear-gradient(25deg, #00101A 14.74%, rgba(0,19,32,0) 47.8%)`, a bottom-edge fade blending the art into the page's dark background below.

**Fix:** regenerated `public/kudos/kv-background.png` (1440×432) from the design's own render: kept the real "S + KUDOS" wordmark lockup baked in pixel-exact (solves the missing icon + the exact font/metrics problem at once), masked the heading-text row and the design's own baked "Button chuc nang" pill row back to the scene's own dark gradient (sampled from the image's untouched left edge, Gaussian-feathered at the seams) so the LIVE, per-locale heading text and the LIVE interactive pills render there without doubling. Added the extracted `Cover` gradient as a bottom `bg-gradient-to-t` fade. `app/kudos/components/kudos-banner.tsx`: container height `lg:h-[432px]` (was `512px`, matching the re-cropped asset 1:1 at desktop), `bg-left` instead of `bg-center` (center clipped the wordmark off-frame at mobile widths — verified via 390px screenshot, fixed to `bg-left` so the icon+heading stay anchored visible at any width), and the "KUDOS" `<p>` kept in the DOM as `text-transparent` (screen readers + the existing `getByText("KUDOS")` test still see real text; the visible glyph is the baked image).

**Files:** `app/kudos/components/kudos-banner.tsx` (80 lines), `public/kudos/kv-background.png` (regenerated asset, 1440×432).

## Fix 2 — Highlight cards fixed size across navigation

**Root cause echo:** `highlight-carousel.tsx`'s active-card wrapper had `max-w-[528px]` but no height; `kudos-card.tsx` had no height at all, so the frame's actual size followed whatever content the current card had, resizing the row on every click.

**Design value extracted:** `KUDO - Highlight` instance (`2940:13464`, componentId `335:9620`): fixed box `528×525` (`endX 528 - startX 0`, `endY 1238 - startY 713`), border `4px #FFEA9E`, radius `16px`, bg `#FFF8E1`.

**Fix:** `kudos-card.tsx` — highlight variant now gets `h-[525px] overflow-hidden` (width stays `w-full`, responsive, controlled by the carousel's existing `max-w-[528px]` wrapper so mobile doesn't force a 528px-wide overflow). Feed variant unchanged (auto height, as designed). `highlight-carousel.tsx` wrappers unchanged from before (kept `w-1/3`/`max-w-[528px]` peek/active sizing) — the actual fix lives entirely in the card's own height.

**Files:** `app/kudos/components/kudos-card.tsx` (145 lines), `app/kudos/components/highlight-carousel.tsx` (104 lines, no behavior change, confirmed still correct).

## Fix 3 — Spotlight bottom-right control = collapse/expand the panel, not zoom

**Root cause echo:** `spotlight-board.tsx` implemented the corner control as two magnifying-glass buttons that scaled the word-cloud content via CSS `transform: scale()`.

**Design value extracted:** `B.7.2_Pan zoom` (`3007:17479`) is a single 30×30 icon, bottom-right of the `B.7_Spotlight` panel (1157×548, `2940:14174`), ~38px from the right edge / ~47px from the bottom. Cropping and viewing that exact pixel region showed a **diagonal double-arrow (↗ / ↙) resize glyph** — not a magnifying glass — confirming it toggles the panel's own size.

**Fix:** removed `ZOOM_LEVELS`/`zoomIndex`/the content `transform: scale()`; added `isExpanded` state that switches the panel's `aspectRatio` between the design's own `1157/548` (compact/default — the only state the design shows) and `1157/822` (expanded, ~50% taller — **my own reasonable second state**, since no expanded-state screen exists to extract exact numbers from; flagged as an assumption below). Single toggle button, `ExpandIcon`/`CollapseIcon` (new, standard maximize-2/minimize-2-style corner-bracket glyphs — a faithful equivalent since only a small raster crop of the design's exact vector was available, not its path data), `aria-label` = `KudosPage.spotlight.expand`/`collapse`.

**Files:** `app/kudos/components/spotlight-board.tsx` (130 lines), `app/kudos/components/icon-controls.tsx` (new, 72 lines — split out of `icons.tsx` to keep both files under ~200 lines), `app/kudos/components/icons.tsx` (150 lines, `ZoomInIcon`/`ZoomOutIcon` removed, unused elsewhere).

## Fix 4 — Top-10 gifts list: fixed height + internal scroll

**Root cause echo:** `sidebar-gifts.tsx`'s `<ul>` had no height constraint, rendering all rows at natural height.

**Design value extracted:** `D.3` panel padding `24px 16px 24px 24px` (asymmetric — already matched in code). List box (`Frame 547/548`, `2940:13512`): fixed **384px** tall, exactly 5 of the 64px avatar rows (`5×64 + 4×16 gap = 384`); the design even shows a custom scrollbar-thumb decoration (`Frame 545`, 2×245px, gray) for the remaining 5 of the "10 SUNNER" rows.

**Fix:** `<ul>` → `h-[384px] overflow-y-auto pr-1` (native scrollbar; the design's custom thumb graphic wasn't reproduced — YAGNI for a decorative scrollbar skin). Title (`<h3>`) stays outside/above the scroll area, unchanged.

**Files:** `app/kudos/components/sidebar-gifts.tsx` (40 lines).

## Fix 5 — "Mở Secret Box" stub button

**Root cause echo:** `sidebar-stats.tsx` omitted the button entirely (previously deferred).

**Design value extracted:** `D.1.8_Button mở quà` (`2940:13497`): `374×60`, padding `16px`, radius `8px`, solid bg `#FFEA9E` (not the translucent pill used elsewhere), text "Mở Secret Box" `fontSize 22px/lineHeight 28px/weight 700/color #00101A`, gift icon `24×24` positioned **after** the text (not before, unlike the banner's icon-then-text pills).

**Fix:** added the button to `sidebar-stats.tsx` under the 3 stat rows, exact styling above, new `GiftIcon`. Wired as a stub: `SidebarStats.onOpenSecretBox` → `KudosBoard.onOpenSecretBox` → `KudosBoardContainer` fires the existing toast mechanism with a new `KudosPage.toast.secretBoxComingSoon` message ("Tính năng Secret Box sẽ sớm ra mắt." / "Secret Box is coming soon."). New i18n key `KudosPage.stats.openSecretBox` ("Mở Secret Box" / "Open Secret Box") added to both `messages/vi.json` and `messages/en.json`.

**Secret-Box counter rows intentionally omitted:** the design's `D.1.6_Số secret box đã mở` and `D.1.7_Số secret box chưa mở` rows are **not** reproduced — per the task instructions and the original clarification session, this board has no Secret-Box data source to back real counts, and the counters are deferred with the rest of the out-of-scope Secret Box feature. Only the button (a stub trigger) is in scope for this pass.

**Files:** `app/kudos/components/sidebar-stats.tsx` (52 lines), `app/kudos/components/kudos-board.tsx` (113 lines), `app/kudos/components/kudos-board-container.tsx` (147 lines), `app/kudos/components/icon-controls.tsx` (new, shared with fix 3), `messages/en.json`, `messages/vi.json`.

## Visual validation

Ran the dev server with a **temporary** auth-gate bypass (`proxy.ts` `PROTECTED_PATHS` + `app/kudos/page.tsx`'s redirect, both fully reverted — confirmed `git diff -- proxy.ts app/kudos/page.tsx` empty before finishing) and mock data, screenshotted via Playwright:
- **Desktop (1440×900):** banner matches the design's composition almost exactly (dark left, legible heading + wordmark + red S icon, swirl entering from the right); highlight cards render as two identical-size boxes (active + peek neighbor); sidebar shows the "Mở Secret Box" button (clicking it fired the coming-soon toast correctly) and the gifts list with a working scrollbar.
- **Mobile (390×844):** caught a regression from baking the wordmark into the image — `bg-center` clipped the wordmark off-frame at narrow widths (the "OS" of "KUDOS" floating alone, icon+heading gone). Fixed by switching to `bg-left` so the icon/heading stay anchored and visible at any viewport width (some right-side swirl is naturally clipped at narrow widths — an acceptable, expected trade-off with no dedicated mobile design to extract from). Gifts list correctly shows a fixed-height scrollable box on mobile too.

## Verification

- `npm run typecheck` — pass, 0 errors.
- `npm run lint` — 0 errors, 13 pre-existing warnings unrelated to this work (no-img-element, unused-vars in other features' test files).
- `npm run test` — **469 passed / 469** across 46 files (includes new/updated tests: `spotlight-board.test.tsx` compact↔expanded toggle, `sidebar-stats.test.tsx` Secret Box button, `kudos-board-container.test.tsx` Secret Box toast).
- All touched files are under 200 lines (icons split into `icons.tsx` 150 + `icon-controls.tsx` 72 to stay under the limit).
- Presentational-only: no changes to `lib/kudos/queries.ts`, `lib/kudos/actions.ts`, migrations, or seed data. `mock-data.ts` untouched (not needed for these fixes).

## Files changed

- `app/kudos/components/kudos-banner.tsx`
- `app/kudos/components/kudos-card.tsx`
- `app/kudos/components/spotlight-board.tsx` (+ `spotlight-board.test.tsx`)
- `app/kudos/components/sidebar-gifts.tsx`
- `app/kudos/components/sidebar-stats.tsx` (+ `sidebar-stats.test.tsx`)
- `app/kudos/components/kudos-board.tsx`
- `app/kudos/components/kudos-board-container.tsx` (+ `kudos-board-container.test.tsx`)
- `app/kudos/components/icons.tsx`
- `app/kudos/components/icon-controls.tsx` (new)
- `messages/en.json`, `messages/vi.json`
- `public/kudos/kv-background.png` (regenerated asset)

## Unresolved / assumptions

1. Spotlight "expanded" state dimensions (`1157/822` aspect) are my own reasonable choice, not extracted — the design only shows one panel state. Worth confirming with design if an exact expanded size exists elsewhere.
2. `ExpandIcon`/`CollapseIcon` are standard maximize-2/minimize-2-style glyphs, not a pixel-redraw of the design's exact vector (only a 30×30 raster sample was available, no path data) — same visual concept (diagonal corner resize arrows).
3. Banner mobile/tablet breakpoints (`h-[280px]`/`h-[360px]`) are unchanged approximations, same as before this pass — the design only specifies the 1440×512 desktop composition.

**Status:** DONE
