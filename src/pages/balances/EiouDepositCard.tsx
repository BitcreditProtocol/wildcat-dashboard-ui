import { type SubmitEvent, useState } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { AppIcon, Button, Card, CardContent, CardHeader, CardTitle, Input, TruncatedTextPopover } from "@bitcredit/ui-library";
import { getEiouDepositStatusOptions, postEiouDepositMutation } from "@/generated/client/@tanstack/react-query.gen";
import type { EiouDepositStatus } from "@/generated/client/types.gen";
import { FormattedMessage, useIntl } from "react-intl";
import { Currency } from "@/components/Currency";
import { QRCodeModal } from "@/components/QRCodeWithErrorBoundary";
import { LoaderIcon, PlusCircle } from "lucide-react";
import { getApiErrorMessage } from "@/lib/api-error";
import { createLogger } from "@/lib/logger";
import { blockNonDigitInput, handleDrop } from "@/components/GrossToNetDiscountForm/input";

const logger = createLogger("eiou-deposit");

function toPositiveIntegerInput(value: string) {
  return value.replace(/\D/g, "").replace(/^0+/, "");
}

function isCompleted(status: EiouDepositStatus): status is { Completed: { block_height: number } } {
  return typeof status === "object" && status !== null && "Completed" in status;
}

/**
 * The e-IOU counterpart of `AddReserveCard`. The amount is whole e-IOU tokens rather than sats
 * (the ticker has no decimals), and the mint credits the amount declared here: unlike a Bitcoin
 * reserve there is no funding-mismatch state to fall back on, so the copy says so up front.
 */
export function EiouDepositCard() {
  const intl = useIntl();
  const [amountInput, setAmountInput] = useState("");
  const [requestId, setRequestId] = useState<string | null>(null);

  const createDeposit = useMutation({
    ...postEiouDepositMutation(),
    onSuccess: (data) => {
      if (data) {
        setRequestId(data.request_id);
      }
    },
    onError: (error) => {
      logger.warn("e-IOU deposit failed", error);
    },
  });

  const statusQuery = useQuery({
    ...getEiouDepositStatusOptions({ path: { rid: requestId ?? "" } }),
    enabled: requestId !== null,
    refetchInterval: (query) => (query.state.data && isCompleted(query.state.data.status) ? false : 5_000),
  });

  const deposit = statusQuery.data ?? createDeposit.data;
  const status = deposit?.status;

  const handleSubmit = (event: SubmitEvent<HTMLFormElement>) => {
    event.preventDefault();
    const amount = Number(amountInput);
    if (!Number.isInteger(amount) || amount <= 0) {
      return;
    }

    setRequestId(null);
    createDeposit.mutate({
      body: {
        request_id: crypto.randomUUID(),
        amount,
      },
    });
  };

  const handleReset = () => {
    setRequestId(null);
    setAmountInput("");
    createDeposit.reset();
  };

  const isSubmitting = createDeposit.isPending;
  const error = createDeposit.error ?? statusQuery.error;

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between gap-3 pt-6 pb-2 px-6">
        <CardTitle>
          <FormattedMessage id="balances.eiouDeposit.title" defaultMessage="Deposit e-IOU" />
        </CardTitle>
      </CardHeader>
      <CardContent className="flex flex-col gap-4 pt-2 pb-6 px-6">
        <p className="text-sm text-text-200">
          <FormattedMessage
            id="balances.eiouDeposit.description"
            defaultMessage="Request a deposit address to add e-IOU collateral to the mint. The amount you declare here is the amount credited."
          />
        </p>

        {!deposit ? (
          <form onSubmit={handleSubmit} className="flex flex-col gap-4">
            <Input
              type="text"
              inputMode="numeric"
              pattern="[0-9]*"
              autoComplete="off"
              label={intl.formatMessage({ id: "balances.eiouDeposit.amountLabel", defaultMessage: "Amount (whole e-IOU tokens)" })}
              value={amountInput}
              onBeforeInput={blockNonDigitInput}
              onDrop={handleDrop}
              onChange={(event) => setAmountInput(toPositiveIntegerInput(event.target.value))}
              disabled={isSubmitting}
              required
            />
            <Button type="submit" variant="secondary" className="w-fit gap-2" disabled={isSubmitting}>
              <AppIcon icon={isSubmitting ? LoaderIcon : PlusCircle} size="sm" className={isSubmitting ? "animate-spin" : undefined} />
              <FormattedMessage id="balances.eiouDeposit.submitButton" defaultMessage="Create deposit address" />
            </Button>
          </form>
        ) : (
          <div className="rounded-md border border-divider-200 bg-elevation-100 p-4">
            <div className="flex items-center justify-between">
              <span className="text-sm text-text-200">
                <FormattedMessage id="balances.eiouDeposit.amount" defaultMessage="Declared amount" />
              </span>
              <Currency value={deposit.amount} sourceCurrency="eiou" amountClassName="text-current" />
            </div>

            <div className="flex flex-col gap-3 py-4 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex min-w-0 flex-col gap-1">
                <TruncatedTextPopover
                  text={deposit.address}
                  maxLength={32}
                  showCopyButton={true}
                  truncationMode="middle"
                  className="font-mono text-xs text-text-300 hover:text-text-300"
                  contentClassName="border-divider-200 bg-elevation-200 text-text-300"
                />
              </div>
              <QRCodeModal
                value={deposit.address}
                title={intl.formatMessage({ id: "balances.eiouDeposit.qrTitle", defaultMessage: "e-IOU deposit address" })}
                triggerLabel={intl.formatMessage({ id: "balances.eiouDeposit.qrTrigger", defaultMessage: "Show QR code" })}
                label={intl.formatMessage({
                  id: "balances.eiouDeposit.qrLabel",
                  defaultMessage: "Scan to send the declared e-IOU amount to the mint",
                })}
              />
            </div>

            <p className="text-sm font-medium text-text-300">
              {status && isCompleted(status) ? (
                <FormattedMessage
                  id="balances.eiouDeposit.status.completed"
                  defaultMessage="Credited (seen at block {blockHeight})"
                  values={{ blockHeight: status.Completed.block_height }}
                />
              ) : (
                <span className="inline-flex items-center gap-2">
                  <AppIcon icon={LoaderIcon} size="sm" className="animate-spin" />
                  <FormattedMessage id="balances.eiouDeposit.status.pending" defaultMessage="Waiting for the e-IOU deposit to arrive..." />
                </span>
              )}
            </p>

            <Button type="button" variant="ghost" size="sm" className="mt-4 w-fit" onClick={handleReset}>
              <FormattedMessage id="balances.eiouDeposit.resetButton" defaultMessage="Create another deposit" />
            </Button>
          </div>
        )}

        {error && (
          <p className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-800">
            <FormattedMessage
              id="balances.eiouDeposit.error"
              defaultMessage="Failed to deposit e-IOU: {error}"
              values={{ error: getApiErrorMessage(error) }}
            />
          </p>
        )}
      </CardContent>
    </Card>
  );
}
