"use client";

import type { ComponentType } from "react";
import { useTranslations } from "next-intl";
import type { ComposeFormatAction } from "@/lib/kudos/markdown-format";
import { LinkIcon } from "./icons";
import {
  BoldIcon,
  ItalicIcon,
  NumberedListIcon,
  QuoteIcon,
  StrikethroughIcon,
} from "./compose-icons";

// `ComposeFormatAction` is defined in `@/lib/kudos/markdown-format` (the pure
// formatter that consumes it); re-exported here so existing UI importers keep
// their `./compose-toolbar` import path.
export type { ComposeFormatAction };

const TOOLBAR_BUTTONS: {
  action: ComposeFormatAction;
  labelKey: string;
  Icon: ComponentType<{ className?: string }>;
}[] = [
  { action: "bold", labelKey: "toolbar.bold", Icon: BoldIcon },
  { action: "italic", labelKey: "toolbar.italic", Icon: ItalicIcon },
  { action: "strikethrough", labelKey: "toolbar.strike", Icon: StrikethroughIcon },
  { action: "numbered-list", labelKey: "toolbar.list", Icon: NumberedListIcon },
  { action: "link", labelKey: "toolbar.link", Icon: LinkIcon },
  { action: "quote", labelKey: "toolbar.quote", Icon: QuoteIcon },
];

export function ComposeToolbar({
  onFormat,
  onOpenGuidelines,
}: {
  onFormat: (action: ComposeFormatAction) => void;
  onOpenGuidelines?: () => void;
}) {
  const t = useTranslations("ComposeKudos");
  return (
    // `overflow-x-auto` lets the button row scroll internally on narrow
    // viewports instead of forcing the whole modal wider than the screen —
    // the buttons themselves don't shrink below their icon+padding size.
    <div className="flex h-10 w-full items-stretch justify-between overflow-x-auto rounded-t-lg border border-[#998C5F]">
      <div className="flex h-full items-stretch">
        {TOOLBAR_BUTTONS.map(({ action, labelKey, Icon }) => (
          <button
            key={action}
            type="button"
            aria-label={t(labelKey)}
            onClick={() => onFormat(action)}
            className="flex shrink-0 items-center justify-center border-r border-[#998C5F] px-4 text-[#00101A] transition-colors duration-200 ease-out first:rounded-tl-lg hover:bg-black/5"
          >
            <Icon className="size-6" />
          </button>
        ))}
      </div>
      <button
        type="button"
        onClick={() => onOpenGuidelines?.()}
        className="flex h-full shrink-0 items-center border-l border-[#998C5F] px-4 text-base font-bold tracking-[0.15px] text-[#D4271D] underline decoration-1 underline-offset-2"
      >
        {t("communityStandard")}
      </button>
    </div>
  );
}
