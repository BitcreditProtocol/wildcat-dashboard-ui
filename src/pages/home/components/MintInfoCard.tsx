import { useQuery } from "@tanstack/react-query";
import { getMintInfoOptions } from "@/generated/client/@tanstack/react-query.gen";
import { FormattedMessage, useIntl } from "react-intl";
import { InfoField } from "@/components/InfoField";

export function MintInfoCard() {
  const intl = useIntl();
  const {
    data: mintData,
    isLoading: mintLoading,
    isError: mintError,
  } = useQuery({
    ...getMintInfoOptions(),
    staleTime: 60_000,
  });

  return (
    <div className="bg-card text-card-foreground rounded-lg border p-6">
      <h3 className="text-lg font-semibold mb-4">
        <FormattedMessage id="home.mint.title" defaultMessage="Mint Info" />
      </h3>
      {mintLoading ? (
        <div className="text-center text-muted-foreground">
          <FormattedMessage id="home.mint.loading" defaultMessage="Loading mint information..." />
        </div>
      ) : mintError ? (
        <div className="text-center text-muted-foreground">
          <FormattedMessage id="home.mint.error" defaultMessage="Failed to load mint information" />
        </div>
      ) : mintData ? (
        <div className="flex flex-col gap-4">
          <InfoField
            label={<FormattedMessage id="home.mint.network" defaultMessage="Network" />}
            value={mintData.network}
          />
          <InfoField
            label={<FormattedMessage id="home.mint.clowderNodeId" defaultMessage="Clowder Node ID" />}
            value={mintData.clowder_node_id}
            copyLabel={intl.formatMessage({ id: "home.mint.clowderNodeId", defaultMessage: "Clowder Node ID" })}
            mono
          />
          <InfoField
            label={<FormattedMessage id="home.mint.clowderChangeAddress" defaultMessage="Clowder Change Address" />}
            value={mintData.clowder_change_address}
            copyLabel={intl.formatMessage({ id: "home.mint.clowderChangeAddress", defaultMessage: "Clowder Change Address" })}
            mono
          />

          <div className="border-t pt-4 mt-4">
            <h4 className="text-md font-semibold mb-4">
              <FormattedMessage id="home.mint.versions" defaultMessage="Versions" />
            </h4>
            <div className="flex flex-col gap-3">
              {(
                [
                  ["home.mint.version.wildcat", "Wildcat", mintData.versions.wildcat],
                  ["home.mint.version.ebillCore", "BCR eBill Core", mintData.versions.bcr_ebill_core],
                  ["home.mint.version.cdkMintd", "CDK Mintd", mintData.versions.cdk_mintd],
                  ["home.mint.version.clowder", "Clowder", mintData.versions.clowder],
                ] as const
              ).map(([id, defaultMessage, version]) => (
                <div key={id} className="flex justify-between items-center">
                  <span className="text-xs text-muted-foreground uppercase tracking-wide font-medium">
                    {intl.formatMessage({ id, defaultMessage })}
                  </span>
                  <span className="text-sm font-mono">{version}</span>
                </div>
              ))}
            </div>
          </div>

          {mintData.uptime_timestamp && (
            <div className="border-t pt-4 mt-4 flex flex-col gap-3">
              <div className="flex flex-col gap-1">
                <span className="text-xs text-muted-foreground uppercase tracking-wide font-medium">
                  <FormattedMessage id="home.mint.startedAt" defaultMessage="Started At" />
                </span>
                <span className="text-sm">
                  {new Date(mintData.uptime_timestamp).toLocaleString(undefined, { timeZone: "UTC" })}
                </span>
              </div>
              {mintData.build_time && (
                <div className="flex flex-col gap-1">
                  <span className="text-xs text-muted-foreground uppercase tracking-wide font-medium">
                    <FormattedMessage id="home.mint.buildTime" defaultMessage="Build Time" />
                  </span>
                  <span className="text-sm">
                    {new Date(mintData.build_time).toLocaleString(undefined, { timeZone: "UTC" })}
                  </span>
                </div>
              )}
            </div>
          )}
        </div>
      ) : (
        <div className="text-center text-muted-foreground">
          <FormattedMessage id="home.mint.none" defaultMessage="No mint information available" />
        </div>
      )}
    </div>
  );
}
