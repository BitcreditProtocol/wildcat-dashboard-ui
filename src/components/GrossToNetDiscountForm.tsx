import { LabelHTMLAttributes, PropsWithChildren, useEffect, useMemo, useState } from "react"
import { useForm } from "react-hook-form"
import Big from "big.js"
import { cn } from "@/lib/utils"
import { parseFloatSafe, parseIntSafe } from "@/utils/numbers"
import { daysBetween } from "@/utils/dates"
import { Act360 } from "@/utils/discount-util"
import { Button } from "./ui/button"

type InputContainerProps = PropsWithChildren<{
  htmlFor: LabelHTMLAttributes<HTMLLabelElement>["htmlFor"]
  label: React.ReactNode
}>

const InputContainer = ({ children, htmlFor, label }: InputContainerProps) => {
  return (
    <div
      className={cn(
        "flex gap-2 justify-between items-center font-semibold",
        "peer flex h-[58px] w-full rounded-[8px] border bg-elevation-200 px-4 text-sm transition-all duration-200 ease-in-out outline-none focus:outline-none",
        "file:border-0 file:bg-transparent file:text-sm file:font-medium file:text-foreground placeholder:text-muted-foreground focus-visible:ring-0",
      )}
    >
      <label htmlFor={htmlFor}>{label}</label>
      {children}
    </div>
  )
}

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

type GrossToNetFormValues = FormValues

const GrossToNetDiscountForm = ({ startDate, endDate, gross, onSubmit }: GrossToNetProps) => {
  const {
    watch,
    register,
    setValue,
    handleSubmit,
    formState: { isValid, errors },
  } = useForm<GrossToNetFormValues>({
    mode: "all",
  })

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
    if (startDate === undefined) return
    setValue("daysInput", String(Math.min(daysBetween(startDate, endDate), INPUT_DAYS_MAX_VALUE)), {
      shouldValidate: true,
      shouldDirty: true,
      shouldTouch: true,
    })
  }, [startDate, endDate, setValue])

  useEffect(() => {
    if (!isValid || discountRate === undefined || days === undefined) {
      setNet(undefined)
      return
    }

    setNet({
      value: Act360.grossToNet(gross.value, discountRate, days),
      currency: gross.currency,
    })
  }, [isValid, gross, days, discountRate])

  return (
    <form
      className="flex flex-col gap-2 min-w-[8rem]"
      onSubmit={(e) => {
        handleSubmit(() => {
          if (net === undefined || discountRate === undefined || days === undefined) return

          onSubmit({
            days,
            discountRate,
            net,
            gross,
          })
        })(e).catch(() => {
          // TODO
        })
      }}
    >
      <div className="flex flex-col">
        <InputContainer htmlFor="daysInput" label={<>Days</>}>
          <input
            id="daysInput"
            step="1"
            type="number"
            className="bg-transparent text-right focus:outline-none [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
            {...register("daysInput", {
              required: true,
              min: INPUT_DAYS_MIN_VALUE,
              max: INPUT_DAYS_MAX_VALUE,
            })}
          />
        </InputContainer>
        {errors.daysInput && (
          <div className="text-[10px] text-signal-error">
            <>
              Please enter a valid value between {INPUT_DAYS_MIN_VALUE} and {INPUT_DAYS_MAX_VALUE}.
            </>
          </div>
        )}
      </div>

      <div className="flex flex-col">
        <InputContainer htmlFor="discountRateInput" label={<>Discount rate</>}>
          <div className="flex gap-0.5">
            <input
              id="discountRateInput"
              step="0.0001"
              type="number"
              className="bg-transparent text-right focus:outline-none [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
              {...register("discountRateInput", {
                required: true,
                min: 0,
                max: 99.9999,
              })}
            />
            %
          </div>
        </InputContainer>
        {errors.discountRateInput && (
          <div className="text-[10px] text-signal-error">
            <>
              Please enter a valid value between {0}% and {99.9999}%.
            </>
          </div>
        )}
      </div>

      <div className="mt-1 flex justify-between items-center text-sm text-text-200 font-medium">
        <>Gross amount</>

        <div className="flex gap-1 items-center">
          {gross.value.toNumber()}
          <span className="text-[10px] text-text-200 leading-3">{gross.currency}</span>
        </div>
      </div>

      <div className="flex justify-between text-sm text-text-200 font-medium">
        <>Discount</>

        <div className="flex gap-1 items-center">
          {discount === undefined ? <>?</> : <>{discount.value.toNumber()}</>}
          <span className="text-[10px] text-text-200 leading-3">{discount?.currency}</span>
        </div>
      </div>

      <div className="flex justify-between items-center text-md text-text-300 font-semibold">
        <>Net amount</>

        <div className="flex gap-1 items-center">
          {net === undefined ? <>?</> : <>{net.value.toNumber()}</>}
          <span className="font-medium text-[10px] text-text-200 leading-3">{net?.currency}</span>
        </div>
      </div>

      <Button type="submit" size="sm" className="my-[16px]" disabled={!isValid}>
        Confirm
      </Button>
    </form>
  )
}

export { GrossToNetDiscountForm }
