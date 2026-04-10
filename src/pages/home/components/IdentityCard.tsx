import { useQuery } from "@tanstack/react-query";
import { getIdentityOptions } from "@/generated/client/@tanstack/react-query.gen";
import { FormattedMessage, useIntl } from "react-intl";
import { InfoField } from "@/components/InfoField";

export function IdentityCard() {
  const intl = useIntl();
  const { data: identityData } = useQuery({
    ...getIdentityOptions(),
    staleTime: Infinity,
    gcTime: Infinity,
  });

  return (
    <div className="bg-card text-card-foreground rounded-lg border p-6">
      <h3 className="text-lg font-semibold mb-4">
        <FormattedMessage id="home.identity.title" defaultMessage="Identity" />
      </h3>
      {identityData ? (
        <div className="flex flex-col gap-4">
          <div className="flex flex-col gap-1">
            <span className="text-xs text-muted-foreground uppercase tracking-wide font-medium">
              <FormattedMessage id="home.identity.name" defaultMessage="Name" />
            </span>
            <span className="font-semibold text-base">{identityData.name}</span>
          </div>

          {identityData.email && (
            <div className="flex flex-col gap-1">
              <span className="text-xs text-muted-foreground uppercase tracking-wide font-medium">
                <FormattedMessage id="home.identity.email" defaultMessage="Email" />
              </span>
              <span className="font-mono text-sm text-muted-foreground">
                {identityData.email}
              </span>
            </div>
          )}

          <div className="border-t pt-4 mt-4">
            <h4 className="text-md font-semibold mb-4">
              <FormattedMessage id="home.identity.keys" defaultMessage="Keys" />
            </h4>
            <div className="flex flex-col gap-4">
              <InfoField
                label={<FormattedMessage id="home.identity.nodeId" defaultMessage="Node ID" />}
                value={identityData.node_id}
                copyLabel={intl.formatMessage({ id: "home.identity.nodeId", defaultMessage: "Node ID" })}
                mono
              />
              <InfoField
                label={<FormattedMessage id="home.identity.bitcoinPublicKey" defaultMessage="Bitcoin Public Key" />}
                value={identityData.bitcoin_public_key}
                copyLabel={intl.formatMessage({ id: "home.identity.bitcoinPublicKey", defaultMessage: "Bitcoin Public Key" })}
                mono
              />
              <InfoField
                label={<FormattedMessage id="home.identity.nostrPublicKey" defaultMessage="Nostr Public Key" />}
                value={identityData.npub}
                copyLabel={intl.formatMessage({ id: "home.identity.nostrPublicKey", defaultMessage: "Nostr Public Key" })}
                mono
              />
            </div>
          </div>

          {identityData.postal_address && (
            <div className="border-t pt-4 mt-4">
              <h4 className="text-md font-semibold mb-4">
                <FormattedMessage id="home.identity.address" defaultMessage="Address" />
              </h4>
              <div className="text-sm leading-relaxed">
                <div className="font-medium">{identityData.postal_address.address}</div>
                <div className="text-muted-foreground">
                  {identityData.postal_address.city}
                  {identityData.postal_address.zip && `, ${identityData.postal_address.zip}`}
                </div>
                <div className="text-muted-foreground">{identityData.postal_address.country}</div>
              </div>
            </div>
          )}
        </div>
      ) : (
        <div className="text-center text-muted-foreground">
          <FormattedMessage id="home.identity.none" defaultMessage="No identity found" />
        </div>
      )}
    </div>
  );
}
