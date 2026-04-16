import { createContext } from "react";

export type Theme = "light" | "dark" | "system";

export interface ThemeContextType {
  theme: Theme;
  setTheme: (theme: Theme) => void;
  currentTheme: "light" | "dark";
}

export const ThemeContext = createContext<ThemeContextType>({
  theme: "system",
  // eslint-disable-next-line @typescript-eslint/no-empty-function
  setTheme: () => {},
  currentTheme: "light",
});
