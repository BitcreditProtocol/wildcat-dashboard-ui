import React, { useMemo } from "react";
import { useQueries, useQuery } from "@tanstack/react-query";
import { defineMessages, FormattedMessage, useIntl } from "react-intl";
import { Heading, Text } from "@bitcredit/ui-library";
import { getClowderAlphasOptions, getClowderBetasOptions, getMintInfoOptions } from "@/generated/client/@tanstack/react-query.gen";
import type { ConnectedMintResponse, SimpleAlphaState } from "@/generated/client/types.gen";
import {
  ClowderForeignSubstituteError,
  deriveOwnMintBaseUrl,
  getClowderForeignStatusQueryOptions,
  getClowderForeignSubstituteQueryOptions,
} from "@/lib/clowder-foreign-status";
import { env } from "@/lib/env";

type StatusKind = "online" | "interim" | "offline" | "rabid" | "confiscatedRabid" | "unknown";

function mintLabel(mint: string): string {
  try {
    return new URL(mint).host;
  } catch {
    return mint;
  }
}

function sortByMintLabel(mints: ConnectedMintResponse[]): ConnectedMintResponse[] {
  return [...mints].sort((a, b) => mintLabel(a.mint).localeCompare(mintLabel(b.mint)));
}

function statusKind(state?: SimpleAlphaState): StatusKind {
  if (!state) return "unknown";
  if ("Online" in state) return "online";
  if ("Interim" in state) return "interim";
  if ("Offline" in state) return "offline";
  if ("Rabid" in state) return "rabid";
  if ("ConfiscatedRabid" in state) return "confiscatedRabid";
  return "unknown";
}

function statusTimestamp(state?: SimpleAlphaState): number | undefined {
  if (!state) return undefined;
  if ("Online" in state) return state.Online;
  if ("Interim" in state) return state.Interim;
  if ("Offline" in state) return state.Offline;
  return undefined;
}

function statusDetail(state?: SimpleAlphaState): string | undefined {
  if (!state) return undefined;
  if ("Rabid" in state) return state.Rabid;
  if ("ConfiscatedRabid" in state) return state.ConfiscatedRabid.map((entry) => JSON.stringify(entry)).join(", ");
  return undefined;
}

const statusMessages = defineMessages({
  online: { id: "home.clowderPeers.status.online", defaultMessage: "Online" },
  interim: { id: "home.clowderPeers.status.interim", defaultMessage: "Interim" },
  offline: { id: "home.clowderPeers.status.offline", defaultMessage: "Offline" },
  rabid: { id: "home.clowderPeers.status.rabid", defaultMessage: "Rabid" },
  confiscatedRabid: { id: "home.clowderPeers.status.confiscatedRabid", defaultMessage: "Confiscated Rabid" },
  unknown: { id: "home.clowderPeers.status.unknown", defaultMessage: "Unknown" },
});

const substituteMessages = defineMessages({
  label: { id: "home.clowderPeers.substitute.label", defaultMessage: "Substitute: {mint}" },
  loading: { id: "home.clowderPeers.substitute.loading", defaultMessage: "Loading substitute..." },
  noSubstitute: { id: "home.clowderPeers.substitute.noSubstitute", defaultMessage: "No substitute elected" },
  unknownNode: { id: "home.clowderPeers.substitute.unknownNode", defaultMessage: "Substitute unknown: node is not in topology" },
  unavailable: { id: "home.clowderPeers.substitute.unavailable", defaultMessage: "Substitute unavailable" },
});

const statusDotClass: Record<StatusKind, string> = {
  online: "bg-emerald-500",
  interim: "bg-amber-500",
  offline: "bg-red-500",
  rabid: "bg-purple-500",
  confiscatedRabid: "bg-rose-700",
  unknown: "bg-muted-foreground",
};

interface PeerStatusRowProps {
  mint: string;
  state?: SimpleAlphaState;
  isLoading: boolean;
  isError: boolean;
  substitute?: ConnectedMintResponse;
  substituteIsLoading?: boolean;
  substituteError?: Error | null;
}

function PeerStatusRow({ mint, state, isLoading, isError, substitute, substituteIsLoading = false, substituteError }: PeerStatusRowProps) {
  const intl = useIntl();
  const kind = isLoading || isError ? "unknown" : statusKind(state);
  const timestamp = statusTimestamp(state);
  const detail = statusDetail(state);
  const substituteDetail = useMemo(() => {
    if (substituteIsLoading) {
      return intl.formatMessage(substituteMessages.loading);
    }
    if (substitute) {
      return intl.formatMessage(substituteMessages.label, { mint: mintLabel(substitute.mint) });
    }
    if (!substituteError) {
      return undefined;
    }
    if (substituteError instanceof ClowderForeignSubstituteError) {
      if (substituteError.kind === "noSubstitute") {
        return intl.formatMessage(substituteMessages.noSubstitute);
      }
      if (substituteError.kind === "unknownNode") {
        return intl.formatMessage(substituteMessages.unknownNode);
      }
    }
    return intl.formatMessage(substituteMessages.unavailable);
  }, [intl, substitute, substituteError, substituteIsLoading]);

  return (
    <div className="flex items-center justify-between gap-3 border-t pt-3 first:border-t-0 first:pt-0">
      <div className="flex min-w-0 flex-col gap-0.5">
        <Text variant="caption" className="truncate">
          {mintLabel(mint)}
        </Text>
        {substituteDetail && (
          <span className="text-xs text-muted-foreground truncate" title={substitute?.node_id}>
            {substituteDetail}
          </span>
        )}
        {detail && (
          <span className="text-xs text-muted-foreground truncate" title={detail}>
            {detail}
          </span>
        )}
      </div>
      <div className="flex shrink-0 flex-col items-end gap-0.5">
        <div className="flex items-center gap-1.5">
          <span className={`h-2 w-2 rounded-full ${statusDotClass[kind]}`} aria-hidden="true" />
          <Text variant="caption">{intl.formatMessage(statusMessages[kind])}</Text>
        </div>
        {timestamp !== undefined && (
          <span className="text-xs text-muted-foreground">{new Date(timestamp * 1000).toLocaleString(undefined, { timeZone: "UTC" })}</span>
        )}
      </div>
    </div>
  );
}

interface PeerStatusSectionProps {
  title: React.ReactNode;
  peers: ConnectedMintResponse[];
  statuses: { data?: SimpleAlphaState; isLoading: boolean; isError: boolean }[];
  substitutes?: { data?: ConnectedMintResponse; isLoading: boolean; error: Error | null }[];
  isLoading: boolean;
  isError: boolean;
}

function PeerStatusSection({ title, peers, statuses, substitutes, isLoading, isError }: PeerStatusSectionProps) {
  return (
    <div className="flex flex-col gap-3">
      <Heading as="h4" variant="sub">
        {title}
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
            const status = statuses[index];
            const substitute = substitutes?.[index];
            return (
              <PeerStatusRow
                key={peer.node_id}
                mint={peer.mint}
                state={status?.data}
                isLoading={status?.isLoading ?? true}
                isError={status?.isError ?? false}
                substitute={substitute?.data}
                substituteIsLoading={substitute?.isLoading}
                substituteError={substitute?.error}
              />
            );
          })}
        </div>
      )}
    </div>
  );
}

export function ClowderPeersCard() {
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
  const {
    data: mintInfoData,
    isLoading: mintInfoLoading,
    isError: mintInfoError,
  } = useQuery({
    ...getMintInfoOptions(),
    staleTime: 60_000,
  });

  const myNodeId = mintInfoData?.clowder_node_id;
  const ownMintBaseUrl = useMemo(() => deriveOwnMintBaseUrl(env.apiBaseUrl), []);

  const alphas = useMemo(() => sortByMintLabel(alphasData?.mints ?? []), [alphasData]);
  const betas = useMemo(() => sortByMintLabel(betasData?.mints ?? []), [betasData]);
  const substituteLookupClowderUrl = betas[0]?.clowder;

  // My opinion of each Alpha: asked directly against my own mint's public status endpoint.
  const myOpinionOfAlphasQueries = useQueries({
    queries: alphas.map((alpha) => ({
      ...getClowderForeignStatusQueryOptions({ mintBaseUrl: ownMintBaseUrl, pk: alpha.node_id }),
      staleTime: 30_000,
      refetchInterval: 30_000,
      retry: 1,
    })),
  });

  // Each Beta's opinion of me: asked directly against every Beta's own public status endpoint
  // (a different mint host per row, not our own admin API).
  const betasOpinionOfMeQueries = useQueries({
    queries: betas.map((beta) => ({
      ...getClowderForeignStatusQueryOptions({ mintBaseUrl: beta.mint, pk: myNodeId ?? "" }),
      enabled: Boolean(myNodeId),
      staleTime: 30_000,
      refetchInterval: 30_000,
      retry: 1,
    })),
  });

  const alphaSubstituteQueries = useQueries({
    queries: alphas.map((alpha) => ({
      ...getClowderForeignSubstituteQueryOptions({ clowderBaseUrl: substituteLookupClowderUrl ?? "", pk: alpha.node_id }),
      enabled: Boolean(substituteLookupClowderUrl),
      staleTime: 30_000,
      refetchInterval: 30_000,
      retry: 1,
    })),
  });

  return (
    <div className="bg-card text-card-foreground rounded-lg border p-6">
      <Heading as="h3" variant="sub" className="mb-4">
        <FormattedMessage id="home.clowderPeers.title" defaultMessage="Clowder Peers" />
      </Heading>

      <div className="flex flex-col gap-6">
        <PeerStatusSection
          title={<FormattedMessage id="home.clowderPeers.betasOpinionOfMe.title" defaultMessage="My Betas" />}
          peers={betas}
          statuses={betasOpinionOfMeQueries}
          isLoading={betasLoading || mintInfoLoading}
          isError={betasError || mintInfoError}
        />
        <PeerStatusSection
          title={<FormattedMessage id="home.clowderPeers.myOpinionOfAlphas.title" defaultMessage="My Alphas" />}
          peers={alphas}
          statuses={myOpinionOfAlphasQueries}
          substitutes={alphaSubstituteQueries}
          isLoading={alphasLoading}
          isError={alphasError}
        />
      </div>
    </div>
  );
}
