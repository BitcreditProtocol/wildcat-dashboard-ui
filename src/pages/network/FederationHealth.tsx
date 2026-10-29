import { networkMessages } from "./network-copy";
import { Link } from "react-router";
import { Activity, TriangleAlert } from "lucide-react";
import { useIntl } from "react-intl";
import { useFederationDisplay } from "./use-federation-display";
export function FederationHealth() {
  const q = useFederationDisplay();
  const intl = useIntl();
  const good = q.phase !== "degraded";
  return (
    <Link
      to="/network"
      className={`inline-flex items-center gap-2 rounded-full border px-3 py-1.5 text-xs font-medium ${good ? "border-border text-muted-foreground" : "border-amber-500/40 bg-amber-500/10 text-amber-800 dark:text-amber-300"}`}
    >
      {good ? <Activity className="size-3.5" /> : <TriangleAlert className="size-3.5" />}
      {intl.formatMessage(
        q.phase === "checking"
          ? networkMessages.checking
          : q.phase === "healthy"
            ? networkMessages.healthy
            : q.phase === "unknown"
              ? networkMessages.unknown
              : networkMessages.degraded
      )}
      {q.phase !== "healthy" && (
        <span>
          {intl.formatMessage(q.lastGoodAt ? networkMessages.lastGood : networkMessages.noLastGood, {
            time: q.lastGoodAt ? intl.formatTime(q.lastGoodAt) : "",
          })}
        </span>
      )}
    </Link>
  );
}
