import { Breadcrumbs } from "@/components/Breadcrumbs"
import { PageTitle } from "@/components/PageTitle"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Skeleton } from "@/components/ui/skeleton"
import { ParticipantsOverviewCard, ParticipantDetail } from "@/components/ParticipantsOverview"
import { getQuoteOptions, getEbillOptions, getEbillEndorsementsOptions, getEbillMintCompleteOptions } from "@/generated/client/@tanstack/react-query.gen"
import { useQuery } from "@tanstack/react-query"
import { useParams, Link, useLocation } from "react-router"
import { humanReadableDurationDays } from "@/utils/dates"
import { BreadcrumbLink } from "@/components/ui/breadcrumb"
import { QuoteActions } from "./QuoteActions.tsx"
import { truncateString, formatStatusLabel } from "@/utils/strings.ts"
import { TruncatedTextPopover } from "@/components/TruncatedTextPopover.tsx"
import { EndorsementChain } from "@/components/EndorsementChain"
import { FeeTokenQRCodeModal } from "@/components/QRCodeWithErrorBoundary"
import { serializeKeysetId } from "@/utils/keyset"
import { useIntl } from "react-intl"

interface LocationState {
  from?: string
}

function Loader() {
  return (
    <div className="flex flex-col gap-1.5 py-2">
      <Skeleton className="h-48 rounded-lg" />
    </div>
  )
}

function getStatusVariant(status: string): "default" | "secondary" | "destructive" | "success" | "outline" {
  switch (status) {
    case "Offered":
    case "OfferExpired":
      return "default"
    case "Pending":
      return "default"
    case "Accepted":
    case "Minting":
      return "success"
    case "Denied":
    case "Canceled":
    case "Rejected":
      return "destructive"
    default:
      return "outline"
  }
}

function PageBody({ id }: { id: string }) {
  const intl = useIntl()
  const {
    data: quoteData,
    isFetching,
    error,
    isLoading,
  } = useQuery({
    ...getQuoteOptions({
      path: { qid: id },
    }),
    retry: 1,
  })

  const billId = quoteData?.bill?.id
  const quoteStatus = quoteData?.status

  const ebillQuery = useQuery({
    ...getEbillOptions({ path: { bid: billId ?? "" } }),
    retry: 1,
    enabled: !!billId,
  })

  const endorsementsQuery = useQuery({
    ...getEbillEndorsementsOptions({ path: { bid: billId ?? "" } }),
    retry: 1,
    enabled: !!billId,
  })

  const isPaid = ebillQuery.data?.status?.payment?.paid === true
  const shouldCheckMintComplete = (quoteStatus === "Accepted" || quoteStatus === "Minting") || isPaid

  const mintCompleteQuery = useQuery({
    ...getEbillMintCompleteOptions({ path: { bid: billId ?? "" } }),
    retry: 1,
    enabled: !!billId && shouldCheckMintComplete,
    refetchInterval: (query) => {
      if (!shouldCheckMintComplete) {
        return false
      }

      const data = query.state.data
      return data?.complete === false ? 60000 : false
    },
  })

  if (error) {
    const errorMessage = (error as { message?: string }).message ?? String(error)
    return (
      <div className="flex flex-col gap-4 p-4 bg-red-50 border border-red-200 rounded-lg">
        <div className="text-red-800 font-semibold">
          {intl.formatMessage({
            id: "quotes.error.loadQuote.title",
            defaultMessage: "Failed to load quote"
          })}
        </div>
        <div className="text-red-600 text-sm">
          {errorMessage ||
            intl.formatMessage({
              id: "quotes.error.unknown",
              defaultMessage: "Unknown error occurred"
            })}
        </div>
        <div className="text-xs text-red-500">
          {intl.formatMessage({
            id: "quotes.error.checkApi",
            defaultMessage: "Check if the API server is running and accessible",
          })}
        </div>
      </div>
    )
  }

  if (isLoading) {
    return <Loader />
  }

  const quote = quoteData!
  const bill = quote?.bill

  const billStatus = ebillQuery.data?.status
  const paymentStatus = billStatus?.payment
  const cws = ebillQuery.data?.current_waiting_state
  const isMintComplete = mintCompleteQuery.data?.complete ?? false
  const ebillPaid = Boolean(paymentStatus?.paid && isMintComplete)
  const hasPaymentRequestInWaitingState = Boolean(cws && "Payment" in cws)
  const requestedToPay = Boolean(
    paymentStatus?.requested_to_pay ?? billStatus?.has_requested_funds ?? hasPaymentRequestInWaitingState,
  )
  const rejectedToPay = Boolean(paymentStatus?.rejected_to_pay)
  const paymentDeadlineTs = paymentStatus?.payment_deadline_timestamp ?? null
  const timeOfRequestToPay = paymentStatus?.time_of_request_to_pay ?? null

  const isInMempool = cws && "Payment" in cws && cws.Payment.payment_data?.in_mempool === true
  const showPayment = rejectedToPay === true || (isInMempool ?? requestedToPay) === true || ebillPaid === true

  if (!quote || !bill) {
    return (
      <div className="p-4 text-muted-foreground">
        {intl.formatMessage({
          id: "quotes.empty.noQuoteData",
          defaultMessage: "No quote data available"
        })}
      </div>
    )
  }

  const maturityDate = bill.maturity_date ? new Date(bill.maturity_date) : null
  const maturityLabel = maturityDate
    ? humanReadableDurationDays(intl.locale, maturityDate)
    : intl.formatMessage({
      id: "quotes.common.unknown",
      defaultMessage: "Unknown"
    })

  return (
    <div className="flex flex-col gap-4">
      <Card>
        <CardContent className="pt-6">
          <div className="flex flex-col gap-4">
            <div className="flex flex-col gap-2">
              <div className="flex items-center gap-2">
                <span className="text-sm font-semibold w-32">
                  {intl.formatMessage({
                    id: "quotes.detail.quoteId",
                    defaultMessage: "Quote ID:"
                  })}
                </span>
                <span className="font-mono text-sm">{quote.id}</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-sm font-semibold w-32">
                  {intl.formatMessage({
                    id: "quotes.detail.billId",
                    defaultMessage: "Bill ID:"
                  })}
                </span>
                <span className="font-mono text-sm">{quote.bill.id}</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-sm font-semibold w-32">
                  {intl.formatMessage({
                    id: "quotes.detail.status",
                    defaultMessage: "Status:"
                  })}
                </span>
                <Badge variant={getStatusVariant(quote.status)}>
                  {intl.formatMessage({
                    id: `quote.status.${quote.status}`,
                    defaultMessage: formatStatusLabel(quote.status),
                  })}
                </Badge>
              </div>
              {(quote.status === "Accepted" || quote.status === "Minting") && "keyset_id" in quote && (
                <div className="flex items-center gap-2">
                  <span className="text-sm font-semibold w-32">
                    {intl.formatMessage({
                      id: "quotes.detail.minting",
                      defaultMessage: "Minting:"
                    })}
                  </span>
                  <Badge
                    variant={quote.status === "Minting" ? "default" : "destructive"}
                    className={quote.status === "Minting" ? "bg-blue-500" : "bg-red-500"}
                  >
                    {quote.status === "Minting"
                      ? intl.formatMessage({
                        id: "quotes.detail.minting.active",
                        defaultMessage: "Active"
                      })
                      : intl.formatMessage({
                        id: "quotes.detail.minting.inactive",
                        defaultMessage: "Inactive"
                      })}
                  </Badge>
                </div>
              )}

              {quote.status === "Offered" && "ttl" in quote && quote.ttl && (
                <div className="flex items-center gap-2">
                  <span className="text-sm font-semibold w-32">
                    {intl.formatMessage({
                      id: "quotes.detail.deadline",
                      defaultMessage: "Deadline:"
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
                      defaultMessage: "Payment:"
                    })}
                  </span>
                  {ebillPaid ? (
                    <Badge variant="default" className="bg-green-600">
                      {intl.formatMessage({
                        id: "quotes.payment.paid",
                        defaultMessage: "Paid"
                      })}
                    </Badge>
                  ) : rejectedToPay ? (
                    <Badge variant="destructive" className="bg-red-600">
                      {intl.formatMessage({
                        id: "quotes.payment.rejected",
                        defaultMessage: "Rejected to pay"
                      })}
                    </Badge>
                  ) : isInMempool ? (
                    <Badge variant="default" className="bg-orange-500">
                      {intl.formatMessage({
                        id: "quotes.payment.inMempool",
                        defaultMessage: "In mempool"
                      })}
                    </Badge>
                  ) : (
                    <Badge variant="default" className="bg-blue-500">
                      {intl.formatMessage({
                        id: "quotes.payment.requested",
                        defaultMessage: "Requested"
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
                  defaultMessage: "Sum:"
                })}
              </span>
              <span className="text-lg font-bold">{bill.sum} sat</span>
            </div>
            {"discounted" in quote && quote.discounted && (
              <>
                <div className="flex items-center gap-2">
                  <span className="text-sm font-semibold w-32">
                    {intl.formatMessage({
                      id: "quotes.detail.discounted",
                      defaultMessage: "Discounted:"
                    })}
                  </span>
                  <span className="text-lg font-bold">{quote.discounted} sat</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-sm font-semibold w-32">
                    {intl.formatMessage({
                      id: "quotes.detail.discount.absolute",
                      defaultMessage: "Effective discount (absolute):",
                    })}
                  </span>
                  <span className="text-sm font-mono">{bill.sum - quote.discounted} sat</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-sm font-semibold w-32">
                    {intl.formatMessage({
                      id: "quotes.detail.discount.relative",
                      defaultMessage: "Effective discount (relative):",
                    })}
                  </span>
                  <span className="text-sm font-mono">
                    {(((bill.sum - quote.discounted) / bill.sum) * 100).toFixed(4)}%
                  </span>
                </div>
              </>
            )}
            {quote.status === "Minting" && "fee" in quote && (
              <div className="flex items-center gap-2">
                <span className="text-sm font-semibold w-32">
                  {intl.formatMessage({
                    id: "quotes.detail.feeToken",
                    defaultMessage: "Fee token:"
                  })}
                </span>
                <TruncatedTextPopover
                  text={quote.fee}
                  maxLength={64}
                  className="font-mono text-sm"
                  showCopyButton={true}
                />
                <FeeTokenQRCodeModal feeToken={quote.fee} />
              </div>
            )}
            <div className="flex items-center gap-2">
              <span className="text-sm font-semibold w-32">
                {intl.formatMessage({
                  id: "quotes.detail.maturityDate",
                  defaultMessage: "Maturity date:"
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
                  defaultMessage: "Participants:"
                })}
              </span>
              <ParticipantsOverviewCard
                drawee={bill.drawee}
                drawer={bill.drawer}
                payee={bill.payee}
                holder={bill.endorsees}
              />
            </div>
            <div className="flex items-center gap-2">
              <span className="text-sm font-semibold w-32">
                {intl.formatMessage({
                  id: "participants.role.drawee",
                  defaultMessage: "Drawee"
                })}:
              </span>
              <ParticipantDetail participant={bill.drawee} />
            </div>
            <div className="flex items-center gap-2">
              <span className="text-sm font-semibold w-32">
                {intl.formatMessage({
                  id: "participants.role.drawer",
                  defaultMessage: "Drawer"
                })}:
              </span>
              <ParticipantDetail participant={bill.drawer} />
            </div>
            <div className="flex items-center gap-2">
              <span className="text-sm font-semibold w-32">
                {intl.formatMessage({
                  id: "participants.role.payee",
                  defaultMessage: "Payee"
                })}:
              </span>
              <ParticipantDetail participant={bill.payee} />
            </div>

            {bill.endorsees && bill.endorsees.length > 0 && (
              <span className="flex items-center gap-2">
                <span className="text-sm font-semibold w-32">
                  {intl.formatMessage({
                    id: "participants.role.holder",
                    defaultMessage: "Holder"
                  })}:
                </span>
                <ParticipantDetail participant={bill.endorsees[bill.endorsees.length - 1]} />
              </span>
            )}
          </div>
        </CardContent>
      </Card>

      <QuoteActions
        value={quote}
        isFetching={isFetching}
        mintingEnabled={quote.status === "Minting"}
        ebillPaid={ebillPaid}
        isMintComplete={isMintComplete}
        requestedToPay={requestedToPay}
        paymentDeadlineTs={paymentDeadlineTs}
        timeOfRequestToPay={timeOfRequestToPay}
      />

      {/* Endorsement Chain & Bill History */}
      <EndorsementChain
        endorsements={endorsementsQuery.data}
        isLoading={endorsementsQuery.isLoading}
        issueDate={ebillQuery.data?.data?.issue_date}
        maturityDate={bill.maturity_date}
        requestToPayTimestamp={ebillQuery.data?.status?.payment?.time_of_request_to_pay ?? undefined}
        rejectedToPayTimestamp={
          ebillQuery.data?.status?.payment?.rejected_to_pay
            ? (ebillQuery.data?.status?.last_block_time ?? undefined)
            : undefined
        }
        paymentTimestamp={
          ebillQuery.data?.status?.payment?.paid ? (ebillQuery.data?.status?.last_block_time ?? undefined) : undefined
        }
        acceptanceTimestamp={
          ebillQuery.data?.status?.acceptance?.accepted
            ? (ebillQuery.data?.status?.acceptance?.time_of_request_to_accept ?? undefined)
            : undefined
        }
        rejectionTimestamp={
          ebillQuery.data?.status?.acceptance?.rejected_to_accept
            ? (ebillQuery.data?.status?.last_block_time ?? undefined)
            : undefined
        }
        mintingEnabled={quote.status === "Minting"}
        quoteOffered={quote.status === "Offered" || quote.status === "Accepted" || quote.status === "Minting"}
        offeredTimestamp={
          "submitted" in quote
            ? Math.floor(new Date(quote.submitted).getTime() / 1000)
            : "tstamp" in quote
              ? Math.floor(new Date(quote.tstamp).getTime() / 1000)
              : undefined
        }
      />
    </div>
  )
}

export default function QuotePage() {
  const intl = useIntl()
  const { id } = useParams()
  const quoteId = id ?? ""
  const location = useLocation()
  const state = location.state as LocationState | null
  const fromPath = state?.from
  const fromKeyset = fromPath?.startsWith("/keysets/")
  const keysetIdFromState = fromKeyset && fromPath ? fromPath.split("/keysets/")[1] : null

  const { data: quoteData } = useQuery({
    ...getQuoteOptions({
      path: { qid: quoteId },
    }),
    retry: 1,
  })

  const hasKeysetId =
    quoteData && (quoteData.status === "Accepted" || quoteData.status === "Minting") && "keyset_id" in quoteData

  return (
    <>
      <Breadcrumbs
        parents={[
          <BreadcrumbLink key="quotes" asChild>
            <Link to="/quotes">
              {intl.formatMessage({
                id: "quotes.breadcrumb",
                defaultMessage: "Quotes"
              })}
            </Link>
          </BreadcrumbLink>,
        ]}
      >
        {quoteId}
      </Breadcrumbs>

      <div className="flex items-center justify-between">
        <PageTitle>
          {intl.formatMessage({
            id: "quotes.detail.title",
            defaultMessage: "Quote"
          })}{" "}
          <span className="font-mono">{truncateString(quoteId, 16)}</span>
        </PageTitle>
        {fromKeyset && keysetIdFromState ? (
          <Button variant="outline" size="sm" asChild>
            <Link to={`/keysets/${keysetIdFromState}`} state={{ from: `/quotes/${quoteId}` }}>
              {intl.formatMessage({
                id: "quotes.detail.backToKeyset",
                defaultMessage: "Back to keyset"
              })}{" "}
              <span className="font-mono">{truncateString(keysetIdFromState, 16)}</span>
            </Link>
          </Button>
        ) : hasKeysetId ? (
          <Button variant="outline" size="sm" asChild>
            <Link to={`/keysets/${serializeKeysetId(quoteData.keyset_id)}`} state={{ from: `/quotes/${quoteId}` }}>
              {intl.formatMessage({
                id: "quotes.detail.goToKeyset",
                defaultMessage: "Go to keyset"
              })}{" "}
              <span className="font-mono">{truncateString(serializeKeysetId(quoteData.keyset_id), 16)}</span>
            </Link>
          </Button>
        ) : null}
      </div>
      <PageBody id={quoteId} />
    </>
  )
}
