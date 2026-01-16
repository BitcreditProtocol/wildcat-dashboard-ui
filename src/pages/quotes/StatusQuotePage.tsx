import { Breadcrumbs } from "@/components/Breadcrumbs"
import { PageTitle } from "@/components/PageTitle"
import { Button } from "@/components/ui/button"
import { Card, CardTitle } from "@/components/ui/card"
import { Skeleton } from "@/components/ui/skeleton"
import { listQuotesOptions, getQuoteOptions } from "@/generated/client/@tanstack/react-query.gen"
import { useQuery, useQueries } from "@tanstack/react-query"
import { LoaderIcon, ArrowUp, ArrowDown } from "lucide-react"
import { Link, useNavigate } from "react-router"
import { formatNumber, truncateString, formatStatusLabel } from "@/utils/strings"
import { Badge } from "@/components/ui/badge"
import { cn } from "@/lib/utils"
import type { LightInfo } from "@/generated/client/types.gen"
import { ParticipantsOverviewCard } from "@/components/ParticipantsOverview"
import { toast } from "sonner"
import * as React from "react"
import SearchComponent, { HighlightText } from "@/components/ui/search"
import { useState } from "react"
import { BreadcrumbLink } from "@/components/ui/breadcrumb"

type QuoteStatus = "Accepted" | "Denied" | "OfferExpired" | "Offered" | "Pending" | "Rejected" | "Canceled" | "Minting"
type SortBy = "status-asc" | "status-desc" | "sum-asc" | "sum-desc" | "maturity-asc" | "maturity-desc"

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

function QuoteItemCard({ quote, isLoading, searchQuery }: { quote: LightInfo; isLoading: boolean; searchQuery: string }) {
  const navigate = useNavigate()

  const queryResult = useQuery({
    ...getQuoteOptions({
      path: { qid: quote.id }
    }),
    retry: 1,
    enabled: !!quote.id,
  })

  const { data: quoteDetails, isLoading: isLoadingDetails, error: detailsError } = queryResult
  const bill = quoteDetails?.bill

  const handleQuoteClick = (e: React.MouseEvent) => {
    if (detailsError) {
      e.preventDefault()
      toast.error(`Cannot load quote`, {
        description: `Quote ${truncateString(quote.id, 12)} is unavailable. ${detailsError.message || "Please try again later."}`,
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
              <Link to={`/quotes/${quote.id}`} onClick={handleQuoteClick}>
                <HighlightText text={quote.id} highlight={searchQuery} />
              </Link>
            </span>
            <span>{isLoading && <LoaderIcon className="stroke-1 animate-spin" />}</span>
          </div>
        </CardTitle>
        <div className="flex gap-2">
          <div className="leading-none font-semibold tracking-tight text-3xl">
            <HighlightText text={`${formatNumber("en", quote.sum)} sat`} highlight={searchQuery} />
          </div>
          <Badge variant={getStatusVariant(quote.status)}>
            <HighlightText text={formatStatusLabel(quote.status)} highlight={searchQuery} />
          </Badge>
        </div>
      </div>
      <div className="flex justify-between items-center gap-4 px-4 py-2">
        <div>
          <Button size="sm" disabled={isLoading} onClick={handleQuoteClick}>
            View
          </Button>
        </div>
        {isLoadingDetails && (
          <div className="text-sm text-gray-500 flex items-center gap-2">
            <LoaderIcon className="h-4 w-4 animate-spin" />
            Loading bill details...
          </div>
        )}
        {detailsError && <div className="text-sm text-red-500">Error loading bill information</div>}
        {bill && (
          <ParticipantsOverviewCard
            drawee={bill.drawee}
            drawer={bill.drawer}
            payee={bill.payee}
            holder={bill.endorsees?.[0] ?? undefined}
          />
        )}
        {!isLoadingDetails && !detailsError && !bill && (
          <div className="text-sm text-gray-400">No bill data available</div>
        )}
      </div>
    </Card>
  )
}

function QuoteList({ status }: { status?: QuoteStatus }) {
  const [searchQuery, setSearchQuery] = useState("")
  const [sortBy, setSortBy] = useState<SortBy>("maturity-asc")

  const { data, isFetching, error, isLoading } = useQuery({
    ...listQuotesOptions(),
    retry: 1,
  })

  /* TODO: optimize this with pagination or batch fetching if API supports it */
  const quoteDetailsQueries = useQueries({
    queries: (data?.quotes ?? []).map((quote) => ({
      ...getQuoteOptions({
        path: { qid: quote.id }
      }),
      retry: 1,
      enabled: !!quote.id,
    }))
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

  const filteredQuotes = data?.quotes.filter((quote) => {
    if (status && quote.status !== status) {
      return false
    }

    if (!searchQuery) {
      return true
    }

    const query = searchQuery.toLowerCase()
    const quoteId = quote.id.toLowerCase()
    const quoteStatus = quote.status.toLowerCase()
    const quoteSum = quote.sum.toString()

    return (
      quoteId.includes(query) ||
      quoteStatus.includes(query) ||
      quoteSum.includes(query)
    )
  }) ?? []

  const sortedQuotes = [...filteredQuotes].sort((a, b) => {
    const aIndex = data?.quotes.findIndex(q => q.id === a.id) ?? -1
    const bIndex = data?.quotes.findIndex(q => q.id === b.id) ?? -1

    const aBill = aIndex >= 0 ? quoteDetailsQueries[aIndex]?.data?.bill : null
    const bBill = bIndex >= 0 ? quoteDetailsQueries[bIndex]?.data?.bill : null

    switch (sortBy) {
      case "status-asc":
        return a.status.localeCompare(b.status)
      case "status-desc":
        return b.status.localeCompare(a.status)
      case "sum-asc":
        return a.sum - b.sum
      case "sum-desc":
        return b.sum - a.sum
      case "maturity-asc": {
        if (!aBill?.maturity_date && !bBill?.maturity_date) return 0
        if (!aBill?.maturity_date) return 1
        if (!bBill?.maturity_date) return -1
        return new Date(aBill.maturity_date).getTime() - new Date(bBill.maturity_date).getTime()
      }
      case "maturity-desc": {
        if (!aBill?.maturity_date && !bBill?.maturity_date) return 0
        if (!aBill?.maturity_date) return 1
        if (!bBill?.maturity_date) return -1
        return new Date(bBill.maturity_date).getTime() - new Date(aBill.maturity_date).getTime()
      }
      default:
        return 0
    }
  })

  const toggleSort = (field: "status" | "sum" | "maturity") => {
    if (sortBy.startsWith(field)) {
      setSortBy(sortBy.endsWith("asc") ? `${field}-desc` as SortBy : `${field}-asc` as SortBy)
    } else {
      setSortBy(`${field}-asc` as SortBy)
    }
  }

  const getSortIcon = (field: "status" | "sum" | "maturity") => {
    if (!sortBy.startsWith(field)) {
      return null
    }
    return sortBy.endsWith("asc") ? <ArrowUp className="h-4 w-4" /> : <ArrowDown className="h-4 w-4" />
  }

  return (
    <>
      <div className="flex gap-4 items-center justify-between">
        <SearchComponent
          value={searchQuery}
          className="flex-1 max-w-md"
          placeholder="Search by quote ID, status, or amount..."
          onSearch={setSearchQuery}
          onChange={setSearchQuery}
          size="sm"
        />
        <div className="flex items-center gap-2">
          <span className="text-sm font-medium">Sort by:</span>
          <Button
            size="sm"
            variant={sortBy.startsWith("sum") ? "default" : "outline"}
            onClick={() => toggleSort("sum")}
            title={sortBy.startsWith("sum") ? (sortBy.endsWith("asc") ? "Amount Ascending" : "Amount Descending") : "Sort by Amount"}
            className="flex items-center gap-1"
          >
            Amount {getSortIcon("sum")}
          </Button>
          <Button
            size="sm"
            variant={sortBy.startsWith("maturity") ? "default" : "outline"}
            onClick={() => toggleSort("maturity")}
            title={sortBy.startsWith("maturity") ? (sortBy.endsWith("asc") ? "Maturity Date Ascending" : "Maturity Date Descending") : "Sort by Maturity Date"}
            className="flex items-center gap-1"
          >
            Maturity {getSortIcon("maturity")}
          </Button>
          <Button
            size="sm"
            variant={sortBy.startsWith("status") ? "default" : "outline"}
            onClick={() => toggleSort("status")}
            title={sortBy.startsWith("status") ? (sortBy.endsWith("asc") ? "Status Ascending" : "Status Descending") : "Sort by Status"}
            className="flex items-center gap-1"
          >
            Status {getSortIcon("status")}
          </Button>
        </div>
      </div>

      <div className="flex items-center gap-1">
        <LoaderIcon
          className={cn("stroke-1", {
            "animate-spin": isFetching,
            invisible: !isFetching,
          })}
        />
      </div>

      <div className="flex flex-col gap-1.5 my-2">
        {sortedQuotes.length === 0 && searchQuery && (
          <div className="py-2 text-center text-muted-foreground">
            No quotes match your search criteria
          </div>
        )}
        {sortedQuotes.length === 0 && !searchQuery && <div className="py-2 font-bold">{noQuotesMessage}</div>}
        {sortedQuotes.map((quote, index) => {
          if (!quote.id) {
            console.warn(`Quote at index ${index} is missing an ID:`, quote)
          }
          return (
            <div key={quote.id || `quote-fallback-${index}`}>
              <QuoteItemCard quote={quote} isLoading={isFetching} searchQuery={searchQuery} />
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
  const pageTitle = status ? `${formatStatusLabel(status)} quotes` : "All quotes"

  return (
    <>
      <Breadcrumbs
        parents={
          status
            ? [
                <BreadcrumbLink key="quotes" asChild>
                  <Link to="/quotes">Quotes</Link>
                </BreadcrumbLink>,
              ]
            : undefined
        }
      >
        {status ? formatStatusLabel(status) : "Quotes"}
      </Breadcrumbs>

      <PageTitle>{pageTitle}</PageTitle>
      <PageBody status={status} />
    </>
  )
}
