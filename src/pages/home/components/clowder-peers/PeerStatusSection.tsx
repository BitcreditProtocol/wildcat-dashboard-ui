import { useEffect, useState } from "react";
import type { ReactNode } from "react";
import { Heading, Text } from "@bitcredit/ui-library";
import { FormattedMessage } from "react-intl";
import type { ConnectedMintResponse, SimpleAlphaState } from "@/generated/client/types.gen";
import { PeerDetailPanel } from "./PeerDetailPanel";
import { PeerStatusRow } from "./PeerStatusRow";

interface PeerQueryResult {
  data?: SimpleAlphaState;
  isLoading: boolean;
  isError: boolean;
}

interface SubstituteQueryResult {
  data?: ConnectedMintResponse;
  isLoading: boolean;
  error: Error | null;
}

interface PeerStatusSectionProps {
  title: ReactNode;
  description: ReactNode;
  peers: ConnectedMintResponse[];
  statuses: PeerQueryResult[];
  substitutes?: SubstituteQueryResult[];
  isLoading: boolean;
  isError: boolean;
}

export function PeerStatusSection({ title, description, peers, statuses, substitutes, isLoading, isError }: PeerStatusSectionProps) {
  const [selectedPeerId, setSelectedPeerId] = useState<string | undefined>();
  const selectedPeerIndex = Math.max(
    0,
    peers.findIndex((peer) => peer.node_id === selectedPeerId)
  );
  const selectedPeer = peers[selectedPeerIndex];
  const selectedStatus = statuses[selectedPeerIndex];
  const selectedSubstitute = substitutes?.[selectedPeerIndex];

  useEffect(() => {
    if (peers.length === 0) {
      setSelectedPeerId(undefined);
      return;
    }

    if (!selectedPeerId || !peers.some((peer) => peer.node_id === selectedPeerId)) {
      setSelectedPeerId(peers[0].node_id);
    }
  }, [peers, selectedPeerId]);

  return (
    <div className="@container bg-card text-card-foreground flex min-w-0 flex-col gap-3 rounded-lg border p-4 sm:p-6">
      <div className="flex flex-col gap-1">
        <Heading as="h4" variant="sub">
          {title}
        </Heading>
        <Text variant="caption" className="text-muted-foreground">
          {description}
        </Text>
      </div>
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
        <div className="grid min-w-0 gap-3 @min-[42rem]:grid-cols-2 @min-[42rem]:items-start">
          <div role="tablist" className="flex flex-col gap-2">
            {peers.map((peer, index) => {
              const status = statuses[index];
              return (
                <PeerStatusRow
                  key={peer.node_id}
                  peer={peer}
                  state={status?.data}
                  isLoading={status?.isLoading ?? true}
                  isError={status?.isError ?? false}
                  isSelected={peer.node_id === selectedPeer?.node_id}
                  onSelect={() => setSelectedPeerId(peer.node_id)}
                />
              );
            })}
          </div>
          {selectedPeer && (
            <PeerDetailPanel
              peer={selectedPeer}
              state={selectedStatus?.data}
              isLoading={selectedStatus?.isLoading ?? true}
              isError={selectedStatus?.isError ?? false}
              substitute={selectedSubstitute?.data}
              substituteIsLoading={selectedSubstitute?.isLoading}
              substituteError={selectedSubstitute?.error}
              showsSubstitute={Boolean(substitutes)}
            />
          )}
        </div>
      )}
    </div>
  );
}
