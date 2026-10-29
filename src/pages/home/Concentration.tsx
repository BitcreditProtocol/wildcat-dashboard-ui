import { useIntl } from "react-intl";
import { Link } from "react-router";
import type { MintSummary } from "./operator-api";
import { cockpit as m } from "@/components/operator/cockpit-messages";
/** Committed face-value share, never a risk score; identity ref is the only grouping key. */
export function Concentration({ summary }: { summary: MintSummary }) {
  const intl = useIntl();
  const buyers = summary.portfolio.counterparties.filter((p) => p.role === "drawee");
  const total = buyers.reduce((n, p) => n + BigInt(p.usedSat), 0n);
  return (
    <figure className="concentration" aria-label={intl.formatMessage(m.concentration)}>
      <figcaption className="text-sm font-medium">{intl.formatMessage(m.concentration)}</figcaption>
      <div className="my-3 flex h-5 overflow-hidden rounded-md bg-muted">
        {buyers.map((p, i) => (
          <div
            key={p.ref}
            className={`portfolio-segment segment-${i % 5}`}
            title={`${p.name} · ${intl.formatNumber(BigInt(p.usedSat))} sat`}
            style={{ width: `${total ? Number((BigInt(p.usedSat) * 10000n) / total) / 100 : 0}%` }}
          />
        ))}
      </div>
      <div className="space-y-1.5">
        {buyers.map((p, i) => (
          <Link key={p.ref} to={`/directory?q=${encodeURIComponent(p.ref)}`} className="flex items-center gap-2 text-[11px]">
            <span className={`size-2 rounded-full portfolio-segment segment-${i % 5}`} />
            <span className="truncate">{p.name}</span>
            <strong className="ml-auto tabular-nums">
              {intl.formatNumber(total ? Number((BigInt(p.usedSat) * 10000n) / total) / 10000 : 0, {
                style: "percent",
                maximumFractionDigits: 1,
              })}
            </strong>
          </Link>
        ))}
      </div>
    </figure>
  );
}
