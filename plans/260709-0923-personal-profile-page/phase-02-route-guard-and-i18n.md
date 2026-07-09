# Phase 02 — Route guard + i18n (Track B)

## Context
- `proxy.ts` (PROTECTED_PATHS, line ~11) — already comments "/profile" as the intended extension point.
- `messages/en.json`, `messages/vi.json` — existing `KudosPage` namespace as style reference.
- Spec: `spec/profile-page/spec.md` FR6 + Route & Access.

## Overview
- Priority: P2 · Status: done ✅
- Add `/profile` to the auth guard and create the `ProfilePage` i18n namespace in both locales.

## Requirements
### proxy.ts
- Add `"/profile"` to `PROTECTED_PATHS` array → `["/he-thong-giai", "/kudos", "/profile"]`.
- No other logic change (startsWith match + redirect already generic).

### i18n — `ProfilePage` namespace (identical key tree in en + vi)
```
ProfilePage: {
  title,                 // page <title> / heading
  awardsEyebrow,         // "Sun* Annual Awards 2025"
  kudosTitle,            // "KUDOS"
  toggle: { sent, received },   // labels take a {count}, e.g. "Đã gửi ({count})"
  iconCollection,        // "Bộ sưu tập icon của tôi"
  empty: { sent, received }     // friendly no-kudos-yet per direction
}
```
- vi = authoritative wording from design; en = faithful translation.
- Reuse existing `KudosPage.stats` (region B) + `KudosPage.card` (region D) — do NOT duplicate those keys.

## Related code files
- MODIFY `proxy.ts` (one array literal).
- MODIFY `messages/en.json`, `messages/vi.json` (add one namespace each).

## Implementation steps
1. Edit PROTECTED_PATHS.
2. Add `ProfilePage` block to en.json + vi.json with matching key structure.
3. `npm run typecheck` + `npm run lint`.

## Todo
- [ ] proxy PROTECTED_PATHS += "/profile"
- [ ] en.json ProfilePage
- [ ] vi.json ProfilePage (keys parity with en)
- [ ] typecheck/lint clean

## Success criteria
- `/profile` unauthenticated → redirect `/login` (proxy).
- next-intl resolves every `ProfilePage.*` key used by phases 03/04 in both locales (no missing-message warnings).

## Risk assessment
- **Low/High** — key drift between en/vi or vs. what components consume → runtime missing-message. Mitigation: keys frozen in plan integration contract; both locales edited together; phase 06 asserts no missing-message warning.

## Rollback
Revert the 3 edits (git).

## Next steps
Namespace consumed by phases 03, 04; guard verified in 06.
