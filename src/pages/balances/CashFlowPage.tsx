import { useMemo } from "react";
import { Link } from "react-router";
import { useQuery } from "@tanstack/react-query";
import { Bar, CartesianGrid, ComposedChart, Line, ReferenceLine, XAxis, YAxis } from "recharts";
import { Heading } from "@bitcredit/ui-library";
import { FormattedMessage, useIntl } from "react-intl";
import { Breadcrumbs } from "@/components/Breadcrumbs";
import {
  type ChartConfig,
  ChartContainer,
  ChartLegend,
  ChartLegendContent,
  ChartTooltip,
  ChartTooltipContent,
} from "@/components/ui/chart";
import { getBillsBalanceHistoryOptions, getOnchainHistoryOptions } from "@/generated/client/@tanstack/react-query.gen";
import { type CashFlowGranularity, cashFlow, hasCashFlow, periodKey } from "@/utils/cash-flow";
import { useAmountFormatter } from "@/utils/amount-format";
import { useDateDisplay } from "@/hooks/use-date-display";
import { ChartRangeToggle } from "./ChartRangeToggle";
import { useChartRange } from "./use-chart-range";
import { CHART_BODY_CLASS, HistoryChartCard } from "./HistoryChartCard";
import { HistoryTable, TotalLabel } from "./HistoryTable";

function usePeriodFormatter(granularity: CashFlowGranularity) {
  const intl = useIntl();
  const { formatCalendarDate } = useDateDisplay();

  return (period: string) => {
    if (granularity === "day") {
      return formatCalendarDate(period);
    }

    const [year, month] = period.split("-").map(Number);
    return intl.formatDate(Date.UTC(year, month - 1, 1), { year: "numeric", month: "short", timeZone: "UTC" });
  };
}

function CashFlowChart() {
  const intl = useIntl();
  const { formatAmount } = useAmountFormatter();
  const { range, setRange, picked, setPicked, bounds } = useChartRange();

  const onchain = useQuery({ ...getOnchainHistoryOptions(), staleTime: 30_000, refetchInterval: 60_000 });
  const bills = useQuery({ ...getBillsBalanceHistoryOptions(), staleTime: 30_000, refetchInterval: 60_000 });

  const { granularity, buckets } = useMemo(
    () => cashFlow(onchain.data?.operations ?? [], bills.data?.bills ?? [], bounds),
    [bills.data, bounds, onchain.data]
  );
  const formatPeriod = usePeriodFormatter(granularity);
  const todayKey = periodKey(Math.floor(Date.now() / 1000), granularity);
  const signed = (value: number) => (value > 0 ? `+${formatAmount(value)}` : formatAmount(value));

  const rows = buckets.filter(hasCashFlow);
  const totals = rows.reduce(
    (sum, row) => ({
      bitcoinIn: sum.bitcoinIn + row.bitcoinIn,
      bitcoinOut: sum.bitcoinOut + row.bitcoinOut,
      ebillPaid: sum.ebillPaid + row.ebillPaid,
      ebillExpected: sum.ebillExpected + row.ebillExpected,
      net: sum.net + row.net,
    }),
    { bitcoinIn: 0, bitcoinOut: 0, ebillPaid: 0, ebillExpected: 0, net: 0 }
  );

  const config = {
    bitcoinIn: {
      label: intl.formatMessage({ id: "cashflow.series.bitcoinIn", defaultMessage: "Bitcoin in" }),
      color: "var(--color-chart-1)",
    },
    bitcoinOut: {
      label: intl.formatMessage({ id: "cashflow.series.bitcoinOut", defaultMessage: "Bitcoin out" }),
      color: "var(--color-chart-5)",
    },
    ebillPaid: {
      label: intl.formatMessage({ id: "cashflow.series.ebillPaid", defaultMessage: "E-bill payments" }),
      color: "var(--color-chart-3)",
    },
    ebillExpected: {
      label: intl.formatMessage({ id: "cashflow.series.ebillExpected", defaultMessage: "E-bills maturing (unpaid)" }),
      color: "var(--color-chart-2)",
    },
    net: {
      label: intl.formatMessage({ id: "cashflow.series.net", defaultMessage: "Net realised" }),
      color: "var(--color-foreground)",
    },
  } satisfies ChartConfig;

  return (
    <HistoryChartCard
      title={<FormattedMessage id="cashflow.chart.title" defaultMessage="Cash flow" />}
      description={
        <FormattedMessage
          id="cashflow.chart.description"
          defaultMessage="Settled on-chain flows per period, plus unpaid e-bills on their maturity date. An e-bill counts as paid only once its payment has settled on-chain; unpaid e-bills are expected, not part of the net."
        />
      }
      isPending={onchain.isPending || bills.isPending}
      error={onchain.error ?? bills.error}
      isEmpty={rows.length === 0}
      emptyMessage={
        range === "all" ? (
          <FormattedMessage id="cashflow.chart.empty" defaultMessage="No on-chain flows or e-bills yet." />
        ) : (
          <FormattedMessage id="balances.history.range.empty" defaultMessage="Nothing in the selected time range." />
        )
      }
      actions={<ChartRangeToggle value={range} onChange={setRange} direction="both" picked={picked} onPickedChange={setPicked} />}
      table={
        <HistoryTable
          rows={rows}
          rowKey={(row) => row.period}
          defaultSort={{ key: "period", direction: "asc" }}
          columns={[
            {
              key: "period",
              header: <FormattedMessage id="cashflow.table.period" defaultMessage="Period" />,
              cell: (row) => formatPeriod(row.period),
              sortValue: (row) => row.period,
            },
            { key: "bitcoinIn", header: config.bitcoinIn.label, cell: (row) => formatAmount(row.bitcoinIn), numeric: true },
            { key: "bitcoinOut", header: config.bitcoinOut.label, cell: (row) => formatAmount(row.bitcoinOut), numeric: true },
            { key: "ebillPaid", header: config.ebillPaid.label, cell: (row) => formatAmount(row.ebillPaid), numeric: true },
            { key: "net", header: config.net.label, cell: (row) => signed(row.net), sortValue: (row) => row.net, numeric: true },
            {
              key: "ebillExpected",
              header: config.ebillExpected.label,
              cell: (row) => formatAmount(row.ebillExpected),
              numeric: true,
              className: "text-muted-foreground",
            },
          ]}
          summary={[
            {
              key: "total",
              label: <TotalLabel />,
              cells: {
                bitcoinIn: formatAmount(totals.bitcoinIn),
                bitcoinOut: formatAmount(totals.bitcoinOut),
                ebillPaid: formatAmount(totals.ebillPaid),
                net: signed(totals.net),
                ebillExpected: formatAmount(totals.ebillExpected),
              },
            },
          ]}
        />
      }
    >
      <ChartContainer config={config} className={CHART_BODY_CLASS}>
        <ComposedChart accessibilityLayer data={buckets} stackOffset="sign" margin={{ top: 5, right: 12, left: 5, bottom: 5 }}>
          <CartesianGrid vertical={false} />
          <XAxis
            dataKey="period"
            tickLine={false}
            tickMargin={10}
            axisLine={false}
            interval="preserveStartEnd"
            tickFormatter={(value: string) => formatPeriod(value)}
          />
          <YAxis width={88} tickLine={false} tickMargin={10} axisLine={false} tickFormatter={(value: number) => formatAmount(value)} />
          <ChartTooltip
            content={<ChartTooltipContent labelFormatter={(label) => (typeof label === "string" ? formatPeriod(label) : null)} />}
          />
          <ReferenceLine y={0} stroke="var(--color-border)" />
          <Bar dataKey="bitcoinIn" stackId="flow" fill="var(--color-bitcoinIn)" />
          <Bar dataKey="ebillPaid" stackId="flow" fill="var(--color-ebillPaid)" />
          <Bar dataKey="ebillExpected" stackId="flow" fill="var(--color-ebillExpected)" fillOpacity={0.45} />
          <Bar dataKey="bitcoinOut" stackId="flow" fill="var(--color-bitcoinOut)" />
          <Line type="monotone" dataKey="net" stroke="var(--color-net)" strokeWidth={2} dot={false} />
          {buckets.some((bucket) => bucket.period === todayKey) && (
            <ReferenceLine
              x={todayKey}
              stroke="var(--color-muted-foreground)"
              strokeDasharray="4 4"
              label={{
                value: intl.formatMessage({ id: "balances.history.ebill.today", defaultMessage: "Today" }),
                position: "top",
                fill: "var(--color-muted-foreground)",
                fontSize: 12,
              }}
            />
          )}
          <ChartLegend content={<ChartLegendContent />} />
        </ComposedChart>
      </ChartContainer>
    </HistoryChartCard>
  );
}

export default function CashFlowPage() {
  return (
    <>
      <Breadcrumbs
        parents={[
          <>
            <Link to="/balances">
              <FormattedMessage id="balances.page.title" defaultMessage="Balances" />
            </Link>
          </>,
        ]}
      >
        <FormattedMessage id="cashflow.page.title" defaultMessage="CashFlow" />
      </Breadcrumbs>
      <Heading as="h1" variant="page" className="mb-6 pt-4">
        <FormattedMessage id="cashflow.page.title" defaultMessage="CashFlow" />
      </Heading>

      <div className="my-4">
        <CashFlowChart />
      </div>
    </>
  );
}
