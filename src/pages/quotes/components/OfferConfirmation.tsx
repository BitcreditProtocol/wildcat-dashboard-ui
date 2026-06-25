import { useEffect, useMemo, useState } from "react";
import { ConfirmDrawer } from "@/components/Drawers";
import Big from "big.js";
import type { OfferFormResult } from "./OfferFormDrawer";
import { addYears } from "date-fns";
import { getItem, removeItem, setItem } from "@/utils/local-storage";
import { useIntl } from "react-intl";
import { DatePicker, Text } from "@bitcredit/ui-library";
import type { DateRange } from "@bitcredit/ui-library";
import { useAmountFormatter } from "@/utils/amount-format";

interface OfferConfirmationProps {
  offerFormData?: OfferFormResult;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (data: OfferFormResult) => void;
  quoteId?: string;
}

const OFFER_VALID_UNTIL_STORAGE_KEY_PREFIX = "offer-valid-until-";

export function OfferConfirmation({ offerFormData, open, onOpenChange, onSubmit, quoteId }: OfferConfirmationProps) {
  const intl = useIntl();
  const { formatAmount } = useAmountFormatter();
  const [validUntilDateTime, setValidUntilDateTime] = useState<Date | undefined>(undefined);

  const maxDate = useMemo(() => addYears(new Date(), 1), []);
  const storageKey = quoteId ? `${OFFER_VALID_UNTIL_STORAGE_KEY_PREFIX}${quoteId}` : null;

  useEffect(() => {
    if (!open || validUntilDateTime) {
      return;
    }

    if (storageKey) {
      const stored = getItem<string>(storageKey);
      if (stored) {
        const parsed = new Date(stored);
        if (!Number.isNaN(parsed.getTime()) && parsed > new Date() && parsed <= maxDate) {
          setValidUntilDateTime(parsed);
          return;
        }
        removeItem(storageKey);
      }
    }

    if (offerFormData?.ttl.ttl) {
      setValidUntilDateTime(offerFormData.ttl.ttl);
    }
  }, [open, validUntilDateTime, storageKey, maxDate, offerFormData?.ttl.ttl]);

  const handleDateTimeChange = (range: DateRange | undefined) => {
    const selected = range?.from;
    setValidUntilDateTime(selected);
    if (selected && storageKey) {
      setItem(storageKey, selected.toISOString());
    } else if (!selected && storageKey) {
      removeItem(storageKey);
    }
  };

  const effectiveDiscount =
    offerFormData && !offerFormData.discount.gross.value.eq(0)
      ? new Big(1).minus(offerFormData.discount.net.value.div(offerFormData.discount.gross.value))
      : undefined;

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
      onOpenChange={onOpenChange}
      submitButtonDisabled={!validUntilDateTime}
      onSubmit={() => {
        if (!offerFormData || !validUntilDateTime) {
          return;
        }
        onSubmit({ ...offerFormData, ttl: { ttl: validUntilDateTime } });
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
