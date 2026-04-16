import { Button } from "@/components/ui/button";
import type { Id } from "@/generated/client/types.gen";
import { useIntl } from "react-intl";

interface KeysetRedemptionButtonProps {
  onRedeem: () => void;
  isPending: boolean;
  parsedKeysetId: Id | null;
  canEnableRedemption: boolean;
  anyMintCompleteLoading: boolean;
  hasNoMatchingBills: boolean;
  allBillsPaid: boolean;
  allMintComplete: boolean;
}

export function KeysetRedemptionButton({
  onRedeem,
  isPending,
  parsedKeysetId,
  canEnableRedemption,
  anyMintCompleteLoading,
  hasNoMatchingBills,
  allBillsPaid,
  allMintComplete,
}: KeysetRedemptionButtonProps) {
  const intl = useIntl();

  const label = isPending
    ? intl.formatMessage({
        id: "keyset.detail.redeem.enabling",
        defaultMessage: "Enabling redemption...",
      })
    : hasNoMatchingBills
      ? intl.formatMessage({
          id: "keyset.detail.redeem.noMatchingBills",
          defaultMessage: "No matching bills found",
        })
      : !allBillsPaid
        ? intl.formatMessage({
            id: "keyset.detail.redeem.waitingPayments",
            defaultMessage: "Waiting for e-bill payments...",
          })
        : anyMintCompleteLoading
          ? intl.formatMessage({
              id: "keyset.detail.redeem.checkingMintStatus",
              defaultMessage: "Checking mint status...",
            })
          : !allMintComplete
            ? intl.formatMessage({
                id: "keyset.detail.redeem.waitingMintCompletion",
                defaultMessage: "Waiting for mint completion...",
              })
            : intl.formatMessage({
                id: "keyset.detail.redeem.action",
                defaultMessage: "Redeem",
              });

  return (
    <Button
      className="w-full max-w-sm"
      size="sm"
      variant="default"
      disabled={isPending || !parsedKeysetId || !canEnableRedemption || anyMintCompleteLoading || hasNoMatchingBills}
      onClick={onRedeem}
    >
      {label}
    </Button>
  );
}
