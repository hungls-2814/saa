import type { ReactNode } from "react";

/**
 * Shared "Sun* Annual Awards 2025" eyebrow + divider + big title row reused
 * by the Highlight, Spotlight, and All-Kudos sections (identical styling in
 * the design across all three: `B.1_header` / `B.6_Header` / `C.1_Header`).
 */
export function SectionHeader({
  eyebrow,
  title,
  actions,
}: {
  eyebrow: string;
  title: string;
  actions?: ReactNode;
}) {
  return (
    <div className="flex w-full flex-col gap-4">
      <p className="text-2xl font-bold leading-8 text-white">{eyebrow}</p>
      <hr className="border-t border-[#2E3940]" />
      <div className="flex flex-wrap items-center justify-between gap-4">
        <h2 className="text-[32px] font-bold leading-[40px] tracking-[-0.25px] text-[#FFEA9E] sm:text-[57px] sm:leading-[64px]">
          {title}
        </h2>
        {actions}
      </div>
    </div>
  );
}
