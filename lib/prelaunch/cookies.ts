/**
 * Cookie names for the prelaunch page's two access mechanisms. Shared by the
 * route guard (`proxy.ts`) and the page (`app/prelaunch/`) so a rename can
 * never desync the writer from the reader.
 */

/**
 * Reviewer preview bypass. Set by `?preview=1`; while present the launch gate
 * is bypassed. Auto-enabled only OUTSIDE production, but the manual `?preview=1`
 * opt-in works in every environment (an accepted, deliberate escape hatch).
 */
export const PREVIEW_COOKIE = "saa_preview";

/**
 * First-visit intro splash "already seen" marker (session-scoped). Set the
 * first time a visitor is routed through the intro after launch, so the splash
 * plays once per browsing session rather than on every navigation.
 */
export const INTRO_COOKIE = "saa_intro_seen";
