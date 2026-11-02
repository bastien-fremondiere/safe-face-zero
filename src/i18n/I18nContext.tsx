import React, { createContext, useContext, useState, useEffect, useCallback, useMemo } from 'react';
import { SupportedLanguage, SUPPORTED_LANGUAGES, TranslationParams, LanguageOption } from './types';
import { fr } from './locales/fr';
import { en } from './locales/en';
import { es } from './locales/es';
import { de } from './locales/de';

const translations: Record<SupportedLanguage, Record<string, string>> = {
  fr,
  en,
  es,
  de,
};

const STORAGE_KEY = 'safeface_language';

/**
 * Detects the user's preferred language from the browser navigator.
 */
function detectBrowserLanguage(): SupportedLanguage {
  try {
    const navLanguages = navigator.languages || [navigator.language];
    for (const rawLang of navLanguages) {
      if (!rawLang) continue;
      const lower = rawLang.toLowerCase();
      if (lower.startsWith('fr')) return 'fr';
      if (lower.startsWith('es')) return 'es';
      if (lower.startsWith('de')) return 'de';
      if (lower.startsWith('en')) return 'en';
    }
  } catch {
    /* fallback to English */
  }
  return 'en';
}

function getInitialLanguage(): SupportedLanguage {
  try {
    const saved = localStorage.getItem(STORAGE_KEY) as SupportedLanguage | null;
    if (saved && ['fr', 'en', 'es', 'de'].includes(saved)) {
      return saved;
    }
  } catch {
    /* localStorage unavailable */
  }
  return detectBrowserLanguage();
}

interface I18nContextValue {
  language: SupportedLanguage;
  setLanguage: (lang: SupportedLanguage) => void;
  availableLanguages: LanguageOption[];
  t: (key: string, params?: TranslationParams) => string;
}

const I18nContext = createContext<I18nContextValue | null>(null);

export const I18nProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [language, setLanguageState] = useState<SupportedLanguage>(getInitialLanguage);

  const setLanguage = useCallback((lang: SupportedLanguage) => {
    setLanguageState(lang);
    try {
      localStorage.setItem(STORAGE_KEY, lang);
      document.documentElement.lang = lang;
    } catch {
      /* ignore */
    }
  }, []);

  useEffect(() => {
    document.documentElement.lang = language;
  }, [language]);

  const t = useCallback(
    (key: string, params?: TranslationParams): string => {
      const dict = translations[language] || translations.en;
      let val = dict[key] || translations.en[key] || key;

      if (params) {
        Object.entries(params).forEach(([paramKey, paramVal]) => {
          val = val.split(`{${paramKey}}`).join(String(paramVal));
        });
      }
      return val;
    },
    [language]
  );

  const value = useMemo(
    () => ({
      language,
      setLanguage,
      availableLanguages: SUPPORTED_LANGUAGES,
      t,
    }),
    [language, setLanguage, t]
  );

  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>;
};

export function useI18n(): I18nContextValue {
  const ctx = useContext(I18nContext);
  if (!ctx) {
    throw new Error('useI18n must be used within an I18nProvider');
  }
  return ctx;
}
