"use client";

import { useEffect } from "react";
import { usePathname, useRouter } from "next/navigation";
import { INTRO_STORAGE_KEY } from "@/lib/prelaunch/cookies";

/**
 * First-visit intro gate (client, tab-scoped). On the home route `/`, if this
 * browser TAB has not yet seen the intro this session, redirect to the
 * prelaunch splash. The "seen" flag lives in `sessionStorage` — scoped to one
 * tab and cleared when the tab closes — so every fresh or reopened tab replays
 * the intro, which a cookie could not achieve (cookies are shared across tabs
 * and survive a tab close).
 *
 * Only `/` is gated: deep links and auth routes are never hijacked. Before
 * launch the server already funnels `/` to `/prelaunch`, so this effectively
 * runs after launch. `previewActive` (read server-side from the httpOnly
 * preview cookie, since client JS cannot) exempts reviewers so the intro never
 * hijacks the preview-bypass workflow. The prelaunch splash sets
 * `INTRO_STORAGE_KEY` when it finishes, so the redirect back to `/` does not
 * bounce here again. Renders nothing.
 */
export function IntroGate({ previewActive = false }: { previewActive?: boolean }) {
  const pathname = usePathname();
  const router = useRouter();

  useEffect(() => {
    if (previewActive) return; // reviewer in preview mode — never force the intro
    if (pathname !== "/") return;
    let seen = false;
    try {
      seen = sessionStorage.getItem(INTRO_STORAGE_KEY) === "1";
    } catch {
      // sessionStorage unavailable (privacy mode) — skip the intro rather than
      // trap the visitor on a splash they can never clear.
      seen = true;
    }
    if (!seen) router.replace("/prelaunch");
  }, [previewActive, pathname, router]);

  return null;
}
