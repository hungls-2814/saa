"use client";

import { useState } from "react";
import { ComposeKudosContainer } from "@/app/kudos/components/compose-kudos-container";
import { WidgetButton } from "./widget-button";

/**
 * Homepage client boundary tying the Floating Action Button to the compose
 * modal: the FAB's "Viết KUDOS" action opens `ComposeKudosContainer`. Split
 * from the server `HomePage` so the page stays a Server Component that reads
 * the session and passes the user id down.
 */
export function HomeComposeWidget({ currentUserId }: { currentUserId: string | null }) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <WidgetButton onWriteKudos={() => setOpen(true)} />
      <ComposeKudosContainer isOpen={open} onClose={() => setOpen(false)} currentUserId={currentUserId} />
    </>
  );
}
