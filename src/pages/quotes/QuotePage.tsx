import { toast } from "@bitcredit/ui-library";
import { Breadcrumbs } from "@/components/Breadcrumbs";
import { PageTitle } from "@/components/PageTitle";
import { Button } from "@bitcredit/ui-library";
import { Skeleton } from "@bitcredit/ui-library";
import { TruncatedTextPopover } from "@bitcredit/ui-library";
import { getQuoteOptions } from "@/generated/client/@tanstack/react-query.gen";
import { getEbillAttachment } from "@/generated/client/sdk.gen";
import { useQuery } from "@tanstack/react-query";
import { useParams, Link, useLocation } from "react-router";
import { BreadcrumbLink } from "@/components/ui/breadcrumb";
import { QuoteActions } from "./QuoteActions";
import { truncateString } from "@/utils/strings";
import { EndorsementChain } from "@/components/EndorsementChain";
import { serializeKeysetId } from "@/utils/keyset";
import { useIntl } from "react-intl";
import { useEffect, useRef, useState } from "react";
import { getApiErrorMessage } from "@/lib/api-error";
import { QuoteDocuments } from "./QuoteDocuments";
import { useQuoteDetail } from "@/hooks/use-quote-detail";
import { QuoteDetailCard } from "./components/QuoteDetailCard";

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
const QUOTE_POLLING_TERMINAL_STATUSES = new Set(["Denied", "Rejected", "Canceled", "MintingEnabled"]);

function PageBody({ id }: { id: string }) {
  const intl = useIntl();
  const [openingDocumentName, setOpeningDocumentName] = useState<string | null>(null);

  const blobUrlTimerRef = useRef<number | null>(null);

  useEffect(() => {
    return () => {
      if (blobUrlTimerRef.current !== null) {
        clearTimeout(blobUrlTimerRef.current);
      }
    };
  }, []);

  const {
    quoteData,
    isFetching,
    error,
    isLoading,
    ebill,
    endorsementsQuery,
    effectiveQuoteStatus,
    isMintComplete,
    isMintCompleteLoading,
    feeToken,
    feeTokenStatusData,
    isFeeTokenStatusPending,
    isFeeTokenStatusError,
    ebillPaid,
    requestedToPay,
    rejectedToPay,
    paymentDeadlineTs,
    timeOfRequestToPay,
    isInMempool,
    showPayment,
    documentFiles,
    billId,
  } = useQuoteDetail(id);

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

  const handleOpenDocument = async (fileName: string) => {
    if (!billId || !fileName || openingDocumentName) {
      return;
    }

    setOpeningDocumentName(fileName);

    try {
      const attachment = await getEbillAttachment({
        path: {
          bid: billId,
          fname: fileName,
        },
        responseStyle: "data",
        parseAs: "blob",
      });

      if (!(attachment instanceof Blob)) {
        throw new Error(
          intl.formatMessage({
            id: "quotes.documents.invalidResponse",
            defaultMessage: "Document attachment could not be opened.",
          })
        );
      }

      const blobUrl = window.URL.createObjectURL(attachment);
      const openedWindow = window.open(blobUrl, "_blank", "noopener,noreferrer");

      if (!openedWindow) {
        const link = document.createElement("a");
        link.href = blobUrl;
        link.target = "_blank";
        link.rel = "noopener noreferrer";
        link.click();
      }

      if (blobUrlTimerRef.current !== null) {
        clearTimeout(blobUrlTimerRef.current);
      }
      blobUrlTimerRef.current = window.setTimeout(() => {
        window.URL.revokeObjectURL(blobUrl);
        blobUrlTimerRef.current = null;
      }, 60_000);
    } catch (error) {
      toast({
        title: intl.formatMessage({
          id: "quotes.documents.openError",
          defaultMessage: "Failed to open document",
        }),
        description: getApiErrorMessage(error),
        variant: "error",
      });
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

  const quoteStatusValue = quote.status as string;

  return (
    <div className="flex flex-col gap-4">
      <QuoteDetailCard
        quote={quote}
        effectiveQuoteStatus={effectiveQuoteStatus}
        ebillPaid={ebillPaid}
        isMintComplete={isMintComplete}
        isMintCompleteLoading={isMintCompleteLoading}
        showPayment={showPayment}
        rejectedToPay={rejectedToPay}
        isInMempool={isInMempool}
        requestedToPay={requestedToPay}
        feeToken={feeToken}
        isFeeTokenStatusPending={isFeeTokenStatusPending}
        feeTokenStatusData={feeTokenStatusData}
        isFeeTokenStatusError={isFeeTokenStatusError}
      />

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
        <QuoteDocuments documents={documentFiles} openingDocumentName={openingDocumentName} onOpenDocument={handleOpenDocument} />

        <EndorsementChain
          endorsements={endorsementsQuery.data}
          isLoading={endorsementsQuery.isLoading}
          issueDate={ebill?.data?.issue_date}
          maturityDate={bill.maturity_date}
          requestToPayTimestamp={ebill?.status?.payment?.time_of_request_to_pay ?? undefined}
          rejectedToPayTimestamp={ebill?.status?.payment?.rejected_to_pay ? (ebill?.status?.last_block_time ?? undefined) : undefined}
          paymentTimestamp={ebill?.status?.payment?.paid ? (ebill?.status?.last_block_time ?? undefined) : undefined}
          acceptanceTimestamp={
            ebill?.status?.acceptance?.accepted ? (ebill?.status?.acceptance?.time_of_request_to_accept ?? undefined) : undefined
          }
          rejectionTimestamp={ebill?.status?.acceptance?.rejected_to_accept ? (ebill?.status?.last_block_time ?? undefined) : undefined}
          mintingEnabled={quoteStatusValue === "MintingEnabled"}
          quoteOffered={quoteStatusValue === "Offered" || effectiveQuoteStatus === "Accepted" || quoteStatusValue === "MintingEnabled"}
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
  const keysetIdFromState = fromKeyset && fromPath ? fromPath.split("/keysets/")[1] : null;

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

      return QUOTE_POLLING_TERMINAL_STATUSES.has(status) ? false : QUOTE_STATUS_POLL_INTERVAL_MS;
    },
    refetchIntervalInBackground: true,
  });

  const quoteDataStatus = quoteData?.status as string | undefined;
  const hasKeysetId = quoteData && (quoteDataStatus === "Accepted" || quoteDataStatus === "MintingEnabled") && "keyset_id" in quoteData;

  return (
    <>
      <Breadcrumbs
        parents={[
          <BreadcrumbLink key="quotes" asChild>
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
          <span className="inline-flex items-baseline gap-1 whitespace-nowrap">
            <span>
              {intl.formatMessage({
                id: "quotes.detail.title",
                defaultMessage: "Quote",
              })}
            </span>
            <TruncatedTextPopover text={quoteId} maxLength={16} className="inline font-mono" as="span" />
          </span>
        </PageTitle>
        {fromKeyset && keysetIdFromState ? (
          <Button variant="outline" size="sm" asChild>
            <Link
              to={`/keysets/${keysetIdFromState}`}
              state={{ from: `/quotes/${quoteId}` }}
              className="inline-flex items-center gap-1 leading-none"
            >
              <span className="relative top-px leading-none">
                {intl.formatMessage({
                  id: "quotes.detail.backToKeyset",
                  defaultMessage: "Back to keyset",
                })}
              </span>
              <span className="inline-flex items-center font-mono leading-none">{truncateString(keysetIdFromState, 16)}</span>
            </Link>
          </Button>
        ) : hasKeysetId ? (
          <Button variant="outline" size="sm" asChild>
            <Link
              to={`/keysets/${serializeKeysetId(quoteData.keyset_id)}`}
              state={{ from: `/quotes/${quoteId}` }}
              className="inline-flex items-center gap-1 leading-none"
            >
              <span className="relative top-px leading-none">
                {intl.formatMessage({
                  id: "quotes.detail.goToKeyset",
                  defaultMessage: "Go to keyset",
                })}
              </span>
              <span className="inline-flex items-center font-mono leading-none">
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
