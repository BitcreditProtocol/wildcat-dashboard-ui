import React, { useMemo, useState } from "react";
import { useForm } from "react-hook-form";
import Big from "big.js";
import { parseFloatSafe, parseIntSafe } from "@/utils/numbers";
import { Button } from "@bitcredit/ui-library";
import { useIntl } from "react-intl";
import { useAmountFormatter } from "@/utils/amount-format";
import { AmountSummaryRow, DaysInputField, DiscountRateInputField, FormActions, NetInputField } from "./Fields";
import type { FormValues, GrossToNetProps } from "./types";
import { INPUT_DAYS_MAX_VALUE, INPUT_DAYS_MIN_VALUE, LOCAL_STORAGE_KEY_PREFIX } from "./constants";
import {
  blockDecimalInput,
  blockNonDigitInput,
  formatAmountValue,
  formatNetInputDisplayValue as formatNetInputDisplayValueForCurrency,
  formatNetInputValue as formatNetInputValueForCurrency,
  getCaretPositionForDigitCount,
  handleDrop,
  handleIntegerKeyDown,
  parseDigitsToInt,
  sanitizeDecimalInput,
} from "./input";
import { createDiscountFormValidators } from "./validators";
import { useDiscountCalculations } from "./useCalculations";
import { useFormPersistence } from "./usePersistence";

type GrossToNetFormValues = FormValues;

const GrossToNetDiscountForm = ({ startDate, endDate, gross, onSubmit, submitButtonText, quoteId }: GrossToNetProps) => {
  const intl = useIntl();
  const { formatAmount: formatAmountByPreference, formatGroupedSats, parseAmount: parseAmountByPreference } = useAmountFormatter();
  const [hasSetInitialDays, setHasSetInitialDays] = useState(false);
  const [lastEdited, setLastEdited] = useState<"rate" | "net" | null>(null);
  const [netInputDisplay, setNetInputDisplay] = useState("");
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

  const { validateMinInteger, validateNetAmount } = createDiscountFormValidators({
    grossValue: gross.value,
    intl,
    isSat,
    parseAmountByPreference,
  });

  const localStorageKey = quoteId ? `${LOCAL_STORAGE_KEY_PREFIX}${quoteId}` : null;
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

  const handlePasteDigitsFor = (field: "daysInput" | "netInput") => (e: React.ClipboardEvent<HTMLInputElement>) => {
    e.preventDefault();
    const text = e.clipboardData.getData("text") || "";
    const digits = text.replace(/\D/g, "");
    const input = e.currentTarget;
    const start = input.selectionStart ?? input.value.length;
    const end = input.selectionEnd ?? input.value.length;
    const before = input.value.slice(0, start);
    const after = input.value.slice(end);
    const next = (before + digits + after).replace(/\D/g, "");
    if (field === "netInput") {
      setNetInputDisplay(formatGroupedSats(next));
    } else {
      input.value = next;
    }
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

  const { daysInput, discountRateInput, netInput } = watch();

  const days = useMemo<number | undefined>(() => {
    return parseIntSafe(daysInput);
  }, [daysInput]);

  const discountRate = useMemo<Big | undefined>(() => {
    const parsed = parseFloatSafe(discountRateInput);
    return parsed === undefined ? undefined : new Big(parsed).div(new Big("100"));
  }, [discountRateInput]);

  const netInputValue = useMemo<Big | undefined>(() => {
    if (netInput == null || netInput === "") {
      return undefined;
    }
    if (isSat) {
      const parsed = parseIntSafe(netInput);
      return parsed === undefined ? undefined : new Big(parsed);
    }
    const parsed = parseAmountByPreference(netInput);
    return parsed === undefined ? undefined : new Big(parsed);
  }, [netInput, isSat, parseAmountByPreference]);

  const formatAmount = React.useCallback(
    (value: Big, currency: string) => {
      return formatAmountValue(value, currency, formatAmountByPreference);
    },
    [formatAmountByPreference]
  );

  const formatNetInputValue = React.useCallback(
    (value: Big, currency: string) => {
      return formatNetInputValueForCurrency(value, currency, formatAmountByPreference);
    },
    [formatAmountByPreference]
  );

  const formatNetInputDisplayValue = React.useCallback(
    (value: Big, currency: string) => {
      return formatNetInputDisplayValueForCurrency(value, currency, formatAmountByPreference, formatGroupedSats);
    },
    [formatAmountByPreference, formatGroupedSats]
  );

  const handleGroupedSatNetChange: React.ChangeEventHandler<HTMLInputElement> = (e) => {
    const input = e.currentTarget;
    const caret = input.selectionStart ?? input.value.length;
    const digitsBeforeCaret = input.value.slice(0, caret).replace(/\D/g, "").length;
    const digits = input.value.replace(/\D/g, "");
    const formatted = formatGroupedSats(digits);
    const nextCaret = getCaretPositionForDigitCount(formatted, digitsBeforeCaret);

    setNetInputDisplay(formatted);
    setValue("netInput", digits, { shouldValidate: true, shouldDirty: true });
    setLastEdited("net");

    const restoreCaret = () => {
      try {
        input.setSelectionRange(nextCaret, nextCaret);
      } catch {
        // ignore unsupported setSelectionRange
      }
    };

    if (typeof window.requestAnimationFrame === "function") {
      window.requestAnimationFrame(restoreCaret);
    } else {
      window.setTimeout(restoreCaret, 0);
    }
  };

  useFormPersistence({
    daysInput,
    discountRateInput,
    endDate,
    formatGroupedSats,
    hasSetInitialDays,
    isSat,
    localStorageKey,
    netInput,
    setHasSetInitialDays,
    setLastEdited,
    setNetInputDisplay,
    setValue,
    startDate,
  });

  const { discount, net } = useDiscountCalculations({
    days,
    discountRate,
    formatNetInputDisplayValue,
    formatNetInputValue,
    gross,
    isSat,
    lastEdited,
    netInput,
    netInputValue,
    setLastEdited,
    setNetInputDisplay,
    setValue,
  });

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

  const handleIntegerInputFor = (field: "daysInput" | "netInput") => (e: React.SyntheticEvent<HTMLInputElement>) => {
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

  const handleConfirmClick: React.MouseEventHandler<HTMLButtonElement> = (e) => {
    e.preventDefault();
    e.stopPropagation();
    void handleSubmit(handleFormSubmit)().catch((err) => {
      console.error("Submit failed:", err);
    });
  };

  const daysError = errors.daysInput
    ? intl.formatMessage(
        {
          id: "discountForm.validation.range",
          defaultMessage: "Please enter a valid value between {min} and {max}.",
        },
        { min: INPUT_DAYS_MIN_VALUE, max: INPUT_DAYS_MAX_VALUE }
      )
    : undefined;
  const discountRateError = errors.discountRateInput
    ? intl.formatMessage(
        {
          id: "discountForm.validation.rateRange",
          defaultMessage: "Please enter a valid value between {min}% and {max}%.",
        },
        { min: 0, max: 99.9999 }
      )
    : undefined;
  const discountValue = discount === undefined ? (isSat ? "0" : "0.00") : formatAmount(discount.value.abs(), gross.currency);
  const confirmLabel = intl.formatMessage({
    id: "Confirm",
    defaultMessage: "Confirm",
  });
  const cancelLabel = intl.formatMessage({
    id: "Cancel",
    defaultMessage: "Cancel",
  });
  const confirmDisabled = !isValid || net === undefined || discountRate === undefined || days === undefined;

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
          <DaysInputField
            label={daysLabel}
            error={daysError}
            registration={register("daysInput", {
              required: true,
              min: INPUT_DAYS_MIN_VALUE,
              max: INPUT_DAYS_MAX_VALUE,
              setValueAs: parseDigitsToInt,
              validate: validateMinInteger(INPUT_DAYS_MIN_VALUE, daysLabel),
            })}
            onKeyDown={(e) => {
              blockDecimalInput(e);
              handleIntegerKeyDown(e);
            }}
            onInput={handleIntegerInputFor("daysInput")}
            onBeforeInput={blockNonDigitInput}
            onPaste={handlePasteDigitsFor("daysInput")}
            onDrop={handleDrop}
          />

          <DiscountRateInputField
            label={discountRateLabel}
            error={discountRateError}
            registration={discountRateRegister}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                e.currentTarget.blur();
              }
            }}
            onChange={(e) => {
              const sanitizedValue = sanitizeDecimalInput(e.currentTarget.value);
              if (e.currentTarget.value !== sanitizedValue) {
                e.currentTarget.value = sanitizedValue;
              }
              void discountRateRegister.onChange(e);
              setLastEdited("rate");
            }}
          />

          <NetInputField
            label={netAmountLabel}
            error={errors.netInput?.message}
            currency={gross.currency}
            displayValue={netInputDisplay}
            isSat={isSat}
            registration={netInputRegister}
            onKeyDown={(e) => {
              if (isSat) {
                blockDecimalInput(e);
                handleIntegerKeyDown(e);
              } else if (e.key === "Enter") {
                e.preventDefault();
                e.currentTarget.blur();
              }
            }}
            onBeforeInput={isSat ? blockNonDigitInput : undefined}
            onPaste={isSat ? handlePasteDigitsFor("netInput") : undefined}
            onDrop={handleDrop}
            onChange={(e) => {
              if (isSat) {
                handleGroupedSatNetChange(e);
                return;
              }
              void netInputRegister.onChange(e);
              setLastEdited("net");
            }}
          />
        </div>

        <div className="flex flex-col gap-3 px-2">
          <AmountSummaryRow
            label={annualDiscountLabel}
            value={discountValue}
            currency={discount?.currency ?? gross.currency}
            valueClassName="text-gray-600 dark:text-gray-400"
          />

          <AmountSummaryRow
            label={grossAmountLabel}
            value={`+${formatAmount(gross.value, gross.currency)}`}
            currency={gross.currency}
            valueClassName="text-green-600 dark:text-green-400"
            labelClassName="text-gray-900 dark:text-gray-100"
            rowClassName="text-base font-semibold"
          />
        </div>

        {submitButtonText && (
          <Button type="submit" size="sm" className="my-4" disabled={!isValid}>
            {submitButtonText}
          </Button>
        )}
      </form>

      <FormActions
        confirmDisabled={confirmDisabled}
        onConfirmClick={handleConfirmClick}
        confirmLabel={confirmLabel}
        cancelLabel={cancelLabel}
      />
    </>
  );
};

export { GrossToNetDiscountForm };
