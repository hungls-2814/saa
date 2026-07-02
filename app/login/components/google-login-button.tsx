"use client";

import Image from "next/image";

export interface GoogleLoginButtonProps {
  /** Called when the user activates the button. Wired to Google OAuth by the integration layer. */
  onClick: () => void;
  /** Shows an inline spinner and disables the button while an auth request is in flight. */
  loading?: boolean;
  /** Disables the button regardless of loading state. */
  disabled?: boolean;
  /** Button label. Defaults to the Vietnamese copy from the design. */
  label?: string;
}

/**
 * Presentational "Login with Google" button.
 *
 * Design: pale-yellow fill (#FFEA9E), bold 22px label, 24px Google "G" icon,
 * 8px radius, hover elevation. No auth logic lives here — `onClick` is a
 * plain callback the integration layer wires to the real OAuth flow.
 */
export function GoogleLoginButton({
  onClick,
  loading = false,
  disabled = false,
  label = "LOGIN With Google",
}: GoogleLoginButtonProps) {
  const isDisabled = disabled || loading;

  return (
    <button
      type="button"
      onClick={onClick}
      disabled={isDisabled}
      aria-busy={loading}
      className="group flex items-center gap-2 rounded-lg bg-[#FFEA9E] px-6 py-4 shadow-[0_0_0_rgba(0,0,0,0)] transition-all duration-200 ease-out hover:-translate-y-0.5 hover:bg-[#FFF8E1] hover:shadow-lg disabled:cursor-not-allowed disabled:opacity-60 disabled:hover:translate-y-0 disabled:hover:shadow-none"
    >
      <span className="flex items-center gap-1">
        <span className="text-[22px] font-bold leading-7 tracking-normal text-[#00101A]">
          {label}
        </span>
      </span>
      {loading ? (
        <span
          role="status"
          aria-label="Loading"
          className="size-6 shrink-0 animate-spin rounded-full border-2 border-[#00101A]/30 border-t-[#00101A]"
        />
      ) : (
        <Image
          src="/login/icons/google.png"
          alt=""
          width={24}
          height={24}
          className="size-6 shrink-0"
        />
      )}
    </button>
  );
}
