"use client";

import { useEffect, useRef, useState } from "react";
import { useTranslations } from "next-intl";

/**
 * Fixed bottom-right Floating Action Button (MoMorph _hphd32jN2 / Sv7DFwBw1h).
 * Collapsed = a cream pill (pen `/` Sun-mark). Expanded = cream action pills
 * ("Thể lệ" · "Viết KUDOS") stacked above a red ✕ close button. "Viết KUDOS"
 * opens the compose-Kudos modal via `onWriteKudos`; "Thể lệ" is still a stub.
 */
export interface WidgetButtonProps {
  onWriteKudos?: () => void;
}

export function WidgetButton({ onWriteKudos }: WidgetButtonProps) {
  const t = useTranslations("Home.widget");
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") setOpen(false);
    }
    function handleClickOutside(e: MouseEvent) {
      if (!containerRef.current?.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("keydown", handleKeyDown);
    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("keydown", handleKeyDown);
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [open]);

  return (
    <div ref={containerRef} className="fixed bottom-8 right-5 z-30 flex flex-col items-end gap-3">
      {open && (
        <div role="menu" aria-label={t("label")} className="flex flex-col items-end gap-3">
          <ActionPill onClick={() => setOpen(false)} icon={<KudosMarkIcon className="size-6 text-[#D4271D]" />}>
            {t("saaRules")}
          </ActionPill>
          <ActionPill
            onClick={() => {
              setOpen(false);
              onWriteKudos?.();
            }}
            icon={<PenIcon className="size-6 text-[#00101A]" />}
          >
            {t("writeKudos")}
          </ActionPill>
        </div>
      )}

      {open ? (
        <button
          type="button"
          onClick={() => setOpen(false)}
          aria-label={t("close")}
          className="flex size-14 items-center justify-center rounded-full bg-[#D4271D] text-white shadow-[0_4px_4px_rgba(0,0,0,0.25)] transition-transform duration-200 ease-out hover:-translate-y-0.5"
        >
          <CloseIcon className="size-6" />
        </button>
      ) : (
        <button
          type="button"
          onClick={() => setOpen(true)}
          aria-haspopup="true"
          aria-expanded={false}
          aria-label={t("label")}
          className="flex h-16 w-[106px] items-center justify-center gap-2 rounded-full bg-[#FFEA9E] px-4 shadow-[0_4px_4px_rgba(0,0,0,0.25),0_0_6px_#FAE287] transition-transform duration-200 ease-out hover:-translate-y-0.5"
        >
          <PenIcon className="size-6 text-[#00101A]" />
          <span className="text-2xl font-bold text-[#00101A]">/</span>
          <KudosMarkIcon className="size-6 text-[#00101A]" />
        </button>
      )}
    </div>
  );
}

function ActionPill({
  children,
  icon,
  onClick,
}: {
  children: React.ReactNode;
  icon: React.ReactNode;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      role="menuitem"
      onClick={onClick}
      className="flex items-center gap-2 rounded-2xl bg-[#FFF3D5] px-6 py-3 text-lg font-bold text-[#00101A] shadow-[0_4px_4px_rgba(0,0,0,0.25)] transition-transform duration-200 ease-out hover:-translate-y-0.5"
    >
      {icon}
      {children}
    </button>
  );
}

function PenIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={className} fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <path d="M12 20h9" />
      <path d="M16.5 3.5a2.12 2.12 0 0 1 3 3L7 19l-4 1 1-4Z" />
    </svg>
  );
}

function KudosMarkIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={className} fill="currentColor" aria-hidden>
      <path d="M12 2 2 7v10l10 5 10-5V7Zm0 4.5 5.5 2.75L12 12l-5.5-2.75Z" />
    </svg>
  );
}

function CloseIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={className} fill="none" stroke="currentColor" strokeWidth="2.25" strokeLinecap="round" aria-hidden>
      <path d="M6 6l12 12M18 6 6 18" />
    </svg>
  );
}
