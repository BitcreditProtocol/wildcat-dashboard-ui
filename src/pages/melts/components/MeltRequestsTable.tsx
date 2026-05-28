import { AppIcon, Button, Card, CardContent, cn } from "@bitcredit/ui-library";
import { LoaderIcon, Trash2 } from "lucide-react";
import { FormattedMessage, useIntl } from "react-intl";
import { Currency } from "@/components/Currency";
import type { DeniedMeltOp } from "@/generated/client/types.gen";
import { UTC_TIME_ZONE } from "../constants";
import { formatCreatedAt } from "../utils";
import { TruncatedTextPopover } from "@bitcredit/ui-library";

export function MeltRequestsTable({
  operations,
  isFetching,
  deletingId,
  onDelete,
}: {
  operations: DeniedMeltOp[];
  isFetching: boolean;
  deletingId?: string;
  onDelete: (operation: DeniedMeltOp) => void;
}) {
  const intl = useIntl();

  return (
    <Card>
      <CardContent className="p-0">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[720px] text-sm">
            <thead className="border-b bg-elevation-50">
              <tr>
                <th className="p-3 text-left font-semibold">
                  <FormattedMessage id="deniedMeltRequests.table.id" defaultMessage="Request ID" />
                </th>
                <th className="p-3 text-left font-semibold">
                  <FormattedMessage id="deniedMeltRequests.table.amount" defaultMessage="Amount" />
                </th>
                <th className="p-3 text-left font-semibold">
                  <FormattedMessage id="deniedMeltRequests.table.created" defaultMessage="Created" />
                </th>
                <th className="p-3 text-right font-semibold">
                  <FormattedMessage id="deniedMeltRequests.table.actions" defaultMessage="Actions" />
                </th>
              </tr>
            </thead>
            <tbody>
              {operations.map((operation) => {
                const isDeleting = deletingId === operation.id;

                return (
                  <tr key={operation.id} data-operation-id={operation.id} className="border-b last:border-b-0">
                    <td className="max-w-[280px] p-3 font-mono">
                      <TruncatedTextPopover text={operation.id} className="font-mono" as="span" />
                    </td>
                    <td className="p-3">
                      <Currency value={operation.amount} sourceCurrency="sat" amountClassName="text-current" />
                    </td>
                    <td className="p-3 whitespace-nowrap text-muted-foreground">
                      {formatCreatedAt(operation.created, intl.locale)}
                      <span className="ml-1 text-xs">{UTC_TIME_ZONE}</span>
                    </td>
                    <td className="p-3 text-right">
                      <Button
                        type="button"
                        size="sm"
                        variant="destructive"
                        className="h-9 w-9 p-0"
                        aria-label={intl.formatMessage({
                          id: "deniedMeltRequests.delete.ariaLabel",
                          defaultMessage: "Delete denied melt request",
                        })}
                        title={intl.formatMessage({
                          id: "deniedMeltRequests.delete.ariaLabel",
                          defaultMessage: "Delete denied melt request",
                        })}
                        onClick={() => onDelete(operation)}
                        disabled={isFetching || isDeleting}
                      >
                        <AppIcon icon={isDeleting ? LoaderIcon : Trash2} className={cn({ "animate-spin": isDeleting })} />
                      </Button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </CardContent>
    </Card>
  );
}
