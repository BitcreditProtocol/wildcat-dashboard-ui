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
  /**
   * Net amount to open the form with, in the gross currency's smallest unit. Used only when the
   * operator has no draft saved for this quote: a draft they were editing outranks a suggestion.
   */
  suggestedNet?: string;
  endDate: Date;
  gross: CurrencyAmount;
  submitButtonText?: string;
  onConfirm?: () => void;
  onSubmit: (values: FormResult) => void;
  quoteId?: string;
  /** Additional host-level condition that must be satisfied before confirmation. */
  confirmDisabled?: boolean;
}

export type LastEditedField = "rate" | "net" | null;
