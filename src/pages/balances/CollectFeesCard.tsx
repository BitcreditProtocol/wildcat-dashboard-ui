import { useQuery } from "@tanstack/react-query";
import { AppIcon, Button, Card, CardContent, CardHeader, CardTitle, Skeleton, TruncatedTextPopover } from "@bitcredit/ui-library";
import { collectFeesTokenOptions } from "@/generated/client/@tanstack/react-query.gen";
import type { Amount } from "@/generated/client/types.gen";
import { FormattedMessage } from "react-intl";
import { Currency } from "@/components/Currency";
import { FeeTokenQRCodeModal } from "@/components/QRCodeWithErrorBoundary";
import { LoaderIcon, RefreshCw } from "lucide-react";
import { getApiErrorMessage } from "@/lib/api-error";

function getAmountValue(amount?: Amount | number | null) {
  if (typeof amount === "number") {
    return amount;
  }

  return amount?.value ?? null;
}

function getCollectableFeesSats(feesToken?: unknown) {
  if (!feesToken || typeof feesToken !== "object") {
    return null;
  }

  const response = feesToken as {
    amount?: Amount | number | null;
    total?: Amount | number | null;
  };

  return getAmountValue(response.amount ?? response.total);
}

export function CollectFeesCard() {
  const {
    data: feesToken,
    error,
    isFetching,
    refetch,
  } = useQuery({
    ...collectFeesTokenOptions(),
    retry: 3,
  });
  const hasToken = Boolean(feesToken?.token);
  const collectableFeesSats = getCollectableFeesSats(feesToken);

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between gap-3 pt-6 pb-2 px-6">
        <CardTitle>
          <FormattedMessage id="balances.collectFees.title" defaultMessage="Fee collection" />
        </CardTitle>
        <Button type="button" variant="secondary" size="sm" className="w-fit gap-2" onClick={() => void refetch()} disabled={isFetching}>
          <AppIcon icon={isFetching ? LoaderIcon : RefreshCw} size="sm" className={isFetching ? "animate-spin" : undefined} />
          {hasToken ? (
            <FormattedMessage id="balances.collectFees.refreshButton" defaultMessage="Refresh" />
          ) : (
            <FormattedMessage id="balances.collectFees.loadingButton" defaultMessage="Loading fees" />
          )}
        </Button>
      </CardHeader>
      <CardContent className="flex flex-col gap-4 pt-2 pb-6 px-6">
        <p className="text-sm text-text-200">
          <FormattedMessage
            id="balances.collectFees.description"
            defaultMessage="Current e-cash fees collectable as a wallet import token."
          />
        </p>

        <div className="rounded-md border border-divider-200 bg-elevation-100 p-4">
          <span className="text-sm text-text-200 pr-2">
            <FormattedMessage id="balances.collectFees.amount" defaultMessage="Current fees collectable" />
          </span>
          {feesToken ? (
            <>
              <Currency
                value={collectableFeesSats ?? 0}
                sourceCurrency="sat"
                className="mt-1 text-2xl font-bold text-text-300"
                amountClassName="text-current"
              />

              <div className="flex flex-col gap-3 py-4 sm:flex-row sm:items-center sm:justify-between">
                <div className="flex min-w-0 flex-col gap-1">
                  <TruncatedTextPopover
                    text={feesToken.token}
                    maxLength={32}
                    showCopyButton={true}
                    truncationMode="middle"
                    className="font-mono text-xs text-text-300 hover:text-text-300"
                    contentClassName="border-divider-200 bg-elevation-200 text-text-300"
                  />
                </div>
                <div className="flex items-center gap-2 text-sm text-text-300">
                  <FeeTokenQRCodeModal feeToken={feesToken.token} />
                </div>
              </div>
            </>
          ) : (
            <Skeleton className="mt-2 h-8 w-40 rounded-md" />
          )}
        </div>

        {error && (
          <p className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-800">
            <FormattedMessage
              id="balances.collectFees.error"
              defaultMessage="Failed to collect fees: {error}"
              values={{ error: getApiErrorMessage(error) }}
            />
          </p>
        )}
      </CardContent>
    </Card>
  );
}
