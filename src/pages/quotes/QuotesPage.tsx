import { Breadcrumbs } from "@/components/Breadcrumbs"
import { H3 } from "@/components/Headings"
import { PageTitle } from "@/components/PageTitle"
import { Button } from "@/components/ui/button"
import { Skeleton } from "@/components/ui/skeleton"
import { listAcceptedQuotesOptions, listPendingQuotesOptions } from "@/generated/client/@tanstack/react-query.gen"
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

function QuoteListPending() {
  const navigate = useNavigate()

  const { data, isFetching } = useSuspenseQuery({
    ...listPendingQuotesOptions(),
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
        {data.quotes.length === 0 && (
          <>
            <div className="py-2 font-bold">💪 No pending quotes.</div>
          </>
        )}
        {data.quotes.map((it, index) => {
          return (
            <div key={index} className="flex gap-1 items-center text-sm">
              <span className="font-mono">
                {isFetching ? (
                  <>{it}</>
                ) : (
                  <>
                    <Link to={"/quotes/:id".replace(":id", it)}>{it}</Link>
                  </>
                )}
              </span>

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

function QuoteListAccepted() {
  const navigate = useNavigate()

  const { data, isFetching } = useSuspenseQuery({
    ...listAcceptedQuotesOptions(),
  })

  return (
    <>
      <H3>
        <span className="flex items-center gap-1">
          <span>Accepted</span>
          <span>{isFetching && <LoaderIcon className="stroke-1 animate-spin" />}</span>
        </span>
      </H3>

      <div className="flex flex-col gap-1">
        {data.quotes.length === 0 && (
          <>
            <div className="py-2 font-bold">No accepted quotes.</div>
          </>
        )}
        {data.quotes.map((it, index) => {
          return (
            <div key={index} className="flex gap-1 items-center text-sm">
              <span className="font-mono">
                {isFetching ? (
                  <>{it}</>
                ) : (
                  <>
                    <Link to={"/quotes/:id".replace(":id", it)}>{it}</Link>
                  </>
                )}
              </span>

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

  const { data: quotesPending } = useSuspenseQuery({
    ...listPendingQuotesOptions({}),
  })

  const { data: quotesAccepted } = useSuspenseQuery({
    ...listAcceptedQuotesOptions({}),
  })

  return (
    <>
      {devMode && (
        <>
          <pre className="text-sm bg-accent text-accent-foreground rounded-lg p-2 my-2">
            {JSON.stringify(quotesPending, null, 2)}
          </pre>
          <pre className="text-sm bg-accent text-accent-foreground rounded-lg p-2 my-2">
            {JSON.stringify(quotesAccepted, null, 2)}
          </pre>
        </>
      )}
    </>
  )
}

function PageBody() {
  return (
    <>
      <Suspense fallback={<Loader />}>
        <QuoteListPending />
        <QuoteListAccepted />
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
