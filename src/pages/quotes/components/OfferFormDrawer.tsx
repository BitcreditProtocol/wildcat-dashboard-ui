import Big from "big.js";
import { useEffect, useMemo, useRef, useState } from "react";
import { BaseDrawer } from "@/components/Drawers";
import { GrossToNetDiscountForm } from "@/components/GrossToNetDiscountForm/GrossToNetDiscountForm";
import type { InfoReply } from "@/generated/client/types.gen";
import { GovernedOfferGuidance } from "@/pages/credit/GovernedOfferGuidance";
import { recordOperatorDecision } from "@/pages/credit/record-operator-decision";
import { useCreditAssessmentForBill } from "@/pages/credit/use-credit-assessment";
import type { ReactNode } from "react";

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
  // The AI Credit assessment for this bill, from the same cached query the quote page already runs.
  // Its terms open the form; the operator confirms them or edits them. Absent — no application, or
  // the local adapter is not running — and the form behaves exactly as it did before.
  const { decisionCase } = useCreditAssessmentForBill(value.bill.id);
  const governedTerms = decisionCase?.result.recommendation === "offer_available" ? decisionCase.result.terms : null;

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

    // The governed record of the judgement behind this offer: confirming the computed amount, or
    // adjusting it. Deliberately not awaited — the Mint's offer is the operator's action and must
    // not wait on, or fail with, the local adapter.
    if (governedTerms !== null) {
      const offered = values.net.value.toFixed(0);
      const isGovernedAmount = offered === governedTerms.discountedSat;
      void recordOperatorDecision({
        billId: value.bill.id,
        action: isGovernedAmount ? "confirm_proposed_quote" : "propose_adjustment_and_requote",
        ...(isGovernedAmount ? {} : { discountedSat: offered }),
        reasonCode: isGovernedAmount ? "operator_confirmed_governed_terms" : "operator_adjusted_price_within_bounds",
        writtenBasis: isGovernedAmount
          ? "Offered the governed amount from the dashboard quote actions."
          : `Adjusted the governed amount to ${offered} sat from the dashboard quote actions.`,
      }).then((recorded) => {
        if (!recorded.ok) console.warn("AI Credit operator decision not recorded:", recorded.error);
      });
    }

    onSubmit(result);
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

  // The AI Credit assessment for this bill, from the same cached query the quote page already runs.
  // Its terms open the form; the operator confirms them or edits them. Absent — no application, or
  // the local adapter is not running — and the form behaves exactly as it did before.
  return (
    <BaseDrawer title={title} description={description} open={open} onOpenChange={onOpenChange} trigger={children}>
      {decisionCase !== undefined && governedTerms !== null && (
        <GovernedOfferGuidance policyPack={decisionCase.policyPack} terms={governedTerms} />
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
