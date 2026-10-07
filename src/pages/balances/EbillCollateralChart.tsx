import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { TruncatedTextPopover } from "@bitcredit/ui-library";
import { Bar, BarChart, CartesianGrid, ReferenceLine, XAxis, YAxis } from "recharts";
import { FormattedMessage, useIntl } from "react-intl";
import {
  type ChartConfig,
  ChartContainer,
  ChartLegend,
  ChartLegendContent,
  ChartTooltip,
  ChartTooltipContent,
} from "@/components/ui/chart";
import { getBillsBalanceHistoryOptions } from "@/generated/client/@tanstack/react-query.gen";
import { clipMaturityBuckets, ebillCollateralByMaturity, ebillCollateralEntries, withTodayMarker } from "@/utils/balance-history";
import { useAmountFormatter } from "@/utils/amount-format";
import { formatDateShort, getUtcStartOfDate, toUtcDateKey } from "@/utils/dates";
import { ChartRangeToggle } from "./ChartRangeToggle";
import { useChartRange } from "./use-chart-range";
import { CHART_BODY_CLASS, HistoryChartCard } from "./HistoryChartCard";
import { HistoryTable, TotalLabel } from "./HistoryTable";

function formatMaturity(maturityDate: string, locale: string): string {
  const utcStart = getUtcStartOfDate(maturityDate);

  return utcStart ? formatDateShort(utcStart, locale) : maturityDate;
}

export function EbillCollateralChart() {
  const intl = useIntl();
  const { formatAmount } = useAmountFormatter();
  const { range, setRange, picked, setPicked, bounds } = useChartRange();

  const { data, isPending, error } = useQuery({
    ...getBillsBalanceHistoryOptions(),
    staleTime: 30_000,
    refetchInterval: 60_000,
  });

  const todayKey = toUtcDateKey(new Date());
  const buckets = useMemo(
    () => clipMaturityBuckets(withTodayMarker(ebillCollateralByMaturity(data?.bills ?? []), todayKey), bounds),
    [bounds, data, todayKey]
  );

  const entries = useMemo(() => ebillCollateralEntries(data?.bills ?? [], bounds), [bounds, data]);
  const totals = entries.reduce((sum, entry) => ({ paid: sum.paid + entry.paid, outstanding: sum.outstanding + entry.outstanding }), {
    paid: 0,
    outstanding: 0,
  });

  const config = {
    outstanding: {
      label: intl.formatMessage({ id: "balances.history.ebill.outstanding", defaultMessage: "Outstanding" }),
      color: "var(--color-chart-2)",
    },
    paid: {
      label: intl.formatMessage({ id: "balances.history.ebill.paid", defaultMessage: "Paid" }),
      color: "var(--color-chart-3)",
    },
  } satisfies ChartConfig;

  return (
    <HistoryChartCard
      title={<FormattedMessage id="balances.history.ebill.title" defaultMessage="E-bill collateral" />}
      description={
        <FormattedMessage
          id="balances.history.ebill.description"
          defaultMessage="Bill sums by maturity date. A bill counts as paid only once its payment status says so."
        />
      }
      isPending={isPending}
      error={error}
      isEmpty={buckets.every((bucket) => bucket.paid === 0 && bucket.outstanding === 0)}
      emptyMessage={
        range === "all" ? (
          <FormattedMessage id="balances.history.ebill.empty" defaultMessage="The mint holds no e-bills yet." />
        ) : (
          <FormattedMessage id="balances.history.range.empty" defaultMessage="Nothing in the selected time range." />
        )
      }
      actions={<ChartRangeToggle value={range} onChange={setRange} direction="both" picked={picked} onPickedChange={setPicked} />}
      table={
        <HistoryTable
          rows={entries}
          rowKey={(entry) => entry.id}
          columns={[
            {
              key: "maturity",
              header: <FormattedMessage id="balances.history.ebill.table.maturity" defaultMessage="Maturity" />,
              cell: (entry) => formatMaturity(entry.maturityDate, intl.locale),
            },
            {
              key: "bill",
              header: <FormattedMessage id="balances.history.ebill.table.bill" defaultMessage="Bill" />,
              cell: (entry) => <TruncatedTextPopover text={entry.id} className="font-mono" as="span" />,
              truncate: true,
              className: "text-muted-foreground",
            },
            {
              key: "outstanding",
              header: config.outstanding.label,
              cell: (entry) => (entry.outstanding === 0 ? null : formatAmount(entry.outstanding)),
              numeric: true,
            },
            {
              key: "paid",
              header: config.paid.label,
              cell: (entry) => (entry.paid === 0 ? null : formatAmount(entry.paid)),
              numeric: true,
            },
          ]}
          summary={[
            {
              key: "total",
              label: <TotalLabel />,
              cells: { outstanding: formatAmount(totals.outstanding), paid: formatAmount(totals.paid) },
            },
          ]}
        />
      }
    >
      <ChartContainer config={config} className={CHART_BODY_CLASS}>
        <BarChart accessibilityLayer data={buckets} margin={{ top: 5, right: 12, left: 5, bottom: 5 }}>
          <CartesianGrid vertical={false} />
          <XAxis
            dataKey="maturityDate"
            tickLine={false}
            tickMargin={10}
            axisLine={false}
            interval="preserveStartEnd"
            tickFormatter={(value: string) => formatMaturity(value, intl.locale)}
          />
          <YAxis width={88} tickLine={false} tickMargin={10} axisLine={false} tickFormatter={(value: number) => formatAmount(value)} />
          <ChartTooltip
            content={
              <ChartTooltipContent labelFormatter={(label) => (typeof label === "string" ? formatMaturity(label, intl.locale) : null)} />
            }
          />
          <Bar dataKey="outstanding" stackId="collateral" fill="var(--color-outstanding)" radius={[0, 0, 4, 4]} />
          <Bar dataKey="paid" stackId="collateral" fill="var(--color-paid)" radius={[4, 4, 0, 0]} />
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
          <ChartLegend content={<ChartLegendContent />} />
        </BarChart>
      </ChartContainer>
    </HistoryChartCard>
  );
}
