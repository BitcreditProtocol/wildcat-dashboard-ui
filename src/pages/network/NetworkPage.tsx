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
import { networkMessages as m } from "./network-copy";

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
  const relays = [...new Set(nodes.flatMap((node) => node.relays))];
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
  const height = Math.max(240, Math.max(nodes.length, relays.length) * 95 + 70);
  return (
    <div className="network-cockpit space-y-4">
      <header className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-2xl font-semibold">{intl.formatMessage(m.title)}</h1>
        <FederationHealth />
      </header>
      <BoundaryNotice summary={intl.formatMessage(m.scope)}>{intl.formatMessage(m.why)}</BoundaryNotice>
      <div className="network-cockpit-grid">
        {status && (
          <Card>
            <CardContent className="p-5">
              <div className="flex justify-between text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                <span>{intl.formatMessage(m.followed)}</span>
                <span>{intl.formatMessage(m.relays)}</span>
              </div>
              <svg
                viewBox={`0 0 760 ${height}`}
                role="img"
                aria-label={intl.formatMessage(m.diagram)}
                className="mt-3 max-h-[32rem] w-full"
              >
                {nodes.flatMap((node, i) =>
                  node.relays.map((relay) => {
                    const j = relays.indexOf(relay);
                    return (
                      <path
                        key={`${node.id}:${relay}`}
                        d={`M 280 ${48 + i * 95} C 385 ${48 + i * 95}, 385 ${48 + j * 95}, 480 ${48 + j * 95}`}
                        fill="none"
                        strokeWidth="2"
                        strokeDasharray={health(relay) ? undefined : "6 5"}
                        className={health(relay) ? "stroke-sky-700 dark:stroke-sky-400" : "stroke-amber-600 dark:stroke-amber-400"}
                      />
                    );
                  })
                )}
                {nodes.map((node, i) => (
                  <g key={node.id}>
                    <rect x="0" y={15 + i * 95} width="280" height="67" rx="9" className="fill-card stroke-border" />
                    <circle cx="22" cy={48 + i * 95} r="6" className="fill-sky-700 dark:fill-sky-400" />
                    <text x="40" y={43 + i * 95} className="fill-foreground text-[13px] font-medium">
                      {node.label.length > 30 ? `${node.label.slice(0, 29)}…` : node.label}
                    </text>
                    <text x="40" y={64 + i * 95} className="fill-muted-foreground text-[11px]">
                      {node.id.slice(0, 14)}… · {status.descriptor.network}
                    </text>
                  </g>
                ))}
                {relays.map((relay, i) => (
                  <g key={relay}>
                    <rect x="480" y={15 + i * 95} width="280" height="67" rx="9" className="fill-card stroke-border" />
                    <text x="497" y={43 + i * 95} className="fill-foreground text-[11px]">
                      {relay.length > 35 ? `${relay.slice(0, 34)}…` : relay}
                    </text>
                    <text
                      x="497"
                      y={64 + i * 95}
                      className={
                        health(relay) ? "fill-sky-700 dark:fill-sky-400 text-[11px]" : "fill-amber-700 dark:fill-amber-300 text-[11px]"
                      }
                    >
                      {intl.formatMessage(query.phase === "checking" ? m.checking : health(relay) ? m.responding : m.unreachable)}
                    </text>
                  </g>
                ))}
              </svg>
              <ul className="sr-only">
                {nodes.map((node) => (
                  <li key={node.id}>
                    {node.label}: {node.relays.join(", ")}
                  </li>
                ))}
                {relays.map((relay) => (
                  <li key={relay}>
                    {relay}: {intl.formatMessage(query.phase === "checking" ? m.checking : health(relay) ? m.responding : m.unreachable)}
                  </li>
                ))}
              </ul>
            </CardContent>
          </Card>
        )}
        <Card>
          <CardContent className="p-5">
            <h2 className="font-medium">{intl.formatMessage(m.locks)}</h2>
            {!summary.error && summary.data?.financeLocks?.length === 0 && (
              <p className="mt-2 text-sm text-muted-foreground">{intl.formatMessage(m.noActiveLocks)}</p>
            )}
            {!summary.error && summary.data?.financeLocks ? (
              <ul className="mt-3 grid gap-3 sm:grid-cols-2">
                {summary.data.financeLocks.map((lock, i) => (
                  <li key={`${lock.quoteId}:${lock.scope}:${i}`} className="rounded-lg border border-border p-3">
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-xs font-medium">{intl.formatMessage(lock.scope === "bill" ? m.bill : m.invoice)}</span>
                      <span className="rounded-full bg-sky-500/10 px-2 py-1 text-[11px] text-sky-800 dark:text-sky-300">
                        {intl.formatMessage(lock.state === "financed" ? m.financed : m.reserved)}
                      </span>
                    </div>
                    <Link
                      to={`/quotes/${encodeURIComponent(lock.quoteId)}`}
                      className="mt-2 block break-all text-xs text-primary underline"
                    >
                      {lock.quoteId}
                    </Link>
                    <p className="mt-1 text-[11px] text-muted-foreground">
                      {intl.formatMessage(m.expires, {
                        time: intl.formatDate(lock.expiresAt * 1000, { dateStyle: "medium", timeStyle: "short" }),
                      })}{" "}
                      · {intl.formatMessage(lock.delivered ? m.delivered : m.pending)}
                    </p>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="mt-2 text-sm text-muted-foreground">{intl.formatMessage(m.noLocks)}</p>
            )}
            <Link to="/quotes" className="mt-3 inline-block text-sm text-primary underline">
              {intl.formatMessage({ id: "nav.quotes", defaultMessage: "Quotes", description: "Operator dashboard nav: quotes" })}
            </Link>
          </CardContent>
        </Card>
      </div>
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
