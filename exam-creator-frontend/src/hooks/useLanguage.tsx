import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';
import { type Lang, translate } from '@/lib/i18n';
import { useAuth } from './useAuth';

interface LanguageContextValue {
  lang: Lang;
  setLang: (lang: Lang) => void;
  t: (text: string) => string;
}

const LanguageContext = createContext<LanguageContextValue>({
  lang: 'fr',
  setLang: () => {},
  t: (text) => text,
});

export function LanguageProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const storageKey = user ? `language_${user.id}` : 'language';

  const [lang, setLangState] = useState<Lang>(() => {
    const stored = localStorage.getItem(storageKey);
    return (stored === 'en' || stored === 'fr') ? stored : 'fr';
  });

  // Reload language when user changes (login/logout)
  useEffect(() => {
    const stored = localStorage.getItem(storageKey);
    const newLang = (stored === 'en' || stored === 'fr') ? stored : 'fr';
    setLangState(newLang);
  }, [storageKey]);

  const setLang = (newLang: Lang) => {
    setLangState(newLang);
    localStorage.setItem(storageKey, newLang);
    // Also save to generic key so language persists after logout
    localStorage.setItem('language', newLang);
    document.documentElement.lang = newLang;
  };

  useEffect(() => {
    document.documentElement.lang = lang;
  }, [lang]);

  const t = (text: string) => translate(text, lang);

  return (
    <LanguageContext.Provider value={{ lang, setLang, t }}>
      {children}
    </LanguageContext.Provider>
  );
}

export function useLanguage() {
  return useContext(LanguageContext);
}
