import { useTranslations } from "next-intl";

/**
 * "KUDOS QUỐC DÂN" section (MoMorph `3204:6090` / `3204:6091`, screen
 * `b1Filzi9i6`). Single heading + reward blurb; copy resolves from the
 * `Rules` i18n namespace.
 */
export function SaaRulesNationalKudos() {
  const t = useTranslations("Rules");
  return (
    <div className="flex flex-col gap-4">
      <h3 className="text-lg leading-8 font-bold text-[#FFEA9E] sm:text-2xl sm:leading-8">
        {t("nationalHeading")}
      </h3>
      <p className="text-base leading-6 font-bold tracking-[0.5px] text-white">
        {t("nationalBlurb")}
      </p>
    </div>
  );
}
