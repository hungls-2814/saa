import { vi } from 'vitest';

/**
 * A chainable Supabase query-builder stub. Every chain method
 * (`.select()`, `.eq()`, `.order()`, ...) returns the same object via
 * `mockReturnThis()`-style wiring, and the object itself is thenable —
 * mirroring supabase-js's real `PostgrestFilterBuilder`, which is a
 * `PromiseLike`. Matches the mocking convention in
 * `lib/supabase/middleware.test.ts`.
 */
export function createQueryMock<T>(result: { data: T; error: unknown; count?: number | null }) {
  const builder: Record<string, unknown> = {};
  const chain = () => builder;
  Object.assign(builder, {
    select: vi.fn(chain),
    eq: vi.fn(chain),
    in: vi.fn(chain),
    order: vi.fn(chain),
    or: vi.fn(chain),
    limit: vi.fn(chain),
    range: vi.fn(chain),
    lt: vi.fn(chain),
    insert: vi.fn(chain),
    delete: vi.fn(chain),
    maybeSingle: vi.fn(() => Promise.resolve(result)),
    single: vi.fn(() => Promise.resolve(result)),
    then: (resolve: (value: typeof result) => unknown) => resolve(result),
  });
  return builder;
}
