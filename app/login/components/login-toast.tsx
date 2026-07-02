"use client";

import { useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useTranslations } from "next-intl";
import { AUTH_CALLBACK_ERROR } from "@/lib/auth/constants";

/**
 * Shows a dismissible error toast when the OAuth flow bounces back with
 * ?error=auth_callback_failed. Cleans the URL so a refresh won't re-fire it.
 * Rendered inside a <Suspense> boundary because it reads search params.
 */
export function LoginToast() {
  const t = useTranslations("Login");
  const router = useRouter();
  const params = useSearchParams();
  const hasError = params.get("error") === AUTH_CALLBACK_ERROR;
  // Latch the initial value: the effect cleans the URL (hasError -> false),
  // so visibility must not be derived from the live param.
  const [visible, setVisible] = useState(hasError);

  useEffect(() => {
    if (!hasError) return;
    router.replace("/login"); // external sync — drop the error param
    const timer = window.setTimeout(() => setVisible(false), 5000);
    return () => window.clearTimeout(timer);
  }, [hasError, router]);

  if (!visible) return null;

  return (
    <div
      role="alert"
      className="fixed left-1/2 top-6 z-50 flex -translate-x-1/2 items-center gap-3 rounded-lg border border-red-400/30 bg-[#2A1416] px-5 py-3 text-sm font-semibold text-red-100 shadow-xl"
    >
      <span>{t("errorToast")}</span>
      <button
        type="button"
        onClick={() => setVisible(false)}
        aria-label="Close"
        className="text-red-200/70 transition-colors hover:text-white"
      >
        ✕
      </button>
    </div>
  );
}
