"use client";

import { useState } from "react";
import { ComposeKudosContainer } from "@/app/kudos/components/compose-kudos-container";
import { WidgetButton } from "./widget-button";
import { SaaRulesModal } from "./saa-rules-modal";

/**
 * Homepage client boundary tying the Floating Action Button to its two modals:
 * the FAB's "Viết KUDOS" opens `ComposeKudosContainer`; "Thể lệ" opens
 * `SaaRulesModal`, whose own "Viết KUDOS" hands off to compose. Split from the
 * server `HomePage` so the page stays a Server Component that reads the session
 * and passes the user id down.
 */
export function HomeComposeWidget({ currentUserId }: { currentUserId: string | null }) {
  const [composeOpen, setComposeOpen] = useState(false);
  const [rulesOpen, setRulesOpen] = useState(false);
  return (
    <>
      <WidgetButton
        onWriteKudos={() => setComposeOpen(true)}
        onOpenRules={() => setRulesOpen(true)}
      />
      <SaaRulesModal
        isOpen={rulesOpen}
        onClose={() => setRulesOpen(false)}
        onWriteKudos={() => {
          setRulesOpen(false);
          setComposeOpen(true);
        }}
      />
      <ComposeKudosContainer
        isOpen={composeOpen}
        onClose={() => setComposeOpen(false)}
        currentUserId={currentUserId}
      />
    </>
  );
}
