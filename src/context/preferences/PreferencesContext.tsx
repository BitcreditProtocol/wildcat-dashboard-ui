import { createContext, ReactNode, useContext, useMemo, useState } from "react";
import { getItem, setItem } from "@/utils/local-storage";

export type DecimalFormat = "point" | "comma" | "space";
export type CurrencyCode = "sat" | "btc" | "eur" | "usd";

interface PreferencesContextType {
  decimalFormat: DecimalFormat;
  setDecimalFormat: (format: DecimalFormat) => void;
  currency: CurrencyCode;
  setCurrency: (currency: CurrencyCode) => void;
}

const DECIMAL_FORMAT_STORAGE_KEY = "decimal-format";
const CURRENCY_STORAGE_KEY = "display-currency";

const getStoredDecimalFormat = (): DecimalFormat => {
  const stored = getItem<DecimalFormat>(DECIMAL_FORMAT_STORAGE_KEY);
  if (stored === "point" || stored === "comma" || stored === "space") {
    return stored;
  }

  return "comma";
};

const getStoredCurrency = (): CurrencyCode => {
  const stored = getItem<CurrencyCode>(CURRENCY_STORAGE_KEY);
  if (stored === "sat" || stored === "btc" || stored === "eur" || stored === "usd") {
    return stored;
  }

  return "sat";
};

const PreferencesContext = createContext<PreferencesContextType>({
  decimalFormat: "comma",
  currency: "sat",
  // eslint-disable-next-line @typescript-eslint/no-empty-function
  setDecimalFormat: () => {},
  // eslint-disable-next-line @typescript-eslint/no-empty-function
  setCurrency: () => {},
});

export function PreferencesProvider({ children }: { children: ReactNode }) {
  const [decimalFormat, setDecimalFormatState] = useState<DecimalFormat>(() => getStoredDecimalFormat());
  const [currency, setCurrencyState] = useState<CurrencyCode>(() => getStoredCurrency());

  const setDecimalFormat = (format: DecimalFormat) => {
    setDecimalFormatState(format);
    setItem(DECIMAL_FORMAT_STORAGE_KEY, format);
  };

  const setCurrency = (nextCurrency: CurrencyCode) => {
    setCurrencyState(nextCurrency);
    setItem(CURRENCY_STORAGE_KEY, nextCurrency);
  };

  const value = useMemo(
    () => ({
      decimalFormat,
      setDecimalFormat,
      currency,
      setCurrency,
    }),
    [currency, decimalFormat]
  );

  return <PreferencesContext.Provider value={value}>{children}</PreferencesContext.Provider>;
}

// eslint-disable-next-line react-refresh/only-export-components
export function usePreferences() {
  return useContext(PreferencesContext);
}
