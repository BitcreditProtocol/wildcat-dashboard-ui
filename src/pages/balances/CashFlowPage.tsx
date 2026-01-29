import { Suspense } from "react"
import { Link } from "react-router"
import { CartesianGrid, Line, LineChart, Tooltip, XAxis, YAxis } from "recharts"
import { Breadcrumbs } from "@/components/Breadcrumbs"
import { PageTitle } from "@/components/PageTitle"
import { Skeleton } from "@/components/ui/skeleton"
import { ChartConfig, ChartContainer, ChartLegend, ChartLegendContent } from "@/components/ui/chart"
import { FormattedMessage, useIntl } from "react-intl"

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
  const intl = useIntl()
  const config = {
    bitcoin: {
      label: intl.formatMessage({ id: "balances.chart.bitcoin", defaultMessage: "Bitcoin" }),
      color: "#2563eb",
    },
  } satisfies ChartConfig

  const months = [
    intl.formatMessage({ id: "month.jan.short", defaultMessage: "Jan" }),
    intl.formatMessage({ id: "month.feb.short", defaultMessage: "Feb" }),
    intl.formatMessage({ id: "month.mar.short", defaultMessage: "Mar" }),
    intl.formatMessage({ id: "month.apr.short", defaultMessage: "Apr" }),
    intl.formatMessage({ id: "month.may.short", defaultMessage: "May" }),
    intl.formatMessage({ id: "month.jun.short", defaultMessage: "Jun" }),
    intl.formatMessage({ id: "month.jul.short", defaultMessage: "Jul" }),
    intl.formatMessage({ id: "month.aug.short", defaultMessage: "Aug" }),
    intl.formatMessage({ id: "month.sep.short", defaultMessage: "Sep" }),
    intl.formatMessage({ id: "month.oct.short", defaultMessage: "Oct" }),
    intl.formatMessage({ id: "month.nov.short", defaultMessage: "Nov" }),
    intl.formatMessage({ id: "month.dec.short", defaultMessage: "Dec" }),
  ]

  const data = [
    { month: months[0], bitcoin: 186 },
    { month: months[1], bitcoin: 305 },
    { month: months[2], bitcoin: 237 },
    { month: months[3], bitcoin: 73 },
    { month: months[4], bitcoin: 209 },
    { month: months[5], bitcoin: 214 },
    { month: months[6], bitcoin: 21 },
    { month: months[7], bitcoin: 32 },
    { month: months[8], bitcoin: 0 },
    { month: months[9], bitcoin: 0 },
    { month: months[10], bitcoin: 0 },
    { month: months[11], bitcoin: 0 },
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
          tickFormatter={(value: string) => value}
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

export default function CashFlowPage() {
  return (
    <>
      <Breadcrumbs
        parents={[
          <>
            <Link to="/earnings">
              <FormattedMessage
                id="earnings.page.title"
                defaultMessage="Earnings"
              />
            </Link>
          </>,
        ]}
      >
        <FormattedMessage
          id="cashflow.page.title"
          defaultMessage="CashFlow"
        />
      </Breadcrumbs>
      <PageTitle>
        <FormattedMessage
          id="cashflow.page.title"
          defaultMessage="CashFlow"
        />
      </PageTitle>

      <Suspense fallback={<Loader />}>
        <PageBody />
      </Suspense>
    </>
  )
}
