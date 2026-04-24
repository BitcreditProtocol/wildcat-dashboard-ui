import { Heading, Text, TruncatedLinkPopover, TruncatedTextPopover } from "@bitcredit/ui-library";
import { useIntl } from "react-intl";

interface PaymentRequestCardProps {
  addressToPay?: string;
  linkToPay?: string;
  effectiveRequestTime: number | null;
  effectiveDeadlineTs: number | null;
}

export function PaymentRequestCard({ addressToPay, linkToPay, effectiveRequestTime, effectiveDeadlineTs }: PaymentRequestCardProps) {
  const intl = useIntl();
  return (
    <div className="mt-4 p-4 bg-white dark:bg-elevation-200 rounded border">
      <Heading as="h2" variant="page" className="mb-3">
        {intl.formatMessage({
          id: "quotes.paymentRequest.title",
          defaultMessage: "Payment request",
        })}
      </Heading>
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
