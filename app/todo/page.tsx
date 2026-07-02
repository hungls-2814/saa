import { redirect } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { createClient } from "@/lib/supabase/server";
import { SignOutButton } from "./sign-out-button";

/**
 * Minimal protected landing page. proxy.ts already guards this route; the
 * getUser() check here is defense-in-depth. Real /todo feature is out of scope.
 */
export default async function TodoPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  const t = await getTranslations("Todo");

  return (
    <main className="flex min-h-screen flex-col items-center justify-center gap-6 bg-[#00101A] p-8 text-white">
      <h1 className="text-3xl font-bold">{t("title")}</h1>
      <p className="text-white/70">
        {t("signedInAs", { email: user.email ?? "" })}
      </p>
      <SignOutButton label={t("signOut")} />
    </main>
  );
}
