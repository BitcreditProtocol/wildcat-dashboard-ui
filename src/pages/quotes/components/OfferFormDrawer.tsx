import Big from "big.js";
import { useEffect, useMemo, useRef, useState } from "react";
import { BaseDrawer } from "@/components/Drawers";
import { GrossToNetDiscountForm } from "@/components/GrossToNetDiscountForm/GrossToNetDiscountForm";
import type { InfoReply } from "@/generated/client/types.gen";
import { GovernedOfferGuidance } from "@/pages/credit/GovernedOfferGuidance";
import type { OperatorDecisionInput } from "@/pages/credit/record-operator-decision";
import { useCreditAssessmentForBill } from "@/pages/credit/use-credit-assessment";
import type { FormEvent, ReactNode } from "react";
import { FormattedMessage, useIntl } from "react-intl";

export interface OfferFormResult {
  governance: OperatorDecisionInput;
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
  /** End-of-day UTC for the governed date. Kept outside `ttl`, which the confirmation drawer replaces. */
  governedOfferExpiresAt?: Date;
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
  // Its terms open the form; the operator confirms them or edits them. The Mint action is blocked
  // unless the same governed case accepts that review first.
  const { decisionCase } = useCreditAssessmentForBill(value.bill.id);
  const governedTerms = decisionCase?.result.recommendation === "offer_available" ? decisionCase.result.terms : null;
  const [amountExceedsMaximum, setAmountExceedsMaximum] = useState(false);
  const [writtenBasis, setWrittenBasis] = useState("");
  const [showBasisError, setShowBasisError] = useState(false);
  const governedMaximum = useMemo(() => {
    if (governedTerms === null) return null;
    try {
      const maximum = new Big(governedTerms.billSumSat).minus(governedTerms.operatingCostSat);
      return maximum.gte(0) ? maximum : null;
    } catch {
      return null;
    }
  }, [governedTerms]);
  const governedOfferExpiresAt = useMemo(() => {
    if (governedTerms === null) return null;
    const expiry = new Date(`${governedTerms.offerExpiresOn}T23:59:59.999Z`);
    return Number.isNaN(expiry.getTime()) ? null : expiry;
  }, [governedTerms]);

  const validateAmount = (offered: Big): boolean => {
    if (governedMaximum === null) return false;
    if (offered.gt(governedMaximum)) {
      setAmountExceedsMaximum(true);
      return false;
    }
    setAmountExceedsMaximum(false);
    return true;
  };

  const handleNetInput = (event: FormEvent<HTMLDivElement>) => {
    if (!(event.target instanceof HTMLInputElement) || event.target.id !== "netInput") return;
    const digits = event.target.value.replace(/\D/g, "");
    if (digits.length > 0) validateAmount(new Big(digits));
  };

  const handleFormSubmit = (values: {
    days: number;
    discountRate: Big;
    net: { value: Big; currency: string };
    gross: { value: Big; currency: string };
  }) => {
    if (
      governedTerms === null ||
      decisionCase === undefined ||
      governedMaximum === null ||
      governedOfferExpiresAt === null ||
      governedOfferExpiresAt.getTime() <= Date.now()
    ) {
      return;
    }
    const offeredValue = values.net.value.round(0, Big.roundDown);
    const trimmedBasis = writtenBasis.trim();
    const amountIsValid = validateAmount(offeredValue);
    const basisIsValid = trimmedBasis.length >= 20;
    setShowBasisError(!basisIsValid);
    if (!amountIsValid || !basisIsValid) return;

    const ttl = new Date(Math.min(Date.now() + ONE_HOUR_MS, governedOfferExpiresAt.getTime()));
    const offered = offeredValue.toFixed(0);
    const isGovernedAmount = offered === governedTerms.discountedSat;
    const result: OfferFormResult = {
      governance: {
        billId: value.bill.id,
        caseId: decisionCase.snapshot.caseId,
        decisionResultDigest: decisionCase.resultDigest,
        action: isGovernedAmount ? "confirm_proposed_quote" : "propose_adjustment_and_requote",
        ...(isGovernedAmount ? {} : { discountedSat: offered }),
        reasonCode: isGovernedAmount ? "operator_confirmed_governed_terms" : "operator_adjusted_price_within_bounds",
        writtenBasis: trimmedBasis,
      },
      discount: values,
      ttl: { ttl },
      governedOfferExpiresAt,
    };

    onSubmit(result);
  };

  const [formKey, setFormKey] = useState(0);
  const prevOpenRef = useRef(false);

  useEffect(() => {
    if (open && !prevOpenRef.current) {
      setFormKey((k) => k + 1);
      setAmountExceedsMaximum(false);
      setWrittenBasis("");
      setShowBasisError(false);
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
      {decisionCase === undefined ||
      governedTerms === null ||
      governedMaximum === null ||
      governedOfferExpiresAt === null ||
      governedOfferExpiresAt.getTime() <= Date.now() ? (
        <p role="alert">
          <FormattedMessage
            id="credit.offer.governanceRequired"
            defaultMessage="A governed offer is unavailable. Resolve or retry its assessment before offering terms."
            description="Blocks a Mint offer until AI Credit has a valid governed offer for the bill"
          />
        </p>
      ) : (
        <>
          <GovernedOfferGuidance policyPack={decisionCase.policyPack} terms={governedTerms} />
          <div className="px-4 pb-4 text-xs text-muted-foreground">
            <FormattedMessage
              id="credit.offer.adjustmentLimits"
              defaultMessage="Governed amount: {governed} sat. Absolute maximum: {maximum} sat. Lower adjustments are checked against policy when confirmed. The governed offer expires {expiresOn}."
              description="Governed amount, exposed absolute maximum and governed expiry shown above the Mint offer form"
              values={{
                governed: governedTerms.discountedSat,
                maximum: governedMaximum.toFixed(0),
                expiresOn: governedTerms.offerExpiresOn,
              }}
            />
          </div>
          <div className="px-4 pb-4">
            <label className="mb-2 block text-sm font-medium" htmlFor="offer-written-basis">
              <FormattedMessage
                id="credit.offer.writtenBasis.label"
                defaultMessage="Decision basis"
                description="Label for the operator's written basis when confirming or adjusting a governed offer"
              />
            </label>
            <textarea
              aria-describedby="offer-written-basis-help"
              aria-invalid={showBasisError}
              className="min-h-24 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
              id="offer-written-basis"
              maxLength={2_000}
              onChange={(event) => {
                setWrittenBasis(event.target.value);
                if (showBasisError) setShowBasisError(event.target.value.trim().length < 20);
              }}
              placeholder={intl.formatMessage({
                id: "credit.offer.writtenBasis.placeholder",
                defaultMessage: "Explain the reviewed basis for this offer",
                description: "Placeholder for the operator's written basis on a governed offer",
              })}
              required
              value={writtenBasis}
            />
            <p
              className={showBasisError ? "mt-1 text-xs text-destructive" : "mt-1 text-xs text-muted-foreground"}
              id="offer-written-basis-help"
            >
              <FormattedMessage
                id="credit.offer.writtenBasis.help"
                defaultMessage="Required, at least 20 characters. This is stored with the governed decision."
                description="Help and validation text for the operator's written basis on a governed offer"
              />
            </p>
          </div>
          <div onInput={handleNetInput}>
            <GrossToNetDiscountForm
              key={formKey}
              startDate={startDate}
              endDate={endDate}
              gross={gross}
              onSubmit={handleFormSubmit}
              quoteId={value.id}
              suggestedNet={governedTerms.discountedSat}
            />
          </div>
          {!amountExceedsMaximum ? null : (
            <p className="px-4 pb-3 text-sm text-destructive" role="alert">
              <FormattedMessage
                id="credit.offer.amountAboveMaximum"
                defaultMessage="This amount is above the maximum that covers operating cost."
                description="Validation message when an adjusted Mint offer is outside the safe governed range"
              />
            </p>
          )}
        </>
      )}
    </BaseDrawer>
  );
}
