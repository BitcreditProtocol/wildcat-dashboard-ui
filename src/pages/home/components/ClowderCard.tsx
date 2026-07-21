import { useQuery } from "@tanstack/react-query";
import { getClowderInfoOptions } from "@/generated/client/@tanstack/react-query.gen";
import { defineMessages, FormattedMessage, useIntl } from "react-intl";
import { InfoField } from "@/components/InfoField";
import { Heading, Text } from "@bitcredit/ui-library";
import type { SimpleAlphaState } from "@/generated/client/types.gen";
import { statusDetail, statusDotClass, statusKind, statusMessages, statusTimestamp } from "./clowder-peers/clowder-peer-utils";

const clowderStatusMessages = defineMessages({
  status: { id: "home.clowder.status", defaultMessage: "Status" },
  statusLoading: { id: "home.clowder.statusLoading", defaultMessage: "Loading status..." },
  statusError: { id: "home.clowder.statusError", defaultMessage: "Failed to load status" },
  statusUpdatedAt: { id: "home.clowder.statusUpdatedAt", defaultMessage: "Status Updated At" },
  statusDetail: { id: "home.clowder.statusDetail", defaultMessage: "Status Detail" },
});

interface ClowderStatus {
  state?: SimpleAlphaState;
  isLoading: boolean;
  isError: boolean;
}

interface ClowderCardProps {
  className?: string;
  status?: ClowderStatus;
}

function ClowderStatusBlock({ status }: { status: ClowderStatus }) {
  const intl = useIntl();
  const kind = status.isLoading || status.isError ? "unknown" : statusKind(status.state);
  const timestamp = statusTimestamp(status.state);
  const detail = statusDetail(status.state);

  return (
    <>
      <div className="flex flex-col gap-1">
        <span className="text-xs text-muted-foreground uppercase tracking-wide font-medium">
          {intl.formatMessage(clowderStatusMessages.status)}
        </span>
        <div className="flex items-center gap-1.5">
          <span className={`h-2 w-2 rounded-full ${statusDotClass[kind]}`} aria-hidden="true" />
          <Text variant="caption">
            {status.isLoading
              ? intl.formatMessage(clowderStatusMessages.statusLoading)
              : status.isError
                ? intl.formatMessage(clowderStatusMessages.statusError)
                : intl.formatMessage(statusMessages[kind])}
          </Text>
        </div>
      </div>
      {timestamp !== undefined && (
        <div className="flex flex-col gap-1">
          <span className="text-xs text-muted-foreground uppercase tracking-wide font-medium">
            {intl.formatMessage(clowderStatusMessages.statusUpdatedAt)}
          </span>
          <Text variant="caption">{new Date(timestamp * 1000).toLocaleString(undefined, { timeZone: "UTC" })}</Text>
        </div>
      )}
      {detail && <InfoField label={intl.formatMessage(clowderStatusMessages.statusDetail)} value={detail} />}
    </>
  );
}

export function ClowderCard({ className = "bg-card text-card-foreground rounded-lg border p-6", status }: ClowderCardProps) {
  const intl = useIntl();
  const {
    data: clowderData,
    isLoading: clowderLoading,
    isError: clowderError,
  } = useQuery({
    ...getClowderInfoOptions(),
    staleTime: 60_000,
  });

  return (
    <div className={className}>
      <Heading as="h3" variant="sub" className="mb-4">
        <FormattedMessage id="home.clowder.title" defaultMessage="Clowder" />
      </Heading>
      {clowderLoading ? (
        <div className="text-center text-muted-foreground">
          <FormattedMessage id="home.clowder.loading" defaultMessage="Loading clowder information..." />
        </div>
      ) : clowderError ? (
        <div className="text-center text-muted-foreground">
          <FormattedMessage id="home.clowder.error" defaultMessage="Failed to load clowder information" />
        </div>
      ) : clowderData ? (
        <div className="flex flex-col gap-4">
          <InfoField
            label={<FormattedMessage id="home.clowder.nodeId" defaultMessage="Node ID" />}
            value={clowderData.node_id as unknown as string}
            copyLabel={intl.formatMessage({
              id: "home.clowder.nodeIdLabel",
              defaultMessage: "Clowder Node ID",
            })}
            mono
          />
          <InfoField label={<FormattedMessage id="home.clowder.version" defaultMessage="Version" />} value={clowderData.version} />
          <InfoField label={<FormattedMessage id="home.clowder.network" defaultMessage="Network" />} value={clowderData.network} />
          <InfoField
            label={<FormattedMessage id="home.clowder.changeAddress" defaultMessage="Change Address" />}
            value={clowderData.change_address}
            copyLabel={intl.formatMessage({
              id: "home.clowder.changeAddress",
              defaultMessage: "Change Address",
            })}
            mono
          />
          {clowderData.uptime_timestamp && (
            <div className="flex flex-col gap-1">
              <span className="text-xs text-muted-foreground uppercase tracking-wide font-medium">
                <FormattedMessage id="home.clowder.startedAt" defaultMessage="Started At" />
              </span>
              <Text variant="caption">{new Date(clowderData.uptime_timestamp * 1000).toLocaleString(undefined, { timeZone: "UTC" })}</Text>
            </div>
          )}
          {status && <ClowderStatusBlock status={status} />}
        </div>
      ) : (
        <div className="text-center text-muted-foreground">
          <FormattedMessage id="home.clowder.none" defaultMessage="No clowder information available" />
        </div>
      )}
    </div>
  );
}
