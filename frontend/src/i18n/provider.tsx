// ============================================================
// LanguageProvider — Global i18n context with localStorage
// ============================================================

"use client";

import {
  createContext,
  useContext,
  useState,
  useCallback,
  useEffect,
  type ReactNode,
} from "react";
import en from "./en.json";
import id from "./id.json";

export type Locale = "en" | "id";

const dictionaries: Record<Locale, typeof en> = { en, id };

interface LanguageContextType {
  locale: Locale;
  setLocale: (locale: Locale) => void;
  t: (key: string, vars?: Record<string, string>) => string;
}

const LanguageContext = createContext<LanguageContextType>({
  locale: "en",
  setLocale: () => {},
  t: (key) => key,
});

export function useLanguage() {
  return useContext(LanguageContext);
}

/** Shorthand hook — just the `t` function */
export function useT() {
  return useContext(LanguageContext).t;
}

function getNestedValue(obj: Record<string, unknown>, path: string): string {
  const keys = path.split(".");
  let current: unknown = obj;
  for (const key of keys) {
    if (current === null || current === undefined) return path;
    current = (current as Record<string, unknown>)[key];
  }
  return typeof current === "string" ? current : path;
}

function detectBrowserLocale(): Locale {
  if (typeof window === "undefined") return "en";
  const lang = navigator.language?.toLowerCase() ?? "";
  if (lang.startsWith("id")) return "id";
  return "en";
}

const STORAGE_KEY = "experiment-controller-lang";

export function LanguageProvider({ children }: { children: ReactNode }) {
  const [locale, setLocaleState] = useState<Locale>("en");
  const [mounted, setMounted] = useState(false);

  // Load persisted or browser-detected locale on mount
  useEffect(() => {
    const stored = localStorage.getItem(STORAGE_KEY) as Locale | null;
    if (stored && (stored === "en" || stored === "id")) {
      setLocaleState(stored);
    } else {
      setLocaleState(detectBrowserLocale());
    }
    setMounted(true);
  }, []);

  const setLocale = useCallback((l: Locale) => {
    setLocaleState(l);
    localStorage.setItem(STORAGE_KEY, l);
    document.documentElement.lang = l;
  }, []);

  const t = useCallback(
    (key: string, vars?: Record<string, string>): string => {
      let value = getNestedValue(
        dictionaries[locale] as unknown as Record<string, unknown>,
        key
      );
      if (vars) {
        for (const [k, v] of Object.entries(vars)) {
          value = value.replace(`{${k}}`, v);
        }
      }
      return value;
    },
    [locale]
  );

  // Prevent hydration mismatch — render English until mounted
  const contextValue: LanguageContextType = {
    locale: mounted ? locale : "en",
    setLocale,
    t: mounted ? t : (key: string) => getNestedValue(en as unknown as Record<string, unknown>, key),
  };

  return (
    <LanguageContext.Provider value={contextValue}>
      {children}
    </LanguageContext.Provider>
  );
}
