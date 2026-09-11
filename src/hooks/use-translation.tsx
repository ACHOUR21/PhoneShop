"use client";

import { useSession } from "next-auth/react";
import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import { DEFAULT_LANGUAGE, dictionaries, getDirection } from "@/locales";

interface LanguageContextValue {
  language: string;
  setLanguage: (lang: string) => void;
  t: (key: string) => string;
  dir: "rtl" | "ltr";
}

const LanguageContext = createContext<LanguageContextValue>({
  language: DEFAULT_LANGUAGE,
  setLanguage: () => {},
  t: (k) => k,
  dir: "rtl",
});

export function LanguageProvider({ children }: { children: ReactNode }) {
  const { data: session, update } = useSession();
  const [language, setLanguageState] = useState<string>(DEFAULT_LANGUAGE);

  // Init from localStorage / session / default
  useEffect(() => {
    const stored = typeof window !== "undefined" ? localStorage.getItem("phoneshop-lang") : null;
    const sessionLang = (session?.user as { language?: string } | undefined)?.language;
    if (stored && dictionaries[stored]) setLanguageState(stored);
    else if (sessionLang && dictionaries[sessionLang]) setLanguageState(sessionLang);
    else if (process.env.NEXT_PUBLIC_DEFAULT_LANGUAGE && dictionaries[process.env.NEXT_PUBLIC_DEFAULT_LANGUAGE]) {
      setLanguageState(process.env.NEXT_PUBLIC_DEFAULT_LANGUAGE);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Apply <html> lang + dir
  useEffect(() => {
    if (typeof document !== "undefined") {
      document.documentElement.lang = language;
      document.documentElement.dir = getDirection(language);
      localStorage.setItem("phoneshop-lang", language);
    }
  }, [language]);

  const setLanguage = useCallback(
    (lang: string) => {
      if (!dictionaries[lang]) return;
      setLanguageState(lang);
      // Persist to user profile (fire and forget)
      fetch("/api/users/me", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ language: lang }),
      }).catch(() => {});
      update?.({ language: lang }).catch(() => {});
    },
    [update]
  );

  const t = useCallback(
    (key: string): string => {
      return dictionaries[language]?.[key] ?? dictionaries.en[key] ?? key;
    },
    [language]
  );

  const value = useMemo(
    () => ({ language, setLanguage, t, dir: getDirection(language) }),
    [language, setLanguage, t]
  );

  return <LanguageContext.Provider value={value}>{children}</LanguageContext.Provider>;
}

export function useTranslation() {
  return useContext(LanguageContext);
}
