import { Suspense } from "react"
import { Link } from "react-router"
import { CartesianGrid, Line, LineChart, Tooltip, XAxis, YAxis } from "recharts"
import { Breadcrumbs } from "@/components/Breadcrumbs"
import { PageTitle } from "@/components/PageTitle"
import { Skeleton } from "@/components/ui/skeleton"
import { fetchBalances } from "@/lib/api"
import { useSuspenseQuery } from "@tanstack/react-query"
import useLocalStorage from "@/hooks/use-local-storage"
import { ChartConfig, ChartContainer, ChartLegend, ChartLegendContent } from "@/components/ui/chart"
import { listQuotesQueryKey } from "@/generated/client/@tanstack/react-query.gen"
import { adminLookupQuote, listQuotes, ListQuotesData } from "@/generated/client"

function Loader() {
  return (
    <div className="flex flex-col gap-4 my-2">
      <div className="grid grid-cols-1 gap-4">
        <Skeleton className="h-96 rounded-lg" />
      </div>
    </div>
  )
}

function CashFlowChart() {
  const config = {
    offered: {
      label: "Offered",
      color: "#2563eb",
    },
    accepted: {
      label: "Accepted",
      color: "#ff97f9",
    },
  } satisfies ChartConfig

  const options = {
    query: {
      status: ["accepted", "offered"],
    } as unknown as ListQuotesData["query"],
  }

  const { data: quotesAcceptedOrOffered } = useSuspenseQuery({
    queryKey: listQuotesQueryKey(options),
    queryFn: async ({ queryKey, signal }) => {
      const { data } = await listQuotes({
        ...options,
        ...queryKey[0],
        signal,
        throwOnError: true,
      })

      return (
        await Promise.all(
          data.quotes.map((it) =>
            adminLookupQuote({
              path: {
                id: it.id,
              },
            }),
          ),
        )
      )
        .map((it) => it.data)
        .filter((it) => !!it)
    },
  })

  const acc = [
    { month: "January", accepted: 0, offered: 0, sum: 0 },
    { month: "February", accepted: 0, offered: 0, sum: 0 },
    { month: "March", accepted: 0, offered: 0, sum: 0 },
    { month: "April", accepted: 0, offered: 0, sum: 0 },
    { month: "May", accepted: 0, offered: 0, sum: 0 },
    { month: "June", accepted: 0, offered: 0, sum: 0 },
    { month: "July", accepted: 0, offered: 0, sum: 0 },
    { month: "August", accepted: 0, offered: 0, sum: 0 },
    { month: "September", accepted: 0, offered: 0, sum: 0 },
    { month: "October", accepted: 0, offered: 0, sum: 0 },
    { month: "November", accepted: 0, offered: 0, sum: 0 },
    { month: "December", accepted: 0, offered: 0, sum: 0 },
  ]

  const data = quotesAcceptedOrOffered.reduce((acc, curr) => {
    const maturityDate = new Date(Date.parse(curr.bill.maturity_date))
    if (curr.status === "accepted" || curr.status === "offered") {
      acc[maturityDate.getMonth()][curr.status] += curr.bill.sum
      acc[maturityDate.getMonth()].sum += curr.bill.sum
    }
    return acc
  }, acc)

  return (
    <ChartContainer config={config} className="max-h-[300px] min-h-[200px] w-full">
      <LineChart
        accessibilityLayer
        data={data}
        margin={{
          top: 5,
          right: 25,
          left: 5,
          bottom: 5,
        }}
      >
        <CartesianGrid vertical={false} />
        <XAxis
          dataKey="month"
          tickLine={false}
          tickMargin={10}
          axisLine={false}
          tickFormatter={(value: string) => value.slice(0, 3)}
        />
        <Tooltip cursor={true} isAnimationActive={true} />
        <YAxis dataKey="sum" tickLine={false} tickMargin={10} axisLine={false} />
        <Line type="step" dataKey="offered" fill="var(--color-offered)" stroke="var(--color-offered)" radius={4} />
        <Line type="step" dataKey="accepted" fill="var(--color-accepted)" stroke="var(--color-accepted)" radius={4} />
        <ChartLegend content={<ChartLegendContent />} />
      </LineChart>
    </ChartContainer>
  )
}

function CashFlow() {
  return (
    <div>
      <CashFlowChart />
    </div>
  )
}

function PageBody() {
  return (
    <div className="my-4">
      <CashFlow />
    </div>
  )
}

function DevSection() {
  const [devMode] = useLocalStorage("devMode", false)
  const { data } = useSuspenseQuery({
    queryKey: ["balances"],
    queryFn: fetchBalances,
  })

  return (
    <>
      {devMode && (
        <pre className="text-sm bg-accent text-accent-foreground rounded-lg p-2 my-2">
          {JSON.stringify(data, null, 2)}
        </pre>
      )}
    </>
  )
}

export default function CashFlowPage() {
  return (
    <>
      <Breadcrumbs
        parents={[
          <>
            <Link to="/earnings">Earnings</Link>
          </>,
        ]}
      >
        CashFlow
      </Breadcrumbs>
      <PageTitle>CashFlow</PageTitle>

      <Suspense fallback={<Loader />}>
        <PageBody />
        <DevSection />
      </Suspense>
    </>
  )
}
