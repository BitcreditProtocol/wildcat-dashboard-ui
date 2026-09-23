import { Heading, Text, TruncatedLinkPopover, TruncatedTextPopover } from "@bitcredit/ui-library";
import { useIntl } from "react-intl";
import { CheckBillPaymentButton } from "@/components/CheckBillPaymentButton";

interface PaymentRequestCardProps {
  billId?: string;
  quoteId: string;
  requestedToPay: boolean;
  paid: boolean;
  addressToPay?: string;
  linkToPay?: string;
  effectiveRequestTime: number | null;
  effectiveDeadlineTs: number | null;
}

export function PaymentRequestCard({
  billId,
  quoteId,
  requestedToPay,
  paid,
  addressToPay,
  linkToPay,
  effectiveRequestTime,
  effectiveDeadlineTs,
}: PaymentRequestCardProps) {
  const intl = useIntl();
  return (
    <div className="p-4 dark:bg-elevation-200 bg-white rounded border">
      <div className="mb-3 flex items-start justify-between gap-2">
        <Heading as="h2" variant="page">
          {intl.formatMessage({
            id: "quotes.paymentRequest.title",
            defaultMessage: "Payment request",
          })}
        </Heading>
        <CheckBillPaymentButton billId={billId} quoteId={quoteId} requestedToPay={requestedToPay} paid={paid} />
      </div>
      <div className="space-y-1">
        {addressToPay && (
          <div className="flex items-center gap-2">
            <Text variant="label" className="w-32">
              {intl.formatMessage({
                id: "quotes.paymentRequest.addressToPay",
                defaultMessage: "Address to pay",
              })}
            </Text>
            <TruncatedTextPopover text={addressToPay} maxLength={64} className="font-mono text-sm" />
          </div>
        )}
        {linkToPay && (
          <div className="flex items-center gap-2">
            <Text variant="label" className="w-32">
              {intl.formatMessage({
                id: "quotes.paymentRequest.linkToMempool",
                defaultMessage: "Link to mempool",
              })}
            </Text>
            <TruncatedLinkPopover
              href={linkToPay}
              maxLength={48}
              className="font-mono text-sm text-blue-600 hover:underline"
              target="_blank"
              rel="noopener noreferrer"
            />
          </div>
        )}
        {effectiveRequestTime && (
          <div className="flex items-center gap-2">
            <Text variant="label" className="w-32">
              {intl.formatMessage({
                id: "quotes.paymentRequest.requestedAt",
                defaultMessage: "Requested at",
              })}
            </Text>
            <Text variant="caption">{new Date(effectiveRequestTime * 1000).toLocaleString(intl.locale, { timeZone: "UTC" })}</Text>
          </div>
        )}
        {effectiveDeadlineTs && (
          <div className="flex items-center gap-2">
            <Text variant="label" className="w-32">
              {intl.formatMessage({
                id: "quotes.paymentRequest.deadline",
                defaultMessage: "Deadline",
              })}
            </Text>
            <Text variant="caption">{new Date(effectiveDeadlineTs * 1000).toLocaleString(intl.locale, { timeZone: "UTC" })}</Text>
          </div>
        )}
      </div>
    </div>
  );
}
