import { useQuery } from "@tanstack/react-query";
import { getMintInfoOptions } from "@/generated/client/@tanstack/react-query.gen";
import { defineMessages, FormattedMessage, useIntl } from "react-intl";
import { InfoField } from "@/components/InfoField";
import { Heading, Text } from "@bitcredit/ui-library";

const versionMessages = defineMessages({
  wildcat: { id: "home.mint.version.wildcat", defaultMessage: "Wildcat" },
  ebillCore: { id: "home.mint.version.ebillCore", defaultMessage: "BCR eBill Core" },
  cdkMintd: { id: "home.mint.version.cdkMintd", defaultMessage: "CDK Mintd" },
  clowder: { id: "home.mint.version.clowder", defaultMessage: "Clowder" },
});

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
      <Heading as="h3" variant="sub" className="mb-4">
        <FormattedMessage id="home.mint.title" defaultMessage="Mint Info" />
      </Heading>
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
          <InfoField label={<FormattedMessage id="home.mint.network" defaultMessage="Network" />} value={mintData.network} />
          <InfoField
            label={<FormattedMessage id="home.mint.clowderNodeId" defaultMessage="Clowder Node ID" />}
            value={mintData.clowder_node_id}
            copyLabel={intl.formatMessage({
              id: "home.mint.clowderNodeId",
              defaultMessage: "Clowder Node ID",
            })}
            mono
          />
          <InfoField
            label={<FormattedMessage id="home.mint.clowderChangeAddress" defaultMessage="Clowder Change Address" />}
            value={mintData.clowder_change_address}
            copyLabel={intl.formatMessage({
              id: "home.mint.clowderChangeAddress",
              defaultMessage: "Clowder Change Address",
            })}
            mono
          />

          <div className="border-t pt-4 mt-4">
            <Heading as="h4" variant="sub" className="mb-4">
              <FormattedMessage id="home.mint.versions" defaultMessage="Versions" />
            </Heading>
            <div className="flex flex-col gap-3">
              {(
                [
                  [versionMessages.wildcat, mintData.versions.wildcat],
                  [versionMessages.ebillCore, mintData.versions.bcr_ebill_core],
                  [versionMessages.cdkMintd, mintData.versions.cdk_mintd],
                  [versionMessages.clowder, mintData.versions.clowder],
                ] as const
              ).map(([message, version]) => (
                <div key={message.id} className="flex justify-between items-center">
                  <span className="text-xs text-muted-foreground uppercase tracking-wide font-medium">{intl.formatMessage(message)}</span>
                  <Text variant="mono" monoSize="sm">
                    {version}
                  </Text>
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
                <Text variant="caption">{new Date(mintData.uptime_timestamp).toLocaleString(undefined, { timeZone: "UTC" })}</Text>
              </div>
              {mintData.build_time && (
                <div className="flex flex-col gap-1">
                  <span className="text-xs text-muted-foreground uppercase tracking-wide font-medium">
                    <FormattedMessage id="home.mint.buildTime" defaultMessage="Build Time" />
                  </span>
                  <Text variant="caption">
                    {new Date(mintData.build_time).toLocaleString(undefined, {
                      timeZone: "UTC",
                    })}
                  </Text>
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
