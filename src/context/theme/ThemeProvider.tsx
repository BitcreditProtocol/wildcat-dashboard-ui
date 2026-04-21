import { ReactNode, useCallback, useEffect, useMemo, useState } from "react";
import { Theme, ThemeContext } from "@/context/theme/ThemeContext";

const THEME_STORAGE_KEY = "theme";

const getStorage = (): Storage | null => {
  try {
    const storage = globalThis.localStorage as Partial<Storage> | undefined;
    if (storage && typeof storage.getItem === "function" && typeof storage.setItem === "function") {
      return storage as Storage;
    }
  } catch {
    // ignore and fall back to defaults
  }

  return null;
};

const getStoredTheme = (): Theme => {
  const stored = getStorage()?.getItem(THEME_STORAGE_KEY);
  if (stored === "light" || stored === "dark" || stored === "system") {
    return stored;
  }

  return "system";
};

interface ThemeProviderProps {
  children: ReactNode;
}

export function ThemeProvider({ children }: ThemeProviderProps) {
  const getSystemPrefersDark = useCallback(() => {
    if (typeof window === "undefined" || typeof window.matchMedia !== "function") {
      return false;
    }

    return window.matchMedia("(prefers-color-scheme: dark)").matches;
  }, []);

  const [theme, setThemeState] = useState<Theme>(() => getStoredTheme());
  const [isSystemPrefersDark, setSystemPrefersDark] = useState<boolean>(() => getSystemPrefersDark());

  const currentTheme = useMemo<"light" | "dark">(() => {
    const isDark = theme === "dark" || (theme === "system" && isSystemPrefersDark);
    return isDark ? "dark" : "light";
  }, [theme, isSystemPrefersDark]);

  const applyTheme = useCallback((nextTheme: "light" | "dark") => {
    document.documentElement.classList.toggle("dark", nextTheme === "dark");
  }, []);

  useEffect(() => {
    applyTheme(currentTheme);

    if (typeof window === "undefined" || typeof window.matchMedia !== "function") {
      return;
    }

    const mediaQuery = window.matchMedia("(prefers-color-scheme: dark)");

    const handleSystemChange = () => {
      setSystemPrefersDark(mediaQuery.matches);
    };

    mediaQuery.addEventListener("change", handleSystemChange);

    return () => {
      mediaQuery.removeEventListener("change", handleSystemChange);
    };
  }, [applyTheme, currentTheme]);

  useEffect(() => {
    const reapplyStoredTheme = () => {
      if (document.visibilityState === "hidden") {
        return;
      }

      const storedTheme = getStoredTheme();
      setThemeState(storedTheme);
      applyTheme(storedTheme === "system" ? (getSystemPrefersDark() ? "dark" : "light") : storedTheme);
    };

    const onStorageChange = (event: StorageEvent) => {
      if (event.key !== THEME_STORAGE_KEY) {
        return;
      }

      reapplyStoredTheme();
    };

    window.addEventListener("pageshow", reapplyStoredTheme);
    document.addEventListener("visibilitychange", reapplyStoredTheme);
    window.addEventListener("storage", onStorageChange);

    return () => {
      window.removeEventListener("pageshow", reapplyStoredTheme);
      document.removeEventListener("visibilitychange", reapplyStoredTheme);
      window.removeEventListener("storage", onStorageChange);
    };
  }, [applyTheme, getSystemPrefersDark]);

  const setTheme = useCallback(
    (nextTheme: Theme) => {
      setThemeState(nextTheme);
      getStorage()?.setItem(THEME_STORAGE_KEY, nextTheme);
      applyTheme(nextTheme === "system" ? (getSystemPrefersDark() ? "dark" : "light") : nextTheme);
    },
    [applyTheme, getSystemPrefersDark]
  );

  const contextValue = useMemo(
    () => ({
      theme,
      setTheme,
      currentTheme,
    }),
    [currentTheme, setTheme, theme]
  );

  return <ThemeContext.Provider value={contextValue}>{children}</ThemeContext.Provider>;
}
