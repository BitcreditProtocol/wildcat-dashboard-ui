import { Breadcrumbs } from "@/components/Breadcrumbs"
import { PageTitle } from "@/components/PageTitle"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Bar, BarChart, CartesianGrid, XAxis, YAxis } from "recharts"
import { type ChartConfig, ChartContainer, ChartLegend, ChartLegendContent } from "@/components/ui/chart"
import { PropsWithChildren, Suspense } from "react"
import { Skeleton } from "@/components/ui/skeleton"
import { BalancesResponse, fetchBalances } from "@/lib/api"
import { useSuspenseQuery } from "@tanstack/react-query"

function Loader() {
  return (
    <div className="flex gap-2 py-2">
      <Skeleton className="flex-1 h-32 rounded-lg" />
      <Skeleton className="flex-1 h-32 rounded-lg" />
      <Skeleton className="flex-1 h-32 rounded-lg" />
      <Skeleton className="flex-1 h-32 rounded-lg" />
    </div>
  )
}

export function BitcoinBalanceChart() {
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
    <ChartContainer config={config} className="min-h-[200px] w-full">
      <BarChart accessibilityLayer data={data}>
        <CartesianGrid vertical={false} />
        <XAxis
          dataKey="month"
          tickLine={false}
          tickMargin={10}
          axisLine={false}
          tickFormatter={(value: string) => value.slice(0, 3)}
        />
        <YAxis dataKey="bitcoin" tickLine={false} tickMargin={10} axisLine={false} />
        <Bar dataKey="bitcoin" fill="var(--color-bitcoin)" radius={4} />
        <ChartLegend content={<ChartLegendContent />} />
      </BarChart>
    </ChartContainer>
  )
}

export function OtherBalanceChart() {
  const config = {
    eIOU: {
      label: "e-IOU",
      color: "#911198",
    },
    credit: {
      label: "Credit token",
      color: "#e9d4ff",
    },
    debit: {
      label: "Debit token",
      color: "#c27aff",
    },
  } satisfies ChartConfig

  const data = [
    { month: "January", credit: 121, debit: 0 },
    { month: "February", credit: 231, debit: 0 },
    { month: "March", credit: 321, debit: 51 },
    { month: "April", credit: 603, debit: 186 },
    { month: "May", credit: 583, debit: 486 },
    { month: "June", credit: 893, debit: 359 },
    { month: "July", credit: 1023, debit: 192 },
    { month: "August", credit: 2023, debit: 521 },
    { month: "September", credit: 1821, debit: 789 },
    { month: "October", credit: 1782, debit: 1232 },
    { month: "November", credit: 0, debit: 0 },
    { month: "December", credit: 0, debit: 0 },
  ]

  return (
    <ChartContainer config={config} className="min-h-[200px] w-full">
      <BarChart accessibilityLayer data={data}>
        <CartesianGrid vertical={false} />
        <XAxis
          dataKey="month"
          tickLine={false}
          tickMargin={10}
          axisLine={false}
          tickFormatter={(value: string) => value.slice(0, 3)}
        />
        <YAxis dataKey="credit" tickLine={false} tickMargin={10} axisLine={false} />
        <YAxis dataKey="debit" tickLine={false} tickMargin={10} axisLine={false} />
        <Bar dataKey="credit" fill="var(--color-credit)" radius={4} />
        <Bar dataKey="debit" fill="var(--color-debit)" radius={4} />
        <ChartLegend content={<ChartLegendContent />} />
      </BarChart>
    </ChartContainer>
  )
}

export function BalanceText({ value, children }: PropsWithChildren<{ value: BalancesResponse["bitcoin"] }>) {
  return (
    <>
      <h3 className="scroll-m-20 text-2xl font-extrabold tracking-tight">
        {value.value} {value.currency}
      </h3>
      {children}
    </>
  )
}

function PageBody() {
  const { data } = useSuspenseQuery({
    queryKey: ["balances"],
    queryFn: fetchBalances,
  })

  return (
    <>
      <div className="flex items-center gap-2 my-2">
        <Card className="flex-1 bg-indigo-100 self-stretch">
          <CardHeader>
            <CardTitle>Bitcoin balance</CardTitle>
          </CardHeader>
          <CardContent>
            <BalanceText value={data.bitcoin} />
          </CardContent>
        </Card>
        <Card className="flex-1 bg-orange-100 self-stretch">
          <CardHeader>
            <CardTitle>e-IOU balance</CardTitle>
          </CardHeader>
          <CardContent>
            <BalanceText value={data.eiou} />
          </CardContent>
        </Card>
        <Card className="flex-1 bg-purple-200 self-stretch">
          <CardHeader>
            <CardTitle>Credit token balance</CardTitle>
          </CardHeader>
          <CardContent>
            <BalanceText value={data.credit} />
          </CardContent>
        </Card>
        <Card className="flex-1 bg-purple-400 self-stretch">
          <CardHeader>
            <CardTitle>Debit token balance</CardTitle>
          </CardHeader>
          <CardContent>
            <BalanceText value={data.debit} />
          </CardContent>
        </Card>
      </div>

      <div className="flex items-center gap-2 hidden">
        <Card className="flex-1 max-h-[500px] py-4">
          <BitcoinBalanceChart />
        </Card>
        <Card className="flex-1 max-h-[500px] py-4">
          <OtherBalanceChart />
        </Card>
      </div>

      <pre className="text-sm bg-accent text-accent-foreground rounded-lg p-2 my-2">
        {JSON.stringify(data, null, 2)}
      </pre>
    </>
  )
}

export default function BalancesPage() {
  return (
    <>
      <Breadcrumbs>Balances</Breadcrumbs>
      <PageTitle>Balances</PageTitle>

      <Suspense fallback={<Loader />}>
        <PageBody />
      </Suspense>
    </>
  )
}
