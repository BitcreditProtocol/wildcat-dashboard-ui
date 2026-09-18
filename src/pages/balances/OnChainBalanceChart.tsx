import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { Area, AreaChart, CartesianGrid, XAxis, YAxis } from "recharts";
import { FormattedMessage, useIntl } from "react-intl";
import { type ChartConfig, ChartContainer, ChartTooltip, ChartTooltipContent } from "@/components/ui/chart";
import { getOnchainHistoryOptions } from "@/generated/client/@tanstack/react-query.gen";
import { clipBalanceSeries, onChainBalanceSeries } from "@/utils/balance-history";
import { useAmountFormatter } from "@/utils/amount-format";
import { formatDateShort } from "@/utils/dates";
import { ChartRangeToggle } from "./ChartRangeToggle";
import { useChartRange } from "./use-chart-range";
import { HistoryChartCard } from "./HistoryChartCard";

function tooltipTimestamp(payload: unknown): number | null {
  if (!Array.isArray(payload)) {
    return null;
  }

  const entry: unknown = payload[0];
  const point: unknown = entry && typeof entry === "object" && "payload" in entry ? entry.payload : undefined;

  if (point && typeof point === "object" && "timestamp" in point && typeof point.timestamp === "number") {
    return point.timestamp;
  }

  return null;
}

export function OnChainBalanceChart() {
  const intl = useIntl();
  const { formatAmount } = useAmountFormatter();
  const { range, setRange, picked, setPicked, bounds } = useChartRange("past");

  const { data, isPending, error } = useQuery({
    ...getOnchainHistoryOptions(),
    staleTime: 30_000,
    refetchInterval: 60_000,
  });

  const series = useMemo(() => clipBalanceSeries(onChainBalanceSeries(data?.operations ?? []), bounds), [bounds, data]);

  const config = {
    balance: {
      label: intl.formatMessage({ id: "balances.history.onchain.series", defaultMessage: "On-chain balance" }),
      color: "var(--color-chart-1)",
    },
  } satisfies ChartConfig;

  return (
    <HistoryChartCard
      title={<FormattedMessage id="balances.history.onchain.title" defaultMessage="On-chain balance" />}
      description={
        <FormattedMessage
          id="balances.history.onchain.description"
          defaultMessage="Running balance after every settled mint, melt, e-bill payment and reserve."
        />
      }
      isPending={isPending}
      error={error}
      isEmpty={series.length === 0}
      emptyMessage={
        range === "all" ? (
          <FormattedMessage id="balances.history.onchain.empty" defaultMessage="No on-chain operations have settled yet." />
        ) : (
          <FormattedMessage id="balances.history.range.empty" defaultMessage="Nothing in the selected time range." />
        )
      }
      actions={<ChartRangeToggle value={range} onChange={setRange} direction="past" picked={picked} onPickedChange={setPicked} />}
    >
      <ChartContainer config={config} className="h-64 w-full">
        <AreaChart accessibilityLayer data={series} margin={{ top: 5, right: 12, left: 5, bottom: 5 }}>
          <CartesianGrid vertical={false} />
          <XAxis
            dataKey="timestamp"
            type="number"
            scale="time"
            domain={["dataMin", "dataMax"]}
            tickLine={false}
            tickMargin={10}
            axisLine={false}
            tickFormatter={(value: number) => formatDateShort(new Date(value * 1000), intl.locale)}
          />
          <YAxis
            dataKey="balance"
            width={88}
            tickLine={false}
            tickMargin={10}
            axisLine={false}
            tickFormatter={(value: number) => formatAmount(value)}
          />
          <ChartTooltip
            content={
              <ChartTooltipContent
                labelFormatter={(_label, payload) => {
                  const timestamp = tooltipTimestamp(payload);
                  return timestamp === null ? null : formatDateShort(new Date(timestamp * 1000), intl.locale);
                }}
              />
            }
          />
          <Area type="step" dataKey="balance" stroke="var(--color-balance)" fill="var(--color-balance)" fillOpacity={0.2} />
        </AreaChart>
      </ChartContainer>
    </HistoryChartCard>
  );
}
