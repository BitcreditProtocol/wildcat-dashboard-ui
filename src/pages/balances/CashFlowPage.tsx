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
    credit: {
      label: "Credit",
      color: "#2563eb",
    },
    debit: {
      label: "Debit",
      color: "#ff97f9",
    },
  } satisfies ChartConfig

  const data = [
    { month: "January", credit: 186, debit: 15, offered: 12 },
    { month: "February", credit: 305, debit: 14 },
    { month: "March", credit: 237, debit: 13 },
    { month: "April", credit: 73, debit: 12 },
    { month: "May", credit: 209 },
    { month: "June", credit: 214 },
    { month: "July", credit: 21, debit: 12 },
    { month: "August", credit: 32, debit: 12 },
    { month: "September", credit: 0 },
    { month: "October", credit: 0 },
    { month: "November", credit: 0 },
    { month: "December", credit: 0 },
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
        <Tooltip cursor={true} isAnimationActive={true} />
        <YAxis dataKey="credit" tickLine={false} tickMargin={10} axisLine={false} />
        <YAxis dataKey="debit" tickLine={false} tickMargin={10} axisLine={false} />
        <Line type="step" dataKey="debit" fill="var(--color-debit)" stroke="var(--color-debit)" radius={4} />
        <Line type="step" dataKey="credit" fill="var(--color-credit)" stroke="var(--color-credit)" radius={4} />
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
