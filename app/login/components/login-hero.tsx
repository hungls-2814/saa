"use client";

import Image from "next/image";
import { useCallback, useState } from "react";
import { useTranslations } from "next-intl";
import { createClient } from "@/lib/supabase/client";
import { isSupabaseConfigured } from "@/lib/supabase/config";
import { LOGIN_ERROR_PATH } from "@/lib/auth/constants";
import { GoogleLoginButton } from "./google-login-button";

/**
 * Main hero section: abstract wave visual as background, ROOT FURTHER
 * wordmark, intro copy, and the Google login CTA.
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
      className="relative flex min-h-[845px] w-full items-center overflow-hidden bg-[#00101A] bg-cover bg-right px-6 py-24 sm:px-10 lg:px-36"
      style={{ backgroundImage: "url(/login/hero-wave.png)" }}
    >
      {/* Left-to-right dark fade so text stays legible over the wave art */}
      <div
        className="pointer-events-none absolute inset-0"
        style={{
          background:
            "linear-gradient(90deg, #00101A 0%, #00101A 25.41%, rgba(0,16,26,0) 100%)",
        }}
      />
      {/* Bottom-to-top dark fade matching the design's Cover layer */}
      <div
        className="pointer-events-none absolute inset-0"
        style={{
          background:
            "linear-gradient(0deg, #00101A 22.48%, rgba(0,19,32,0) 51.74%)",
        }}
      />

      <div className="relative z-[1] flex max-w-3xl flex-col gap-20">
        <Image
          src="/login/root-further-logo.png"
          alt="ROOT FURTHER"
          width={451}
          height={200}
          className="h-auto w-full max-w-[451px]"
          priority
        />

        <div className="flex flex-col gap-6 pl-4">
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
