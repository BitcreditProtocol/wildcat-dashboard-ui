import { Breadcrumbs } from "@/components/Breadcrumbs"
import { PageTitle } from "@/components/PageTitle"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent } from "@/components/ui/card"
import { Skeleton } from "@/components/ui/skeleton"
import { ParticipantsOverviewCard, ParticipantDetail } from "@/components/ParticipantsOverview"
import { getQuoteOptions } from "@/generated/client/@tanstack/react-query.gen"
import { useQuery } from "@tanstack/react-query"
import { useParams, Link } from "react-router"
import { humanReadableDurationDays } from "@/utils/dates"
import { BreadcrumbLink } from "@/components/ui/breadcrumb"
import { QuoteActions } from "./QuoteActions"
import { truncateString } from "@/utils/strings.ts"

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
            </div>

            <div className="flex items-center gap-2">
              <span className="text-sm font-semibold w-32">Sum:</span>
              <span className="text-lg font-bold">{bill.sum} sat</span>
            </div>

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
        ebillPaid={false}
        requestedToPay={false}
      />
    </div>
  )
}

export default function QuotePage() {
  const { id } = useParams()
  const quoteId = id ?? ""

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
      <PageTitle>
        Quote <span className="font-mono">{truncateString(quoteId, 16)}</span>
      </PageTitle>
      <PageBody id={quoteId} />
    </>
  )
}
