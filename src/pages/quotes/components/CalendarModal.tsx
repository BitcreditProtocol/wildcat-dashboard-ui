import { useState } from "react";
import { AppIcon, Calendar, Text, YearPicker, MonthPicker } from "@bitcredit/ui-library";
import { Button } from "@bitcredit/ui-library";
import { CalendarIcon } from "lucide-react";
import { isAfter, isBefore, isSameDay } from "date-fns";
import { cn } from "@bitcredit/ui-library";
import { useIntl } from "react-intl";
import { useUtcDateFormatters } from "@/hooks/use-utc-date-formatters";
import { addUtcDays, calendarDayToUtc, utcToCalendarDay } from "@/utils/dates";

interface CalendarModalProps {
  isOpen: boolean;
  selectedDate?: Date;
  draftDate?: Date;
  title: string;
  minDate?: Date;
  maxDate?: Date;
  onClose: () => void;
  onDateChange: (date: Date) => void;
  onConfirm: () => void;
  onCancel: () => void;
}

export function CalendarModal({
  isOpen,
  selectedDate,
  draftDate,
  title,
  minDate,
  maxDate,
  onClose,
  onDateChange,
  onConfirm,
  onCancel,
}: CalendarModalProps) {
  const intl = useIntl();
  const { formatDateMmmDdYyyy } = useUtcDateFormatters(intl.locale);
  const [showYearPicker, setShowYearPicker] = useState(false);
  const [showMonthPicker, setShowMonthPicker] = useState(false);
  // `month` and every date handed to / received from the calendar live in the library's
  // local-time domain; the props and callbacks of this component are UTC.
  const [month, setMonth] = useState<Date>(utcToCalendarDay(draftDate ?? selectedDate ?? minDate ?? new Date()));

  const fallbackMin = addUtcDays(new Date(Date.now()), 1);
  const minDay = utcToCalendarDay(minDate ?? fallbackMin);
  const maxDay = maxDate ? utcToCalendarDay(maxDate) : null;
  const disabled = (date: Date) => isBefore(date, minDay) || (maxDay ? isAfter(date, maxDay) : false);
  const activeDate = draftDate ?? selectedDate;

  return (
    <>
      <div
        className={cn(
          "fixed inset-0 bg-black/30 transition-opacity duration-300 z-40",
          isOpen ? "opacity-100" : "opacity-0 pointer-events-none"
        )}
        onClick={onClose}
      />

      <div
        className={cn(
          "fixed bottom-0 z-40 left-0 right-0 w-full bg-elevation-200 transition-transform duration-300 ease-in-out rounded-t-2xl",
          isOpen ? "translate-y-0" : "translate-y-full"
        )}
      >
        <div
          {...(!isOpen ? { inert: true } : {})}
          className="mx-auto max-w-[375px] w-full h-auto max-h-[62.5vh] p-3 justify-center overflow-y-auto"
        >
          <div className="flex flex-col gap-4 min-h-full">
            <div className="text-xs text-text-200">{title}</div>
            <Text as="div" variant="body">
              {draftDate ? formatDateMmmDdYyyy(draftDate) : "-"}
            </Text>

            {showYearPicker ? (
              <YearPicker
                value={month}
                onChange={(newDate) => {
                  setMonth(newDate);
                  setShowYearPicker(false);
                  setShowMonthPicker(true);
                }}
                onCaptionLabelClicked={() => setShowYearPicker(false)}
              />
            ) : showMonthPicker ? (
              <MonthPicker
                value={month}
                onChange={(newDate) => {
                  setMonth(newDate);
                  setShowMonthPicker(false);
                }}
                onCaptionLabelClicked={() => setShowMonthPicker(false)}
              />
            ) : (
              <Calendar
                mode="single"
                month={month}
                selected={{ from: activeDate ? utcToCalendarDay(activeDate) : undefined }}
                onCaptionLabelClicked={() => setShowYearPicker(true)}
                onSelect={(_range, selectedDay) => {
                  if (selectedDay) {
                    onDateChange(calendarDayToUtc(selectedDay));
                  }
                }}
                disabled={disabled}
                isFutureNavigationDisabled={false}
                modifiers={{
                  saved: (d) => !!selectedDate && isSameDay(d, utcToCalendarDay(selectedDate)),
                }}
                modifiersClassNames={{
                  saved:
                    "relative after:content-[''] after:absolute after:left-1/2 after:-translate-x-1/2 after:bottom-1 after:h-1 after:w-1 after:rounded-full after:bg-text-300/60",
                }}
              />
            )}

            <div className="flex gap-2 items-center mt-auto">
              <Button className="w-full border-text-300 max-w-sm" variant="outline" size="sm" type="button" onClick={onCancel}>
                {intl.formatMessage({
                  id: "Cancel",
                  defaultMessage: "Cancel",
                })}
              </Button>
              <Button className="w-full max-w-sm" size="sm" type="button" disabled={!draftDate} onClick={onConfirm}>
                {intl.formatMessage({
                  id: "Confirm",
                  defaultMessage: "Confirm",
                })}
              </Button>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}

interface DatePickerButtonProps {
  date?: Date;
  onClick: () => void;
}

export function DatePickerButton({ date, onClick }: DatePickerButtonProps) {
  const intl = useIntl();
  const { formatDateMmmDdYyyy } = useUtcDateFormatters(intl.locale);

  return (
    <button
      type="button"
      onClick={onClick}
      className="w-full cursor-pointer flex gap-2 justify-between items-center bg-gray-50 dark:bg-gray-800 rounded-lg p-4 border border-gray-200 dark:border-gray-700 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
    >
      <AppIcon icon={CalendarIcon} size="md" weight="default" className="text-gray-500 dark:text-gray-400" />
      <span className="text-gray-900 dark:text-gray-100">
        {date
          ? formatDateMmmDdYyyy(date)
          : intl.formatMessage({
              id: "quotes.calendar.selectDate",
              defaultMessage: "Select date",
            })}
      </span>
    </button>
  );
}
