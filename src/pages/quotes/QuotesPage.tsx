import { Breadcrumbs } from "@/components/Breadcrumbs"
import { H3 } from "@/components/Headings"
import { PageTitle } from "@/components/PageTitle"
import { Button } from "@/components/ui/button"
import { Skeleton } from "@/components/ui/skeleton"
import { listPendingQuotesOptions } from "@/generated/client/@tanstack/react-query.gen"
import useLocalStorage from "@/hooks/use-local-storage"
import { useSuspenseQuery } from "@tanstack/react-query"
import { LoaderIcon } from "lucide-react"
import { Suspense } from "react"
import { Link, useNavigate } from "react-router"

function Loader() {
  return (
    <div className="flex flex-col gap-1.5 py-2">
      <Skeleton className="h-48 rounded-lg" />
    </div>
  )
}

function QuoteListPendingRaw() {
  const { data } = useSuspenseQuery({
    ...listPendingQuotesOptions({}),
  })

  return (
    <>
      <pre className="text-sm bg-accent text-accent-foreground rounded-lg p-2 my-2">
        {JSON.stringify(data, null, 2)}
      </pre>
    </>
  )
}

function QuoteListPending() {
  const navigate = useNavigate()

  const { data, isFetching } = useSuspenseQuery({
    ...listPendingQuotesOptions({}),
  })

  return (
    <>
      <H3>
        <span className="flex items-center gap-1">
          <span>Pending</span>
          <span>{isFetching && <LoaderIcon className="stroke-1 animate-spin" />}</span>
        </span>
      </H3>

      <div className="flex flex-col gap-1">
        {data.quotes.map((it, index) => {
          return (
            <div key={index} className="flex gap-1 items-center text-sm">
              {isFetching ? (
                <>{it}</>
              ) : (
                <>
                  <Link to={"/quotes/:id".replace(":id", it)}>{it}</Link>
                </>
              )}

              <Button
                size="sm"
                disabled={isFetching}
                onClick={() => {
                  void navigate("/quotes/:id".replace(":id", it))
                }}
              >
                View
              </Button>
            </div>
          )
        })}
      </div>
    </>
  )
}

function DevSection() {
  const [devMode] = useLocalStorage("devMode", false)

  return <>{devMode && <QuoteListPendingRaw />}</>
}

function PageBody() {
  return (
    <>
      <Suspense fallback={<Loader />}>
        <QuoteListPending />
      </Suspense>
    </>
  )
}

export default function QuotesPage() {
  return (
    <>
      <Breadcrumbs>Quotes</Breadcrumbs>
      <PageTitle>Quotes</PageTitle>
      <PageBody />
      <Suspense>
        <DevSection />
      </Suspense>
    </>
  )
}
