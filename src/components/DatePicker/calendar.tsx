import React, { useCallback, useEffect, useState } from "react";
import {
  DateRange,
  DayPicker,
  DayPickerRangeProps,
  isMatch,
  SelectRangeEventHandler,
  SelectSingleEventHandler,
} from "react-day-picker";
import { format, isSameDay } from "date-fns";
import { ChevronDown, ChevronLeft, ChevronRight } from "lucide-react";
import { useIntl } from "react-intl";

import { cn } from "@/lib/utils";
import { YearPicker } from "./yearPicker";
import { MonthPicker } from "./monthPicker";

export type CalendarProps = Omit<DayPickerRangeProps, "mode" | "onSelect" | "selected"> & {
  mode: "single" | "range"
  onSelect?: SelectRangeEventHandler
  selected: DateRange
  onCaptionLabelClicked?: () => void
  disableFutureNavigation?: boolean
  rangeFocus?: "from" | "to"
  className?: string
  ISOWeek?: boolean
  showOutsideDays?: boolean
  month?: Date
  initialFocus?: boolean
  modifiers?: Record<string, (date: Date) => boolean>
  modifiersClassNames?: Record<string, string>
}

const classNames = {
  root: "w-full",
  months: "",
  month_grid: "w-full border-collapse space-y-2",
  month: "w-full",
  weekday: "h-10 w-10 text-center",
  caption: "flex justify-center relative items-center hidden",
  caption_label: "text-sm font-medium hidden",
  nav: "space-x-1 flex items-center",
  nav_button: "",
  nav_button_previous: "absolute left-1 bg-transparent!",
  nav_button_next: "absolute right-1 bg-transparent!",
  table: "w-full h-full border-collapse space-y-1",
  head_row: "flex justify-around",
  head_cell: "text-muted-foreground rounded-md w-9 font-normal text-[0.8rem]",
  row: "flex w-full mt-1 justify-around",
  day_button: "h-10 w-10 text-center text-sm p-0 relative cursor-pointer hover:bg-accent/50 disabled:cursor-not-allowed disabled:opacity-50 [&:has([aria-selected].day-range-end)]:rounded-r-md [&:has([aria-selected].day-outside)]:bg-accent/50 [&:has([aria-selected])]:bg-accent first:[&:has([aria-selected])]:rounded-l-md last:[&:has([aria-selected])]:rounded-r-md focus-within:relative focus-within:z-20",
  selected: "bg-elevation-200 hover:bg-elevation-200 border border-divider-100",
  today: "bg-accent text-accent-foreground",
  outside: "day-outside text-muted-foreground aria-selected:bg-accent/50 aria-selected:text-muted-foreground",
  disabled: "text-muted-foreground opacity-50",
  range_middle: "aria-selected:bg-accent aria-selected:text-accent-foreground",
  hidden: "invisible",
}

function getNextDate(
  current: Date,
  offset: number,
  disabled?: (date: Date) => boolean
): Date | null {
  const year = current.getFullYear();
  const month = current.getMonth();
  const day = current.getDate();

  const daysInCurrentMonth = new Date(year, month + 1, 0).getDate();
  const isLastDay = day === daysInCurrentMonth;

  const targetMonthDate = new Date(year, month + offset, 1);
  const daysInTargetMonth = new Date(
    targetMonthDate.getFullYear(),
    targetMonthDate.getMonth() + 1,
    0
  ).getDate();

  const newDay = isLastDay
    ? daysInTargetMonth
    : Math.min(day, daysInTargetMonth);

  const newDate = new Date(
    targetMonthDate.getFullYear(),
    targetMonthDate.getMonth(),
    newDay
  );

  if (disabled?.(newDate)) {
    return null;
  }

  return newDate;
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
                    ...restProps
                  }: CalendarProps) {
  const intl = useIntl();
  const [selectedDate, setSelectedDate] = useState<Date | undefined>(
    selected.from
  );
  const [month, setMonth] = useState<Date>(selected.from ?? new Date());
  const [showYearPicker, setShowYearPicker] = useState(false);
  const [showMonthPicker, setShowMonthPicker] = useState(false);

  useEffect(() => {
    if (mode === "single") {
      if (selected.from) {
        setSelectedDate(selected.from);
        setMonth(selected.from);
      } else {
        setSelectedDate(undefined);
        setMonth(new Date());
      }
    } else {
      if (!selected.from && !selected.to) {
        setMonth(new Date());
        setSelectedDate(undefined);
      }
    }
  }, [selected, mode]);

  const handleOnSelectRange: SelectRangeEventHandler = (
    range,
    selectedDay,
    modifiers,
    e
  ) => {
    if (mode === "single") {
      setSelectedDate(selectedDay);
    }
    if (onSelect) {
      onSelect(range, selectedDay, modifiers, e);
    }
  };

  const handleOnSelectSingle: SelectSingleEventHandler = (
    day,
    selectedDay,
    modifiers,
    e
  ) => {
    handleOnSelectRange({ from: day }, selectedDay, modifiers, e);
  };

  const goToOffsetMonth = useCallback((offset: number) => {
    const disabledMatchers = restProps.disabled;
    const isDisabled = (date: Date) => {
      if (!disabledMatchers) {
        return false;
      }
      if (Array.isArray(disabledMatchers)) {
        return disabledMatchers.some((m) => isMatch(date, [m]));
      }

      return isMatch(date, [disabledMatchers]);
    };

    const newDate = getNextDate(month, offset, isDisabled);
    if (!newDate) {
      return;
    }
    setMonth(newDate);
  }, [month, restProps.disabled]);

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
    return (
      d.getFullYear() > today.getFullYear() || (d.getFullYear() === today.getFullYear() && d.getMonth() >= today.getMonth())
    );
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
        className={cn(
          "flex justify-between items-center gap-2 cursor-pointer hover:bg-accent rounded-md px-3 py-1"
        )}
        role="button"
        tabIndex={0}
      >
        {mode === "single" && selectedDate && (
          <span
            className="text-sm font-medium flex gap-1"
            onClick={() => {
              setShowYearPicker(!showYearPicker)
              setShowMonthPicker(false)
              if (onCaptionLabelClicked) {
                onCaptionLabelClicked()
              }
            }}
          >
            <span>{format(month, "MMM dd,")}</span>
            <span
              onClick={(e) => {
                e.stopPropagation()
                setShowYearPicker(!showYearPicker)
                setShowMonthPicker(false)
                if (onCaptionLabelClicked) {
                  onCaptionLabelClicked()
                }
              }}
            >
              {format(month, "yyyy")}
            </span>
          </span>
        )}
        {mode === "range" && (
          <span
            className="text-sm font-medium flex gap-1"
            onClick={() => {
              setShowYearPicker(!showYearPicker)
              setShowMonthPicker(false)
              if (onCaptionLabelClicked) {
                onCaptionLabelClicked()
              }
            }}
          >
            <span>{format(month, "MMM")}</span>
            <span
              onClick={(e) => {
                e.stopPropagation()
                setShowYearPicker(!showYearPicker)
                setShowMonthPicker(false)
                if (onCaptionLabelClicked) {
                  onCaptionLabelClicked()
                }
              }}
              className="hover:underline"
            >
              {format(month, "yyyy")}
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
        className={cn(
          "absolute right-1 bg-transparent hover:bg-accent rounded-md p-2",
          !canGoForward && "opacity-40 pointer-events-none"
        )}
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
    showOutsideDays,
    className: cn("flex justify-center", className),
    classNames,
    hideNavigation: true,
    ...(initialFocus && { initialFocus }),
    ...(modifiers && { modifiers }),
    ...(modifiersClassNames && { modifiersClassNames }),
  };

  return (
    <div
      onTouchStart={handleTouchStart}
      onTouchEnd={handleTouchEnd}
      style={{ touchAction: "pan-y" }}
    >
      {!showYearPicker && !showMonthPicker && <NavigationHeader />}
      {showYearPicker ? (
        <YearPicker
          value={month}
          onChange={(newDate) => {
            setMonth(newDate)
            if (mode === "single") {
              setSelectedDate(newDate)
              handleOnSelectSingle(newDate, newDate, {}, {} as React.MouseEvent<Element>)
            }
            setShowYearPicker(false)
            setShowMonthPicker(true)
          }}
          onCaptionLabelClicked={() => {
            setShowYearPicker(false)
          }}
          disableFutureNavigation={disableFutureNavigation}
        />
      ) : showMonthPicker ? (
        <MonthPicker
          value={month}
          onChange={(newDate) => {
            setMonth(newDate)
            if (mode === "single") {
              setSelectedDate(newDate)
              handleOnSelectSingle(newDate, newDate, {}, {} as React.MouseEvent<Element>)
            }
            setShowMonthPicker(false)
          }}
          onCaptionLabelClicked={() => {
            setShowMonthPicker(false)
          }}
          disableFutureNavigation={disableFutureNavigation}
        />
      ) : mode === "single" ? (
        <DayPicker
          {...pickerProps}
          mode="single"
          selected={selectedDate}
          onSelect={handleOnSelectSingle}
        />
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
            if (
              month.getMonth() !== selectedDay.getMonth() ||
              month.getFullYear() !== selectedDay.getFullYear()
            ) {
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
            ...(selected.from && selected.to && {
              range_middle: (d: Date) =>
                d > selected.from! && d < selected.to!,
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
            range_start: "bg-brand-200 rounded-full relative after:content-[''] after:absolute after:left-1/2 after:-translate-x-1/2 after:bottom-1 after:h-1 after:w-1 after:rounded-full after:bg-text-300/60",
            range_end: "bg-brand-200 rounded-full relative after:content-[''] after:absolute after:left-1/2 after:-translate-x-1/2 after:bottom-1 after:h-1 after:w-1 after:rounded-full after:bg-text-300/60",
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
