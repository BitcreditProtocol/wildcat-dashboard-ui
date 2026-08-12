import { toast, Heading } from "@bitcredit/ui-library";
import { Breadcrumbs } from "@/components/Breadcrumbs";
import { Button } from "@bitcredit/ui-library";
import { Skeleton } from "@bitcredit/ui-library";
import { TruncatedTextPopover } from "@bitcredit/ui-library";
import { getQuoteOptions } from "@/generated/client/@tanstack/react-query.gen";
import { getEbillAttachment, getEbillFileFromRequestToMint } from "@/generated/client/sdk.gen";
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
import { type CreditEvidenceState, QuoteDocuments } from "./QuoteDocuments";
import { type QuoteDocument, useQuoteDetail } from "@/hooks/use-quote-detail";
import { QuoteDetailCard } from "./components/QuoteDetailCard";
import { EndorseeList } from "./components/EndorseeList";
import type { InfoReply } from "@/generated/client/types.gen";
import NotFoundPage from "@/pages/NotFoundPage";
import { QuoteCreditAssessment } from "@/pages/credit/QuoteCreditAssessment";
import { useCreditAssessmentForBill } from "@/pages/credit/use-credit-assessment";

interface LocationState {
  from?: string;
}

function getLocationState(value: unknown): LocationState | null {
  if (!value || typeof value !== "object") {
    return null;
  }

  const { from } = value as { from?: unknown };
  return typeof from === "string" ? { from } : {};
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
const QUOTE_ID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function PageBody({ id }: { id: string }) {
  const intl = useIntl();
  const [openingDocumentHash, setOpeningDocumentHash] = useState<string | null>(null);

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
    historyBlocks,
    isHistoryLoading,
    effectiveQuoteStatus,
    isMintComplete,
    isMintCompleteLoading,
    ebillPaid,
    requestedToPay,
    rejectedToPay,
    paymentDeadlineTs,
    timeOfRequestToPay,
    isInMempool,
    showPayment,
    billAttachmentDocuments,
    requestToMintDocuments,
    billId,
  } = useQuoteDetail(id);
  const creditAssessment = useCreditAssessmentForBill(billId);
  const creditEvidence: CreditEvidenceState = creditAssessment.isLoading
    ? { status: "loading" }
    : creditAssessment.error !== null
      ? { status: "unavailable" }
      : creditAssessment.isAbsent
        ? { status: "absent" }
        : creditAssessment.decisionCase === undefined
          ? { status: "unavailable" }
          : {
              status: "available",
              submittedEvidence: creditAssessment.decisionCase.submittedEvidence ?? [],
              evidencePackets: creditAssessment.decisionCase.evidencePackets ?? [],
            };

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

  const handleOpenDocument = async (documentFile: QuoteDocument) => {
    if (!documentFile.name || openingDocumentHash) {
      return;
    }

    setOpeningDocumentHash(documentFile.hash);

    try {
      let resolvedAttachment: unknown;

      if (documentFile.source === "billAttachment") {
        if (!billId) {
          throw new Error(
            intl.formatMessage({
              id: "quotes.documents.invalidResponse",
              defaultMessage: "Document attachment could not be opened.",
            })
          );
        }

        const resolvedBillId: string = billId;
        resolvedAttachment = await getEbillAttachment({
          path: {
            bid: resolvedBillId,
            fname: documentFile.name,
          },
          responseStyle: "data",
          parseAs: "blob",
        });
      } else {
        const resolvedFileUrl = documentFile.fileUrl;
        if (!resolvedFileUrl) {
          throw new Error(
            intl.formatMessage({
              id: "quotes.documents.invalidResponse",
              defaultMessage: "Document attachment could not be opened.",
            })
          );
        }

        resolvedAttachment = await getEbillFileFromRequestToMint({
          query: {
            file_url: resolvedFileUrl,
          },
          responseStyle: "data",
          parseAs: "blob",
        });
      }

      if (!(resolvedAttachment instanceof Blob)) {
        throw new Error(
          intl.formatMessage({
            id: "quotes.documents.invalidResponse",
            defaultMessage: "Document attachment could not be opened.",
          })
        );
      }

      const blobUrl = window.URL.createObjectURL(resolvedAttachment);
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
      setOpeningDocumentHash(null);
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
      />

      <QuoteCreditAssessment billId={bill.id} />

      <QuoteDocuments
        billAttachments={billAttachmentDocuments}
        requestToMintFiles={requestToMintDocuments}
        creditEvidence={creditEvidence}
        openingDocumentHash={openingDocumentHash}
        onOpenDocument={handleOpenDocument}
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
        <EndorsementChain historyBlocks={historyBlocks} isLoading={isHistoryLoading} maturityDate={bill.maturity_date} />

        <EndorseeList payee={bill.payee} endorsees={bill.endorsees} />
      </div>
    </div>
  );
}

export default function QuotePage() {
  const intl = useIntl();
  const params = useParams();
  const id = typeof params.id === "string" ? params.id : undefined;
  const quoteId = id ?? "";
  const validQuoteId = QUOTE_ID_PATTERN.test(quoteId);
  const location = useLocation();
  const state = getLocationState(location.state);
  const fromPath = state?.from;
  const fromKeyset = fromPath?.startsWith("/keysets/");
  const keysetIdFromState = fromKeyset && fromPath ? fromPath.split("/keysets/")[1] : null;

  const { data: quoteData } = useQuery({
    ...getQuoteOptions({
      path: { qid: quoteId },
    }),
    retry: 1,
    refetchInterval: (query: { state: { data?: InfoReply } }) => {
      if (!validQuoteId) {
        return false;
      }

      const status = query.state.data?.status;
      if (!status) {
        return QUOTE_STATUS_POLL_INTERVAL_MS;
      }

      return QUOTE_POLLING_TERMINAL_STATUSES.has(status) ? false : QUOTE_STATUS_POLL_INTERVAL_MS;
    },
    refetchIntervalInBackground: true,
    enabled: validQuoteId,
  });

  if (!validQuoteId) {
    return <NotFoundPage path={`/quotes/${quoteId}`} />;
  }

  const quoteDataStatus = quoteData?.status;
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

      <div className="flex flex-col gap-3 mb-4 sm:mb-0 sm:flex-row sm:items-center sm:justify-between">
        <Heading as="h1" variant="page" className="mb-2 sm:mb-6 pt-4">
          <span className="inline-flex items-baseline gap-1 whitespace-nowrap">
            <span>
              {intl.formatMessage({
                id: "quotes.detail.title",
                defaultMessage: "Quote",
              })}
            </span>
            <TruncatedTextPopover text={quoteId} maxLength={16} className="inline font-mono" as="span" />
          </span>
        </Heading>
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
