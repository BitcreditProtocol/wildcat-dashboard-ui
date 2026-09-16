import { Card, CardContent, Text } from "@bitcredit/ui-library";
import { Badge } from "@/components/ui/badge";
import { HighlightText } from "@/components/ui/highlight-text";
import { Link } from "react-router";
import { defineMessages, useIntl } from "react-intl";
import type { BitcreditBill } from "@/generated/client/types.gen";
import { type AnyParticipant, isIdentified, unwrapParticipant } from "@/utils/bill-participants";

const messages = defineMessages({
  maturity: { id: "bills.item.maturity", defaultMessage: "Maturity: {date}" },
  drawee: { id: "bills.item.drawee", defaultMessage: "Drawee: {name}" },
  payee: { id: "bills.item.payee", defaultMessage: "Payee: {name}" },
  accepted: { id: "bills.item.accepted", defaultMessage: "Accepted" },
  paid: { id: "bills.item.paid", defaultMessage: "Paid" },
  requestedToPay: { id: "bills.item.requestedToPay", defaultMessage: "Requested to pay" },
  anonymous: { id: "bills.item.anonymous", defaultMessage: "Anonymous" },
});

function nameOf(participant: AnyParticipant | null | undefined, anonymousLabel: string): string {
  const unwrapped = unwrapParticipant(participant);
  return unwrapped && isIdentified(unwrapped) ? unwrapped.name : anonymousLabel;
}

export function BillItemCard({ bill, searchQuery }: { bill: BitcreditBill; searchQuery: string }) {
  const intl = useIntl();
  const anonymousLabel = intl.formatMessage(messages.anonymous);
  const payment = bill.status?.payment;

  return (
    <Card>
      <CardContent className="py-4">
        <Link to={`/bills/${bill.id}`} className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
          <div className="flex min-w-0 flex-col gap-1">
            <Text variant="mono" monoSize="sm" className="break-all">
              <HighlightText text={bill.id} highlight={searchQuery} />
            </Text>
            <Text variant="bodyMuted">{intl.formatMessage(messages.maturity, { date: bill.data?.maturity_date ?? "" })}</Text>
            <Text variant="bodyMuted">
              {intl.formatMessage(messages.drawee, { name: nameOf(bill.participants?.drawee, anonymousLabel) })}
            </Text>
            <Text variant="bodyMuted">
              {intl.formatMessage(messages.payee, { name: nameOf(bill.participants?.payee, anonymousLabel) })}
            </Text>
          </div>
          <div className="flex shrink-0 flex-col items-start gap-2 sm:items-end">
            <Text variant="titleSm">{`${bill.data?.sum ?? ""} ${bill.data?.currency ?? ""}`}</Text>
            <div className="flex flex-wrap gap-1">
              {bill.status?.acceptance?.accepted && <Badge variant="success">{intl.formatMessage(messages.accepted)}</Badge>}
              {payment?.paid && <Badge variant="success">{intl.formatMessage(messages.paid)}</Badge>}
              {!payment?.paid && payment?.requested_to_pay && (
                <Badge variant="pending">{intl.formatMessage(messages.requestedToPay)}</Badge>
              )}
            </div>
          </div>
        </Link>
      </CardContent>
    </Card>
  );
}
