"use client";

import { useEffect } from "react";
import { useTranslations } from "next-intl";
import { SaaRulesHeroTiers } from "./saa-rules-hero-tiers";
import { SaaRulesIconGrid } from "./saa-rules-icon-grid";
import { SaaRulesNationalKudos } from "./saa-rules-national-kudos";

export interface SaaRulesModalProps {
  isOpen: boolean;
  onClose: () => void;
  onWriteKudos: () => void;
}

/**
 * "Thể lệ" (Rules) modal — MoMorph `3204:6051`, screen `b1Filzi9i6`.
 * Dark navy right-anchored panel (design width 553px) covering the Hero
 * badge tiers, the 6-icon collectible reward, and the "Kudos Quốc Dân"
 * award. Presentational only: copy resolves from the `Rules` i18n namespace
 * (vi/en) — no data derivation (see
 * `plans/260709-0813-kudos-hero-badges-rules-modal/clarifications.md`).
 */
export function SaaRulesModal({ isOpen, onClose, onWriteKudos }: SaaRulesModalProps) {
  const t = useTranslations("Rules");
  useEffect(() => {
    if (!isOpen) return;
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex justify-end bg-black/60"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="saa-rules-title"
        className="flex h-full w-full max-w-[553px] flex-col gap-10 overflow-y-auto bg-[#00070C] px-6 pt-6 pb-10 sm:px-10"
      >
        <div className="flex flex-1 flex-col gap-6">
          <h2
            id="saa-rules-title"
            className="text-3xl leading-[1.15] font-bold text-[#FFEA9E] sm:text-[45px] sm:leading-[52px]"
          >
            {t("title")}
          </h2>

          <div className="flex flex-col gap-4">
            <SaaRulesHeroTiers />
            <SaaRulesIconGrid />
            <SaaRulesNationalKudos />
          </div>
        </div>

        <div className="flex items-center gap-4">
          <button
            type="button"
            onClick={onClose}
            className="flex shrink-0 items-center gap-2 rounded border border-[#998C5F] bg-[#FFEA9E]/10 p-4 text-base leading-6 font-bold text-white transition-transform duration-200 ease-out hover:-translate-y-0.5"
          >
            <CloseIcon className="size-6" />
            {t("close")}
          </button>
          <button
            type="button"
            onClick={onWriteKudos}
            className="flex min-w-0 flex-1 items-center justify-center gap-2 rounded bg-[#FFEA9E] p-4 text-base leading-6 font-bold text-[#00101A] transition-transform duration-200 ease-out hover:-translate-y-0.5"
          >
            <PenIcon className="size-6" />
            {t("writeKudos")}
          </button>
        </div>
      </div>
    </div>
  );
}

function CloseIcon({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      className={className}
      fill="none"
      stroke="currentColor"
      strokeWidth="2.25"
      strokeLinecap="round"
      aria-hidden
    >
      <path d="M6 6l12 12M18 6 6 18" />
    </svg>
  );
}

function PenIcon({ className }: { className?: string }) {
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
      <path d="M12 20h9" />
      <path d="M16.5 3.5a2.12 2.12 0 0 1 3 3L7 19l-4 1 1-4Z" />
    </svg>
  );
}
