import { useEffect, useMemo, useRef, useState } from "react";
import Big from "big.js";
import type { UseFormSetValue } from "react-hook-form";
import type { CurrencyAmount, FormValues, LastEditedField } from "./types";
import { Act360 } from "@/utils/discount-util";

export function useDiscountCalculations({
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
}: {
  days?: number;
  discountRate?: Big;
  formatNetInputDisplayValue: (value: Big, currency: string) => string;
  formatNetInputValue: (value: Big, currency: string) => string;
  gross: CurrencyAmount;
  isSat: boolean;
  lastEdited: LastEditedField;
  netInput?: string;
  netInputValue?: Big;
  setLastEdited: (value: LastEditedField) => void;
  setNetInputDisplay: (value: string) => void;
  setValue: UseFormSetValue<FormValues>;
}) {
  const [net, setNet] = useState<CurrencyAmount>();
  const skipNetToRateRef = useRef(false);
  const prevNetInputRef = useRef<string | undefined>(undefined);

  const discount = useMemo<CurrencyAmount | undefined>(() => {
    return net === undefined
      ? undefined
      : {
          value: net.value.sub(gross.value),
          currency: net.currency,
        };
  }, [gross, net]);

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
  }, [netInput, setLastEdited]);

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
    const formattedNet = formatNetInputValue(roundedNetValue, gross.currency);
    if (formattedNet !== netInput) {
      skipNetToRateRef.current = true;
      setValue("netInput", formattedNet, { shouldValidate: true });
    }
    if (isSat) {
      setNetInputDisplay(formatNetInputDisplayValue(roundedNetValue, gross.currency));
    }
  }, [gross, days, discountRate, lastEdited, setValue, isSat, netInput, formatNetInputValue, formatNetInputDisplayValue, setNetInputDisplay]);

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

  return { discount, net };
}
