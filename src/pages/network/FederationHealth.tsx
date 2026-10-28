import { federationHealthy, networkMessages } from "./network-copy";
import { Link } from "react-router";
import { Activity, TriangleAlert } from "lucide-react";
import { useIntl } from "react-intl";
import { useFederationStatus } from "@/pages/directory/federation-status";
export function FederationHealth() {
  const q = useFederationStatus();
  const intl = useIntl();
  const good = q.data && !q.error && federationHealthy(q.data);
  return (
    <Link
      to="/network"
      className={`inline-flex items-center gap-2 rounded-full border px-3 py-1.5 text-xs font-medium ${good ? "border-border text-muted-foreground" : "border-amber-500/40 bg-amber-500/10 text-amber-800 dark:text-amber-300"}`}
    >
      {good ? <Activity className="size-3.5" /> : <TriangleAlert className="size-3.5" />}
      {intl.formatMessage(good ? networkMessages.healthy : q.data && !q.error ? networkMessages.degraded : networkMessages.unknown)}
    </Link>
  );
}
