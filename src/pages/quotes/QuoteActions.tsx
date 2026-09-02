import { useEffect, useRef, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { LoaderIcon } from "lucide-react";
import { AppIcon, Button, toast } from "@bitcredit/ui-library";
import { Badge } from "@/components/ui/badge";
import { getEbillOptions, getMintInfoOptions } from "@/generated/client/@tanstack/react-query.gen";
import type { InfoReply, BillWaitingStatePaymentData } from "@/generated/client/types.gen";
import { OfferFormDrawer, type OfferFormResult } from "./components/OfferFormDrawer";
import { DenyConfirmDrawer } from "./components/DenyConfirmDrawer";
import { MintRiskAssessmentDrawer, type MintRiskAssessmentFormValue } from "./components/MintRiskAssessmentDrawer";
import { removeItem } from "@/utils/local-storage";
import { PaymentRequestCard } from "./components/PaymentRequestCard";
import { OfferConfirmation } from "./components/OfferConfirmation";
import { RequestToPayConfirmation } from "./components/RequestToPayConfirmation";
import { governedOfferTtl, useQuoteMutations } from "./components/useQuoteMutations";
import { useIntl } from "react-intl";
import { getEffectiveQuoteStatus } from "@/utils/quote-status";
import { buildMempoolTransactionUrl } from "@/utils/mempool";
import { ApiError } from "@/lib/api-error";
import { useCreditAssessmentForBill } from "@/pages/credit/use-credit-assessment";
import {
  operatorMayRecordDecision,
  recordMintRiskAssessment,
  retryOperatorVerificationSources,
  recordOperatorDecision,
  signedAuthorizationMatchesOffer,
  verifiedAuthorizationReceiptOf,
  type OperatorDecisionSuccess,
  type VerifiedAuthorizationReceipt,
} from "@/pages/credit/record-operator-decision";
import { useOperatorCapability } from "@/pages/credit/use-operator-capability";
import { ApplicantHumanReviewCard } from "@/pages/credit/ApplicantHumanReviewCard";
import type { MintQuoteDenialStatus, OperatorMaterialEvidenceSelection } from "@/pages/credit/decision-types";

const ENABLE_MANUAL_MINT_EVIDENCE_IMPORT = false;

interface QuoteActionsProps {
  value: InfoReply;
  isFetching: boolean;
  ebillPaid: boolean;
  isMintComplete: boolean;
  requestedToPay: boolean;
  paymentDeadlineTs?: number | null;
  timeOfRequestToPay?: number | null;
  onAuthorizationVerified?: (receipt: VerifiedAuthorizationReceipt) => void;
}

export function QuoteActions({
  value,
  isFetching,
  ebillPaid,
  isMintComplete,
  requestedToPay,
  paymentDeadlineTs,
  timeOfRequestToPay,
  onAuthorizationVerified,
}: QuoteActionsProps) {
  const intl = useIntl();
  const queryClient = useQueryClient();
  const billId = value.bill.id;
  const creditAssessment = useCreditAssessmentForBill(billId, value.id);
  const decisionCase = creditAssessment.status === "assessed" ? creditAssessment.decisionCase : undefined;
  const isCreditAssessmentUnavailable = creditAssessment.status === "unavailable";
  const operatorCapability = useOperatorCapability();
  const EBILL_DETAIL_POLL_INTERVAL_MS = 10_000;
  const shouldLoadEbillDetail = value.status === "Accepted" || value.status === "MintingEnabled";
  const ebillQuery = useQuery({
    ...getEbillOptions({ path: { bid: billId } }),
    retry: 1,
    enabled: shouldLoadEbillDetail,
    refetchInterval: (query) => {
      if (query.state.error) {
        return query.state.error instanceof ApiError && query.state.error.status === 404 ? EBILL_DETAIL_POLL_INTERVAL_MS : false;
      }

      return query.state.data?.status?.payment?.paid ? false : EBILL_DETAIL_POLL_INTERVAL_MS;
    },
    refetchIntervalInBackground: true,
  });

  const ebill = ebillQuery.data;
  const effectiveQuoteStatus = getEffectiveQuoteStatus(value.status, ebill);
  const paymentStatus = ebill?.status.payment;
  const cws = ebill?.current_waiting_state;

  let waitingPaymentData: BillWaitingStatePaymentData | undefined;
  if (cws && "Payment" in cws) {
    waitingPaymentData = cws.Payment.payment_data;
  }

  const requestedToPayEff = Boolean(requestedToPay || paymentStatus?.requested_to_pay);
  const ebillPaidEff = Boolean(ebillPaid || (paymentStatus?.paid && isMintComplete));
  const effectiveRequestTime = timeOfRequestToPay ?? paymentStatus?.time_of_request_to_pay ?? waitingPaymentData?.time_of_request ?? null;
  const effectiveDeadlineTs =
    paymentDeadlineTs ?? paymentStatus?.payment_deadline_timestamp ?? waitingPaymentData?.payment_deadline ?? null;
  const mintInfoQuery = useQuery({
    ...getMintInfoOptions(),
    retry: 1,
    enabled: Boolean(waitingPaymentData?.tx_id),
    staleTime: 5 * 60 * 1000,
  });
  const linkToPay: string | undefined = buildMempoolTransactionUrl({
    txId: waitingPaymentData?.tx_id,
    network: mintInfoQuery.data?.network,
  });
  const addressToPay: string | undefined = waitingPaymentData?.address_to_pay;

  const [offerFormData, setOfferFormData] = useState<OfferFormResult>();
  const [offerFormDrawerOpen, setOfferFormDrawerOpen] = useState(false);
  const [offerConfirmDrawerOpen, setOfferConfirmDrawerOpen] = useState(false);
  const [denyConfirmDrawerOpen, setDenyConfirmDrawerOpen] = useState(false);
  const [returnInfoDrawerOpen, setReturnInfoDrawerOpen] = useState(false);
  const [riskAssessmentDrawerOpen, setRiskAssessmentDrawerOpen] = useState(false);
  const [unableToAssessDrawerOpen, setUnableToAssessDrawerOpen] = useState(false);
  const [requestToPayConfirmDrawerOpen, setRequestToPayConfirmDrawerOpen] = useState(false);
  const governanceInFlight = useRef(false);
  const governanceGeneration = useRef(0);
  const recordedGovernance = useRef<{ key: string; result: OperatorDecisionSuccess } | undefined>(undefined);
  const mintActionInFlight = useRef(false);
  const [isGovernancePending, setIsGovernancePending] = useState(false);
  const [recordedMintDenial, setRecordedMintDenial] = useState<{
    billId: string;
    caseId: string;
    mintQuoteId: string;
    status: MintQuoteDenialStatus;
  }>();

  const denyTitle = intl.formatMessage({
    id: "quotes.actions.deny.title",
    defaultMessage: "Confirm denying quote",
  });
  const denyButtonLabel = intl.formatMessage({
    id: "quotes.actions.deny.button",
    defaultMessage: "Deny",
  });
  const offerTitle = intl.formatMessage({
    id: "quotes.actions.offer.title",
    defaultMessage: "Offer quote",
  });
  const offerDescription = intl.formatMessage({
    id: "quotes.actions.offer.description",
    defaultMessage: "Make an offer to the current holder of this bill",
  });
  const offerButtonLabel = intl.formatMessage({
    id: "quotes.actions.offer.button",
    defaultMessage: "Offer",
  });
  const hasApplicantHumanReview = decisionCase?.applicantHumanReview !== undefined;
  const hasCurrentAssessment = decisionCase?.assessmentCurrency === "current";
  const retainedMintDenial =
    recordedMintDenial?.billId === billId &&
    recordedMintDenial.mintQuoteId === value.id &&
    (decisionCase === undefined || recordedMintDenial.caseId === decisionCase.snapshot.caseId)
      ? recordedMintDenial.status
      : undefined;
  const workbenchMintDenial = decisionCase?.mintDenial;
  const mintDenial =
    retainedMintDenial !== undefined &&
    workbenchMintDenial !== undefined &&
    retainedMintDenial.operationId !== workbenchMintDenial.operationId
      ? retainedMintDenial
      : (workbenchMintDenial ?? retainedMintDenial);
  const showPendingActions =
    effectiveQuoteStatus === "Pending" && hasCurrentAssessment && !hasApplicantHumanReview && mintDenial === undefined;
  useEffect(() => {
    if (decisionCase?.mintDenial === undefined) return;
    const workbenchStatus = decisionCase.mintDenial;
    const caseId = decisionCase.snapshot.caseId;
    setRecordedMintDenial((current) => {
      const sameContext = current?.billId === billId && current.caseId === caseId && current.mintQuoteId === value.id;
      if (sameContext && current.status.operationId !== workbenchStatus.operationId) return current;
      return { billId, caseId, mintQuoteId: value.id, status: workbenchStatus };
    });
  }, [billId, decisionCase?.mintDenial, decisionCase?.snapshot.caseId, value.id]);
  useEffect(() => {
    if (!hasApplicantHumanReview && hasCurrentAssessment) return;
    governanceGeneration.current += 1;
    recordedGovernance.current = undefined;
    setOfferFormData(undefined);
    setOfferFormDrawerOpen(false);
    setOfferConfirmDrawerOpen(false);
    setDenyConfirmDrawerOpen(false);
    setReturnInfoDrawerOpen(false);
    setRiskAssessmentDrawerOpen(false);
    setUnableToAssessDrawerOpen(false);
  }, [hasApplicantHumanReview, hasCurrentAssessment]);
  const hasQuoteBoundCreditProgram =
    decisionCase?.mintQuoteId === value.id &&
    decisionCase.creditProgram !== undefined &&
    decisionCase.creditProgramAssignment !== undefined;
  const governedOfferExpiresAt = decisionCase?.result.terms?.offerExpiresOn
    ? Date.parse(`${decisionCase.result.terms.offerExpiresOn}T23:59:59.999Z`)
    : Number.NaN;
  const offerTermsExpired =
    decisionCase?.result.recommendation === "offer_available" &&
    decisionCase.result.assessmentStatus === "ready_for_decision" &&
    !(governedOfferExpiresAt > Date.now());
  const showGovernedOffer =
    showPendingActions &&
    hasQuoteBoundCreditProgram &&
    !isCreditAssessmentUnavailable &&
    decisionCase?.result.assessmentStatus === "ready_for_decision" &&
    decisionCase.result.recommendation === "offer_available" &&
    governedOfferExpiresAt > Date.now();
  const showGovernedResolution =
    showPendingActions &&
    hasQuoteBoundCreditProgram &&
    !isCreditAssessmentUnavailable &&
    decisionCase?.result.assessmentStatus === "blocked_pending_verification";
  const requiredVerificationItems = decisionCase?.result.verificationRequests?.map((request) => request.requiredItem) ?? [];
  const applicantVerificationItems =
    decisionCase?.result.verificationRequests?.filter((request) => request.owner === "applicant").map((request) => request.requiredItem) ??
    [];
  const hasMintRiskRequest =
    decisionCase?.result.verificationRequests?.some(
      (request) => request.owner === "mint_risk" && request.resolutionAction === "record_acceptor_risk_assessment"
    ) ?? false;
  const hasSourceRefreshRequest =
    decisionCase?.result.verificationRequests?.some(
      (request) => request.owner === "system" || (request.owner === "mint_operations" && request.axis !== "mint_exposure_capacity")
    ) ?? false;
  const denyAction =
    decisionCase?.result.recommendation === "no_current_product_fit" ? "confirm_no_current_product_fit" : "decline_application";
  const declineMaterialEvidenceOptions =
    denyAction === "decline_application"
      ? (decisionCase?.availableMaterialEvidence ?? []).filter((evidence) => evidence.kind !== "mint_capacity")
      : [];
  const hasRequiredDeclineEvidence = denyAction !== "decline_application" || declineMaterialEvidenceOptions.length > 0;
  const mayDeny = operatorMayRecordDecision(operatorCapability.capability, denyAction);
  const mayOffer = operatorMayRecordDecision(operatorCapability.capability, "confirm_proposed_quote");
  const mayReturn = operatorMayRecordDecision(operatorCapability.capability, "return_for_information");
  const mayCloseUnableToAssess = operatorMayRecordDecision(operatorCapability.capability, "close_unable_to_assess");
  const mayRecordMintRisk = operatorCapability.capability?.operatorRole === "approver";
  const roleUnavailableReason = operatorCapability.isLoading
    ? intl.formatMessage({
        id: "quotes.actions.role.checking",
        defaultMessage: "Checking AI Credit operator authorization…",
        description: "Explanation shown while operator authorization is checked",
      })
    : (operatorCapability.error ??
      intl.formatMessage({
        id: "quotes.actions.role.unavailable",
        defaultMessage: "Your authenticated operator role cannot perform this action.",
        description: "Explanation shown when an operator action is unavailable for the current role",
      }));
  const denyGovernanceAvailable =
    hasQuoteBoundCreditProgram &&
    !isCreditAssessmentUnavailable &&
    mayDeny &&
    hasRequiredDeclineEvidence &&
    decisionCase?.result.assessmentStatus === "ready_for_decision" &&
    (decisionCase.result.recommendation === "offer_available" || decisionCase.result.recommendation === "no_current_product_fit");
  const denyUnavailableReason = !mayDeny
    ? roleUnavailableReason
    : !hasRequiredDeclineEvidence
      ? intl.formatMessage({
          id: "quotes.actions.deny.evidenceUnavailable",
          defaultMessage: "Deny is unavailable because there is no current evidence to cite.",
          description: "Explanation when a discretionary decline cannot be recorded without server-listed material evidence",
        })
      : hasQuoteBoundCreditProgram
        ? intl.formatMessage({
            id: "quotes.actions.deny.unavailable",
            defaultMessage: "Deny is unavailable until the assessment is ready.",
            description: "Explanation shown when a quote cannot yet be denied because its governed credit assessment is incomplete",
          })
        : intl.formatMessage({
            id: "quotes.actions.creditProgram.unavailable",
            defaultMessage: "A fresh Mint credit-program assignment is required before this quote can be acted on.",
            description: "Explanation shown when an older assessment lacks the Mint-owned quote-to-program binding",
          });
  const showRequestToPayAction =
    mintDenial === undefined &&
    (effectiveQuoteStatus === "Accepted" || effectiveQuoteStatus === "MintingEnabled") &&
    "keyset_id" in value &&
    ebill &&
    !ebillPaidEff &&
    !requestedToPayEff;
  const { offerQuote, requestToPayMutation, handleOfferQuote, handleRequestToPay } = useQuoteMutations(value.id, billId);
  const governanceFailed = (error: string) => {
    toast({
      title: intl.formatMessage(
        {
          id: "quotes.toast.governance.error",
          defaultMessage: "Decision not recorded: {error}. Nothing was sent to the Mint; your inputs were kept.",
          description: "Safe exact backend error shown when AI Credit rejects or cannot record an operator action",
        },
        { error }
      ),
      variant: "error",
    });
  };
  const mintUpdateFailed = () => {
    toast({
      title: intl.formatMessage({
        id: "quotes.toast.governance.mintUpdateFailed",
        defaultMessage:
          "The decision was recorded, but the Mint outcome could not be confirmed. Your inputs were kept; check the quote and retry only if it is still pending.",
        description: "Error shown when governance succeeded but the corresponding Mint quote outcome remains unknown",
      }),
      variant: "error",
    });
  };
  const recordGovernance = async (input: OfferFormResult["governance"]): Promise<OperatorDecisionSuccess | null> => {
    const currentDecisionCase = decisionCase;
    const assessmentUnavailable = intl.formatMessage({
      id: "quotes.toast.governance.assessmentUnavailable",
      defaultMessage: "The assessment is unavailable or changed",
      description: "Error shown when a stale operator drawer can no longer be bound to the current governed assessment",
    });
    if (currentDecisionCase === undefined) {
      governanceFailed(assessmentUnavailable);
      return null;
    }
    if (
      isCreditAssessmentUnavailable ||
      currentDecisionCase.assessmentCurrency !== "current" ||
      !hasQuoteBoundCreditProgram ||
      hasApplicantHumanReview ||
      input.caseId !== currentDecisionCase.snapshot.caseId ||
      input.decisionResultDigest !== currentDecisionCase.resultDigest
    ) {
      governanceFailed(assessmentUnavailable);
      return null;
    }
    if (!operatorMayRecordDecision(operatorCapability.capability, input.action)) {
      governanceFailed(roleUnavailableReason);
      return null;
    }
    const inputKey = JSON.stringify(input);
    if (recordedGovernance.current?.key === inputKey) return recordedGovernance.current.result;
    if (governanceInFlight.current) return null;
    governanceInFlight.current = true;
    setIsGovernancePending(true);
    const generation = governanceGeneration.current;
    try {
      const recorded = await recordOperatorDecision(input, operatorCapability.capability, {
        mintQuoteId: value.id,
        mintId: currentDecisionCase.snapshot.mintId,
      });
      if (generation !== governanceGeneration.current) return null;
      if (recorded.ok) recordedGovernance.current = { key: inputKey, result: recorded };
      else governanceFailed(recorded.error);
      return recorded.ok ? recorded : null;
    } catch {
      governanceFailed("The AI Credit operator service is not reachable");
      return null;
    } finally {
      governanceInFlight.current = false;
      setIsGovernancePending(false);
    }
  };
  const rememberMintDenial = (status: MintQuoteDenialStatus) => {
    if (decisionCase === undefined) return;
    setRecordedMintDenial({ billId, caseId: decisionCase.snapshot.caseId, mintQuoteId: value.id, status });
    recordedGovernance.current = undefined;
    void queryClient.invalidateQueries({ queryKey: ["ai-credit", "decisions"] });
  };
  const submitGovernedDeny = async (writtenBasis: string, materialEvidence: OperatorMaterialEvidenceSelection[]) => {
    if (decisionCase === undefined || mintActionInFlight.current) return;
    const recommendation = decisionCase.result.recommendation;
    if (recommendation !== "offer_available" && recommendation !== "no_current_product_fit") return;
    const confirmsNoFit = recommendation === "no_current_product_fit";
    mintActionInFlight.current = true;
    try {
      const recorded = await recordGovernance({
        billId,
        caseId: decisionCase.snapshot.caseId,
        decisionResultDigest: decisionCase.resultDigest,
        action: confirmsNoFit ? "confirm_no_current_product_fit" : "decline_application",
        reasonCode: confirmsNoFit ? "operator_confirmed_no_current_product_fit" : "operator_declined_governed_offer",
        writtenBasis,
        materialEvidence: confirmsNoFit ? [] : materialEvidence,
      });
      if (recorded === null) return;
      if (recorded.mintDenial === undefined) return;
      rememberMintDenial(recorded.mintDenial);
      setDenyConfirmDrawerOpen(false);
    } finally {
      mintActionInFlight.current = false;
    }
  };
  const submitGovernedOffer = async (finalData: OfferFormResult) => {
    if (mintActionInFlight.current) return;
    if (governedOfferTtl(finalData) === null) {
      toast({
        title: intl.formatMessage({
          id: "quotes.toast.offer.invalidExpiry",
          defaultMessage: "The offer expires after the assessment. Choose an earlier date.",
          description: "Error shown when a Mint offer would outlive its governed credit decision",
        }),
        variant: "error",
      });
      return;
    }
    mintActionInFlight.current = true;
    try {
      const recorded = await recordGovernance(finalData.governance);
      if (recorded?.signedAuthorization === undefined) return;
      const offerExpiresOn = finalData.governedOfferExpiresAt?.toISOString().slice(0, 10);
      if (
        offerExpiresOn === undefined ||
        !signedAuthorizationMatchesOffer(recorded.signedAuthorization, {
          mintQuoteId: value.id,
          billId,
          discountedSat: finalData.discount.net.value.round(0, 0).toFixed(0),
          offerExpiresOn,
        })
      ) {
        recordedGovernance.current = undefined;
        governanceFailed(
          intl.formatMessage({
            id: "quotes.toast.governance.authorizationMismatch",
            defaultMessage: "The signed authorization does not match the offer you confirmed",
            description: "Fail-closed error when signed credit terms differ from the operator-confirmed quote, bill, amount or expiry",
          })
        );
        return;
      }
      if (!(await handleOfferQuote(recorded.signedAuthorization))) {
        mintUpdateFailed();
        return;
      }
      const receipt = verifiedAuthorizationReceiptOf(recorded.signedAuthorization);
      if (receipt !== null) onAuthorizationVerified?.(receipt);
      recordedGovernance.current = undefined;
      removeItem(`offer-form-${value.id}`);
      setOfferConfirmDrawerOpen(false);
    } finally {
      mintActionInFlight.current = false;
    }
  };
  const submitGovernedReturn = async (writtenBasis: string) => {
    if (decisionCase?.result.assessmentStatus !== "blocked_pending_verification" || applicantVerificationItems.length === 0) return;
    const recorded = await recordGovernance({
      billId,
      caseId: decisionCase.snapshot.caseId,
      decisionResultDigest: decisionCase.resultDigest,
      action: "return_for_information",
      reasonCode: "operator_returned_for_information",
      writtenBasis,
      requiredItems: applicantVerificationItems,
    });
    if (recorded === null) return;
    recordedGovernance.current = undefined;
    setReturnInfoDrawerOpen(false);
    void queryClient.invalidateQueries({ queryKey: ["ai-credit", "decisions"] });
    toast({
      title: intl.formatMessage({
        id: "quotes.toast.returnForInformation.recorded",
        defaultMessage: "Information request recorded. No notification was sent.",
        description: "Success message after recording an applicant information request without claiming notification delivery",
      }),
      variant: "success",
    });
  };
  const submitMintRiskAssessment = async (risk: MintRiskAssessmentFormValue) => {
    if (decisionCase?.assessmentCurrency !== "current" || operatorCapability.capability === undefined) return;
    setIsGovernancePending(true);
    try {
      const result = await recordMintRiskAssessment(
        {
          mintQuoteId: value.id,
          billId,
          caseId: decisionCase.snapshot.caseId,
          decisionResultDigest: decisionCase.resultDigest,
          ...risk,
        },
        operatorCapability.capability
      );
      if (!result.ok) {
        governanceFailed(result.error);
        return;
      }
      setRiskAssessmentDrawerOpen(false);
      await queryClient.invalidateQueries({ queryKey: ["ai-credit", "decisions"] });
      toast({
        title: intl.formatMessage({
          id: "quotes.toast.mintRisk.recorded",
          defaultMessage: "Mint risk evidence recorded. The case was re-evaluated.",
          description: "Success message after Mint-owned risk evidence triggers a new governed assessment",
        }),
        variant: "success",
      });
    } finally {
      setIsGovernancePending(false);
    }
  };
  const submitUnableToAssess = async (writtenBasis: string) => {
    if (decisionCase?.result.assessmentStatus !== "blocked_pending_verification" || requiredVerificationItems.length === 0) return;
    const recorded = await recordGovernance({
      billId,
      caseId: decisionCase.snapshot.caseId,
      decisionResultDigest: decisionCase.resultDigest,
      action: "close_unable_to_assess",
      reasonCode: "operator_closed_unable_to_assess",
      writtenBasis,
      requiredItems: requiredVerificationItems,
    });
    if (recorded === null) return;
    if (recorded.mintDenial === undefined) return;
    rememberMintDenial(recorded.mintDenial);
    setUnableToAssessDrawerOpen(false);
  };
  const retryVerificationSources = async () => {
    if (decisionCase?.assessmentCurrency !== "current") return;
    setIsGovernancePending(true);
    try {
      const result = await retryOperatorVerificationSources(
        { billId, caseId: decisionCase.snapshot.caseId, decisionResultDigest: decisionCase.resultDigest },
        operatorCapability.capability
      );
      if (!result.ok) {
        governanceFailed(result.error);
        return;
      }
      await queryClient.invalidateQueries({ queryKey: ["ai-credit", "decisions"] });
      toast({
        title: intl.formatMessage({
          id: "quotes.toast.verificationSources.refreshed",
          defaultMessage: "Current Mint sources checked. Review the updated assessment.",
          description: "Success message after retrying Mint-owned source checks",
        }),
        variant: "success",
      });
    } finally {
      setIsGovernancePending(false);
    }
  };

  return (
    <>
      {mintDenial === undefined ? null : (
        <div role="status" className="flex items-center gap-2 text-sm">
          <Badge variant={mintDenial.state === "syncing" ? "pending" : "success"}>
            {mintDenial.state === "syncing"
              ? intl.formatMessage({
                  id: "quotes.actions.denial.syncing",
                  defaultMessage: "Denial syncing with Mint",
                  description: "Status shown while the governed denial outbox is being delivered to the Mint",
                })
              : intl.formatMessage({
                  id: "quotes.actions.denial.completed",
                  defaultMessage: "Mint denial completed",
                  description: "Status shown after the Mint durably completed the governed quote denial",
                })}
          </Badge>
          {mintDenial.state === "syncing" && <AppIcon icon={LoaderIcon} weight="thin" className="animate-spin" />}
        </div>
      )}
      {showPendingActions || showRequestToPayAction ? (
        <div className="flex items-center gap-2">
          {showPendingActions && decisionCase?.result.assessmentStatus === "ready_for_decision" && !offerTermsExpired && (
            <DenyConfirmDrawer
              title={denyTitle}
              materialEvidenceOptions={declineMaterialEvidenceOptions}
              open={denyConfirmDrawerOpen}
              requireMaterialEvidence={denyAction === "decline_application"}
              onOpenChange={setDenyConfirmDrawerOpen}
              isPending={isGovernancePending}
              onSubmit={(writtenBasis, materialEvidence) => {
                void submitGovernedDeny(writtenBasis, materialEvidence);
              }}
            >
              <Button
                className="min-w-24"
                disabled={isFetching || isGovernancePending || !denyGovernanceAvailable}
                title={denyGovernanceAvailable ? undefined : denyUnavailableReason}
                variant="destructive"
              >
                {denyButtonLabel} {isGovernancePending && <AppIcon icon={LoaderIcon} weight="thin" className="animate-spin" />}
              </Button>
            </DenyConfirmDrawer>
          )}

          {showGovernedOffer && (
            <OfferFormDrawer
              title={offerTitle}
              description={offerDescription}
              value={value}
              open={offerFormDrawerOpen}
              onOpenChange={setOfferFormDrawerOpen}
              onSubmit={(data) => {
                setOfferFormData(data);
                setOfferConfirmDrawerOpen(true);
                setOfferFormDrawerOpen(false);
              }}
            >
              <Button
                className="min-w-24"
                disabled={isFetching || offerQuote.isPending || !mayOffer}
                title={mayOffer ? undefined : roleUnavailableReason}
              >
                {offerButtonLabel} {offerQuote.isPending && <AppIcon icon={LoaderIcon} weight="thin" className="animate-spin" />}
              </Button>
            </OfferFormDrawer>
          )}

          {showGovernedResolution && applicantVerificationItems.length > 0 && (
            <DenyConfirmDrawer
              title={intl.formatMessage({
                id: "quotes.actions.returnForInformation.title",
                defaultMessage: "Request information from applicant",
                description: "Confirmation title for recording information that the applicant must provide",
              })}
              mode="return_for_information"
              requiredItems={applicantVerificationItems}
              open={returnInfoDrawerOpen}
              onOpenChange={setReturnInfoDrawerOpen}
              isPending={isGovernancePending}
              onSubmit={(writtenBasis) => {
                void submitGovernedReturn(writtenBasis);
              }}
            >
              <Button
                className="min-w-24"
                disabled={isFetching || isGovernancePending || !mayReturn}
                title={mayReturn ? undefined : roleUnavailableReason}
                variant="outline"
              >
                {intl.formatMessage({
                  id: "quotes.actions.returnForInformation.button",
                  defaultMessage: "Request information from applicant",
                  description: "Action that records information the applicant must provide without claiming notification delivery",
                })}
              </Button>
            </DenyConfirmDrawer>
          )}

          {ENABLE_MANUAL_MINT_EVIDENCE_IMPORT && showGovernedResolution && hasMintRiskRequest && (
            <MintRiskAssessmentDrawer
              open={riskAssessmentDrawerOpen}
              onOpenChange={setRiskAssessmentDrawerOpen}
              isPending={isGovernancePending}
              onSubmit={(value) => void submitMintRiskAssessment(value)}
            >
              <Button
                className="min-w-24"
                disabled={isFetching || isGovernancePending || !mayRecordMintRisk}
                title={mayRecordMintRisk ? undefined : roleUnavailableReason}
              >
                {intl.formatMessage({
                  id: "quotes.actions.mintRisk.button",
                  defaultMessage: "Add Mint risk assessment",
                  description: "Action for resolving a Mint-owned acceptor risk requirement",
                })}
              </Button>
            </MintRiskAssessmentDrawer>
          )}

          {showGovernedResolution && hasSourceRefreshRequest && (
            <Button
              className="min-w-24"
              disabled={isFetching || isGovernancePending || operatorCapability.capability === undefined}
              onClick={() => void retryVerificationSources()}
              variant="outline"
            >
              {intl.formatMessage({
                id: "quotes.actions.verificationSources.retry",
                defaultMessage: "Retry Mint source checks",
                description: "Action that re-reads Mint-owned capacity or system sources and re-evaluates the case",
              })}
            </Button>
          )}

          {showGovernedResolution && (
            <DenyConfirmDrawer
              title={intl.formatMessage({
                id: "quotes.actions.unableToAssess.title",
                defaultMessage: "Close as unable to assess",
                description: "Title for terminal closure when required evidence cannot be obtained",
              })}
              mode="close_unable_to_assess"
              requiredItems={requiredVerificationItems}
              open={unableToAssessDrawerOpen}
              onOpenChange={setUnableToAssessDrawerOpen}
              isPending={isGovernancePending}
              onSubmit={(writtenBasis) => void submitUnableToAssess(writtenBasis)}
            >
              <Button className="min-w-24" disabled={isFetching || isGovernancePending || !mayCloseUnableToAssess} variant="destructive">
                {intl.formatMessage({
                  id: "quotes.actions.unableToAssess.button",
                  defaultMessage: "Close — unable to assess",
                  description: "Terminal action for a case with unresolved evidence",
                })}
              </Button>
            </DenyConfirmDrawer>
          )}

          <OfferConfirmation
            offerFormData={offerFormData}
            open={offerConfirmDrawerOpen}
            onOpenChange={(open) => {
              if (!open && offerQuote.isPending) return;
              setOfferConfirmDrawerOpen(open);
            }}
            isPending={isGovernancePending || offerQuote.isPending}
            onSubmit={(finalData) => {
              void submitGovernedOffer(finalData);
            }}
          />

          {showRequestToPayAction && (
            <RequestToPayConfirmation
              open={requestToPayConfirmDrawerOpen}
              onOpenChange={setRequestToPayConfirmDrawerOpen}
              onSubmit={(deadline) => {
                handleRequestToPay(value.bill.sum, deadline);
                setRequestToPayConfirmDrawerOpen(false);
              }}
              isFetching={isFetching}
              isPending={requestToPayMutation.isPending}
              maturityDate={value.bill.maturity_date}
              billId={value.bill.id}
            />
          )}
        </div>
      ) : null}

      {decisionCase?.applicantHumanReview === undefined ? null : (
        <ApplicantHumanReviewCard billId={billId} capability={operatorCapability.capability} review={decisionCase.applicantHumanReview} />
      )}

      {requestedToPayEff && (addressToPay ?? linkToPay) && (
        <PaymentRequestCard
          addressToPay={addressToPay}
          linkToPay={linkToPay}
          effectiveRequestTime={effectiveRequestTime}
          effectiveDeadlineTs={effectiveDeadlineTs}
        />
      )}
    </>
  );
}
