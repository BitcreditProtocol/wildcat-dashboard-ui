import { Breadcrumbs } from "@/components/Breadcrumbs"
import { PageTitle } from "@/components/PageTitle"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Skeleton } from "@/components/ui/skeleton"
import { ParticipantsOverviewCard, ParticipantDetail } from "@/components/ParticipantsOverview"
import { getQuoteOptions, getEbillOptions } from "@/generated/client/@tanstack/react-query.gen"
import { useQuery } from "@tanstack/react-query"
import { useParams, Link, useLocation } from "react-router"
import { humanReadableDurationDays } from "@/utils/dates"
import { BreadcrumbLink } from "@/components/ui/breadcrumb"
import { QuoteActions } from "./QuoteActionsRefactored"
import { truncateString } from "@/utils/strings.ts"
import { ArrowLeft } from "lucide-react"

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
  const ebillQuery = useQuery({
    ...getEbillOptions({ path: { bid: billId ?? "" } }),
    retry: 1,
    enabled: !!billId,
  })

  if (error) {
    return (
      <div className="flex flex-col gap-4 p-4 bg-red-50 border border-red-200 rounded-lg">
        <div className="text-red-800 font-semibold">Failed to load quote</div>
        <div className="text-red-600 text-sm">{error.message || "Unknown error occurred"}</div>
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
  const ebillPaid = Boolean(paymentStatus?.paid)
  const requestedToPay = Boolean(paymentStatus?.requested_to_pay ?? billStatus?.has_requested_funds)
  const paymentDeadlineTs = paymentStatus?.payment_deadline_timestamp ?? null
  const timeOfRequestToPay = paymentStatus?.time_of_request_to_pay ?? null

  const cws = ebillQuery.data?.current_waiting_state
  const isInMempool = cws && "Payment" in cws && cws.Payment.payment_data?.in_mempool === true

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
                <span className="text-sm font-semibold w-32">ID:</span>
                <span className="font-mono text-sm">{quote.id}</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-sm font-semibold w-32">Status:</span>
                <Badge variant={getStatusVariant(quote.status)}>{quote.status}</Badge>
              </div>
              {(quote.status === "Accepted" || quote.status === "Minting") && "keyset_id" in quote && (
                <div className="flex items-center gap-2">
                  <span className="text-sm font-semibold w-32">Minting:</span>
                  <Badge
                    variant={quote.status === "Minting" ? "default" : "destructive"}
                    className={quote.status === "Minting" ? "bg-blue-500" : "bg-red-500"}
                  >
                    {quote.status === "Minting" ? "Enabled" : "Disabled"}
                  </Badge>
                </div>
              )}
              {(ebillPaid || requestedToPay || isInMempool) && (
                <div className="flex items-center gap-2">
                  <span className="text-sm font-semibold w-32">Payment:</span>
                  {ebillPaid ? (
                    <Badge variant="default" className="bg-green-600">
                      Paid
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
              <div className="flex items-center gap-2">
                <span className="text-sm font-semibold w-32">Discounted:</span>
                <span className="text-lg font-bold">{quote.discounted} sat</span>
              </div>
            )}
            {quote.status === "Minting" && "fee" in quote && (
              <>
                <div className="flex items-center gap-2">
                  <span className="text-sm font-semibold w-32">Fee amount:</span>
                  <span className="text-sm font-mono">{quote.fee} sat</span>
                </div>
                {/* TODO fee token when minting works
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-semibold w-32">Fee token:</span>
                    <span className="text-sm font-mono">{quote.token}</span>
                  </div>
                */}
              </>
            )}
            <div className="flex items-center gap-2">
              <span className="text-sm font-semibold w-32">Maturity date:</span>
              <span className="text-sm">
                {bill.maturity_date} ({maturityLabel})
              </span>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-sm font-semibold w-32">Participants:</span>
              <ParticipantsOverviewCard drawee={bill.drawee} drawer={bill.drawer} payee={bill.payee} />
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
          </div>
        </CardContent>
      </Card>

      <QuoteActions
        value={quote}
        isFetching={isFetching}
        mintingEnabled={quote.status === "Minting"}
        ebillPaid={ebillPaid}
        requestedToPay={requestedToPay}
        paymentDeadlineTs={paymentDeadlineTs}
        timeOfRequestToPay={timeOfRequestToPay}
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
  const fromKeyset = fromPath?.startsWith("/keysets")
  const keysetId = fromPath?.startsWith("/keysets/") ? fromPath.split("/keysets/")[1] : null

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
      {fromKeyset && (
        <div className="mt-4">
          <Button
            variant="outline"
            size="sm"
            asChild
          >
            <Link to={fromPath ?? "/keysets"}>
              <ArrowLeft className="h-4 w-4 mr-2" />
              {keysetId ? (
                <>
                  Back to keyset <span className="font-mono">{truncateString(keysetId, 16)}</span>
                </>
              ) : (
                "Back to keysets"
              )}
            </Link>
          </Button>
        </div>
      )}
      <PageTitle>
        Quote <span className="font-mono">{truncateString(quoteId, 16)}</span>
      </PageTitle>
      <PageBody id={quoteId} />
    </>
  )
}
