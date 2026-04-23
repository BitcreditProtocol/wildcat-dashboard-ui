import { AppIcon, Button } from "@bitcredit/ui-library";
import { ArrowUp, ArrowDown } from "lucide-react";
import { useIntl } from "react-intl";

export interface SortConfig<T extends string> {
  field: T;
  direction: "asc" | "desc";
}

interface SortOption<T extends string> {
  field: T;
  label: string;
}

interface SortButtonsProps<T extends string> {
  sortBy: string;
  onSortChange: (field: T) => void;
  options: SortOption<T>[];
}

export function SortButtons<T extends string>({ sortBy, onSortChange, options }: SortButtonsProps<T>) {
  const intl = useIntl();
  const getSortIcon = (field: T) => {
    if (!sortBy.startsWith(field)) {
      return null;
    }
    return sortBy.endsWith("asc") ? <AppIcon icon={ArrowUp} size="sm" /> : <AppIcon icon={ArrowDown} size="sm" />;
  };

  const getTitle = (field: T, label: string) => {
    if (sortBy.startsWith(field)) {
      return sortBy.endsWith("asc")
        ? intl.formatMessage(
            {
              id: "sortButtons.ascending",
              defaultMessage: "{label} Ascending",
            },
            { label }
          )
        : intl.formatMessage(
            {
              id: "sortButtons.descending",
              defaultMessage: "{label} Descending",
            },
            { label }
          );
    }
    return intl.formatMessage(
      {
        id: "sortButtons.sortByWithLabel",
        defaultMessage: "Sort by {label}",
      },
      { label }
    );
  };

  return (
    <div className="flex items-center gap-2">
      <span className="text-sm font-medium">
        {intl.formatMessage({
          id: "sortButtons.sortByLabel",
          defaultMessage: "Sort by:",
        })}
      </span>
      {options.map((option) => (
        <Button
          key={option.field}
          size="sm"
          variant={sortBy.startsWith(option.field) ? "default" : "outline"}
          onClick={() => onSortChange(option.field)}
          title={getTitle(option.field, option.label)}
          className="flex items-center gap-1 max-w-sm"
        >
          {option.label} {getSortIcon(option.field)}
        </Button>
      ))}
    </div>
  );
}
