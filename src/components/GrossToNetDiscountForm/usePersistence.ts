import { useEffect } from "react";
import type { UseFormSetValue } from "react-hook-form";
import { INPUT_DAYS_MAX_VALUE } from "./constants";
import type { FormValues, LastEditedField } from "./types";
import { parseDigitsToInt } from "./input";
import { daysBetween } from "@/utils/dates";
import { getItem, setItem } from "@/utils/local-storage";

export function useFormPersistence({
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
  suggestedNet,
}: {
  daysInput?: string;
  discountRateInput?: string;
  endDate: Date;
  formatGroupedSats: (value: string) => string;
  hasSetInitialDays: boolean;
  isSat: boolean;
  localStorageKey: string | null;
  netInput?: string;
  setHasSetInitialDays: (value: boolean) => void;
  setLastEdited: (value: LastEditedField) => void;
  setNetInputDisplay: (value: string) => void;
  setValue: UseFormSetValue<FormValues>;
  startDate?: Date;
  suggestedNet?: string;
}) {
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
        const hasSavedDiscountRate = Boolean(savedData.discountRateInput);
        if (savedData.daysInput) {
          setValue("daysInput", savedData.daysInput, { shouldValidate: true });
        }
        if (hasSavedDiscountRate) {
          setValue("discountRateInput", savedData.discountRateInput, {
            shouldValidate: true,
          });
        }
        if (savedData.netInput && !hasSavedDiscountRate) {
          const savedNetInput = isSat ? parseDigitsToInt(savedData.netInput) : savedData.netInput;
          setValue("netInput", savedNetInput, { shouldValidate: true });
          if (isSat) {
            setNetInputDisplay(formatGroupedSats(savedNetInput));
          }
          setLastEdited("net");
        }
        setHasSetInitialDays(true);
        return;
      }
    }

    if (startDate !== undefined) {
      setValue("daysInput", String(Math.min(Math.max(1, daysBetween(startDate, endDate)), INPUT_DAYS_MAX_VALUE)), {
        shouldValidate: true,
        shouldDirty: true,
        shouldTouch: true,
      });
    }

    // No saved draft: open on the suggested amount so confirming is approving it, and editing it
    // is customising it. The rate follows from the net, as it does when the operator types one.
    if (suggestedNet !== undefined) {
      setValue("netInput", isSat ? parseDigitsToInt(suggestedNet) : suggestedNet, { shouldValidate: true, shouldDirty: true });
      if (isSat) {
        setNetInputDisplay(formatGroupedSats(suggestedNet));
      }
      setLastEdited("net");
    }

    setHasSetInitialDays(true);
  }, [
    endDate,
    formatGroupedSats,
    hasSetInitialDays,
    isSat,
    localStorageKey,
    setHasSetInitialDays,
    setLastEdited,
    setNetInputDisplay,
    setValue,
    startDate,
    suggestedNet,
  ]);

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
  }, [localStorageKey, daysInput, discountRateInput, netInput, hasSetInitialDays]);
}
