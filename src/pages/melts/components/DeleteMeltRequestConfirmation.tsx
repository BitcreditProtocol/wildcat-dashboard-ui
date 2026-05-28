import { TruncatedTextPopover } from "@bitcredit/ui-library";
import { FormattedMessage, useIntl } from "react-intl";
import { ConfirmDrawer } from "@/components/Drawers";
import { Currency } from "@/components/Currency";
import type { DeniedMeltOp } from "@/generated/client/types.gen";

export function DeleteMeltRequestConfirmation({
  operation,
  open,
  isPending,
  onOpenChange,
  onConfirm,
}: {
  operation: DeniedMeltOp | null;
  open: boolean;
  isPending: boolean;
  onOpenChange: (open: boolean) => void;
  onConfirm: () => void;
}) {
  const intl = useIntl();

  return (
    <ConfirmDrawer
      title={intl.formatMessage({
        id: "deniedMeltRequests.delete.title",
        defaultMessage: "Delete denied melt request",
      })}
      description={intl.formatMessage({
        id: "deniedMeltRequests.delete.description",
        defaultMessage: "This removes the denied melt request from the list.",
      })}
      open={open}
      onOpenChange={onOpenChange}
      onSubmit={onConfirm}
      submitButtonText={intl.formatMessage({
        id: "deniedMeltRequests.delete.confirm",
        defaultMessage: "Delete request",
      })}
      submitButtonVariant="destructive"
      submitButtonDisabled={isPending}
    >
      {operation ? (
        <div className="space-y-3 px-4 text-sm w-full">
          <div>
            <div className="text-xs font-medium text-muted-foreground">
              <FormattedMessage id="deniedMeltRequests.table.id" defaultMessage="Request ID" />
            </div>
            <TruncatedTextPopover text={operation.id} maxLength={24} className="font-mono" as="span" />
          </div>
          <div>
            <div className="text-xs font-medium text-muted-foreground">
              <FormattedMessage id="deniedMeltRequests.table.amount" defaultMessage="Amount" />
            </div>
            <Currency value={operation.amount} sourceCurrency="sat" amountClassName="text-current" />
          </div>
        </div>
      ) : null}
    </ConfirmDrawer>
  );
}
