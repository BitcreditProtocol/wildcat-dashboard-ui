import { AppIcon, Button, cn } from "@bitcredit/ui-library";
import { RefreshCw } from "lucide-react";
import { useIntl } from "react-intl";

export function MeltRequestsSummary({
  hasActiveFilters,
  shownCount,
  totalCount,
  isFetching,
  onRefresh,
}: {
  hasActiveFilters: boolean;
  shownCount: number;
  totalCount: number;
  isFetching: boolean;
  onRefresh: () => void;
}) {
  const intl = useIntl();

  return (
    <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
      <div className="text-sm text-muted-foreground">
        {hasActiveFilters
          ? intl.formatMessage(
              {
                id: "deniedMeltRequests.filteredCount",
                defaultMessage: "Showing {shown} of {total} requests",
              },
              { shown: shownCount, total: totalCount }
            )
          : intl.formatMessage(
              {
                id: "deniedMeltRequests.count",
                defaultMessage: "{count, plural, one {# denied request} other {# denied requests}}",
              },
              { count: totalCount }
            )}
      </div>
      <Button className="w-fit gap-2" type="button" variant="outline" size="sm" onClick={onRefresh} disabled={isFetching}>
        <AppIcon icon={RefreshCw} className={cn({ "animate-spin": isFetching })} />
        {intl.formatMessage({
          id: "deniedMeltRequests.refresh",
          defaultMessage: "Refresh",
        })}
      </Button>
    </div>
  );
}
