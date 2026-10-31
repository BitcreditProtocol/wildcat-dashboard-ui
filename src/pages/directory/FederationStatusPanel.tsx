import { Button } from "@bitcredit/ui-library";
import { useIntl } from "react-intl";
import { defineMessages } from "@/i18n/define-messages";
import { RelayCoverageList } from "@/pages/credit/NetworkControlsPanels";
import { DirectoryCoveragePanel } from "./PublicDirectoryPanels";
import { useFederationStatus, type FederationStatus } from "./federation-status";

const m = defineMessages({
  heading: {
    id: "directory.federation.heading",
    defaultMessage: "Federation status",
    description: "Public Mint federation status section",
  },
  scope: {
    id: "directory.federation.scope",
    defaultMessage:
      "This Mint and its pinned followed set only. Relay reachability does not prove complete network coverage. No network-wide clearance is implied.",
    description: "Federation health scope",
  },
  descriptor: {
    id: "directory.federation.descriptor",
    defaultMessage: "This Mint’s federation descriptor",
    description: "Federation public identity",
  },
  network: { id: "directory.federation.network", defaultMessage: "Network: {network}", description: "Federation test network" },
  key: { id: "directory.federation.key", defaultMessage: "Federation public key: {key}", description: "Mint public federation key only" },
  digest: {
    id: "directory.federation.digest",
    defaultMessage: "Descriptor: {schema} · digest {digest}",
    description: "Public descriptor provenance",
  },
  relays: { id: "directory.federation.relays", defaultMessage: "Configured relays: {relays}", description: "Descriptor relay addresses" },
  operations: {
    id: "directory.federation.operations",
    defaultMessage: "Operations: {operations}",
    description: "Descriptor supported operations",
  },
  peers: { id: "directory.federation.peers", defaultMessage: "Followed Mints", description: "Pinned federation peers" },
  noPeers: { id: "directory.federation.noPeers", defaultMessage: "No followed Mints configured.", description: "Empty pinned peer set" },
  inbox: {
    id: "directory.federation.inbox",
    defaultMessage: "Inbox relay health",
    description: "Bilateral evidence inbox transport health",
  },
  directory: {
    id: "directory.federation.directory",
    defaultMessage: "Directory relay and sync health",
    description: "Observed public directory replication health",
  },
  missingDirectory: {
    id: "directory.federation.missingDirectory",
    defaultMessage: "Directory health not yet reported for configured relays: {relays}",
    description: "Unreported directory relay health is unknown",
  },
  missingInbox: {
    id: "directory.federation.missingInbox",
    defaultMessage: "Inbox health not yet reported for configured relays: {relays}",
    description: "Unreported relay health is unknown",
  },
  loading: { id: "directory.federation.loading", defaultMessage: "Loading federation status…", description: "Federation request pending" },
  error: {
    id: "directory.federation.error",
    defaultMessage: "Federation status unavailable or invalid. No healthy state is implied.",
    description: "Federation request error",
  },
  refresh: {
    id: "directory.federation.refresh",
    defaultMessage: "Refresh federation status",
    description: "Retry federation status through operator BFF",
  },
});

export function FederationStatusDetails({ status }: { status: FederationStatus }) {
  const intl = useIntl();
  const d = status.descriptor;
  const configured = [...new Set([...d.relays, ...status.peers.flatMap((peer) => peer.relays)])];
  const missingInbox = configured.filter((relay) => !status.inbox.some((entry) => entry.relay === relay));
  const missingDirectory = configured.filter((relay) => !status.relays.relays.some((entry) => entry.relay === relay));
  return (
    <div className="space-y-4">
      <div className="space-y-1 break-all text-xs">
        <h3 className="text-sm font-semibold">{intl.formatMessage(m.descriptor)}</h3>
        <p>{intl.formatMessage(m.network, { network: d.network })}</p>
        <p>{intl.formatMessage(m.key, { key: d.pubkey })}</p>
        <p>{intl.formatMessage(m.digest, { schema: d.schema, digest: status.descriptorDigest })}</p>
        <p>{intl.formatMessage(m.relays, { relays: d.relays.join(" · ") })}</p>
        <p>{intl.formatMessage(m.operations, { operations: d.operations.join(" · ") })}</p>
      </div>
      <div className="space-y-2">
        <h3 className="text-sm font-semibold">{intl.formatMessage(m.peers)}</h3>
        {status.peers.length ? (
          <ul className="space-y-2 break-all text-xs">
            {status.peers.map((peer) => (
              <li key={peer.pubkey}>
                {peer.label} · {peer.pubkey}
                <p>{intl.formatMessage(m.relays, { relays: peer.relays.join(" · ") })}</p>
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-xs">{intl.formatMessage(m.noPeers)}</p>
        )}
      </div>
      <div className="space-y-2">
        <h3 className="text-sm font-semibold">{intl.formatMessage(m.inbox)}</h3>
        <RelayCoverageList coverage={status.inbox} />
        {missingInbox.length > 0 && (
          <p className="break-all text-xs text-signal-alert">{intl.formatMessage(m.missingInbox, { relays: missingInbox.join(" · ") })}</p>
        )}
      </div>
      <div className="space-y-2">
        <h3 className="text-sm font-semibold">{intl.formatMessage(m.directory)}</h3>
        <DirectoryCoveragePanel coverage={status.relays} sync={status.directory} />
        {missingDirectory.length > 0 && (
          <p className="break-all text-xs text-signal-alert">
            {intl.formatMessage(m.missingDirectory, { relays: missingDirectory.join(" · ") })}
          </p>
        )}
      </div>
    </div>
  );
}

export function FederationStatusPanel() {
  const intl = useIntl();
  const query = useFederationStatus();
  return (
    <section aria-label={intl.formatMessage(m.heading)} className="space-y-3 rounded-md border p-4">
      <h2 className="text-lg font-semibold">{intl.formatMessage(m.heading)}</h2>
      <p className="text-sm text-muted-foreground">{intl.formatMessage(m.scope)}</p>
      {query.error ? (
        <p role="alert" className="text-sm text-signal-alert">
          {intl.formatMessage(m.error)}
        </p>
      ) : query.data ? (
        <FederationStatusDetails status={query.data} />
      ) : (
        <p role="status" className="text-sm">
          {intl.formatMessage(m.loading)}
        </p>
      )}
      <Button size="sm" variant="outline" disabled={query.isFetching} onClick={() => void query.refetch()}>
        {intl.formatMessage(m.refresh)}
      </Button>
    </section>
  );
}
