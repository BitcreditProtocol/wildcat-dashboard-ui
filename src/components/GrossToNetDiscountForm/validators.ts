import Big from "big.js";
import type { IntlShape } from "react-intl";
import { INPUT_DAYS_MAX_VALUE } from "./constants";
import { parseIntSafe } from "@/utils/numbers";

export function createDiscountFormValidators({
  grossValue,
  intl,
  isSat,
  parseAmountByPreference,
}: {
  grossValue: Big;
  intl: IntlShape;
  isSat: boolean;
  parseAmountByPreference: (value: string) => number | undefined;
}) {
  const validateNetAmount = (value?: string) => {
    if (value == null || value === "") {
      return intl.formatMessage({
        id: "discountForm.validation.net.required",
        defaultMessage: "Net amount is required",
      });
    }

    const parsed = isSat ? parseIntSafe(value) : parseAmountByPreference(value);
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
        { min: 1 }
      );
    }
    if (new Big(parsed).gt(grossValue)) {
      return intl.formatMessage({
        id: "discountForm.validation.net.maxGross",
        defaultMessage: "Net amount cannot exceed gross amount",
      });
    }

    return true;
  };

  const validateMinInteger = (min: number, label: string) => (value?: string) => {
    if (value == null || value === "") {
      return intl.formatMessage(
        {
          id: "discountForm.validation.required",
          defaultMessage: "{label} is required",
        },
        { label }
      );
    }
    if (!/^\d+$/.test(value)) {
      return intl.formatMessage(
        {
          id: "discountForm.validation.wholeNumber",
          defaultMessage: "{label} must be a whole number",
        },
        { label }
      );
    }

    const n = parseInt(value, 10);
    if (Number.isNaN(n)) {
      return intl.formatMessage(
        {
          id: "discountForm.validation.invalid",
          defaultMessage: "{label} is invalid",
        },
        { label }
      );
    }
    if (n < min) {
      return intl.formatMessage(
        {
          id: "discountForm.validation.min",
          defaultMessage: "{label} must be at least {min}",
        },
        { label, min }
      );
    }
    if (n > INPUT_DAYS_MAX_VALUE) {
      return intl.formatMessage(
        {
          id: "discountForm.validation.max",
          defaultMessage: "{label} must be at most {max}",
        },
        { label, max: INPUT_DAYS_MAX_VALUE }
      );
    }

    return true;
  };

  return { validateMinInteger, validateNetAmount };
}
