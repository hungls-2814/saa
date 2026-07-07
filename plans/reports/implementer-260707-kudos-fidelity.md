# Implementer Report — F005 `/kudos` design-fidelity fixes

Plan dir: `plans/260706-1041-kudos-live-board/` · Screen: MoMorph `MaZUn5xHXZ` (fileKey `9ypp4enmFmdK3YAFJLIu6C`)

## Fix 1 — Banner background was the wrong asset

**Root cause (confirmed):** `kudos-banner.tsx` hardcoded `/home/kudos-bg.png` — the homepage's dark/gold-arc promo-card art, not the `/kudos` board's own keyvisual.

**What changed:** Fetched `get_media_files` for node `I2940:13432;2167:5141` (`MM_MEDIA_KV Background`, 1440×512 — the exact rendered display size, no cropping/scaling needed) and downloaded it to `public/kudos/kv-background.png`. Confirmed visually it's a colorful organic orange/teal/blue swirl — completely different from `/home/kudos-bg.png` (verified both images side by side before editing). Updated `kudos-banner.tsx`'s `backgroundImage` to `url(/kudos/kv-background.png)` and corrected the doc comment (previously claimed the two screens share art). Eyebrow/KUDOS text sizing was already design-accurate (36px/44px eyebrow) and untouched.

## Fix 2 — Spotlight board didn't match

**Root cause (confirmed):** `spotlight-board.tsx` was a bare flex-wrap approximation — no background, no design dimensions, zoom controls in the wrong place.

**Design values extracted** (`B.7_Spotlight`, node `2940:14174`): 1157×548 box, `border: 1px #998C5F`, `border-radius: 47.14px`. Background is composited from 3 layers (`image 24`, `image 25` screen-blended, `Root further mo rong 1`) plus ~100 tiny (6.6–10px) scattered decorative name TEXT nodes forming a faint constellation/network map, with a colorful swirl bottom-left. `B.7.1_388 KUDOS` at 36px/700. `B.7.3_Tìm kiếm sunner` search pill top-left (219×39, same border/bg token as existing code). `B.7.2_Pan zoom` control sits bottom-right (30×30, at `~1089–1119, 471–501` inside the box) — **not** in the header row as the old code had it.

I could not export `image 24/25`/`Root further mo rong 1` individually (`get_figma_image` 500s on this project, consistent with prior memory). Fallback used: rendered the full frame via `get_frame_image` (1440×5862, 1:1 px match to node coords) and cropped the `B.7_Spotlight` bounding box to `public/kudos/spotlight-bg.png`. That crop also baked in the design's own static search box, "388 KUDOS" title, the pan/zoom icon, and — unexpectedly — a demo stack of 6 identical "`Nguyễn Bá Chức đã nhận được một Kudos mới`" toast rows bottom-left with a fade gradient. Masked those 4 regions (feathered solid-fill matching the sampled base color `#030B0F`, ~matches existing `#00070C`) so only the decorative constellation map + swirl remain — our own live search/title/zoom controls render cleanly on top without ghosting.

**Design ambiguity resolved:** that baked-in notification stack is the deferred realtime/live-push feature explicitly called out in `clarifications.md` ("Static SSR on load ... Realtime/polling deferred"). Reproducing it — even as static decoration — would either invent fake activity data or imply a live feed that doesn't exist. I masked it out of the background rather than rendering a fake ticker; flagging this as the one open ambiguity from this task.

**Code changes:** container now `aspect-[1157/548]` (via inline `aspectRatio` style) with `min-h-[360px]` floor for narrow viewports, `bg-[url(/kudos/spotlight-bg.png)]` cover/center, `rounded-[47px]`. Header row: search stays top-left; count is now truly centered (`absolute inset-x-0 text-center` at `sm:`, stacked above search on mobile to avoid overlap — caught this during the mobile visual pass, see below). Zoom in/out buttons moved to `absolute bottom-4 right-4`, matching the design's isolated bottom-right position (kept as two buttons rather than the design's single pan-zoom icon, since the existing zoom in/out interaction is more usable and wasn't one of the 4 listed defects). Word-cloud links unchanged (flex-wrap by weight, approximate scatter — the background's own faint names now supply the "map" texture underneath).

## Fix 3 — Stats + gifts panels

**Root cause (confirmed):** container chrome (border `#998C5F`, bg `#00070C`, radius `17px`, `24px` padding, `16px` row gap) already matched the design almost exactly — the actual mismatches were font sizes.

**Design values extracted:**
- `sidebar-stats.tsx`: label (`D.1.2` etc.) is 22px/700 white, value (`Highlight Số`) is 32px/700 `#FFEA9E`. Old code used 18px/24px. Fixed to `text-[22px]` / `text-[32px]`.
- `sidebar-gifts.tsx`: container padding is asymmetric `24px 16px 24px 24px` (right side trimmed) — old code used uniform `p-6`; fixed to `py-6 pl-6 pr-4`. Title (`D.3.1_title`) is 22px/700/28px-line-height `#FFEA9E` centered — old was 20px; fixed to `text-[22px]`. Recipient name (`Name`, node `I2940:13516;256:7462`) is 22px/700/28px `#FFEA9E` — old was 18px; fixed. Description (`Thông báo content`) is 16px/700 white with `0.15px` letter-spacing — old was missing the tracking; added `tracking-[0.15px]`.

Avatar circle (64px, `1.87px` white border, `rounded-full`) was already correct in both — untouched.

## Fix 4 — Avatars never rendered

**Root cause (confirmed):** `KudosPersonInfo` (`kudos-person.tsx`) and `SidebarGifts` always rendered the `initialsOf(...)` fallback and never looked at `avatarUrl`/`recipientAvatarUrl`, even where the data carried real URLs.

**What changed:** Extracted a new shared `Avatar` component (`app/kudos/components/avatar.tsx`, 54 lines) — renders `<img src={avatarUrl} alt="" ...>` when `avatarUrl` is non-empty, falls back to the existing initials-circle markup on empty URL *or* an `onError` (broken/expired image). `alt=""` is intentional: both call sites already render the name as visible text right next to the avatar, so the image is decorative and the name is the accessible label. Wired into both `kudos-person.tsx` (sender/receiver) and `sidebar-gifts.tsx` (gift recipients), replacing the inline initials `<span>` in each. `mock-data.ts` now generates `https://i.pravatar.cc/150?u=<slug>` per person/gift (deterministic slug — same person always gets the same placeholder) instead of `avatarUrl: ""`, so the mock/standalone/test path exercises the real `<img>` branch too.

Design's own avatar treatment (64px circle, `1.87px` white border) is unchanged from what the two components already had — reused as-is for the new `<img>`.

## TDD

Wrote `avatar.test.tsx` first (4 cases: renders `<img>` with src, empty-URL fallback, `onError` fallback, decorative empty `alt`) — confirmed it failed (`avatar.tsx` didn't exist) before implementing. Added a 5th case to the existing `sidebar-gifts.test.tsx` for the photo-render path. No new test needed for `kudos-person.tsx` (all its existing/adjacent tests use `avatarUrl: ""`, exercised via `KudosCard`, and continue to pass unchanged — the new `Avatar` behavior itself is covered by `avatar.test.tsx`).

## Visual validation

Design screenshot pulled via `get_frame_image` (1440×5862, exact px match to node coordinates) and compared directly against `npm run dev` + Playwright screenshots. `/kudos` is auth-gated (proxy `PROTECTED_PATHS` + page-level `getUser()` guard per clarifications) — to screenshot it locally I temporarily removed `"/kudos"` from `proxy.ts`'s `PROTECTED_PATHS` and bypassed the page's redirect/data-fetch to fall back to `mockBoardData`, screenshotted, then ran `git checkout -- app/kudos/page.tsx proxy.ts` to restore both files exactly (confirmed via `git diff --stat` = empty for both before finishing). Neither file is in this task's final diff.

Viewports checked: 1440 (full page + close crops of banner/spotlight/sidebar), 768, 375.

- **1440:** banner swirl matches the extracted asset exactly; spotlight box shows the constellation-map + swirl background with clean search/title/zoom (no ghosting from the mask); sidebar stats (`25`/`25`/`25` at 32px) and gifts panel (title + 5 rows, each with a real pravatar photo) match the design crop closely; avatars render as real photos in both the Highlight cards and the gift list.
- **768:** spotlight header stays in the row layout (search left, count centered, zoom bottom-right) — no regressions.
- **375:** caught a real bug during this pass — my first cut used a rigid `aspect-[1157/548]` with the search/title in one row, which at 375px width squashed the box to ~160px tall and made "Tìm kiếm" and "388 KUDOS" overlap. Fixed by adding `min-h-[360px]` and switching the header to `flex-col` (stacked) below `sm:`, row layout at `sm:` and up. Re-checked: no more overlap, word-cloud area becomes scrollable inside the box on the narrowest viewport (acceptable — the alternative is clipping content).

**Pre-existing, out-of-scope observation:** at 375px there's a page-level horizontal scroll caused by `highlight-carousel.tsx`'s intentional "peek" of the next card extending past the viewport edge (confirmed via `getBoundingClientRect` sweep — the offending element is `KudosPersonInfo`'s container inside the *second, half-visible* carousel card, not anything I touched). Not one of the 4 assigned fixes and not caused by this change set — flagging only, not fixed.

## Test / typecheck / lint results

- `npm run typecheck` — clean, 0 errors.
- `npm run lint` — 0 errors; only pre-existing warnings elsewhere plus one expected `@next/next/no-img-element` warning on `avatar.tsx` (plain `<img>` for external pravatar URLs is what the task explicitly asked for — no `next.config` image domains needed).
- `npm run test` (full suite) — **466/466 passed**, 46 test files, including the new `avatar.test.tsx` (4 cases) and the extended `sidebar-gifts.test.tsx` (+1 case).

## Files changed

- `app/kudos/components/kudos-banner.tsx` — swapped bg asset + doc comment (14 lines changed)
- `app/kudos/components/spotlight-board.tsx` — container/bg/header/zoom rework (142 lines changed)
- `app/kudos/components/sidebar-stats.tsx` — font sizes (4 lines)
- `app/kudos/components/sidebar-gifts.tsx` — padding/font sizes + `Avatar` (17 lines)
- `app/kudos/components/kudos-person.tsx` — `Avatar` wiring (10 lines)
- `app/kudos/mock-data.ts` — pravatar seeding (25 lines)
- `app/kudos/components/sidebar-gifts.test.tsx` — +1 test case
- `app/kudos/components/avatar.tsx` — new, 54 lines
- `app/kudos/components/avatar.test.tsx` — new, 4 tests
- `public/kudos/kv-background.png` — extracted (1440×512, optipng'd to ~1.4MB)
- `public/kudos/spotlight-bg.png` — extracted + masked (1157×548, optipng'd to ~270KB)

Files explicitly NOT touched: query/action/data layers, migrations, seed script, `page.tsx`, `proxy.ts` (both temporarily edited for screenshotting only, fully reverted).

## Unresolved / flagged for follow-up

1. Spotlight's live-notification demo stack (masked out, see Fix 2) — confirm with design/product that omitting it is correct given the "no realtime" clarification, versus wanting a static/decorative version later.
2. Pre-existing horizontal-scroll-on-mobile from the highlight carousel's peek card (unrelated to these 4 fixes).
3. Zoom control kept as two buttons (in/out) rather than the design's single pan-zoom icon — functional equivalence judgment call, not re-litigated since it wasn't one of the 4 listed defects.

**Status:** DONE — all 4 defects fixed and visually verified at 3 viewports; full test/typecheck/lint suite green; one caught-during-QA mobile regression (search/title overlap) fixed before reporting.
