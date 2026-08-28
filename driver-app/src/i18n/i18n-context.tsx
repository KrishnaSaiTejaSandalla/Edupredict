import React, { createContext, useContext, useEffect, useState, useCallback, ReactNode } from 'react';
import { SupportedLanguage, TRANSLATIONS, TranslationKey } from './translations';
import { StorageService } from '@/services/storage.service';

interface I18nContextValue {
  language: SupportedLanguage;
  setLanguage: (lang: SupportedLanguage) => void;
  t: (key: TranslationKey) => string;
}

const I18nContext = createContext<I18nContextValue | null>(null);

export function I18nProvider({ children }: { children: ReactNode }) {
  const [language, setLanguageState] = useState<SupportedLanguage>('en');

  useEffect(() => {
    StorageService.getLanguage().then((saved) => {
      if (saved) {
        setLanguageState(saved);
      }
    }).catch((err) => {
      console.warn('[I18n] Error loading saved language:', err);
    });
  }, []);

  const setLanguage = useCallback((lang: SupportedLanguage) => {
    setLanguageState(lang);
    void StorageService.setLanguage(lang);
  }, []);

  const t = useCallback((key: TranslationKey): string => {
    const dict = TRANSLATIONS[language] || TRANSLATIONS.en;
    return dict[key] || TRANSLATIONS.en[key] || key;
  }, [language]);

  return (
    <I18nContext.Provider value={{ language, setLanguage, t }}>
      {children}
    </I18nContext.Provider>
  );
}

export function useTranslation(): I18nContextValue {
  const ctx = useContext(I18nContext);
  if (!ctx) {
    // Graceful fallback if invoked outside provider
    return {
      language: 'en',
      setLanguage: () => {},
      t: (key: TranslationKey) => TRANSLATIONS.en[key] || key,
    };
  }
  return ctx;
}
