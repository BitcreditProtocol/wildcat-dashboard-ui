import { useQuery } from "@tanstack/react-query";
import { getClowderInfoOptions } from "@/generated/client/@tanstack/react-query.gen";
import { FormattedMessage, useIntl } from "react-intl";
import { InfoField } from "@/components/InfoField";

export function ClowderCard() {
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
    <div className="bg-card text-card-foreground rounded-lg border p-6">
      <h3 className="text-lg font-semibold mb-4">
        <FormattedMessage id="home.clowder.title" defaultMessage="Clowder" />
      </h3>
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
              <span className="text-sm">
                {new Date(clowderData.uptime_timestamp * 1000).toLocaleString(undefined, { timeZone: "UTC" })}
              </span>
            </div>
          )}
        </div>
      ) : (
        <div className="text-center text-muted-foreground">
          <FormattedMessage id="home.clowder.none" defaultMessage="No clowder information available" />
        </div>
      )}
    </div>
  );
}
