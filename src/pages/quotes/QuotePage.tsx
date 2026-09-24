import { toast, AppIcon, cn } from "@bitcredit/ui-library";
import { Breadcrumbs } from "@/components/Breadcrumbs";
import { Button } from "@bitcredit/ui-library";
import { Skeleton } from "@bitcredit/ui-library";
import { RefreshCwIcon } from "lucide-react";
import { getQuoteOptions } from "@/generated/client/@tanstack/react-query.gen";
import { getEbillAttachment, getEbillFileFromRequestToMint } from "@/generated/client/sdk.gen";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useParams, Link, useLocation } from "react-router";
import { BreadcrumbLink } from "@/components/ui/breadcrumb";
import { QuoteActions } from "./QuoteActions";
import { pendingEvidenceQuestionCount } from "@/pages/credit/evidence-review-readiness";
import { buildCaseBrief } from "@/pages/credit/case-brief";
import { truncateString } from "@/utils/strings";
import { EndorsementChain } from "@/components/EndorsementChain";
import { serializeKeysetId } from "@/utils/keyset";
import { useIntl } from "react-intl";
import { useCallback, useEffect, useRef, useState } from "react";
import { getApiErrorMessage } from "@/lib/api-error";
import { beginPdfDownload } from "@/lib/download";
import { authenticatedFetch } from "@/lib/api-client";
import { type CreditEvidenceState, QuoteDocuments } from "./QuoteDocuments";
import { type QuoteDocumentPreview, QuoteDocumentViewer } from "./QuoteDocumentViewer";
import { resolveDocumentMimeType } from "@/utils/document-preview";
import { countAnswerReviewFollowUps, type SubmittedEvidence } from "@/pages/credit/decision-types";
import { type QuoteDocument, useQuoteDetail } from "@/hooks/use-quote-detail";
import { QuoteDetailCard } from "./components/QuoteDetailCard";
import { EndorseeList } from "./components/EndorseeList";
import { useSyncBillChain } from "./components/useSyncBillChain";
import type { InfoReply } from "@/generated/client/types.gen";
import NotFoundPage from "@/pages/NotFoundPage";
import { NoFitExplanation } from "@/pages/credit/CreditAssessmentCard";
import { QuoteCreditAssessment } from "@/pages/credit/QuoteCreditAssessment";
import { useCreditAssessmentForBill } from "@/pages/credit/use-credit-assessment";
import {
  durableAuthorizationReceiptFromQuote,
  reviewInvoiceEvidence,
  type VerifiedAuthorizationReceipt,
} from "@/pages/credit/record-operator-decision";
import { useOperatorCapability } from "@/pages/credit/use-operator-capability";
import { isQuotePollingCompleteStatus } from "@/utils/quote-status";
import { CaseWorkspace } from "./components/CaseWorkspace";
import { InformationNeedsPanel } from "@/pages/credit/InformationNeedsPanel";
import { CaseHistory } from "@/pages/credit/CaseHistory";
import { CasePreparationPanel } from "@/pages/credit/CasePreparationPanel";

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
const QUOTE_ID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function PageBody({ id }: { id: string }) {
  const intl = useIntl();
  const [openingDocumentHash, setOpeningDocumentHash] = useState<string | null>(null);
  const [documentPreview, setDocumentPreview] = useState<QuoteDocumentPreview | null>(null);
  const [openingEvidenceReference, setOpeningEvidenceReference] = useState<string | null>(null);
  const [reviewingEvidenceReference, setReviewingEvidenceReference] = useState<string | null>(null);
  const [signedAuthorizationReceipt, setSignedAuthorizationReceipt] = useState<VerifiedAuthorizationReceipt | null>(null);

  const previewUrlRef = useRef<string | null>(null);
  const blobUrlTimerRef = useRef<number | null>(null);
  const queryClient = useQueryClient();

  const releasePreviewUrl = useCallback(() => {
    if (previewUrlRef.current !== null) {
      window.URL.revokeObjectURL(previewUrlRef.current);
      previewUrlRef.current = null;
    }
  }, []);

  useEffect(() => releasePreviewUrl, [releasePreviewUrl]);

  const handleClosePreview = useCallback(() => {
    setDocumentPreview(null);
    releasePreviewUrl();
  }, [releasePreviewUrl]);

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
    mintOperationStatus,
    isMintOperationLoading,
  } = useQuoteDetail(id);
  const creditAssessment = useCreditAssessmentForBill(billId, id);
  const operatorCapability = useOperatorCapability();
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
              caseId: creditAssessment.decisionCase.snapshot.caseId,
              resultDigest: creditAssessment.decisionCase.resultDigest,
              assessmentCurrency: creditAssessment.decisionCase.assessmentCurrency,
              submittedEvidence: creditAssessment.decisionCase.submittedEvidence ?? [],
              evidencePackets: creditAssessment.decisionCase.evidencePackets ?? [],
              invoiceAssessment: creditAssessment.decisionCase.snapshot.invoice,
              verificationRequests: creditAssessment.decisionCase.result.verificationRequests,
              claimInvestigation: creditAssessment.decisionCase.claimInvestigation,
              interviewTranscript: creditAssessment.decisionCase.interviewTranscript,
              applicantConfirmation: creditAssessment.decisionCase.applicantConfirmation,
              applicantHumanReview: creditAssessment.decisionCase.applicantHumanReview,
              axes: creditAssessment.decisionCase.result.axes,
              caseSummary: {
                answerReviewFollowUpCount: countAnswerReviewFollowUps(
                  creditAssessment.decisionCase.interviewTranscript,
                  creditAssessment.decisionCase.liveInterview,
                  ...(creditAssessment.decisionCase.interviewHistory ?? [])
                ),
                snapshot: {
                  confirmedClaims: creditAssessment.decisionCase.snapshot.confirmedClaims,
                  contradictions: creditAssessment.decisionCase.snapshot.contradictions,
                  bill: creditAssessment.decisionCase.snapshot.bill,
                  invoice: creditAssessment.decisionCase.snapshot.invoice,
                },
                assessmentStatus: creditAssessment.decisionCase.result.assessmentStatus,
                recommendation: creditAssessment.decisionCase.result.recommendation,
                assessmentHistory: creditAssessment.decisionCase.assessmentHistory ?? [],
              },
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
            defaultMessage: "Try again. If the problem continues, contact support.",
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

      releasePreviewUrl();
      const blobUrl = window.URL.createObjectURL(resolvedAttachment);
      previewUrlRef.current = blobUrl;

      setDocumentPreview({
        name: documentFile.name,
        url: blobUrl,
        mimeType: resolveDocumentMimeType(resolvedAttachment.type, documentFile.name),
      });
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

  const handleOpenEvidence = async (evidence: SubmittedEvidence) => {
    if (creditEvidence.status !== "available" || openingEvidenceReference !== null) return;
    setOpeningEvidenceReference(evidence.reference);
    try {
      const response = await authenticatedFetch("/api/ai-credit/workbench-evidence", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ caseId: creditEvidence.caseId, resultDigest: creditEvidence.resultDigest, evidence }),
        cache: "no-store",
        credentials: "same-origin",
        redirect: "error",
        signal: AbortSignal.timeout(15_000),
      });
      if (!response.ok || response.headers.get("content-type") !== "application/pdf") {
        throw new Error(
          intl.formatMessage({ id: "quotes.documents.evidenceOpenError", defaultMessage: "Submitted evidence could not be opened." })
        );
      }
      const blobUrl = beginPdfDownload(await response.blob(), evidence.label);
      if (blobUrlTimerRef.current !== null) clearTimeout(blobUrlTimerRef.current);
      blobUrlTimerRef.current = window.setTimeout(() => {
        window.URL.revokeObjectURL(blobUrl);
        blobUrlTimerRef.current = null;
      }, 60_000);
    } catch (error) {
      toast({
        title: intl.formatMessage({ id: "quotes.documents.openError", defaultMessage: "Failed to open document" }),
        description: getApiErrorMessage(error),
        variant: "error",
      });
    } finally {
      setOpeningEvidenceReference(null);
    }
  };

  const handleReviewInvoiceEvidence = async (evidence: SubmittedEvidence) => {
    if (
      creditEvidence.status !== "available" ||
      creditEvidence.assessmentCurrency !== "current" ||
      billId === undefined ||
      operatorCapability.capability === undefined ||
      reviewingEvidenceReference !== null ||
      !window.confirm(
        intl.formatMessage({
          id: "quotes.documents.confirmInvoiceReview",
          defaultMessage: "Confirm that this invoice matches the current eBill facts? This does not verify commercial truth.",
          description: "Confirmation before recording a Mint operator invoice-to-eBill review",
        })
      )
    ) {
      return;
    }
    setReviewingEvidenceReference(evidence.reference);
    try {
      const result = await reviewInvoiceEvidence(
        {
          billId,
          caseId: creditEvidence.caseId,
          decisionResultDigest: creditEvidence.resultDigest,
          evidence,
        },
        operatorCapability.capability
      );
      if (result.ok) {
        toast({
          title: intl.formatMessage({
            id: "quotes.documents.invoiceReviewRecorded",
            defaultMessage: "Invoice review recorded",
            description: "Toast after a governed invoice review is stored and reassessed",
          }),
        });
        await queryClient.invalidateQueries({ queryKey: ["ai-credit", "decisions"] });
      } else {
        toast({
          title: intl.formatMessage({ id: "quotes.documents.invoiceReviewFailed", defaultMessage: "Invoice review failed" }),
          description: result.error,
          variant: "error",
        });
      }
    } finally {
      setReviewingEvidenceReference(null);
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

  const durableAuthorizationReceipt = durableAuthorizationReceiptFromQuote(quote, quote.id, bill.id);
  const decisionCase = creditAssessment.decisionCase;
  // Agent-prepared cases do not turn every applicant reply into a task for the operator.
  const reviewCount =
    effectiveQuoteStatus !== "Pending"
      ? 0
      : decisionCase?.casePreparation !== undefined
        ? Number(decisionCase.casePreparation.status === "attention")
        : pendingEvidenceQuestionCount(decisionCase);
  const caseBrief = decisionCase === undefined ? undefined : buildCaseBrief(decisionCase, { quoteId: quote.id, now: Date.now() });

  return (
    <div className="mt-4 flex flex-col gap-4">
      <section className="flex flex-col gap-4" id="minting-summary">
        <div className="hidden print:block">
          <h1 className="text-2xl font-semibold">
            {intl.formatMessage({ id: "quotes.summary.title", defaultMessage: "Executive summary" })}
          </h1>
          <p className="text-xs text-muted-foreground">{quote.id}</p>
        </div>
        <QuoteDetailCard
          actions={
            <div className="print:hidden">
              <QuoteActions
                value={quote}
                isFetching={isFetching}
                ebillPaid={ebillPaid}
                isMintComplete={isMintComplete}
                requestedToPay={requestedToPay}
                paymentDeadlineTs={paymentDeadlineTs}
                timeOfRequestToPay={timeOfRequestToPay}
                onAuthorizationVerified={setSignedAuthorizationReceipt}
              />
            </div>
          }
          assessmentUnavailable={creditAssessment.isUnavailable}
          assessmentLoading={creditAssessment.isLoading}
          noFitExplanation={
            decisionCase?.result.recommendation === "no_current_product_fit" ? (
              <NoFitExplanation decisionCase={decisionCase} formatSat={(value) => `${intl.formatNumber(Number(value))} sat`} />
            ) : undefined
          }
          quote={quote}
          effectiveQuoteStatus={effectiveQuoteStatus}
          ebillPaid={ebillPaid}
          isMintComplete={isMintComplete}
          isMintCompleteLoading={isMintCompleteLoading}
          showPayment={showPayment}
          rejectedToPay={rejectedToPay}
          isInMempool={isInMempool}
          requestedToPay={requestedToPay}
          signedAuthorizationReceipt={signedAuthorizationReceipt}
          durableAuthorizationReceipt={durableAuthorizationReceipt}
          mintOperationStatus={mintOperationStatus}
          isMintOperationLoading={isMintOperationLoading}
          decisionSummary={
            decisionCase && caseBrief
              ? {
                  brief: caseBrief,
                  assessmentCurrency: decisionCase.assessmentCurrency,
                  useOfFunds: decisionCase.applicantConfirmation?.useOfFunds,
                  repaymentSource: decisionCase.applicantConfirmation?.repaymentSource,
                  billAcceptanceState: decisionCase.snapshot.bill?.acceptanceState,
                  ...(decisionCase.assessmentCurrency === "current" && decisionCase.result.terms
                    ? {
                        recommendedTerms: {
                          mintingFee: Number(decisionCase.result.terms.effectiveFeeSat),
                          amountAvailableForMinting: Number(decisionCase.result.terms.discountedSat),
                          feeRatioBps: decisionCase.result.terms.feeRatioBps,
                          tenorDays: decisionCase.result.terms.tenorDays,
                          offerExpiresOn: decisionCase.result.terms.offerExpiresOn,
                        },
                      }
                    : {}),
                }
              : undefined
          }
        />
      </section>

      <div className="contents print:hidden">
        <CaseWorkspace
          reviewCount={reviewCount}
          review={
            <div className="space-y-6">
              {decisionCase?.casePreparation !== undefined && <CasePreparationPanel decisionCase={decisionCase} />}
              {decisionCase !== undefined && decisionCase.casePreparation === undefined && (
                <InformationNeedsPanel
                  decisionCase={decisionCase}
                  capability={creditAssessment.isUnavailable ? undefined : operatorCapability.capability}
                />
              )}
              <QuoteDocuments
                embedded
                showCaseRecord={false}
                showPublicResearch={false}
                billAttachments={billAttachmentDocuments}
                requestToMintFiles={requestToMintDocuments}
                creditEvidence={creditEvidence}
                openingDocumentHash={openingDocumentHash}
                openingEvidenceReference={openingEvidenceReference}
                reviewingEvidenceReference={reviewingEvidenceReference}
                onOpenDocument={handleOpenDocument}
                onOpenEvidence={handleOpenEvidence}
                onReviewInvoiceEvidence={operatorCapability.capability === undefined ? undefined : handleReviewInvoiceEvidence}
              />
            </div>
          }
          history={
            // Read-only record grouped by submission; every control stays in the Review tab.
            <CaseHistory
              decisionCase={creditAssessment.recordedDecisionCase}
              initialApplication={creditAssessment.recordedInitialApplication}
              updatesStatus={creditAssessment.updatesStatus}
              updatesUnavailable={creditAssessment.isUnavailable}
            />
          }
          calculation={
            <QuoteCreditAssessment embedded consolidatedRequirements={decisionCase !== undefined} billId={bill.id} mintQuoteId={quote.id} />
          }
          record={
            <div id="bill-record" className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)] lg:items-start">
              <EndorsementChain historyBlocks={historyBlocks} isLoading={isHistoryLoading} maturityDate={bill.maturity_date} />

              <EndorseeList payee={bill.payee} endorsees={bill.endorsees} />
            </div>
          }
        />
        <QuoteDocumentViewer preview={documentPreview} onClose={handleClosePreview} />
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

      return isQuotePollingCompleteStatus(status) ? false : QUOTE_STATUS_POLL_INTERVAL_MS;
    },
    refetchIntervalInBackground: true,
    enabled: validQuoteId,
  });

  const { syncBillChain, isSyncing, canSync, hasSyncableBill } = useSyncBillChain({
    quoteId,
    billId: quoteData?.bill?.id,
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
        <span className="inline-block max-w-[min(60vw,24rem)] truncate align-bottom" title={quoteId}>
          {quoteId}
        </span>
      </Breadcrumbs>

      <div className="flex items-center justify-end gap-2 pt-2 print:hidden">
        {hasSyncableBill && (
          <Button
            variant="outline"
            size="sm"
            onClick={syncBillChain}
            disabled={!canSync}
            className="inline-flex items-center gap-1 leading-none"
          >
            <AppIcon icon={RefreshCwIcon} weight="thin" className={cn("h-4 w-4", { "animate-spin": isSyncing })} />
            <span className="relative top-px leading-none">
              {intl.formatMessage({
                id: "quotes.detail.refreshBill",
                defaultMessage: "Refresh bill",
                description: "Re-fetches the bill chain from nostr and reloads the bill view",
              })}
            </span>
          </Button>
        )}

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
