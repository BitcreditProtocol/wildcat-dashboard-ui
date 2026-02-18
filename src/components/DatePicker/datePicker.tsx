import React, { useContext, useEffect, useMemo, useState } from "react"
import { DateRange, dateMatchModifiers, type Matcher } from "react-day-picker"
import { FormattedMessage } from "react-intl"
import { addDays, isSameDay } from "date-fns"
import { ArrowRight, CalendarIcon } from "lucide-react"

import { Calendar } from "@/components/DatePicker/calendar"
import { Button } from "@/components/ui/button"
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { LanguageContext } from "@/context/language/LanguageContext"
import { cn } from "@/lib/utils"
import { daysBetween, formatDateLong, formatDateShort } from "@/utils/dates"
import { useUtcDateFormatters } from "@/hooks/use-utc-date-formatters"

import { DateRangeDropdown } from "./dataRangeDropdown"
import { MonthPicker } from "./monthPicker"
import { YearPicker } from "./yearPicker"

interface DatePickerProps {
  className?: string
  label?: string
  mode: "single" | "range"
  value?: DateRange
  onChange: (dateRange: DateRange | undefined) => void
  customComponent?: React.ReactElement
  disabled?: Matcher | Matcher[] | undefined
  displayIncrementButtons?: boolean
  disableFutureNavigation?: boolean
  disableAutoSelect?: boolean
  currentYearPosition?: "start" | "center" | "end"
  order?: "asc" | "desc"
  dateFilterType?: "issue" | "maturity"
  onDateFilterTypeChange?: (type: "issue" | "maturity") => void
}

export function DatePicker({
  label,
  mode,
  value,
  onChange,
  customComponent,
  disabled,
  displayIncrementButtons = false,
  className,
  disableFutureNavigation = false,
  disableAutoSelect = true,
  currentYearPosition = "start",
  order = "asc",
  dateFilterType = "issue",
  onDateFilterTypeChange,
}: DatePickerProps) {
  const lang = useContext(LanguageContext)
  const { formatDateMmmDdYyyy } = useUtcDateFormatters(lang.locale)
  const [canSelect, setCanSelect] = useState(false)
  const [showCalendar, setShowCalendar] = useState(false)
  const [showYearPicker, setShowYearPicker] = useState(false)
  const [showMonthPicker, setShowMonthPicker] = useState(false)
  const [selectedRange, setSelectedRange] = useState<number>()
  const allowRangeSelection = useMemo(() => mode === "range", [mode])
  const [hasBeenCleared, setHasBeenCleared] = useState(false)

  const getInitialDate = () => {
    if (value) {
      return value
    }
    if (hasBeenCleared) {
      return { from: undefined, to: undefined }
    }
    if (disableAutoSelect) {
      return { from: undefined, to: undefined }
    }
    return { from: new Date(), to: undefined }
  }

  const [current, setCurrent] = useState<DateRange>(getInitialDate())
  const [draft, setDraft] = useState<DateRange>(getInitialDate())
  const [rangeFocus, setRangeFocus] = useState<"from" | "to">("from")
  const baseDate = useMemo(() => current.from ?? new Date(), [current])

  useEffect(() => {
    if (value) {
      setCurrent(value)
      setDraft(value)
      setHasBeenCleared(false)
    }
  }, [value])

  const toggleCalendar = () => {
    setShowCalendar((prev) => {
      const willOpen = !prev

      if (willOpen) {
        setDraft(current)
      }

      return willOpen
    })
  }

  const toggleYearPicker = () => {
    setShowYearPicker((prev) => !prev)
  }

  const clearSelection = () => {
    const clearedRange: DateRange = { from: draft.from ?? current.from, to: undefined }
    setSelectedRange(undefined)
    setDraft(clearedRange)
    setCurrent(clearedRange)
    onChange(clearedRange)
    setHasBeenCleared(true)
    setRangeFocus("to")
    setShowMonthPicker(false)
    setShowYearPicker(false)
  }

  useEffect(() => {
    if (selectedRange === undefined) {
      return
    }

    const startDate = draft.from ?? current.from ?? new Date()
    const newRange = {
      from: startDate,
      to: addDays(startDate, selectedRange),
    }

    setCurrent(newRange)
    setDraft(newRange)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedRange])

  useEffect(() => {
    setSelectedRange((val) => {
      if (current.from === undefined || current.to === undefined) {
        return val
      }
      const diffDays = daysBetween(current.from, current.to)
      return diffDays !== val ? undefined : val
    })
  }, [current])

  useEffect(() => {
    if (!draft.from) {
      setCanSelect(false)
      return
    }

    // single mode
    if (mode === "single") {
      const isDisabled = disabled ? dateMatchModifiers(draft.from, [disabled as Matcher]) : false
      setCanSelect(!isDisabled)
    }

    // range mode
    if (mode === "range") {
      if (!draft.to) {
        setCanSelect(false)
        return
      }
      const isDisabledFrom = disabled ? dateMatchModifiers(draft.from, [disabled as Matcher]) : false
      const isDisabledTo = disabled ? dateMatchModifiers(draft.to, [disabled as Matcher]) : false
      setCanSelect(!isDisabledFrom && !isDisabledTo)
    }
  }, [draft, disabled, mode])

  return (
    <>
      {customComponent ? (
        React.cloneElement(customComponent, { onClick: toggleCalendar } as React.HTMLAttributes<HTMLElement>)
      ) : (
        <Button
          variant="outline"
          className={
            "w-full flex gap-1.5 justify-start items-center bg-elevation-200 text-sm font-medium peer h-[58px] rounded-lg border-divider-50 p-4"
          }
          onClick={toggleCalendar}
        >
          <CalendarIcon className="text-text-300 w-5 h-5" strokeWidth={1} />

          {mode === "single" ? (
            current.from ? (
              formatDateLong(current.from, lang.locale)
            ) : (
              label
            )
          ) : (
            <>
              {current.from && formatDateShort(current.from, lang.locale)}
              <span>-</span>
              {current.to && formatDateShort(current.to, lang.locale)}
            </>
          )}
        </Button>
      )}

      <div
        className={cn(
          "fixed inset-0 bg-black/30 transition-opacity duration-300 max-w-[375px] mx-auto z-10",
          showCalendar ? "opacity-100" : "opacity-0 pointer-events-none",
        )}
        onClick={() => {
          setShowCalendar(false)
        }}
      />

      <div
        {...(!showCalendar ? { inert: true } : {})}
        className={cn(
          `fixed bottom-0 z-10 left-1/2 -translate-x-1/2 max-w-[375px] w-full h-auto max-h-[62.5vh] bg-elevation-50 dark:bg-elevation-250 p-3 transition-transform duration-300 ease-in-out rounded-t-2xl justify-center overflow-y-auto`,
          showCalendar ? "translate-y-0" : "translate-y-full",
          className,
        )}
      >
        <div className="flex flex-col gap-2 min-h-full">
          <div className="flex flex-col gap-2">
            {allowRangeSelection ? (
              <>
                <div className="text-xs text-text-200">
                  <FormattedMessage
                    id="bills.list.filter.by"
                    defaultMessage="Filter by"
                    description="Header label for picking which date should be filtered by in datepicker form"
                  />
                </div>

                <Tabs
                  value={dateFilterType}
                  onValueChange={(value) => {
                    if (onDateFilterTypeChange) {
                      onDateFilterTypeChange(value as "issue" | "maturity")
                    }
                  }}
                  className="w-full"
                >
                  <TabsList className="gap-0.5 w-full p-0 border-divider-50 bg-elevation-200">
                    <TabsTrigger value="issue" className="flex items-center gap-1 py-2 bg-transparent">
                      <FormattedMessage
                        id="bills.list.filter.date.issue"
                        defaultMessage="Issue date"
                        description="Filter by issue date"
                      />
                    </TabsTrigger>
                    <TabsTrigger value="maturity" className="flex items-center gap-1 py-2 bg-transparent">
                      <FormattedMessage
                        id="bills.list.filter.date.maturity"
                        defaultMessage="Maturity date"
                        description="Filter by maturity date"
                      />
                    </TabsTrigger>
                  </TabsList>
                </Tabs>

                <div className="text-xs text-text-200">
                  <FormattedMessage
                    id="Select date range"
                    defaultMessage="Select date range"
                    description="Header label for picking date range in datepicker form"
                  />
                </div>

                <DateRangeDropdown
                  value={selectedRange}
                  onRangeChange={setSelectedRange}
                  onClear={() => {
                    clearSelection()
                  }}
                />

                <div className="grid grid-cols-9 text-sm">
                  <div className="col-span-4">
                    <button
                      type="button"
                      onClick={() => {
                        setRangeFocus("from")
                      }}
                      className={cn(
                        "h-[46px] py-3 px-4 w-full bg-elevation-200 border rounded-lg truncate text-left",
                        rangeFocus === "from" ? "border-brand-200" : "border-gray-200",
                      )}
                    >
                      {draft.from && formatDateShort(draft.from, lang.locale)}
                      {!draft.from && (
                        <span className="text-text-200">
                          <FormattedMessage id="range.start" defaultMessage="Start" />
                        </span>
                      )}
                    </button>
                  </div>

                  <div className="col-auto flex justify-center items-center">
                    <ArrowRight className="text-text-200" strokeWidth={1} size={24} />
                  </div>

                  <div className="col-span-4">
                    <button
                      type="button"
                      onClick={() => {
                        setRangeFocus("to")
                      }}
                      className={cn(
                        "h-[46px] py-3 pl-4 pr-2 w-full bg-elevation-200 border rounded-lg truncate text-left",
                        rangeFocus === "to" ? "border-brand-200" : "border-gray-200",
                      )}
                    >
                      {draft.to && formatDateShort(draft.to, lang.locale)}
                      {!draft.to && (
                        <span className="text-text-200">
                          <FormattedMessage id="range.end" defaultMessage="End" />
                        </span>
                      )}
                    </button>
                  </div>
                </div>
              </>
            ) : (
              <div className="flex flex-col gap-1">
                <div className="flex items-center justify-between">
                  <div className="text-xs text-text-200">
                    <FormattedMessage
                      id="calendar.date.picker.selected.date"
                      defaultMessage="Selected date"
                      description="Header label for picking single date in datepicker form"
                    />
                  </div>
                  {displayIncrementButtons && (
                    <div className="flex items-center gap-0.5">
                      {[30, 60, 90, 120].map((days) => (
                        <button
                          key={days}
                          className="bg-elevation-200/70 p-1.5 rounded-sm text-text-300 text-[10px] font-medium"
                          onClick={() => {
                            const base = current.from ?? new Date() // always start from confirmed date
                            const newDate = addDays(base, days)

                            setDraft({
                              from: newDate,
                              to: mode === "range" ? addDays(newDate, days) : undefined,
                            })
                          }}
                        >
                          +{days}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
                <div className="text-base">{current.from ? formatDateMmmDdYyyy(current.from) : "-"}</div>
              </div>
            )}
          </div>

          <div className="mb-4">
            {showYearPicker && (
              <YearPicker
                value={draft.from ?? baseDate}
                onChange={(date) => {
                  setDraft({
                    ...draft,
                    from: date,
                  })
                  setShowYearPicker(false)
                  setShowMonthPicker(true)
                }}
                onCaptionLabelClicked={() => {
                  setShowYearPicker(false)
                  setShowMonthPicker(false)
                }}
                disableFutureNavigation={disableFutureNavigation}
                currentYearPosition={currentYearPosition}
                order={order}
              />
            )}
            {showMonthPicker && (
              <MonthPicker
                value={draft.from ?? baseDate}
                onChange={(date) => {
                  setDraft({
                    ...draft,
                    from: date,
                  })
                  setShowYearPicker(false)
                  setShowMonthPicker(false)
                }}
                onCaptionLabelClicked={() => {
                  setShowYearPicker(true)
                  setShowMonthPicker(false)
                }}
                disableFutureNavigation={disableFutureNavigation}
              />
            )}
            {!showYearPicker && !showMonthPicker && (
              <Calendar
                mode={mode}
                selected={draft}
                month={draft.from ?? new Date()}
                onCaptionLabelClicked={toggleYearPicker}
                onSelect={(_ignored: DateRange | undefined, selectedDay) => {
                  setDraft((prev) => {
                    if (rangeFocus === "from") {
                      const newTo = prev.to && selectedDay <= prev.to ? prev.to : undefined
                      return { from: selectedDay, to: newTo }
                    }
                    const from = prev.from ?? selectedDay
                    return selectedDay < from ? { from: selectedDay, to: from } : { from, to: selectedDay }
                  })
                  setRangeFocus((prevFocus) => (prevFocus === "from" ? "to" : "from"))
                }}
                initialFocus
                disabled={disabled}
                disableFutureNavigation={disableFutureNavigation}
                modifiers={{
                  saved: (d) => !!current.from && isSameDay(d, current.from),
                }}
                modifiersClassNames={{
                  saved:
                    "relative after:content-[''] after:absolute after:left-1/2 after:-translate-x-1/2 after:bottom-1 after:h-1 after:w-1 after:rounded-full after:bg-text-300/60",
                }}
                rangeFocus={rangeFocus}
              />
            )}
          </div>

          <div className="flex gap-1 items-center">
            <Button
              className="w-full border-text-300"
              variant="outline"
              size="sm"
              type="button"
              onClick={() => {
                setShowMonthPicker(false)
                setShowYearPicker(false)
                setShowCalendar(false)
              }}
            >
              <FormattedMessage
                id="Cancel"
                defaultMessage="Cancel"
                description="Cancel button text in datepicker form"
              />
            </Button>
            <Button
              className="w-full"
              size="sm"
              type="button"
              disabled={!canSelect || draft.from === undefined || (mode === "range" && draft.to === undefined)}
              onClick={() => {
                setCurrent(draft)
                onChange(draft)
                setShowMonthPicker(false)
                setShowYearPicker(false)
                setShowCalendar(false)
              }}
            >
              <FormattedMessage
                id="Confirm"
                defaultMessage="Confirm"
                description="Confirm button text in datepicker form"
              />
            </Button>
          </div>
        </div>
      </div>
    </>
  )
}
