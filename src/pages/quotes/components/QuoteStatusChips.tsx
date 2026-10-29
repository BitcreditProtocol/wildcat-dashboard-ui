import { Button } from "@bitcredit/ui-library";
import { Link } from "react-router";
import { useIntl } from "react-intl";
import { FILTER_CHIP_ROW_CLASS, filterChipProps } from "@/components/filter-chip";
import type { QuoteStatus } from "@/hooks/use-quote-list";
import { getQuoteStatusMessage } from "@/i18n/descriptors";
import { QUOTE_STATUS_ROUTES } from "../quote-status-routes";

export function QuoteStatusChips({ status }: { status?: QuoteStatus }) {
  const intl = useIntl();

  return (
    <div
      className={FILTER_CHIP_ROW_CLASS}
      role="group"
      aria-label={intl.formatMessage({
        id: "quotes.statusChips.label",
        defaultMessage: "Quote status",
      })}
    >
      {QUOTE_STATUS_ROUTES.map((route) => {
        const isActive = route.status === status;
        return (
          <Button key={route.status} asChild {...filterChipProps(isActive)}>
            <Link
              to={isActive ? "/quotes" : `/${route.path}`}
              data-quote-status-chip={route.status}
              aria-current={isActive ? "page" : undefined}
            >
              {intl.formatMessage(getQuoteStatusMessage(route.status))}
            </Link>
          </Button>
        );
      })}
    </div>
  );
}
