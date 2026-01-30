import { useContext, useEffect, useRef, useState } from "react";
import { ChevronLeft, ChevronRight, ChevronUp } from "lucide-react";

import { LanguageContext } from "@/context/language/LanguageContext";
import { cn } from "@/lib/utils";
import { formatYearNumeric } from "@/utils/dates";

import { buttonVariants } from "../ui/button";

interface YearPickerProps {
  value: Date;
  onChange: (date: Date) => void;
  onCaptionLabelClicked: () => void;
  numberYears?: number;
  disableFutureNavigation?: boolean;
  currentYearPosition?: "start" | "center" | "end";
  order?: "asc" | "desc";
}

const YearPicker = ({
  value,
  onChange,
  onCaptionLabelClicked,
  numberYears = 21,
  disableFutureNavigation = false,
  currentYearPosition = "start",
  order = "asc",
}: YearPickerProps) => {
  const lang = useContext(LanguageContext);
  const currentYear = new Date().getFullYear();
  const total = numberYears;
  const half = Math.floor(total / 2);
  const positionIndex = currentYearPosition === "center" ? half : currentYearPosition === "end" ? (total - 1) : 0;
  const maxBaseYear = currentYear - (total - 1 - positionIndex);

  const [base, setBase] = useState<Date>(() => {
    const initial = disableFutureNavigation ? Math.min(value.getFullYear(), maxBaseYear) : value.getFullYear();
    return new Date(initial, 0);
  });

  const handleOnChange = (year: number) => {
    const updateDate = new Date(value);
    updateDate.setFullYear(year);
    onChange(updateDate);
  };

  const startYear = base.getFullYear() - positionIndex;
  const endYear = startYear + total - 1;
  const prevSelectedRef = useRef<number>(value.getFullYear());

  useEffect(() => {
    const selected = value.getFullYear();
    if (selected === prevSelectedRef.current) {
      return;
    }
    prevSelectedRef.current = selected;

    const maxBaseYear = currentYear - (total - 1 - positionIndex);
    const clamped = disableFutureNavigation ? Math.min(selected, maxBaseYear) : selected;
    setBase(new Date(clamped, 0));
  }, [value, disableFutureNavigation, currentYear, total, positionIndex]);

  const canGoForward = !disableFutureNavigation || endYear < currentYear;

  const nextYears = () => {
    if (canGoForward) {
      setBase((val) => {
        const target = val.getFullYear() + numberYears;
        const maxBaseYear = currentYear - (total - 1 - positionIndex);
        const clamped = disableFutureNavigation ? Math.min(target, maxBaseYear) : target;
        return new Date(clamped, 0);
      });
    }
  };
  const prevYears = () => {
    setBase((val) => new Date(val.getFullYear() - numberYears, 0));
  };

  let touchStartX: number | null = null;
  const handleTouchStart = (e: React.TouchEvent) => {
    touchStartX = e.touches[0].clientX;
  };
  const handleTouchEnd = (e: React.TouchEvent) => {
    if (touchStartX === null) return;
    const diffX = e.changedTouches[0].clientX - touchStartX;

    if (diffX > 50) {
      prevYears();
    } else if (diffX < -50) {
      nextYears();
    }

    touchStartX = null;
  };

  const years = Array.from({ length: numberYears }, (_, i) => startYear + i);
  const displayYears = order === "desc" ? [...years].reverse() : years;

  return (
    <div
      className="flex flex-col gap-2"
      onTouchStart={handleTouchStart}
      onTouchEnd={handleTouchEnd}
      style={{ touchAction: "pan-y" }}
    >
      <div className="flex justify-between items-center">
        <ChevronLeft
          className={"mx-1 cursor-pointer"}
          onClick={prevYears}
        />
        <div
          className="flex justify-between items-center gap-2 cursor-pointer"
          onClick={onCaptionLabelClicked}
        >
          {formatYearNumeric(value, lang.locale)}
          <ChevronUp strokeWidth={3} size={15} />
        </div>
        <ChevronRight
          className={cn("mx-1", {
            "cursor-pointer": canGoForward,
            "opacity-30 pointer-events-none": !canGoForward,
          })}
          onClick={nextYears}
        />
      </div>
      <div className="grid grid-rows-7 grid-cols-3">
        {displayYears.map((year, index) => {
          const isSelected = year === value.getFullYear();
          const isDisabled = disableFutureNavigation && year > currentYear;

          return (
            <div
              key={index}
              aria-disabled={isDisabled}
              onClick={() => {
                if (!isDisabled) handleOnChange(year);
              }}
              className={cn(
                "h-[42px] flex justify-center items-center",
                buttonVariants({ variant: "ghost" }),
                {
                  "cursor-pointer": !isDisabled,
                  "bg-elevation-200 hover:bg-elevation-200 border border-divider-100": isSelected,
                  "opacity-40 text-text-200 pointer-events-none": isDisabled,
                }
              )}
            >
              {year}
            </div>
          );
        })}
      </div>
    </div>
  );
};

export { YearPicker };
