import { Montserrat } from "next/font/google";

// Design uses Montserrat for the title/labels, mirroring the per-route font
// setup used by (home) and login.
export const montserrat = Montserrat({
  variable: "--font-montserrat",
  subsets: ["latin", "vietnamese"],
  weight: ["400", "700"],
});
