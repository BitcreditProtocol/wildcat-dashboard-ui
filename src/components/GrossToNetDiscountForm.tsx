import React, { useEffect, useMemo, useState } from "react"
import { useForm } from "react-hook-form"
import Big from "big.js"
import { parseFloatSafe, parseIntSafe } from "@/utils/numbers"
import { daysBetween } from "@/utils/dates"
import { Act360 } from "@/utils/discount-util"
import { Button } from "./ui/button"
import { DrawerFooter, DrawerClose } from "./ui/drawer"
import { setItem, getItem } from "@/utils/local-storage" // , removeItem

interface CurrencyAmount {
  value: Big
  currency: string
}

interface CommonDiscountFormProps {
  startDate?: Date
  endDate: Date
  onSubmit: (values: FormResult) => void
}

type GrossToNetProps = CommonDiscountFormProps & {
  gross: CurrencyAmount
  submitButtonText?: string
  onConfirm?: () => void
  quoteId?: string
}

interface FormResult {
  days: number
  discountRate: Big
  net: CurrencyAmount
  gross: CurrencyAmount
}

interface FormValues {
  daysInput?: string
  discountRateInput?: string
}

const INPUT_DAYS_MIN_VALUE = 1
const INPUT_DAYS_MAX_VALUE = 360
const LOCAL_STORAGE_KEY_PREFIX = "offer-form-"

type GrossToNetFormValues = FormValues

const GrossToNetDiscountForm = ({
  startDate,
  endDate,
  gross,
  onSubmit,
  submitButtonText,
  quoteId,
}: GrossToNetProps) => {
  const [hasSetInitialDays, setHasSetInitialDays] = useState(false)

  const localStorageKey = quoteId ? `${LOCAL_STORAGE_KEY_PREFIX}${quoteId}` : null
  const {
    watch,
    register,
    setValue,
    handleSubmit,
    formState: { isValid, errors },
  } = useForm<GrossToNetFormValues>({
    mode: "all",
  })

  const blockDecimalInput = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if ([".", ",", "e", "E", "+", "-", "^"].includes(e.key)) {
      e.preventDefault()
      return
    }
  }
  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    const allowed = new Set([
      "Backspace",
      "Delete",
      "ArrowLeft",
      "ArrowRight",
      "ArrowUp",
      "ArrowDown",
      "Tab",
      "Home",
      "End",
    ])
    if (e.key === "Enter") {
      e.preventDefault()
      e.currentTarget.blur()
      return
    }
    if (allowed.has(e.key)) {
      return
    }
    if (e.key >= "0" && e.key <= "9") {
      return
    }
    e.preventDefault()
  }
  const blockNonDigitInput = (e: React.FormEvent<HTMLInputElement>) => {
    const native = e.nativeEvent as InputEvent
    const data = native.data
    if (native.type === "beforeinput") {
      if ((native.inputType === "insertText" || native.inputType === "insertCompositionText") && data && /\D/.test(data)) {
        e.preventDefault()
      }
    }
  }

  const handlePasteDigits = (e: React.ClipboardEvent<HTMLInputElement>) => {
    e.preventDefault()
    const text = e.clipboardData.getData("text") || ""
    const digits = text.replace(/[^\d]/g, "")
    const input = e.currentTarget
    const start = input.selectionStart ?? input.value.length
    const end = input.selectionEnd ?? input.value.length
    const before = input.value.slice(0, start)
    const after = input.value.slice(end)
    const next = (before + digits + after).replace(/[^\d]/g, "")
    input.value = next
    setValue("daysInput", next, { shouldValidate: true, shouldDirty: true })
    const caret = (before + digits).length
    try {
      input.setSelectionRange(caret, caret)
    } catch {
      // ignore
    }
  }

  const handleDrop = (e: React.DragEvent<HTMLInputElement>) => {
    e.preventDefault()
  }

  const { daysInput, discountRateInput } = watch()

  const days = useMemo<number | undefined>(() => {
    return parseIntSafe(daysInput)
  }, [daysInput])

  const discountRate = useMemo<Big | undefined>(() => {
    const parsed = parseFloatSafe(discountRateInput)
    return parsed === undefined ? undefined : new Big(parsed).div(new Big("100"))
  }, [discountRateInput])

  const [net, setNet] = useState<CurrencyAmount>()

  const discount = useMemo<CurrencyAmount | undefined>(() => {
    return net === undefined
      ? undefined
      : {
          value: net.value.sub(gross.value),
          currency: net.currency,
        }
  }, [gross, net])

  useEffect(() => {
    if (hasSetInitialDays) {
      return
    }

    if (localStorageKey) {
      const savedData = getItem<{ daysInput: string; discountRateInput: string }>(localStorageKey)
      if (savedData) {
        if (savedData.daysInput) {
          setValue("daysInput", savedData.daysInput, { shouldValidate: true })
        }
        if (savedData.discountRateInput) {
          setValue("discountRateInput", savedData.discountRateInput, { shouldValidate: true })
        }
        setHasSetInitialDays(true)
        return
      }
    }

    if (startDate !== undefined) {
      setValue("daysInput", String(Math.min(Math.max(1, daysBetween(startDate, endDate)), INPUT_DAYS_MAX_VALUE)), {
        shouldValidate: true,
        shouldDirty: true,
        shouldTouch: true,
      })
    }

    setHasSetInitialDays(true)
  }, [startDate, endDate, setValue, localStorageKey, hasSetInitialDays])

  useEffect(() => {
    if (!localStorageKey || !hasSetInitialDays) {
      return
    }

    if (daysInput || discountRateInput) {
      setItem(localStorageKey, {
        daysInput: daysInput ?? "",
        discountRateInput: discountRateInput ?? "",
      })
    }
  }, [localStorageKey, daysInput, discountRateInput, hasSetInitialDays])

  useEffect(() => {
    if (!isValid || discountRate === undefined || days === undefined) {
      setNet(undefined)
      return
    }

    const netValue = Act360.grossToNet(gross.value, discountRate, days)
    setNet({
      value: netValue,
      currency: gross.currency,
    })
  }, [isValid, gross, days, discountRate])

  const handleFormSubmit = () => {
    if (net === undefined || discountRate === undefined || days === undefined) {
      return
    }

    onSubmit({
      days,
      discountRate,
      net,
      gross,
    })
  }

  const handleIntegerInput = (e: React.FormEvent<HTMLInputElement>) => {
    const input = e.currentTarget
    const cleaned = input.value.replace(/[^\d]/g, "")
    if (input.value !== cleaned) {
      const caret = input.selectionStart ?? cleaned.length
      input.value = cleaned
      setValue("daysInput", cleaned, { shouldValidate: true, shouldDirty: true })
      const pos = Math.min(caret, cleaned.length)
      try {
        input.setSelectionRange(pos, pos)
      } catch {
        // ignore unsupported setSelectionRange
      }
    }
  }

  const parseDigitsToInt = (value: unknown) => {
    let str = ""
    if (typeof value === "string" || typeof value === "number") {
      str = String(value)
    }
    return str.replace(/[^\d]/g, "")
  }

  const validateMinInteger = (min: number, label: string) => (value?: string) => {
    if (value == null || value === "") return `${label} is required`
    if (!/^\d+$/.test(value)) return `${label} must be a whole number`
    const n = parseInt(value, 10)
    if (Number.isNaN(n)) return `${label} is invalid`
    if (n < min) return `${label} must be at least ${min}`
    if (n > INPUT_DAYS_MAX_VALUE) return `${label} must be at most ${INPUT_DAYS_MAX_VALUE}`
    return true
  }

  return (
    <>
      <form
        className="flex flex-col gap-6 min-w-[8rem] px-4"
        onSubmit={(e) => {
          handleSubmit(handleFormSubmit)(e).catch((err) => {
            console.error("Submit failed:", err)
          })
        }}
      >
        <div className="flex flex-col gap-4">
          <div className="flex flex-col gap-2">
            <div className="flex justify-between items-center bg-gray-50 dark:bg-gray-800 rounded-lg p-4 border border-gray-200 dark:border-gray-700">
              <label htmlFor="daysInput" className="text-sm font-medium text-gray-900 dark:text-gray-100">
                Days
              </label>
              <input
                id="daysInput"
                step="1"
                type="number"
                inputMode="numeric"
                className="text-right text-lg font-semibold bg-transparent focus:outline-none [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none text-gray-900 dark:text-gray-100 w-24"
                onKeyDown={(e) => {
                  blockDecimalInput(e)
                  handleKeyDown(e)
                }}
                onInput={handleIntegerInput}
                onBeforeInput={blockNonDigitInput}
                onPaste={handlePasteDigits}
                onDrop={handleDrop}
                enterKeyHint="next"
                {...register("daysInput", {
                  required: true,
                  min: INPUT_DAYS_MIN_VALUE,
                  max: INPUT_DAYS_MAX_VALUE,
                  setValueAs: parseDigitsToInt,
                  validate: validateMinInteger(INPUT_DAYS_MIN_VALUE, "Days"),
                })}
              />
            </div>
            {errors.daysInput && (
              <div className="text-xs text-red-500">
                Please enter a valid value between {INPUT_DAYS_MIN_VALUE} and {INPUT_DAYS_MAX_VALUE}.
              </div>
            )}
          </div>

          <div className="flex flex-col gap-2">
            <div className="flex justify-between items-center bg-gray-50 dark:bg-gray-800 rounded-lg p-4 border border-gray-200 dark:border-gray-700">
              <label htmlFor="discountRateInput" className="text-sm font-medium text-gray-900 dark:text-gray-100">
                Discount rate
              </label>
              <div className="flex gap-1 items-center">
                <input
                  id="discountRateInput"
                  step="0.0001"
                  type="number"
                  inputMode="numeric"
                  className="text-right text-lg font-semibold bg-transparent focus:outline-none [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none text-gray-900 dark:text-gray-100 w-20"
                  {...register("discountRateInput", {
                    required: true,
                    min: 0,
                    max: 99.9999,
                  })}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      e.preventDefault()
                      e.currentTarget.blur()
                    }
                  }}
                />
                <span className="text-lg font-semibold text-gray-900 dark:text-gray-100">%</span>
              </div>
            </div>
            {errors.discountRateInput && (
              <div className="text-xs text-red-500">
                Please enter a valid value between {0}% and {99.9999}%.
              </div>
            )}
          </div>

          <div className="flex justify-between items-center bg-gray-50 dark:bg-gray-800 rounded-lg p-4 border border-gray-200 dark:border-gray-700">
            <span className="text-sm font-medium text-gray-900 dark:text-gray-100">Net amount</span>
            <div className="flex gap-1 items-center">
              <span className="text-lg font-semibold text-green-600 dark:text-green-400">
                {net === undefined ? "?" : net.value.toNumber()}
              </span>
              <span className="text-xs font-medium text-gray-500 dark:text-gray-400">
                {net?.currency ?? gross.currency}
              </span>
            </div>
          </div>
        </div>

        <div className="flex flex-col gap-3 px-2">
          <div className="flex justify-between items-center text-sm">
            <span className="text-gray-600 dark:text-gray-400">Annual discount</span>
            <div className="flex gap-1 items-center">
              <span className="text-gray-600 dark:text-gray-400">
                {discount === undefined ? "0.00" : Math.abs(discount.value.toNumber()).toFixed(2)}
              </span>
              <span className="text-xs text-gray-500 dark:text-gray-500">{discount?.currency ?? gross.currency}</span>
            </div>
          </div>

          <div className="flex justify-between items-center text-base font-semibold">
            <span className="text-gray-900 dark:text-gray-100">Gross amount</span>
            <div className="flex gap-1 items-center">
              <span className="text-green-600 dark:text-green-400">+{gross.value.toNumber().toFixed(2)}</span>
              <span className="text-xs text-gray-500 dark:text-gray-500">{gross.currency}</span>
            </div>
          </div>
        </div>

        {submitButtonText && (
          <Button
            type="submit"
            size="sm"
            className="my-4"
            disabled={!isValid}
          >
            {submitButtonText}
          </Button>
        )}
      </form>

      <DrawerFooter className="pt-4">
        <Button
          className="w-full mb-1"
          size="sm"
          type="button"
          onClick={(e) => {
            e.preventDefault()
            e.stopPropagation()
            void (async () => {
              await handleSubmit(handleFormSubmit)()
            })().catch((err) => {
              console.error("Submit failed:", err)
            })
          }}
          disabled={!isValid || net === undefined || discountRate === undefined || days === undefined}
        >
          Confirm
        </Button>
        <DrawerClose asChild>
          <Button
            className="w-full"
            variant="outline"
            size="sm"
          >
            Cancel
          </Button>
        </DrawerClose>
      </DrawerFooter>
    </>
  )
}

export { GrossToNetDiscountForm }
