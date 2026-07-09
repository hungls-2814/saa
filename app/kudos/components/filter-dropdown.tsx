"use client";

import { useEffect, useRef, useState } from "react";
import { ChevronDownIcon } from "./icons";

export interface FilterOption {
  id: string;
  label: string;
}

/**
 * Single-select filter dropdown (Hashtag / Phòng ban pills, FR4). Follows
 * the same open/close + outside-click + Escape pattern as the header's
 * `AccountMenu`/`NotificationButton` for a consistent interaction model.
 */
export function FilterDropdown({
  label,
  allLabel,
  options,
  selectedId,
  onChange,
}: {
  label: string;
  /** Option shown at the top of the list that clears the filter. */
  allLabel: string;
  options: FilterOption[];
  selectedId?: string;
  onChange: (id: string | undefined) => void;
}) {
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") setOpen(false);
    }
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [open]);

  const selected = options.find((o) => o.id === selectedId);

  // Design (Dropdown Phòng ban WXK5AYB_rG): centered rows; the active row sits
  // in a raised, faintly gold-ringed box, others reveal it only on hover.
  const optionClass = (isSelected: boolean) =>
    `w-full rounded px-4 py-3 text-center text-sm font-bold text-white transition-colors duration-150 ${
      isSelected
        ? "bg-[rgba(255,234,158,0.15)] ring-1 ring-[#FFEA9E]/40"
        : "hover:bg-[rgba(255,234,158,0.1)]"
    }`;

  return (
    <div className="relative" ref={rootRef}>
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-haspopup="listbox"
        aria-expanded={open}
        className="flex items-center gap-2 rounded border border-[#998C5F] bg-[rgba(255,234,158,0.1)] px-4 py-4 text-base font-bold text-white transition-colors duration-200 ease-out hover:bg-[rgba(255,234,158,0.2)]"
      >
        {selected ? selected.label : label}
        <ChevronDownIcon className="size-6" />
      </button>

      {open && (
        <>
          <div
            className="fixed inset-0 z-10"
            aria-hidden
            onClick={() => setOpen(false)}
          />
          <ul
            role="listbox"
            aria-label={label}
            className="absolute left-0 top-full z-20 mt-2 flex max-h-64 min-w-[200px] flex-col gap-1 overflow-auto rounded-lg border border-[#998C5F] bg-[#00070C] p-1.5 shadow-xl"
          >
            <li role="none">
              <button
                type="button"
                role="option"
                aria-selected={!selectedId}
                onClick={() => {
                  onChange(undefined);
                  setOpen(false);
                }}
                className={optionClass(!selectedId)}
              >
                {allLabel}
              </button>
            </li>
            {options.map((option) => (
              <li key={option.id} role="none">
                <button
                  type="button"
                  role="option"
                  aria-selected={option.id === selectedId}
                  onClick={() => {
                    onChange(option.id);
                    setOpen(false);
                  }}
                  className={optionClass(option.id === selectedId)}
                >
                  {option.label}
                </button>
              </li>
            ))}
          </ul>
        </>
      )}
    </div>
  );
}
