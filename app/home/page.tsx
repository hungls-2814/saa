import { redirect } from "next/navigation";

/**
 * Convenience alias. The homepage canonically lives at "/"; anyone landing on
 * /home (an older link or a typed URL) is sent to the root homepage.
 */
export default function HomeAlias() {
  redirect("/");
}
