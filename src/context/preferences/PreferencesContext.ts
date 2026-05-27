export {
  PreferencesProvider,
  PreferencesContext,
  getStoredPreferences,
  savePreferences,
  usePreferences,
} from "@bitcredit/ui-library";

export type CurrencyCode = "sat" | "btc" | "eur" | "usd";
export type DecimalFormat = "point" | "comma" | "space";
