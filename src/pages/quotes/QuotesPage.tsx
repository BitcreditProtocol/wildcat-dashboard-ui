import { Breadcrumbs } from "@/components/Breadcrumbs"
import { H3 } from "@/components/Headings"
import { PageTitle } from "@/components/PageTitle"
import { Button } from "@/components/ui/button"
import { Skeleton } from "@/components/ui/skeleton"
import useApiClient from "@/hooks/use-api-client"
import useLocalStorage from "@/hooks/use-local-storage"
import { useSuspenseQuery } from "@tanstack/react-query"
import { ViewIcon } from "lucide-react"
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
  const client = useApiClient()

  const { data } = useSuspenseQuery({
    queryKey: ["quotes-pending"],
    queryFn: () => client.listPendingQuotes(),
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
  const client = useApiClient()

  const { data } = useSuspenseQuery({
    queryKey: ["quotes-pending"],
    queryFn: () => client.listPendingQuotes(),
  })

  return (
    <>
      <div className="flex flex-col gap-1">
        {data.data ? (
          data.data.quotes.map((it, index) => {
            return (
              <div key={index} className="flex gap-1 items-center text-sm">
                <Link to={"/quotes/:id".replace(":id", it)}>{it}</Link>
                <Button
                  size="sm"
                  onClick={() => {
                    void navigate("/quotes/:id".replace(":id", it))
                  }}
                >
                  <ViewIcon />
                </Button>
              </div>
            )
          })
        ) : (
          <></>
        )}
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
      <H3>Pending</H3>
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
