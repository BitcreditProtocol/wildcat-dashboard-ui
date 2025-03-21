import { Suspense } from "react"
import { Breadcrumbs } from "@/components/Breadcrumbs"
import { PageTitle } from "@/components/PageTitle"
import { Skeleton } from "@/components/ui/skeleton"
import { listAcceptedQuotesOptions, listPendingQuotesOptions } from "@/generated/client/@tanstack/react-query.gen"
import { useSuspenseQuery } from "@tanstack/react-query"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { cn } from "@/lib/utils"
import { Link } from "react-router"
import { ChevronRight } from "lucide-react"

function Loader() {
  return (
    <div className="flex flex-col gap-1.5 py-2">
      <Skeleton className="h-32 rounded-lg" />
      <Skeleton className="h-32 rounded-lg" />
    </div>
  )
}

function PageBody() {
  const { data: quotesPending } = useSuspenseQuery({
    ...listPendingQuotesOptions({}),
  })

  const { data: quotesAccepted } = useSuspenseQuery({
    ...listAcceptedQuotesOptions({}),
  })

  return (
    <div className="flex flex-col gap-1.5 my-2">
      <Link to={"/quotes/pending"}>
        <Card
          className={cn("flex-1 self-stretch", {
            "bg-green-100": quotesPending.quotes.length === 0,
            "bg-orange-100": quotesPending.quotes.length > 0,
          })}
        >
          <div className="flex items-center">
            <div className="flex-1 flex flex-col justify-center">
              <CardHeader>
                <CardTitle>Pending Quotes</CardTitle>
              </CardHeader>
              <CardContent className="text-2xl">
                {quotesPending.quotes.length === 0 ? (
                  <>💪 No pending quotes.</>
                ) : (
                  <>{quotesPending.quotes.length} pending</>
                )}
              </CardContent>
            </div>
            <div className="flex p-8">
              <ChevronRight size={48} className="text-neutral-400" />
            </div>
          </div>
        </Card>
      </Link>
      <Link to={"/quotes/accepted"}>
        <Card className="flex-1 self-stretch">
          <div className="flex items-center">
            <div className="flex-1 flex flex-col justify-center">
              <CardHeader>
                <CardTitle>Accepted quotes</CardTitle>
              </CardHeader>
              <CardContent className="text-2xl">{quotesAccepted.quotes.length} accepted</CardContent>
            </div>
            <div className="flex p-8">
              <ChevronRight size={48} className="text-neutral-400" />
            </div>
          </div>
        </Card>
      </Link>
    </div>
  )
}

export default function QuotesPage() {
  return (
    <>
      <Breadcrumbs>Quotes</Breadcrumbs>
      <PageTitle>Quotes</PageTitle>
      <Suspense fallback={<Loader />}>
        <PageBody />
      </Suspense>
    </>
  )
}
