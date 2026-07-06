# Review: Header Dropdown Re-alignment (Language Selector + Account Menu)

Scope: `app/components/language-selector.tsx`, `app/(home)/components/account-menu.tsx`,
`messages/{en,vi}.json`. Read-only review against `plans/260706-0925-align-lang-profile-dropdowns/`
(plan.md, clarifications.md, spec/header-dropdowns/spec.md).

Verified: `tsc --noEmit` clean, `eslint` clean, `vitest run` 87/87 passing (final state).

## High

1. **Locale code text doesn't match the authoritative design token ("VI" rendered, spec says "VN").**
   `language-selector.tsx:48,85` render `{code.toUpperCase()}` on the `Locale` value `"vi"`,
   producing **"VI"**. `spec/header-dropdowns/spec.md:35,38` and `clarifications.md:8-9` explicitly
   require the short **code** `VN` / `EN` (ISO-3166 country style, not ISO-639 language style).
   This is a real design-fidelity miss, not a nit — the row's entire visible content is flag + code.
   Notably the accompanying test (`app/components/language-selector.test.tsx:125`) asserts
   `toContain("VI")`, and the tester's own report
   (`plans/reports/tester-260706-0935-header-dropdowns.md:37,41,141`) claims `"VN"` was verified —
   it wasn't; the suite encodes the same bug it should have caught.
   Fix: map locale → display code (`{ vi: "VN", en: "EN" }`) rather than `.toUpperCase()`-ing the
   locale itself.

2. **Duplicate SVG `id`s (`gb-flag-clip`, `gb-flag-quadrants`) reachable in the same DOM.**
   `GbFlag` (`language-selector.tsx:117-144`) hardcodes both ids. The trigger button always
   renders `<LocaleFlag locale={activeLocale}/>`, and the open list renders `<LocaleFlag>` for
   every `SUPPORTED_LOCALES` entry including the active one — so whenever `activeLocale === "en"`
   and the dropdown is open, **two** `<GbFlag>` instances exist simultaneously with identical ids.
   Invalid HTML; `url(#id)` resolution for duplicate ids is technically undefined per spec (works
   today only because both clip shapes happen to be geometrically identical — any future edit to
   one clipPath without the other silently breaks the other instance). Fix with `useId()`.

## Medium

3. **Dead i18n keys.** `Common.langVi` / `Common.langEn` in `messages/en.json` and `messages/vi.json`
   are now unreferenced — `language-selector.tsx` dropped the `useTranslations("Common")` labels
   dict this session but the keys were left behind. Remove for cleanliness (DRY).

4. **Keyboard-focus feedback inconsistent between the two dropdowns and vs. hover.**
   - `account-menu.tsx`'s shared `ROW` class gives `focus-visible` the gold-tint background but
     *not* the glow `text-shadow` that `hover` gets — so focus and hover look slightly different.
   - `language-selector.tsx` rows define **no** `focus-visible` styling at all (only `hover:`), so
     Tab-only navigation through non-selected rows falls back to the browser default outline
     instead of the design's gold-tint feedback that mouse users get. Spec text only calls out
     "hovered/focused" for the account menu, so this isn't a spec violation, but the two dropdowns
     should probably behave the same way for keyboard users.

## Low / Not a regression (pre-existing, flagging for awareness only)

5. `<li role="option">` wrapping an interactive `<button>` — nested interactive control inside
   an ARIA leaf role can confuse some AT/browser combos for the listbox pattern. Present before
   this session's changes; not introduced here.
6. `language-selector.tsx` still has no Escape-to-close handler, unlike `account-menu.tsx` (which
   has one). Pre-existing asymmetry, unrelated to this diff.

## Positive observations

- Container/border/radius/padding/row-height/highlight-rgba/glow all match the authoritative
  MoMorph tokens exactly, and the glow token is byte-identical to the one already used for the
  active nav link in `site-header.tsx` (`text-shadow:0_4px_4px_rgba(0,0,0,0.25),0_0_6px_#FAE287`) —
  good reuse of an existing token rather than a new approximation.
- Interaction logic fully preserved: `setLocale` + `router.refresh()` no-op on active locale,
  sign-out `<form action={signOut}>` server action, Escape/backdrop-close on account menu — none
  of it touched, confirmed by reading `lib/i18n/set-locale.ts` / `lib/auth/sign-out.ts` and diffing
  only markup/class changes.
- `useTranslations` import correctly dropped from `language-selector.tsx` along with the now-unused
  `labels` dict (no dead import) — the leftover is only in the message JSON (#3 above).
- Icons are properly `aria-hidden` (UserIcon, ChevronRightIcon, GbFlag); decorative `<Image>` flags
  use `alt=""` since the visible code text already conveys the meaning.
- File sizes stay under the project's 200-line cap (131 / 144 lines).
- `Home.header.signOut` key itself wasn't renamed — only its value changed — so no breaking change
  to translation consumers.

## Note on test-suite volatility during review

Mid-review, `account-menu.test.tsx` and `language-selector.test.tsx` were still being written by a
concurrent tester pass — an interim run showed 1 failing assertion
(`getByRole("button", { name: "signOut" })` no longer matching because `role="menuitem"` overrides
the button's implicit role). That was in-flight tester work, not the final state; a re-run after
the tester finished is clean (87/87). Not reported as a finding against this session's diff.

**Status:** DONE_WITH_CONCERNS
**Summary:** Behavior/logic untouched and container/highlight/glow tokens match the design exactly, but the language-selector row text renders "VI" instead of the spec's "VN" (a real fidelity miss the test suite also got wrong), and the inline GB flag SVG has duplicate ids that collide whenever the trigger and an EN row render together.
**Concerns/Blockers:** Item 1 (VN vs VI) should block merge until fixed — it's the visible content of every English... no, Vietnamese row and directly contradicts the authoritative design value. Item 2 (duplicate SVG ids) is lower risk today (identical geometry masks it) but is invalid markup and should be fixed with `useId()` before it bites later.
