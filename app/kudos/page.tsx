import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { isSupabaseConfigured } from "@/lib/supabase/config";
import { montserrat, montserratAlternates } from "@/app/(home)/fonts";
import { SiteHeader } from "@/app/(home)/components/site-header";
import { SiteFooter } from "@/app/(home)/components/site-footer";
import { getBoardData } from "@/lib/kudos/queries";
import type { BoardData } from "@/lib/kudos/types";
import { KudosBoardContainer } from "./components/kudos-board-container";

export const metadata: Metadata = {
  title: "Kudos - Sun* Annual Awards 2025",
};

/** Rendered when `getBoardData` fails (Integration Phase 06, accepted scope
 * gap: no `error.tsx`) — the shell still renders so the header/footer/nav
 * stay usable; the client container's own action calls surface their own
 * toast on failure. */
const EMPTY_BOARD_DATA: BoardData = {
  highlights: [],
  feed: [],
  feedNextCursor: null,
  spotlight: { totalKudos: 0, nodes: [] },
  stats: { kudosReceived: 0, kudosSent: 0, heartsReceived: 0, secretBoxOpened: 0, secretBoxUnopened: 0 },
  gifts: [],
  hashtags: [],
  departments: [],
};

/**
 * Sun* Kudos Live board (`/kudos`). Auth-gated (proxy + this defense-in-depth
 * guard, mirroring `he-thong-giai/page.tsx`). Fetches the SSR `BoardData`
 * once and hands it to the client container, which owns all subsequent
 * filter/like/load-more interaction against the Phase-02/03 query + action
 * layer.
 */
export default async function KudosPage() {
  const user = isSupabaseConfigured()
    ? (await (await createClient()).auth.getUser()).data.user
    : null;

  if (!user) {
    redirect("/login");
  }

  let boardData: BoardData;
  try {
    boardData = await getBoardData(user.id);
  } catch {
    boardData = EMPTY_BOARD_DATA;
  }

  return (
    <div
      className={`${montserrat.variable} ${montserratAlternates.variable} relative flex min-h-screen w-full flex-col bg-[#00101A] font-[family-name:var(--font-montserrat)]`}
    >
      <SiteHeader user={user} active="kudos" />
      <main className="relative flex flex-1 flex-col">
        <KudosBoardContainer initialData={boardData} currentUserId={user.id} />
      </main>
      <SiteFooter />
    </div>
  );
}
