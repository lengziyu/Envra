import { create } from "zustand";
import { persist } from "zustand/middleware";
import { zh } from "./zh";
import { en } from "./en";

export type Locale = "zh" | "en";
export type Translations = typeof zh;

const messages: Record<Locale, Translations> = { zh, en };

interface I18nState {
  locale: Locale;
  t: Translations;
  setLocale: (locale: Locale) => void;
}

export const useI18n = create<I18nState>()(
  persist(
    (set) => ({
      locale: "zh",
      t: messages["zh"],
      setLocale: (locale: Locale) =>
        set({ locale, t: messages[locale] }),
    }),
    {
      name: "envra-locale",
      partialize: (state) => ({ locale: state.locale }),
      onRehydrateStorage: () => (state) => {
        if (state) {
          state.t = messages[state.locale];
        }
      },
    }
  )
);
