import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { cookies } from "next/headers";
import { NextIntlClientProvider } from "next-intl";
import { getLocale } from "next-intl/server";
import { PREVIEW_COOKIE } from "@/lib/prelaunch/cookies";
import { IntroGate } from "./components/intro-gate";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Sun* Annual Awards 2025",
  description: "SAA 2025",
};

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  // Locale is resolved from the NEXT_LOCALE cookie via i18n/request.ts.
  const locale = await getLocale();
  // Reviewer preview: read the httpOnly cookie server-side (client JS cannot)
  // so IntroGate can exempt reviewers from the forced intro splash.
  const previewActive =
    (await cookies()).get(PREVIEW_COOKIE)?.value === "1";

  return (
    <html
      lang={locale}
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
      // Browser extensions commonly mutate <html> attributes before React
      // hydrates; suppress the resulting benign attribute-mismatch warning.
      suppressHydrationWarning
    >
      <body className="min-h-full flex flex-col overflow-x-hidden">
        {/* NextIntlClientProvider auto-infers locale + messages from the request config. */}
        <NextIntlClientProvider>
          {/* Tab-scoped first-visit intro gate on `/` (see IntroGate). */}
          <IntroGate previewActive={previewActive} />
          {children}
        </NextIntlClientProvider>
      </body>
    </html>
  );
}
