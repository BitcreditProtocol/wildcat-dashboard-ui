import { toast } from "@bitcredit/ui-library";
import { Breadcrumbs } from "@/components/Breadcrumbs";
import { Button } from "@bitcredit/ui-library";
import { Skeleton } from "@bitcredit/ui-library";
import { getQuoteOptions } from "@/generated/client/@tanstack/react-query.gen";
import { getEbillAttachment, getEbillFileFromRequestToMint } from "@/generated/client/sdk.gen";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useParams, Link, useLocation } from "react-router";
import { BreadcrumbLink } from "@/components/ui/breadcrumb";
import { QuoteActions } from "./QuoteActions";
import { truncateString } from "@/utils/strings";
import { EndorsementChain } from "@/components/EndorsementChain";
import { serializeKeysetId } from "@/utils/keyset";
import { useIntl } from "react-intl";
import { useEffect, useRef, useState } from "react";
import { getApiErrorMessage } from "@/lib/api-error";
import { beginPdfDownload } from "@/lib/download";
import { authenticatedFetch } from "@/lib/api-client";
import { type CreditEvidenceState, QuoteDocuments } from "./QuoteDocuments";
import { countCitedEvidenceClaims, operatorVisibleAxes, type SubmittedEvidence } from "@/pages/credit/decision-types";
import { type QuoteDocument, useQuoteDetail } from "@/hooks/use-quote-detail";
import { QuoteDetailCard } from "./components/QuoteDetailCard";
import { EndorseeList } from "./components/EndorseeList";
import type { InfoReply } from "@/generated/client/types.gen";
import NotFoundPage from "@/pages/NotFoundPage";
import { QuoteCreditAssessment } from "@/pages/credit/QuoteCreditAssessment";
import { useCreditAssessmentForBill } from "@/pages/credit/use-credit-assessment";
import {
  durableAuthorizationReceiptFromQuote,
  reviewInvoiceEvidence,
  type VerifiedAuthorizationReceipt,
} from "@/pages/credit/record-operator-decision";
import { useOperatorCapability } from "@/pages/credit/use-operator-capability";
import { assessmentChanges } from "@/pages/credit/assessment-diff";
import { isQuotePollingCompleteStatus } from "@/utils/quote-status";

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
  const [openingEvidenceReference, setOpeningEvidenceReference] = useState<string | null>(null);
  const [reviewingEvidenceReference, setReviewingEvidenceReference] = useState<string | null>(null);
  const [signedAuthorizationReceipt, setSignedAuthorizationReceipt] = useState<VerifiedAuthorizationReceipt | null>(null);

  const blobUrlTimerRef = useRef<number | null>(null);
  const autoInvestigationStartedRef = useRef<string | null>(null);
  const queryClient = useQueryClient();

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
    mintOperationStatus,
    isMintOperationLoading,
  } = useQuoteDetail(id);
  const creditAssessment = useCreditAssessmentForBill(billId, id);
  const operatorCapability = useOperatorCapability();
  const assessmentHistory = creditAssessment.decisionCase?.assessmentHistory;
  const previousAssessment = assessmentHistory?.[assessmentHistory.length - 2];
  const currentAssessment = assessmentHistory?.[assessmentHistory.length - 1];
  const reassessmentChanges =
    previousAssessment === undefined || currentAssessment === undefined ? [] : assessmentChanges(previousAssessment, currentAssessment);
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
            };

  const investigation = creditAssessment.decisionCase?.claimInvestigation;
  useEffect(() => {
    if (
      creditAssessment.decisionCase?.assessmentCurrency !== "current" ||
      investigation?.status !== "idle" ||
      autoInvestigationStartedRef.current === investigation.request.inputDigest
    ) {
      return;
    }
    autoInvestigationStartedRef.current = investigation.request.inputDigest;
    void authenticatedFetch("/api/ai-credit/operator-claim-investigations", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(investigation.request),
      cache: "no-store",
      credentials: "same-origin",
      redirect: "error",
      signal: AbortSignal.timeout(15_000),
    })
      .then((response) => (response.ok ? queryClient.invalidateQueries({ queryKey: ["ai-credit", "decisions"] }) : undefined))
      .catch(() => undefined);
  }, [creditAssessment.decisionCase?.assessmentCurrency, investigation, queryClient]);

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

      const blobUrl = beginPdfDownload(resolvedAttachment, documentFile.name);

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
            creditAssessment.decisionCase?.applicantConfirmation
              ? {
                  assessmentCurrency: creditAssessment.decisionCase.assessmentCurrency,
                  useOfFunds: creditAssessment.decisionCase.applicantConfirmation.useOfFunds,
                  repaymentSource: creditAssessment.decisionCase.applicantConfirmation.repaymentSource,
                  ...(creditAssessment.decisionCase.applicantConfirmation.acceptor &&
                  creditAssessment.decisionCase.applicantConfirmation.acceptor !==
                    creditAssessment.decisionCase.applicantConfirmation.repaymentSource
                    ? { acceptor: creditAssessment.decisionCase.applicantConfirmation.acceptor }
                    : {}),
                  ...(creditAssessment.decisionCase.snapshot.invoice?.goodsDescription
                    ? { goodsDescription: creditAssessment.decisionCase.snapshot.invoice.goodsDescription }
                    : {}),
                  readyForDecision: creditAssessment.decisionCase.result.assessmentStatus === "ready_for_decision",
                  recommendation: creditAssessment.decisionCase.result.recommendation,
                  passedChecks: operatorVisibleAxes(creditAssessment.decisionCase.result.axes).filter((axis) => axis.status === "pass")
                    .length,
                  failedChecks: operatorVisibleAxes(creditAssessment.decisionCase.result.axes).filter((axis) => axis.status === "fail")
                    .length,
                  notAssessedChecks: operatorVisibleAxes(creditAssessment.decisionCase.result.axes).filter(
                    (axis) => axis.status === "blocked" || axis.status === "not_assessed"
                  ).length,
                  totalChecks: operatorVisibleAxes(creditAssessment.decisionCase.result.axes).length,
                  answersAffirmed: creditAssessment.decisionCase.applicantConfirmation.answersAffirmed,
                  recourseAcknowledged: creditAssessment.decisionCase.applicantConfirmation.recourseAcknowledged,
                  unresolvedContradictions: creditAssessment.decisionCase.snapshot.contradictions.length,
                  evidenceSummary: {
                    documents: (creditAssessment.decisionCase.submittedEvidence ?? []).length,
                    citedClaims: countCitedEvidenceClaims(creditAssessment.decisionCase.evidencePackets ?? []),
                    openRequests: creditAssessment.decisionCase.result.verificationRequests.length,
                    investigation:
                      creditAssessment.decisionCase.claimInvestigation?.status === "available"
                        ? {
                            status: "available" as const,
                            findings: creditAssessment.decisionCase.claimInvestigation.proposal.findings.length,
                            sources: creditAssessment.decisionCase.claimInvestigation.proposal.findings.reduce(
                              (count, finding) => count + finding.sources.length,
                              0
                            ),
                          }
                        : {
                            status: creditAssessment.decisionCase.claimInvestigation?.status ?? ("not_run" as const),
                            findings: 0,
                            sources: 0,
                          },
                  },
                  applicantRequests: creditAssessment.decisionCase.result.verificationRequests
                    .filter((request) => request.owner === "applicant")
                    .map(({ axis, requiredItem }) => ({ axis, requiredItem })),
                  reassessmentChanges,
                  billAcceptanceState: creditAssessment.decisionCase.snapshot.bill?.acceptanceState,
                  ...(creditAssessment.decisionCase.assessmentCurrency === "current" && creditAssessment.decisionCase.result.terms
                    ? {
                        recommendedTerms: {
                          mintingFee: Number(creditAssessment.decisionCase.result.terms.effectiveFeeSat),
                          amountAvailableForMinting: Number(creditAssessment.decisionCase.result.terms.discountedSat),
                          feeRatioBps: creditAssessment.decisionCase.result.terms.feeRatioBps,
                          tenorDays: creditAssessment.decisionCase.result.terms.tenorDays,
                          offerExpiresOn: creditAssessment.decisionCase.result.terms.offerExpiresOn,
                        },
                      }
                    : {}),
                }
              : undefined
          }
        />

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

        <QuoteCreditAssessment billId={bill.id} mintQuoteId={quote.id} />
      </section>

      <div className="contents print:hidden">
        <QuoteDocuments
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

        <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)] lg:items-start">
          <EndorsementChain historyBlocks={historyBlocks} isLoading={isHistoryLoading} maturityDate={bill.maturity_date} />

          <EndorseeList payee={bill.payee} endorsees={bill.endorsees} />
        </div>
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

      {(fromKeyset && keysetIdFromState) || hasKeysetId ? (
        <div className="flex items-center justify-end gap-2 pt-2 print:hidden">
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
      ) : null}
      <PageBody id={quoteId} />
    </>
  );
}
