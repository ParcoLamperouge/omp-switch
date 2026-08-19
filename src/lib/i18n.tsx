import React, { createContext, useContext, useState } from "react";
import en from "../locales/en.json";
import zh from "../locales/zh.json";

export type Language = "zh" | "en";

export const translations: Record<Language, Record<string, string>> = {
  zh,
  en,
};

export type TranslationKey = keyof typeof zh;

interface I18nContextType {
  lang: Language;
  setLang: (lang: Language) => void;
  t: (key: TranslationKey, params?: Record<string, string | number>) => string;
}

const I18nContext = createContext<I18nContextType>({
  lang: "zh",
  setLang: () => {},
  t: (key) => zh[key] || String(key),
});

export function I18nProvider({ children }: { children: React.ReactNode }) {
  const [lang, setLangState] = useState<Language>(() => {
    const saved = localStorage.getItem("omp-switch-lang");
    if (saved === "en" || saved === "zh") return saved;
    return navigator.language.startsWith("zh") ? "zh" : "en";
  });

  function setLang(newLang: Language) {
    setLangState(newLang);
    localStorage.setItem("omp-switch-lang", newLang);
  }

  function t(key: TranslationKey, params?: Record<string, string | number>): string {
    let template = translations[lang]?.[key] || translations.zh[key] || String(key);
    if (params) {
      for (const [k, v] of Object.entries(params)) {
        template = template.replace(new RegExp(`\\{${k}\\}`, "g"), String(v));
      }
    }
    return template;
  }

  return (
    <I18nContext.Provider value={{ lang, setLang, t }}>
      {children}
    </I18nContext.Provider>
  );
}

export function useI18n() {
  return useContext(I18nContext);
}
