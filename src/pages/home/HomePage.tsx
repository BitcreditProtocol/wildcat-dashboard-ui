import { PageTitle } from "@/components/PageTitle"
import { Skeleton } from "@/components/ui/skeleton"
import { fetchInfo } from "@/lib/api"
import { useSuspenseQuery } from "@tanstack/react-query"
import { Suspense } from "react"

function Loader() {
  return (
    <div className="flex flex-col gap-1.5 py-2">
      <Skeleton className="h-12 rounded-lg" />
    </div>
  )
}

function PageBody() {
  // const { data } = []; useSuspenseQuery({
  //   queryKey: ["info"],
  //   queryFn: fetchInfo,
  // })

  const data = {
    name: "bcr-wdc-quote-service",
    version: "0.1.0",
    pubkey: "0283bf290884eed3a7ca2663fc0260de2e2064d6b355ea13f98dec004b7a7ead99",
  }

  return (
    <>
      <div className="flex flex-col gap-0.5 bg-accent text-accent-foreground rounded-lg p-2 my-2">
        <span className="font-bold">{data.name}</span>
        <span className="text-sm font-mono text-accent-foreground/50">{data.version}</span>
        <span className="text-sm font-mono">{data.pubkey}</span>
      </div>
    </>
  )
}

export default function HomePage() {
  return (
    <>
      <PageTitle>Home</PageTitle>
      <Suspense fallback={<Loader />}>
        <PageBody />
      </Suspense>
    </>
  )
}
