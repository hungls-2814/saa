import { Montserrat, Montserrat_Alternates } from "next/font/google";

// Design uses Montserrat for headings/body and Montserrat Alternates for the
// footer copyright line. Scoped to the login route so it doesn't affect the
// rest of the app.
export const montserrat = Montserrat({
  variable: "--font-montserrat",
  subsets: ["latin", "vietnamese"],
  weight: ["400", "500", "600", "700"],
});

export const montserratAlternates = Montserrat_Alternates({
  variable: "--font-montserrat-alternates",
  subsets: ["latin", "vietnamese"],
  weight: ["700"],
});
