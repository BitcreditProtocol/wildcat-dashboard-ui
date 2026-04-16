import { Moon, Sun, Monitor } from "lucide-react";
import { useIntl } from "react-intl";
import { useTheme } from "@/context/theme/useTheme";
import { Theme } from "@/context/theme/ThemeContext";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

interface ThemeSelectorProps {
  className?: string;
  showLabel?: boolean;
}

const themeIcons = {
  light: Sun,
  dark: Moon,
  system: Monitor,
} satisfies Record<Theme, typeof Sun>;

export function ThemeSelector({ className, showLabel = true }: ThemeSelectorProps) {
  const intl = useIntl();
  const { theme, setTheme } = useTheme();

  const options: Theme[] = ["light", "dark", "system"];

  return (
    <div className={className}>
      {showLabel ? (
        <span className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
          {intl.formatMessage({
            id: "theme.label",
            defaultMessage: "Theme",
          })}
        </span>
      ) : null}
      <Select value={theme} onValueChange={(value) => setTheme(value as Theme)}>
        <SelectTrigger className="h-9">
          <SelectValue
            placeholder={intl.formatMessage({
              id: "theme.select",
              defaultMessage: "Select theme",
            })}
          />
        </SelectTrigger>
        <SelectContent>
          {options.map((option) => {
            const Icon = themeIcons[option];

            return (
              <SelectItem key={option} value={option}>
                <Icon className="size-4" />
                {intl.formatMessage({
                  id: `theme.option.${option}`,
                  defaultMessage: option,
                })}
              </SelectItem>
            );
          })}
        </SelectContent>
      </Select>
    </div>
  );
}
