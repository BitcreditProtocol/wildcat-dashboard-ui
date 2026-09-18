import type { ReactNode } from "react";
import { Card, CardContent, CardHeader, CardTitle, Skeleton, Text } from "@bitcredit/ui-library";
import { FormattedMessage } from "react-intl";
import { normalizeApiError } from "@/lib/api-error";

function errorDetail(error: unknown): string {
  const apiError = normalizeApiError(error);

  return apiError.status === undefined ? apiError.message : `${apiError.status} ${apiError.message}`;
}

interface HistoryChartCardProps {
  title: ReactNode;
  description: ReactNode;
  isPending: boolean;
  error: unknown;
  isEmpty: boolean;
  emptyMessage: ReactNode;
  actions?: ReactNode;
  children: ReactNode;
}

export function HistoryChartCard({
  title,
  description,
  isPending,
  error,
  isEmpty,
  emptyMessage,
  actions,
  children,
}: HistoryChartCardProps) {
  return (
    <Card className="@container py-4">
      <CardHeader className="px-6 pb-2">
        <div className="flex flex-col gap-3 @min-[42rem]:flex-row @min-[42rem]:items-start @min-[42rem]:justify-between">
          <div className="flex min-w-0 flex-col gap-1.5">
            <CardTitle>{title}</CardTitle>
            <Text as="p" variant="caption" className="text-muted-foreground">
              {description}
            </Text>
          </div>
          {actions ? <div className="shrink-0">{actions}</div> : null}
        </div>
      </CardHeader>
      <CardContent className="px-6">
        {error ? (
          <p className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-800">
            <FormattedMessage
              id="balances.history.error"
              defaultMessage="Failed to load history: {error}"
              values={{ error: errorDetail(error) }}
            />
          </p>
        ) : isPending ? (
          <Skeleton className="h-64 w-full rounded-lg" />
        ) : isEmpty ? (
          <div className="flex h-64 items-center justify-center">
            <Text as="p" variant="caption" className="text-muted-foreground">
              {emptyMessage}
            </Text>
          </div>
        ) : (
          children
        )}
      </CardContent>
    </Card>
  );
}
