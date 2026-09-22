import { useMemo } from "react";
import type { ReactNode } from "react";
import { useQuery } from "@tanstack/react-query";
import { Heading, Text } from "@bitcredit/ui-library";
import { defineMessages, FormattedMessage, useIntl } from "react-intl";
import { Currency } from "@/components/Currency";
import { getClowderBetasOptions, getClowderMystatusOptions } from "@/generated/client/@tanstack/react-query.gen";
import { outageKey, sortPendingOutages, totalPendingOutages } from "@/utils/pending-outages";
import { mintLabel, substituteMessages } from "./clowder-peers/clowder-peer-utils";

const outageMessages = defineMessages<{
  substitute: Record<string, never>;
  pendingSwaps: Record<string, never>;
  pendingAmount: Record<string, never>;
  betasWaiting: Record<string, never>;
  betasWaitingOfTotal: { waiting: number; total: number };
  totalPendingSwaps: Record<string, never>;
  totalPendingAmount: Record<string, never>;
}>({
  substitute: { id: "home.pendingOutages.substitute", defaultMessage: "Substitute" },
  pendingSwaps: { id: "home.pendingOutages.pendingSwaps", defaultMessage: "Pending swaps" },
  pendingAmount: { id: "home.pendingOutages.pendingAmount", defaultMessage: "Pending amount" },
  betasWaiting: { id: "home.pendingOutages.betasWaiting", defaultMessage: "Betas waiting" },
  betasWaitingOfTotal: { id: "home.pendingOutages.betasWaitingOfTotal", defaultMessage: "{waiting} of {total}" },
  totalPendingSwaps: { id: "home.pendingOutages.totalPendingSwaps", defaultMessage: "Total pending swaps" },
  totalPendingAmount: { id: "home.pendingOutages.totalPendingAmount", defaultMessage: "Total pending amount" },
});

interface OutageFieldProps {
  label: ReactNode;
  value: ReactNode;
  title?: string;
}

function OutageField({ label, value, title }: OutageFieldProps) {
  return (
    <div className="flex min-w-0 flex-col gap-0.5">
      <span className="text-xs text-muted-foreground uppercase tracking-wide font-medium">{label}</span>
      <Text variant="caption" className="break-all" title={title}>
        {value}
      </Text>
    </div>
  );
}

export function PendingOutagesCard() {
  const intl = useIntl();
  const { data: perceivedState } = useQuery({
    ...getClowderMystatusOptions(),
    staleTime: 30_000,
    refetchInterval: 30_000,
  });
  const { data: betasData } = useQuery({
    ...getClowderBetasOptions(),
    staleTime: 30_000,
  });

  const outages = useMemo(() => sortPendingOutages(perceivedState?.pending_outages ?? []), [perceivedState]);
  const totals = useMemo(() => totalPendingOutages(outages), [outages]);
  const betaLabels = useMemo(() => new Map((betasData?.mints ?? []).map((beta) => [beta.node_id, mintLabel(beta.mint)])), [betasData]);
  const betaCount = betasData?.mints.length ?? 0;

  if (outages.length === 0) {
    return null;
  }

  return (
    <div className="@container bg-card text-card-foreground flex flex-col gap-4 rounded-lg border p-4 sm:p-6">
      <div className="flex flex-col gap-1">
        <Heading as="h3" variant="sub">
          <FormattedMessage id="home.pendingOutages.title" defaultMessage="Pending Offline Swaps" />
        </Heading>
        <Text variant="caption" className="text-muted-foreground">
          <FormattedMessage
            id="home.pendingOutages.description"
            defaultMessage="Your Betas still hold {count, plural, one {one outage} other {# outages}} against you. Until you make these swaps, those Betas won't mark you online again."
            values={{ count: outages.length }}
          />
        </Text>
      </div>

      {outages.length > 1 && (
        <div className="flex flex-wrap gap-x-8 gap-y-2 border-b pb-4">
          <OutageField label={intl.formatMessage(outageMessages.totalPendingSwaps)} value={totals.pendingExchanges} />
          <OutageField
            label={intl.formatMessage(outageMessages.totalPendingAmount)}
            value={<Currency value={totals.pendingAmount} sourceCurrency="sat" />}
          />
        </div>
      )}

      <div className={`grid min-w-0 gap-3 ${outages.length > 1 ? "@min-[72rem]:grid-cols-2" : ""}`}>
        {outages.map((outage) => {
          const substituteLabel = outage.substitute ? (betaLabels.get(outage.substitute) ?? outage.substitute) : undefined;

          return (
            <div key={outageKey(outage)} className="flex min-w-0 flex-col gap-3 rounded-sm border p-3 sm:p-4">
              <OutageField
                label={intl.formatMessage(outageMessages.substitute)}
                value={substituteLabel ?? intl.formatMessage(substituteMessages.noSubstitute)}
                title={outage.substitute ?? undefined}
              />
              <div className="flex flex-wrap gap-x-8 gap-y-2">
                <OutageField label={intl.formatMessage(outageMessages.pendingSwaps)} value={outage.pending_exchanges} />
                <OutageField
                  label={intl.formatMessage(outageMessages.pendingAmount)}
                  value={<Currency value={outage.pending_amount} sourceCurrency="sat" />}
                />
                <OutageField
                  label={intl.formatMessage(outageMessages.betasWaiting)}
                  value={
                    betaCount >= outage.betas_holding
                      ? intl.formatMessage(outageMessages.betasWaitingOfTotal, { waiting: outage.betas_holding, total: betaCount })
                      : outage.betas_holding
                  }
                />
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
