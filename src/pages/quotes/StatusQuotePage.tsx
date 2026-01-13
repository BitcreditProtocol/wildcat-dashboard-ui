import { Breadcrumbs } from "@/components/Breadcrumbs"
import { PageTitle } from "@/components/PageTitle"
import { Button } from "@/components/ui/button"
import { Card, CardTitle } from "@/components/ui/card"
import { Skeleton } from "@/components/ui/skeleton"
import { listQuotesOptions, getQuoteOptions, listEbillsOptions } from "@/generated/client/@tanstack/react-query.gen"
import { useQuery } from "@tanstack/react-query"
import { LoaderIcon } from "lucide-react"
import { Link, useNavigate } from "react-router"
import { formatNumber, truncateString } from "@/utils/strings"
import { Badge } from "@/components/ui/badge"
import { cn } from "@/lib/utils"
import type { LightInfo, BitcreditBill } from "@/generated/client/types.gen"
import { ParticipantsOverviewCard } from "@/components/ParticipantsOverview"
import { toast } from "sonner"
import * as React from "react"

type QuoteStatus = "Accepted" | "Denied" | "OfferExpired" | "Offered" | "Pending" | "Rejected" | "Canceled" | "Minting"

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

interface StatusQuotePageProps {
  status?: QuoteStatus
}

function Loader() {
  return (
    <div className="flex flex-col gap-1.5 my-2">
      <Skeleton className="h-4 rounded-lg" />
      <Skeleton className="h-29 rounded-lg mt-1" />
      <Skeleton className="h-29 rounded-lg" />
      <Skeleton className="h-29 rounded-lg" />
      <Skeleton className="h-29 rounded-lg" />
    </div>
  )
}

function QuoteItemCard({ quote, bills, isLoading }: { quote: LightInfo; bills?: BitcreditBill[]; isLoading: boolean }) {
  const navigate = useNavigate()

  const { data: quoteDetails, error: quoteError } = useQuery({
    ...getQuoteOptions({
      path: { qid: quote.id },
    }),
    retry: 1,
    enabled: !!quote.id,
  })

  const billId = quoteDetails?.bill?.id
  const bill: BitcreditBill | undefined = bills?.find((b) => b.id === billId)

  const handleQuoteClick = (e: React.MouseEvent) => {
    if (quoteError) {
      e.preventDefault()
      toast.error(`Cannot load quote`, {
        description: `Quote ${truncateString(quote.id, 12)} is unavailable. ${quoteError.message || "Please try again later."}`,
        id: `quote-error-${quote.id}`,
        duration: 5000,
      })
    } else {
      void navigate(`/quotes/${quote.id}`)
    }
  }

  return (
    <Card className="text-sm">
      <div className="flex justify-between items-center gap-4 px-4 pt-4">
        <CardTitle className="text-xl">
          <div className="items-center flex gap-1">
            <span className="font-mono pt-2">
              <Link
                to={`/quotes/${quote.id}`}
                onClick={handleQuoteClick}
              >
                {truncateString(quote.id, 16)}
              </Link>
            </span>
            <span>{isLoading && <LoaderIcon className="stroke-1 animate-spin" />}</span>
          </div>
        </CardTitle>
        <div className="flex gap-2">
          <div className="leading-none font-semibold tracking-tight text-3xl">{formatNumber("en", quote.sum)} sat</div>
          <Badge variant={getStatusVariant(quote.status)}>{quote.status}</Badge>
        </div>
      </div>
      <div className="flex justify-between items-center gap-4 px-4 py-2">
        <div>
          <Button size="sm" disabled={isLoading} onClick={handleQuoteClick}>
            View
          </Button>
        </div>
        {/* TODO bill information missing here */}
        {bill && (
          <ParticipantsOverviewCard
            drawee={bill.participants.drawee}
            drawer={bill.participants.drawer}
            payee={bill.participants.payee}
            holder={bill.participants.endorsee ?? undefined}
          />
        )}
      </div>
    </Card>
  )
}

function QuoteList({ status }: { status?: QuoteStatus }) {
  const { data, isFetching, error, isLoading } = useQuery({
    ...listQuotesOptions({
      query: status ? { status } : undefined,
    }),
    retry: 1,
  })

  // Fetch all bills once - more efficient than fetching per quote
  const { data: bills, isLoading: billsLoading } = useQuery({
    ...listEbillsOptions(),
    retry: 1,
    staleTime: 30_000, // Cache for 30 seconds
  })

  const statusText = status ? status.toLowerCase() : "all"
  const noQuotesMessage = `No ${statusText} quotes.`

  if (error) {
    return (
      <div className="flex flex-col gap-4 p-4 bg-red-50 border border-red-200 rounded-lg">
        <div className="text-red-800 font-semibold">Failed to load quotes</div>
        <div className="text-red-600 text-sm">{error.message || "Unknown error occurred"}</div>
        <div className="text-xs text-red-500">Check if the API server is running and accessible</div>
      </div>
    )
  }

  if (isLoading) {
    return <Loader />
  }

  return (
    <>
      <div className="flex items-center gap-1">
        <LoaderIcon
          className={cn("stroke-1", {
            "animate-spin": isFetching || billsLoading,
            invisible: !isFetching && !billsLoading,
          })}
        />
      </div>

      <div className="flex flex-col gap-1.5 my-2">
        {data?.quotes.length === 0 && <div className="py-2 font-bold">{noQuotesMessage}</div>}
        {data?.quotes.map((quote, index) => {
          return (
            <div key={quote.id || index}>
              <QuoteItemCard quote={quote} bills={bills} isLoading={isFetching} />
            </div>
          )
        })}
      </div>
    </>
  )
}

function PageBody({ status }: { status?: QuoteStatus }) {
  return (
    <div className="flex flex-col gap-2">
      <div>
        <QuoteList status={status} />
      </div>
    </div>
  )
}

export default function StatusQuotePage({ status }: StatusQuotePageProps) {
  const pageTitle = status ? `${status} Quotes` : "All Quotes"

  return (
    <>
      <Breadcrumbs>
        Quotes
      </Breadcrumbs>

      <PageTitle>{pageTitle}</PageTitle>
      <PageBody status={status} />
    </>
  )
}
