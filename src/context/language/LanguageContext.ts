import { createContext } from "react";
import meta from "@/constants/meta";
import { LIVE_TRANSLATIONS_KEY } from "@/constants/storageKeys";

/**
 * Crowdin "pseudo-language" for In-Context tooling
 * See: https://support.crowdin.com/developer/in-context-localization/
 */
export const CROWDIN_PSEUDO_LOCALE = "zu-ZA";

export const isInContextToolAvailable = meta.crowdinInContextToolingEnabled;

const isLiveTranslationsActive = typeof window !== "undefined" && window.localStorage.getItem(LIVE_TRANSLATIONS_KEY) === "enabled";

export const DEFAULT_LOCALE_PROD = "en-US";
export const DEFAULT_LOCALE = isInContextToolAvailable && isLiveTranslationsActive ? CROWDIN_PSEUDO_LOCALE : DEFAULT_LOCALE_PROD;

export interface LanguageContextType {
  locale: string;
  setLocale: (locale: string) => void;
  availableLocales: () => string[];
}

export const LanguageContext = createContext<LanguageContextType>({
  locale: DEFAULT_LOCALE,
  // eslint-disable-next-line @typescript-eslint/no-empty-function
  setLocale: () => {},
  availableLocales: () => [DEFAULT_LOCALE],
});
