import type React from "react";
import Big from "big.js";
import { NET_INPUT_DECIMALS } from "./constants";

export const parseDigitsToInt = (value: unknown) => {
  let str = "";
  if (typeof value === "string" || typeof value === "number") {
    str = String(value);
  }
  return str.replace(/\D/g, "");
};

export const blockDecimalInput = (e: React.KeyboardEvent<HTMLInputElement>) => {
  if ([".", ",", "e", "E", "+", "-", "^"].includes(e.key)) {
    e.preventDefault();
  }
};

export const sanitizeDecimalInput = (value: string) => {
  const normalized = value.replace(",", ".");
  let result = "";
  let hasDecimal = false;

  for (const char of normalized) {
    if (char >= "0" && char <= "9") {
      result += char;
      continue;
    }

    if (char === "." && !hasDecimal) {
      result += char;
      hasDecimal = true;
    }
  }

  return result;
};

export const handleIntegerKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
  const allowed = new Set(["Backspace", "Delete", "ArrowLeft", "ArrowRight", "ArrowUp", "ArrowDown", "Tab", "Home", "End"]);
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

export const blockNonDigitInput = (e: React.SyntheticEvent<HTMLInputElement>) => {
  const native = e.nativeEvent as InputEvent;
  const data = native.data;
  if (native.type === "beforeinput") {
    if ((native.inputType === "insertText" || native.inputType === "insertCompositionText") && data && /\D/.test(data)) {
      e.preventDefault();
    }
  }
};

export const handleDrop = (e: React.DragEvent<HTMLInputElement>) => {
  e.preventDefault();
};

export const getCaretPositionForDigitCount = (value: string, digitCount: number) => {
  if (digitCount <= 0) {
    return 0;
  }

  let seenDigits = 0;
  for (let i = 0; i < value.length; i += 1) {
    if (/\d/.test(value[i])) {
      seenDigits += 1;
    }
    if (seenDigits === digitCount) {
      return i + 1;
    }
  }

  return value.length;
};

export const formatAmountValue = (value: Big, currency: string, formatAmountByPreference: (value: string) => string) => {
  if (currency === "sat") {
    return formatAmountByPreference(value.round(0, Big.roundDown).toFixed(0));
  }
  return formatAmountByPreference(value.toFixed(NET_INPUT_DECIMALS));
};

export const formatNetInputValue = (value: Big, currency: string, formatAmountByPreference: (value: string) => string) => {
  if (currency === "sat") {
    return value.round(0, Big.roundDown).toFixed(0);
  }
  return formatAmountByPreference(value.toFixed(NET_INPUT_DECIMALS));
};

export const formatNetInputDisplayValue = (
  value: Big,
  currency: string,
  formatAmountByPreference: (value: string) => string,
  formatGroupedSats: (value: string) => string
) => {
  if (currency === "sat") {
    return formatGroupedSats(value.round(0, Big.roundDown).toFixed(0));
  }
  return formatAmountByPreference(value.toFixed(NET_INPUT_DECIMALS));
};
