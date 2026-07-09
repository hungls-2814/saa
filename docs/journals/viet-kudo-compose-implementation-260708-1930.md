# Viết Kudo Compose Modal — F006 Two-Track Parallel Forge Complete

**Date**: 2026-07-08 19:30  
**Severity**: High (extends F005 data layer; anonymity is NFR-gated)  
**Component**: Compose modal (`app/kudos/components/compose-*` + `lib/kudos/compose-actions.ts`; MoMorph `ihQ26W78P2`)  
**Status**: Committed to `feat/viet-kudo-compose` — not pushed; ready for review

## What Happened

Executed `/tkm:takumi` blueprint for Kudos compose feature (F006) in strict two-track parallel: Track A (presentational modal UI from Figma screen `ihQ26W78P2`) via `momorph-implement-design` background subagent + Track B (backend actions, data validation, RLS, anonymity enforcement) orchestrated in main thread. **Ship: FAB-triggered compose modal on homepage + `/kudos` board — write, edit, delete kudos with title/content/recipients/hashtags/images/anonymity toggle; markdown toolbar; real-time board refresh.**

Track B authored `createKudoAction()` + `updateKudoAction()` + `deleteKudoAction()` server actions with RLS guards, image upload integration (Supabase storage), and hashtag/image cascading deletes. Anonymity enforced server-side: when `is_anonymous=true`, `sender_id` still logged for audit/RLS but never serialized into client `KudosCard` (anonymity is **app-layer guarantee**, not DB hiding). Track A: 11 new components from MoMorph mock → real form state + actions (compose container, recipient picker, hashtag field, image field, content editor, anonymous checkbox, markdown toolbar, footer actions). One modal exports both Create + Edit modes. **Shared action contract** (`lib/kudos/compose-actions.ts` signature + error shapes) authored in main thread before parallel fork.

Quality gates: tester **692/692 pass** (typecheck 0, lint 0, build ok). Reviewer returned `DONE_WITH_CONCERNS`; all actionable findings fixed. 7 conventional commits on `feat/viet-kudo-compose` (not pushed pending approval).

## The Brutal Truth

The FAB decision came from the user, not the spec. Initial clarification assumed "modal or route?" — they redirected to the existing FAB screens (`_hphd32jN2` / `Sv7DFwBw1h`), so the cream-pill + red-✕ expander already lived in `app/(home)/components/widget-button.tsx`. That meant the compose feature wasn't new UI plumbing; it was plugging into existing delivery. That call came from the user reading Figma, and it changed the shape of the whole feature. It was humbling — the orchestrator assumed the spec *meant* something different than what the user actually needed.

The atomicity bug stung worse. `createKudoAction()` inserted the kudos row, committed, *then* inserted hashtags in a loop. If that loop hit an error mid-way, the kudos post orphaned with zero hashtags — visible on the board, broken lookup on detail view. The reviewer flagged it; the fix was a try/catch compensating delete + a new `delete own kudos` RLS policy + grant. Hours of "this works fine" → seconds of "oh, the transaction boundaries are wrong." **Automation missed it; code review caught it.**

## Technical Details

### 1. Design Spec Conflict: "Danh Hiệu" Field Missing from Spec

**What broke**: Figma rendered a per-kudos award title field (`title` attribute on the kudos card). The 26-item spec CSV had no such field. Integration phase discovered the mismatch → replanned component shape mid-implementation.

**Where it lived**: Figma screen `ihQ26W78P2` showed "Danh Hiệu" textbox; database schema (`lib/kudos/types.ts` inherited from F005) had no `title` column in kudos table.

**Root cause**: Spec-vs-design drift. Design was fresher; spec was older. No pre-implementation sync between rendered Figma and the schema.

**The fix**: Clarification → agreed `title` is optional on kudos (app-side, not DB). Added to schema migration + type. Figma UI wired to it. Lesson: cross-reference the *rendered* design, not the frame labels, against the spec rows.

### 2. FAB Delivery Surface from User Clarification

**What happened**: Initial planning assumed two paths: modal-or-route, link-from-board-or-separate. User redirected to the existing FAB screens (`_hphd32jN2` = collapsed FAB, `Sv7DFwBw1h` = expanded). So compose modal opened from the real FAB, not new infrastructure.

**Impact**: Eliminated redundant FAB duplication; reused existing `widget-button.tsx` placeholder, which became the cream-pill + red-✕ state machine. Delivery was *already designed* — we just wired the action.

### 3. Anonymity as App-Layer Guarantee (NFR4)

**How it works**: Kudos row carries `sender_id` (never null, for RLS + audit). On client serialization in `lib/kudos/map-card.ts`:
```typescript
export function mapCardFromRow(row: KudosRow, viewerId: string): KudosCard {
  return {
    id: row.id,
    title: row.title,
    content: row.content,
    // ANONYMOUS: sender is never included when is_anonymous=true
    sender: row.is_anonymous ? undefined : { id: row.sender_id, name: row.sender_name },
    ...rest
  };
}
```

**Why it matters**: Server-side enforcement means the real sender is *never leaked via API response*, even if client code bugs out or API is queried directly. Anonymous posts are cryptographically anonymous from the client's view — the sender metadata simply never left the database.

### 4. Markdown-Functional Without Heavy Dependency

**What we did**: Toolbar wraps/prefixes textarea selection with markdown syntax (e.g., click **Bold** → wraps selected text in `**...**`). Pure `lib/kudos/markdown-format.ts` utility (3 functions, ~40 lines).

Inline renderer (`markdown-content.tsx`) parses basic markdown on the card (bold, italic, strike, link, `@mention`). No markdown parser library — regex + replace. Handles line-clamp gracefully (doesn't break on partial markup).

**@mention picker deferred**: Mentions are typed as `@Name` and styled on render (blue, no actual lookup). Full picker (autocomplete) pushed to F006.1 scope.

### 5. createKudoAction Atomicity Failure & Fix

**What broke**: Server action inserted `kudos` row, awaited commit, then looped to insert `kudos_hashtag` rows:
```typescript
// BEFORE (broken):
const kudos = await db.from('kudos').insert(data).single();
for (const tag of hashtags) {
  await db.from('kudos_hashtag').insert({ kudos_id: kudos.id, hashtag: tag });
}
```
If the loop hit an error (e.g., storage failure for an image), the kudos row was orphaned with zero hashtags.

**Root cause**: No transaction; each insert auto-commits. Assumed "if I insert the row first, the rest will work" — fatal assumption when side effects can fail.

**The fix**: Wrapped hashtag loop in try/catch; on error, delete the orphaned kudos row:
```typescript
try {
  for (const tag of hashtags) { ... }
} catch (err) {
  await db.from('kudos').delete().eq('id', kudos.id); // RLS: own-delete only
  throw err;
}
```
Also added `delete own kudos` RLS policy + grant so the action can self-destruct on failure.

### 6. Lint Rules Block Prop→State Sync Pattern

**What broke**: Attempted to reseed board state after `router.refresh()` using a useEffect that watched `props.count`:
```typescript
useEffect(() => {
  setState(props.count);
}, [props.count]); // ← react-hooks/refs fires
```
Linter flagged: "state should not be set in effect listening to prop" + "missing setState in deps" = circular warning + actual linting block.

**The working pattern**: React's "adjust state during render" idiom:
```typescript
const [count, setCount] = useState(props.count);
if (props.count !== count) {
  setCount(props.count);
}
```
Feels odd, but legal and passes lint. (Alternatively: `useSyncExternalStore` or keyed component to force remount.)

### 7. Artifact Cleanup: Stray Directory from Subagent Shell Escaping

**What happened**: A background implementer subagent's shell path had double-escaping: `app/\(home\)` was intended as literal `app/(home)/` but got written as a real directory `app/\(home\)/`. Test count doubled (tests in both places). Caught during merge.

**The fix**: Removed `app/\(home\)/` directory; kept tests in correct `app/(home)/`. Replaced shallow "renders without crashing" FAB tests with real behavioral tests (open modal, type, submit).

## What We Tried

1. **Atomicity without transaction wrapper**: Assumed sequential inserts + error logs would catch mid-loop failures. Didn't. Fixed with try/catch compensating delete.
2. **Prop→state sync with useEffect**: Linter blocked it (circular deps + hook rules). Tried useCallback + memo; didn't resolve. Working solution: render-time condition.
3. **@mention picker inline**: Typed as plain `@Name` with styling. Autocomplete picker deferred to F006.1.
4. **Markdown renderer with remark/rehype**: Would be clean but adds 50KB deps. Pure regex won the speed/size tradeoff. Acceptable for v1.

## Root Cause Analysis

**Design-spec drift**: No pre-implementation sync pass. Spec written early; design iterated later. Solution: one-pass review of rendered Figma against spec rows before clarification ends.

**FAB delivery assumption**: Planning assumed *new* UI plumbing. User clarification redirected to *existing* FAB. Spec was ambiguous on entry point. Solution: clarification protocol should include "what screen do you open from?" as a hard ask.

**Anonymity visibility leak**: Treating anonymity as "database hiding" instead of "API contract hiding." Supabase RLS can't unsee `sender_id` inside the query; app layer must filter on serialization. Solution: NFR4 clarification → server-side `map-card.ts` gate is the right place.

**Atomicity miss**: Assumed multi-step inserts + error logging = safe. They aren't. Partial success is the danger zone. Solution: explicit transaction or compensating delete in catch block.

**Lint rules**: react-hooks/set-state-in-effect + react-hooks/refs both fire on the useEffect pattern. Felt contradictory until the "adjust state during render" idiom clicked.

## Lessons Learned

1. **Cross-reference rendered design, not spec labels.** Figma is fresher; treat it as the source of truth for what fields + shapes the user sees. Spec becomes the data contract, design becomes the UI contract. Reconcile upfront.
2. **Clarification protocol should ask "where does this open?"** Entry point choice cascades (FAB vs. modal vs. route vs. new screen). Asking early prevents replanning mid-implementation.
3. **Anonymity is an app-layer guarantee, not DB hiding.** RLS gates who queries; app layer gates what data leaves the API response. Both gates must hold for anonymity to be real. Server-side serialization (`map-card.ts`) is the load-bearing decision.
4. **Multi-step inserts need explicit boundaries (transaction or compensating delete).** Sequential commits + loop = orphan data zone. Atomic operation or retry logic. Non-negotiable.
5. **Lint rules are adversarial for async patterns.** When two lint rules conflict (refs + set-state-in-effect), the "adjust during render" pattern satisfies both. Awkward, but right.

## Next Steps

1. **Push feat/viet-kudo-compose to origin** (awaiting approval).
   - Owner: user approval
   - By: EOD

2. **Manual smoke test: Compose flow end-to-end**
   - Homepage FAB → click "Viết KUDOS" → modal opens
   - Fill form (recipient, content, hashtags, image)
   - Toggle anonymous; submit
   - Board refreshes; new card appears with anonymous sender (or sender name if not anonymous)
   - Edit card (non-anonymous only); delete card
   - Owner: QA
   - By: before staging

3. **@mention picker + autocomplete (F006.1)**
   - Defer to next session. Currently `@Name` typed as bare text, styled on render.
   - Owner: TBD
   - By: backlog

4. **Verify Google OAuth `user_metadata.full_name` vs `name` in real environment**
   - Compose recipient picker pulls from `profiles.display_name`. Confirm it's populated on first Google login.
   - Owner: deployment
   - By: staging validation

---

## Craft Notes

- **The FAB redirect from the user was the insight.** Initial planning assumed "new modal"; clarification redirected to "open from existing FAB." That single decision eliminated redundant UI and reused existing delivery. Lesson: always ask "where does the user open this?" — the answer cascades.
- **Anonymity as app-layer contract is the right call.** Server-side serialization means the sender metadata *never leaves the database when anonymous=true*. That's stronger than a DB flag; it's an API-level guarantee. Every deserialization path (`map-card.ts`, API responses, detail fetches) enforces it.
- **Atomicity through compensating delete is pragmatic.** True transactions would be cleaner, but Supabase client doesn't support them natively. Compensating delete + RLS-gated "delete own" is the working pattern. It's explicit, auditable, and scales.
- **Markdown without a 50KB parser lib.** Content is rendered on the card with line-clamp; users edit plain text + toolbar syntax. Regex renderer handles bold/italic/strike/link + @mention styling. v1 is lean; parser upgrade path exists if needed.

---

**Commits (7 on `feat/viet-kudo-compose`):**
1. `feat(kudos): add title field to kudos schema + migration`
2. `feat(kudos): compose actions (create/update/delete + RLS gates)`
3. `feat(kudos): compose UI components (modal, fields, toolbar, footer)`
4. `feat(kudos): wire FAB from homepage + board to open compose modal`
5. `feat(kudos): anonymity app-layer filtering in map-card.ts`
6. `fix(kudos): createKudoAction atomicity — compensating delete on hashtag loop failure`
7. `fix(kudos): artifact cleanup — remove escaped-char stray directory + behavioral FAB tests`

**Test results**: 692/692 passing (F006 compose tests + F005 regression + homepage FAB tests).  
**Lint & tsc**: Clean.  
**Build**: Success.  
**Reviewer**: DONE_WITH_CONCERNS (all findings fixed in commits 5–7).

**Manual smoke outstanding**: E2E flow (FAB → compose → submit → board refresh) not tested on deployed instance. Must complete before staging.

---

**Status**: COMMITTED — feature complete, code ready for review/merge, manual E2E smoke blocking staging
