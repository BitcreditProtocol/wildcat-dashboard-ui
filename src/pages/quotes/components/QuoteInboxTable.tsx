import { cn } from "@bitcredit/ui-library";
import { ArrowDown, ArrowUp } from "lucide-react";
import { useLayoutEffect, useRef, useState, type MouseEvent, type RefObject } from "react";
import { defineMessages, FormattedDate, useIntl, type MessageDescriptor } from "react-intl";
import { Link, useLocation, useNavigate } from "react-router";
import { Badge } from "@/components/ui/badge";
import { Currency } from "@/components/Currency";
import { HighlightText } from "@/components/ui/highlight-text";
import type { InfoReply, LightInfo } from "@/generated/client/types.gen";
import { useIsMobile } from "@/hooks/use-mobile";
import type { SortBy } from "@/hooks/use-quote-list";
import { getQuoteStatusMessage } from "@/i18n/descriptors";
import { CreditAssessmentBadge } from "@/pages/credit/CreditAssessmentBadge";
import { humanReadableDuration, humanReadableDurationDays } from "@/utils/dates";
import { getQuoteStatusVariant } from "@/utils/quote-status";
import { billApplicant, billPayer, billPreviousHolder, groupByApplicant, partyListPath, type QuoteParty } from "../quote-parties";

/**
 * The quote inbox: one dense row per quote so an operator can scan dozens of cases, optionally
 * grouped by applicant so several bills from one business are judged together.
 */

export interface QuoteInboxRow {
  quote: LightInfo;
  effectiveStatus: string;
  details: InfoReply | undefined;
  /** The quote's own record could not be read, so its parties are unknown. */
  detailsFailed: boolean;
}

type SortableField = "sum" | "maturity" | "status";

const messages = defineMessages({
  caption: {
    id: "quotes.inbox.caption",
    defaultMessage: "Quotes. Open a quote to review the case and decide.",
    description: "Accessible description of the quote inbox table",
  },
  applicant: { id: "quotes.inbox.applicant", defaultMessage: "Applicant", description: "Column: bill holder who asked to mint" },
  payer: { id: "quotes.inbox.payer", defaultMessage: "Payer", description: "Column: drawee who pays at maturity" },
  amount: { id: "quotes.inbox.amount", defaultMessage: "Bill amount", description: "Column: face value of the bill" },
  maturity: { id: "quotes.inbox.maturity", defaultMessage: "Maturity", description: "Column: bill maturity date" },
  status: { id: "quotes.inbox.status", defaultMessage: "Status", description: "Column: quote status or credit assessment state" },
  lastChange: {
    id: "quotes.inbox.lastChange",
    defaultMessage: "Last change",
    description: "Column: when the quote was submitted or last changed status",
  },
  loading: { id: "quotes.inbox.loading", defaultMessage: "Loading…", description: "Bill details of a quote row are loading" },
  loadFailed: {
    id: "quotes.inbox.loadFailed",
    defaultMessage: "Bill details unavailable",
    description: "The quote's own record could not be read; open the quote to retry",
  },
  unknownApplicant: {
    id: "quotes.inbox.unknownApplicant",
    defaultMessage: "Applicant not known yet",
    description: "Group header for quotes whose bill has not loaded or could not be read",
  },
  payerLine: {
    id: "quotes.inbox.payerLine",
    defaultMessage: "Payer {payer}",
    description: "Small-screen second line naming the drawee",
  },
  endorsed: {
    id: "quotes.inbox.endorsed",
    defaultMessage: "Endorsed from {previous}",
    description: "The applicant received the bill by endorsement from the previous holder",
  },
  casesHere: {
    id: "quotes.inbox.casesHere",
    defaultMessage: "{count, plural, one {# case here} other {# cases here}}",
    description: "Link to this applicant's quotes on the current status page; counts the rows loaded here",
  },
  groupSummary: {
    id: "quotes.inbox.groupSummary",
    defaultMessage: "{count, plural, one {# case here} other {# cases here}} ·",
    description: "Number of this applicant's quotes in the current list, followed by their summed bill amounts",
  },
  allFromApplicant: {
    id: "quotes.inbox.allFromApplicant",
    defaultMessage: "Only this applicant",
    description: "Link from a group header to the server-filtered list of one applicant on this status page",
  },
  offerExpires: {
    id: "quotes.inbox.offerExpires",
    defaultMessage: "Offer expires {when}",
    description: "When the Mint's open offer lapses",
  },
});

const SORT_FIELD_BY_COLUMN = { amount: "sum", maturity: "maturity", status: "status" } as const;

/** Relative time in days once a day has passed: calendar months would call five days ago "last month". */
function relativeTime(locale: string, date: Date): string {
  return Math.abs(Date.now() - date.getTime()) >= 86_400_000
    ? humanReadableDurationDays(locale, date)
    : humanReadableDuration(locale, date);
}

function statusTimestamp(details: InfoReply | undefined): string | undefined {
  if (!details) return undefined;
  if ("submitted" in details) return details.submitted;
  if ("tstamp" in details) return details.tstamp;
  return undefined;
}

function SortHeader({
  column,
  sortBy,
  onSort,
  align = "left",
  className,
}: {
  column: keyof typeof SORT_FIELD_BY_COLUMN;
  sortBy: SortBy;
  onSort: (field: SortableField) => void;
  align?: "left" | "right";
  className?: string;
}) {
  const intl = useIntl();
  const field = SORT_FIELD_BY_COLUMN[column];
  const direction = sortBy === `${field}-asc` ? "ascending" : sortBy === `${field}-desc` ? "descending" : undefined;
  return (
    <th scope="col" aria-sort={direction ?? "none"} className={cn("px-4 py-2.5 font-medium", align === "right" && "text-right", className)}>
      {/* The column name stays the accessible name; aria-sort carries the order. */}
      <button
        type="button"
        onClick={() => onSort(field)}
        className={cn(
          "inline-flex items-center gap-1 rounded-sm hover:text-foreground focus-visible:outline focus-visible:outline-2",
          direction !== undefined && "text-foreground"
        )}
      >
        {intl.formatMessage(messages[column])}
        {direction === "ascending" && <ArrowUp className="size-3" aria-hidden="true" />}
        {direction === "descending" && <ArrowDown className="size-3" aria-hidden="true" />}
      </button>
    </th>
  );
}

function StatusCell({ row }: { row: QuoteInboxRow }) {
  const intl = useIntl();
  const { quote, effectiveStatus, details } = row;
  const ttl = details && "ttl" in details ? details.ttl : undefined;
  return (
    <div className="flex flex-col items-start gap-1">
      {effectiveStatus === "Pending" || effectiveStatus === "Denied" ? (
        <CreditAssessmentBadge billId={details?.bill.id} mintQuoteId={quote.id} quoteStatus={effectiveStatus} />
      ) : (
        <Badge variant={getQuoteStatusVariant(effectiveStatus)}>{intl.formatMessage(getQuoteStatusMessage(effectiveStatus))}</Badge>
      )}
      {effectiveStatus === "Offered" && ttl && (
        <span className="text-xs text-muted-foreground">
          {intl.formatMessage(messages.offerExpires, { when: relativeTime(intl.locale, new Date(ttl)) })}
        </span>
      )}
    </div>
  );
}

function MaturityCell({ maturityDate }: { maturityDate: string }) {
  const intl = useIntl();
  const date = new Date(maturityDate);
  return (
    <>
      <span className="block whitespace-nowrap">
        <FormattedDate value={date} dateStyle="medium" timeZone="UTC" />
      </span>
      <span className="block text-xs text-muted-foreground">{humanReadableDurationDays(intl.locale, date)}</span>
    </>
  );
}

function SearchIdMatch({ row, searchQuery }: { row: QuoteInboxRow; searchQuery: string }) {
  const query = searchQuery.trim().toLowerCase();
  if (query.length < 3) return null;
  // Identifiers stay out of the row unless the search hit one, so the match is visible.
  const id = [row.quote.id, row.details?.bill.id].find((value) => value?.toLowerCase().includes(query));
  if (!id) return null;
  return (
    <span className="mt-0.5 block truncate font-mono text-xs text-muted-foreground">
      <HighlightText text={id} highlight={searchQuery} />
    </span>
  );
}

function InboxRow({
  row,
  payerFirst,
  phone,
  searchQuery,
  casesInList,
}: {
  row: QuoteInboxRow;
  /** The applicant is already named by a group header or the list filter, so the row leads with the payer. */
  payerFirst: boolean;
  /** Phones get two columns; status and payer move under the name. */
  phone: boolean;
  searchQuery: string;
  casesInList: number;
}) {
  const intl = useIntl();
  const navigate = useNavigate();
  const { pathname } = useLocation();
  const { quote, details, detailsFailed } = row;
  const bill = details?.bill;
  const applicant = bill ? billApplicant(bill) : null;
  const payer = bill ? billPayer(bill) : null;
  const endorsedFrom = bill ? billPreviousHolder(bill) : undefined;
  const timestamp = statusTimestamp(details);
  const href = `/quotes/${quote.id}`;
  const unknown = (
    <span className={detailsFailed ? "text-signal-alert" : "text-muted-foreground"}>
      {intl.formatMessage(detailsFailed ? messages.loadFailed : messages.loading)}
    </span>
  );

  // The whole row opens the quote for a plain pointer click; the named link serves keyboards, new tabs and selection.
  const openRow = (event: MouseEvent<HTMLTableRowElement>) => {
    if (event.defaultPrevented || event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
    if ((event.target as HTMLElement).closest("a, button")) return;
    if (window.getSelection()?.isCollapsed === false) return;
    void navigate(href);
  };

  const smallScreenLine = phone && bill && (
    <span className="mt-0.5 block text-xs text-muted-foreground">
      {!payerFirst && payer && (
        <>
          {intl.formatMessage(messages.payerLine, { payer: payer.name })}
          {" · "}
        </>
      )}
      {humanReadableDurationDays(intl.locale, new Date(bill.maturity_date))}
    </span>
  );
  const applicantLines = !payerFirst && (endorsedFrom !== undefined || (casesInList > 1 && applicant)) && (
    <span className="mt-0.5 flex flex-wrap gap-x-2 text-xs text-muted-foreground">
      {endorsedFrom !== undefined && <span>{intl.formatMessage(messages.endorsed, { previous: endorsedFrom })}</span>}
      {casesInList > 1 && applicant && (
        <Link className="underline underline-offset-2 hover:text-foreground" to={partyListPath("applicant", applicant.nodeId, pathname)}>
          {intl.formatMessage(messages.casesHere, { count: casesInList })}
        </Link>
      )}
    </span>
  );
  const lead = payerFirst ? payer : applicant;

  return (
    <tr className="cursor-pointer align-top hover:bg-muted/30" onClick={openRow}>
      <th scope="row" className="max-w-xs px-4 py-3 text-left font-normal">
        <Link className="font-medium underline-offset-4 hover:underline focus-visible:outline focus-visible:outline-2" to={href}>
          {lead ? <HighlightText text={lead.name} highlight={searchQuery} /> : unknown}
        </Link>
        {applicantLines}
        {smallScreenLine}
        <SearchIdMatch row={row} searchQuery={searchQuery} />
        {phone && (
          <span className="mt-1.5 block">
            <StatusCell row={row} />
          </span>
        )}
      </th>
      {!payerFirst && !phone && (
        <td className="max-w-[14rem] px-4 py-3">{payer ? <HighlightText text={payer.name} highlight={searchQuery} /> : unknown}</td>
      )}
      <td className="px-4 py-3 text-right whitespace-nowrap tabular-nums">
        <Currency
          value={quote.sum}
          sourceCurrency="sat"
          highlightQuery={searchQuery}
          className="flex-col items-end gap-0"
          amountClassName="font-medium text-current"
          secondaryClassName="text-xs"
        />
      </td>
      {!phone && (
        <>
          <td className="hidden px-4 py-3 @3xl:table-cell">{bill ? <MaturityCell maturityDate={bill.maturity_date} /> : unknown}</td>
          <td className="px-4 py-3">
            <StatusCell row={row} />
          </td>
          <td className="hidden px-4 py-3 whitespace-nowrap text-muted-foreground @5xl:table-cell">
            {timestamp ? (
              <time dateTime={timestamp} title={intl.formatDate(timestamp, { dateStyle: "medium", timeStyle: "short" })}>
                {relativeTime(intl.locale, new Date(timestamp))}
              </time>
            ) : (
              "–"
            )}
          </td>
        </>
      )}
    </tr>
  );
}

function GroupHeader({ applicant, rows, colSpan }: { applicant: QuoteParty | null; rows: QuoteInboxRow[]; colSpan: number }) {
  const intl = useIntl();
  const { pathname } = useLocation();
  const total = rows.reduce((sum, row) => sum + row.quote.sum, 0);
  return (
    <tr className="bg-elevation-50">
      <th scope="rowgroup" colSpan={colSpan} className="px-4 py-2 text-left font-normal">
        <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
          <span className="min-w-0">
            <span className="font-semibold">{applicant?.name ?? intl.formatMessage(messages.unknownApplicant)}</span>
            <span className="ml-2 inline-flex items-baseline gap-1 text-xs text-muted-foreground tabular-nums">
              {intl.formatMessage(messages.groupSummary, { count: rows.length })}
              <Currency value={total} sourceCurrency="sat" className="inline" amountClassName="text-current" />
            </span>
          </span>
          {applicant && (
            <Link
              to={partyListPath("applicant", applicant.nodeId, pathname)}
              className="text-xs text-muted-foreground underline-offset-4 hover:text-foreground hover:underline focus-visible:outline focus-visible:outline-2"
            >
              {intl.formatMessage(messages.allFromApplicant)}
            </Link>
          )}
        </div>
      </th>
    </tr>
  );
}

/** An element's rendered width, or undefined where it cannot be measured (no layout, as in jsdom). */
function useElementWidth(ref: RefObject<HTMLElement | null>): number | undefined {
  const [width, setWidth] = useState<number>();
  useLayoutEffect(() => {
    const element = ref.current;
    if (!element || typeof ResizeObserver === "undefined") return;
    const measure = (value: number) => setWidth(value > 0 ? value : undefined);
    measure(element.getBoundingClientRect().width);
    const observer = new ResizeObserver(([entry]) => measure(entry.contentRect.width));
    observer.observe(element);
    return () => observer.disconnect();
  }, [ref]);
  return width;
}

export function QuoteInboxTable({
  rows,
  grouped,
  singleApplicant = false,
  searchQuery,
  sortBy,
  onSort,
}: {
  rows: QuoteInboxRow[];
  grouped: boolean;
  /** Every row belongs to one applicant (the list is filtered to them). */
  singleApplicant?: boolean;
  searchQuery: string;
  sortBy: SortBy;
  onSort: (field: SortableField) => void;
}) {
  const intl = useIntl();
  // The table's own width decides its layout: the sidebar takes a varying share of the window.
  const containerRef = useRef<HTMLDivElement>(null);
  const width = useElementWidth(containerRef);
  const narrowWindow = useIsMobile();
  const phone = width === undefined ? narrowWindow : width < 600;
  const applicantOf = (row: QuoteInboxRow) => (row.details ? billApplicant(row.details.bill) : null);
  const groups = groupByApplicant(rows, applicantOf);
  const casesByApplicant = new Map(groups.map((group) => [group.applicant?.nodeId ?? "", group.rows.length]));
  const header = (message: MessageDescriptor, className?: string) => (
    <th scope="col" className={cn("px-4 py-2.5 font-medium", className)}>
      {intl.formatMessage(message)}
    </th>
  );
  const payerFirst = grouped || singleApplicant;
  const colSpan = phone ? 2 : payerFirst ? 5 : 6;

  return (
    <div ref={containerRef} className="@container overflow-x-auto rounded-lg border border-border bg-card">
      <table className="w-full text-left text-sm">
        <caption className="sr-only">{intl.formatMessage(messages.caption)}</caption>
        <thead className="border-b border-border bg-muted/40 text-xs text-muted-foreground">
          <tr>
            {header(payerFirst ? messages.payer : messages.applicant)}
            {!payerFirst && !phone && header(messages.payer)}
            <SortHeader column="amount" sortBy={sortBy} onSort={onSort} align="right" />
            {!phone && (
              <>
                <SortHeader column="maturity" sortBy={sortBy} onSort={onSort} className="hidden @3xl:table-cell" />
                <SortHeader column="status" sortBy={sortBy} onSort={onSort} />
                {header(messages.lastChange, "hidden @5xl:table-cell")}
              </>
            )}
          </tr>
        </thead>
        {grouped ? (
          groups.map((group) => (
            <tbody key={group.applicant?.nodeId ?? ""} className="divide-y divide-border border-b border-border last:border-b-0">
              <GroupHeader applicant={group.applicant} rows={group.rows} colSpan={colSpan} />
              {group.rows.map((row) => (
                <InboxRow key={row.quote.id} row={row} payerFirst phone={phone} searchQuery={searchQuery} casesInList={group.rows.length} />
              ))}
            </tbody>
          ))
        ) : (
          <tbody className="divide-y divide-border">
            {rows.map((row) => {
              const applicantId = applicantOf(row)?.nodeId;
              return (
                <InboxRow
                  key={row.quote.id}
                  row={row}
                  payerFirst={singleApplicant}
                  phone={phone}
                  searchQuery={searchQuery}
                  casesInList={applicantId === undefined ? 1 : (casesByApplicant.get(applicantId) ?? 1)}
                />
              );
            })}
          </tbody>
        )}
      </table>
    </div>
  );
}
