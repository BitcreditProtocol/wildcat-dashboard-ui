import { ReactNode, useMemo, useState } from "react";
import { IntlProvider } from "react-intl";
import {
  LanguageContext,
  DEFAULT_LOCALE,
} from "@/context/language/LanguageContext";
import { messagesByLocale, supportedLocales } from "@/i18n/messages";
import { getItem, setItem } from "@/utils/local-storage";

const LOCALE_STORAGE_KEY = "locale";

interface LanguageProviderProps {
  children: ReactNode;
}

export function LanguageProvider({ children }: LanguageProviderProps) {
  const [locale, setLocaleState] = useState(
    () => getItem<string>(LOCALE_STORAGE_KEY) ?? DEFAULT_LOCALE,
  );

  const setLocale = (nextLocale: string) => {
    setLocaleState(nextLocale);
    setItem(LOCALE_STORAGE_KEY, nextLocale);
  };

  const availableLocales = () => supportedLocales;
  const messages = messagesByLocale[locale] ?? messagesByLocale[DEFAULT_LOCALE];

  const contextValue = useMemo(
    () => ({
      locale,
      setLocale,
      availableLocales,
    }),
    [locale],
  );

  return (
    <LanguageContext.Provider value={contextValue}>
      <IntlProvider
        locale={locale}
        defaultLocale={DEFAULT_LOCALE}
        messages={messages}
      >
        {children}
      </IntlProvider>
    </LanguageContext.Provider>
  );
}
