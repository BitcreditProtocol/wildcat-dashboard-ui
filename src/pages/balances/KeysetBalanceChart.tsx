import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { Bar, BarChart, CartesianGrid, XAxis, YAxis } from "recharts";
import { FormattedMessage, useIntl } from "react-intl";
import { type ChartConfig, ChartContainer, ChartTooltip, ChartTooltipContent } from "@/components/ui/chart";
import { getKeysetsBalanceOptions } from "@/generated/client/@tanstack/react-query.gen";
import { clipKeysetBalances, keysetBalanceSeries } from "@/utils/balance-history";
import { useAmountFormatter } from "@/utils/amount-format";
import { formatDateShort } from "@/utils/dates";
import { ChartRangeToggle } from "./ChartRangeToggle";
import { useChartRange } from "./use-chart-range";
import { HistoryChartCard } from "./HistoryChartCard";

export function KeysetBalanceChart() {
  const intl = useIntl();
  const { formatAmount } = useAmountFormatter();
  const { range, setRange, picked, setPicked, bounds } = useChartRange("future");

  const { data, isPending, error } = useQuery({
    ...getKeysetsBalanceOptions(),
    staleTime: 30_000,
    refetchInterval: 60_000,
  });

  const series = useMemo(() => clipKeysetBalances(keysetBalanceSeries(data?.balances ?? []), bounds), [bounds, data]);
  const expiryByKeyset = useMemo(() => new Map(series.map((point) => [point.keysetId, point.expiry])), [series]);

  const config = {
    balance: {
      label: intl.formatMessage({ id: "balances.history.keysets.series", defaultMessage: "Outstanding eCash" }),
      color: "var(--color-chart-4)",
    },
  } satisfies ChartConfig;

  const formatExpiryTick = (keysetId: string) => {
    const expiry = expiryByKeyset.get(keysetId);

    return expiry === undefined ? keysetId : formatDateShort(new Date(expiry * 1000), intl.locale);
  };

  return (
    <HistoryChartCard
      title={<FormattedMessage id="balances.history.keysets.title" defaultMessage="Outstanding eCash by keyset" />}
      description={
        <FormattedMessage
          id="balances.history.keysets.description"
          defaultMessage="Credit sats still outstanding under each keyset, ordered by the expiry the keyset runs to."
        />
      }
      isPending={isPending}
      error={error}
      isEmpty={series.every((point) => point.balance === 0)}
      emptyMessage={
        range === "all" ? (
          <FormattedMessage id="balances.history.keysets.empty" defaultMessage="No keyset carries an outstanding balance." />
        ) : (
          <FormattedMessage id="balances.history.range.empty" defaultMessage="Nothing in the selected time range." />
        )
      }
      actions={<ChartRangeToggle value={range} onChange={setRange} direction="future" picked={picked} onPickedChange={setPicked} />}
    >
      <ChartContainer config={config} className="h-64 w-full">
        <BarChart accessibilityLayer data={series} margin={{ top: 5, right: 12, left: 5, bottom: 5 }}>
          <CartesianGrid vertical={false} />
          <XAxis
            dataKey="keysetId"
            tickLine={false}
            tickMargin={10}
            axisLine={false}
            interval="preserveStartEnd"
            tickFormatter={formatExpiryTick}
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
              <ChartTooltipContent labelFormatter={(label) => (typeof label === "string" ? label : null)} labelClassName="font-mono" />
            }
          />
          <Bar dataKey="balance" fill="var(--color-balance)" radius={4} />
        </BarChart>
      </ChartContainer>
    </HistoryChartCard>
  );
}
