import { useEffect, useId, useState } from "react";
import type { ReactNode } from "react";
import { Heading, Popover, PopoverContent, PopoverTrigger, Text } from "@bitcredit/ui-library";
import { Info } from "lucide-react";
import { FormattedMessage, useIntl } from "react-intl";
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
  description?: ReactNode;
  infoTooltip?: ReactNode;
  peers: ConnectedMintResponse[];
  statuses: PeerQueryResult[];
  substitutes?: SubstituteQueryResult[];
  isLoading: boolean;
  isError: boolean;
  renderDetailPanel?: (props: { id: string; labelledBy: string; peer: ConnectedMintResponse; status: PeerQueryResult }) => ReactNode;
}

export function PeerStatusSection({
  title,
  description,
  infoTooltip,
  peers,
  statuses,
  substitutes,
  isLoading,
  isError,
  renderDetailPanel,
}: PeerStatusSectionProps) {
  const intl = useIntl();
  const sectionId = useId();
  const [selectedPeerId, setSelectedPeerId] = useState<string | undefined>();
  const selectedPeerIndex = Math.max(
    0,
    peers.findIndex((peer) => peer.node_id === selectedPeerId)
  );
  const selectedPeer = peers[selectedPeerIndex];
  const selectedStatus = statuses[selectedPeerIndex];
  const selectedSubstitute = substitutes?.[selectedPeerIndex];
  const hasDetailPanel = renderDetailPanel !== undefined || substitutes !== undefined;
  const selectedTabId = `${sectionId}-tab-${selectedPeerIndex}`;
  const selectedPanelId = `${sectionId}-panel`;

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
        <div className="flex items-center gap-1.5">
          <Heading as="h4" variant="sub">
            {title}
          </Heading>
          {infoTooltip && (
            <Popover>
              <PopoverTrigger asChild>
                <button
                  type="button"
                  className="text-muted-foreground hover:text-foreground"
                  aria-label={intl.formatMessage({ id: "home.clowderPeers.info.ariaLabel", defaultMessage: "More information" })}
                >
                  <Info className="h-4 w-4" />
                </button>
              </PopoverTrigger>
              <PopoverContent className="max-w-xs text-sm">{infoTooltip}</PopoverContent>
            </Popover>
          )}
        </div>
        {description && (
          <Text variant="caption" className="text-muted-foreground">
            {description}
          </Text>
        )}
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
        <div
          className={`grid min-w-0 gap-3 ${hasDetailPanel ? "@min-[42rem]:grid-cols-[minmax(0,1fr)_minmax(0,2fr)] @min-[42rem]:items-start" : ""}`}
        >
          <div role={hasDetailPanel ? "tablist" : undefined} className="flex flex-col gap-2">
            {peers.map((peer, index) => {
              const status = statuses[index];
              const rowProps = {
                peer,
                state: status?.data,
                isLoading: status?.isLoading ?? true,
                isError: status?.isError ?? false,
              };

              return hasDetailPanel ? (
                <PeerStatusRow
                  key={peer.node_id}
                  {...rowProps}
                  id={`${sectionId}-tab-${index}`}
                  controls={selectedPanelId}
                  isSelected={peer.node_id === selectedPeer?.node_id}
                  onSelect={() => setSelectedPeerId(peer.node_id)}
                />
              ) : (
                <PeerStatusRow key={peer.node_id} {...rowProps} />
              );
            })}
          </div>
          {hasDetailPanel && selectedPeer && (
            <>
              {renderDetailPanel ? (
                renderDetailPanel({
                  id: selectedPanelId,
                  labelledBy: selectedTabId,
                  peer: selectedPeer,
                  status: {
                    data: selectedStatus?.data,
                    isLoading: selectedStatus?.isLoading ?? true,
                    isError: selectedStatus?.isError ?? false,
                  },
                })
              ) : (
                <PeerDetailPanel
                  id={selectedPanelId}
                  labelledBy={selectedTabId}
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
            </>
          )}
        </div>
      )}
    </div>
  );
}
