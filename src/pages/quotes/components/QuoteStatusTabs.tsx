import { cn } from "@bitcredit/ui-library";
import { defineMessages, useIntl } from "react-intl";
import { Link } from "react-router";
import type { QuoteStatus } from "@/hooks/use-quote-list";
import { getQuoteStatusMessage } from "@/i18n/descriptors";
import { QUOTE_STATUS_ROUTES } from "../quote-status-routes";

/** Statuses an operator works through, as tabs; finished ones stay reachable but quiet. */
const WORKING: QuoteStatus[] = ["Pending", "Offered", "Accepted", "MintingEnabled"];
const CLOSED: QuoteStatus[] = ["OfferExpired", "Denied", "Rejected", "Canceled"];

const messages = defineMessages({
  label: { id: "quotes.statusChips.label", defaultMessage: "Quote status" },
  all: { id: "quotes.tabs.all", defaultMessage: "All", description: "Tab showing quotes of every status" },
  closed: { id: "quotes.tabs.closed", defaultMessage: "Closed:", description: "Label before the links to finished quote statuses" },
});

const pathOf = (status: QuoteStatus) => `/${QUOTE_STATUS_ROUTES.find((route) => route.status === status)?.path ?? "quotes"}`;

/** `search` carries the applicant, payer and view filters across status pages. */
export function QuoteStatusTabs({ status, search = "" }: { status?: QuoteStatus; search?: string }) {
  const intl = useIntl();
  const tab = (key: string, to: string, label: string, active: boolean, statusKey?: QuoteStatus) => (
    <Link
      key={key}
      to={`${to}${search}`}
      data-quote-status-chip={statusKey}
      aria-current={active ? "page" : undefined}
      className={cn(
        "-mb-px shrink-0 border-b-2 px-3 pt-1 pb-2.5 text-sm whitespace-nowrap focus-visible:outline focus-visible:outline-2",
        active ? "border-foreground font-semibold text-foreground" : "border-transparent text-muted-foreground hover:text-foreground"
      )}
    >
      {label}
    </Link>
  );
  return (
    // Wide screens keep the closed statuses beside the tabs; narrower ones give them their own line.
    <nav
      aria-label={intl.formatMessage(messages.label)}
      className="flex flex-col gap-2 lg:flex-row lg:items-end lg:justify-between lg:gap-6 lg:border-b lg:border-border"
    >
      <div className="flex items-end overflow-x-auto border-b border-border lg:border-b-0">
        {tab("all", "/quotes", intl.formatMessage(messages.all), status === undefined)}
        {WORKING.map((one) => tab(one, pathOf(one), intl.formatMessage(getQuoteStatusMessage(one)), status === one, one))}
      </div>
      <div className="flex shrink-0 flex-wrap items-baseline gap-x-2 gap-y-1 text-xs text-muted-foreground lg:pb-2.5">
        <span>{intl.formatMessage(messages.closed)}</span>
        {CLOSED.map((one) => (
          <Link
            key={one}
            to={`${pathOf(one)}${search}`}
            data-quote-status-chip={one}
            aria-current={status === one ? "page" : undefined}
            className={cn(
              "whitespace-nowrap underline-offset-4 hover:text-foreground hover:underline",
              status === one && "font-semibold text-foreground underline"
            )}
          >
            {intl.formatMessage(getQuoteStatusMessage(one))}
          </Link>
        ))}
      </div>
    </nav>
  );
}
