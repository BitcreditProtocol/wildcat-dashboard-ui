import { ConfirmDrawer } from "@/components/Drawers";
import Big from "big.js";
import type { OfferFormResult } from "./OfferFormDrawer";
import { useIntl } from "react-intl";
import { Text } from "@bitcredit/ui-library";
import { useAmountFormatter } from "@/utils/amount-format";
import { governedOfferTtl } from "./useQuoteMutations";

interface OfferConfirmationProps {
  offerFormData?: OfferFormResult;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  isPending?: boolean;
  onSubmit: (data: OfferFormResult) => void;
}

export function OfferConfirmation({ offerFormData, open, onOpenChange, isPending = false, onSubmit }: OfferConfirmationProps) {
  const intl = useIntl();
  const { formatAmount } = useAmountFormatter();

  const effectiveDiscount =
    offerFormData && !offerFormData.discount.gross.value.eq(0)
      ? new Big(1).minus(offerFormData.discount.net.value.div(offerFormData.discount.gross.value))
      : undefined;
  const selectedOffer =
    offerFormData?.governedOfferExpiresAt === undefined
      ? undefined
      : { ...offerFormData, ttl: { ttl: offerFormData.governedOfferExpiresAt } };
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
              defaultMessage: "Minting fee rate:",
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
              defaultMessage: "Minting fee:",
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
              defaultMessage: "Amount available for minting:",
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
          <Text variant="caption" className="text-right">
            {validTtl === null ? undefined : new Date(validTtl).toLocaleString()}
          </Text>
        </div>
      </div>
    </ConfirmDrawer>
  );
}
