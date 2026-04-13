import { PageTitle } from "@/components/PageTitle";
import { Breadcrumbs } from "@/components/Breadcrumbs";
import { useParams, Link, useLocation } from "react-router";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { BreadcrumbLink } from "@/components/ui/breadcrumb";
import { truncateString } from "@/utils/strings";
import { FormattedMessage, useIntl } from "react-intl";
import { KeysetLoader } from "@/pages/keysets/components/KeysetLoader";
import { KeysetRedemptionButton } from "@/pages/keysets/components/KeysetRedemptionButton";
import { KeysetQuoteTableRow } from "@/pages/keysets/components/KeysetQuoteTableRow";
import { useKeysetDetail } from "@/hooks/use-keyset-detail";

interface LocationState {
  from?: string;
}

function PageBody({ keysetId }: { keysetId: string }) {
  const intl = useIntl();
  const {
    keyset,
    parsedKeysetId,
    redemptionMutation,
    allQuotes,
    quoteDetailsQueries,
    matchingBillIds,
    mintCompleteQueries,
    allBillsPaid,
    allMintComplete,
    canEnableRedemption,
    anyMintCompleteLoading,
    hasNoMatchingBills,
    matchingQuotes,
    billIdToEbillMap,
    keysetsLoading,
    quotesLoading,
  } = useKeysetDetail(keysetId);

  if (keysetsLoading) {
    return <KeysetLoader />;
  }

  if (!keyset) {
    return (
      <div className="p-4">
        <Card>
          <CardContent className="pt-6">
            <p className="text-muted-foreground">
              <FormattedMessage
                id="keyset.detail.notFound"
                defaultMessage="Keyset not found"
              />
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  const noExpiryText = intl.formatMessage({
    id: "keysets.noExpiry",
    defaultMessage: "No expiry",
  });

  const finalExpiryDate = keyset.final_expiry
    ? new Date(keyset.final_expiry * 1000)
        .toLocaleDateString("en-US", {
          day: "2-digit",
          month: "short",
          year: "numeric",
          timeZone: "UTC",
        })
        .replace(/(\d{2}) (\w{3}), (\d{4})/, "$1. $2. $3")
    : noExpiryText;

  const currencyUnit =
    typeof keyset.unit === "string" ? keyset.unit : keyset.unit.Custom;

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="font-mono text-sm">{keyset.id}</CardTitle>
              <CardDescription className="mt-1">
                <FormattedMessage
                  id="keyset.detail.meta"
                  defaultMessage="Currency: {currency} | Maturity date: {maturityDate}"
                  values={{
                    currency: currencyUnit,
                    maturityDate: finalExpiryDate,
                  }}
                />
              </CardDescription>
            </div>
            <div className="flex gap-2 items-center">
              <Badge variant={keyset.active ? "default" : "secondary"}>
                {keyset.active ? (
                  <FormattedMessage
                    id="keysets.status.active"
                    defaultMessage="Active"
                  />
                ) : (
                  <FormattedMessage
                    id="keysets.status.inactive"
                    defaultMessage="Inactive"
                  />
                )}
              </Badge>
            </div>
          </div>
          {keyset.active && (
            <div className="w-full my-4">
              <KeysetRedemptionButton
                onRedeem={() =>
                  redemptionMutation.mutate({ body: { kid: parsedKeysetId! } })
                }
                isPending={redemptionMutation.isPending}
                parsedKeysetId={parsedKeysetId}
                canEnableRedemption={canEnableRedemption}
                anyMintCompleteLoading={anyMintCompleteLoading}
                hasNoMatchingBills={hasNoMatchingBills}
                allBillsPaid={allBillsPaid}
                allMintComplete={allMintComplete}
              />
            </div>
          )}
        </CardHeader>
        <CardContent>
          {quotesLoading ? (
            <Skeleton className="h-20 w-full" />
          ) : matchingQuotes.length > 0 ? (
            <div className="space-y-3">
              <h4 className="text-sm font-semibold">
                <FormattedMessage
                  id="keyset.detail.allQuotes"
                  defaultMessage="All quotes ({count})"
                  values={{ count: matchingQuotes.length }}
                />
              </h4>

              <div className="border rounded-md overflow-hidden">
                <table className="w-full text-xs">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="text-left p-2 font-semibold">
                        <FormattedMessage
                          id="keyset.detail.table.quoteId"
                          defaultMessage="Quote ID"
                        />
                      </th>
                      <th className="text-left p-2 font-semibold">
                        <FormattedMessage
                          id="keyset.detail.table.quoteStatus"
                          defaultMessage="Quote status"
                        />
                      </th>
                      <th className="text-left p-2 font-semibold">
                        <FormattedMessage
                          id="keyset.detail.table.paymentStatus"
                          defaultMessage="Payment status"
                        />
                      </th>
                      <th className="text-left p-2 font-semibold">
                        <FormattedMessage
                          id="keyset.detail.table.mintStatus"
                          defaultMessage="Redemption status"
                        />
                      </th>
                      <th className="text-left p-2 font-semibold">
                        <FormattedMessage
                          id="keyset.detail.table.paymentAddress"
                          defaultMessage="Payment address"
                        />
                      </th>
                      <th className="text-right p-2 font-semibold">
                        <FormattedMessage
                          id="keyset.detail.table.sum"
                          defaultMessage="Sum"
                        />
                      </th>
                      <th className="text-right p-2 font-semibold"></th>
                    </tr>
                  </thead>
                  <tbody>
                    {matchingQuotes.map((quote) => {
                      const quoteIndex = allQuotes.findIndex(
                        (q) => q.id === quote.id,
                      );
                      const quoteDetails =
                        quoteDetailsQueries[quoteIndex]?.data;
                      const billId = quoteDetails?.bill?.id;
                      const ebill = billId
                        ? billIdToEbillMap.get(billId)
                        : null;
                      const billIdIndex = billId
                        ? matchingBillIds.indexOf(billId)
                        : -1;
                      const mintCompleteQuery =
                        billId && billIdIndex >= 0
                          ? mintCompleteQueries[billIdIndex]
                          : null;

                      return (
                        <KeysetQuoteTableRow
                          key={quote.id}
                          quote={quote}
                          quoteDetails={quoteDetails}
                          ebill={ebill}
                          mintCompleteQuery={mintCompleteQuery ?? null}
                          keysetId={keysetId}
                        />
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">
              <FormattedMessage
                id="keyset.detail.noQuotes"
                defaultMessage="No quotes available"
              />
            </p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

export default function KeysetDetailPage() {
  const { keysetId } = useParams<{ keysetId: string }>();
  const location = useLocation();
  const state = location.state as LocationState | null;
  const fromPath = state?.from;
  const fromQuote = fromPath?.startsWith("/quotes/");
  const quoteId = fromQuote && fromPath ? fromPath.split("/quotes/")[1] : null;

  if (!keysetId) {
    return (
      <div className="p-4">
        <Card>
          <CardContent className="pt-6">
            <p className="text-muted-foreground">
              <FormattedMessage
                id="keyset.detail.invalidId"
                defaultMessage="Invalid keyset ID"
              />
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <>
      <Breadcrumbs
        parents={[
          <BreadcrumbLink
            key="keysets"
            asChild
          >
            <Link to="/keysets">
              <FormattedMessage
                id="keysets.page.title"
                defaultMessage="Keysets"
              />
            </Link>
          </BreadcrumbLink>,
        ]}
      >
        {keysetId}
      </Breadcrumbs>
      <div className="flex items-center justify-between">
        <PageTitle>
          <FormattedMessage
            id="keyset.detail.title"
            defaultMessage="Keyset {id}"
            values={{
              id: (
                <span className="font-mono">
                  {truncateString(keysetId, 16)}
                </span>
              ),
            }}
          />
        </PageTitle>
        {fromQuote && quoteId && (
          <Button
            variant="outline"
            size="sm"
            asChild
          >
            <Link
              to={`/quotes/${quoteId}`}
              state={{ from: `/keysets/${keysetId}` }}
            >
              <FormattedMessage
                id="keyset.detail.backToQuote"
                defaultMessage="Back to quote {id}"
                values={{
                  id: (
                    <span className="font-mono">
                      {truncateString(quoteId, 16)}
                    </span>
                  ),
                }}
              />
            </Link>
          </Button>
        )}
      </div>
      <PageBody keysetId={keysetId} />
    </>
  );
}
