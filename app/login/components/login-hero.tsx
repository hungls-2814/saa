"use client";

import Image from "next/image";
import { useCallback, useState } from "react";
import { useTranslations } from "next-intl";
import { createClient } from "@/lib/supabase/client";
import { isSupabaseConfigured } from "@/lib/supabase/config";
import { LOGIN_ERROR_PATH } from "@/lib/auth/constants";
import { GoogleLoginButton } from "./google-login-button";

/**
 * Main hero section for the login screen (MoMorph GzbNeVGJHz). The key-visual
 * is the login design's OWN full-bleed art (`/login/login-keyvisual.png`, a
 * frame-render crop with the left text column pre-masked to solid #00101A) —
 * distinct from the homepage's right-side crop. Content (ROOT FURTHER wordmark,
 * intro copy, compact Google CTA) sits left over the dark-masked area.
 *
 * The button triggers the real Supabase Google OAuth flow. On a successful
 * call the browser redirects to Google, so the loading state is left on; a
 * failed call surfaces the error toast via the ?error query param.
 */
export function LoginHero() {
  const t = useTranslations("Login");
  const [loading, setLoading] = useState(false);

  const handleGoogleLogin = useCallback(async () => {
    // Not wired to a Supabase project yet — surface the error toast instead of
    // navigating to a broken OAuth URL.
    if (!isSupabaseConfigured()) {
      window.location.href = LOGIN_ERROR_PATH;
      return;
    }
    setLoading(true);
    const supabase = createClient();
    const { error } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: { redirectTo: `${window.location.origin}/auth/callback` },
    });
    if (error) {
      setLoading(false);
      window.location.href = LOGIN_ERROR_PATH;
    }
    // Success path: Supabase redirects the browser to Google — keep loading on.
  }, []);

  return (
    <section
      className="relative flex min-h-[845px] w-full items-start overflow-hidden bg-[#00101A] bg-cover bg-center bg-no-repeat px-6 pt-32 pb-24 sm:px-10 lg:px-36 lg:pt-[200px]"
      style={{ backgroundImage: "url(/login/login-keyvisual.png)" }}
    >
      <div className="relative z-[1] flex max-w-[520px] flex-col items-start gap-20">
        <Image
          src="/login/root-further-wordmark.png"
          alt="ROOT FURTHER"
          width={451}
          height={200}
          className="h-auto w-full max-w-[451px]"
          priority
          unoptimized
        />

        <div className="flex flex-col items-start gap-6 pl-1">
          <p className="max-w-[480px] text-xl leading-10 font-bold tracking-[0.5px] text-white">
            {t("subtitle")}
            <br />
            {t("tagline")}
          </p>

          <GoogleLoginButton
            onClick={handleGoogleLogin}
            loading={loading}
            label={t("cta")}
          />
        </div>
      </div>
    </section>
  );
}
