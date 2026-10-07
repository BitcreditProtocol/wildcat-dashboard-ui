import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { TruncatedTextPopover } from "@bitcredit/ui-library";
import { Area, AreaChart, CartesianGrid, XAxis, YAxis } from "recharts";
import { FormattedMessage, type MessageDescriptor, defineMessages, useIntl } from "react-intl";
import { type ChartConfig, ChartContainer, ChartTooltip, ChartTooltipContent } from "@/components/ui/chart";
import { getOnchainHistoryOptions } from "@/generated/client/@tanstack/react-query.gen";
import type { OnChainOperationType } from "@/generated/client/types.gen";
import { clipBalanceSeries, onChainBalanceSeries, onChainLedger } from "@/utils/balance-history";
import { useAmountFormatter } from "@/utils/amount-format";
import { formatDateShort } from "@/utils/dates";
import { ChartRangeToggle } from "./ChartRangeToggle";
import { useChartRange } from "./use-chart-range";
import { CHART_BODY_CLASS, HistoryChartCard } from "./HistoryChartCard";
import { HistoryTable, TotalLabel } from "./HistoryTable";

const operationMessages = defineMessages({
  Mint: { id: "balances.history.onchain.operation.mint", defaultMessage: "Mint" },
  Melt: { id: "balances.history.onchain.operation.melt", defaultMessage: "Melt" },
  EbillPayment: { id: "balances.history.onchain.operation.ebillPayment", defaultMessage: "E-bill payment" },
  AddReserve: { id: "balances.history.onchain.operation.addReserve", defaultMessage: "Reserve added" },
}) satisfies Record<OnChainOperationType["type"], MessageDescriptor>;

function operationReference(opType: OnChainOperationType): string {
  switch (opType.type) {
    case "Mint":
    case "Melt":
      return opType.quote_id;
    case "EbillPayment":
      return opType.bill_id;
    case "AddReserve":
      return opType.reserve_id;
  }
}

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
  const { range, setRange, picked, setPicked, bounds } = useChartRange();

  const { data, isPending, error } = useQuery({
    ...getOnchainHistoryOptions(),
    staleTime: 30_000,
    refetchInterval: 60_000,
  });

  const series = useMemo(() => clipBalanceSeries(onChainBalanceSeries(data?.operations ?? []), bounds), [bounds, data]);

  const ledger = useMemo(() => onChainLedger(data?.operations ?? [], bounds), [bounds, data]);
  const netChange = ledger.closing - ledger.opening;
  const signed = (value: number) => (value > 0 ? `+${formatAmount(value)}` : formatAmount(value));

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
      table={
        <HistoryTable
          rows={ledger.entries}
          rowKey={(entry) => entry.key}
          columns={[
            {
              key: "timestamp",
              header: <FormattedMessage id="balances.history.onchain.table.date" defaultMessage="Date" />,
              cell: (entry) => intl.formatDate(new Date(entry.timestamp * 1000), { dateStyle: "medium", timeStyle: "short" }),
            },
            {
              key: "operation",
              header: <FormattedMessage id="balances.history.onchain.table.operation" defaultMessage="Operation" />,
              cell: (entry) => intl.formatMessage(operationMessages[entry.operation.op_type.type]),
            },
            {
              key: "reference",
              header: <FormattedMessage id="balances.history.onchain.table.reference" defaultMessage="Reference" />,
              cell: (entry) => <TruncatedTextPopover text={operationReference(entry.operation.op_type)} className="font-mono" as="span" />,
              truncate: true,
              className: "text-muted-foreground",
            },
            {
              key: "change",
              header: <FormattedMessage id="balances.history.onchain.table.change" defaultMessage="Change (sat)" />,
              cell: (entry) => signed(entry.change),
              numeric: true,
            },
            {
              key: "balance",
              header: <FormattedMessage id="balances.history.onchain.table.balance" defaultMessage="Balance (sat)" />,
              cell: (entry) => formatAmount(entry.balance),
              numeric: true,
            },
          ]}
          summary={
            ledger.opening === 0
              ? [{ key: "total", label: <TotalLabel />, cells: { change: signed(netChange), balance: formatAmount(ledger.closing) } }]
              : [
                  {
                    key: "opening",
                    label: <FormattedMessage id="balances.history.onchain.table.opening" defaultMessage="Opening balance" />,
                    cells: { balance: formatAmount(ledger.opening) },
                  },
                  {
                    key: "net",
                    label: <FormattedMessage id="balances.history.onchain.table.net" defaultMessage="Net change in range" />,
                    cells: { change: signed(netChange) },
                  },
                  {
                    key: "closing",
                    label: <FormattedMessage id="balances.history.onchain.table.closing" defaultMessage="Closing balance" />,
                    cells: { balance: formatAmount(ledger.closing) },
                  },
                ]
          }
        />
      }
    >
      <ChartContainer config={config} className={CHART_BODY_CLASS}>
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
