/**
 * Shared auth constants (client- and server-safe — no imports).
 * Single source for the OAuth-failure signalling used by the callback route,
 * the login button, and the toast.
 */
export const AUTH_CALLBACK_ERROR = "auth_callback_failed";
export const LOGIN_ERROR_PATH = `/login?error=${AUTH_CALLBACK_ERROR}`;
