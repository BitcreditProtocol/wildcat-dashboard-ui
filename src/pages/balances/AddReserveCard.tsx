import { type FormEvent, useState } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { AppIcon, Button, Card, CardContent, CardHeader, CardTitle, Input, TruncatedTextPopover } from "@bitcredit/ui-library";
import { getAddReserveStatusOptions, postAddReserveMutation } from "@/generated/client/@tanstack/react-query.gen";
import type { AddReserveStatus } from "@/generated/client/types.gen";
import { FormattedMessage, useIntl } from "react-intl";
import { Currency } from "@/components/Currency";
import { QRCodeModal } from "@/components/QRCodeWithErrorBoundary";
import { LoaderIcon, PlusCircle } from "lucide-react";
import { getApiErrorMessage } from "@/lib/api-error";
import { createLogger } from "@/lib/logger";
import { blockNonDigitInput, handleDrop } from "@/components/GrossToNetDiscountForm/input";

const logger = createLogger("add-reserve");

function toPositiveIntegerInput(value: string) {
  return value.replace(/\D/g, "").replace(/^0+/, "");
}

function isCompleted(status: AddReserveStatus): status is { Completed: { outpoint: string } } {
  return typeof status === "object" && status !== null && "Completed" in status;
}

function isPending(status: AddReserveStatus) {
  return status === "Pending";
}

export function AddReserveCard() {
  const intl = useIntl();
  const [amountInput, setAmountInput] = useState("");
  const [reserveId, setReserveId] = useState<string | null>(null);

  const createReserve = useMutation({
    ...postAddReserveMutation(),
    onSuccess: (data) => {
      if (data) {
        setReserveId(data.reserve_id);
      }
    },
    onError: (error) => {
      logger.warn("Add reserve failed", error);
    },
  });

  const statusQuery = useQuery({
    ...getAddReserveStatusOptions({ path: { rid: reserveId ?? "" } }),
    enabled: reserveId !== null,
    refetchInterval: (query) => (query.state.data && !isPending(query.state.data.status) ? false : 5_000),
  });

  const reserve = statusQuery.data ?? createReserve.data;
  const status = reserve?.status;

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const amount = Number(amountInput);
    if (!Number.isInteger(amount) || amount <= 0) {
      return;
    }

    setReserveId(null);
    createReserve.mutate({
      body: {
        reserve_id: crypto.randomUUID(),
        amount,
      },
    });
  };

  const handleReset = () => {
    setReserveId(null);
    setAmountInput("");
    createReserve.reset();
  };

  const isSubmitting = createReserve.isPending;
  const error = createReserve.error ?? statusQuery.error;

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between gap-3 pt-6 pb-2 px-6">
        <CardTitle>
          <FormattedMessage id="balances.addReserve.title" defaultMessage="Add reserve" />
        </CardTitle>
      </CardHeader>
      <CardContent className="flex flex-col gap-4 pt-2 pb-6 px-6">
        <p className="text-sm text-text-200">
          <FormattedMessage
            id="balances.addReserve.description"
            defaultMessage="Request a funding address to add Bitcoin reserve to the mint."
          />
        </p>

        {!reserve ? (
          <form onSubmit={handleSubmit} className="flex flex-col gap-4">
            <Input
              type="text"
              inputMode="numeric"
              pattern="[0-9]*"
              autoComplete="off"
              label={intl.formatMessage({ id: "balances.addReserve.amountLabel", defaultMessage: "Amount (sat)" })}
              value={amountInput}
              onBeforeInput={blockNonDigitInput}
              onDrop={handleDrop}
              onChange={(event) => setAmountInput(toPositiveIntegerInput(event.target.value))}
              disabled={isSubmitting}
              required
            />
            <Button type="submit" variant="secondary" className="w-fit gap-2" disabled={isSubmitting}>
              <AppIcon icon={isSubmitting ? LoaderIcon : PlusCircle} size="sm" className={isSubmitting ? "animate-spin" : undefined} />
              <FormattedMessage id="balances.addReserve.submitButton" defaultMessage="Create reserve address" />
            </Button>
          </form>
        ) : (
          <div className="rounded-md border border-divider-200 bg-elevation-100 p-4">
            <div className="flex items-center justify-between">
              <span className="text-sm text-text-200">
                <FormattedMessage id="balances.addReserve.amount" defaultMessage="Requested amount" />
              </span>
              <Currency value={reserve.amount} sourceCurrency="sat" amountClassName="text-current" />
            </div>

            <div className="flex flex-col gap-3 py-4 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex min-w-0 flex-col gap-1">
                <TruncatedTextPopover
                  text={reserve.address}
                  maxLength={32}
                  showCopyButton={true}
                  truncationMode="middle"
                  className="font-mono text-xs text-text-300 hover:text-text-300"
                  contentClassName="border-divider-200 bg-elevation-200 text-text-300"
                />
              </div>
              <QRCodeModal
                value={reserve.address}
                title={intl.formatMessage({ id: "balances.addReserve.qrTitle", defaultMessage: "Reserve funding address" })}
                triggerLabel={intl.formatMessage({ id: "balances.addReserve.qrTrigger", defaultMessage: "Show QR code" })}
                label={intl.formatMessage({
                  id: "balances.addReserve.qrLabel",
                  defaultMessage: "Scan to send the exact amount in a single transaction",
                })}
              />
            </div>

            <p className="text-sm font-medium text-text-300">
              {status && isCompleted(status) ? (
                <FormattedMessage
                  id="balances.addReserve.status.completed"
                  defaultMessage="Funded (outpoint: {outpoint})"
                  values={{ outpoint: status.Completed.outpoint }}
                />
              ) : status === "FundingMismatch" ? (
                <FormattedMessage
                  id="balances.addReserve.status.fundingMismatch"
                  defaultMessage="Funding mismatch: the received amount or transaction did not match the request."
                />
              ) : (
                <span className="inline-flex items-center gap-2">
                  <AppIcon icon={LoaderIcon} size="sm" className="animate-spin" />
                  <FormattedMessage
                    id="balances.addReserve.status.pending"
                    defaultMessage="Waiting for the exact amount to be received in a single transaction..."
                  />
                </span>
              )}
            </p>

            <Button type="button" variant="ghost" size="sm" className="mt-4 w-fit" onClick={handleReset}>
              <FormattedMessage id="balances.addReserve.resetButton" defaultMessage="Create another reserve" />
            </Button>
          </div>
        )}

        {error && (
          <p className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-800">
            <FormattedMessage
              id="balances.addReserve.error"
              defaultMessage="Failed to add reserve: {error}"
              values={{ error: getApiErrorMessage(error) }}
            />
          </p>
        )}
      </CardContent>
    </Card>
  );
}
