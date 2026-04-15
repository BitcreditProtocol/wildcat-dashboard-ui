import React, { useCallback, useEffect, useState } from "react";
import { DateRange, DayPicker, DayPickerProps, OnSelectHandler } from "react-day-picker";
import { isSameDay } from "date-fns";
import { ChevronDown, ChevronLeft, ChevronRight } from "lucide-react";
import { useIntl } from "react-intl";

import { cn } from "@/lib/utils";
import { YearPicker } from "./yearPicker";
import { MonthPicker } from "./monthPicker";
import { useUtcDateFormatters } from "@/hooks/use-utc-date-formatters";

export type CalendarProps = Omit<DayPickerProps, "mode" | "onSelect" | "selected"> & {
  mode: "single" | "range";
  onSelect?: OnSelectHandler<DateRange | undefined>;
  selected: DateRange;
  onCaptionLabelClicked?: () => void;
  disableFutureNavigation?: boolean;
  rangeFocus?: "from" | "to";
  className?: string;
  ISOWeek?: boolean;
  showOutsideDays?: boolean;
  month?: Date;
  minDate?: Date;
  initialFocus?: boolean;
  modifiers?: Record<string, (date: Date) => boolean>;
  modifiersClassNames?: Record<string, string>;
};

const classNames = {
  root: "w-full",
  months: "flex flex-col sm:flex-row space-y-4 sm:space-x-4 sm:space-y-0 w-full",
  month: "space-y-4 w-full",
  month_caption: "flex justify-center relative items-center",
  // Hide default DayPicker caption label; we render our own header.
  caption_label: "sr-only",
  nav: "space-x-1 flex items-center",
  button_previous: "absolute left-1 bg-transparent!",
  button_next: "absolute right-1 bg-transparent!",
  month_grid: "w-full h-full border-collapse space-y-1",
  weekdays: "flex justify-around",
  weekday: "text-muted-foreground rounded-md w-9 font-normal text-[0.8rem]",
  week: "flex w-full mt-1 justify-around",
  day: "h-10 w-10 text-center text-sm p-0 relative [&:has([aria-selected].day-range-end)]:rounded-r-md [&:has([aria-selected].day-outside)]:bg-accent/50 [&:has([aria-selected])]:bg-accent first:[&:has([aria-selected])]:rounded-l-md last:[&:has([aria-selected])]:rounded-r-md focus-within:relative focus-within:z-20",
  day_button:
    "h-10 w-10 text-center text-sm p-0 relative cursor-pointer hover:bg-accent/50 disabled:cursor-not-allowed disabled:opacity-50 [&:has([aria-selected].day-range-end)]:rounded-r-md [&:has([aria-selected].day-outside)]:bg-accent/50 [&:has([aria-selected])]:bg-accent first:[&:has([aria-selected])]:rounded-l-md last:[&:has([aria-selected])]:rounded-r-md focus-within:relative focus-within:z-20",
  range_end: "day-range-end",
  range_start: "day-range-start",
  selected: "bg-elevation-200 hover:bg-elevation-200 border border-divider-100",
  today: "bg-accent text-accent-foreground",
  outside: "day-outside text-muted-foreground aria-selected:bg-accent/50 aria-selected:text-muted-foreground",
  disabled: "text-muted-foreground opacity-50",
  range_middle: "aria-selected:bg-accent aria-selected:text-accent-foreground",
  hidden: "invisible",
};

function getNextDate(current: Date, offset: number): Date {
  const year = current.getUTCFullYear();
  const month = current.getUTCMonth();
  const day = current.getUTCDate();

  const daysInCurrentMonth = new Date(Date.UTC(year, month + 1, 0)).getUTCDate();
  const isLastDay = day === daysInCurrentMonth;

  const targetMonthDate = new Date(Date.UTC(year, month + offset, 1));
  const daysInTargetMonth = new Date(Date.UTC(targetMonthDate.getUTCFullYear(), targetMonthDate.getUTCMonth() + 1, 0)).getUTCDate();

  const newDay = isLastDay ? daysInTargetMonth : Math.min(day, daysInTargetMonth);

  return new Date(Date.UTC(targetMonthDate.getUTCFullYear(), targetMonthDate.getUTCMonth(), newDay));
}

function Calendar({
  mode,
  className,
  onCaptionLabelClicked,
  selected,
  onSelect,
  disableFutureNavigation = false,
  ISOWeek = true,
  showOutsideDays = true,
  rangeFocus = "from",
  initialFocus,
  modifiers,
  modifiersClassNames,
  month: monthProp,
  minDate,
  ...restProps
}: CalendarProps) {
  const intl = useIntl();
  const [selectedDate, setSelectedDate] = useState<Date | undefined>(selected.from);
  const [month, setMonth] = useState<Date>(selected.from ?? monthProp ?? new Date());
  const [showYearPicker, setShowYearPicker] = useState(false);
  const [showMonthPicker, setShowMonthPicker] = useState(false);
  const { formatDay2Digit, formatMonthShort, formatYearNumeric } = useUtcDateFormatters(intl.locale);

  useEffect(() => {
    if (mode === "single") {
      if (selected.from) {
        setSelectedDate(selected.from);
        setMonth(selected.from);
      } else {
        setSelectedDate(undefined);
        setMonth(monthProp ?? new Date());
      }
    } else {
      if (!selected.from && !selected.to) {
        setMonth(monthProp ?? new Date());
        setSelectedDate(undefined);
      }
    }
  }, [selected, mode, monthProp]);

  const handleOnSelectRange: OnSelectHandler<DateRange | undefined> = (range, selectedDay, modifiers, e) => {
    if (mode === "single") {
      setSelectedDate(selectedDay);
    }
    if (onSelect) {
      onSelect(range, selectedDay, modifiers, e);
    }
  };

  const handleOnSelectSingle: OnSelectHandler<Date | undefined> = (day, selectedDay, modifiers, e) => {
    handleOnSelectRange(day ? { from: day } : undefined, selectedDay, modifiers, e);
  };

  const goToOffsetMonth = useCallback(
    (offset: number) => {
      setMonth(getNextDate(month, offset));
    },
    [month]
  );

  let touchStartX: number | null = null;

  const handleTouchStart = (e: React.TouchEvent) => {
    touchStartX = e.touches[0].clientX;
  };

  const handleTouchEnd = (e: React.TouchEvent) => {
    if (touchStartX === null) {
      return;
    }

    const diffX = e.changedTouches[0].clientX - touchStartX;

    if (diffX > 50) {
      goToOffsetMonth(-1);
    } else if (diffX < -50) {
      if (canGoForward) {
        goToOffsetMonth(1);
      }
    }

    touchStartX = null;
  };

  const isAtOrBeyondCurrentMonth = (d: Date) => {
    const today = new Date();
    const todayYear = today.getUTCFullYear();
    const todayMonth = today.getUTCMonth();
    const dateYear = d.getUTCFullYear();
    const dateMonth = d.getUTCMonth();
    return dateYear > todayYear || (dateYear === todayYear && dateMonth >= todayMonth);
  };

  const canGoForward = disableFutureNavigation ? !isAtOrBeyondCurrentMonth(month) : true;

  const NavigationHeader = () => (
    <div className="flex justify-center relative items-center mb-4">
      <button
        type="button"
        onClick={() => {
          goToOffsetMonth(-1);
        }}
        className="absolute left-1 bg-transparent hover:bg-accent rounded-md p-2"
        aria-label={intl.formatMessage({
          id: "calendar.nav.prevMonth",
          defaultMessage: "Go to previous month",
        })}
      >
        <ChevronLeft className="h-4 w-4" />
      </button>
      <div
        className={cn("flex justify-between items-center gap-2 cursor-pointer hover:bg-accent rounded-md px-3 py-1")}
        role="button"
        tabIndex={0}
      >
        {mode === "single" && selectedDate ? (
          <span
            className="text-sm font-medium flex gap-1"
            onClick={() => {
              setShowYearPicker(!showYearPicker);
              setShowMonthPicker(false);
              if (onCaptionLabelClicked) {
                onCaptionLabelClicked();
              }
            }}
          >
            <span>
              {formatMonthShort(month)} {formatDay2Digit(month)},
            </span>
            <span
              onClick={(e) => {
                e.stopPropagation();
                setShowYearPicker(!showYearPicker);
                setShowMonthPicker(false);
                if (onCaptionLabelClicked) {
                  onCaptionLabelClicked();
                }
              }}
            >
              {formatYearNumeric(month)}
            </span>
          </span>
        ) : (
          <span
            className="text-sm font-medium flex gap-1"
            onClick={() => {
              setShowYearPicker(!showYearPicker);
              setShowMonthPicker(false);
              if (onCaptionLabelClicked) {
                onCaptionLabelClicked();
              }
            }}
          >
            <span>{formatMonthShort(month)} </span>
            <span
              onClick={(e) => {
                e.stopPropagation();
                setShowYearPicker(!showYearPicker);
                setShowMonthPicker(false);
                if (onCaptionLabelClicked) {
                  onCaptionLabelClicked();
                }
              }}
            >
              {formatYearNumeric(month)}
            </span>
          </span>
        )}
        {mode === "range" && (
          <span
            className="text-sm font-medium flex gap-1"
            onClick={() => {
              setShowYearPicker(!showYearPicker);
              setShowMonthPicker(false);
              if (onCaptionLabelClicked) {
                onCaptionLabelClicked();
              }
            }}
          >
            <span>{formatMonthShort(month)}</span>
            <span
              onClick={(e) => {
                e.stopPropagation();
                setShowYearPicker(!showYearPicker);
                setShowMonthPicker(false);
                if (onCaptionLabelClicked) {
                  onCaptionLabelClicked();
                }
              }}
              className="hover:underline"
            >
              {formatYearNumeric(month)}
            </span>
          </span>
        )}
        {onCaptionLabelClicked && <ChevronDown strokeWidth={3} size={15} />}
      </div>
      <button
        type="button"
        onClick={() => {
          goToOffsetMonth(1);
        }}
        disabled={!canGoForward}
        className={cn("absolute right-1 bg-transparent hover:bg-accent rounded-md p-2", !canGoForward && "opacity-40 pointer-events-none")}
        aria-label={intl.formatMessage({
          id: "calendar.nav.nextMonth",
          defaultMessage: "Go to next month",
        })}
      >
        <ChevronRight className="h-4 w-4" />
      </button>
    </div>
  );

  const pickerProps = {
    ...restProps,
    month,
    ISOWeek,
    timeZone: "UTC",
    noonSafe: true,
    showOutsideDays,
    className: cn("flex justify-center", className),
    classNames,
    hideNavigation: true,
    ...(initialFocus && { initialFocus }),
    ...(modifiers && { modifiers }),
    ...(modifiersClassNames && { modifiersClassNames }),
  };

  return (
    <div onTouchStart={handleTouchStart} onTouchEnd={handleTouchEnd} style={{ touchAction: "pan-y" }}>
      {!showYearPicker && !showMonthPicker && <NavigationHeader />}
      {showYearPicker ? (
        <YearPicker
          value={month}
          onChange={(newDate) => {
            setMonth(newDate);
            setShowYearPicker(false);
            setShowMonthPicker(true);
          }}
          onCaptionLabelClicked={() => {
            setShowYearPicker(false);
          }}
          disableFutureNavigation={disableFutureNavigation}
          minDate={minDate}
        />
      ) : showMonthPicker ? (
        <MonthPicker
          value={month}
          onChange={(newDate) => {
            setMonth(newDate);
            setShowMonthPicker(false);
          }}
          onCaptionLabelClicked={() => {
            setShowMonthPicker(false);
          }}
          disableFutureNavigation={disableFutureNavigation}
          minDate={minDate}
        />
      ) : mode === "single" ? (
        <DayPicker {...pickerProps} mode="single" selected={selectedDate} onSelect={handleOnSelectSingle} />
      ) : (
        <DayPicker
          {...pickerProps}
          mode="range"
          selected={selected}
          onSelect={(_range, selectedDay, modifiers, e) => {
            const currentRange = selected;
            let nextRange: DateRange;
            if (rangeFocus === "from") {
              nextRange = { from: selectedDay, to: currentRange.to };
            } else {
              const from = currentRange.from ?? selectedDay;
              nextRange = selectedDay < from ? { from: selectedDay, to: from } : { from, to: selectedDay };
            }
            if (month.getMonth() !== selectedDay.getMonth() || month.getFullYear() !== selectedDay.getFullYear()) {
              setMonth(selectedDay);
            }
            handleOnSelectRange(nextRange, selectedDay, modifiers, e);
          }}
          modifiers={{
            ...(selected.from && {
              range_start: (d: Date) => isSameDay(d, selected.from!),
            }),
            ...(selected.to && {
              range_end: (d: Date) => isSameDay(d, selected.to!),
            }),
            ...(selected.from &&
              selected.to && {
                range_middle: (d: Date) => d > selected.from! && d < selected.to!,
              }),
            ...(selected.from &&
              rangeFocus === "from" && {
                focus_from: (d: Date) => isSameDay(d, selected.from!),
              }),
            ...(selected.to &&
              rangeFocus === "to" && {
                focus_to: (d: Date) => isSameDay(d, selected.to!),
              }),
          }}
          modifiersClassNames={{
            range_start:
              "bg-brand-200 rounded-full relative after:content-[''] after:absolute after:left-1/2 after:-translate-x-1/2 after:bottom-1 after:h-1 after:w-1 after:rounded-full after:bg-text-300/60",
            range_end:
              "bg-brand-200 rounded-full relative after:content-[''] after:absolute after:left-1/2 after:-translate-x-1/2 after:bottom-1 after:h-1 after:w-1 after:rounded-full after:bg-text-300/60",
            range_middle: "bg-brand-100/40",
            focus_from: "ring-2 ring-brand-200",
            focus_to: "ring-2 ring-brand-200",
          }}
        />
      )}
    </div>
  );
}

Calendar.displayName = "Calendar";

export { Calendar };
