import { type ReactNode, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle, Skeleton, Text, cn } from "@bitcredit/ui-library";
import { ChartColumn, Table2 } from "lucide-react";
import { FormattedMessage, defineMessages, useIntl } from "react-intl";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { normalizeApiError } from "@/lib/api-error";

export const CHART_BODY_CLASS = "h-[65dvh] min-h-64 w-full";

type HistoryView = "chart" | "table";

const viewMessages = defineMessages({
  label: { id: "balances.history.view.label", defaultMessage: "View" },
  chart: { id: "balances.history.view.chart", defaultMessage: "Chart" },
  table: { id: "balances.history.view.table", defaultMessage: "Table" },
});

function errorDetail(error: unknown): string {
  const apiError = normalizeApiError(error);

  return apiError.status === undefined ? apiError.message : `${apiError.status} ${apiError.message}`;
}

function HistoryViewToggle({ value, onChange }: { value: HistoryView; onChange: (view: HistoryView) => void }) {
  const intl = useIntl();

  return (
    <ToggleGroup
      type="single"
      size="sm"
      variant="outline"
      value={value}
      onValueChange={(next) => onChange((next || value) as HistoryView)}
      aria-label={intl.formatMessage(viewMessages.label)}
    >
      <ToggleGroupItem value="chart" className="gap-1.5 px-3 whitespace-nowrap">
        <ChartColumn className="size-4" aria-hidden />
        {intl.formatMessage(viewMessages.chart)}
      </ToggleGroupItem>
      <ToggleGroupItem value="table" className="gap-1.5 px-3 whitespace-nowrap">
        <Table2 className="size-4" aria-hidden />
        {intl.formatMessage(viewMessages.table)}
      </ToggleGroupItem>
    </ToggleGroup>
  );
}

interface HistoryChartCardProps {
  title: ReactNode;
  description: ReactNode;
  isPending: boolean;
  error: unknown;
  isEmpty: boolean;
  emptyMessage: ReactNode;
  actions?: ReactNode;
  table: ReactNode;
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
  table,
  children,
}: HistoryChartCardProps) {
  const [view, setView] = useState<HistoryView>("chart");

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
          <div className="flex shrink-0 flex-wrap items-center gap-2">
            <HistoryViewToggle value={view} onChange={setView} />
            {actions}
          </div>
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
          <Skeleton className={cn(CHART_BODY_CLASS, "rounded-lg")} />
        ) : isEmpty ? (
          <div className={cn(CHART_BODY_CLASS, "flex items-center justify-center")}>
            <Text as="p" variant="caption" className="text-muted-foreground">
              {emptyMessage}
            </Text>
          </div>
        ) : view === "table" ? (
          table
        ) : (
          children
        )}
      </CardContent>
    </Card>
  );
}
