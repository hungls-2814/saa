import { signOut } from "@/lib/auth/sign-out";

/**
 * Sign-out button — submits to the signOut Server Action, which clears the
 * Supabase session server-side and redirects to /login.
 */
export function SignOutButton({ label }: { label: string }) {
  return (
    <form action={signOut}>
      <button
        type="submit"
        className="rounded-lg bg-[#FFEA9E] px-6 py-3 font-bold text-[#00101A] transition-colors hover:bg-[#FFF8E1]"
      >
        {label}
      </button>
    </form>
  );
}
