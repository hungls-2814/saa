# Research: First Postgres Data Layer for Kudos Live Board (`/kudos`)

Date: 2026-07-06 | Scope: schema, RLS, migrations, seed, server data access, testing, env — grounded against this repo's existing `lib/supabase/*` and vitest conventions.

## Recommended approach (5 lines)

1. Adopt **Supabase CLI + `supabase/migrations/*.sql`** (timestamped files, `supabase db push`) — the hosted-only setup has zero schema history to protect, so there's no migration risk in starting now; dashboard-SQL-editor-only becomes untenable the moment RLS + a trigger + FKs are involved.
2. Compute `heart_count` via a **plain SQL view** (`kudos_with_heart_count`, `COUNT(hearts.*) GROUP BY kudos.id`) — not a trigger-maintained column, not a materialized view. Event-scale data (hundreds/low-thousands of rows) makes a live COUNT cheap and it can never drift.
3. Self-like block on `hearts` is **enforceable in RLS** via a `NOT EXISTS` subquery in `WITH CHECK` — no app-layer check needed (though keep one for a nicer error/toast).
4. Keyset pagination on `kudos(created_at desc, id desc)` for infinite scroll — not `.range()` offset, which shifts/duplicates rows as new kudos arrive during scrolling.
5. Test query/action modules by **mocking `@/lib/supabase/server`'s `createClient`** with a `mockReturnThis()` chainable stub whose terminal is a thenable — no test DB, consistent with existing `middleware.test.ts` mocking style.

---

## 1. Migration & local workflow

**Recommend Supabase CLI with the classic timestamped-migrations workflow** (not the newer declarative-schema/`db diff` flow — that's a second layer of tooling this team doesn't need yet; KISS). Dashboard-only SQL is out: RLS policies + a security-definer trigger + FKs are exactly the kind of multi-statement, order-dependent DDL that's error-prone to hand-apply and impossible to code-review without files in git.

Adding the CLI doesn't touch the existing auth-only setup: CLI only manages a `supabase_migrations.schema_migrations` tracking table + the app tables it creates. Google OAuth provider config, Site URL, redirect URLs (all dashboard-side GoTrue config per `docs/setup/supabase-google-oauth.md`) are untouched. `lib/supabase/{client,server,middleware}.ts` need zero changes — they're already generic clients.

**No local Docker (`supabase start`) requirement to push migrations** — only `supabase link` is needed for `supabase db push`. Docker/local Postgres is optional (nice for dry-running migrations before pushing) but not a blocker for a small team already comfortable with the hosted dashboard.

Setup:
```bash
npm install --save-dev supabase   # or: npx supabase <cmd> ad hoc, no install
npx supabase init                 # creates supabase/ dir (git-tracked)
npx supabase link --project-ref <project-ref>
npx supabase db pull              # captures current (empty/auth-only) remote as baseline migration
```

Directory layout:
```
supabase/
├── config.toml
├── migrations/
│   ├── 20260706000000_kudos_schema.sql        # tables, indexes, view
│   ├── 20260706000100_kudos_rls_policies.sql  # RLS enable + policies
│   └── 20260706000200_handle_new_user.sql     # profiles trigger
└── seed.sql                                    # optional, only used by `supabase start` + `db reset`
```

Ongoing: `npx supabase migration new <name>` → edit generated file → `npx supabase db push`. **Caution** (from Supabase docs): once on migrations, don't hand-edit schema via dashboard SQL editor again — it desyncs `db push` (fails with drift errors). `supabase db pull` recovers from drift if it happens.

Sources: [Supabase CLI reference](https://supabase.com/docs/reference/cli/introduction), [Database Migrations guide](https://supabase.com/docs/guides/deployment/database-migrations), [Local development overview](https://supabase.com/docs/guides/local-development/overview), [supabase/cli GitHub](https://github.com/supabase/cli).

---

## 2. Schema DDL

```sql
-- 20260706000000_kudos_schema.sql
create extension if not exists pgcrypto; -- gen_random_uuid(); no-op if already enabled

create table departments (
  id   uuid primary key default gen_random_uuid(),
  name text not null unique
);

create table profiles (
  id            uuid primary key references auth.users(id) on delete cascade,
  full_name     text not null,
  department_id uuid references departments(id),
  avatar_url    text,
  title         text, -- "danh hiệu"
  created_at    timestamptz not null default now()
);

create table kudos (
  id          uuid primary key default gen_random_uuid(),
  sender_id   uuid not null references profiles(id) on delete cascade,
  receiver_id uuid not null references profiles(id) on delete cascade,
  content     text not null,
  created_at  timestamptz not null default now()
);
-- keyset pagination on the feed:
create index kudos_created_at_id_idx on kudos (created_at desc, id desc);
create index kudos_receiver_id_idx on kudos (receiver_id);
create index kudos_sender_id_idx on kudos (sender_id);

create table hearts (
  user_id    uuid not null references profiles(id) on delete cascade,
  kudos_id   uuid not null references kudos(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (user_id, kudos_id) -- also enforces UNIQUE(user_id, kudos_id)
);
create index hearts_kudos_id_idx on hearts (kudos_id); -- PK leads with user_id; this covers COUNT-by-kudos

create table hashtags (
  id    uuid primary key default gen_random_uuid(),
  label text not null unique
);

create table kudos_hashtags (
  kudos_id   uuid not null references kudos(id) on delete cascade,
  hashtag_id uuid not null references hashtags(id) on delete cascade,
  primary key (kudos_id, hashtag_id)
);
create index kudos_hashtags_hashtag_id_idx on kudos_hashtags (hashtag_id);

create table gifts (
  id           uuid primary key default gen_random_uuid(),
  recipient_id uuid not null references profiles(id) on delete cascade,
  description  text not null,
  awarded_at   timestamptz not null default now()
);
create index gifts_awarded_at_idx on gifts (awarded_at desc);
```

**`heart_count`: view, not trigger, not materialized view.** Decision rationale:
- Materialized view = stale until refreshed → wrong for a live board.
- Trigger-maintained counter column = write-path complexity (2 extra statements per insert/delete, must handle both directions) to save a `COUNT` that, at event scale (an internal awards event — hundreds of kudos, not millions), costs nothing.
- Plain view = always correct, zero write-path changes, trivially indexed via the underlying tables' indexes above.

```sql
create view kudos_with_heart_count as
select
  k.id, k.sender_id, k.receiver_id, k.content, k.created_at,
  count(h.kudos_id) as heart_count
from kudos k
left join hearts h on h.kudos_id = k.id
group by k.id;
```
If this ever becomes a real bottleneck (it won't at this scale — revisit only with evidence), the escape hatch is a `heart_count int not null default 0` column on `kudos` + an `AFTER INSERT/DELETE` trigger on `hearts` doing `UPDATE kudos SET heart_count = heart_count + 1/-1`. Don't build that now (YAGNI).

Sources: [Postgres trigger docs](https://www.postgresql.org/docs/current/trigger-definition.html), [Counter Analytics in PostgreSQL — Tiger Data](https://www.tigerdata.com/blog/counter-analytics-in-postgresql-beyond-simple-data-denormalization) (denormalize only where a *measured* query needs it), [Materialized views vs denormalization](https://sachinsatpute.medium.com/faster-dashboards-with-postgresql-materialized-views-and-literal-denormalization-ea1f47a86841).

---

## 3. RLS policies

All reads gated to `authenticated` (board is auth-gated end to end — matches `proxy.ts` / `updateSession()` already redirecting unauthenticated users). Supabase's documented performance pattern — wrap `auth.uid()` in `(select auth.uid())` so Postgres caches it per-statement instead of re-evaluating per-row — is used throughout.

```sql
-- 20260706000100_kudos_rls_policies.sql
alter table profiles         enable row level security;
alter table kudos            enable row level security;
alter table hearts           enable row level security;
alter table hashtags         enable row level security;
alter table kudos_hashtags   enable row level security;
alter table departments      enable row level security;
alter table gifts            enable row level security;

-- Read: any authenticated user, all tables (board data isn't per-tenant)
create policy "authenticated read profiles"       on profiles       for select to authenticated using (true);
create policy "authenticated read kudos"          on kudos          for select to authenticated using (true);
create policy "authenticated read hearts"         on hearts         for select to authenticated using (true);
create policy "authenticated read hashtags"       on hashtags       for select to authenticated using (true);
create policy "authenticated read kudos_hashtags" on kudos_hashtags for select to authenticated using (true);
create policy "authenticated read departments"    on departments    for select to authenticated using (true);
create policy "authenticated read gifts"          on gifts          for select to authenticated using (true);

-- profiles: NO insert/update policy for `authenticated`. The only writer is the
-- handle_new_user() trigger (SECURITY DEFINER, runs as table owner, bypasses RLS).
-- Absence of a policy = fail-closed: users cannot self-insert/edit rows directly.

-- kudos: a user may only author kudos as themselves.
create policy "insert own kudos" on kudos for insert to authenticated
  with check ( sender_id = (select auth.uid()) );

-- hearts: own row only, and NOT on a kudos they sent themselves (self-like block).
-- This is enforceable in RLS: WITH CHECK subqueries may reference other tables and
-- the row's own submitted column values directly (do not use "new.col" inside the
-- subquery — reference the bare column name, which the policy binds to the incoming row).
create policy "insert own heart, not on own kudos" on hearts for insert to authenticated
  with check (
    user_id = (select auth.uid())
    and not exists (
      select 1 from kudos k
      where k.id = kudos_id
        and k.sender_id = (select auth.uid())
    )
  );

create policy "delete own heart" on hearts for delete to authenticated
  using ( user_id = (select auth.uid()) );
```

The `(user_id, kudos_id)` primary key is a second line of defense against double-hearting (race between two concurrent inserts) — the RLS check alone doesn't prevent duplicate rows, the PK does. Both are needed.

Sources: [Row Level Security guide](https://supabase.com/docs/guides/database/postgres/row-level-security), [RLS INSERT + NEW-row-in-subquery discussion #26288](https://github.com/orgs/supabase/discussions/26288), [Advanced RLS via another table #18761](https://github.com/orgs/supabase/discussions/18761), [RLS performance best practices](https://supabase.com/docs/guides/troubleshooting/rls-performance-and-best-practices-Z5Jjwv).

---

## 4. Profile-on-signup trigger

Canonical Supabase pattern (`security definer`, empty `search_path` to avoid search-path-hijack, reads Google OAuth's `raw_user_meta_data`):

```sql
-- 20260706000200_handle_new_user.sql
create function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = ''
as $$
begin
  insert into public.profiles (id, full_name, avatar_url)
  values (
    new.id,
    new.raw_user_meta_data ->> 'full_name',  -- Google provider sets 'full_name' (and/or 'name')
    new.raw_user_meta_data ->> 'avatar_url'
  );
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();
```
Verify the exact metadata key Google populates (`full_name` vs `name`) against a real sign-in payload before shipping — Supabase's Google provider has historically set both `full_name` and `name`; `raw_user_meta_data ->> 'full_name'` is the documented convention but confirm once against `auth.users.raw_user_meta_data` in the dashboard after a real OAuth login.

Source: [Managing user data guide](https://supabase.com/docs/guides/auth/managing-user-data).

---

## 5. Seed strategy

**Skip `supabase/seed.sql` as the primary seeding path** — it only auto-applies on `supabase db reset`, which requires the local Docker stack (`supabase start`). Nothing in this repo suggests the team runs Docker locally today. Forcing that dependency just to seed sample Sunners is not KISS.

**Recommend an idempotent TS seed script** run with `tsx`/`ts-node` against either local or the hosted dev project, using upserts keyed on natural keys so re-running is safe:

```ts
// scripts/seed-kudos.ts (run: node --loader tsx scripts/seed-kudos.ts)
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!, // service role: bypasses RLS, server/CLI-only
);

async function main() {
  const { data: dept } = await supabase
    .from("departments")
    .upsert({ name: "Engineering" }, { onConflict: "name" })
    .select()
    .single();

  const { data: profile } = await supabase
    .from("profiles")
    .upsert(
      { id: "<known-auth-uid-or-skip>", full_name: "Sample Sunner", department_id: dept!.id },
      { onConflict: "id" },
    )
    .select()
    .single();

  // kudos/hearts/hashtags/gifts seeded similarly, each upsert keyed on a natural
  // key (content+sender+receiver, or a fixed seed uuid) so re-runs don't duplicate.
}
main();
```
Note: seeding `profiles` for "sample Sunners" without a real `auth.users` row is awkward because `profiles.id` FKs to `auth.users(id)` — either (a) create throwaway auth users via `supabase.auth.admin.createUser()` (needs service role) for seed accounts, or (b) relax this for local/dev only by seeding rows with fixed known UUIDs and skipping the FK in a `*_dev` seed variant. Recommend (a): it's the same shape as production and doesn't fork the schema.

`supabase/seed.sql` can still exist as a thin wrapper (`\i` or a comment pointing at the TS script) for anyone who does use `supabase start`, but the TS script is the source of truth.

---

## 6. Server-side data access

Query modules live under `lib/kudos/*.ts`, always calling the existing async `createClient()` from `lib/supabase/server.ts` (Server Components/Actions only — never the browser client for this data).

**Pagination: keyset on `(created_at, id)` descending, not `.range()`.** `.range()` maps to `OFFSET/LIMIT`, which skips/duplicates rows when new kudos are inserted while a user is mid-scroll (classic offset-pagination drift). `created_at` alone risks ties on same-timestamp rows; add `id` as tiebreak for a fully deterministic cursor.

```ts
// lib/kudos/queries.ts
import { createClient } from "@/lib/supabase/server";

export type KudosCursor = { createdAt: string; id: string };

export async function getKudosFeed(opts: { cursor?: KudosCursor; limit?: number } = {}) {
  const { cursor, limit = 20 } = opts;
  const supabase = await createClient();

  let query = supabase
    .from("kudos_with_heart_count")
    .select(
      "id, content, created_at, heart_count, sender:profiles!kudos_sender_id_fkey(full_name, avatar_url), receiver:profiles!kudos_receiver_id_fkey(full_name, avatar_url)",
    )
    .order("created_at", { ascending: false })
    .order("id", { ascending: false })
    .limit(limit);

  if (cursor) {
    // Compound keyset predicate: rows strictly older than the cursor, or same
    // timestamp with a smaller id (deterministic tiebreak).
    query = query.or(
      `created_at.lt.${cursor.createdAt},and(created_at.eq.${cursor.createdAt},id.lt.${cursor.id})`,
    );
  }

  const { data, error } = await query;
  if (error) throw error;
  return data;
}

export async function getHighlights() {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("kudos_with_heart_count")
    .select("id, content, heart_count, sender:profiles!kudos_sender_id_fkey(full_name)")
    .order("heart_count", { ascending: false })
    .order("created_at", { ascending: false })
    .limit(5);
  if (error) throw error;
  return data;
}

export async function getTopGifts() {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("gifts")
    .select("id, description, awarded_at, recipient:profiles!gifts_recipient_id_fkey(full_name, avatar_url)")
    .order("awarded_at", { ascending: false })
    .limit(10);
  if (error) throw error;
  return data;
}

export async function getSpotlightStats() {
  const supabase = await createClient();
  const { count, error } = await supabase
    .from("kudos")
    .select("*", { count: "exact", head: true });
  if (error) throw error;
  return { totalKudos: count ?? 0 };
}
```

If the `.or()` string-building for the compound cursor feels fragile, the simpler **single-column** alternative (`.lt('created_at', cursor.createdAt)`) is acceptable given real-world insert cadence (a human clicking "send kudos" — sub-millisecond ties are effectively impossible) — note the tradeoff explicitly rather than silently picking one.

**Mutation: Server Action.**
```ts
// lib/kudos/actions.ts
"use server";
import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";

export async function toggleHeartAction(kudosId: string) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("Not authenticated");

  const { data: existing, error: selectError } = await supabase
    .from("hearts")
    .select("user_id")
    .eq("user_id", user.id)
    .eq("kudos_id", kudosId)
    .maybeSingle();
  if (selectError) throw selectError;

  if (existing) {
    const { error } = await supabase.from("hearts").delete().eq("user_id", user.id).eq("kudos_id", kudosId);
    if (error) throw error;
  } else {
    const { error } = await supabase.from("hearts").insert({ user_id: user.id, kudos_id: kudosId });
    // RLS violation (self-like) surfaces here as a Postgres error — catch and
    // map to a user-facing toast rather than letting it bubble as a 500.
    if (error) throw error;
  }

  revalidatePath("/kudos");
}
```

Sources: [Pagination in Supabase — makerkit](https://makerkit.dev/blog/tutorials/pagination-supabase-react), [Cursor-based pagination discussion #3938](https://github.com/orgs/supabase/discussions/3938), [Infinite Scroll discussion #6753](https://github.com/orgs/supabase/discussions/6753), [SupaExplorer cursor-pagination best practice](https://supaexplorer.com/best-practices/supabase-postgres/data-pagination/).

---

## 7. Testing without a live DB

Follow the existing `lib/supabase/middleware.test.ts` pattern: `vi.mock('@/lib/supabase/server', ...)` and `vi.mocked(createClient)`. The one new piece is a **chainable query-builder stub** — `mockReturnThis()`-style chain methods, with the object itself thenable (mirrors supabase-js's real query builder, which is a `PromiseLike`).

```ts
// lib/kudos/test-helpers/supabase-query-mock.ts
import { vi } from "vitest";

export function createQueryMock<T>(result: { data: T; error: unknown }) {
  const builder: Record<string, unknown> = {};
  const chain = () => builder;
  Object.assign(builder, {
    select: vi.fn(chain),
    eq: vi.fn(chain),
    order: vi.fn(chain),
    or: vi.fn(chain),
    limit: vi.fn(chain),
    range: vi.fn(chain),
    lt: vi.fn(chain),
    insert: vi.fn(chain),
    delete: vi.fn(chain),
    maybeSingle: vi.fn(() => Promise.resolve(result)),
    single: vi.fn(() => Promise.resolve(result)),
    then: (resolve: (v: typeof result) => void) => resolve(result),
  });
  return builder;
}
```

Query module test:
```ts
import { describe, it, expect, vi, beforeEach } from "vitest";
import { getKudosFeed } from "./queries";
import { createQueryMock } from "./test-helpers/supabase-query-mock";

vi.mock("@/lib/supabase/server", () => ({ createClient: vi.fn() }));
import { createClient } from "@/lib/supabase/server";

describe("getKudosFeed", () => {
  beforeEach(() => vi.clearAllMocks());

  it("queries kudos_with_heart_count ordered by created_at desc", async () => {
    const builder = createQueryMock({ data: [{ id: "1" }], error: null });
    const mockFrom = vi.fn(() => builder);
    vi.mocked(createClient).mockResolvedValue({ from: mockFrom } as never);

    const result = await getKudosFeed({ limit: 10 });

    expect(mockFrom).toHaveBeenCalledWith("kudos_with_heart_count");
    expect(builder.order).toHaveBeenCalledWith("created_at", { ascending: false });
    expect(result).toEqual([{ id: "1" }]);
  });
});
```

Toggle-action test (insert + delete branches):
```ts
describe("toggleHeartAction", () => {
  it("inserts a heart when none exists yet", async () => {
    const selectBuilder = createQueryMock({ data: null, error: null }); // maybeSingle -> null
    const insertBuilder = createQueryMock({ data: null, error: null });
    const mockFrom = vi.fn()
      .mockReturnValueOnce(selectBuilder)  // the .select().eq().eq().maybeSingle() check
      .mockReturnValueOnce(insertBuilder); // the .insert()
    vi.mocked(createClient).mockResolvedValue({
      from: mockFrom,
      auth: { getUser: vi.fn().mockResolvedValue({ data: { user: { id: "u1" } } }) },
    } as never);

    await toggleHeartAction("k1");

    expect(insertBuilder.insert).toHaveBeenCalledWith({ user_id: "u1", kudos_id: "k1" });
  });
});
```

**Pure functions worth extracting purely for cheap, mock-free unit tests:**
- `deriveStarTier(kudosReceivedCount: number): 0 | 1 | 2 | 3` — thresholds 10/20/50, no DB/IO.
- `encodeCursor({ createdAt, id }) => string` / `decodeCursor(string) => { createdAt, id }` — base64/JSON round-trip, easy to fuzz-test independent of Supabase.
- Filter-combination logic (department + hashtag selection → the predicate object passed into the query builder) — keep this as a plain function returning a descriptor, tested without touching `.or()`/`.eq()` chains at all; the query module then just applies the descriptor.

Sources: [Chainable query builder mocking — DEV](https://dev.to/dusttoo/how-i-solved-supabases-chainable-query-builder-problem-in-react-native-tests-oa7), [Supabase Testing Overview](https://supabase.com/docs/guides/local-development/testing/overview), [Supabase + React Router testing service — DEV](https://dev.to/kevinccbsg/supabase-react-router-testing-supabase-service-part-6-4o9f).

---

## 8. Env/config

New var: `SUPABASE_SERVICE_ROLE_KEY` — **server-side/tooling only** (seed script, any future admin task). Do NOT prefix `NEXT_PUBLIC_`. Add to `.env.local.example` with a comment flagging it as secret, and confirm it's covered by `.gitignore` (it already is, via `.env.local`).

`isSupabaseConfigured()` in `lib/supabase/config.ts` should **not** be extended to check for the service-role key — it gates whether the *running app* treats auth as configured (anon key + URL only), and the app itself never uses the service-role key. Coupling them would make the app fail-closed on a var it doesn't need at runtime. Keep the seed script's own guard separate:
```ts
if (!process.env.SUPABASE_SERVICE_ROLE_KEY) {
  throw new Error("SUPABASE_SERVICE_ROLE_KEY required for seeding — never expose this to the client bundle.");
}
```

No other env changes: existing `NEXT_PUBLIC_SUPABASE_URL`/`NEXT_PUBLIC_SUPABASE_ANON_KEY` already cover the anon-key RLS-gated reads/writes this whole design relies on.

---

## Unresolved questions

1. `profiles.department` — modeled as `department_id → departments(id)` (normalized FK) since a standalone `departments` table was specified; confirm this is the intent vs. a plain `department text` column with `departments` existing only as a filter-dropdown source of truth (functionally similar, but FK-vs-text changes the profile upsert shape).
2. Exact Google OAuth metadata key for name/avatar — `raw_user_meta_data ->> 'full_name'` / `'avatar_url'` is the documented Supabase convention; verify against a real `auth.users` row after a Google sign-in before relying on it in the trigger (Google sometimes populates `name` alongside/instead of `full_name`).
3. Whether kudos "spotlight" needs a deduplicated receiver-name list (a marquee of distinct names) or every kudos's receiver name repeated — the report gives a total-count query only; the distinct-names query depends on this and wasn't in scope to guess.
4. Whether `kudos.sender_id != receiver_id` (no self-kudos) is a real rule — not stated in the confirmed decisions, so no DB constraint was added (YAGNI); flag if this is actually required.

**Status:** DONE. Schema/RLS/trigger/query/test patterns are concrete and copy-pasteable, cross-checked against 3 official Supabase docs pages + 5 independent web searches (GitHub discussions, dev.to, blog case studies) and the repo's existing `lib/supabase/*` conventions. Two design calls (heart_count as view not trigger; keyset not offset pagination) are opinionated recommendations, not the only valid options — noted inline with the tradeoff.
