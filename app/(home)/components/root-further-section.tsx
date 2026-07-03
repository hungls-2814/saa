import { getTranslations } from "next-intl/server";

/**
 * Content block below the hero: small centered "ROOT"/"FURTHER" watermark
 * mark, three body paragraphs, and a centered English-proverb quote.
 *
 * Design node `Group 434` (the ROOT/FURTHER watermark) is 290x134 — a small
 * centered logotype. In the design, the mark is plain white text sitting
 * over the key-visual art as it fades out; the MoMorph media crop for this
 * node returns an opaque rectangle of the surrounding artwork rather than a
 * transparent glyph mask, which reads as a stray box against this section's
 * solid background — rendered here as plain text instead to match what the
 * design actually shows once the art has faded to solid dark.
 */
export async function RootFurtherSection() {
  const t = await getTranslations("Home.rootFurther");

  return (
    <section className="w-full px-6 py-16 sm:px-10 lg:px-36 lg:pt-[120px] lg:pb-0">
      <div className="mx-auto flex max-w-[1152px] flex-col items-center gap-8">
        <div
          aria-hidden
          className="select-none text-center text-2xl font-bold leading-none tracking-tight text-white sm:text-4xl"
        >
          ROOT
          <br />
          FURTHER
        </div>

        <p className="w-full whitespace-pre-line text-justify text-lg font-bold leading-8 text-white sm:text-2xl">
          {t("paragraph1")}
        </p>

        <blockquote className="mx-auto max-w-2xl text-center text-lg font-bold leading-8 text-white sm:text-xl">
          <p>{t("quote")}</p>
          <p className="mt-1 text-base font-normal text-white/80 sm:text-lg">
            {t("quoteSub")}
          </p>
        </blockquote>

        <p className="w-full whitespace-pre-line text-justify text-lg font-bold leading-8 text-white sm:text-2xl">
          {t("paragraph2")}
        </p>
      </div>
    </section>
  );
}
