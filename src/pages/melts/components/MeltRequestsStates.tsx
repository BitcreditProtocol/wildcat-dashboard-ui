import { AppIcon, Button, Card, CardContent, Skeleton } from "@bitcredit/ui-library";
import { Ban } from "lucide-react";
import { FormattedMessage, useIntl } from "react-intl";
import { getApiErrorMessage } from "@/lib/api-error";

export function MeltRequestsLoader() {
  return (
    <div className="flex flex-col gap-3">
      <Skeleton className="h-10 w-48 rounded-lg" />
      <Skeleton className="h-72 rounded-lg" />
    </div>
  );
}

export function MeltRequestsEmptyState() {
  return (
    <Card>
      <CardContent className="flex min-h-48 flex-col items-center justify-center gap-3 text-center">
        <AppIcon icon={Ban} size="lg" className="text-muted-foreground" />
        <div className="text-sm font-medium">
          <FormattedMessage id="deniedMeltRequests.empty" defaultMessage="No denied melt requests found" />
        </div>
      </CardContent>
    </Card>
  );
}

export function MeltRequestsErrorState({ error, onRetry }: { error: unknown; onRetry: () => void }) {
  const intl = useIntl();
  const errorMessage = getApiErrorMessage(error);

  return (
    <Card className="border-red-200 bg-red-50">
      <CardContent className="flex flex-col gap-4 p-4">
        <div>
          <div className="font-semibold text-red-800">
            <FormattedMessage id="deniedMeltRequests.error.title" defaultMessage="Failed to load denied melt requests" />
          </div>
          <div className="text-sm text-red-700">{errorMessage}</div>
        </div>
        <Button className="w-fit" type="button" variant="outline" onClick={onRetry}>
          {intl.formatMessage({
            id: "deniedMeltRequests.retry",
            defaultMessage: "Retry",
          })}
        </Button>
      </CardContent>
    </Card>
  );
}
