import { createContext, ReactNode, useContext, useMemo, useState } from "react";
import { getItem, setItem } from "@/utils/local-storage";

export type DecimalFormat = "point" | "comma" | "space";

interface PreferencesContextType {
  decimalFormat: DecimalFormat;
  setDecimalFormat: (format: DecimalFormat) => void;
}

const DECIMAL_FORMAT_STORAGE_KEY = "decimal-format";

const getStoredDecimalFormat = (): DecimalFormat => {
  const stored = getItem<DecimalFormat>(DECIMAL_FORMAT_STORAGE_KEY);
  if (stored === "point" || stored === "comma" || stored === "space") {
    return stored;
  }

  return "comma";
};

const PreferencesContext = createContext<PreferencesContextType>({
  decimalFormat: "comma",
  // eslint-disable-next-line @typescript-eslint/no-empty-function
  setDecimalFormat: () => {},
});

export function PreferencesProvider({ children }: { children: ReactNode }) {
  const [decimalFormat, setDecimalFormatState] = useState<DecimalFormat>(() =>
    getStoredDecimalFormat(),
  );

  const setDecimalFormat = (format: DecimalFormat) => {
    setDecimalFormatState(format);
    setItem(DECIMAL_FORMAT_STORAGE_KEY, format);
  };

  const value = useMemo(
    () => ({
      decimalFormat,
      setDecimalFormat,
    }),
    [decimalFormat],
  );

  return (
    <PreferencesContext.Provider value={value}>
      {children}
    </PreferencesContext.Provider>
  );
}

export function usePreferences() {
  return useContext(PreferencesContext);
}
