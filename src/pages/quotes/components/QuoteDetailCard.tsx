import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { ParticipantsOverviewCard, ParticipantDetail } from "@/components/ParticipantsOverview";
import { Currency } from "@/components/Currency";
import { TruncatedTextPopover } from "@bitcredit/ui-library";
import { FeeTokenQRCodeModal } from "@/components/QRCodeWithErrorBoundary";
import { formatStatusLabel } from "@/utils/strings";
import { getQuoteStatusVariant } from "@/utils/quote-status";
import { humanReadableDurationDays } from "@/utils/dates";
import type { InfoReply, TokenStateResponse } from "@/generated/client/types.gen";
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
  feeToken: string | null;
  isFeeTokenStatusPending: boolean;
  feeTokenStatusData: TokenStateResponse | undefined;
  isFeeTokenStatusError: boolean;
}

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
  feeToken,
  isFeeTokenStatusPending,
  feeTokenStatusData,
  isFeeTokenStatusError,
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
              <span className="text-sm font-semibold w-32">
                {intl.formatMessage({
                  id: "quotes.detail.quoteId",
                  defaultMessage: "Quote ID:",
                })}
              </span>
              <span className="font-mono text-sm">{quote.id}</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-sm font-semibold w-32">
                {intl.formatMessage({
                  id: "quotes.detail.billId",
                  defaultMessage: "Bill ID:",
                })}
              </span>
              <span className="font-mono text-sm">{quote.bill.id}</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-sm font-semibold w-32">
                {intl.formatMessage({
                  id: "quotes.detail.status",
                  defaultMessage: "Quote status:",
                })}
              </span>
              <Badge variant={getQuoteStatusVariant(effectiveQuoteStatus)}>
                {intl.formatMessage({
                  id: `quote.status.${effectiveQuoteStatus}`,
                  defaultMessage: formatStatusLabel(effectiveQuoteStatus),
                })}
              </Badge>
            </div>
            {ebillPaid && (
              <div className="flex items-center gap-2">
                <span className="text-sm font-semibold w-32">
                  {intl.formatMessage({
                    id: "quotes.detail.redemptionStatus",
                    defaultMessage: "Redemption status:",
                  })}
                </span>
                {isMintCompleteLoading ? (
                  <Badge variant="default" className="bg-yellow-500">
                    {intl.formatMessage({
                      id: "quotes.redemption.pending",
                      defaultMessage: "Pending",
                    })}
                  </Badge>
                ) : (
                  <Badge variant="default" className={isMintComplete ? "bg-green-600" : "bg-yellow-500"}>
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
                <span className="text-sm font-semibold w-32">
                  {intl.formatMessage({
                    id: "quotes.detail.deadline",
                    defaultMessage: "Deadline:",
                  })}
                </span>
                <span>{new Date(quote.ttl).toISOString().split("T")[0]}</span>
              </div>
            )}
            {showPayment && (
              <div className="flex items-center gap-2">
                <span className="text-sm font-semibold w-32">
                  {intl.formatMessage({
                    id: "quotes.detail.payment",
                    defaultMessage: "Payment status:",
                  })}
                </span>
                {ebillPaid ? (
                  <Badge variant="default" className="bg-green-600">
                    {intl.formatMessage({
                      id: "quotes.payment.paid",
                      defaultMessage: "Paid",
                    })}
                  </Badge>
                ) : rejectedToPay ? (
                  <Badge variant="destructive" className="bg-red-600">
                    {intl.formatMessage({
                      id: "quotes.payment.rejected",
                      defaultMessage: "Rejected to pay",
                    })}
                  </Badge>
                ) : isInMempool ? (
                  <Badge variant="default" className="bg-orange-500">
                    {intl.formatMessage({
                      id: "quotes.payment.inMempool",
                      defaultMessage: "In mempool",
                    })}
                  </Badge>
                ) : !requestedToPay ? (
                  <Badge variant="secondary" className="border border-border">
                    {intl.formatMessage({
                      id: "quotes.payment.notRequested",
                      defaultMessage: "Not requested",
                    })}
                  </Badge>
                ) : (
                  <Badge variant="default" className="bg-blue-500">
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
            <span className="text-sm font-semibold w-32">
              {intl.formatMessage({
                id: "quotes.detail.sum",
                defaultMessage: "Sum:",
              })}
            </span>
            <Currency value={bill.sum} sourceCurrency="sat" className="text-lg font-bold" amountClassName="text-current" />
          </div>
          {"discounted" in quote && quote.discounted && (
            <>
              <div className="flex items-center gap-2">
                <span className="text-sm font-semibold w-32">
                  {intl.formatMessage({
                    id: "quotes.detail.discounted",
                    defaultMessage: "Fee:",
                  })}
                </span>
                <Currency value={quote.discounted} sourceCurrency="sat" className="text-lg font-bold" amountClassName="text-current" />
              </div>
              <div className="flex items-center gap-2">
                <span className="text-sm font-semibold w-32">
                  {intl.formatMessage({
                    id: "quotes.detail.discount.absolute",
                    defaultMessage: "Effective fee (absolute):",
                  })}
                </span>
                <Currency
                  value={bill.sum - quote.discounted}
                  sourceCurrency="sat"
                  className="text-sm font-mono"
                  amountClassName="text-current"
                />
              </div>
              <div className="flex items-center gap-2">
                <span className="text-sm font-semibold w-32">
                  {intl.formatMessage({
                    id: "quotes.detail.discount.relative",
                    defaultMessage: "Effective fee (relative):",
                  })}
                </span>
                <span className="text-sm font-mono">{(((bill.sum - quote.discounted) / bill.sum) * 100).toFixed(4)}%</span>
              </div>
            </>
          )}
          {quote.status === "MintingEnabled" && feeToken && (
            <div className="flex items-center gap-2">
              <span className="text-sm font-semibold w-32">
                {intl.formatMessage({
                  id: "quotes.detail.feeToken",
                  defaultMessage: "Fee token:",
                })}
              </span>
              {/* TODO: copy-button support. showCopyButton={true} */}
              <TruncatedTextPopover text={feeToken} maxLength={64} className="font-mono text-sm" />
              <FeeTokenQRCodeModal feeToken={feeToken} />
              {isFeeTokenStatusPending ? (
                <Badge variant="default" className="bg-gray-500">
                  {intl.formatMessage({
                    id: "quotes.feeToken.badge.checking",
                    defaultMessage: "Checking...",
                  })}
                </Badge>
              ) : feeTokenStatusData?.state === "Spent" ? (
                <Badge variant="destructive" className="bg-red-600">
                  {intl.formatMessage({
                    id: "quotes.feeToken.badge.spent",
                    defaultMessage: "Spent",
                  })}
                </Badge>
              ) : feeTokenStatusData?.state === "Unspent" ? (
                <Badge variant="default" className="bg-green-600">
                  {intl.formatMessage({
                    id: "quotes.feeToken.badge.active",
                    defaultMessage: "Active",
                  })}
                </Badge>
              ) : isFeeTokenStatusError ? (
                <Badge variant="destructive" className="bg-red-600">
                  {intl.formatMessage({
                    id: "quotes.feeToken.badge.error",
                    defaultMessage: "Error",
                  })}
                </Badge>
              ) : feeTokenStatusData?.state ? (
                <Badge variant="secondary" className="border border-border">
                  {intl.formatMessage({
                    id: "quotes.feeToken.badge.unknown",
                    defaultMessage: "Unknown",
                  })}
                </Badge>
              ) : null}
            </div>
          )}
          <div className="flex items-center gap-2">
            <span className="text-sm font-semibold w-32">
              {intl.formatMessage({
                id: "quotes.detail.maturityDate",
                defaultMessage: "Maturity date:",
              })}
            </span>
            <span className="text-sm">
              {bill.maturity_date} ({maturityLabel})
            </span>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-sm font-semibold w-32">
              {intl.formatMessage({
                id: "quotes.detail.participants",
                defaultMessage: "Participants:",
              })}
            </span>
            <ParticipantsOverviewCard drawee={bill.drawee} drawer={bill.drawer} payee={bill.payee} holder={bill.endorsees} />
          </div>
          <div className="flex items-center gap-2">
            <span className="text-sm font-semibold w-32">
              {intl.formatMessage({
                id: "participants.role.drawee",
                defaultMessage: "Drawee",
              })}
              :
            </span>
            <ParticipantDetail participant={bill.drawee} />
          </div>
          <div className="flex items-center gap-2">
            <span className="text-sm font-semibold w-32">
              {intl.formatMessage({
                id: "participants.role.drawer",
                defaultMessage: "Drawer",
              })}
              :
            </span>
            <ParticipantDetail participant={bill.drawer} />
          </div>
          <div className="flex items-center gap-2">
            <span className="text-sm font-semibold w-32">
              {intl.formatMessage({
                id: "participants.role.payee",
                defaultMessage: "Payee",
              })}
              :
            </span>
            <ParticipantDetail participant={bill.payee} />
          </div>

          {bill.endorsees && bill.endorsees.length > 0 && (
            <span className="flex items-center gap-2">
              <span className="text-sm font-semibold w-32">
                {intl.formatMessage({
                  id: "participants.role.holder",
                  defaultMessage: "Holder",
                })}
                :
              </span>
              <ParticipantDetail participant={bill.endorsees[bill.endorsees.length - 1]} />
            </span>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
