import { AppIcon, Button, cn } from "@bitcredit/ui-library";
import { BanknoteIcon } from "lucide-react";
import { defineMessages, useIntl } from "react-intl";
import { useCheckBillPayment } from "@/hooks/use-check-bill-payment";

const messages = defineMessages({
  check: {
    id: "bills.detail.checkPayment",
    defaultMessage: "Check payment",
    description: "Asks the mint to check this bill's payment now instead of waiting for its scheduled sweep",
  },
});

interface CheckBillPaymentButtonProps {
  billId: string | undefined;
  quoteId?: string;
  requestedToPay: boolean;
  paid: boolean;
}

export function CheckBillPaymentButton({ billId, quoteId, requestedToPay, paid }: CheckBillPaymentButtonProps) {
  const intl = useIntl();
  const { checkBillPayment, isCheckingPayment, canCheckPayment } = useCheckBillPayment({ billId, quoteId });

  if (!billId || !requestedToPay || paid) {
    return null;
  }

  return (
    <Button
      variant="outline"
      size="sm"
      onClick={checkBillPayment}
      disabled={!canCheckPayment}
      className="inline-flex items-center gap-1 leading-none"
    >
      <AppIcon icon={BanknoteIcon} weight="thin" className={cn("h-4 w-4", { "animate-pulse": isCheckingPayment })} />
      <span className="relative top-px leading-none">{intl.formatMessage(messages.check)}</span>
    </Button>
  );
}
