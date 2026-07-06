# Doc impact review — header dropdown re-alignment (language selector + account menu)

## Verdict
One surgical fix applied. Everything else: no update needed.

## Checked
- `docs/features/F001-login/overview.md` — language-selector description (flag + VN/EN + chevron)
  already matches the re-aligned design at the level of detail this doc operates (no visual-token-level
  prose elsewhere in the doc either). No "Sign out"/"Logout" label reference here (F001 only covers the
  login screen, not the account menu). **No change.**
- `docs/features/F002-homepage/overview.md` — line 44 said `account menu (Profile, Sign out)`; code
  (`messages/en.json:26`, `app/(home)/components/account-menu.tsx:82`) now renders `Logout`. Stale label
  → **fixed**: `Profile, Sign out` → `Profile, Logout`. No other line in this file references the old
  label or the dropdown visual details (hover states, colors) at a granularity this doc tracks.
- `docs/system/architecture.md` — i18n line (7) and directory notes are locale-mechanism level (cookie,
  no URL prefix), untouched by this visual change. **No change.**
- `docs/system/permissions.md` — auth-tier/route-guard table; account-menu label and dropdown styling
  are UI-only, not permissions. **No change.**
- Confirmed `Common.langVi`/`langEn` keys (removed this session) were never referenced in `docs/` — no
  cleanup needed there.

## Files touched
- `/home/lesonghung/WORKSPACE/AIDD/saa/docs/features/F002-homepage/overview.md` (1 line)

## Not touched (per scope)
- `plans/260706-0925-align-lang-profile-dropdowns/plan.md`, changelog, roadmap — project-manager's lane.
- The drafted spec at `plans/260706-0925-align-lang-profile-dropdowns/spec/header-dropdowns/spec.md` is
  fine as a standalone artifact; folding it into a new `docs/features/` dir isn't warranted (sub-component
  of two existing features, not a new feature).

**Status:** DONE
**Summary:** Reviewed F001/F002 overviews + system architecture/permissions docs against the re-aligned dropdowns; only one stale label (`Sign out` → `Logout`) found and fixed in F002 overview.md line 44. No other docs needed changes.
**Concerns/Blockers:** None.
