import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { NextIntlClientProvider } from "next-intl";
import { getLocale } from "next-intl/server";
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

  return (
    <html
      lang={locale}
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
      // Browser extensions commonly mutate <html> attributes before React
      // hydrates; suppress the resulting benign attribute-mismatch warning.
      suppressHydrationWarning
    >
      <body className="min-h-full flex flex-col">
        {/* NextIntlClientProvider auto-infers locale + messages from the request config. */}
        <NextIntlClientProvider>{children}</NextIntlClientProvider>
      </body>
    </html>
  );
}
