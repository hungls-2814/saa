# Review — F007 Kudos Hero Badges + Thể lệ Rules Modal

Scope: all uncommitted changes (see task). Verified independently: `npx tsc -p tsconfig.json
--noEmit` (0 errors), `npm run lint` (0 errors, 15 pre-existing warnings unrelated to this diff),
`npm run test -- --run` (800/800 green, 63 files).

## Overall Assessment
Solid data-layer work: migration, batched query, pure derivation fn, and anonymity parity are all
correct and well-tested. The one real gap is i18n — the Rules modal ships 100% hardcoded Vietnamese
copy with zero `useTranslations` wiring, contradicting the feature's own spec (FR6/SC6) and its own
plan's phase-04 success criteria ("all strings resolve vi+en"). Everything else is minor/cosmetic.

## Critical Issues
None.

## High Priority

**1. Rules modal ships with no i18n — EN-locale users see Vietnamese text (Major).**
`saa-rules-modal.tsx`, `saa-rules-hero-tiers.tsx`, `saa-rules-icon-grid.tsx`,
`saa-rules-national-kudos.tsx` hardcode all Vietnamese copy as plain strings — no
`useTranslations()` call anywhere in any of the four files. `messages/vi.json` /
`messages/en.json` are untouched by this diff (confirmed via `git diff --stat`).
- Spec FR6: "Rules-modal strings ... in `messages/{vi,en}.json` where dynamic ... may live under a
  `Rules` namespace (vi primary, en mirror)." SC6: "All new visible strings resolve from vi + en."
- The plan's own `phase-04-integration.md` explicitly scoped this in: "EDIT `messages/vi.json` +
  `messages/en.json` — add `Rules` namespace ... vi primary, en mirror," with Success listing SC6.
  Phase-04 (this feature's own integration phase) was the one place this was supposed to land, and
  it didn't.
- The site has a live VN/EN locale switcher (`app/components/language-selector.tsx` +
  `lib/i18n/set-locale.ts`) and every sibling Home component (`hero-section.tsx`,
  `awards-section.tsx`, `kudos-section.tsx`, `award-card.tsx`, `root-further-section.tsx`,
  `widget-button.tsx`) uses `useTranslations`. This modal is the one component in `app/(home)` that
  doesn't — a real, visible regression for anyone using the EN locale (they'll see the entire panel
  in Vietnamese while the rest of the page is English).
- Telling tell: `saa-rules-modal.test.tsx` and `home-compose-widget.test.tsx` both mock
  `next-intl`'s `useTranslations` — dead mock boilerplate copied from sibling test files, since the
  components under test never call it. That's a signal the omission wasn't a deliberate,
  documented design call (contrast with the disclosed CSS/SVG-fallback pattern elsewhere in this
  codebase) — it's an incomplete phase-04.
- Tester's report (`reports/tester-260709-0840-...md`) lists SC1–SC5 as met but silently drops SC6
  and SC7 from its "Success Criteria Met" table — corroborates that this gap was never checked, not
  that it was intentionally waived.
- Fix: add a `Rules` namespace to both message files and switch the four components to
  `useTranslations("Rules")`; badge/icon `alt` text can stay static per the existing in-code
  rationale (proper nouns, identical across locales) — that specific call is fine as-is.

## Medium Priority

**2. `KudosPerson.title` is now fully dead in the UI (YAGNI).**
`mapPerson` still populates `title: row?.title ?? ''`, `KudosProfileRow`/the Supabase select still
fetch `profiles.title`, `types.ts` still declares the field, and `mock-data.ts`'s `person()` helper
still sets `title: ""` — but no component reads `KudosPerson.title` anymore (`kudos-person.tsx` was
the only reader; it now renders `HeroBadgeImage` instead). `KudosCard.title` is unrelated (the
kudos's own award title) and is still legitimately used in `kudos-card.tsx`. Not a bug — the DB
column may be kept for a future profile-page use (out of scope here per the spec's "Out of scope"
list) — but as it stands it's fetched, mapped, and carried through the whole pipeline for nothing.
Low-risk to leave, but flag for cleanup or a comment explaining why it's retained.

## Low Priority

**3. `icon-revival.png` was cropped from a different source than its 5 siblings, and the
mismatch isn't disclosed in code.** `clarifications.md` explains `hero-new.png` and
`icon-revival.png` were cropped from a frame render (MoMorph media was null for those two nodes),
while `icon-revival.png` is 78×64 vs the other five collectible icons at 80×104. `object-cover
object-top` in `saa-rules-icon-grid.tsx` absorbs this functionally (renders fine as a 64×64 circle
crop) but the inline comment only explains the general "circle + caption in one crop" technique,
not that this one asset has a materially different source/aspect than its siblings. Cosmetic only
— per this project's established norm (see memory: disclosed asset substitutions are accepted), a
one-line comment callout would close the gap for the next person who wonders why it's not pixel-
identical treatment.

**4. `widget-button.test.tsx` wasn't updated for the new `onOpenRules` prop.** Coverage for that
wiring exists at the `home-compose-widget.test.tsx` integration level (SC1 suite), so this isn't a
gap in behavior coverage, just a missed opportunity for an isolated unit assertion on
`WidgetButton` itself (e.g., that clicking "Thể lệ" calls `onOpenRules` and not just closes the
menu). Not blocking.

## Edge Cases Found
- Anonymous sender → `heroBadge: 'none'` is correctly forced in `map-card.ts::anonymousSender()`
  and explicitly asserted in `map-card.test.ts` ("never leaks identity" test) — identity-leak parity
  holds.
- `distinctSenderCounts` is `optional` on `MapCardContext`; `mapPerson` guards with
  `distinctSenderCounts?.get(id) ?? 0`, so any future caller that omits the map degrades to "no
  badge" rather than throwing. Safe default.
- `getSenderStats` changed its return type from `Promise<Map<string, number>>` to
  `Promise<ProfileStatMaps>` — checked all call sites (`grep -rn getSenderStats`): only
  `queries-internal.ts::mapRowsToCards` (updated in the same diff) and `queries.test.ts` (updated in
  the same diff) call it. No other internal or external consumer breaks. Since it's re-exported from
  `queries.ts`, it's technically a public module surface change, but nothing outside this diff
  depends on the old shape.
- Migration: `distinct_sender_count` is appended as the *last* column via `create or replace view`
  (Postgres requires existing columns to keep name/type/position — new columns must be appended at
  the end, which this does). `count(distinct sender_id)` is computed inside the `received` subquery
  grouped by `receiver_id`, correctly counting distinct senders per receiver, and is
  `coalesce(..., 0)`'d at the top level so a receiver with zero kudos gets `0`, not `null`. `revoke
  select ... from anon` is idempotent and re-asserted (correct given "grants survive
  create-or-replace" per Postgres semantics — the re-assertion is belt-and-suspenders, not required
  but harmless). `security_invoker = true` preserved. `getPerUserStats` (separate consumer of the
  same view) selects an explicit column list (`sent_count, received_count, hearts_received`), so
  it's unaffected by the new column — no regression there.
- No N+1: `getSenderStats` is one batched `.in('profile_id', ids)` call per page, covering both
  sender and receiver ids via a deduped `Set`, run in parallel with `fetchLikedKudosIds` via
  `Promise.all`.
- Tier boundary math verified against spec table (New 1–4, Rising 5–9, Super 10–20, Legend >20):
  `deriveHeroBadge` checks `>20`→legend, `>=10`→super, `>=5`→rising, `>=1`→new, else none — correct
  at every boundary in the unit test (0/1/4/5/9/10/20/21/1000).
- File sizes: all new/edited files well under the 200-line budget (largest non-test file is
  `widget-button.tsx` at 194 lines, pre-existing plus a few lines added).
- Backdrop-click-to-close in `saa-rules-modal.tsx` uses the standard `e.target ===
  e.currentTarget` guard (consistent with `compose-kudos-modal.tsx`'s pattern) — clicking inside
  the panel does not falsely close it (covered by test).
- Modal Escape handling is a `document`-level `keydown` listener registered/cleaned up per
  `isOpen` transition — consistent with the existing `compose-kudos-modal.tsx` pattern in this
  codebase (no focus-trap in either component — pre-existing project-wide gap, not new to this
  diff).

## Positive Observations
- `hero-badge.ts` is a clean, pure, well-documented function mirroring the existing `star-tier.ts`
  pattern — good DRY/consistency with prior art.
- `HeroBadgeImage`'s `Record<Exclude<HeroBadge, "none">, ...>` mapping is exhaustive by
  construction — adding a new tier to the `HeroBadge` union will fail to compile until the map is
  updated for it. Good defensive typing.
- Test coverage is thorough and specific: boundary-value tests for the derivation, an explicit
  anonymous-hides-badge assertion, an explicit hero-badge-hidden-at-none assertion on
  `kudos-card.test.tsx`, and full behavioral coverage of the modal's open/close/backdrop/Escape/
  handoff-to-compose paths.
- Migration comment explicitly states the reasoning for "additive `create or replace view`, column
  appended at the end" — this is exactly the kind of self-documenting migration this codebase's
  other migrations model.
- `getSenderStats`'s JSDoc was updated in lockstep with its new return shape and consumers — no
  stale doc drift.

## Recommended Actions
1. (High) Wire `Rules` namespace into `messages/vi.json` + `messages/en.json` and switch the four
   modal components to `useTranslations`, per FR6/SC6 and the plan's own phase-04 spec. This is the
   one real outstanding gap versus the written spec.
2. (Medium, optional) Either remove `KudosPerson.title` end-to-end or add a one-line comment on
   `types.ts`/`map-card.ts` explaining why it's still fetched/mapped though unused in current UI.
3. (Low, optional) One-line comment in `saa-rules-icon-grid.tsx` disclosing `icon-revival.png`'s
   different source/aspect vs its 5 siblings.
4. (Low, optional) Add a `WidgetButton`-level unit test for `onOpenRules`.

## Metrics
- Type Coverage: `tsc --noEmit` clean (0 errors) across the whole project, independently verified.
- Test Coverage: 800/800 tests green (63 files); F007 added 35+ new/updated test cases across
  `hero-badge.test.ts`, `saa-rules-modal.test.tsx`, `home-compose-widget.test.tsx`,
  `kudos-card.test.tsx`, `map-card.test.ts`, `queries.test.ts`.
- Linting Issues: 0 errors; 15 pre-existing warnings, none in F007 files.

## Unresolved Questions
- Was the i18n omission (finding #1) a deliberate scope cut communicated outside `clarifications.md`
  (which doesn't mention it), or genuinely missed in phase-04? The plan text hedges with "(or keep
  static in component)" for phase-01 but phase-04's own success line still requires "all strings
  resolve vi+en" — worth a direct answer before deciding whether this blocks merge or ships as
  follow-up debt.

**Status:** DONE_WITH_CONCERNS
**Summary:** Data layer (migration, query, derivation, anonymity parity) is correct and well-tested;
build is green (tsc/lint/800 tests). One Major gap: the Rules modal has zero i18n wiring, contradicting
the feature's own spec (FR6/SC6) and its own plan's phase-04 exit criteria — EN-locale users will see
an all-Vietnamese panel. Everything else is minor cleanup (dead `title` field, one undocumented asset
crop, missing unit test).
**Score:** 7/10
**Concerns/Blockers:** critical: 0, major: 1 (i18n not implemented per FR6/SC6), minor: 3 (dead
`title` field, undocumented icon-revival crop mismatch, missing WidgetButton unit test for
onOpenRules).
