/**
 * Board-control icons (Spotlight resize toggle, Secret Box stub button) —
 * split out of `icons.tsx` to keep each icon file under ~200 lines.
 */
import type { IconProps } from "./icons";

/** Design's Spotlight-board corner control (`B.7.2_Pan zoom`): a single
 * diagonal double-arrow glyph, not a magnifying-glass zoom icon — it toggles
 * the board panel between a compact and an expanded SIZE, it doesn't scale
 * the content. Shown when compact (next action: expand). */
export function ExpandIcon({ className }: IconProps) {
  return (
    <svg
      viewBox="0 0 24 24"
      className={className}
      fill="none"
      stroke="currentColor"
      strokeWidth="1.75"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
    >
      <path d="M15 3h6v6" />
      <path d="M9 21H3v-6" />
      <path d="M21 3l-7 7" />
      <path d="M3 21l7-7" />
    </svg>
  );
}

/** Same corner control, shown when expanded (next action: collapse). */
export function CollapseIcon({ className }: IconProps) {
  return (
    <svg
      viewBox="0 0 24 24"
      className={className}
      fill="none"
      stroke="currentColor"
      strokeWidth="1.75"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
    >
      <path d="M4 14h6v6" />
      <path d="M20 10h-6V4" />
      <path d="M14 10l7-7" />
      <path d="M3 21l7-7" />
    </svg>
  );
}

/** Design's `D.1.8_Button mở quà` gift-box glyph, next to the "Mở Secret Box" stub button. */
export function GiftIcon({ className }: IconProps) {
  return (
    <svg
      viewBox="0 0 24 24"
      className={className}
      fill="none"
      stroke="currentColor"
      strokeWidth="1.75"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
    >
      <rect x="3" y="9" width="18" height="4" />
      <path d="M5 13h14v7a1 1 0 0 1-1 1H6a1 1 0 0 1-1-1v-7Z" />
      <path d="M12 9v12" />
      <path d="M12 9C10.5 5 7 5 6.5 6.5S8 9 12 9Z" />
      <path d="M12 9c1.5-4 5-4 5.5-2.5S16 9 12 9Z" />
    </svg>
  );
}
