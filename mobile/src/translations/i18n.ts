import i18n from "i18next";
import { initReactI18next } from "react-i18next";
import { getLocales } from "expo-localization";
import AsyncStorage from "@react-native-async-storage/async-storage";
import en from "./en.json";
import rw from "./rw.json";

const STORAGE_KEY = "@yourdrive/lang";

function pickInitial(): "en" | "rw" {
  const deviceLanguage = getLocales()[0]?.languageCode ?? "en";
  return deviceLanguage === "rw" ? "rw" : "en";
}

i18n.use(initReactI18next).init({
  resources: { en: { translation: en }, rw: { translation: rw } },
  lng: pickInitial(),
  fallbackLng: "en",
  interpolation: { escapeValue: false },
});

// Override with the persisted preference once loaded.
AsyncStorage.getItem(STORAGE_KEY).then((stored) => {
  if (stored === "en" || stored === "rw") {
    if (i18n.language !== stored) i18n.changeLanguage(stored);
  }
});

export async function setLanguage(lang: "en" | "rw") {
  await AsyncStorage.setItem(STORAGE_KEY, lang);
  await i18n.changeLanguage(lang);
}

export default i18n;
