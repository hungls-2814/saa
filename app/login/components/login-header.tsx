import Image from "next/image";
import { LanguageSelector } from "@/app/components/language-selector";

/**
 * Fixed top header: Sun* Annual Awards 2025 logo (left) + language selector (right).
 * Design: 80px tall, semi-transparent dark background (rgba(11,15,18,0.8)).
 */
export function LoginHeader() {
  return (
    <header className="absolute inset-x-0 top-0 z-10 flex h-20 items-center justify-between bg-[rgba(11,15,18,0.8)] px-6 py-3 sm:px-10 lg:px-36">
      <Image
        src="/login/logo.png"
        alt="Sun* Annual Awards 2025"
        width={52}
        height={56}
        className="h-14 w-[52px] object-contain"
        priority
      />
      <LanguageSelector />
    </header>
  );
}
