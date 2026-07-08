# Phase 04 — Auth gate + i18n KudosPage namespace (Track B)

## Context
- Convention: `proxy.ts` (`PROTECTED_PATHS`), `app/he-thong-giai/page.tsx` (defense-in-depth guard),
  `lib/supabase/middleware.test.ts` (proxy test style), `messages/{vi,en}.json` (namespaces)
- Spec: `spec/kudos-board/overview.md` (FR9, FR10) · blockedBy: — (parallel-runnable within Track B)

## Overview
- **Priority:** P1
- **Status:** done
- **Description:** Gate `/kudos` behind auth (proxy + page defense-in-depth) and add the
  `KudosPage` i18n namespace (vi primary + en mirror) covering every visible string. Independent
  of Phases 01–03 and of Track A — no shared files with them until Integration.

## Key insights
- `PROTECTED_PATHS.some(p => pathname.startsWith(p))` already matches — just add `"/kudos"`.
- Page guard mirrors F003: `isSupabaseConfigured() ? getUser() : null` → `redirect('/login')`.
- i18n copy VERBATIM from the design (vi); en faithfully translated. Includes: banner, send-pill
  label, filter dropdown labels/placeholders, carousel paginator, empty-states
  ("Hiện tại chưa có Kudos nào.", "Chưa có dữ liệu"), action labels (Xem chi tiết, Copy Link),
  Copy-Link toast ("Link copied — ready to share!"), spotlight header/search, stats labels,
  gifts heading.
- Page shell here is a **stub** (guard + layout) so this phase stands alone; the real board
  markup lands in Integration (Track A UI + this shell + queries).

## Requirements
- **Functional:** FR9 auth gate, FR10 i18n. **Non-functional:** NFR3.

## Related code files
**Create**
- `app/kudos/page.tsx` — server component: auth guard + `SiteHeader`/`SiteFooter` shell
  (board children slotted during Integration); `metadata.title`
- `app/kudos/page.test.tsx` (or guard-focused test) — unauthenticated → redirect
**Modify**
- `proxy.ts` — `PROTECTED_PATHS = ["/he-thong-giai", "/kudos"]`
- `proxy` test coverage — `/kudos` unauthenticated redirects to `/login` (extend existing style)
- `messages/vi.json`, `messages/en.json` — add `KudosPage` namespace

## Implementation steps
1. Add `/kudos` to `proxy.ts` `PROTECTED_PATHS`.
2. Create `app/kudos/page.tsx` guard + header/footer shell (mirror `he-thong-giai/page.tsx`).
3. Add `KudosPage` namespace to `messages/vi.json` (verbatim vi) + `messages/en.json` (mirror).
4. Tests: proxy guard for `/kudos`; page redirect when unauthenticated; i18n key presence.

## Todo
- [x] `/kudos` in `PROTECTED_PATHS`
- [x] `app/kudos/page.tsx` guard + shell
- [x] `KudosPage` namespace in vi.json + en.json (all visible strings)
- [x] guard/redirect tests

## Success criteria
- **SC1:** authenticated → renders; unauthenticated → `/login` (proxy + page).
- **SC11:** every visible string resolves from `KudosPage` in both vi and en.

## Risks
| Risk | L×I | Countermove |
|------|-----|-------------|
| vi/en key drift (missing mirror) | M×L | key-parity test across the two catalogs |
| Guard shell diverges from Integration markup | L×L | keep shell minimal; Integration slots children |

## Security
Defense-in-depth: proxy guard + server-side `getUser()`. No client-exposed secrets.

## Next
Feeds Phase 06 integration (page shell hosts the Track A board wired to Phase 02/03).
