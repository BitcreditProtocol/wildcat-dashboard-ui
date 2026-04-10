import { Link } from "react-router";
import { Badge } from "@/components/ui/badge";
import { ArrowRight } from "lucide-react";
import type { BitcreditBill, EbillPaymentComplete, InfoReply, LightInfo } from "@/generated/client/types.gen";
import type { UseQueryResult } from "@tanstack/react-query";
import { truncateString, formatStatusLabel } from "@/utils/strings";
import {
  getEffectiveQuoteStatus,
  getQuoteStatusVariant,
} from "@/utils/quote-status";
import { FormattedMessage, useIntl } from "react-intl";

interface KeysetQuoteTableRowProps {
  quote: LightInfo;
  quoteDetails: InfoReply | undefined;
  ebill: BitcreditBill | null | undefined;
  mintCompleteQuery: UseQueryResult<EbillPaymentComplete> | null;
  keysetId: string;
}

export function KeysetQuoteTableRow({
  quote,
  quoteDetails,
  ebill,
  mintCompleteQuery,
  keysetId,
}: KeysetQuoteTableRowProps) {
  const intl = useIntl();

  const quoteStatus = quoteDetails?.status ?? quote.status;
  const effectiveQuoteStatus = getEffectiveQuoteStatus(quoteStatus, ebill);
  const paymentStatus = ebill?.status?.payment;
  const cws = ebill?.current_waiting_state;
  const isPaid = paymentStatus?.paid === true;
  const isInMempool =
    cws &&
    "Payment" in cws &&
    cws.Payment.payment_data?.in_mempool === true;
  const hasPaymentRequestInWaitingState = Boolean(cws && "Payment" in cws);
  const requestedToPay = Boolean(
    paymentStatus?.requested_to_pay ??
    ebill?.status?.has_requested_funds ??
    hasPaymentRequestInWaitingState,
  );
  const rejectedToPay = Boolean(paymentStatus?.rejected_to_pay);

  const isMintComplete = mintCompleteQuery?.data?.complete === true;
  const isMintLoading = mintCompleteQuery?.isLoading;

  let paymentAddress: string | undefined;
  if (cws && "Payment" in cws) {
    paymentAddress = cws.Payment.payment_data?.address_to_pay;
  }

  return (
    <tr
      key={quote.id}
      className="border-t hover:bg-gray-50"
    >
      <td className="p-2 font-mono">
        <Link
          to={{ pathname: `/quotes/${quote.id}` }}
          state={{ from: `/keysets/${keysetId}` }}
          className="text-blue-600 hover:underline"
        >
          {truncateString(quote.id, 16)}
        </Link>
      </td>
      <td className="p-2">
        <Badge variant={getQuoteStatusVariant(effectiveQuoteStatus)}>
          {intl.formatMessage({
            id: `quote.status.${effectiveQuoteStatus}`,
            defaultMessage: formatStatusLabel(effectiveQuoteStatus),
          })}
        </Badge>
      </td>
      <td className="p-2">
        {ebill ? (
          isPaid ? (
            <Badge variant="default" className="bg-green-600">
              <FormattedMessage id="quotes.payment.paid" defaultMessage="Paid" />
            </Badge>
          ) : rejectedToPay ? (
            <Badge variant="destructive" className="bg-red-600">
              <FormattedMessage id="quotes.payment.rejected" defaultMessage="Rejected to pay" />
            </Badge>
          ) : isInMempool ? (
            <Badge variant="default" className="bg-orange-500">
              <FormattedMessage id="quotes.payment.inMempool" defaultMessage="In mempool" />
            </Badge>
          ) : !requestedToPay ? (
            <Badge variant="secondary" className="border border-border">
              <FormattedMessage id="quotes.payment.notRequested" defaultMessage="Not requested" />
            </Badge>
          ) : (
            <Badge variant="default" className="bg-blue-500">
              <FormattedMessage id="quotes.payment.requested" defaultMessage="Requested" />
            </Badge>
          )
        ) : (
          <Badge variant="secondary" className="border border-border">
            <FormattedMessage id="keyset.detail.table.na" defaultMessage="N/A" />
          </Badge>
        )}
      </td>
      <td className="p-2">
        {!isPaid ? (
          <Badge variant="secondary" className="border border-border">
            <FormattedMessage id="keyset.detail.table.na" defaultMessage="N/A" />
          </Badge>
        ) : isMintLoading || !mintCompleteQuery ? (
          <Badge variant="default" className="bg-yellow-500">
            <FormattedMessage id="keyset.detail.table.mintPending" defaultMessage="Pending" />
          </Badge>
        ) : (
          <Badge
            variant="default"
            className={isMintComplete ? "bg-green-600" : "bg-yellow-500"}
          >
            {isMintComplete ? (
              <FormattedMessage id="keyset.detail.table.mintComplete" defaultMessage="Complete" />
            ) : (
              <FormattedMessage id="keyset.detail.table.mintPending" defaultMessage="Pending" />
            )}
          </Badge>
        )}
      </td>
      <td className="p-2 font-mono text-xs break-all">
        {paymentAddress ?? (
          <Badge variant="secondary" className="border border-border">
            <FormattedMessage id="keyset.detail.table.na" defaultMessage="N/A" />
          </Badge>
        )}
      </td>
      <td className="p-2 text-right">{quote.sum} sat</td>
      <td className="p-2 text-right">
        <Link
          to={{ pathname: `/quotes/${quote.id}` }}
          state={{ from: `/keysets/${keysetId}` }}
          className="text-blue-600 hover:text-blue-800 inline-flex items-center"
        >
          <ArrowRight className="h-4 w-4" />
        </Link>
      </td>
    </tr>
  );
}
