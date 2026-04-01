import { Breadcrumbs } from "@/components/Breadcrumbs";
import { PageTitle } from "@/components/PageTitle";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import {
  ParticipantsOverviewCard,
  ParticipantDetail,
} from "@/components/ParticipantsOverview";
import {
  getQuoteOptions,
  listEbillsOptions,
  getEbillEndorsementsOptions,
  getEbillMintCompleteOptions,
  postTokenStatusMutation,
} from "@/generated/client/@tanstack/react-query.gen";
import { useMutation, useQuery } from "@tanstack/react-query";
import { useParams, Link, useLocation } from "react-router";
import type { InfoReplyDiscriminants } from "@/generated/client/types.gen";
import { humanReadableDurationDays } from "@/utils/dates";
import { BreadcrumbLink } from "@/components/ui/breadcrumb";
import { QuoteActions } from "./QuoteActions.tsx";
import { truncateString, formatStatusLabel } from "@/utils/strings.ts";
import {
  getEffectiveQuoteStatus,
  getQuoteStatusVariant,
} from "@/utils/quote-status";
import { TruncatedTextPopover } from "@/components/TruncatedTextPopover.tsx";
import { EndorsementChain } from "@/components/EndorsementChain";
import { FeeTokenQRCodeModal } from "@/components/QRCodeWithErrorBoundary";
import { serializeKeysetId } from "@/utils/keyset";
import { useIntl } from "react-intl";
import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { getApiErrorMessage } from "@/lib/api-error";
import { client } from "@/lib/api-client";
import { QuoteDocuments } from "./QuoteDocuments";

interface LocationState {
  from?: string;
}

function Loader() {
  return (
    <div className="flex flex-col gap-1.5 py-2">
      <Skeleton className="h-48 rounded-lg" />
    </div>
  );
}

const QUOTE_STATUS_POLL_INTERVAL_MS = 10_000;
const QUOTE_DETAIL_POLL_INTERVAL_MS = 10_000;
const QUOTE_POLLING_TERMINAL_STATUSES = new Set([
  "Denied",
  "Rejected",
  "Canceled",
  "MintingEnabled",
]);

function PageBody({ id }: { id: string }) {
  const intl = useIntl();
  const {
    data: quoteData,
    isFetching,
    error,
    isLoading,
  } = useQuery({
    ...getQuoteOptions({
      path: { qid: id },
    }),
    retry: 1,
    refetchInterval: (query) => {
      const status = query.state.data?.status as string | undefined;
      if (!status) {
        return QUOTE_STATUS_POLL_INTERVAL_MS;
      }

      return QUOTE_POLLING_TERMINAL_STATUSES.has(status)
        ? false
        : QUOTE_STATUS_POLL_INTERVAL_MS;
    },
    refetchIntervalInBackground: true,
  });

  const billId = quoteData?.bill?.id;

  const ebillsQuery = useQuery({
    ...listEbillsOptions(),
    retry: 1,
    enabled: !!billId,
    refetchInterval: (query) => {
      if (query.state.error) return false;
      const ebill = (query.state.data ?? []).find((item) => item.id === billId);
      return ebill?.status?.payment?.paid
        ? false
        : QUOTE_DETAIL_POLL_INTERVAL_MS;
    },
    refetchIntervalInBackground: true,
  });

  const endorsementsQuery = useQuery({
    ...getEbillEndorsementsOptions({ path: { bid: billId ?? "" } }),
    retry: 1,
    enabled: !!billId,
    refetchInterval: QUOTE_DETAIL_POLL_INTERVAL_MS,
    refetchIntervalInBackground: true,
  });

  const ebill = ebillsQuery.data?.find((item) => item.id === billId);
  const effectiveQuoteStatus = getEffectiveQuoteStatus(
    (quoteData?.status as InfoReplyDiscriminants | undefined) ?? "Pending",
    ebill,
  );
  const isPaid = ebill?.status?.payment?.paid === true;
  const shouldCheckMintComplete =
    effectiveQuoteStatus === "Accepted" ||
    effectiveQuoteStatus === "MintingEnabled" ||
    isPaid;

  const feeTokenRequestRef = useRef<string | null>(null);
  const [openingDocumentName, setOpeningDocumentName] = useState<string | null>(
    null,
  );

  const {
    mutate: requestFeeTokenStatus,
    isPending: isFeeTokenStatusPending,
    isSuccess: isFeeTokenStatusSuccess,
    isError: isFeeTokenStatusError,
    data: feeTokenStatusData,
  } = useMutation({
    ...postTokenStatusMutation(),
    retry: 5,
    onError: (error) => {
      const message = getApiErrorMessage(error);
      toast.error(
        intl.formatMessage(
          {
            id: "quotes.feeToken.check.error",
            defaultMessage: "Failed to check fee token: {error}",
          },
          { error: message },
        ),
      );
      feeTokenRequestRef.current = null;
    },
  });

  const mintCompleteQuery = useQuery({
    ...getEbillMintCompleteOptions({ path: { bid: billId ?? "" } } as never),
    retry: 1,
    enabled: !!billId && shouldCheckMintComplete,
    refetchInterval: (query) => {
      if (!shouldCheckMintComplete) {
        return false;
      }

      const data = query.state.data;
      return data?.complete === false ? 60000 : false;
    },
  });

  const feeTokenFromQuote =
    quoteData && "fee" in quoteData ? quoteData.fee : null;
  const quoteStatusForEffect = effectiveQuoteStatus;

  useEffect(() => {
    if (!feeTokenFromQuote || quoteStatusForEffect !== "MintingEnabled") {
      return;
    }

    if (feeTokenRequestRef.current === feeTokenFromQuote) {
      return;
    }

    if (isFeeTokenStatusPending || isFeeTokenStatusSuccess) {
      return;
    }

    feeTokenRequestRef.current = feeTokenFromQuote;
    requestFeeTokenStatus({
      body: { token: feeTokenFromQuote },
    });
  }, [
    feeTokenFromQuote,
    isFeeTokenStatusPending,
    isFeeTokenStatusSuccess,
    quoteStatusForEffect,
    requestFeeTokenStatus,
  ]);

  if (error) {
    const errorMessage = getApiErrorMessage(error);
    return (
      <div className="flex flex-col gap-4 p-4 bg-red-50 border border-red-200 rounded-lg">
        <div className="text-red-800 font-semibold">
          {intl.formatMessage({
            id: "quotes.error.loadQuote.title",
            defaultMessage: "Failed to load quote",
          })}
        </div>
        <div className="text-red-600 text-sm">
          {errorMessage ||
            intl.formatMessage({
              id: "quotes.error.unknown",
              defaultMessage: "Unknown error occurred",
            })}
        </div>
        <div className="text-xs text-red-500">
          {intl.formatMessage({
            id: "quotes.error.checkApi",
            defaultMessage: "Check if the API server is running and accessible",
          })}
        </div>
      </div>
    );
  }

  if (isLoading) {
    return <Loader />;
  }

  const quote = quoteData!;
  const bill = quote?.bill;
  const quoteStatusValue = quote.status as string;
  const feeToken =
    "fee" in quote && typeof quote.fee === "string" ? quote.fee : null;

  const billStatus = ebill?.status;
  const paymentStatus = billStatus?.payment;
  const cws = ebill?.current_waiting_state;
  const isMintComplete = mintCompleteQuery.data?.complete ?? false;
  const isMintCompleteLoading = mintCompleteQuery.isLoading;
  const ebillPaid = Boolean(paymentStatus?.paid);
  const hasPaymentRequestInWaitingState = Boolean(cws && "Payment" in cws);
  const requestedToPay = Boolean(
    paymentStatus?.requested_to_pay ??
    billStatus?.has_requested_funds ??
    hasPaymentRequestInWaitingState,
  );
  const rejectedToPay = Boolean(paymentStatus?.rejected_to_pay);
  const paymentDeadlineTs = paymentStatus?.payment_deadline_timestamp ?? null;
  const timeOfRequestToPay = paymentStatus?.time_of_request_to_pay ?? null;

  const isInMempool =
    cws && "Payment" in cws && cws.Payment.payment_data?.in_mempool === true;
  const showPayment =
    effectiveQuoteStatus === "Accepted" ||
    effectiveQuoteStatus === "MintingEnabled";
  const documentFiles = ebill?.data?.files ?? [];

  const handleOpenDocument = async (fileName: string) => {
    if (!billId || !fileName || openingDocumentName) {
      return;
    }

    setOpeningDocumentName(fileName);

    try {
      const attachment = await client.get({
        path: {
          bill_id: billId,
          file_name: fileName,
        },
        responseStyle: "data",
        url: "/v1/admin/bill/attachment/{bill_id}/{file_name}",
        parseAs: "blob",
      });

      if (!(attachment instanceof Blob)) {
        throw new Error(
          intl.formatMessage({
            id: "quotes.documents.invalidResponse",
            defaultMessage: "Document attachment could not be opened.",
          }),
        );
      }

      const blobUrl = window.URL.createObjectURL(attachment);
      const openedWindow = window.open(
        blobUrl,
        "_blank",
        "noopener,noreferrer",
      );

      if (!openedWindow) {
        const link = document.createElement("a");
        link.href = blobUrl;
        link.target = "_blank";
        link.rel = "noopener noreferrer";
        link.click();
      }

      window.setTimeout(() => {
        window.URL.revokeObjectURL(blobUrl);
      }, 60_000);
    } catch (error) {
      toast.error(
        intl.formatMessage({
          id: "quotes.documents.openError",
          defaultMessage: "Failed to open document",
        }),
        {
          description: getApiErrorMessage(error),
        },
      );
    } finally {
      setOpeningDocumentName(null);
    }
  };

  if (!quote || !bill) {
    return (
      <div className="p-4 text-muted-foreground">
        {intl.formatMessage({
          id: "quotes.empty.noQuoteData",
          defaultMessage: "No quote data available",
        })}
      </div>
    );
  }

  const maturityDate = bill.maturity_date ? new Date(bill.maturity_date) : null;
  const maturityLabel = maturityDate
    ? humanReadableDurationDays(intl.locale, maturityDate)
    : intl.formatMessage({
        id: "quotes.common.unknown",
        defaultMessage: "Unknown",
      });

  return (
    <div className="flex flex-col gap-4">
      <Card>
        <CardContent className="pt-6">
          <div className="flex flex-col gap-4">
            <div className="flex flex-col gap-2">
              <div className="flex items-center gap-2">
                <span className="text-sm font-semibold w-32">
                  {intl.formatMessage({
                    id: "quotes.detail.quoteId",
                    defaultMessage: "Quote ID:",
                  })}
                </span>
                <span className="font-mono text-sm">{quote.id}</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-sm font-semibold w-32">
                  {intl.formatMessage({
                    id: "quotes.detail.billId",
                    defaultMessage: "Bill ID:",
                  })}
                </span>
                <span className="font-mono text-sm">{quote.bill.id}</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-sm font-semibold w-32">
                  {intl.formatMessage({
                    id: "quotes.detail.status",
                    defaultMessage: "Quote status:",
                  })}
                </span>
                <Badge variant={getQuoteStatusVariant(effectiveQuoteStatus)}>
                  {intl.formatMessage({
                    id: `quote.status.${effectiveQuoteStatus}`,
                    defaultMessage: formatStatusLabel(effectiveQuoteStatus),
                  })}
                </Badge>
              </div>
              {ebillPaid && (
                <div className="flex items-center gap-2">
                  <span className="text-sm font-semibold w-32">
                    {intl.formatMessage({
                      id: "quotes.detail.redemptionStatus",
                      defaultMessage: "Redemption status:",
                    })}
                  </span>
                  {isMintCompleteLoading ? (
                    <Badge
                      variant="default"
                      className="bg-yellow-500"
                    >
                      {intl.formatMessage({
                        id: "quotes.redemption.pending",
                        defaultMessage: "Pending",
                      })}
                    </Badge>
                  ) : (
                    <Badge
                      variant="default"
                      className={
                        isMintComplete ? "bg-green-600" : "bg-yellow-500"
                      }
                    >
                      {isMintComplete
                        ? intl.formatMessage({
                            id: "quotes.redemption.complete",
                            defaultMessage: "Complete",
                          })
                        : intl.formatMessage({
                            id: "quotes.redemption.pending",
                            defaultMessage: "Pending",
                          })}
                    </Badge>
                  )}
                </div>
              )}

              {quote.status === "Offered" && "ttl" in quote && quote.ttl && (
                <div className="flex items-center gap-2">
                  <span className="text-sm font-semibold w-32">
                    {intl.formatMessage({
                      id: "quotes.detail.deadline",
                      defaultMessage: "Deadline:",
                    })}
                  </span>
                  <span>{new Date(quote.ttl).toISOString().split("T")[0]}</span>
                </div>
              )}
              {showPayment && (
                <div className="flex items-center gap-2">
                  <span className="text-sm font-semibold w-32">
                    {intl.formatMessage({
                      id: "quotes.detail.payment",
                      defaultMessage: "Payment status:",
                    })}
                  </span>
                  {ebillPaid ? (
                    <Badge
                      variant="default"
                      className="bg-green-600"
                    >
                      {intl.formatMessage({
                        id: "quotes.payment.paid",
                        defaultMessage: "Paid",
                      })}
                    </Badge>
                  ) : rejectedToPay ? (
                    <Badge
                      variant="destructive"
                      className="bg-red-600"
                    >
                      {intl.formatMessage({
                        id: "quotes.payment.rejected",
                        defaultMessage: "Rejected to pay",
                      })}
                    </Badge>
                  ) : isInMempool ? (
                    <Badge
                      variant="default"
                      className="bg-orange-500"
                    >
                      {intl.formatMessage({
                        id: "quotes.payment.inMempool",
                        defaultMessage: "In mempool",
                      })}
                    </Badge>
                  ) : !requestedToPay ? (
                    <Badge
                      variant="secondary"
                      className="border border-border"
                    >
                      {intl.formatMessage({
                        id: "quotes.payment.notRequested",
                        defaultMessage: "Not requested",
                      })}
                    </Badge>
                  ) : (
                    <Badge
                      variant="default"
                      className="bg-blue-500"
                    >
                      {intl.formatMessage({
                        id: "quotes.payment.requested",
                        defaultMessage: "Requested",
                      })}
                    </Badge>
                  )}
                </div>
              )}
            </div>
            <div className="flex items-center gap-2">
              <span className="text-sm font-semibold w-32">
                {intl.formatMessage({
                  id: "quotes.detail.sum",
                  defaultMessage: "Sum:",
                })}
              </span>
              <span className="text-lg font-bold">{bill.sum} sat</span>
            </div>
            {"discounted" in quote && quote.discounted && (
              <>
                <div className="flex items-center gap-2">
                  <span className="text-sm font-semibold w-32">
                    {intl.formatMessage({
                      id: "quotes.detail.discounted",
                      defaultMessage: "Fee:",
                    })}
                  </span>
                  <span className="text-lg font-bold">
                    {quote.discounted} sat
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-sm font-semibold w-32">
                    {intl.formatMessage({
                      id: "quotes.detail.discount.absolute",
                      defaultMessage: "Effective fee (absolute):",
                    })}
                  </span>
                  <span className="text-sm font-mono">
                    {bill.sum - quote.discounted} sat
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-sm font-semibold w-32">
                    {intl.formatMessage({
                      id: "quotes.detail.discount.relative",
                      defaultMessage: "Effective fee (relative):",
                    })}
                  </span>
                  <span className="text-sm font-mono">
                    {(((bill.sum - quote.discounted) / bill.sum) * 100).toFixed(
                      4,
                    )}
                    %
                  </span>
                </div>
              </>
            )}
            {quote.status === "MintingEnabled" && feeToken && (
              <div className="flex items-center gap-2">
                <span className="text-sm font-semibold w-32">
                  {intl.formatMessage({
                    id: "quotes.detail.feeToken",
                    defaultMessage: "Fee token:",
                  })}
                </span>
                <TruncatedTextPopover
                  text={feeToken}
                  maxLength={64}
                  className="font-mono text-sm"
                  showCopyButton={true}
                />
                <FeeTokenQRCodeModal feeToken={feeToken} />
                {isFeeTokenStatusPending ? (
                  <Badge
                    variant="default"
                    className="bg-gray-500"
                  >
                    {intl.formatMessage({
                      id: "quotes.feeToken.badge.checking",
                      defaultMessage: "Checking...",
                    })}
                  </Badge>
                ) : feeTokenStatusData?.state === "Spent" ? (
                  <Badge
                    variant="destructive"
                    className="bg-red-600"
                  >
                    {intl.formatMessage({
                      id: "quotes.feeToken.badge.spent",
                      defaultMessage: "Spent",
                    })}
                  </Badge>
                ) : feeTokenStatusData?.state === "Unspent" ? (
                  <Badge
                    variant="default"
                    className="bg-green-600"
                  >
                    {intl.formatMessage({
                      id: "quotes.feeToken.badge.active",
                      defaultMessage: "Active",
                    })}
                  </Badge>
                ) : isFeeTokenStatusError ? (
                  <Badge
                    variant="destructive"
                    className="bg-red-600"
                  >
                    {intl.formatMessage({
                      id: "quotes.feeToken.badge.error",
                      defaultMessage: "Error",
                    })}
                  </Badge>
                ) : feeTokenStatusData?.state ? (
                  <Badge
                    variant="secondary"
                    className="border border-border"
                  >
                    {intl.formatMessage({
                      id: "quotes.feeToken.badge.unknown",
                      defaultMessage: "Unknown",
                    })}
                  </Badge>
                ) : null}
              </div>
            )}
            <div className="flex items-center gap-2">
              <span className="text-sm font-semibold w-32">
                {intl.formatMessage({
                  id: "quotes.detail.maturityDate",
                  defaultMessage: "Maturity date:",
                })}
              </span>
              <span className="text-sm">
                {bill.maturity_date} ({maturityLabel})
              </span>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-sm font-semibold w-32">
                {intl.formatMessage({
                  id: "quotes.detail.participants",
                  defaultMessage: "Participants:",
                })}
              </span>
              <ParticipantsOverviewCard
                drawee={bill.drawee}
                drawer={bill.drawer}
                payee={bill.payee}
                holder={bill.endorsees}
              />
            </div>
            <div className="flex items-center gap-2">
              <span className="text-sm font-semibold w-32">
                {intl.formatMessage({
                  id: "participants.role.drawee",
                  defaultMessage: "Drawee",
                })}
                :
              </span>
              <ParticipantDetail participant={bill.drawee} />
            </div>
            <div className="flex items-center gap-2">
              <span className="text-sm font-semibold w-32">
                {intl.formatMessage({
                  id: "participants.role.drawer",
                  defaultMessage: "Drawer",
                })}
                :
              </span>
              <ParticipantDetail participant={bill.drawer} />
            </div>
            <div className="flex items-center gap-2">
              <span className="text-sm font-semibold w-32">
                {intl.formatMessage({
                  id: "participants.role.payee",
                  defaultMessage: "Payee",
                })}
                :
              </span>
              <ParticipantDetail participant={bill.payee} />
            </div>

            {bill.endorsees && bill.endorsees.length > 0 && (
              <span className="flex items-center gap-2">
                <span className="text-sm font-semibold w-32">
                  {intl.formatMessage({
                    id: "participants.role.holder",
                    defaultMessage: "Holder",
                  })}
                  :
                </span>
                <ParticipantDetail
                  participant={bill.endorsees[bill.endorsees.length - 1]}
                />
              </span>
            )}
          </div>
        </CardContent>
      </Card>

      <QuoteActions
        value={quote}
        isFetching={isFetching}
        ebillPaid={ebillPaid}
        isMintComplete={isMintComplete}
        requestedToPay={requestedToPay}
        paymentDeadlineTs={paymentDeadlineTs}
        timeOfRequestToPay={timeOfRequestToPay}
      />

      <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)] lg:items-start">
        <QuoteDocuments
          documents={documentFiles}
          openingDocumentName={openingDocumentName}
          onOpenDocument={handleOpenDocument}
        />

        <EndorsementChain
          endorsements={endorsementsQuery.data}
          isLoading={endorsementsQuery.isLoading}
          issueDate={ebill?.data?.issue_date}
          maturityDate={bill.maturity_date}
          requestToPayTimestamp={
            ebill?.status?.payment?.time_of_request_to_pay ?? undefined
          }
          rejectedToPayTimestamp={
            ebill?.status?.payment?.rejected_to_pay
              ? (ebill?.status?.last_block_time ?? undefined)
              : undefined
          }
          paymentTimestamp={
            ebill?.status?.payment?.paid
              ? (ebill?.status?.last_block_time ?? undefined)
              : undefined
          }
          acceptanceTimestamp={
            ebill?.status?.acceptance?.accepted
              ? (ebill?.status?.acceptance?.time_of_request_to_accept ??
                undefined)
              : undefined
          }
          rejectionTimestamp={
            ebill?.status?.acceptance?.rejected_to_accept
              ? (ebill?.status?.last_block_time ?? undefined)
              : undefined
          }
          mintingEnabled={quoteStatusValue === "MintingEnabled"}
          quoteOffered={
            quoteStatusValue === "Offered" ||
            effectiveQuoteStatus === "Accepted" ||
            quoteStatusValue === "MintingEnabled"
          }
          offeredTimestamp={
            "submitted" in quote
              ? Math.floor(new Date(quote.submitted).getTime() / 1000)
              : "tstamp" in quote
                ? Math.floor(new Date(quote.tstamp).getTime() / 1000)
                : undefined
          }
        />
      </div>
    </div>
  );
}

export default function QuotePage() {
  const intl = useIntl();
  const { id } = useParams();
  const quoteId = id ?? "";
  const location = useLocation();
  const state = location.state as LocationState | null;
  const fromPath = state?.from;
  const fromKeyset = fromPath?.startsWith("/keysets/");
  const keysetIdFromState =
    fromKeyset && fromPath ? fromPath.split("/keysets/")[1] : null;

  const { data: quoteData } = useQuery({
    ...getQuoteOptions({
      path: { qid: quoteId },
    }),
    retry: 1,
    refetchInterval: (query) => {
      const status = query.state.data?.status as string | undefined;
      if (!status) {
        return QUOTE_STATUS_POLL_INTERVAL_MS;
      }

      return QUOTE_POLLING_TERMINAL_STATUSES.has(status)
        ? false
        : QUOTE_STATUS_POLL_INTERVAL_MS;
    },
    refetchIntervalInBackground: true,
  });

  const quoteDataStatus = quoteData?.status as string | undefined;
  const hasKeysetId =
    quoteData &&
    (quoteDataStatus === "Accepted" || quoteDataStatus === "MintingEnabled") &&
    "keyset_id" in quoteData;

  return (
    <>
      <Breadcrumbs
        parents={[
          <BreadcrumbLink
            key="quotes"
            asChild
          >
            <Link to="/quotes">
              {intl.formatMessage({
                id: "quotes.breadcrumb",
                defaultMessage: "Quotes",
              })}
            </Link>
          </BreadcrumbLink>,
        ]}
      >
        {quoteId}
      </Breadcrumbs>

      <div className="flex items-center justify-between">
        <PageTitle>
          {intl.formatMessage({
            id: "quotes.detail.title",
            defaultMessage: "Quote",
          })}{" "}
          <span className="font-mono">{truncateString(quoteId, 16)}</span>
        </PageTitle>
        {fromKeyset && keysetIdFromState ? (
          <Button
            variant="outline"
            size="sm"
            asChild
          >
            <Link
              to={`/keysets/${keysetIdFromState}`}
              state={{ from: `/quotes/${quoteId}` }}
            >
              {intl.formatMessage({
                id: "quotes.detail.backToKeyset",
                defaultMessage: "Back to keyset",
              })}{" "}
              <span className="font-mono">
                {truncateString(keysetIdFromState, 16)}
              </span>
            </Link>
          </Button>
        ) : hasKeysetId ? (
          <Button
            variant="outline"
            size="sm"
            asChild
          >
            <Link
              to={`/keysets/${serializeKeysetId(quoteData.keyset_id)}`}
              state={{ from: `/quotes/${quoteId}` }}
            >
              {intl.formatMessage({
                id: "quotes.detail.goToKeyset",
                defaultMessage: "Go to keyset",
              })}{" "}
              <span className="font-mono">
                {truncateString(serializeKeysetId(quoteData.keyset_id), 16)}
              </span>
            </Link>
          </Button>
        ) : null}
      </div>
      <PageBody id={quoteId} />
    </>
  );
}
