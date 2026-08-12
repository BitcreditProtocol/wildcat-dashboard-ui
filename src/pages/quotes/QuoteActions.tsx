import { useRef, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { LoaderIcon } from "lucide-react";
import { AppIcon, Button, toast } from "@bitcredit/ui-library";
import { getEbillOptions, getMintInfoOptions } from "@/generated/client/@tanstack/react-query.gen";
import type { InfoReply, BillWaitingStatePaymentData } from "@/generated/client/types.gen";
import { OfferFormDrawer, type OfferFormResult } from "./components/OfferFormDrawer";
import { DenyConfirmDrawer } from "./components/DenyConfirmDrawer";
import { removeItem } from "@/utils/local-storage";
import { PaymentRequestCard } from "./components/PaymentRequestCard";
import { OfferConfirmation } from "./components/OfferConfirmation";
import { RequestToPayConfirmation } from "./components/RequestToPayConfirmation";
import { governedOfferTtl, useQuoteMutations } from "./components/useQuoteMutations";
import { useIntl } from "react-intl";
import { getEffectiveQuoteStatus } from "@/utils/quote-status";
import { buildMempoolTransactionUrl } from "@/utils/mempool";
import { useCreditAssessmentForBill } from "@/pages/credit/use-credit-assessment";
import { recordOperatorDecision } from "@/pages/credit/record-operator-decision";

interface QuoteActionsProps {
  value: InfoReply;
  isFetching: boolean;
  ebillPaid: boolean;
  isMintComplete: boolean;
  requestedToPay: boolean;
  paymentDeadlineTs?: number | null;
  timeOfRequestToPay?: number | null;
}

export function QuoteActions({
  value,
  isFetching,
  ebillPaid,
  isMintComplete,
  requestedToPay,
  paymentDeadlineTs,
  timeOfRequestToPay,
}: QuoteActionsProps) {
  const intl = useIntl();
  const queryClient = useQueryClient();
  const billId = value.bill.id;
  const { decisionCase } = useCreditAssessmentForBill(billId);
  const EBILL_DETAIL_POLL_INTERVAL_MS = 10_000;
  const ebillQuery = useQuery({
    ...getEbillOptions({ path: { bid: billId } }),
    retry: 1,
    enabled: !!billId,
    refetchInterval: (query) => {
      if (query.state.error) {
        return false;
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
  const [requestToPayConfirmDrawerOpen, setRequestToPayConfirmDrawerOpen] = useState(false);
  const governanceInFlight = useRef(false);
  const [isGovernancePending, setIsGovernancePending] = useState(false);

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
  const showPendingActions = effectiveQuoteStatus === "Pending";
  const showGovernedOffer = showPendingActions && decisionCase?.result.recommendation === "offer_available";
  const showGovernedReturn = showPendingActions && decisionCase?.result.assessmentStatus === "blocked_pending_verification";
  const requiredVerificationItems = decisionCase?.result.verificationRequests?.map((request) => request.requiredItem) ?? [];
  const denyGovernanceAvailable =
    decisionCase?.result.assessmentStatus === "ready_for_decision" &&
    (decisionCase.result.recommendation === "offer_available" || decisionCase.result.recommendation === "no_current_product_fit");
  const denyUnavailableReason = intl.formatMessage({
    id: "quotes.actions.deny.unavailable",
    defaultMessage: "Deny is unavailable until the governed assessment is ready.",
    description: "Explanation shown when a quote cannot yet be denied because its governed credit assessment is incomplete",
  });
  const showRequestToPayAction =
    (effectiveQuoteStatus === "Accepted" || effectiveQuoteStatus === "MintingEnabled") &&
    "keyset_id" in value &&
    ebill &&
    !ebillPaidEff &&
    !requestedToPayEff;
  const { denyQuote, offerQuote, requestToPayMutation, handleDenyQuote, handleOfferQuote, handleRequestToPay } = useQuoteMutations(
    value.id,
    billId
  );
  const governanceFailed = () => {
    toast({
      title: intl.formatMessage({
        id: "quotes.toast.governance.error",
        defaultMessage: "The governed decision could not be recorded. Nothing was sent to the Mint; please retry.",
        description: "Error shown when AI Credit rejects or cannot record an operator action",
      }),
      variant: "error",
    });
  };
  const recordGovernance = async (input: OfferFormResult["governance"]): Promise<boolean> => {
    if (governanceInFlight.current) return false;
    governanceInFlight.current = true;
    setIsGovernancePending(true);
    try {
      const recorded = await recordOperatorDecision(input);
      if (!recorded.ok) governanceFailed();
      return recorded.ok;
    } catch {
      governanceFailed();
      return false;
    } finally {
      governanceInFlight.current = false;
      setIsGovernancePending(false);
    }
  };
  const submitGovernedDeny = async (writtenBasis: string) => {
    if (decisionCase === undefined) return;
    const recommendation = decisionCase.result.recommendation;
    if (recommendation !== "offer_available" && recommendation !== "no_current_product_fit") return;
    const confirmsNoFit = recommendation === "no_current_product_fit";
    const recorded = await recordGovernance({
      billId,
      caseId: decisionCase.snapshot.caseId,
      decisionResultDigest: decisionCase.resultDigest,
      action: confirmsNoFit ? "confirm_no_current_product_fit" : "decline_application",
      reasonCode: confirmsNoFit ? "operator_confirmed_no_current_product_fit" : "operator_declined_governed_offer",
      writtenBasis,
    });
    if (!recorded) return;
    handleDenyQuote();
    setDenyConfirmDrawerOpen(false);
  };
  const submitGovernedOffer = async (finalData: OfferFormResult) => {
    if (governedOfferTtl(finalData) === null) {
      toast({
        title: intl.formatMessage({
          id: "quotes.toast.offer.invalidExpiry",
          defaultMessage: "The offer expiry is outside the governed validity period. Review it before offering the quote.",
          description: "Error shown when a Mint offer would outlive its governed credit decision",
        }),
        variant: "error",
      });
      return;
    }
    const recorded = await recordGovernance(finalData.governance);
    if (!recorded) return;
    removeItem(`offer-form-${value.id}`);
    handleOfferQuote(finalData);
    setOfferConfirmDrawerOpen(false);
  };
  const submitGovernedReturn = async (writtenBasis: string) => {
    if (decisionCase?.result.assessmentStatus !== "blocked_pending_verification" || requiredVerificationItems.length === 0) return;
    const recorded = await recordGovernance({
      billId,
      caseId: decisionCase.snapshot.caseId,
      decisionResultDigest: decisionCase.resultDigest,
      action: "return_for_information",
      reasonCode: "operator_returned_for_information",
      writtenBasis,
      requiredItems: requiredVerificationItems,
    });
    if (!recorded) return;
    setReturnInfoDrawerOpen(false);
    void queryClient.invalidateQueries({ queryKey: ["ai-credit", "decisions"] });
  };

  return (
    <>
      {showPendingActions || showRequestToPayAction ? (
        <div className="flex items-center gap-2">
          {showPendingActions && (
            <DenyConfirmDrawer
              title={denyTitle}
              open={denyConfirmDrawerOpen}
              onOpenChange={setDenyConfirmDrawerOpen}
              isPending={isGovernancePending}
              onSubmit={(writtenBasis) => {
                void submitGovernedDeny(writtenBasis);
              }}
            >
              <Button
                className="flex-1 max-w-sm"
                disabled={isFetching || denyQuote.isPending || isGovernancePending || !denyGovernanceAvailable}
                title={denyGovernanceAvailable ? undefined : denyUnavailableReason}
                variant="destructive"
              >
                {denyButtonLabel} {denyQuote.isPending && <AppIcon icon={LoaderIcon} weight="thin" className="animate-spin" />}
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
              <Button className="flex-1 max-w-sm" disabled={isFetching || offerQuote.isPending}>
                {offerButtonLabel} {offerQuote.isPending && <AppIcon icon={LoaderIcon} weight="thin" className="animate-spin" />}
              </Button>
            </OfferFormDrawer>
          )}

          {showGovernedReturn && (
            <DenyConfirmDrawer
              title={intl.formatMessage({
                id: "quotes.actions.returnForInformation.title",
                defaultMessage: "Return for information",
                description: "Confirmation title for returning a credit case for required verification information",
              })}
              mode="return_for_information"
              requiredItems={requiredVerificationItems}
              open={returnInfoDrawerOpen}
              onOpenChange={setReturnInfoDrawerOpen}
              isPending={isGovernancePending}
              onSubmit={(writtenBasis) => {
                void submitGovernedReturn(writtenBasis);
              }}
            >
              <Button
                className="flex-1 max-w-sm"
                disabled={isFetching || isGovernancePending || requiredVerificationItems.length === 0}
                variant="outline"
              >
                {intl.formatMessage({
                  id: "quotes.actions.returnForInformation.button",
                  defaultMessage: "Return for information",
                  description: "Action that returns a credit case for required verification information",
                })}
              </Button>
            </DenyConfirmDrawer>
          )}

          <OfferConfirmation
            offerFormData={offerFormData}
            open={offerConfirmDrawerOpen}
            onOpenChange={setOfferConfirmDrawerOpen}
            isPending={isGovernancePending}
            onSubmit={(finalData) => {
              void submitGovernedOffer(finalData);
            }}
            quoteId={value.id}
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
