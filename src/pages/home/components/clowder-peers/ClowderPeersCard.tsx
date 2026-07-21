import { useMemo } from "react";
import { useQueries, useQuery } from "@tanstack/react-query";
import { Heading } from "@bitcredit/ui-library";
import { FormattedMessage } from "react-intl";
import { getClowderAlphasOptions, getClowderBetasOptions, getMintInfoOptions } from "@/generated/client/@tanstack/react-query.gen";
import {
  deriveOwnMintBaseUrl,
  getClowderForeignStatusQueryOptions,
  getClowderForeignSubstituteQueryOptions,
} from "@/lib/clowder-foreign-status";
import { env } from "@/lib/env";
import { sortByMintLabel } from "./clowder-peer-utils";
import { PeerStatusSection } from "./PeerStatusSection";

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

  const myOpinionOfAlphasQueries = useQueries({
    queries: alphas.map((alpha) => ({
      ...getClowderForeignStatusQueryOptions({ mintBaseUrl: ownMintBaseUrl, pk: alpha.node_id }),
      staleTime: 30_000,
      refetchInterval: 30_000,
      retry: 1,
    })),
  });

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
    <div className="flex flex-col gap-4">
      <Heading as="h3" variant="sub">
        <FormattedMessage id="home.clowderPeers.title" defaultMessage="Clowder Peers" />
      </Heading>

      <div className="grid grid-cols-1 gap-4 xl:grid-cols-[minmax(0,1fr)_minmax(0,2fr)]">
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
          substitutes={substituteLookupClowderUrl ? alphaSubstituteQueries : undefined}
          isLoading={alphasLoading}
          isError={alphasError}
        />
      </div>
    </div>
  );
}
