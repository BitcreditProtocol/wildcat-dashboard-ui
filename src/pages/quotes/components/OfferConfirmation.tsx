import { useEffect, useMemo, useState } from "react";
import { ConfirmDrawer } from "@/components/Drawers";
import Big from "big.js";
import type { OfferFormResult } from "./OfferFormDrawer";
import { addYears } from "date-fns";
import { useIntl } from "react-intl";
import { DatePicker, Text } from "@bitcredit/ui-library";
import type { DateRange } from "@bitcredit/ui-library";
import { useAmountFormatter } from "@/utils/amount-format";
import { governedOfferTtl } from "./useQuoteMutations";

interface OfferConfirmationProps {
  offerFormData?: OfferFormResult;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  isPending?: boolean;
  onSubmit: (data: OfferFormResult) => void;
  quoteId?: string;
}

export function OfferConfirmation({ offerFormData, open, onOpenChange, isPending = false, onSubmit, quoteId }: OfferConfirmationProps) {
  const intl = useIntl();
  const { formatAmount } = useAmountFormatter();
  const [validUntilDateTime, setValidUntilDateTime] = useState<Date | undefined>(undefined);

  const maxDate = useMemo(() => {
    const oneYearFromNow = addYears(new Date(), 1);
    const governedExpiry = offerFormData?.governedOfferExpiresAt;
    return governedExpiry !== undefined && governedExpiry < oneYearFromNow ? governedExpiry : oneYearFromNow;
  }, [offerFormData?.governedOfferExpiresAt]);

  useEffect(() => {
    if (!open) {
      return;
    }

    setValidUntilDateTime(offerFormData?.ttl.ttl);
  }, [open, quoteId, offerFormData?.ttl.ttl]);

  const handleDateTimeChange = (range: DateRange | undefined) => {
    setValidUntilDateTime(range?.from);
  };

  const effectiveDiscount =
    offerFormData && !offerFormData.discount.gross.value.eq(0)
      ? new Big(1).minus(offerFormData.discount.net.value.div(offerFormData.discount.gross.value))
      : undefined;
  const selectedOffer = offerFormData && validUntilDateTime ? { ...offerFormData, ttl: { ttl: validUntilDateTime } } : undefined;
  const validTtl = selectedOffer === undefined ? null : governedOfferTtl(selectedOffer);

  return (
    <ConfirmDrawer
      title={intl.formatMessage({
        id: "quotes.offer.confirmTitle",
        defaultMessage: "Confirm offering quote",
      })}
      description={intl.formatMessage({
        id: "quotes.offer.confirmDescription",
        defaultMessage: "Review your inputs and confirm the offer",
      })}
      open={open}
      onOpenChange={(nextOpen) => {
        if (!nextOpen && isPending) return;
        onOpenChange(nextOpen);
      }}
      cancelButtonDisabled={isPending}
      submitButtonDisabled={validTtl === null || isPending}
      onSubmit={() => {
        if (selectedOffer === undefined || validTtl === null) {
          return;
        }
        onSubmit(selectedOffer);
      }}
    >
      <div className="flex flex-col gap-4 px-4 py-4">
        <div className="flex justify-between items-center">
          <Text variant="label" className="w-48">
            {intl.formatMessage({
              id: "quotes.detail.discount.relative",
              defaultMessage: "Effective fee (relative):",
            })}
          </Text>
          <Text variant="caption" className="text-right">
            {effectiveDiscount?.mul(new Big("100")).toFixed(2)}%
          </Text>
        </div>
        <div className="flex justify-between items-center">
          <Text variant="label" className="w-48">
            {intl.formatMessage({
              id: "quotes.detail.discount.absolute",
              defaultMessage: "Effective fee (absolute):",
            })}
          </Text>
          <Text variant="caption" className="text-right">
            {offerFormData
              ? formatAmount(offerFormData.discount.gross.value.minus(offerFormData.discount.net.value).toFixed(0))
              : undefined}{" "}
            {offerFormData?.discount.net.currency}
          </Text>
        </div>
        <div className="flex justify-between items-center">
          <Text variant="label" className="w-48">
            {intl.formatMessage({
              id: "quotes.offer.netAmount",
              defaultMessage: "Net amount:",
            })}
          </Text>
          <Text variant="caption" className="text-right">
            {offerFormData ? formatAmount(offerFormData.discount.net.value.round(0).toFixed(0)) : undefined}{" "}
            {offerFormData?.discount.net.currency}
          </Text>
        </div>
        <div className="flex items-center justify-between gap-2">
          <Text variant="label" className="w-32">
            {intl.formatMessage({
              id: "quotes.offer.validUntil",
              defaultMessage: "Valid until:",
            })}
          </Text>
          <div className="flex-1">
            <DatePicker
              className="max-w-full [&>div]:mx-auto [&>div]:w-full [&>div]:max-w-[430px]"
              mode="single"
              withTime
              timeFormat="24h"
              value={validUntilDateTime ? { from: validUntilDateTime } : undefined}
              onChange={handleDateTimeChange}
              disabled={[{ before: new Date() }, { after: maxDate }]}
            />
          </div>
        </div>
      </div>
    </ConfirmDrawer>
  );
}
