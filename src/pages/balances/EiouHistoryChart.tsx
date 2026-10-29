import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { TruncatedTextPopover } from "@bitcredit/ui-library";
import { Area, AreaChart, CartesianGrid, XAxis, YAxis } from "recharts";
import { FormattedMessage, type MessageDescriptor, defineMessages, useIntl } from "react-intl";
import { type ChartConfig, ChartContainer, ChartTooltip, ChartTooltipContent } from "@/components/ui/chart";
import { getEiouHistoryOptions } from "@/generated/client/@tanstack/react-query.gen";
import type { EiouOperationType } from "@/generated/client/types.gen";
import { clipBalanceSeries, eiouBalanceSeries, eiouLedger } from "@/utils/balance-history";
import { useAmountFormatter } from "@/utils/amount-format";
import { useDateDisplay } from "@/hooks/use-date-display";
import { ChartRangeToggle } from "./ChartRangeToggle";
import { useChartRange } from "./use-chart-range";
import { CHART_BODY_CLASS, HistoryChartCard } from "./HistoryChartCard";
import { HistoryTable, TotalLabel } from "./HistoryTable";

const operationMessages = defineMessages({
  Deposit: { id: "balances.history.eiou.operation.deposit", defaultMessage: "Deposit" },
}) satisfies Record<EiouOperationType["type"], MessageDescriptor>;

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

export function EiouHistoryChart() {
  const intl = useIntl();
  const { formatDateFromSeconds, formatDateTimeFromSeconds } = useDateDisplay();
  const { formatAmount } = useAmountFormatter();
  const { range, setRange, picked, setPicked, bounds } = useChartRange();

  const { data, isPending, error } = useQuery({
    ...getEiouHistoryOptions(),
    staleTime: 30_000,
    refetchInterval: 60_000,
  });

  const series = useMemo(() => clipBalanceSeries(eiouBalanceSeries(data?.operations ?? []), bounds), [bounds, data]);
  const ledger = useMemo(() => eiouLedger(data?.operations ?? [], bounds), [bounds, data]);
  const netChange = ledger.closing - ledger.opening;
  const signed = (value: number) => (value > 0 ? `+${formatAmount(value)}` : formatAmount(value));

  const config = {
    balance: {
      label: intl.formatMessage({ id: "balances.history.eiou.series", defaultMessage: "e-IOU collateral" }),
      color: "var(--color-chart-2)",
    },
  } satisfies ChartConfig;

  return (
    <HistoryChartCard
      title={<FormattedMessage id="balances.history.eiou.title" defaultMessage="e-IOU deposits" />}
      description={
        <FormattedMessage
          id="balances.history.eiou.description"
          defaultMessage="Running e-IOU collateral after every deposit, dated by the block it landed in."
        />
      }
      isPending={isPending}
      error={error}
      isEmpty={series.length === 0}
      emptyMessage={
        range === "all" ? (
          <FormattedMessage id="balances.history.eiou.empty" defaultMessage="No e-IOU deposits have landed yet." />
        ) : (
          <FormattedMessage id="balances.history.range.empty" defaultMessage="Nothing in the selected time range." />
        )
      }
      actions={<ChartRangeToggle value={range} onChange={setRange} direction="past" picked={picked} onPickedChange={setPicked} />}
      table={
        <HistoryTable
          rows={ledger.entries}
          rowKey={(entry) => entry.key}
          defaultSort={{ key: "timestamp", direction: "asc" }}
          columns={[
            {
              key: "timestamp",
              header: <FormattedMessage id="balances.history.eiou.table.date" defaultMessage="Date" />,
              cell: (entry) => formatDateTimeFromSeconds(entry.timestamp),
              sortValue: (entry) => entry.timestamp,
            },
            {
              key: "operation",
              header: <FormattedMessage id="balances.history.eiou.table.operation" defaultMessage="Operation" />,
              cell: (entry) => intl.formatMessage(operationMessages[entry.operation.op_type.type]),
            },
            {
              key: "request",
              header: <FormattedMessage id="balances.history.eiou.table.request" defaultMessage="Request ID" />,
              cell: (entry) => <TruncatedTextPopover text={entry.operation.op_type.request_id} className="font-mono" as="span" />,
              truncate: true,
              className: "text-muted-foreground",
            },
            {
              key: "block",
              header: <FormattedMessage id="balances.history.eiou.table.block" defaultMessage="Block" />,
              // A block height is an identifier, so no thousands separator.
              cell: (entry) => String(entry.operation.block_height),
              sortValue: (entry) => entry.operation.block_height,
              numeric: true,
            },
            {
              key: "change",
              header: <FormattedMessage id="balances.history.eiou.table.change" defaultMessage="Change (e-IOU)" />,
              cell: (entry) => signed(entry.change),
              numeric: true,
            },
            {
              key: "balance",
              header: <FormattedMessage id="balances.history.eiou.table.balance" defaultMessage="Collateral (e-IOU)" />,
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
            tickFormatter={(value: number) => formatDateFromSeconds(value)}
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
                  return timestamp === null ? null : formatDateFromSeconds(timestamp);
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
