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
  minDate?: Date;
  currentYearPosition?: "start" | "center" | "end";
  order?: "asc" | "desc";
}

const YearPicker = ({
  value,
  onChange,
  onCaptionLabelClicked,
  numberYears = 21,
  disableFutureNavigation = false,
  minDate,
  currentYearPosition = "start",
  order = "asc",
}: YearPickerProps) => {
  const lang = useContext(LanguageContext);
  const currentYear = new Date().getUTCFullYear();
  const minYear = minDate?.getUTCFullYear();
  const total = numberYears;
  const half = Math.floor(total / 2);
  const positionIndex =
    currentYearPosition === "center"
      ? half
      : currentYearPosition === "end"
        ? total - 1
        : 0;
  const maxBaseYear = currentYear - (total - 1 - positionIndex);

  const [base, setBase] = useState<Date>(() => {
    let initial = value.getUTCFullYear();
    if (disableFutureNavigation) {
      initial = Math.min(initial, maxBaseYear);
    }
    if (minYear !== undefined) {
      initial = Math.max(initial, minYear);
    }
    return new Date(Date.UTC(initial, 0, 1));
  });

  const handleOnChange = (year: number) => {
    const updateDate = new Date(value);
    updateDate.setUTCFullYear(year);
    onChange(updateDate);
  };

  const startYear = base.getUTCFullYear() - positionIndex;
  const endYear = startYear + total - 1;
  const prevSelectedRef = useRef<number>(value.getUTCFullYear());

  useEffect(() => {
    const selected = value.getUTCFullYear();
    if (selected === prevSelectedRef.current) {
      return;
    }
    prevSelectedRef.current = selected;

    const maxBaseYear = currentYear - (total - 1 - positionIndex);
    let clamped = disableFutureNavigation
      ? Math.min(selected, maxBaseYear)
      : selected;
    if (minYear !== undefined) {
      clamped = Math.max(clamped, minYear);
    }
    setBase(new Date(Date.UTC(clamped, 0, 1)));
  }, [
    value,
    disableFutureNavigation,
    currentYear,
    total,
    positionIndex,
    minYear,
  ]);

  const canGoForward = !disableFutureNavigation || endYear < currentYear;
  const canGoBackward = minYear === undefined || startYear > minYear;

  const nextYears = () => {
    if (canGoForward) {
      setBase((val) => {
        const target = val.getUTCFullYear() + numberYears;
        const maxBaseYear = currentYear - (total - 1 - positionIndex);
        const clamped = disableFutureNavigation
          ? Math.min(target, maxBaseYear)
          : target;
        return new Date(Date.UTC(clamped, 0, 1));
      });
    }
  };
  const prevYears = () => {
    if (!canGoBackward) {
      return;
    }
    setBase(
      (val) => new Date(Date.UTC(val.getUTCFullYear() - numberYears, 0, 1)),
    );
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
          className={cn("mx-1", {
            "cursor-pointer": canGoBackward,
            "opacity-30 pointer-events-none": !canGoBackward,
          })}
          onClick={prevYears}
        />
        <div
          className="flex justify-between items-center gap-2 cursor-pointer"
          onClick={onCaptionLabelClicked}
        >
          {formatYearNumeric(value, lang.locale)}
          <ChevronUp
            strokeWidth={3}
            size={15}
          />
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
          const isSelected = year === value.getUTCFullYear();
          const isDisabled =
            (disableFutureNavigation && year > currentYear) ||
            (minYear !== undefined && year < minYear);

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
                  "bg-elevation-200 hover:bg-elevation-200 border border-divider-100":
                    isSelected,
                  "opacity-40 text-text-200 pointer-events-none": isDisabled,
                },
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
