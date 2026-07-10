import { createContext } from "react";
import meta from "@/constants/meta";

/**
 * Crowdin "pseudo-language" for In-Context tooling
 * See: https://support.crowdin.com/developer/in-context-localization/
 */
export const CROWDIN_PSEUDO_LOCALE = "zu-ZA";

/**
 * Hosts where the Crowdin in-context tool is allowed to activate. Only these hosts matter,
 * regardless of build mode, so e.g. a `vite dev` server exposed on a LAN IP or a custom hostname
 * won't show the tool. Keep in sync with the hostname check in vite.config.ts's
 * crowdin-in-context-tooling plugin.
 */
const IN_CONTEXT_TOOL_ALLOWED_HOSTS = [
  "localhost",
  "127.0.0.1",
  "dashboard.wildcat0.clowder-dev.minibill.tech",
  "wildcat-dashboard.pages.dev",
];

const isInContextToolHost = typeof window !== "undefined" && IN_CONTEXT_TOOL_ALLOWED_HOSTS.includes(window.location.hostname);

export const isInContextToolAvailable = meta.crowdinInContextToolingEnabled && isInContextToolHost;

export const DEFAULT_LOCALE_PROD = "en-US";
export const DEFAULT_LOCALE = isInContextToolAvailable ? CROWDIN_PSEUDO_LOCALE : DEFAULT_LOCALE_PROD;

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
