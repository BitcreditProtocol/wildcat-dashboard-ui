import { useMintSummary } from "@/pages/home/operator-api";
import { useIntl } from "react-intl";
import { Card, CardContent } from "@bitcredit/ui-library";
import { Link } from "react-router";
import { BoundaryNotice } from "@/components/operator/BoundaryNotice";
import { ClowderPeersCard } from "@/pages/home/components/clowder-peers/ClowderPeersCard";
import { PendingOutagesCard } from "@/pages/home/components/PendingOutagesCard";
import { FederationStatusPanel } from "@/pages/directory/FederationStatusPanel";
import { useFederationDisplay } from "./use-federation-display";
import { FederationHealth } from "./FederationHealth";
import { networkMessages as m, networkPlain as n } from "./network-copy";

export default function NetworkPage() {
  const intl = useIntl();
  const query = useFederationDisplay();
  const summary = useMintSummary();
  const status = query.observation;
  const nodes = status
    ? [
        { id: status.descriptor.pubkey, label: intl.formatMessage(m.own), relays: status.descriptor.relays },
        ...status.peers.map((peer) => ({ id: peer.pubkey, label: peer.label, relays: peer.relays })),
      ]
    : [];
  const health = (relay: string) => {
    const inbox = status?.inbox.find((r) => r.relay === relay);
    const directory = status?.relays.relays.find((r) => r.relay === relay)?.coverage;
    return Boolean(
      inbox?.reachable &&
        inbox.eose &&
        !inbox.capped &&
        !inbox.error &&
        directory?.reachable &&
        directory.eose &&
        !directory.capped &&
        !directory.error
    );
  };
  const connected = (node: { relays: string[] }) => node.relays.length > 0 && node.relays.every(health);
  const quoteName = (quoteId: string) => summary.data?.portfolio.quotes.find((q) => q.quoteId === quoteId);
  // A bill and its invoice are locked together; show the case once, current portfolio first.
  const locks = (summary.data?.financeLocks ?? [])
    .filter((lock, i, all) => all.findIndex((other) => other.quoteId === lock.quoteId) === i)
    .sort((a, b) => Number(Boolean(quoteName(b.quoteId))) - Number(Boolean(quoteName(a.quoteId))));
  return (
    <div className="network-cockpit space-y-4">
      <header className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold">{intl.formatMessage(m.title)}</h1>
          <p className="mt-1 text-sm text-muted-foreground">{intl.formatMessage(n.subtitle)}</p>
        </div>
        <FederationHealth />
      </header>
      <div className="network-cockpit-grid">
        {status && (
          <Card>
            <CardContent className="p-5">
              <h2 className="font-medium">{intl.formatMessage(n.mints)}</h2>
              <ul className="mt-3 divide-y divide-border">
                {nodes.map((node) => {
                  const ok = query.phase !== "checking" && connected(node);
                  return (
                    <li key={node.id} className="flex items-center gap-3 py-3">
                      <span className={`status-dot ${ok ? "" : "status-warning"}`} />
                      <span className="min-w-0 flex-1">
                        <span className="block text-sm font-medium" title={intl.formatMessage(n.via, { relays: node.relays.join(", ") })}>
                          {node.label}
                        </span>
                      </span>
                      <span className={`text-xs ${ok ? "check-pass" : "text-amber-600 dark:text-amber-300"}`}>
                        {intl.formatMessage(query.phase === "checking" ? m.checking : ok ? n.connected : n.unreachable)}
                      </span>
                    </li>
                  );
                })}
              </ul>
            </CardContent>
          </Card>
        )}
        <Card>
          <CardContent className="p-5">
            <h2 className="font-medium">{intl.formatMessage(n.locks)}</h2>
            <p className="mt-1 text-xs text-muted-foreground">{intl.formatMessage(n.locksWhy)}</p>
            {!summary.error && summary.data?.financeLocks?.length === 0 && (
              <p className="mt-3 text-sm text-muted-foreground">{intl.formatMessage(m.noActiveLocks)}</p>
            )}
            {!summary.error && summary.data?.financeLocks ? (
              <ul className="mt-3 divide-y divide-border">
                {locks.slice(0, 10).map((lock, i) => {
                  const quote = quoteName(lock.quoteId);
                  return (
                    <li key={`${lock.quoteId}:${lock.scope}:${i}`} className="flex items-center gap-3 py-2.5 text-sm">
                      <Link to={`/quotes/${encodeURIComponent(lock.quoteId)}`} className="min-w-0 flex-1 truncate hover:underline">
                        {quote
                          ? `${quote.drawer.name} → ${quote.drawee.name}`
                          : intl.formatMessage(n.earlier, { id: lock.quoteId.slice(0, 8) })}
                      </Link>
                      <span className="text-xs text-muted-foreground">
                        {intl.formatMessage(lock.delivered ? n.shared : m.pending)} ·{" "}
                        {intl.formatMessage(m.expires, {
                          time: intl.formatDate(lock.expiresAt * 1000, { dateStyle: "medium" }),
                        })}
                      </span>
                      <span className="hero-chip">{intl.formatMessage(lock.state === "financed" ? m.financed : m.reserved)}</span>
                    </li>
                  );
                })}
              </ul>
            ) : (
              <p className="mt-3 text-sm text-muted-foreground">{intl.formatMessage(m.noLocks)}</p>
            )}
            {locks.length > 10 && (
              <p className="mt-2 text-xs text-muted-foreground">{intl.formatMessage(n.more, { count: locks.length - 10 })}</p>
            )}
          </CardContent>
        </Card>
      </div>
      <BoundaryNotice summary={intl.formatMessage(m.scope)}>{intl.formatMessage(m.why)}</BoundaryNotice>
      <details className="rounded-xl border border-border p-4">
        <summary className="cursor-pointer text-sm font-medium">{intl.formatMessage(m.diagnostics)}</summary>
        <div className="mt-4 space-y-4">
          <FederationStatusPanel />
          <PendingOutagesCard />
          <ClowderPeersCard />
        </div>
      </details>
    </div>
  );
}
