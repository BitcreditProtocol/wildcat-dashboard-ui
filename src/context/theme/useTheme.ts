import { useContext } from "react";
import { ThemeContext } from "@/context/theme/ThemeContext";

export function useTheme() {
  return useContext(ThemeContext);
}
