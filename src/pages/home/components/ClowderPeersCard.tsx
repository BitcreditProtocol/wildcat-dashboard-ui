import { useMemo } from "react";
import { useQueries, useQuery } from "@tanstack/react-query";
import { defineMessages, FormattedMessage, useIntl } from "react-intl";
import { Heading, Text } from "@bitcredit/ui-library";
import { getClowderAlphasOptions, getClowderBetasOptions, getClowderStatusOptions } from "@/generated/client/@tanstack/react-query.gen";
import type { SimpleAlphaState } from "@/generated/client/types.gen";

type PeerRole = "alpha" | "beta";

interface Peer {
  nodeId: string;
  mint: string;
  role: PeerRole;
}

type StatusKind = "online" | "interim" | "offline" | "rabid" | "unknown";

function mintLabel(mint: string): string {
  try {
    return new URL(mint).hostname;
  } catch {
    return mint;
  }
}

function statusKind(state?: SimpleAlphaState): StatusKind {
  if (!state) return "unknown";
  if ("Online" in state) return "online";
  if ("Interim" in state) return "interim";
  if ("Offline" in state) return "offline";
  if ("Rabid" in state || "ConfiscatedRabid" in state) return "rabid";
  return "unknown";
}

function statusTimestamp(state?: SimpleAlphaState): number | undefined {
  if (!state) return undefined;
  if ("Online" in state) return state.Online;
  if ("Interim" in state) return state.Interim;
  if ("Offline" in state) return state.Offline;
  return undefined;
}

const statusMessages = defineMessages({
  online: { id: "home.clowderPeers.status.online", defaultMessage: "Online" },
  interim: { id: "home.clowderPeers.status.interim", defaultMessage: "Interim" },
  offline: { id: "home.clowderPeers.status.offline", defaultMessage: "Offline" },
  rabid: { id: "home.clowderPeers.status.rabid", defaultMessage: "Rabid" },
  unknown: { id: "home.clowderPeers.status.unknown", defaultMessage: "Unknown" },
});

const roleMessages = defineMessages({
  alpha: { id: "home.clowderPeers.role.alpha", defaultMessage: "Alpha" },
  beta: { id: "home.clowderPeers.role.beta", defaultMessage: "Beta" },
});

const statusDotClass: Record<StatusKind, string> = {
  online: "bg-emerald-500",
  interim: "bg-amber-500",
  offline: "bg-red-500",
  rabid: "bg-purple-500",
  unknown: "bg-muted-foreground",
};

export function ClowderPeersCard() {
  const intl = useIntl();

  const {
    data: alphasData,
    isLoading: alphasLoading,
    isError: alphasError,
  } = useQuery({
    ...getClowderAlphasOptions(),
    staleTime: 30_000,
    refetchInterval: 30_000,
  });
  const {
    data: betasData,
    isLoading: betasLoading,
    isError: betasError,
  } = useQuery({
    ...getClowderBetasOptions(),
    staleTime: 30_000,
    refetchInterval: 30_000,
  });

  const peers = useMemo<Peer[]>(() => {
    const byNodeId = new Map<string, Peer>();

    for (const mint of alphasData?.mints ?? []) {
      byNodeId.set(mint.node_id, { nodeId: mint.node_id, mint: mint.mint, role: "alpha" });
    }

    for (const mint of betasData?.mints ?? []) {
      if (!byNodeId.has(mint.node_id)) {
        byNodeId.set(mint.node_id, { nodeId: mint.node_id, mint: mint.mint, role: "beta" });
      }
    }

    return Array.from(byNodeId.values()).sort((a, b) => mintLabel(a.mint).localeCompare(mintLabel(b.mint)));
  }, [alphasData, betasData]);

  const statusQueries = useQueries({
    queries: peers.map((peer) => ({
      ...getClowderStatusOptions({ path: { pk: peer.nodeId } }),
      staleTime: 30_000,
      refetchInterval: 30_000,
    })),
  });

  const isLoading = alphasLoading || betasLoading;
  const isError = alphasError || betasError;

  return (
    <div className="bg-card text-card-foreground rounded-lg border p-6">
      <Heading as="h3" variant="sub" className="mb-4">
        <FormattedMessage id="home.clowderPeers.title" defaultMessage="Clowder Peers" />
      </Heading>

      {isLoading ? (
        <div className="text-center text-muted-foreground">
          <FormattedMessage id="home.clowderPeers.loading" defaultMessage="Loading peer status..." />
        </div>
      ) : isError ? (
        <div className="text-center text-muted-foreground">
          <FormattedMessage id="home.clowderPeers.error" defaultMessage="Failed to load peer status" />
        </div>
      ) : peers.length === 0 ? (
        <div className="text-center text-muted-foreground">
          <FormattedMessage id="home.clowderPeers.none" defaultMessage="No clowder peers found" />
        </div>
      ) : (
        <div className="flex flex-col gap-3">
          {peers.map((peer, index) => {
            const statusQuery = statusQueries[index];
            const kind = statusQuery.isLoading ? "unknown" : statusKind(statusQuery.data?.state);
            const timestamp = statusTimestamp(statusQuery.data?.state);

            return (
              <div key={peer.nodeId} className="flex items-center justify-between gap-3 border-t pt-3 first:border-t-0 first:pt-0">
                <div className="flex min-w-0 flex-col gap-0.5">
                  <Text variant="caption" className="truncate">
                    {mintLabel(peer.mint)}
                  </Text>
                  <span className="text-xs text-muted-foreground uppercase tracking-wide">
                    {intl.formatMessage(roleMessages[peer.role])}
                  </span>
                </div>
                <div className="flex shrink-0 flex-col items-end gap-0.5">
                  <div className="flex items-center gap-1.5">
                    <span className={`h-2 w-2 rounded-full ${statusDotClass[kind]}`} aria-hidden="true" />
                    <Text variant="caption">{intl.formatMessage(statusMessages[kind])}</Text>
                  </div>
                  {timestamp !== undefined && (
                    <span className="text-xs text-muted-foreground">
                      {new Date(timestamp * 1000).toLocaleString(undefined, { timeZone: "UTC" })}
                    </span>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
