import type { Metadata } from "next";
import { Suspense } from "react";
import { montserrat, montserratAlternates } from "./fonts";
import { LoginHeader } from "./components/login-header";
import { LoginHero } from "./components/login-hero";
import { LoginFooter } from "./components/login-footer";
import { LoginToast } from "./components/login-toast";

export const metadata: Metadata = {
  title: "Đăng nhập | Sun* Annual Awards 2025",
};

/**
 * SAA 2025 Login screen. Copy is localized via next-intl (VN/EN); the login
 * button runs the Supabase Google OAuth flow. Route guards live in proxy.ts.
 */
export default function LoginPage() {
  return (
    <div
      className={`${montserrat.variable} ${montserratAlternates.variable} relative flex min-h-screen w-full flex-col bg-[#00101A] font-[family-name:var(--font-montserrat)]`}
    >
      <Suspense fallback={null}>
        <LoginToast />
      </Suspense>
      <LoginHeader />
      <LoginHero />
      <LoginFooter />
    </div>
  );
}
