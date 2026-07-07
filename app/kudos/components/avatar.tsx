"use client";

import { useState } from "react";
import { initialsOf } from "./render-helpers";

export interface AvatarProps {
  /** Full name — used both for the initials fallback and as a key so a new
   * `avatarUrl` (e.g. a re-render for a different person) resets any prior
   * image-load error. */
  name: string;
  /** Photo URL, or `""` to render the initials fallback directly (no
   * invented stock photo per the MoMorph mock-data convention). */
  avatarUrl: string;
  /** Circle diameter + border, e.g. `"size-16"` (FR1/FR6 avatar treatment). */
  sizeClassName?: string;
  /** Font size for the initials fallback glyph. */
  textSizeClassName?: string;
}

/**
 * Shared avatar renderer for the Kudos board (FR1 sender/receiver identity,
 * FR6 gift recipients): renders the real photo when `avatarUrl` is set,
 * falling back to an initials circle when it's empty OR the image fails to
 * load (broken/expired URL). The nearby name text is always the accessible
 * label, so the image itself is decorative (`alt=""`).
 */
export function Avatar({
  name,
  avatarUrl,
  sizeClassName = "size-16",
  textSizeClassName = "text-lg",
}: AvatarProps) {
  const [errored, setErrored] = useState(false);

  if (avatarUrl && !errored) {
    return (
      <img
        src={avatarUrl}
        alt=""
        onError={() => setErrored(true)}
        className={`${sizeClassName} shrink-0 rounded-full border-[1.87px] border-white object-cover`}
      />
    );
  }

  return (
    <span
      aria-hidden
      className={`flex ${sizeClassName} shrink-0 items-center justify-center rounded-full border-[1.87px] border-white bg-[#EEE] ${textSizeClassName} font-bold text-[#00101A]`}
    >
      {initialsOf(name)}
    </span>
  );
}
