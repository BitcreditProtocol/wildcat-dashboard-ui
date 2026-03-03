import { Breadcrumbs } from "@/components/Breadcrumbs"
import { PageTitle } from "@/components/PageTitle"
import { Button } from "@/components/ui/button"
import { Card, CardTitle } from "@/components/ui/card"
import { Skeleton } from "@/components/ui/skeleton"
import { listQuotesOptions, getQuoteOptions } from "@/generated/client/@tanstack/react-query.gen"
import { useQuery, useQueries } from "@tanstack/react-query"
import { LoaderIcon } from "lucide-react"
import { Link, useNavigate } from "react-router"
import { formatNumber, truncateString, formatStatusLabel } from "@/utils/strings"
import { getQuoteStatusVariant } from "@/utils/quote-status"
import { Badge } from "@/components/ui/badge"
import { cn } from "@/lib/utils"
import type { LightInfo } from "@/generated/client/types.gen"
import { ParticipantsOverviewCard } from "@/components/ParticipantsOverview"
import { toast } from "sonner"
import * as React from "react"
import SearchComponent, { HighlightText } from "@/components/ui/search"
import { useState } from "react"
import { BreadcrumbLink } from "@/components/ui/breadcrumb"
import { SortButtons } from "@/components/SortButtons"
import { useIntl } from "react-intl"
import { getApiErrorMessage } from "@/lib/api-error"

type QuoteStatus =
  | "Accepted"
  | "Denied"
  | "OfferExpired"
  | "Offered"
  | "Pending"
  | "Rejected"
  | "Canceled"
  | "Minting"
  | "MintingEnabled"
type SortBy = "status-asc" | "status-desc" | "sum-asc" | "sum-desc" | "maturity-asc" | "maturity-desc"

const RETRY_COUNT = 2
const retryDelay = (attempt: number) => Math.min(1000 * 2 ** attempt, 10_000)

interface StatusQuotePageProps {
  status?: QuoteStatus
}

function Loader() {
  return (
    <div className="flex items-center justify-center min-h-[400px]">
      <div className="flex flex-col gap-1.5 my-2 w-full">
        <Skeleton className="h-4 rounded-lg" />
        <Skeleton className="h-29 rounded-lg mt-1" />
        <Skeleton className="h-29 rounded-lg" />
        <Skeleton className="h-29 rounded-lg" />
        <Skeleton className="h-29 rounded-lg" />
      </div>
    </div>
  )
}

function QuoteItemCard({ quote, searchQuery }: { quote: LightInfo; searchQuery: string }) {
  const intl = useIntl()
  const navigate = useNavigate()

  const queryResult = useQuery({
    ...getQuoteOptions({
      path: { qid: quote.id },
    }),
    retry: RETRY_COUNT,
    retryDelay,
    enabled: !!quote.id,
  })

  const { data: quoteDetails, isLoading: isLoadingDetails, error: detailsError } = queryResult
  const bill = quoteDetails?.bill

  const handleQuoteClick = (e: React.MouseEvent) => {
    if (detailsError) {
      e.preventDefault()
      const errorMessage = getApiErrorMessage(detailsError)
      toast.error(intl.formatMessage({ id: "quotes.card.error.title", defaultMessage: "Cannot load quote" }), {
        description: intl.formatMessage(
          {
            id: "quotes.card.error.description",
            defaultMessage: "Quote {id} is unavailable. {message}",
          },
          {
            id: truncateString(quote.id, 12),
            message:
              errorMessage ||
              intl.formatMessage({ id: "quotes.error.tryAgain", defaultMessage: "Please try again later." }),
          },
        ),
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
            <span></span>
          </div>
        </CardTitle>
        <div className="flex gap-2">
          <div className="leading-none font-semibold tracking-tight text-3xl">
            <HighlightText text={`${formatNumber(intl.locale, quote.sum)} sat`} highlight={searchQuery} />
          </div>
          <Badge variant={getQuoteStatusVariant(quote.status)}>
            <HighlightText
              text={intl.formatMessage({
                id: `quote.status.${quote.status}`,
                defaultMessage: formatStatusLabel(quote.status),
              })}
              highlight={searchQuery}
            />
          </Badge>
        </div>
      </div>
      <div className="flex justify-between items-center gap-4 px-4 py-2">
        <div>
          <Button size="sm" className="max-w-sm px-12" onClick={handleQuoteClick}>
            {intl.formatMessage({
              id: "quotes.card.view",
              defaultMessage: "View",
            })}
          </Button>
        </div>
        {isLoadingDetails && (
          <div className="text-sm text-gray-500 flex items-center gap-2">
            <LoaderIcon className="h-4 w-4 animate-spin" />
            {intl.formatMessage({
              id: "quotes.card.loadingBillDetails",
              defaultMessage: "Loading bill details...",
            })}
          </div>
        )}
        {detailsError && (
          <div className="text-sm text-red-500">
            {intl.formatMessage({
              id: "quotes.card.error.billInfo",
              defaultMessage: "Error loading bill information",
            })}
          </div>
        )}
        {bill && (
          <ParticipantsOverviewCard
            drawee={bill.drawee}
            drawer={bill.drawer}
            payee={bill.payee}
            holder={bill.endorsees}
          />
        )}
        {!isLoadingDetails && !detailsError && !bill && (
          <div className="text-sm text-gray-400">
            {intl.formatMessage({
              id: "quotes.card.noBillData",
              defaultMessage: "No bill data available",
            })}
          </div>
        )}
      </div>
    </Card>
  )
}

function QuoteList({ status }: { status?: QuoteStatus }) {
  const intl = useIntl()
  const [searchQuery, setSearchQuery] = useState("")
  const [sortBy, setSortBy] = useState<SortBy>("maturity-asc")

  const { data, isFetching, error, isLoading } = useQuery({
    ...listQuotesOptions(),
    retry: RETRY_COUNT,
    retryDelay,
  })

  /* TODO: optimize this with pagination or batch fetching if API supports it */
  const quoteDetailsQueries = useQueries({
    queries: (data?.quotes ?? []).map((quote) => ({
      ...getQuoteOptions({
        path: { qid: quote.id },
      }),
      retry: RETRY_COUNT,
      retryDelay,
      enabled: !!quote.id,
    })),
  })

  const noQuotesMessage = intl.formatMessage({
    id: "quotes.list.empty",
    defaultMessage: "No quotes available.",
  })

  if (error) {
    const errorMessage = (error as { message?: string }).message ?? String(error)
    return (
      <div className="flex flex-col gap-4 p-4 bg-red-50 border border-red-200 rounded-lg">
        <div className="text-red-800 font-semibold">
          {intl.formatMessage({
            id: "quotes.error.loadQuotes.title",
            defaultMessage: "Failed to load quotes",
          })}
        </div>
        <div className="text-red-600 text-sm">
          {errorMessage ||
            intl.formatMessage({
              id: "quotes.error.unknown",
              defaultMessage: "Unknown error occurred",
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

  const filteredQuotes =
    data?.quotes.filter((quote) => {
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

      return quoteId.includes(query) || quoteStatus.includes(query) || quoteSum.includes(query)
    }) ?? []

  const sortedQuotes = [...filteredQuotes].sort((a, b) => {
    const aIndex = data?.quotes.findIndex((q) => q.id === a.id) ?? -1
    const bIndex = data?.quotes.findIndex((q) => q.id === b.id) ?? -1

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
      setSortBy(sortBy.endsWith("asc") ? (`${field}-desc` as SortBy) : (`${field}-asc` as SortBy))
    } else {
      setSortBy(`${field}-asc` as SortBy)
    }
  }

  const sortOptions = [
    {
      field: "sum" as const,
      label: intl.formatMessage({
        id: "quotes.sort.amount",
        defaultMessage: "Amount",
      }),
    },
    {
      field: "maturity" as const,
      label: intl.formatMessage({
        id: "quotes.sort.maturity",
        defaultMessage: "Maturity",
      }),
    },
    {
      field: "status" as const,
      label: intl.formatMessage({
        id: "quotes.sort.status",
        defaultMessage: "Status",
      }),
    },
  ]

  return (
    <>
      <div className="flex gap-4 items-center justify-between">
        <SearchComponent
          value={searchQuery}
          className="flex-1 max-w-md"
          placeholder={intl.formatMessage({
            id: "quotes.search.placeholder",
            defaultMessage: "Search by quote ID, status, or amount...",
          })}
          onSearch={setSearchQuery}
          onChange={setSearchQuery}
          size="sm"
        />
        <SortButtons sortBy={sortBy} onSortChange={toggleSort} options={sortOptions} />
      </div>

      <div className="flex items-center justify-center">
        <LoaderIcon
          className={cn("stroke-1", {
            "animate-spin": isFetching && !isLoading,
            invisible: !isFetching || isLoading,
          })}
        />
      </div>

      <div className="flex flex-col gap-1.5 my-2">
        {sortedQuotes.length === 0 && searchQuery && (
          <div className="py-2 text-center text-muted-foreground">
            {intl.formatMessage({
              id: "quotes.search.noMatch",
              defaultMessage: "No quotes match your search criteria",
            })}
          </div>
        )}
        {sortedQuotes.length === 0 && !searchQuery && <div className="py-2 font-bold">{noQuotesMessage}</div>}
        {sortedQuotes.map((quote, index) => {
          if (!quote.id) {
            console.warn(`Quote at index ${index} is missing an ID:`, quote)
          }
          return (
            <div key={quote.id || `quote-fallback-${index}`}>
              <QuoteItemCard quote={quote} searchQuery={searchQuery} />
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
  const intl = useIntl()
  const statusLabel = status
    ? intl.formatMessage({
        id: `quote.status.${status}`,
        defaultMessage: formatStatusLabel(status),
      })
    : undefined
  const pageTitle = status
    ? intl.formatMessage(
        {
          id: "quotes.statusPage.title",
          defaultMessage: "{status} quotes",
        },
        { status: statusLabel },
      )
    : intl.formatMessage({
        id: "quotes.statusPage.titleAll",
        defaultMessage: "All quotes",
      })

  return (
    <>
      <Breadcrumbs
        parents={
          status
            ? [
                <BreadcrumbLink key="quotes" asChild>
                  <Link to="/quotes">
                    {intl.formatMessage({
                      id: "quotes.breadcrumb",
                      defaultMessage: "Quotes",
                    })}
                  </Link>
                </BreadcrumbLink>,
              ]
            : undefined
        }
      >
        {statusLabel ??
          intl.formatMessage({
            id: "quotes.breadcrumb",
            defaultMessage: "Quotes",
          })}
      </Breadcrumbs>

      <PageTitle>{pageTitle}</PageTitle>
      <PageBody status={status} />
    </>
  )
}
