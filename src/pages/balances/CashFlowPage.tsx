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

function Loader() {
  return (
    <div className="flex flex-col gap-4 my-2">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Skeleton className="h-96 rounded-lg" />
        <Skeleton className="h-96 rounded-lg" />
      </div>
    </div>
  )
}

function CashFlowChart() {
  const config = {
    bitcoin: {
      label: "Bitcoin",
      color: "#2563eb",
    },
  } satisfies ChartConfig

  const data = [
    { month: "January", bitcoin: 186 },
    { month: "February", bitcoin: 305 },
    { month: "March", bitcoin: 237 },
    { month: "April", bitcoin: 73 },
    { month: "May", bitcoin: 209 },
    { month: "June", bitcoin: 214 },
    { month: "July", bitcoin: 21 },
    { month: "August", bitcoin: 32 },
    { month: "September", bitcoin: 0 },
    { month: "October", bitcoin: 0 },
    { month: "November", bitcoin: 0 },
    { month: "December", bitcoin: 0 },
  ]

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
        <YAxis dataKey="bitcoin" tickLine={false} tickMargin={10} axisLine={false} />
        <Tooltip cursor={true} isAnimationActive={true} />
        <Line type="step" dataKey="bitcoin" fill="var(--color-bitcoin)" radius={4} />
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
