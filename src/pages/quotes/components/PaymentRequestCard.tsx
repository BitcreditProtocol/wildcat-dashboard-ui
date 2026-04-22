import { TruncatedLinkPopover, TruncatedTextPopover } from "@bitcredit/ui-library";
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
    <div className="mt-4 p-4 bg-white rounded border">
      <h2 className="text-2xl font-extrabold tracking-tight mb-3">
        {intl.formatMessage({
          id: "quotes.paymentRequest.title",
          defaultMessage: "Payment request",
        })}
      </h2>
      <div className="space-y-1">
        {addressToPay && (
          <div className="flex items-center gap-2">
            <span className="font-bold w-32">
              {intl.formatMessage({
                id: "quotes.paymentRequest.addressToPay",
                defaultMessage: "Address to pay",
              })}
            </span>
            <TruncatedTextPopover text={addressToPay} maxLength={64} className="font-mono text-sm" />
          </div>
        )}
        {linkToPay && (
          <div className="flex items-center gap-2">
            <span className="font-bold w-32">
              {intl.formatMessage({
                id: "quotes.paymentRequest.linkToMempool",
                defaultMessage: "Link to mempool",
              })}
            </span>
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
            <span className="font-bold w-32">
              {intl.formatMessage({
                id: "quotes.paymentRequest.requestedAt",
                defaultMessage: "Requested at",
              })}
            </span>
            <span className="text-sm">{new Date(effectiveRequestTime * 1000).toLocaleString(intl.locale, { timeZone: "UTC" })}</span>
          </div>
        )}
        {effectiveDeadlineTs && (
          <div className="flex items-center gap-2">
            <span className="font-bold w-32">
              {intl.formatMessage({
                id: "quotes.paymentRequest.deadline",
                defaultMessage: "Deadline",
              })}
            </span>
            <span className="text-sm">{new Date(effectiveDeadlineTs * 1000).toLocaleString(intl.locale, { timeZone: "UTC" })}</span>
          </div>
        )}
      </div>
    </div>
  );
}
