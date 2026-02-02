import { useContext, useEffect, useState } from "react";
import { ChevronLeft, ChevronRight, ChevronUp } from "lucide-react";

import { LanguageContext } from "@/context/language/LanguageContext";
import { cn } from "@/lib/utils";
import { formatMonthLong, formatMonthYear } from "@/utils/dates";

import { buttonVariants } from "../ui/button";

interface MonthPickerProps {
  value: Date;
  onChange: (date: Date) => void;
  onCaptionLabelClicked: () => void;
  disableFutureNavigation?: boolean;
  minDate?: Date;
}

const MonthPicker = ({
  value,
  onChange,
  onCaptionLabelClicked,
  disableFutureNavigation = false,
  minDate,
}: MonthPickerProps) => {
  const lang = useContext(LanguageContext);
  const now = new Date();
  const currentYear = now.getFullYear();
  const currentMonth = now.getMonth();
  const minYear = minDate?.getFullYear();
  const minMonth = minDate?.getMonth();

  const [base, setBase] = useState<Date>(() => {
    let initYear = value.getFullYear();
    if (disableFutureNavigation) {
      initYear = Math.min(initYear, currentYear);
    }
    if (minYear !== undefined) {
      initYear = Math.max(initYear, minYear);
    }
    return new Date(initYear, value.getMonth(), 1);
  });

  useEffect(() => {
    let nextYear = value.getFullYear();
    if (disableFutureNavigation) {
      nextYear = Math.min(nextYear, currentYear);
    }
    if (minYear !== undefined) {
      nextYear = Math.max(nextYear, minYear);
    }
    if (nextYear !== base.getFullYear()) {
      setBase(() => new Date(nextYear, value.getMonth(), 1));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value, disableFutureNavigation, currentYear]);

  const handleOnChange = (monthIndex: number) => {
    const newDate = new Date(base);
    newDate.setMonth(monthIndex);
    onChange(newDate);
  };

  const addYears = (years: number) => {
    setBase((val) => new Date(val.getFullYear() + years, val.getMonth(), 1));
  };

  const canGoBackward = minYear === undefined || base.getFullYear() > minYear;
  const canGoForward = !disableFutureNavigation || base.getFullYear() < currentYear;

  const nextYear = () => {
    if (!canGoForward) {
      return;
    }
    addYears(1);
  };

  const prevYear = () => {
    if (!canGoBackward) {
      return;
    }
    addYears(-1);
  };

  return (
    <div className="flex flex-col gap-2">
      <div className="flex justify-between items-center">
        <ChevronLeft
          className={cn("mx-1", {
            "cursor-pointer": canGoBackward,
            "opacity-30 pointer-events-none": !canGoBackward,
          })}
          onClick={prevYear}
        />
        <div
          className="flex justify-between items-center gap-2 cursor-pointer"
          onClick={onCaptionLabelClicked}
        >
          {formatMonthYear(base, lang.locale)}
          <ChevronUp strokeWidth={3} size={15} />
        </div>
        <ChevronRight
          className={cn("mx-1", {
            "cursor-pointer": canGoForward,
            "opacity-30 pointer-events-none": !canGoForward,
          })}
          onClick={nextYear}
        />
      </div>
      <div className="grid grid-rows-4 grid-cols-3">
        {Array.from({ length: 12 }, (_, index) => {
          const date = new Date(base.getFullYear(), index, 1);
          const isFutureMonth =
            disableFutureNavigation &&
            (date.getFullYear() > currentYear || (date.getFullYear() === currentYear && index > currentMonth));
          const isPastMonth =
            minYear !== undefined &&
            (date.getFullYear() < minYear || (date.getFullYear() === minYear && minMonth !== undefined && index < minMonth));
          const isSelected = date.getFullYear() === value.getFullYear() && date.getMonth() === value.getMonth();

          return (
            <div
              key={index}
              aria-disabled={isFutureMonth || isPastMonth}
              onClick={() => {
                if (!isFutureMonth && !isPastMonth) handleOnChange(index);
              }}
              className={cn(
                "h-[42px] flex justify-center items-center",
                buttonVariants({ variant: "ghost" }),
                {
                  "cursor-pointer": !isFutureMonth && !isPastMonth,
                  "opacity-40 text-text-200 pointer-events-none": isFutureMonth || isPastMonth,
                  "bg-elevation-200 hover:bg-elevation-200 border border-divider-100":
                  isSelected,
                }
              )}
            >
              {formatMonthLong(date, lang.locale)}
            </div>
          );
        })}
      </div>
    </div>
  );
};

export { MonthPicker };
