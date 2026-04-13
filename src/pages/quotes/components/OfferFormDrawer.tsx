import Big from "big.js";
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

export function OfferFormDrawer({
  title,
  description,
  value,
  open,
  onOpenChange,
  onSubmit,
  children,
}: OfferFormDrawerProps) {
  const handleFormSubmit = (values: {
    days: number;
    discountRate: Big;
    net: { value: Big; currency: string };
    gross: { value: Big; currency: string };
  }) => {
    const ttl =
      value.status === "Pending"
        ? new Date(value.suggested_expiration)
        : new Date(Date.now() + THIRTY_DAYS_MS);

    const result: OfferFormResult = {
      discount: values,
      ttl: { ttl },
    };

    onSubmit(result);
  };

  const startDate = new Date();
  const endDate = value.bill.maturity_date
    ? new Date(value.bill.maturity_date)
    : new Date();

  return (
    <BaseDrawer
      title={title}
      description={description}
      open={open}
      onOpenChange={onOpenChange}
      trigger={children}
    >
      <GrossToNetDiscountForm
        startDate={startDate}
        endDate={endDate}
        gross={{
          value: new Big(value.bill.sum),
          currency: "sat",
        }}
        onSubmit={handleFormSubmit}
        quoteId={value.id}
      />
    </BaseDrawer>
  );
}
