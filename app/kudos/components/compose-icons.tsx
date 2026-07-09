/**
 * Icon set specific to the Compose-Kudos modal's rich-text toolbar, hashtag
 * "+" button, and remove ("x") affordances. Kept in a separate file from
 * `icons.tsx` (rather than growing that file past the 200-line budget) but
 * following the exact same convention: 24x24 viewBox, `currentColor`
 * stroke, `aria-hidden` (the parent button always carries the accessible
 * label).
 */

import type { IconProps } from "./icons";

export function BoldIcon({ className }: IconProps) {
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
      <path d="M6 4h8a4 4 0 0 1 0 8H6Z" />
      <path d="M6 12h9a4 4 0 0 1 0 8H6Z" />
    </svg>
  );
}

export function ItalicIcon({ className }: IconProps) {
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
      <path d="M19 4h-9M14 20H5M15 4 9 20" />
    </svg>
  );
}

export function StrikethroughIcon({ className }: IconProps) {
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
      <path d="M16 4H9a3 3 0 0 0-2.83 4" />
      <path d="M14 12a4 4 0 0 1 0 8H6" />
      <path d="M4 12h16" />
    </svg>
  );
}

export function NumberedListIcon({ className }: IconProps) {
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
      <path d="M10 6h11M10 12h11M10 18h11" />
      <path d="M4 6h1v4M4 10h2M4 18h3c0-1-3-1.5-3-3s1-1.5 2-1.5" />
    </svg>
  );
}

export function QuoteIcon({ className }: IconProps) {
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
      <path d="M7 15c2.5 0 3-1.5 3-4V6H5v5h3c0 2-1 3-3 3z" />
      <path d="M17 15c2.5 0 3-1.5 3-4V6h-5v5h3c0 2-1 3-3 3z" />
    </svg>
  );
}

export function PlusIcon({ className }: IconProps) {
  return (
    <svg
      viewBox="0 0 24 24"
      className={className}
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
    >
      <path d="M12 5v14M5 12h14" />
    </svg>
  );
}

export function CloseIcon({ className }: IconProps) {
  return (
    <svg
      viewBox="0 0 24 24"
      className={className}
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
    >
      <path d="M6 6l12 12M18 6 6 18" />
    </svg>
  );
}
