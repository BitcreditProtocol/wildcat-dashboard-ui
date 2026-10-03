import { Button, Skeleton } from "@bitcredit/ui-library";
import { AlertTriangle } from "lucide-react";
import { useId } from "react";
import { defineMessages, useIntl } from "react-intl";
import { Link } from "react-router";
import { Currency } from "@/components/Currency";
import { usePartyQuotes, type PartyQuotesState } from "@/hooks/use-party-quotes";
import type { LightInfo } from "@/generated/client/types.gen";
import { getQuoteStatusMessage } from "@/i18n/descriptors";
import { truncateString } from "@/utils/strings";
import { COMMITTED_STATUSES, partyListPath, type PartyQuoteBucket, type QuoteParty, type QuotePartyRole } from "../quote-parties";

/**
 * What the Mint already has open with one applicant or one payer, read from the Mint's own quote
 * filters and eBills. Face values by the Mint's stored quote status: an accepted quote is not issued
 * value, and a missing payment confirmation is not a default.
 */

const messages = defineMessages({
  title: {
    id: "quotes.party.title",
    defaultMessage: "Across this Mint",
    description: "Heading of the card comparing this case with the applicant's and payer's other open bills",
  },
  scope: {
    id: "quotes.party.scope",
    defaultMessage: "Bills not yet due, by Mint quote status, at face value",
    description: "Which quotes the applicant and payer figures cover",
  },
  applicant: { id: "quotes.party.applicant", defaultMessage: "Applicant", description: "The bill's current holder, who asked to mint" },
  payer: { id: "quotes.party.payer", defaultMessage: "Payer", description: "The drawee, who pays the bill at maturity" },
  allApplicant: {
    id: "quotes.party.allApplicant",
    defaultMessage: "All cases",
    description: "Link to the quote list filtered to this applicant",
  },
  allPayer: {
    id: "quotes.party.allPayer",
    defaultMessage: "All bills on this payer",
    description: "Link to the quote list filtered to bills this party pays",
  },
  caption: {
    id: "quotes.party.caption",
    defaultMessage: "{party}: open bills by stage, with count and face value",
    description: "Accessible table caption for one party's open bills",
  },
  stage: { id: "quotes.party.stage", defaultMessage: "Stage", description: "Column: quote stage" },
  bills: { id: "quotes.party.bills", defaultMessage: "Bills", description: "Column: number of bills" },
  faceValue: { id: "quotes.party.faceValue", defaultMessage: "Face value", description: "Column: summed bill amounts" },
  includesThis: {
    id: "quotes.party.includesThis",
    defaultMessage: "incl. this",
    description: "The row counts the case on screen",
  },
  committed: {
    id: "quotes.party.committed",
    defaultMessage: "Offered or accepted",
    description: "Sum of the offered, accepted and minting-enabled rows above it; face value, not issued value",
  },
  withThisBill: {
    id: "quotes.party.withThisBill",
    defaultMessage: "{amount} if this bill is offered too",
    description: "Offered-or-accepted total including the bill on screen",
  },
  overdue: {
    id: "quotes.party.overdueLine",
    defaultMessage: "{count, plural, one {# bill} other {# bills}} past maturity without a confirmed payment · {amount}",
    description: "Bills the Mint holds that matured without a confirmed payment; may lag the chain, not a default",
  },
  deniedOther: {
    id: "quotes.party.deniedOther",
    defaultMessage: "Denied quotes on other bills: {count} (any reason)",
    description: "The applicant's denied quotes for other bills over all time, including closures without an adverse finding",
  },
  denied: {
    id: "quotes.party.denied",
    defaultMessage: "Denied quotes: {count} (any reason)",
    description: "The applicant's denied quotes over all time, including closures without an adverse finding",
  },
  incomplete: {
    id: "quotes.party.incomplete",
    defaultMessage: "More bills than one read returns; figures are a lower bound.",
    description: "The Mint holds more open bills for this party than were read",
  },
  unavailable: {
    id: "quotes.party.unavailable",
    defaultMessage: "Couldn't load this party's other bills.",
    description: "The party filter request failed",
  },
  clear: {
    id: "quotes.party.clear",
    defaultMessage: "Remove filter",
    description: "Clear the applicant or payer filter on the quote list, keeping the status page",
  },
});

function Sat({ value }: { value: number }) {
  return <Currency value={value} sourceCurrency="sat" className="inline" amountClassName="text-current" />;
}

function PartyFigures({
  state,
  partyName,
  thisBill,
}: {
  state: PartyQuotesState;
  partyName: string;
  /** The quote on screen; the projection applies only while it waits for a decision. */
  thisBill?: { faceValueSat: number };
}) {
  const intl = useIntl();
  if (state.isLoading) return <Skeleton className="h-24 rounded-md" />;
  if (state.error !== null || state.summary === undefined) {
    return <p className="text-xs text-muted-foreground">{intl.formatMessage(messages.unavailable)}</p>;
  }
  const { buckets, committed, currentBucket } = state.summary;
  const marked = thisBill !== undefined ? currentBucket : undefined;
  const row = (bucket: PartyQuoteBucket) => {
    const { count, faceValueSat } = buckets[bucket];
    return (
      <tr key={bucket} className={count === 0 ? "text-muted-foreground" : undefined}>
        <th scope="row" className="py-0.5 pr-2 text-left font-normal">
          {intl.formatMessage(getQuoteStatusMessage(bucket))}
          {marked === bucket && <span className="ml-1 text-xs text-muted-foreground">({intl.formatMessage(messages.includesThis)})</span>}
        </th>
        <td className="w-8 py-0.5 pr-3 text-right tabular-nums">{count}</td>
        <td className="py-0.5 text-right whitespace-nowrap tabular-nums">{count === 0 ? "–" : <Sat value={faceValueSat} />}</td>
      </tr>
    );
  };
  const overdue = state.overdue;
  return (
    <div className="space-y-2">
      <table className="w-full text-sm">
        <caption className="sr-only">{intl.formatMessage(messages.caption, { party: partyName })}</caption>
        <thead className="sr-only">
          <tr>
            <th scope="col">{intl.formatMessage(messages.stage)}</th>
            <th scope="col">{intl.formatMessage(messages.bills)}</th>
            <th scope="col">{intl.formatMessage(messages.faceValue)}</th>
          </tr>
        </thead>
        <tbody>{COMMITTED_STATUSES.map(row)}</tbody>
        {/* The subtotal is the sum of the rows directly above it, so it reads as arithmetic. */}
        <tbody className="border-t border-border">
          <tr className="font-medium">
            <th scope="row" className="pt-1.5 pr-2 pb-0.5 text-left">
              {intl.formatMessage(messages.committed)}
            </th>
            <td className="pt-1.5 pr-3 pb-0.5 text-right tabular-nums">{committed.count}</td>
            <td className="pt-1.5 pb-0.5 text-right whitespace-nowrap tabular-nums">
              <Sat value={committed.faceValueSat} />
            </td>
          </tr>
          {thisBill !== undefined && currentBucket === "Pending" && (
            <tr>
              <td colSpan={3} className="pb-1 text-right text-xs text-muted-foreground tabular-nums">
                {intl.formatMessage(messages.withThisBill, {
                  amount: <Sat key="sum" value={committed.faceValueSat + thisBill.faceValueSat} />,
                })}
              </td>
            </tr>
          )}
          {row("Pending")}
        </tbody>
      </table>
      {overdue !== undefined && overdue.count > 0 && (
        <p className="flex items-start gap-1.5 text-xs text-signal-alert">
          <AlertTriangle className="mt-px size-3.5 shrink-0" aria-hidden="true" />
          <span>
            {intl.formatMessage(messages.overdue, {
              count: overdue.count,
              amount: <Sat key="overdue" value={overdue.faceValueSat} />,
            })}
          </span>
        </p>
      )}
      {!state.isComplete && <p className="text-xs text-muted-foreground">{intl.formatMessage(messages.incomplete)}</p>}
    </div>
  );
}

function DeniedLine({ count, other }: { count: number | undefined; other: boolean }) {
  const intl = useIntl();
  if (count === undefined || count <= 0) return null;
  return <p className="text-xs text-muted-foreground">{intl.formatMessage(other ? messages.deniedOther : messages.denied, { count })}</p>;
}

interface CardQuote {
  id: string;
  /** The Mint's stored status, as the party figures use; not the dashboard's derived status. */
  status: LightInfo["status"];
  billId: string;
  faceValueSat: number;
}

function PartySection({ role, party, quote }: { role: QuotePartyRole; party: QuoteParty; quote: CardQuote }) {
  const intl = useIntl();
  const current: LightInfo = { id: quote.id, status: quote.status, sum: quote.faceValueSat };
  const state = usePartyQuotes(role, party.nodeId, { current, billId: quote.billId });
  const headingId = useId();
  return (
    <section aria-labelledby={headingId} className="space-y-2 px-5 py-4">
      <div className="flex items-baseline justify-between gap-3">
        <h3 id={headingId} className="min-w-0 text-sm">
          <span className="block text-xs text-muted-foreground">{intl.formatMessage(messages[role])}</span>
          <span className="block truncate font-semibold" title={party.name}>
            {party.name}
          </span>
        </h3>
        <Link
          to={partyListPath(role, party.nodeId)}
          className="shrink-0 text-xs underline-offset-4 hover:underline focus-visible:outline focus-visible:outline-2"
        >
          {intl.formatMessage(role === "applicant" ? messages.allApplicant : messages.allPayer)}
        </Link>
      </div>
      <PartyFigures state={state} partyName={party.name} thisBill={{ faceValueSat: quote.faceValueSat }} />
      <DeniedLine count={state.deniedOtherBills} other />
    </section>
  );
}

/** Quote page: the applicant's and the payer's open bills beside the decision. */
export function PartyExposureCard({ applicant, payer, quote }: { applicant: QuoteParty | null; payer: QuoteParty; quote: CardQuote }) {
  const intl = useIntl();
  const titleId = useId();
  return (
    <aside aria-labelledby={titleId} className="@container overflow-hidden rounded-lg border border-border bg-card print:hidden">
      <header className="border-b border-border bg-elevation-100 px-5 py-3">
        <h2 id={titleId} className="text-xs font-semibold tracking-wide text-muted-foreground uppercase">
          {intl.formatMessage(messages.title)}
        </h2>
        <p className="mt-0.5 text-xs text-muted-foreground">{intl.formatMessage(messages.scope)}</p>
      </header>
      {/* Side by side where the card is wide, so applicant and payer read as one comparison. */}
      <div className="grid divide-y divide-border @2xl:grid-cols-2 @2xl:divide-x @2xl:divide-y-0">
        {applicant !== null && <PartySection role="applicant" party={applicant} quote={quote} />}
        {/* Always shown: the drawee filter covers bills other holders brought, even when the applicant drew on itself. */}
        <PartySection role="payer" party={payer} quote={quote} />
      </div>
    </aside>
  );
}

/** Quote list filtered to one party: who it is and what is open with them, above their cases. */
export function PartyExposureBand({
  role,
  nodeId,
  name,
  clearTo,
}: {
  role: QuotePartyRole;
  nodeId: string;
  name: string | undefined;
  clearTo: string;
}) {
  const intl = useIntl();
  const state = usePartyQuotes(role, nodeId);
  const headingId = useId();
  const label = name ?? truncateString(nodeId, 20);
  return (
    <section aria-labelledby={headingId} className="rounded-lg border border-border bg-card px-5 py-4">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div className="min-w-0 space-y-1">
          <h2 id={headingId}>
            <span className="block text-xs text-muted-foreground">{intl.formatMessage(messages[role])}</span>
            <span className="block truncate text-lg font-semibold" title={name ?? nodeId}>
              {label}
            </span>
          </h2>
          <p className="text-xs text-muted-foreground">{intl.formatMessage(messages.scope)}</p>
          <DeniedLine count={state.deniedOtherBills} other={false} />
        </div>
        <div className="w-full lg:max-w-sm">
          <PartyFigures state={state} partyName={label} />
        </div>
        <Button variant="outline" size="sm" asChild className="self-start">
          <Link to={clearTo}>{intl.formatMessage(messages.clear)}</Link>
        </Button>
      </div>
    </section>
  );
}
