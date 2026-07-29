import i18n from "i18next";
import * as middleware from "i18next-http-middleware";
import en from "./en";
import fr from "./fr";

const resources = {
  en: { translation: en },
  fr: { translation: fr },
};

i18n
  .use(middleware.LanguageDetector)
  .init({
    resources,
    fallbackLng: "en",
    interpolation: { escapeValue: false },
    detection: {
      order: ["querystring", "header"], // detect ?lang= or Accept-Language
      lookupQuerystring: "lang",
      convertDetectedLanguage: (lng: string) => lng.toLowerCase(),
    },
  });

export default i18n;
