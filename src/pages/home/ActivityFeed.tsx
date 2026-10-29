import { BadgeCheck, Building2, MessageCircle, Network, ShieldCheck, Sparkles, UserRound } from "lucide-react";
import { Link } from "react-router";
import { useIntl } from "react-intl";
import type { ActivityItem } from "./operator-api";
import { activityMessages as a, homeMessages as m } from "./home-copy";
import { useAge } from "./use-age";

const actorIcon = {
  applicant: UserRound,
  agent: Sparkles,
  policy: ShieldCheck,
  operator: BadgeCheck,
  buyer: Building2,
  other_mint: Network,
} as const;

/** Recent recorded events across the Mint's cases. Every row is a server record, never a client guess. */
export function ActivityFeed({ activity }: { activity: ActivityItem[] | null }) {
  const intl = useIntl();
  const age = useAge();
  if (activity === null) return <p className="text-sm text-muted-foreground">{intl.formatMessage(m.activityUnavailable)}</p>;
  if (!activity.length) return <p className="text-sm text-muted-foreground">{intl.formatMessage(m.activityEmpty)}</p>;
  // Repeated records of the same step on the same case (e.g. re-assessments) read as one line with a count.
  const rows = activity.reduce<(ActivityItem & { repeats: number })[]>((list, item) => {
    const last = list[list.length - 1];
    if (last?.kind === item.kind && last.quoteId !== null && last.quoteId === item.quoteId) last.repeats += 1;
    else list.push({ ...item, repeats: 1 });
    return list;
  }, []);
  return (
    <ol className="activity-feed">
      {rows.map((item, index) => {
        const Icon = item.kind.startsWith("help_") ? MessageCircle : actorIcon[item.actor];
        const text = intl.formatMessage(a[item.kind], {
          applicant: item.applicant ?? intl.formatMessage(a.someone),
          buyer: item.buyer ?? intl.formatMessage(a.theBuyer),
        });
        const body = (
          <>
            <span className={`activity-icon actor-${item.actor}`}>
              <Icon className="size-3.5" aria-hidden="true" />
            </span>
            <span className="min-w-0 flex-1">
              <span className="block truncate" title={text}>
                {text}
                {item.repeats > 1 && <span className="ml-1 text-muted-foreground">×{item.repeats}</span>}
              </span>
              {item.amountSat && (
                <span className="text-[11px] text-muted-foreground tabular-nums">{intl.formatNumber(BigInt(item.amountSat))} sat</span>
              )}
            </span>
            <time
              className="shrink-0 text-[11px] text-muted-foreground tabular-nums"
              dateTime={item.at}
              title={intl.formatDate(item.at, { dateStyle: "medium", timeStyle: "short" })}
            >
              {age(item.at)}
            </time>
          </>
        );
        return (
          <li key={`${item.at}-${item.kind}-${item.quoteId ?? index}`}>
            {item.quoteId ? (
              <Link className="activity-row" to={`/quotes/${encodeURIComponent(item.quoteId)}`}>
                {body}
              </Link>
            ) : (
              <div className="activity-row">{body}</div>
            )}
          </li>
        );
      })}
    </ol>
  );
}
