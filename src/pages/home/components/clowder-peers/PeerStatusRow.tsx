import { Text } from "@bitcredit/ui-library";
import { useIntl } from "react-intl";
import type { ConnectedMintResponse, SimpleAlphaState } from "@/generated/client/types.gen";
import { mintLabel, statusDotClass, statusKind, statusMessages, statusTimestamp } from "./clowder-peer-utils";

interface PeerStatusRowProps {
  id?: string;
  controls?: string;
  peer: ConnectedMintResponse;
  state?: SimpleAlphaState;
  isLoading: boolean;
  isError: boolean;
  isSelected?: boolean;
  onSelect?: () => void;
}

export function PeerStatusRow({ id, controls, peer, state, isLoading, isError, isSelected = false, onSelect }: PeerStatusRowProps) {
  const intl = useIntl();
  const kind = isLoading || isError ? "unknown" : statusKind(state);
  const timestamp = statusTimestamp(state);
  const className = `grid w-full min-w-0 grid-cols-1 gap-2 rounded-sm border p-2.5 text-left transition-colors sm:grid-cols-[minmax(0,1fr)_auto] sm:items-center sm:gap-3 sm:p-3 ${
    isSelected ? "border-primary bg-accent text-accent-foreground" : `border-border ${onSelect ? "hover:bg-accent/50" : ""}`
  }`;

  const content = (
    <>
      <div className="flex min-w-0 flex-col gap-0.5">
        <Text variant="caption" className="truncate">
          {mintLabel(peer.mint)}
        </Text>
      </div>
      <div className="flex min-w-0 flex-wrap items-center justify-between gap-x-3 gap-y-0.5 sm:shrink-0 sm:flex-col sm:items-end">
        <div className="flex items-center gap-1.5">
          <span className={`h-2 w-2 rounded-full ${statusDotClass[kind]}`} aria-hidden="true" />
          <Text variant="caption">{intl.formatMessage(statusMessages[kind])}</Text>
        </div>
        {timestamp !== undefined && (
          <span className="text-xs text-muted-foreground">{new Date(timestamp * 1000).toLocaleString(undefined, { timeZone: "UTC" })}</span>
        )}
      </div>
    </>
  );

  if (!onSelect) {
    return <div className={className}>{content}</div>;
  }

  return (
    <button
      type="button"
      role="tab"
      id={id}
      aria-selected={isSelected}
      aria-controls={controls}
      tabIndex={isSelected ? 0 : -1}
      onClick={onSelect}
      className={className}
    >
      {content}
    </button>
  );
}
