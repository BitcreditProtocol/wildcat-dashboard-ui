import { useMemo } from "react";
import type { ReactNode } from "react";
import { Heading, Text } from "@bitcredit/ui-library";
import { useIntl } from "react-intl";
import type { ConnectedMintResponse, SimpleAlphaState } from "@/generated/client/types.gen";
import { ClowderForeignSubstituteError } from "@/lib/clowder-foreign-status";
import {
  mintLabel,
  peerMessages,
  statusDetail,
  statusKind,
  statusMessages,
  statusTimestamp,
  substituteMessages,
} from "./clowder-peer-utils";

interface PeerDetailFieldProps {
  label: ReactNode;
  value?: ReactNode;
  title?: string;
}

function PeerDetailField({ label, value, title }: PeerDetailFieldProps) {
  return (
    <div className="flex flex-col gap-0.5">
      <span className="text-xs text-muted-foreground">{label}</span>
      <Text variant="caption" className="break-all" title={title}>
        {value ?? "-"}
      </Text>
    </div>
  );
}

interface PeerDetailPanelProps {
  peer: ConnectedMintResponse;
  state?: SimpleAlphaState;
  isLoading: boolean;
  isError: boolean;
  substitute?: ConnectedMintResponse;
  substituteIsLoading?: boolean;
  substituteError?: Error | null;
  showsSubstitute: boolean;
}

export function PeerDetailPanel({
  peer,
  state,
  isLoading,
  isError,
  substitute,
  substituteIsLoading = false,
  substituteError,
  showsSubstitute,
}: PeerDetailPanelProps) {
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
    <div role="tabpanel" className="min-w-0 overflow-hidden rounded-sm border bg-background p-3 sm:p-4">
      <div className="flex min-w-0 flex-col gap-4">
        <div className="flex flex-col gap-3">
          <Heading as="h5" variant="sub">
            {intl.formatMessage(peerMessages.clowderInformation)}
          </Heading>
          <PeerDetailField label={intl.formatMessage(peerMessages.mintUrl)} value={peer.mint} title={peer.mint} />
          <PeerDetailField label={intl.formatMessage(peerMessages.clowderUrl)} value={peer.clowder} title={peer.clowder} />
          <PeerDetailField label={intl.formatMessage(peerMessages.nodeId)} value={peer.node_id} title={peer.node_id} />
          <PeerDetailField label={intl.formatMessage(peerMessages.status)} value={intl.formatMessage(statusMessages[kind])} />
          {timestamp !== undefined && (
            <PeerDetailField
              label={intl.formatMessage(peerMessages.updatedAt)}
              value={new Date(timestamp * 1000).toLocaleString(undefined, { timeZone: "UTC" })}
            />
          )}
          {detail && <PeerDetailField label={intl.formatMessage(peerMessages.statusDetail)} value={detail} title={detail} />}
        </div>

        {showsSubstitute && (
          <div className="flex flex-col gap-3 border-t pt-4">
            <Heading as="h5" variant="sub">
              {intl.formatMessage(peerMessages.substituteInformation)}
            </Heading>
            <PeerDetailField label={intl.formatMessage(peerMessages.status)} value={substituteDetail} title={substitute?.node_id} />
            {substitute && (
              <>
                <PeerDetailField label={intl.formatMessage(peerMessages.mintUrl)} value={substitute.mint} title={substitute.mint} />
                <PeerDetailField
                  label={intl.formatMessage(peerMessages.clowderUrl)}
                  value={substitute.clowder}
                  title={substitute.clowder}
                />
                <PeerDetailField label={intl.formatMessage(peerMessages.nodeId)} value={substitute.node_id} title={substitute.node_id} />
              </>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
