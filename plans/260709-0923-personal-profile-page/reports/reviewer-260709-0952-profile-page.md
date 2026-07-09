# Review — Personal Profile Page (F008, `/profile`)

Scope: `lib/kudos/queries-profile.ts` (+test), `app/profile/page.tsx` (+test),
`app/profile/components/profile-header.tsx` (+test),
`app/profile/components/profile-kudos-section.tsx` (+test), `proxy.ts`,
`app/(home)/components/site-header.tsx`, `messages/{en,vi}.json`.

Verified: `npm run typecheck` clean, `npm run lint` 0 errors (15 pre-existing warnings,
none in touched files), `vitest run` on the 4 new/changed test files → 23/23 pass.
All touched files under 200 lines (largest: `profile-kudos-section.tsx` 132, `profile-header.tsx` 117).

## Overall Assessment
Clean, well-scoped implementation. Direction filters, null-safety, read-only card
wiring, and the Secret-Box/icon-collection/Spam-tag deferrals all match
`clarifications.md` exactly. Good reuse of `queries-internal.ts` (`buildCardSelect`/
`mapRowsToCards`), `Avatar`, `HeroBadgeImage`, `SidebarStats`, `SectionHeader`,
`KudosCard`. No new migration, no schema changes, no dependency added.

## Critical Issues
None.

## High Priority
1. **`proxy.test.ts` has no test for the new `/profile` protected-route entry.**
   Plan's own "Success (observable)" line states: *"`/profile` unauthenticated →
   302 `/login`; authenticated → 200 renders A/B/C/D."* `PROTECTED_PATHS` in
   `proxy.ts:11` now includes `/profile`, but `proxy.test.ts` only has
   `describe('protected routes (/he-thong-giai)')` and `(/kudos)` blocks
   (`proxy.test.ts:63-115`) — no analogous `(/profile)` block. The middleware-level
   guard (the actual first line of defense, ahead of the page-level
   `redirect()` in `app/profile/page.tsx:55-57`, which *is* tested in
   `page.test.tsx:69-84`) is unverified by an automated test. A future edit to
   `PROTECTED_PATHS` (e.g. an accidental revert or reorder) would not be caught.
   Fix: add a `describe('protected routes (/profile)')` block mirroring the
   `/kudos` one (unauthenticated → 307 to `/login`, authenticated → 200).

## Medium Priority
None.

## Low Priority / Nits
1. **Double round-trip for stats/likes.** `getKudosByUser` (`queries-profile.ts:50-69`)
   is called twice by `page.tsx:67-68` (once per direction), and each call
   independently runs `mapRowsToCards` → `fetchLikedKudosIds` + `getSenderStats`
   (`queries-internal.ts:115-143`). That's 4 extra queries instead of 2 if sent+received
   were merged into one call. Acceptable per the file's own YAGNI note ("a single
   Sunner's own kudos volume is small") — flagging only as a known trade-off, not
   a blocker.
2. **Read-only heart button has no disabled affordance.** `KudosCard`
   (`app/kudos/components/kudos-card.tsx:128-139`) always renders the heart as a
   `<button>` with hover state and `aria-pressed`; omitting `onToggleLike` (as
   `profile-kudos-section.tsx` does) makes clicks silently no-op rather than
   visually communicating "not interactive here." Minor UX polish, not a
   correctness bug — matches the "no adding hearts from profile" clarification
   functionally.
3. `page.test.tsx:93` mocks `heroBadge: "diamond"`, which isn't a member of the
   `HeroBadge` union (`none|new|rising|super|legend`). Harmless — `ProfileHeader`
   is stubbed out in that test (`page.test.tsx:46-48`) so the value is never
   rendered/validated — but worth using a real tier value to avoid confusion if
   the mock is ever loosened.

## Security Review (focus area)
- `getKudosByUser` filters server-side by `.eq('sender_id'|'receiver_id', userId)`
  (`queries-profile.ts:63`) where `userId` always comes from
  `(await supabase.auth.getUser()).data.user.id` in `page.tsx:52,67-68` — never
  from a client-supplied param. No cross-user data exposure path found.
- `getMyProfileHeader` filters `profiles` by `.eq('id', userId)` and
  `profile_kudos_stats` by `.eq('profile_id', userId)` (`queries-profile.ts:86-88`)
  — same guarantee, own-row only.
- `kudos_with_heart_count` / `profile_kudos_stats` are `security_invoker=true`
  views with `revoke select ... from anon` (migrations `20260706000000`,
  `20260709090000`) — RLS still applies under the querying role; this PR doesn't
  touch that contract.
- Route guard: `proxy.ts` `PROTECTED_PATHS` now includes `/profile`
  (middleware-level 307 redirect for unauthenticated), plus a page-level
  defense-in-depth redirect (`page.tsx:55-57`) mirroring `/kudos` and
  `/he-thong-giai`. Functionally correct; see High-priority test-gap finding above.
- Clipboard copy-link (`profile-kudos-section.tsx:51-57`) builds a same-origin
  `/kudos/:id` URL from `window.location.origin` — no injection surface, no
  PII in the URL beyond the kudos id (already public to any authenticated user
  via the board).
- Errors from Supabase are re-thrown, not logged with details, and
  `page.tsx`'s catch block swallows to a generic empty-state fallback
  (`page.tsx:70-75`) with no stack trace reaching the client — consistent with
  the existing `/kudos` page pattern.

## Correctness (focus area)
- Direction→filter mapping verified correct by both code (`queries-profile.ts:63`)
  and test (`queries-profile.test.ts:37-66`, including a negative assertion that
  `sender_id` is NOT called for `received`).
- `getMyProfileHeader` null-safety: missing profile row → empty strings, tier 0,
  badge `none`; missing stats row → tier 0, badge `none`; both independently
  defended and unit-tested (`queries-profile.test.ts:113-148`). Errors from either
  query propagate (not swallowed) — correct per the module's own doc comment.
  `Promise.all` on the two independent reads is appropriate (no dependency
  between them).
- `page.tsx`'s `Promise.all` across 4 independent reads, single catch → full
  fallback on any single failure. This mirrors `/kudos/page.tsx`'s existing
  pattern exactly (same file, same shape) — consistent architecture choice, not
  a regression.
- Toggle count/label wiring: `counts` computed from `sent.length`/`received.length`
  (`profile-kudos-section.tsx:48`), fed into `t('toggle.sent'|'toggle.received', {count})` —
  verified by test that the button label updates correctly across toggles
  (`profile-kudos-section.test.tsx:80-101`).
- No `onToggleLike` passed to `KudosCard` from `ProfileKudosSection` — verified
  by an explicit unit test (`profile-kudos-section.test.tsx:115-119`).

## Scope Fidelity vs `clarifications.md`
- Secret Box: `SidebarStats` (`app/profile/page.tsx:86`) receives no
  `onOpenSecretBox` prop → button's `onClick={() => onOpenSecretBox?.()}`
  (`sidebar-stats.tsx:55`) no-ops on click. Confirmed inert. ✓
- Icon collection: `LOCKED_ICON_COUNT = 6` static gray/locked circles, no data,
  no handler (`profile-header.tsx:99-109`), tested (`profile-header.test.tsx:59-63`). ✓
- Sent/Received toggle, default "sent": confirmed in code and test. ✓
- Read-only cards (hearts count + copy-link, no adding hearts): confirmed. ✓
- Spam tag: grepped the entire `app/kudos` + `lib/kudos` tree — no "spam"
  reference anywhere; it was never implemented, so "omit" required no code. ✓

## Architecture / DRY
- `queries-profile.ts` is a clean sibling of `queries.ts` — imports
  `buildCardSelect`/`mapRowsToCards` from the shared `queries-internal.ts`
  rather than duplicating the select string or the liked/stats batching logic.
  Does not touch `queries.ts`'s `getPerUserStats` shape (per the plan's
  "verified facts").
- Region composition (`page.tsx`) reuses `SiteHeader`/`SiteFooter`/`SidebarStats`
  as-is; only genuinely new UI (`ProfileHeader`, `ProfileKudosSection`) got new
  files. `ProfileKudosSection` reuses `KudosCard` (variant `"feed"`) and
  `SectionHeader` rather than reimplementing card/list chrome.
- `NavKey` union extended with `"profile"` (`site-header.tsx:17`) with a
  self-documenting comment explaining it deliberately never matches any nav
  `<Link>`, so all top-nav items stay unhighlighted on `/profile` — correct,
  intentional, not a dead branch.

## i18n
- `ProfilePage` namespace added identically (key-for-key) to both
  `messages/en.json` and `messages/vi.json`: `title`, `awardsEyebrow`,
  `kudosTitle`, `toggle.sent`, `toggle.received`, `iconCollection`, `empty.sent`,
  `empty.received`. No missing/extra keys on either side.
- `{count}` is next-intl's plain interpolation syntax (not ICU plural) and is
  used consistently in both call sites and both locale files — confirmed working
  via `useTranslations` test convention.

## Unresolved Questions
None — all clarifications from `clarifications.md` map cleanly to the implementation.

---
**Status:** DONE
**Summary:** No critical or medium issues. One High-priority test-coverage gap
(the `/profile` middleware guard in `proxy.ts` has no dedicated `proxy.test.ts`
case, unlike `/kudos` and `/he-thong-giai`) — recommend adding it before merge
since route-guard coverage is exactly the kind of regression a later refactor
could silently break. Everything else (security, correctness, scope fidelity,
architecture, i18n) checks out clean.
**Concerns:** See High-priority item above (missing proxy-level `/profile` test).
