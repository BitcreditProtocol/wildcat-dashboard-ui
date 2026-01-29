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
        <div className="text-red-800 font-semibold">Failed to load quote</div>
        <div className="text-red-600 text-sm">{"Unknown error occurred: " + errorMessage}</div>
        <div className="text-xs text-red-500">Check if the API server is running and accessible</div>
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
    return <div className="p-4 text-muted-foreground">No quote data available</div>
  }

  const maturityDate = bill.maturity_date ? new Date(bill.maturity_date) : null
  const maturityLabel = maturityDate ? humanReadableDurationDays("en-US", maturityDate) : "Unknown"

  return (
    <div className="flex flex-col gap-4">
      <Card>
        <CardContent className="pt-6">
          <div className="flex flex-col gap-4">
            <div className="flex flex-col gap-2">
              <div className="flex items-center gap-2">
                <span className="text-sm font-semibold w-32">Quote ID:</span>
                <span className="font-mono text-sm">{quote.id}</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-sm font-semibold w-32">Bill ID:</span>
                <span className="font-mono text-sm">{quote.bill.id}</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-sm font-semibold w-32">Status:</span>
                <Badge variant={getStatusVariant(quote.status)}>{formatStatusLabel(quote.status)}</Badge>
              </div>
              {(quote.status === "Accepted" || quote.status === "Minting") && "keyset_id" in quote && (
                <div className="flex items-center gap-2">
                  <span className="text-sm font-semibold w-32">Minting:</span>
                  <Badge
                    variant={quote.status === "Minting" ? "default" : "destructive"}
                    className={quote.status === "Minting" ? "bg-blue-500" : "bg-red-500"}
                  >
                    {quote.status === "Minting" ? "Active" : "Inactive"}
                  </Badge>
                </div>
              )}

              {quote.status === "Offered" && "ttl" in quote && quote.ttl && (
                <div className="flex items-center gap-2">
                  <span className="text-sm font-semibold w-32">Deadline:</span>
                  <span>{new Date(quote.ttl).toISOString().split("T")[0]}</span>
                </div>
              )}
              {showPayment && (
                <div className="flex items-center gap-2">
                  <span className="text-sm font-semibold w-32">Payment:</span>
                  {ebillPaid ? (
                    <Badge variant="default" className="bg-green-600">
                      Paid
                    </Badge>
                  ) : rejectedToPay ? (
                    <Badge variant="destructive" className="bg-red-600">
                      Rejected to pay
                    </Badge>
                  ) : isInMempool ? (
                    <Badge variant="default" className="bg-orange-500">
                      In mempool
                    </Badge>
                  ) : (
                    <Badge variant="default" className="bg-blue-500">
                      Requested
                    </Badge>
                  )}
                </div>
              )}
            </div>
            <div className="flex items-center gap-2">
              <span className="text-sm font-semibold w-32">Sum:</span>
              <span className="text-lg font-bold">{bill.sum} sat</span>
            </div>
            {"discounted" in quote && quote.discounted && (
              <>
                <div className="flex items-center gap-2">
                  <span className="text-sm font-semibold w-32">Discounted:</span>
                  <span className="text-lg font-bold">{quote.discounted} sat</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-sm font-semibold w-32">Effective discount (absolute):</span>
                  <span className="text-sm font-mono">{bill.sum - quote.discounted} sat</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-sm font-semibold w-32">Effective discount (relative):</span>
                  <span className="text-sm font-mono">
                    {(((bill.sum - quote.discounted) / bill.sum) * 100).toFixed(4)}%
                  </span>
                </div>
              </>
            )}
            {quote.status === "Minting" && "fee" in quote && (
              <div className="flex items-center gap-2">
                <span className="text-sm font-semibold w-32">Fee token:</span>
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
              <span className="text-sm font-semibold w-32">Maturity date:</span>
              <span className="text-sm">
                {bill.maturity_date} ({maturityLabel})
              </span>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-sm font-semibold w-32">Participants:</span>
              <ParticipantsOverviewCard
                drawee={bill.drawee}
                drawer={bill.drawer}
                payee={bill.payee}
                holder={bill.endorsees}
              />
            </div>
            <div className="flex items-center gap-2">
              <span className="text-sm font-semibold w-32">Drawee:</span>
              <ParticipantDetail participant={bill.drawee} />
            </div>
            <div className="flex items-center gap-2">
              <span className="text-sm font-semibold w-32">Drawer:</span>
              <ParticipantDetail participant={bill.drawer} />
            </div>
            <div className="flex items-center gap-2">
              <span className="text-sm font-semibold w-32">Payee:</span>
              <ParticipantDetail participant={bill.payee} />
            </div>

            {bill.endorsees && bill.endorsees.length > 0 && (
              <span className="flex items-center gap-2">
                <span className="text-sm font-semibold w-32">Holder:</span>
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
            <Link to="/quotes">Quotes</Link>
          </BreadcrumbLink>,
        ]}
      >
        {quoteId}
      </Breadcrumbs>

      <div className="flex items-center justify-between">
        <PageTitle>
          Quote <span className="font-mono">{truncateString(quoteId, 16)}</span>
        </PageTitle>
        {fromKeyset && keysetIdFromState ? (
          <Button variant="outline" size="sm" asChild>
            <Link to={`/keysets/${keysetIdFromState}`} state={{ from: `/quotes/${quoteId}` }}>
              Back to keyset <span className="font-mono">{truncateString(keysetIdFromState, 16)}</span>
            </Link>
          </Button>
        ) : hasKeysetId ? (
          <Button variant="outline" size="sm" asChild>
            <Link to={`/keysets/${serializeKeysetId(quoteData.keyset_id)}`} state={{ from: `/quotes/${quoteId}` }}>
              Go to keyset <span className="font-mono">{truncateString(serializeKeysetId(quoteData.keyset_id), 16)}</span>
            </Link>
          </Button>
        ) : null}
      </div>
      <PageBody id={quoteId} />
    </>
  )
}
