/**
 * Small gold line icons used throughout the award detail sections and
 * sidebar (target = award name, diamond = quantity, license = prize value).
 * The MoMorph design reuses one shared "info bullet" icon set across every
 * category, so these are implemented once here rather than per-section.
 */
export function TargetIcon({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      className={className}
      fill="none"
      stroke="currentColor"
      strokeWidth="1.75"
      aria-hidden
    >
      <circle cx="12" cy="12" r="8" />
      <circle cx="12" cy="12" r="4" />
      <circle cx="12" cy="12" r="0.5" fill="currentColor" />
    </svg>
  );
}

export function DiamondIcon({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      className={className}
      fill="none"
      stroke="currentColor"
      strokeWidth="1.75"
      strokeLinejoin="round"
      aria-hidden
    >
      <path d="M4 9h16l-8 11z" />
      <path d="M4 9 8 4h8l4 5" />
    </svg>
  );
}

export function LicenseIcon({ className }: { className?: string }) {
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
      <rect x="3" y="5" width="18" height="14" rx="2" />
      <circle cx="9" cy="12" r="2.25" />
      <path d="M14 10h4M14 14h4" />
    </svg>
  );
}
