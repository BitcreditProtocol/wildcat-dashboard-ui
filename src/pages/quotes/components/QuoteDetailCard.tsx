import { Badge } from "@/components/ui/badge";
import { Card, CardContent, Text } from "@bitcredit/ui-library";
import { ParticipantsOverviewCard, ParticipantDetail } from "@/components/ParticipantsOverview";
import { Currency } from "@/components/Currency";
import { getQuoteStatusVariant } from "@/utils/quote-status";
import { getQuoteStatusMessage } from "@/i18n/descriptors";
import { humanReadableDurationDays } from "@/utils/dates";
import type { InfoReply } from "@/generated/client/types.gen";
import { useIntl } from "react-intl";

interface QuoteDetailCardProps {
  quote: InfoReply;
  effectiveQuoteStatus: string;
  ebillPaid: boolean;
  isMintComplete: boolean;
  isMintCompleteLoading: boolean;
  showPayment: boolean;
  rejectedToPay: boolean;
  isInMempool: boolean | null | undefined;
  requestedToPay: boolean;
}

const formatLocalDateTime = (date: Date): string => {
  const pad = (value: number) => value.toString().padStart(2, "0");

  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())} ${pad(date.getHours())}:${pad(date.getMinutes())}`;
};

export function QuoteDetailCard({
  quote,
  effectiveQuoteStatus,
  ebillPaid,
  isMintComplete,
  isMintCompleteLoading,
  showPayment,
  rejectedToPay,
  isInMempool,
  requestedToPay,
}: QuoteDetailCardProps) {
  const intl = useIntl();
  const bill = quote.bill;

  const maturityDate = bill.maturity_date ? new Date(bill.maturity_date) : null;
  const maturityLabel = maturityDate
    ? humanReadableDurationDays(intl.locale, maturityDate)
    : intl.formatMessage({
        id: "quotes.common.unknown",
        defaultMessage: "Unknown",
      });

  return (
    <Card>
      <CardContent className="pt-6">
        <div className="flex flex-col gap-4">
          <div className="flex flex-col gap-2">
            <div className="flex items-center gap-2">
              <Text variant="label" className="w-32">
                {intl.formatMessage({
                  id: "quotes.detail.quoteId",
                  defaultMessage: "Quote ID:",
                })}
              </Text>
              <Text variant="mono" monoSize="sm">
                {quote.id}
              </Text>
            </div>
            <div className="flex items-center gap-2">
              <Text variant="label" className="w-32">
                {intl.formatMessage({
                  id: "quotes.detail.billId",
                  defaultMessage: "Bill ID:",
                })}
              </Text>
              <Text variant="mono" monoSize="sm">
                {quote.bill.id}
              </Text>
            </div>
            <div className="flex items-center gap-2">
              <Text variant="label" className="w-32">
                {intl.formatMessage({
                  id: "quotes.detail.status",
                  defaultMessage: "Quote status:",
                })}
              </Text>
              <Badge variant={getQuoteStatusVariant(effectiveQuoteStatus)}>
                {intl.formatMessage(getQuoteStatusMessage(effectiveQuoteStatus))}
              </Badge>
            </div>
            {ebillPaid && (
              <div className="flex items-center gap-2">
                <Text variant="label" className="w-32">
                  {intl.formatMessage({
                    id: "quotes.detail.redemptionStatus",
                    defaultMessage: "Redemption status:",
                  })}
                </Text>
                {isMintCompleteLoading ? (
                  <Badge variant="pending">
                    {intl.formatMessage({
                      id: "quotes.redemption.pending",
                      defaultMessage: "Pending",
                    })}
                  </Badge>
                ) : (
                  <Badge variant={isMintComplete ? "success" : "pending"}>
                    {isMintComplete
                      ? intl.formatMessage({
                          id: "quotes.redemption.complete",
                          defaultMessage: "Complete",
                        })
                      : intl.formatMessage({
                          id: "quotes.redemption.pending",
                          defaultMessage: "Pending",
                        })}
                  </Badge>
                )}
              </div>
            )}

            {quote.status === "Offered" && "ttl" in quote && quote.ttl && (
              <div className="flex items-center gap-2">
                <Text variant="label" className="w-32">
                  {intl.formatMessage({
                    id: "quotes.detail.deadline",
                    defaultMessage: "Deadline:",
                  })}
                </Text>
                <Text variant="caption">{formatLocalDateTime(new Date(quote.ttl))}</Text>
              </div>
            )}
            {showPayment && (
              <div className="flex items-center gap-2">
                <Text variant="label" className="w-32">
                  {intl.formatMessage({
                    id: "quotes.detail.payment",
                    defaultMessage: "Payment status:",
                  })}
                </Text>
                {ebillPaid ? (
                  <Badge variant="success">
                    {intl.formatMessage({
                      id: "quotes.payment.paid",
                      defaultMessage: "Paid",
                    })}
                  </Badge>
                ) : rejectedToPay ? (
                  <Badge variant="destructive">
                    {intl.formatMessage({
                      id: "quotes.payment.rejected",
                      defaultMessage: "Rejected to pay",
                    })}
                  </Badge>
                ) : isInMempool ? (
                  <Badge variant="processing">
                    {intl.formatMessage({
                      id: "quotes.payment.inMempool",
                      defaultMessage: "In mempool",
                    })}
                  </Badge>
                ) : !requestedToPay ? (
                  <Badge variant="neutral">
                    {intl.formatMessage({
                      id: "quotes.payment.notRequested",
                      defaultMessage: "Not requested",
                    })}
                  </Badge>
                ) : (
                  <Badge variant="info">
                    {intl.formatMessage({
                      id: "quotes.payment.requested",
                      defaultMessage: "Requested",
                    })}
                  </Badge>
                )}
              </div>
            )}
          </div>
          <div className="flex items-center gap-2">
            <Text variant="label" className="w-32">
              {intl.formatMessage({
                id: "quotes.detail.sum",
                defaultMessage: "Sum:",
              })}
            </Text>
            <Currency value={bill.sum} sourceCurrency="sat" className="text-lg font-bold" amountClassName="text-current" />
          </div>
          {"discounted" in quote && quote.discounted && (
            <>
              <div className="flex items-center gap-2">
                <Text variant="label" className="w-32">
                  {intl.formatMessage({
                    id: "quotes.detail.discounted",
                    defaultMessage: "Fee:",
                  })}
                </Text>
                <Currency value={quote.discounted} sourceCurrency="sat" className="text-lg font-bold" amountClassName="text-current" />
              </div>
              <div className="flex items-center gap-2">
                <Text variant="label" className="w-32">
                  {intl.formatMessage({
                    id: "quotes.detail.discount.absolute",
                    defaultMessage: "Effective fee (absolute):",
                  })}
                </Text>
                <Currency
                  value={bill.sum - quote.discounted}
                  sourceCurrency="sat"
                  className="text-sm font-mono"
                  amountClassName="text-current"
                />
              </div>
              <div className="flex items-center gap-2">
                <Text variant="label" className="w-32">
                  {intl.formatMessage({
                    id: "quotes.detail.discount.relative",
                    defaultMessage: "Effective fee (relative):",
                  })}
                </Text>
                <Text variant="mono" monoSize="sm">
                  {(((bill.sum - quote.discounted) / bill.sum) * 100).toFixed(4)}%
                </Text>
              </div>
            </>
          )}
          <div className="flex items-center gap-2">
            <Text variant="label" className="w-32">
              {intl.formatMessage({
                id: "quotes.detail.maturityDate",
                defaultMessage: "Maturity date:",
              })}
            </Text>
            <Text variant="caption">
              {bill.maturity_date} ({maturityLabel})
            </Text>
          </div>
          <div className="flex items-center gap-2">
            <Text variant="label" className="w-32">
              {intl.formatMessage({
                id: "quotes.detail.participants",
                defaultMessage: "Participants:",
              })}
            </Text>
            <ParticipantsOverviewCard drawee={bill.drawee} drawer={bill.drawer} payee={bill.payee} holder={bill.endorsees} />
          </div>
          <div className="flex items-center gap-2">
            <Text variant="label" className="w-32">
              {intl.formatMessage({
                id: "participants.role.drawee",
                defaultMessage: "Drawee",
              })}
              :
            </Text>
            <ParticipantDetail participant={bill.drawee} />
          </div>
          <div className="flex items-center gap-2">
            <Text variant="label" className="w-32">
              {intl.formatMessage({
                id: "participants.role.drawer",
                defaultMessage: "Drawer",
              })}
              :
            </Text>
            <ParticipantDetail participant={bill.drawer} />
          </div>
          <div className="flex items-center gap-2">
            <Text variant="label" className="w-32">
              {intl.formatMessage({
                id: "participants.role.payee",
                defaultMessage: "Payee",
              })}
              :
            </Text>
            <ParticipantDetail participant={bill.payee} />
          </div>

          {bill.endorsees && bill.endorsees.length > 0 && (
            <span className="flex items-center gap-2">
              <Text variant="label" className="w-32">
                {intl.formatMessage({
                  id: "participants.role.holder",
                  defaultMessage: "Holder",
                })}
                :
              </Text>
              <ParticipantDetail participant={bill.endorsees[bill.endorsees.length - 1]} />
            </span>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
