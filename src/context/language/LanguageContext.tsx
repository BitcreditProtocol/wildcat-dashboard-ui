import { createContext, useContext } from "react"
import meta from "@/constants/meta"

/**
 * Crowdin "pseudo-language" for In-Context tooling
 * See: https://support.crowdin.com/developer/in-context-localization/
 */
const CROWDIN_PSEUDO_LOCALE = "ach-UG"

const DEFAULT_LOCALE_PROD = "en-US"
const DEFAULT_LOCALE_DEV = meta.crowdinInContextToolingEnabled ? CROWDIN_PSEUDO_LOCALE : DEFAULT_LOCALE_PROD
const DEFAULT_LOCALE = meta.devModeEnabled ? DEFAULT_LOCALE_DEV : DEFAULT_LOCALE_PROD

export interface LanguageContextType {
  locale: string
  setLocale: (locale: string) => void
  availableLocales: () => string[]
}

const LanguageContext = createContext<LanguageContextType>({
  locale: DEFAULT_LOCALE,
  // eslint-disable-next-line @typescript-eslint/no-empty-function
  setLocale: () => {},
  availableLocales: () => [DEFAULT_LOCALE],
})

const useLanguage = () => useContext(LanguageContext)

export { DEFAULT_LOCALE, LanguageContext, useLanguage }
