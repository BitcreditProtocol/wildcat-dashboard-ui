import Big from "big.js";
import { useEffect, useMemo, useRef, useState } from "react";
import { defineMessages, useIntl } from "react-intl";
import { BaseDrawer } from "@/components/Drawers";
import { GrossToNetDiscountForm } from "@/components/GrossToNetDiscountForm/GrossToNetDiscountForm";
import type { InfoReply } from "@/generated/client/types.gen";
import { GovernedOfferGuidance } from "@/pages/credit/GovernedOfferGuidance";
import { recordOperatorDecision } from "@/pages/credit/record-operator-decision";
import { useCreditAssessmentForBill } from "@/pages/credit/use-credit-assessment";
import type { ReactNode } from "react";

const messages = defineMessages({
  recording: {
    id: "credit.offer.recording",
    defaultMessage: "Recording the governed decision…",
    description: "Shown while the operator's decision is being recorded, before the offer is made",
  },
  failed: {
    id: "credit.offer.recordFailed",
    defaultMessage: "This offer was not submitted: {error}",
    description: "Shown when a governed assessment prevents the Mint offer from being submitted",
  },
  retry: {
    id: "credit.offer.recordRetry",
    defaultMessage: "Submit again to retry. Nothing has been offered yet.",
    description: "Tells the operator the failure is retryable and no offer was made",
  },
  unavailable: {
    id: "credit.offer.assessmentUnavailable",
    defaultMessage: "The AI Credit assessment is unavailable.",
    description: "Shown when the assessment service has not returned a definitive result",
  },
  noOffer: {
    id: "credit.offer.noGovernedOffer",
    defaultMessage: "The governed assessment has no offer available.",
    description: "Shown when the assessment is blocked or recommends no product",
  },
});

export interface OfferFormResult {
  discount: {
    days: number;
    discountRate: Big;
    net: {
      value: Big;
      currency: string;
    };
    gross: {
      value: Big;
      currency: string;
    };
  };
  ttl: {
    ttl: Date;
  };
}

interface OfferFormDrawerProps {
  title: string;
  description: string;
  value: InfoReply;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (data: OfferFormResult) => void;
  children: ReactNode;
}

const ONE_HOUR_MS = 60 * 60 * 1000;

export function OfferFormDrawer({ title, description, value, open, onOpenChange, onSubmit, children }: OfferFormDrawerProps) {
  const intl = useIntl();
  // The AI Credit assessment for this bill, from the same cached query the quote page already runs.
  // Its terms open the form; the operator confirms them or edits them. Absent — no application, or
  // the local adapter is not running — and the form behaves exactly as it did before.
  const { decisionCase, isAbsent, isUnavailable } = useCreditAssessmentForBill(value.bill.id);
  const governedTerms = decisionCase?.result.recommendation === "offer_available" ? decisionCase.result.terms : null;

  const [recording, setRecording] = useState(false);
  const [submitError, setSubmitError] = useState<{ message: string; retryable: boolean }>();
  const recordingRef = useRef(false);
  /** Which judgement has already been recorded, so a retry after this step never records twice. */
  const recordedRef = useRef<string | undefined>(undefined);

  const handleFormSubmit = (values: {
    days: number;
    discountRate: Big;
    net: { value: Big; currency: string };
    gross: { value: Big; currency: string };
  }) => {
    const ttl = new Date(Date.now() + ONE_HOUR_MS);

    const result: OfferFormResult = {
      discount: values,
      ttl: { ttl },
    };

    // A definitive response with no case means this bill never entered AI Credit, so the Mint's
    // own flow is untouched. Loading/failure is not absence, and an existing blocked assessment
    // is not an offer: both fail closed.
    if (isUnavailable) {
      setSubmitError({ message: intl.formatMessage(messages.unavailable), retryable: true });
      return;
    }
    if (decisionCase === undefined && isAbsent) {
      onSubmit(result);
      return;
    }
    if (decisionCase === undefined) {
      setSubmitError({ message: intl.formatMessage(messages.unavailable), retryable: true });
      return;
    }
    if (governedTerms === null) {
      setSubmitError({ message: intl.formatMessage(messages.noOffer), retryable: false });
      return;
    }

    // One submission at a time. Without this, a second click while the first record is in flight
    // would record the judgement twice and could open the confirmation twice for one offer.
    if (recordingRef.current) return;

    const offered = values.net.value.toFixed(0);
    const isGovernedAmount = offered === governedTerms.discountedSat;
    const action = isGovernedAmount ? "confirm_proposed_quote" : "propose_adjustment_and_requote";
    const judgement = `${value.bill.id}:${decisionCase.snapshot.caseId}:${action}:${offered}`;

    setSubmitError(undefined);
    recordingRef.current = true;
    setRecording(true);
    void (async () => {
      try {
        // The governed record of the judgement behind this offer. It is awaited and it is a gate:
        // an AI-assessed case whose human decision was not recorded must not reach the Mint at all,
        // because the offer would then exist with no reviewer, reason or basis behind it (PRD §116).
        const recorded =
          recordedRef.current === judgement
            ? { ok: true as const }
            : await recordOperatorDecision({
                billId: value.bill.id,
                action,
                ...(isGovernedAmount ? {} : { discountedSat: offered }),
                reasonCode: isGovernedAmount ? "operator_confirmed_governed_terms" : "operator_adjusted_price_within_bounds",
                writtenBasis: isGovernedAmount
                  ? "Offered the governed amount from the dashboard quote actions."
                  : `Adjusted the governed amount to ${offered} sat from the dashboard quote actions.`,
              });
        if (!recorded.ok) {
          // Visible, not a console warning: the operator pressed submit and no offer was made.
          setSubmitError({ message: recorded.error, retryable: true });
          return;
        }
        recordedRef.current = judgement;
        onSubmit(result);
      } finally {
        recordingRef.current = false;
        setRecording(false);
      }
    })();
  };

  const [formKey, setFormKey] = useState(0);
  const prevOpenRef = useRef(false);

  useEffect(() => {
    if (open && !prevOpenRef.current) {
      setFormKey((k) => k + 1);
    }
    prevOpenRef.current = open;
  }, [open]);

  const startDate = useMemo(() => new Date(), []);
  const openedFormInstance = formKey;
  const endDate = useMemo(() => {
    void openedFormInstance;
    return value.bill.maturity_date ? new Date(value.bill.maturity_date) : new Date();
  }, [openedFormInstance, value.bill.maturity_date]);
  const gross = useMemo(() => ({ value: new Big(value.bill.sum), currency: "sat" as const }), [value.bill.sum]);

  return (
    <BaseDrawer title={title} description={description} open={open} onOpenChange={onOpenChange} trigger={children}>
      {decisionCase !== undefined && governedTerms !== null && (
        <GovernedOfferGuidance policyPack={decisionCase.policyPack} terms={governedTerms} />
      )}
      {recording && <p className="px-4 pb-2 text-xs text-muted-foreground">{intl.formatMessage(messages.recording)}</p>}
      {submitError !== undefined && (
        <p role="alert" className="px-4 pb-2 text-xs font-medium text-signal-alert">
          {intl.formatMessage(messages.failed, { error: submitError.message })}{" "}
          {submitError.retryable ? intl.formatMessage(messages.retry) : null}
        </p>
      )}
      <GrossToNetDiscountForm
        key={formKey}
        startDate={startDate}
        endDate={endDate}
        gross={gross}
        onSubmit={handleFormSubmit}
        quoteId={value.id}
        suggestedNet={governedTerms?.discountedSat}
      />
    </BaseDrawer>
  );
}
