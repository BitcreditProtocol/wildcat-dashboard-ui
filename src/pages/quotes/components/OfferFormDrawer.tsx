import Big from "big.js";
import { useEffect, useMemo, useRef, useState } from "react";
import { BaseDrawer } from "@/components/Drawers";
import { GrossToNetDiscountForm } from "@/components/GrossToNetDiscountForm/GrossToNetDiscountForm";
import type { InfoReply } from "@/generated/client/types.gen";
import type { ReactNode } from "react";

export interface OfferFormResult {
  discount: {
    days: number;
    discountRate: Big;
    net: {
      value: Big;
      currency: string;
    };
    gross: {
      value: Big;
      currency: string;
    };
  };
  ttl: {
    ttl: Date;
  };
}

interface OfferFormDrawerProps {
  title: string;
  description: string;
  value: InfoReply;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (data: OfferFormResult) => void;
  children: ReactNode;
}

const ONE_HOUR_MS = 60 * 60 * 1000;

export function OfferFormDrawer({ title, description, value, open, onOpenChange, onSubmit, children }: OfferFormDrawerProps) {
  const handleFormSubmit = (values: {
    days: number;
    discountRate: Big;
    net: { value: Big; currency: string };
    gross: { value: Big; currency: string };
  }) => {
    const ttl = new Date(Date.now() + ONE_HOUR_MS);

    const result: OfferFormResult = {
      discount: values,
      ttl: { ttl },
    };

    onSubmit(result);
  };

  const [formKey, setFormKey] = useState(0);
  const prevOpenRef = useRef(false);

  useEffect(() => {
    if (open && !prevOpenRef.current) {
      setFormKey((k) => k + 1);
    }
    prevOpenRef.current = open;
  }, [open]);

  const startDate = useMemo(() => new Date(), []);
  const openedFormInstance = formKey;
  const endDate = useMemo(() => {
    void openedFormInstance;
    return value.bill.maturity_date ? new Date(value.bill.maturity_date) : new Date();
  }, [openedFormInstance, value.bill.maturity_date]);
  const gross = useMemo(() => ({ value: new Big(value.bill.sum), currency: "sat" as const }), [value.bill.sum]);

  return (
    <BaseDrawer title={title} description={description} open={open} onOpenChange={onOpenChange} trigger={children}>
      <GrossToNetDiscountForm
        key={formKey}
        startDate={startDate}
        endDate={endDate}
        gross={gross}
        onSubmit={handleFormSubmit}
        quoteId={value.id}
      />
    </BaseDrawer>
  );
}
