import { PropsWithChildren, Suspense } from "react"
import { useQueries } from "@tanstack/react-query"
import { Breadcrumbs } from "@/components/Breadcrumbs"
import { PageTitle } from "@/components/PageTitle"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Bar, BarChart, CartesianGrid, XAxis, YAxis } from "recharts"
import { type ChartConfig, ChartContainer, ChartLegend, ChartLegendContent } from "@/components/ui/chart"
import { Skeleton } from "@/components/ui/skeleton"
import { debitBalance, creditBalance, onchainBalance } from "@/generated/client/sdk.gen"

function withTimeout<T>(promise: Promise<T>, timeoutMs: number): Promise<T> {
  return Promise.race([
    promise,
    new Promise<T>((_, reject) =>
      setTimeout(() => reject(new Error(`Request timeout after ${timeoutMs}ms`)), timeoutMs),
    ),
  ])
}

function Loader() {
  return (
    <div className="flex flex-col gap-4 my-2">
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
        <Skeleton className="h-32 rounded-lg" />
        <Skeleton className="h-32 rounded-lg" />
        <Skeleton className="h-32 rounded-lg" />
        <Skeleton className="h-32 rounded-lg" />
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Skeleton className="h-96 rounded-lg" />
        <Skeleton className="h-96 rounded-lg" />
      </div>
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

interface BalanceDisplay {
  amount: string
  unit: string
}

export function BalanceText({ amount, unit, children }: PropsWithChildren<BalanceDisplay>) {
  return (
    <>
      <h3 className="scroll-m-20 text-2xl font-extrabold tracking-tight">
        {amount} {unit}
      </h3>
      {children}
    </>
  )
}

function useBalances() {
  const queries = useQueries({
    queries: [
      {
        queryKey: ["balance", "credit"],
        queryFn: async () => {
          const response = await withTimeout(creditBalance({}), 10_000)
          if (response.error) {
            throw new Error("Failed to fetch credit balance")
          }
          return response.data
        },
        refetchInterval: 30_000,
        staleTime: 25_000,
        retry: 2,
        gcTime: 10_000,
      },
      {
        queryKey: ["balance", "debit"],
        queryFn: async () => {
          const response = await withTimeout(debitBalance({}), 10_000)
          if (response.error) {
            throw new Error("Failed to fetch debit balance")
          }
          return response.data
        },
        refetchInterval: 30_000,
        staleTime: 25_000,
        retry: 2,
        gcTime: 10_000,
      },
      {
        queryKey: ["balance", "onchain"],
        queryFn: async () => {
          const response = await withTimeout(onchainBalance({}), 10_000)
          if (response.error) {
            throw new Error("Failed to fetch onchain balance")
          }
          return response.data
        },
        refetchInterval: 30_000,
        staleTime: 25_000,
        retry: 2,
        gcTime: 10_000,
      },
    ],
  })

  const [creditQuery, debitQuery, onchainQuery] = queries

  const hasError = queries.some((query) => query.isError)
  const error = hasError ? "Failed to load one or more balances" : null

  const balances: Record<string, BalanceDisplay> = {
    bitcoin: {
      amount:
        onchainQuery.data && typeof onchainQuery.data === "object" && "confirmed" in onchainQuery.data
          ? String(onchainQuery.data.confirmed)
          : "0",
      unit: "BTC",
    },
    eiou: { amount: "0", unit: "e-IOU" },
    credit: {
      amount: creditQuery.data && "amount" in creditQuery.data ? String(creditQuery.data.amount) : "0",
      unit: creditQuery.data && "unit" in creditQuery.data ? String(creditQuery.data.unit) : "credit",
    },
    debit: {
      amount: debitQuery.data && "amount" in debitQuery.data ? String(debitQuery.data.amount) : "0",
      unit: debitQuery.data && "unit" in debitQuery.data ? String(debitQuery.data.unit) : "debit",
    },
  }

  const refetch = () => {
    void Promise.all(queries.map((query) => query.refetch()))
  }

  return { balances, error, refetch }
}

function PageBodyWithDevSection() {
  const { balances, error } = useBalances()

  if (error) {
    return (
      <>
        <div className="flex flex-col gap-4 my-2">
          <Card className="bg-red-50 border-red-200">
            <CardContent className="p-4">
              <p className="text-red-800">Error loading balances: {error}</p>
            </CardContent>
          </Card>
        </div>
      </>
    )
  }

  return (
    <>
      <div className="flex flex-col gap-4 my-2">
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
          <Card className="bg-indigo-100">
            <CardHeader>
              <CardTitle>Bitcoin balance</CardTitle>
            </CardHeader>
            <CardContent>
              <BalanceText amount={balances.bitcoin.amount} unit={balances.bitcoin.unit} />
            </CardContent>
          </Card>
          <Card className="bg-orange-100">
            <CardHeader>
              <CardTitle>e-IOU balance</CardTitle>
            </CardHeader>
            <CardContent>
              <BalanceText amount={balances.eiou.amount} unit={balances.eiou.unit} />
            </CardContent>
          </Card>
          <Card className="bg-purple-200">
            <CardHeader>
              <CardTitle>Credit token balance</CardTitle>
            </CardHeader>
            <CardContent>
              <BalanceText amount={balances.credit.amount} unit={balances.credit.unit} />
            </CardContent>
          </Card>
          <Card className="bg-purple-400">
            <CardHeader>
              <CardTitle>Debit token balance</CardTitle>
            </CardHeader>
            <CardContent>
              <BalanceText amount={balances.debit.amount} unit={balances.debit.unit} />
            </CardContent>
          </Card>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Card className="py-4">
            <BitcoinBalanceChart />
          </Card>
          <Card className="py-4">
            <OtherBalanceChart />
          </Card>
        </div>
      </div>
    </>
  )
}

export default function BalancesPage() {
  return (
    <>
      <Breadcrumbs>Balances</Breadcrumbs>
      <PageTitle>Balances</PageTitle>

      <Suspense fallback={<Loader />}>
        <PageBodyWithDevSection />
      </Suspense>
    </>
  )
}
