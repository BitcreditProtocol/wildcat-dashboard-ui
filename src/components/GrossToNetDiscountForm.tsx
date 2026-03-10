import React, { useEffect, useMemo, useRef, useState } from "react";
import { useForm } from "react-hook-form";
import Big from "big.js";
import { parseFloatSafe, parseIntSafe } from "@/utils/numbers";
import { daysBetween } from "@/utils/dates";
import { Act360 } from "@/utils/discount-util";
import { Button } from "./ui/button";
import { DrawerFooter, DrawerClose } from "./ui/drawer";
import { setItem, getItem } from "@/utils/local-storage"; // , removeItem
import { useIntl } from "react-intl";

interface CurrencyAmount {
  value: Big;
  currency: string;
}

interface CommonDiscountFormProps {
  startDate?: Date;
  endDate: Date;
  onSubmit: (values: FormResult) => void;
}

type GrossToNetProps = CommonDiscountFormProps & {
  gross: CurrencyAmount;
  submitButtonText?: string;
  onConfirm?: () => void;
  quoteId?: string;
};

interface FormResult {
  days: number;
  discountRate: Big;
  net: CurrencyAmount;
  gross: CurrencyAmount;
}

interface FormValues {
  daysInput?: string;
  discountRateInput?: string;
  netInput?: string;
}

const INPUT_DAYS_MIN_VALUE = 1;
const INPUT_DAYS_MAX_VALUE = 360;
const LOCAL_STORAGE_KEY_PREFIX = "offer-form-";
const NET_INPUT_DECIMALS = 2;

type GrossToNetFormValues = FormValues;

const GrossToNetDiscountForm = ({
  startDate,
  endDate,
  gross,
  onSubmit,
  submitButtonText,
  quoteId,
}: GrossToNetProps) => {
  const intl = useIntl();
  const [hasSetInitialDays, setHasSetInitialDays] = useState(false);
  const [lastEdited, setLastEdited] = useState<"rate" | "net" | null>(null);
  const isSat = gross.currency === "sat";
  const daysLabel = intl.formatMessage({
    id: "discountForm.days",
    defaultMessage: "Days",
  });
  const discountRateLabel = intl.formatMessage({
    id: "discountForm.discountRate",
    defaultMessage: "Fee rate",
  });
  const netAmountLabel = intl.formatMessage({
    id: "discountForm.netAmount",
    defaultMessage: "Net amount",
  });
  const annualDiscountLabel = intl.formatMessage({
    id: "discountForm.annualDiscount",
    defaultMessage: "Annual fee",
  });
  const grossAmountLabel = intl.formatMessage({
    id: "discountForm.grossAmount",
    defaultMessage: "Gross amount",
  });

  const parseDigitsToInt = (value: unknown) => {
    let str = "";
    if (typeof value === "string" || typeof value === "number") {
      str = String(value);
    }
    return str.replace(/\D/g, "");
  };

  const validateNetAmount = (value?: string) => {
    if (value == null || value === "") {
      return intl.formatMessage({
        id: "discountForm.validation.net.required",
        defaultMessage: "Net amount is required",
      });
    }

    const parsed = isSat ? parseIntSafe(value) : parseFloatSafe(value);
    if (parsed === undefined || Number.isNaN(parsed)) {
      return intl.formatMessage({
        id: "discountForm.validation.net.invalid",
        defaultMessage: "Net amount must be a valid number",
      });
    }
    if (parsed < 1) {
      return intl.formatMessage(
        {
          id: "discountForm.validation.net.min",
          defaultMessage: "Net amount must be at least {min}",
        },
        { min: 1 },
      );
    }
    if (new Big(parsed).gt(gross.value)) {
      return intl.formatMessage({
        id: "discountForm.validation.net.maxGross",
        defaultMessage: "Net amount cannot exceed gross amount",
      });
    }

    return true;
  };

  const validateMinInteger =
    (min: number, label: string) => (value?: string) => {
      if (value == null || value === "") {
        return intl.formatMessage(
          {
            id: "discountForm.validation.required",
            defaultMessage: "{label} is required",
          },
          { label },
        );
      }
      if (!/^\d+$/.test(value)) {
        return intl.formatMessage(
          {
            id: "discountForm.validation.wholeNumber",
            defaultMessage: "{label} must be a whole number",
          },
          { label },
        );
      }

      const n = parseInt(value, 10);
      if (Number.isNaN(n)) {
        return intl.formatMessage(
          {
            id: "discountForm.validation.invalid",
            defaultMessage: "{label} is invalid",
          },
          { label },
        );
      }
      if (n < min) {
        return intl.formatMessage(
          {
            id: "discountForm.validation.min",
            defaultMessage: "{label} must be at least {min}",
          },
          { label, min },
        );
      }
      if (n > INPUT_DAYS_MAX_VALUE) {
        return intl.formatMessage(
          {
            id: "discountForm.validation.max",
            defaultMessage: "{label} must be at most {max}",
          },
          { label, max: INPUT_DAYS_MAX_VALUE },
        );
      }

      return true;
    };

  const localStorageKey = quoteId
    ? `${LOCAL_STORAGE_KEY_PREFIX}${quoteId}`
    : null;
  const {
    watch,
    register,
    setValue,
    handleSubmit,
    formState: { isValid, errors },
  } = useForm<GrossToNetFormValues>({
    mode: "all",
  });
  const discountRateRegister = register("discountRateInput", {
    required: true,
    min: 0,
    max: 99.9999,
  });
  const netInputRegister = register("netInput", {
    required: true,
    setValueAs: isSat ? parseDigitsToInt : undefined,
    validate: validateNetAmount,
  });

  const blockDecimalInput = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if ([".", ",", "e", "E", "+", "-", "^"].includes(e.key)) {
      e.preventDefault();
      return;
    }
  };
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
    ]);
    if (e.key === "Enter") {
      e.preventDefault();
      e.currentTarget.blur();
      return;
    }
    if (allowed.has(e.key)) {
      return;
    }
    if (e.key >= "0" && e.key <= "9") {
      return;
    }
    e.preventDefault();
  };
  const blockNonDigitInput = (e: React.SyntheticEvent<HTMLInputElement>) => {
    const native = e.nativeEvent as InputEvent;
    const data = native.data;
    if (native.type === "beforeinput") {
      if (
        (native.inputType === "insertText" ||
          native.inputType === "insertCompositionText") &&
        data &&
        /\D/.test(data)
      ) {
        e.preventDefault();
      }
    }
  };

  const handlePasteDigitsFor =
    (field: "daysInput" | "netInput") =>
    (e: React.ClipboardEvent<HTMLInputElement>) => {
      e.preventDefault();
      const text = e.clipboardData.getData("text") || "";
      const digits = text.replace(/\D/g, "");
      const input = e.currentTarget;
      const start = input.selectionStart ?? input.value.length;
      const end = input.selectionEnd ?? input.value.length;
      const before = input.value.slice(0, start);
      const after = input.value.slice(end);
      const next = (before + digits + after).replace(/\D/g, "");
      input.value = next;
      setValue(field, next, { shouldValidate: true, shouldDirty: true });
      if (field === "netInput") {
        setLastEdited("net");
      }
      const caret = (before + digits).length;
      try {
        input.setSelectionRange(caret, caret);
      } catch {
        // ignore
      }
    };

  const handleDrop = (e: React.DragEvent<HTMLInputElement>) => {
    e.preventDefault();
  };

  const { daysInput, discountRateInput, netInput } = watch();

  const days = useMemo<number | undefined>(() => {
    return parseIntSafe(daysInput);
  }, [daysInput]);

  const discountRate = useMemo<Big | undefined>(() => {
    const parsed = parseFloatSafe(discountRateInput);
    return parsed === undefined
      ? undefined
      : new Big(parsed).div(new Big("100"));
  }, [discountRateInput]);

  const [net, setNet] = useState<CurrencyAmount>();
  const skipNetToRateRef = useRef(false);

  const netInputValue = useMemo<Big | undefined>(() => {
    if (netInput == null || netInput === "") {
      return undefined;
    }
    if (isSat) {
      const parsed = parseIntSafe(netInput);
      return parsed === undefined ? undefined : new Big(parsed);
    }
    const parsed = parseFloatSafe(netInput);
    return parsed === undefined ? undefined : new Big(parsed);
  }, [netInput, isSat]);

  const discount = useMemo<CurrencyAmount | undefined>(() => {
    return net === undefined
      ? undefined
      : {
          value: net.value.sub(gross.value),
          currency: net.currency,
        };
  }, [gross, net]);

  const prevNetInputRef = useRef<string | undefined>(undefined);

  const formatAmount = (value: Big, currency: string) => {
    if (currency === "sat") {
      return value.round(0, Big.roundDown).toFixed(0);
    }
    return value.toFixed(NET_INPUT_DECIMALS);
  };

  useEffect(() => {
    if (hasSetInitialDays) {
      return;
    }

    if (localStorageKey) {
      const savedData = getItem<{
        daysInput: string;
        discountRateInput: string;
        netInput?: string;
      }>(localStorageKey);
      if (savedData) {
        if (savedData.daysInput) {
          setValue("daysInput", savedData.daysInput, { shouldValidate: true });
        }
        if (savedData.discountRateInput) {
          setValue("discountRateInput", savedData.discountRateInput, {
            shouldValidate: true,
          });
        }
        if (savedData.netInput) {
          setValue("netInput", savedData.netInput, { shouldValidate: true });
          setLastEdited("net");
        }
        setHasSetInitialDays(true);
        return;
      }
    }

    if (startDate !== undefined) {
      setValue(
        "daysInput",
        String(
          Math.min(
            Math.max(1, daysBetween(startDate, endDate)),
            INPUT_DAYS_MAX_VALUE,
          ),
        ),
        {
          shouldValidate: true,
          shouldDirty: true,
          shouldTouch: true,
        },
      );
    }

    setHasSetInitialDays(true);
  }, [startDate, endDate, setValue, localStorageKey, hasSetInitialDays]);

  useEffect(() => {
    if (!localStorageKey || !hasSetInitialDays) {
      return;
    }

    if (daysInput || discountRateInput || netInput) {
      setItem(localStorageKey, {
        daysInput: daysInput ?? "",
        discountRateInput: discountRateInput ?? "",
        netInput: netInput ?? "",
      });
    }
  }, [
    localStorageKey,
    daysInput,
    discountRateInput,
    netInput,
    hasSetInitialDays,
  ]);

  useEffect(() => {
    if (netInput === prevNetInputRef.current) {
      return;
    }
    prevNetInputRef.current = netInput;
    if (skipNetToRateRef.current) {
      return;
    }
    if (netInput !== undefined) {
      setLastEdited("net");
    }
  }, [netInput]);

  useEffect(() => {
    if (discountRate === undefined || days === undefined) {
      setNet(undefined);
      return;
    }

    if (lastEdited === "net") {
      return;
    }

    const netValue = Act360.grossToNet(gross.value, discountRate, days);
    const roundedNetValue = isSat ? netValue.round(0, Big.roundDown) : netValue;
    setNet({
      value: roundedNetValue,
      currency: gross.currency,
    });
    const formattedNet = formatAmount(roundedNetValue, gross.currency);
    if (formattedNet !== netInput) {
      skipNetToRateRef.current = true;
      setValue("netInput", formattedNet, { shouldValidate: true });
    }
  }, [gross, days, discountRate, lastEdited, setValue, isSat, netInput]);

  useEffect(() => {
    if (skipNetToRateRef.current) {
      skipNetToRateRef.current = false;
      return;
    }
    if (days === undefined || netInputValue === undefined) {
      setNet(undefined);
      return;
    }
    if (netInputValue.lt(0)) {
      setNet(undefined);
      return;
    }
    if (netInputValue.gt(gross.value)) {
      setNet(undefined);
      return;
    }

    setNet({
      value: netInputValue,
      currency: gross.currency,
    });

    const grossValue = gross.value;
    if (grossValue.eq(0)) {
      return;
    }

    const ratio = new Big(1).minus(netInputValue.div(grossValue));
    const rate = ratio.times(360).div(days);
    if (rate.lt(0) || rate.gt(1)) {
      return;
    }
    const ratePercent = rate.times(100);
    setValue("discountRateInput", ratePercent.toFixed(4), {
      shouldValidate: true,
    });
  }, [days, netInputValue, gross, setValue, netInput]);

  const handleFormSubmit = () => {
    if (net === undefined || discountRate === undefined || days === undefined) {
      return;
    }

    onSubmit({
      days,
      discountRate,
      net,
      gross,
    });
  };

  const handleIntegerInputFor =
    (field: "daysInput" | "netInput") =>
    (e: React.SyntheticEvent<HTMLInputElement>) => {
      const input = e.currentTarget;
      const cleaned = input.value.replace(/[^\d]/g, "");
      if (input.value !== cleaned) {
        const caret = input.selectionStart ?? cleaned.length;
        input.value = cleaned;
        setValue(field, cleaned, { shouldValidate: true, shouldDirty: true });
        const pos = Math.min(caret, cleaned.length);
        try {
          input.setSelectionRange(pos, pos);
        } catch {
          // ignore unsupported setSelectionRange
        }
      }
      if (field === "netInput") {
        setLastEdited("net");
      }
      if (input.value === cleaned) {
        setValue(field, cleaned, { shouldValidate: true, shouldDirty: true });
      }
    };

  const handleConfirmClick: React.MouseEventHandler<HTMLButtonElement> = (
    e,
  ) => {
    e.preventDefault();
    e.stopPropagation();
    void handleSubmit(handleFormSubmit)().catch((err) => {
      console.error("Submit failed:", err);
    });
  };

  return (
    <>
      <form
        className="flex flex-col gap-6 min-w-[8rem] px-4"
        onSubmit={(e) => {
          handleSubmit(handleFormSubmit)(e).catch((err) => {
            console.error("Submit failed:", err);
          });
        }}
      >
        <div className="flex flex-col gap-4">
          <div className="flex flex-col gap-2">
            <div className="flex justify-between items-center bg-gray-50 dark:bg-gray-800 rounded-lg p-4 border border-gray-200 dark:border-gray-700">
              <label
                htmlFor="daysInput"
                className="text-sm font-medium text-gray-900 dark:text-gray-100"
              >
                {daysLabel}
              </label>
              <input
                id="daysInput"
                step="1"
                type="number"
                inputMode="numeric"
                className="text-right text-lg font-semibold bg-transparent focus:outline-none [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none text-gray-900 dark:text-gray-100 w-24"
                onKeyDown={(e) => {
                  blockDecimalInput(e);
                  handleKeyDown(e);
                }}
                onInput={handleIntegerInputFor("daysInput")}
                onBeforeInput={blockNonDigitInput}
                onPaste={handlePasteDigitsFor("daysInput")}
                onDrop={handleDrop}
                enterKeyHint="next"
                {...register("daysInput", {
                  required: true,
                  min: INPUT_DAYS_MIN_VALUE,
                  max: INPUT_DAYS_MAX_VALUE,
                  setValueAs: parseDigitsToInt,
                  validate: validateMinInteger(INPUT_DAYS_MIN_VALUE, daysLabel),
                })}
              />
            </div>
            {errors.daysInput && (
              <div className="text-xs text-red-500">
                {intl.formatMessage(
                  {
                    id: "discountForm.validation.range",
                    defaultMessage:
                      "Please enter a valid value between {min} and {max}.",
                  },
                  { min: INPUT_DAYS_MIN_VALUE, max: INPUT_DAYS_MAX_VALUE },
                )}
              </div>
            )}
          </div>

          <div className="flex flex-col gap-2">
            <div className="flex justify-between items-center bg-gray-50 dark:bg-gray-800 rounded-lg p-4 border border-gray-200 dark:border-gray-700">
              <label
                htmlFor="discountRateInput"
                className="text-sm font-medium text-gray-900 dark:text-gray-100"
              >
                {discountRateLabel}
              </label>
              <div className="flex gap-1 items-center">
                <input
                  id="discountRateInput"
                  step="0.0001"
                  type="number"
                  inputMode="numeric"
                  className="text-right text-lg font-semibold bg-transparent focus:outline-none [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none text-gray-900 dark:text-gray-100 w-20"
                  {...discountRateRegister}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      e.preventDefault();
                      e.currentTarget.blur();
                    }
                  }}
                  onChange={(e) => {
                    void discountRateRegister.onChange(e);
                    setLastEdited("rate");
                  }}
                />
                <span className="text-lg font-semibold text-gray-900 dark:text-gray-100">
                  %
                </span>
              </div>
            </div>
            {errors.discountRateInput && (
              <div className="text-xs text-red-500">
                {intl.formatMessage(
                  {
                    id: "discountForm.validation.rateRange",
                    defaultMessage:
                      "Please enter a valid value between {min}% and {max}%.",
                  },
                  { min: 0, max: 99.9999 },
                )}
              </div>
            )}
          </div>

          <div className="flex flex-col gap-2">
            <div className="flex justify-between items-center bg-gray-50 dark:bg-gray-800 rounded-lg p-4 border border-gray-200 dark:border-gray-700">
              <label
                htmlFor="netInput"
                className="text-sm font-medium text-gray-900 dark:text-gray-100"
              >
                {netAmountLabel}
              </label>
              <div className="flex gap-1 items-center">
                <input
                  id="netInput"
                  step={isSat ? "1" : "0.01"}
                  type="number"
                  inputMode={isSat ? "numeric" : "decimal"}
                  className="text-right text-lg font-semibold bg-transparent focus:outline-none [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none text-green-600 dark:text-green-400 w-28"
                  {...netInputRegister}
                  onKeyDown={(e) => {
                    if (isSat) {
                      blockDecimalInput(e);
                      handleKeyDown(e);
                    } else if (e.key === "Enter") {
                      e.preventDefault();
                      e.currentTarget.blur();
                    }
                  }}
                  onInput={
                    isSat ? handleIntegerInputFor("netInput") : undefined
                  }
                  onBeforeInput={isSat ? blockNonDigitInput : undefined}
                  onPaste={isSat ? handlePasteDigitsFor("netInput") : undefined}
                  onDrop={handleDrop}
                  onChange={(e) => {
                    void netInputRegister.onChange(e);
                    setLastEdited("net");
                  }}
                />
                <span className="text-xs font-medium text-gray-500 dark:text-gray-400">
                  {gross.currency}
                </span>
              </div>
            </div>
            {errors.netInput && (
              <div className="text-xs text-red-500">
                {errors.netInput.message}
              </div>
            )}
          </div>
        </div>

        <div className="flex flex-col gap-3 px-2">
          <div className="flex justify-between items-center text-sm">
            <span className="text-gray-600 dark:text-gray-400">
              {annualDiscountLabel}
            </span>
            <div className="flex gap-1 items-center">
              <span className="text-gray-600 dark:text-gray-400">
                {discount === undefined
                  ? isSat
                    ? "0"
                    : "0.00"
                  : formatAmount(discount.value.abs(), gross.currency)}
              </span>
              <span className="text-xs text-gray-500 dark:text-gray-500">
                {discount?.currency ?? gross.currency}
              </span>
            </div>
          </div>

          <div className="flex justify-between items-center text-base font-semibold">
            <span className="text-gray-900 dark:text-gray-100">
              {grossAmountLabel}
            </span>
            <div className="flex gap-1 items-center">
              <span className="text-green-600 dark:text-green-400">
                +{formatAmount(gross.value, gross.currency)}
              </span>
              <span className="text-xs text-gray-500 dark:text-gray-500">
                {gross.currency}
              </span>
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
          onClick={handleConfirmClick}
          disabled={
            !isValid ||
            net === undefined ||
            discountRate === undefined ||
            days === undefined
          }
        >
          {intl.formatMessage({
            id: "Confirm",
            defaultMessage: "Confirm",
          })}
        </Button>
        <DrawerClose asChild>
          <Button
            className="w-full"
            variant="outline"
            size="sm"
          >
            {intl.formatMessage({
              id: "Cancel",
              defaultMessage: "Cancel",
            })}
          </Button>
        </DrawerClose>
      </DrawerFooter>
    </>
  );
};

export { GrossToNetDiscountForm };
