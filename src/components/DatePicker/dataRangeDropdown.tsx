import { useIntl } from "react-intl";
import { CircleX } from "lucide-react";

import { Button } from "@/components/ui/button";

import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuLabel,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "./dropdownMenu";

interface DateRangeDropdownProps {
  value?: number;
  onRangeChange: (range: number) => void;
  onClear?: () => void;
}

export function DateRangeDropdown({
  value,
  onRangeChange,
  onClear,
}: DateRangeDropdownProps) {
  const intl = useIntl();

  const handleRangeChanged = (value: string) => {
    const range = Number(value);
    onRangeChange(range);
  };

  const handleDisplayRange = (value: number | undefined): string => {
    switch (value) {
      case 30:
      case 60:
      case 90:
        return intl.formatMessage(
          { id: "displayRange.days", defaultMessage: "{value} Days" },
          { value }
        );
      case 180:
        return intl.formatMessage({
          id: "displayRange.sixMonths",
          defaultMessage: "6 Months",
        });
      case 365:
        return intl.formatMessage({
          id: "displayRange.oneYear",
          defaultMessage: "1 Year",
        });
      default:
        return intl.formatMessage({
          id: "displayRange.selectRange",
          defaultMessage: "Select range",
        });
    }
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="outline"
          className="w-full rounded-lg bg-elevation-200 justify-between py-3 px-4 flex items-center"
        >
          <span>{handleDisplayRange(value)}</span>
          {value !== undefined && (
            <div
              role="button"
              tabIndex={0}
              aria-label={intl.formatMessage({
                id: "dropdown.clearPresetRange",
                defaultMessage: "Clear preset range",
              })}
              aria-pressed="false"
              onPointerDown={(e) => {
                e.preventDefault();
                e.stopPropagation();
              }}
              onClick={(e) => {
                e.stopPropagation();
                onClear?.();
              }}
              onKeyDown={(e) => {
                if (e.key === "Enter" || e.key === " ") {
                  e.preventDefault();
                  e.stopPropagation();
                  onClear?.();
                } else if (e.key === "Escape") {
                  e.stopPropagation();
                }
              }}
              className="p-1 rounded-sm hover:bg-elevation-250 focus:outline-hidden focus:ring-2 focus:ring-brand-200 focus:ring-offset-1 cursor-pointer transition-colors"
            >
              <CircleX className="h-5 w-5 text-text-300" strokeWidth={1} />
            </div>
          )}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent className="w-64 bg-elevation-200">
        <DropdownMenuLabel>
          {intl.formatMessage({
            id: "dropdown.label.selectRange",
            defaultMessage: "Select Range",
          })}
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        <DropdownMenuRadioGroup
          value={String(value)}
          onValueChange={handleRangeChanged}
        >
          <DropdownMenuRadioItem value="30">
            {intl.formatMessage({
              id: "dropdown.option.30days",
              defaultMessage: "30 Days",
            })}
          </DropdownMenuRadioItem>
          <DropdownMenuRadioItem value="60">
            {intl.formatMessage({
              id: "dropdown.option.60days",
              defaultMessage: "60 Days",
            })}
          </DropdownMenuRadioItem>
          <DropdownMenuRadioItem value="90">
            {intl.formatMessage({
              id: "dropdown.option.90days",
              defaultMessage: "90 Days",
            })}
          </DropdownMenuRadioItem>
          <DropdownMenuRadioItem value="180">
            {intl.formatMessage({
              id: "dropdown.option.6months",
              defaultMessage: "6 Months",
            })}
          </DropdownMenuRadioItem>
          <DropdownMenuRadioItem value="365">
            {intl.formatMessage({
              id: "dropdown.option.1year",
              defaultMessage: "1 Year",
            })}
          </DropdownMenuRadioItem>
        </DropdownMenuRadioGroup>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
