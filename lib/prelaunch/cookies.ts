/**
 * Shared constants for the prelaunch page's access mechanisms, so a rename can
 * never desync the writer from the reader across the guard, page, and client
 * components.
 */

/**
 * Reviewer preview bypass. Set by `?preview=1`; while present the launch gate
 * is bypassed. Auto-enabled by the PRELAUNCH_AUTO_PREVIEW flag, but the manual
 * `?preview=1` opt-in works in every environment (an accepted, deliberate
 * escape hatch). Shared between `proxy.ts` and `app/prelaunch/page.tsx`.
 */
export const PREVIEW_COOKIE = "saa_preview";

/**
 * First-visit intro splash "already seen" marker. Stored in `sessionStorage`
 * (NOT a cookie) so it is scoped to a single browser TAB and cleared when that
 * tab closes — a fresh/reopened tab replays the intro. Read by `IntroGate` (to
 * decide whether to redirect `/` -> `/prelaunch`) and set by the prelaunch
 * countdown when the splash finishes.
 */
export const INTRO_STORAGE_KEY = "saa_intro_done";
