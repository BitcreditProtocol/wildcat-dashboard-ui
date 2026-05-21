import Big from "big.js";
import { useEffect, useMemo, useRef, useState } from "react";
import { BaseDrawer } from "@/components/Drawers";
import { GrossToNetDiscountForm } from "@/components/GrossToNetDiscountForm";
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

const THIRTY_DAYS_MS = 30 * 24 * 60 * 60 * 1000;

export function OfferFormDrawer({ title, description, value, open, onOpenChange, onSubmit, children }: OfferFormDrawerProps) {
  const handleFormSubmit = (values: {
    days: number;
    discountRate: Big;
    net: { value: Big; currency: string };
    gross: { value: Big; currency: string };
  }) => {
    const ttl = value.status === "Pending" ? new Date(value.suggested_expiration) : new Date(Date.now() + THIRTY_DAYS_MS);

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

  const startDate = useMemo(() => new Date(), [formKey]);
  const endDate = useMemo(
    () => (value.bill.maturity_date ? new Date(value.bill.maturity_date) : new Date()),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [value.bill.maturity_date, formKey]
  );
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
