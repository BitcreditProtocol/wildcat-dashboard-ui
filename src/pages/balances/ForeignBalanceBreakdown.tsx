import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { Bar, BarChart, CartesianGrid, XAxis, YAxis } from "recharts";
import { FormattedMessage, useIntl } from "react-intl";
import {
  type ChartConfig,
  ChartContainer,
  ChartLegend,
  ChartLegendContent,
  ChartTooltip,
  ChartTooltipContent,
} from "@/components/ui/chart";
import { getForeignBalanceOptions } from "@/generated/client/@tanstack/react-query.gen";
import { mintLabel } from "@/pages/home/components/clowder-peers/clowder-peer-utils";
import { sortForeignBalances } from "@/utils/foreign-balance";
import { useAmountFormatter } from "@/utils/amount-format";
import { CHART_BODY_CLASS, HistoryChartCard } from "./HistoryChartCard";

export function ForeignBalanceBreakdown() {
  const intl = useIntl();
  const { formatAmount } = useAmountFormatter();

  const { data, isPending, error } = useQuery({
    ...getForeignBalanceOptions(),
    staleTime: 25_000,
    refetchInterval: 30_000,
  });

  const series = useMemo(
    () =>
      sortForeignBalances(data?.balances ?? []).map((entry) => ({
        mint: mintLabel(entry.mint_id),
        settled: entry.settled,
        unsettled: entry.unsettled,
      })),
    [data]
  );

  const config = {
    settled: {
      label: intl.formatMessage({ id: "balances.foreign.settled", defaultMessage: "Settled" }),
      color: "var(--color-chart-2)",
    },
    unsettled: {
      label: intl.formatMessage({ id: "balances.foreign.unsettled", defaultMessage: "Unsettled" }),
      color: "var(--color-chart-5)",
    },
  } satisfies ChartConfig;

  return (
    <HistoryChartCard
      title={<FormattedMessage id="balances.foreign.title" defaultMessage="Foreign eCash by mint" />}
      description={
        <FormattedMessage
          id="balances.foreign.description"
          defaultMessage="e-IOU value this mint holds with each foreign mint. Settled value it can act on now; unsettled is still owed to it."
        />
      }
      isPending={isPending}
      error={error}
      isEmpty={series.every((point) => point.settled === 0 && point.unsettled === 0)}
      emptyMessage={<FormattedMessage id="balances.foreign.empty" defaultMessage="The mint holds no foreign eCash yet." />}
    >
      <ChartContainer config={config} className={CHART_BODY_CLASS}>
        <BarChart accessibilityLayer data={series} margin={{ top: 5, right: 12, left: 5, bottom: 5 }}>
          <CartesianGrid vertical={false} />
          <XAxis dataKey="mint" tickLine={false} tickMargin={10} axisLine={false} interval="preserveStartEnd" />
          <YAxis width={88} tickLine={false} tickMargin={10} axisLine={false} tickFormatter={(value: number) => formatAmount(value)} />
          <ChartTooltip content={<ChartTooltipContent labelFormatter={(label) => (typeof label === "string" ? label : null)} />} />
          <Bar dataKey="settled" stackId="foreign" fill="var(--color-settled)" radius={[0, 0, 4, 4]} />
          <Bar dataKey="unsettled" stackId="foreign" fill="var(--color-unsettled)" radius={[4, 4, 0, 0]} />
          <ChartLegend content={<ChartLegendContent />} />
        </BarChart>
      </ChartContainer>
    </HistoryChartCard>
  );
}
