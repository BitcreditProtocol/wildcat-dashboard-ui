import { useIntl } from "react-intl";
import { useMintSummary } from "@/pages/home/operator-api";
import { cockpit as m } from "@/components/operator/cockpit-messages";
import { briefMessages } from "./decision-brief-copy";
export function BuyerExposure({ buyerRef, quoteId, amount }: { buyerRef: string; quoteId: string; amount: number }) {
  const intl = useIntl();
  const summary = useMintSummary();
  const book = summary.error ? undefined : summary.data;
  const buyer = book?.portfolio.counterparties.find((p) => p.role === "drawee" && p.ref === buyerRef);
  const quote = book?.portfolio.quotes.find((q) => q.quoteId === quoteId);
  const current = buyer ? BigInt(buyer.usedSat) : undefined;
  const before = current === undefined ? undefined : current - (quote?.exposure ? BigInt(quote.amountSat) : 0n);
  const after = before === undefined ? undefined : before + BigInt(amount);
  const cap = buyer?.capSat ? BigInt(buyer.capSat) : undefined;
  return (
    <section className="buyer-exposure">
      <div className="mb-3 flex items-center justify-between gap-2">
        <h3 className="text-xs font-medium">{intl.formatMessage(m.exposure)}</h3>
        <span className="text-[10px] text-muted-foreground">
          {cap ? intl.formatMessage(m.cap, { amount: intl.formatNumber(cap) }) : intl.formatMessage(briefMessages.unknown)}
        </span>
      </div>
      {[
        { label: m.before, value: before },
        { label: m.after, value: after },
      ].map((row) => (
        <div key={row.label.id} className="mb-2">
          <div className="mb-1 flex justify-between gap-2 text-[11px]">
            <span className="text-muted-foreground">{intl.formatMessage(row.label)}</span>
            <strong className="tabular-nums">{row.value === undefined ? "—" : `${intl.formatNumber(row.value)} sat`}</strong>
          </div>
          <div className="h-2 rounded-full bg-muted" aria-hidden="true">
            <div
              className={`h-full rounded-full ${row.value !== undefined && cap && row.value > cap ? "bg-amber-500" : "bg-sky-500"}`}
              style={{ width: `${row.value !== undefined && cap ? Math.min(100, Number((row.value * 10000n) / cap) / 100) : 0}%` }}
            />
          </div>
        </div>
      ))}
      {book && !book.coverage.complete && (
        <p className="text-[10px] text-amber-700 dark:text-amber-300">
          {intl.formatMessage({
            id: "agentic.partialExposure",
            defaultMessage: "Partial coverage · lower bound",
            description: "Exposure read is incomplete",
          })}
        </p>
      )}
    </section>
  );
}
