import { Breadcrumbs } from "@/components/Breadcrumbs"
import { PageTitle } from "@/components/PageTitle"
import { Button } from "@/components/ui/button"
import { Card, CardTitle } from "@/components/ui/card"
import { Skeleton } from "@/components/ui/skeleton"
import { InfoReply } from "@/generated/client"
import { ListQuotesData } from "@/generated/client"
import { adminLookupQuoteOptions, listQuotesOptions } from "@/generated/client/@tanstack/react-query.gen"
import { useSuspenseQuery } from "@tanstack/react-query"
import { LoaderIcon } from "lucide-react"
import { Suspense } from "react"
import { Link, useNavigate } from "react-router"
import { ParticipantsOverviewCard } from "./QuotePage"
import { humanReadableDuration } from "@/utils/dates"
import { formatNumber, truncateString } from "@/utils/strings"
import { Badge } from "@/components/ui/badge"
import { cn } from "@/lib/utils"

type QuoteStatus = "Accepted" | "Denied" | "OfferExpired" | "Offered" | "Pending" | "Rejected" | "Canceled"

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

function QuoteItemCard({ id, isLoading }: { id: InfoReply["id"]; isLoading: boolean }) {
  const navigate = useNavigate()

  const { data, isFetching } = useSuspenseQuery({
    enabled: false,
    staleTime: 60 * 1_000,
    ...adminLookupQuoteOptions({
      path: {
        id,
      },
    }),
  })

  return (
    <>
      <Card className="text-sm">
        <div className="flex justify-between items-center gap-4 px-4 pt-4">
          <CardTitle className="text-xl">
            <div className="items-center flex gap-1">
              <span className="font-mono pt-2">
                {isFetching || isLoading ? (
                  <>{truncateString(id, 16)}</>
                ) : (
                  <>
                    <Link to={"/quotes/:id".replace(":id", id)}>{truncateString(id, 16)}</Link>
                  </>
                )}
              </span>
              <span>{isFetching && <LoaderIcon className="stroke-1 animate-spin" />}</span>
            </div>
          </CardTitle>
          <div className="flex gap-2">
            <div className="leading-none font-semibold tracking-tight text-3xl">
              {formatNumber("en", data.bill?.sum)} sat
            </div>
            <Badge>{humanReadableDuration("en", new Date(Date.parse(data.bill.maturity_date)))}</Badge>
          </div>
        </div>
        <div className="flex justify-between items-center gap-4 px-4 py-2">
          <div>
            <Button
              size="sm"
              disabled={isFetching || isLoading}
              onClick={() => {
                void navigate("/quotes/:id".replace(":id", id))
              }}
            >
              View
            </Button>
          </div>
          <ParticipantsOverviewCard
            drawee={data.bill?.drawee}
            drawer={data.bill?.drawer}
            payee={data.bill?.payee}
            className="gap-1.5"
          />
        </div>
      </Card>
    </>
  )
}

function QuoteList({ status }: { status?: QuoteStatus }) {
  const queryParams = status ? ({ status } as unknown as ListQuotesData["query"]) : {}

  const { data, isFetching } = useSuspenseQuery({
    ...listQuotesOptions({
      query: queryParams,
    }),
  })

  const statusText = status ? status.toLowerCase() : "all"
  const noQuotesMessage = `No ${statusText} quotes.`

  return (
    <>
      <div className="flex items-center gap-1">
        <LoaderIcon
          className={cn("stroke-1 animate-spin", {
            "animate-spin": isFetching,
            invisible: !isFetching,
          })}
        />
      </div>

      <div className="flex flex-col gap-1.5 my-2">
        {data.quotes.length === 0 && <div className="py-2 font-bold">{noQuotesMessage}</div>}
        {data.quotes.map((it, index) => {
          return (
            <div key={index}>
              <QuoteItemCard id={it.id} isLoading={isFetching} />
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
  const breadcrumbText = status ?? "All"

  return (
    <>
      <Breadcrumbs
        parents={[
          <>
            <Link to="/quotes">Quotes</Link>
          </>,
        ]}
      >
        {breadcrumbText}
      </Breadcrumbs>

      <PageTitle>{pageTitle}</PageTitle>
      <Suspense fallback={<Loader />}>
        <PageBody status={status} />
      </Suspense>
    </>
  )
}
