import { Button } from "@/components/ui/button"
import { ArrowUp, ArrowDown } from "lucide-react"

export interface SortConfig<T extends string> {
  field: T
  direction: "asc" | "desc"
}

interface SortOption<T extends string> {
  field: T
  label: string
}

interface SortButtonsProps<T extends string> {
  sortBy: string
  onSortChange: (field: T) => void
  options: SortOption<T>[]
}

export function SortButtons<T extends string>({ sortBy, onSortChange, options }: SortButtonsProps<T>) {
  const getSortIcon = (field: T) => {
    if (!sortBy.startsWith(field)) {
      return null
    }
    return sortBy.endsWith("asc") ? <ArrowUp className="h-4 w-4" /> : <ArrowDown className="h-4 w-4" />
  }

  const getTitle = (field: T, label: string) => {
    if (sortBy.startsWith(field)) {
      return sortBy.endsWith("asc") ? `${label} Ascending` : `${label} Descending`
    }
    return `Sort by ${label}`
  }

  return (
    <div className="flex items-center gap-2">
      <span className="text-sm font-medium">Sort by:</span>
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
  )
}
