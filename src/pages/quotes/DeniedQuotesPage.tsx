import { Breadcrumbs } from "@/components/Breadcrumbs"
import { PageTitle } from "@/components/PageTitle"
import { Button } from "@/components/ui/button"
import { Skeleton } from "@/components/ui/skeleton"
import { ListQuotesData } from "@/generated/client"
import { listQuotesOptions } from "@/generated/client/@tanstack/react-query.gen"
import useLocalStorage from "@/hooks/use-local-storage"
import { cn } from "@/lib/utils"
import { useSuspenseQuery } from "@tanstack/react-query"
import { LoaderIcon } from "lucide-react"
import { Suspense } from "react"
import { Link, useNavigate } from "react-router"

function Loader() {
  return (
    <div className="flex flex-col gap-1.5 py-2">
      <Skeleton className="h-4 rounded-lg" />
      <Skeleton className="h-16 rounded-lg" />
      <Skeleton className="h-16 rounded-lg" />
      <Skeleton className="h-16 rounded-lg" />
      <Skeleton className="h-16 rounded-lg" />
      <Skeleton className="h-16 rounded-lg" />
    </div>
  )
}

function QuoteListDenied() {
  const navigate = useNavigate()

  const { data, isFetching } = useSuspenseQuery({
    ...listQuotesOptions({
      query: {
        status: "denied",
      } as unknown as ListQuotesData["query"],
    }),
  })

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

      <div className="flex flex-col gap-1 my-2">
        {data.quotes.length === 0 && <div className="py-2 font-bold">No denied quotes.</div>}
        {data.quotes.map((it, index) => {
          return (
            <div key={index} className="flex gap-1 items-center text-sm">
              <span className="font-mono">
                {isFetching ? (
                  <>{it.id}</>
                ) : (
                  <>
                    <Link to={"/quotes/:id".replace(":id", it.id as string)}>{it.id}</Link>
                  </>
                )}
              </span>

              <Button
                size="sm"
                disabled={isFetching}
                onClick={() => {
                  void navigate("/quotes/:id".replace(":id", it.id as string))
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

  const { data: quotesDenied } = useSuspenseQuery({
    ...listQuotesOptions({
      query: {
        status: "denied",
      } as unknown as ListQuotesData["query"],
    }),
  })

  return (
    <>
      {devMode && (
        <>
          <pre className="text-sm bg-accent text-accent-foreground rounded-lg p-2 my-2">
            {JSON.stringify(quotesDenied, null, 2)}
          </pre>
        </>
      )}
    </>
  )
}

function PageBody() {
  return (
    <div className="flex flex-col gap-2">
      <div>
        <QuoteListDenied />
      </div>
    </div>
  )
}

export default function DeniedQuotesPage() {
  return (
    <>
      <Breadcrumbs
        parents={[
          <>
            <Link to="/quotes">Quotes</Link>
          </>,
        ]}
      >
        Denied
      </Breadcrumbs>
      <PageTitle>Denied Quotes</PageTitle>
      <Suspense fallback={<Loader />}>
        <PageBody />
      </Suspense>
      <Suspense>
        <DevSection />
      </Suspense>
    </>
  )
}
