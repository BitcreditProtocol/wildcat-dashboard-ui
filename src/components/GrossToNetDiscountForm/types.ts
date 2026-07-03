import type Big from "big.js";

export interface CurrencyAmount {
  value: Big;
  currency: string;
}

export interface FormResult {
  days: number;
  discountRate: Big;
  net: CurrencyAmount;
  gross: CurrencyAmount;
}

export interface FormValues {
  daysInput?: string;
  discountRateInput?: string;
  netInput?: string;
}

export interface GrossToNetProps {
  startDate?: Date;
  endDate: Date;
  gross: CurrencyAmount;
  submitButtonText?: string;
  onConfirm?: () => void;
  onSubmit: (values: FormResult) => void;
  quoteId?: string;
}

export type LastEditedField = "rate" | "net" | null;
