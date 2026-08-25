import { Card } from "@bitcredit/ui-library";
import { ChevronDown } from "lucide-react";
import type { ReactNode } from "react";
import { defineMessages, useIntl } from "react-intl";
import { AssessmentPanel, PricingTrace } from "./AssessmentPanel";
import { ApplicantClaims, InvoiceEvidence } from "./CaseEvidence";
import { percentFromBps, words, type DecisionCase } from "./decision-types";

const messages = defineMessages({
  unknownSummary: {
    id: "credit.outcome.unknownSummary",
    defaultMessage: "This assessment cannot be read safely. No action is available.",
    description: "Fail-closed summary for an unreadable assessment",
  },
  ownerApplicant: {
    id: "credit.verification.owner.applicant",
    defaultMessage: "Applicant · request supporting information",
    description: "Resolution owner and action for applicant-owned verification",
  },
  ownerMintRisk: {
    id: "credit.verification.owner.mintRisk",
    defaultMessage: "Mint risk · record a current risk assessment",
    description: "Resolution owner and action for Mint risk verification",
  },
  ownerMintOperations: {
    id: "credit.verification.owner.mintOperations",
    defaultMessage: "Mint operations · refresh the Mint source",
    description: "Resolution owner and action for Mint operations verification",
  },
  ownerSystem: {
    id: "credit.verification.owner.system",
    defaultMessage: "System · retry the source check",
    description: "Resolution owner and action for system verification",
  },
  annualizedCost: {
    id: "credit.fee.annualizedCost",
    defaultMessage: "Annualized Minting fee rate",
    description: "Annualized Minting fee rate label",
  },
  annualizedCostHelp: {
    id: "credit.fee.annualizedCostHelp",
    defaultMessage: "Comparison metric including reimbursement",
    description: "Explanation of the annualized all-in cost",
  },
  repayment: {
    id: "credit.quote.repayment",
    defaultMessage: "Acceptor pays at maturity. Holder recourse applies only on dishonour; its legal form remains under review.",
    description: "Compact repayment and contingent-recourse disclosure",
  },
  repaymentHeading: {
    id: "credit.quote.repaymentHeading",
    defaultMessage: "Repayment & recourse",
    description: "Heading above the repayment and contingent-recourse disclosure",
  },
  reviewDetails: {
    id: "credit.details.applicationReview",
    defaultMessage: "Inputs and checks",
    description: "Expandable section containing applicant confirmation, invoice findings and deterministic checks",
  },
  reviewHint: {
    id: "credit.details.applicationReviewHint",
    defaultMessage: "Applicant confirmation, invoice findings and policy checks",
    description: "Caption for the application and decision-rationale disclosure",
  },
  policyDetails: {
    id: "credit.details.policy",
    defaultMessage: "Audit details",
    description: "Expandable section containing policy provenance and immutable identifiers",
  },
  feeDetails: {
    id: "credit.details.fee",
    defaultMessage: "Fee calculation",
    description: "Expandable section containing the immutable deterministic recommendation calculation",
  },
  feeHint: {
    id: "credit.details.feeHint",
    defaultMessage: "{fee} recommended fee",
    description: "Compact deterministic fee under the recommendation-calculation disclosure",
  },
  calculationUnavailable: {
    id: "credit.fee.unavailable",
    defaultMessage: "Calculation trace unavailable",
    description: "Fail-closed message when governed fee inputs are missing",
  },
  appliedDiscount: {
    id: "credit.fee.appliedDiscount",
    defaultMessage: "Time-based fee for {tenor} days",
    description: "Time-based component of the Minting fee",
  },
  fundingCost: { id: "credit.fee.fundingCost", defaultMessage: "Funding cost", description: "Pricing component label" },
  fundingCostHelp: {
    id: "credit.fee.fundingCostHelp",
    defaultMessage: "Mint’s annual cost of funds",
    description: "Explanation of the funding-cost component",
  },
  expectedLoss: { id: "credit.fee.expectedLoss", defaultMessage: "Expected loss", description: "Pricing component label" },
  expectedLossHelp: {
    id: "credit.fee.expectedLossHelp",
    defaultMessage: "Acceptor probability of default × loss given default",
    description: "Explanation of the expected-loss component",
  },
  expectedLossEquation: {
    id: "credit.fee.expectedLossEquation",
    defaultMessage: "{pd} PD × {lgd} LGD = {loss}",
    description: "Expected-loss rate calculation",
  },
  uncertainty: { id: "credit.fee.uncertainty", defaultMessage: "Uncertainty margin", description: "Pricing component label" },
  uncertaintyHelp: {
    id: "credit.fee.uncertaintyHelp",
    defaultMessage: "Selected from the admissible evidence quality",
    description: "Explanation of the uncertainty component",
  },
  returnObjective: { id: "credit.fee.return", defaultMessage: "Return objective", description: "Pricing component label" },
  returnObjectiveHelp: {
    id: "credit.fee.returnHelp",
    defaultMessage: "Mint’s target annual return",
    description: "Explanation of the return component",
  },
  subsidy: { id: "credit.fee.subsidy", defaultMessage: "Subsidy", description: "Pricing component label" },
  subsidyHelp: {
    id: "credit.fee.subsidyHelp",
    defaultMessage: "Policy subsidy, subtracted from the rate",
    description: "Explanation of the subsidy component",
  },
  annualDiscount: {
    id: "credit.fee.annualDiscount",
    defaultMessage: "Annualized Minting fee rate",
    description: "Annualized Minting fee rate label",
  },
  annualDiscountHelp: {
    id: "credit.fee.annualDiscountHelp",
    defaultMessage: "Funding + expected loss + uncertainty + return − subsidy",
    description: "Explanation of the annual discount rate",
  },
  appliedDiscountHelp: {
    id: "credit.fee.appliedDiscountHelp",
    defaultMessage: "Applied to the whole bill using a {dayCount}-day year",
    description: "Explanation of the tenor-adjusted discount",
  },
  operatingCost: { id: "credit.fee.operatingCost", defaultMessage: "Reimbursement", description: "Fixed reimbursement label" },
  operatingCostHelp: {
    id: "credit.fee.operatingCostHelp",
    defaultMessage: "Fixed reimbursement for this case",
    description: "Explanation of the reimbursement",
  },
  totalFee: { id: "credit.fee.total", defaultMessage: "Minting fee", description: "Whole-bill Minting fee" },
  totalFeeHelp: {
    id: "credit.fee.totalHelp",
    defaultMessage: "Time-based fee + reimbursement",
    description: "Explanation of the Minting fee",
  },
  allInBillCost: {
    id: "credit.fee.allInBillCost",
    defaultMessage: "Minting fee ratio",
    description: "All-in fee ratio label",
  },
  allInBillCostHelp: {
    id: "credit.fee.allInBillCostHelp",
    defaultMessage: "Total fee as a share of the bill amount",
    description: "Explanation of the all-in bill cost ratio",
  },
  netOffer: {
    id: "credit.fee.netOffer",
    defaultMessage: "Amount available for minting",
    description: "Net amount recommended after the whole-bill fee",
  },
  netOfferHelp: {
    id: "credit.fee.netOfferHelp",
    defaultMessage: "Bill amount − total fee",
    description: "Explanation of the net offer amount",
  },
  discountEquation: {
    id: "credit.fee.discountEquation",
    defaultMessage: "{bill} × {rate} × {tenor} / {dayCount} = {discount}",
    description: "Whole-bill applied discount calculation",
  },
  totalFeeEquation: {
    id: "credit.fee.totalFeeEquation",
    defaultMessage: "{discount} time-based fee + {cost} reimbursement = {fee}",
    description: "Whole-bill total fee calculation",
  },
  feeRatioEquation: {
    id: "credit.fee.feeRatioEquation",
    defaultMessage: "{fee} ÷ {bill} = {rate}",
    description: "All-in fee as a percentage of the bill amount",
  },
  annualizedCostEquation: {
    id: "credit.fee.annualizedCostEquation",
    defaultMessage: "{fee} ÷ ({offer} × {tenor} / {dayCount}) = {rate}",
    description: "Annualized all-in cost calculation",
  },
  offerEquation: {
    id: "credit.fee.offerEquation",
    defaultMessage: "{bill} − {fee} = {offer}",
    description: "Whole-bill offer amount calculation",
  },
  product: { id: "credit.audit.product", defaultMessage: "Product", description: "Policy product label" },
  creditProgram: {
    id: "credit.audit.creditProgram",
    defaultMessage: "Credit program",
    description: "Mint-owned credit program identifier used to select the governed policy",
  },
  creditProgramVersion: {
    id: "credit.audit.creditProgramVersion",
    defaultMessage: "Program version",
    description: "Immutable Mint credit program release bound to the quote",
  },
  creditProgramAssignment: {
    id: "credit.audit.creditProgramAssignment",
    defaultMessage: "Quote assignment",
    description: "Digest binding the Mint quote and bill to the credit program",
  },
  creditProgramDigest: {
    id: "credit.audit.creditProgramDigest",
    defaultMessage: "Program digest",
    description: "Digest of the immutable Mint credit program release",
  },
  legacyReadOnly: {
    id: "credit.audit.legacyReadOnly",
    defaultMessage: "Read-only legacy assessment. A fresh Mint credit-program assignment is required before any action.",
    description: "Warning shown when an older governed assessment lacks the Mint quote-to-program binding required for action",
  },
  policyFile: {
    id: "credit.audit.policyFile",
    defaultMessage: "Policy file",
    description: "Exact policy JSON file used for the calculation",
  },
  policyVersion: { id: "credit.audit.policyVersion", defaultMessage: "Policy version", description: "Policy version label" },
  calculationVersion: {
    id: "credit.audit.calculationVersion",
    defaultMessage: "Calculation version",
    description: "Calculation version label",
  },
  caseId: { id: "credit.audit.caseId", defaultMessage: "Case", description: "Immutable case identifier label" },
  snapshotDate: { id: "credit.audit.snapshotDate", defaultMessage: "Snapshot date", description: "Decision snapshot date label" },
  policyDigest: { id: "credit.audit.policyDigest", defaultMessage: "Policy digest", description: "Policy digest label" },
  resultDigest: { id: "credit.audit.resultDigest", defaultMessage: "Result digest", description: "Decision result digest label" },
  annualLimit: {
    id: "credit.audit.annualLimit",
    defaultMessage: "Maximum effective annual cost",
    description: "Policy limit for effective annual cost",
  },
  feeLimit: {
    id: "credit.audit.feeLimit",
    defaultMessage: "Maximum fee ratio",
    description: "Policy limit for the whole-bill fee ratio",
  },
  verification: {
    id: "credit.verification",
    defaultMessage: "Required before a decision:",
    description: "Heading above outstanding verification requests",
  },
  noFitReasons: {
    id: "credit.quote.noFitReasons",
    defaultMessage: "Policy reasons: {reasons}",
    description: "Reason summary for a no-current-product-fit outcome",
  },
  noFitAnnualMath: {
    id: "credit.quote.noFitAnnualMath",
    defaultMessage: "Effective annual cost {observed} − {limit} maximum = {over} over policy.",
    description: "Exact observed-versus-limit calculation for an annual-cost no-fit decision",
  },
  noFitFeeMath: {
    id: "credit.quote.noFitFeeMath",
    defaultMessage: "Fee ratio {observed} − {limit} maximum = {over} over policy.",
    description: "Exact observed-versus-limit calculation for a fee-ratio no-fit decision",
  },
  noFitFixedCost: {
    id: "credit.quote.noFitFixedCost",
    defaultMessage: "{cost} reimbursement on a {bill} bill contributes to the {fee} Minting fee.",
    description: "Exact fixed-cost driver from the deterministic no-fit calculation trace",
  },
  assessed: {
    id: "credit.audit.freshness",
    defaultMessage: "Assessed {asOf} · evidence valid through {validThrough}",
    description: "Visible freshness of the deterministic assessment and its earliest evidence expiry",
  },
  mintId: { id: "credit.audit.mintId", defaultMessage: "Mint", description: "Mint that produced the governed decision" },
  snapshotDigest: {
    id: "credit.audit.snapshotDigest",
    defaultMessage: "Snapshot digest",
    description: "Immutable digest of the exact decision input snapshot",
  },
});

function DecisionException({ decisionCase, formatSat }: { decisionCase: DecisionCase; formatSat: (value: string) => string }) {
  const intl = useIntl();
  const { result } = decisionCase;
  return (
    <div className="rounded-lg border border-border bg-elevation-100 p-4">
      {result.assessmentStatus === "blocked_pending_verification" ? (
        <>
          <p className="font-medium text-signal-alert">{intl.formatMessage(messages.verification)}</p>
          <ul className="mt-2 list-disc space-y-1 pl-5 text-sm">
            {result.verificationRequests.map((request) => (
              <li key={request.code}>
                <span>{request.requiredItem}</span>
                <span className="mt-0.5 block text-xs text-muted-foreground">
                  {intl.formatMessage(
                    request.owner === "applicant"
                      ? messages.ownerApplicant
                      : request.owner === "mint_risk"
                        ? messages.ownerMintRisk
                        : request.owner === "mint_operations"
                          ? messages.ownerMintOperations
                          : messages.ownerSystem
                  )}
                </span>
              </li>
            ))}
          </ul>
        </>
      ) : result.recommendation === "no_current_product_fit" ? (
        <div className="flex flex-col gap-1 text-sm text-muted-foreground">
          <NoFitMath decisionCase={decisionCase} formatSat={formatSat} />
          <p>{intl.formatMessage(messages.noFitReasons, { reasons: result.reasonCodes.map(words).join("; ") })}</p>
        </div>
      ) : (
        <p className="font-medium text-signal-alert">{intl.formatMessage(messages.unknownSummary)}</p>
      )}
    </div>
  );
}

function NoFitMath({ decisionCase, formatSat }: { decisionCase: DecisionCase; formatSat: (value: string) => string }) {
  const intl = useIntl();
  const failure = decisionCase.result.assessmentTrace.find((step) => step.outcome === "fail");
  const bps = (value: unknown): number | undefined => {
    const parsed = typeof value === "number" ? value : typeof value === "string" && /^\d+$/.test(value) ? Number(value) : Number.NaN;
    return Number.isSafeInteger(parsed) && parsed >= 0 ? parsed : undefined;
  };
  const feeStep = decisionCase.result.calculationTrace.find((step) => step.step === "effective_fee_sat");
  const offerStep = decisionCase.result.calculationTrace.find((step) => step.step === "discounted_sat");
  const operatingCost = feeStep?.inputs.operatingCostSat;
  const billSum = offerStep?.inputs.billSumSat;
  const effectiveFee = failure?.observed.effectiveFeeSat;
  const fixedCost =
    typeof operatingCost === "string" &&
    /^\d+$/.test(operatingCost) &&
    typeof billSum === "string" &&
    /^\d+$/.test(billSum) &&
    typeof effectiveFee === "string" &&
    /^\d+$/.test(effectiveFee) &&
    feeStep?.result === effectiveFee ? (
      <p>
        {intl.formatMessage(messages.noFitFixedCost, {
          cost: formatSat(operatingCost),
          bill: formatSat(billSum),
          fee: formatSat(effectiveFee),
        })}
      </p>
    ) : null;
  const observedAnnual = bps(failure?.observed.effectiveAnnualBps);
  const annualLimit = bps(failure?.policy.maximumEffectiveAnnualBps);
  if (
    failure?.reasonCode === "cost_above_policy_ceiling" &&
    observedAnnual !== undefined &&
    annualLimit !== undefined &&
    observedAnnual > annualLimit
  ) {
    return (
      <div className="flex flex-col gap-1">
        <p className="font-medium text-signal-alert">
          {intl.formatMessage(messages.noFitAnnualMath, {
            observed: percentFromBps(observedAnnual),
            limit: percentFromBps(annualLimit),
            over: percentFromBps(observedAnnual - annualLimit),
          })}
        </p>
        {fixedCost}
      </div>
    );
  }
  const observedFee = bps(failure?.observed.feeRatioBps);
  const feeLimit = bps(failure?.policy.maximumFeeRatioBps);
  if (
    failure?.reasonCode === "fee_ratio_above_policy_ceiling" &&
    observedFee !== undefined &&
    feeLimit !== undefined &&
    observedFee > feeLimit
  ) {
    return (
      <div className="flex flex-col gap-1">
        <p className="font-medium text-signal-alert">
          {intl.formatMessage(messages.noFitFeeMath, {
            observed: percentFromBps(observedFee),
            limit: percentFromBps(feeLimit),
            over: percentFromBps(observedFee - feeLimit),
          })}
        </p>
        {fixedCost}
      </div>
    );
  }
  return null;
}

function Disclosure({ title, hint, children }: { title: string; hint: string; children: ReactNode }) {
  return (
    <details className="group border-t border-border">
      <summary className="flex cursor-pointer list-none items-center gap-3 px-5 py-3.5 hover:bg-elevation-100 [&::-webkit-details-marker]:hidden">
        <span className="min-w-0 flex-1">
          <span className="block text-sm font-medium">{title}</span>
          <span className="block truncate text-xs text-muted-foreground">{hint}</span>
        </span>
        <ChevronDown className="size-4 shrink-0 text-muted-foreground transition-transform group-open:rotate-180" />
      </summary>
      <div className="flex flex-col gap-5 border-t border-border px-5 py-4">{children}</div>
    </details>
  );
}

function AuditRow({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="grid gap-0.5 sm:grid-cols-[10rem_1fr] sm:gap-3">
      <dt className="text-xs text-muted-foreground">{label}</dt>
      <dd className="min-w-0 break-all text-xs font-medium">{children}</dd>
    </div>
  );
}

function FeeRow({ label, help, children, total = false }: { label: string; help: string; children: ReactNode; total?: boolean }) {
  return (
    <div className={`grid gap-1 py-1.5 sm:grid-cols-[15rem_1fr] sm:items-baseline sm:gap-4 ${total ? "border-t border-border pt-3" : ""}`}>
      <dt>
        <span className="block font-medium">{label}</span>
        <span className="block text-xs text-muted-foreground">{help}</span>
      </dt>
      <dd className="font-medium sm:text-right">{children}</dd>
    </div>
  );
}

function FeeCalculation({ decisionCase, formatSat }: { decisionCase: DecisionCase; formatSat: (value: string) => string }) {
  const intl = useIntl();
  const terms = decisionCase.result.terms;
  const rate = decisionCase.result.calculationTrace.find((step) => step.step === "annual_discount_bps");
  const discount = decisionCase.result.calculationTrace.find((step) => step.step === "applied_discount_sat");
  const numberInput = (key: string): number | undefined => {
    const value = rate?.inputs[key];
    return typeof value === "number" && Number.isSafeInteger(value) && value >= 0 ? value : undefined;
  };
  const denominatorValue = discount?.inputs.dayCountDenominator;
  const dayCountDenominator =
    typeof denominatorValue === "number" && Number.isSafeInteger(denominatorValue) && denominatorValue > 0 ? denominatorValue : undefined;
  const costOfFundsBps = numberInput("costOfFundsBps");
  const expectedLossBps = numberInput("expectedLossBps");
  const uncertaintyMarginBps = numberInput("uncertaintyMarginBps");
  const returnObjectiveBps = numberInput("returnObjectiveBps");
  const subsidyBps = numberInput("subsidyBps");
  const probabilityOfDefaultBps = decisionCase.snapshot.acceptor.probabilityOfDefaultBps;
  const lossGivenDefaultBps = decisionCase.snapshot.acceptor.lossGivenDefaultBps;
  const snapshotExpectedLossBps =
    probabilityOfDefaultBps === null || lossGivenDefaultBps === null
      ? undefined
      : Math.ceil((probabilityOfDefaultBps * lossGivenDefaultBps) / 10_000);

  if (
    terms === null ||
    costOfFundsBps === undefined ||
    expectedLossBps === undefined ||
    uncertaintyMarginBps === undefined ||
    returnObjectiveBps === undefined ||
    subsidyBps === undefined ||
    probabilityOfDefaultBps === null ||
    lossGivenDefaultBps === null ||
    snapshotExpectedLossBps === undefined ||
    dayCountDenominator === undefined
  ) {
    return <p className="text-sm font-medium text-signal-alert">{intl.formatMessage(messages.calculationUnavailable)}</p>;
  }
  if (
    costOfFundsBps + expectedLossBps + uncertaintyMarginBps + returnObjectiveBps - subsidyBps !== terms.annualDiscountBps ||
    snapshotExpectedLossBps !== expectedLossBps ||
    rate?.result !== String(terms.annualDiscountBps) ||
    discount?.result !== terms.appliedDiscountSat
  ) {
    return <p className="text-sm font-medium text-signal-alert">{intl.formatMessage(messages.calculationUnavailable)}</p>;
  }

  return (
    <div className="flex flex-col gap-4 tabular-nums">
      <dl className="grid text-sm">
        <FeeRow label={intl.formatMessage(messages.fundingCost)} help={intl.formatMessage(messages.fundingCostHelp)}>
          {percentFromBps(costOfFundsBps)}
        </FeeRow>
        <FeeRow label={intl.formatMessage(messages.expectedLoss)} help={intl.formatMessage(messages.expectedLossHelp)}>
          {intl.formatMessage(messages.expectedLossEquation, {
            pd: percentFromBps(probabilityOfDefaultBps),
            lgd: percentFromBps(lossGivenDefaultBps),
            loss: percentFromBps(expectedLossBps),
          })}
        </FeeRow>
        <FeeRow label={intl.formatMessage(messages.uncertainty)} help={intl.formatMessage(messages.uncertaintyHelp)}>
          {percentFromBps(uncertaintyMarginBps)}
        </FeeRow>
        <FeeRow label={intl.formatMessage(messages.returnObjective)} help={intl.formatMessage(messages.returnObjectiveHelp)}>
          {percentFromBps(returnObjectiveBps)}
        </FeeRow>
        <FeeRow label={intl.formatMessage(messages.subsidy)} help={intl.formatMessage(messages.subsidyHelp)}>
          −{percentFromBps(subsidyBps)}
        </FeeRow>
        <FeeRow label={intl.formatMessage(messages.annualDiscount)} help={intl.formatMessage(messages.annualDiscountHelp)} total>
          {percentFromBps(terms.annualDiscountBps)}
        </FeeRow>
        <FeeRow
          label={intl.formatMessage(messages.appliedDiscount, { tenor: terms.tenorDays })}
          help={intl.formatMessage(messages.appliedDiscountHelp, { dayCount: dayCountDenominator })}
        >
          {intl.formatMessage(messages.discountEquation, {
            bill: formatSat(terms.billSumSat),
            rate: percentFromBps(terms.annualDiscountBps),
            tenor: terms.tenorDays,
            dayCount: dayCountDenominator,
            discount: formatSat(terms.appliedDiscountSat),
          })}
        </FeeRow>
        <FeeRow label={intl.formatMessage(messages.operatingCost)} help={intl.formatMessage(messages.operatingCostHelp)}>
          {formatSat(terms.operatingCostSat)}
        </FeeRow>
        <FeeRow label={intl.formatMessage(messages.totalFee)} help={intl.formatMessage(messages.totalFeeHelp)} total>
          {intl.formatMessage(messages.totalFeeEquation, {
            discount: formatSat(terms.appliedDiscountSat),
            cost: formatSat(terms.operatingCostSat),
            fee: formatSat(terms.effectiveFeeSat),
          })}
        </FeeRow>
        <FeeRow label={intl.formatMessage(messages.allInBillCost)} help={intl.formatMessage(messages.allInBillCostHelp)}>
          {intl.formatMessage(messages.feeRatioEquation, {
            fee: formatSat(terms.effectiveFeeSat),
            bill: formatSat(terms.billSumSat),
            rate: percentFromBps(terms.feeRatioBps),
          })}
        </FeeRow>
        <FeeRow label={intl.formatMessage(messages.annualizedCost)} help={intl.formatMessage(messages.annualizedCostHelp)}>
          {intl.formatMessage(messages.annualizedCostEquation, {
            fee: formatSat(terms.effectiveFeeSat),
            offer: formatSat(terms.discountedSat),
            tenor: terms.tenorDays,
            dayCount: dayCountDenominator,
            rate: percentFromBps(terms.effectiveAnnualBps),
          })}
        </FeeRow>
        <FeeRow label={intl.formatMessage(messages.netOffer)} help={intl.formatMessage(messages.netOfferHelp)} total>
          {intl.formatMessage(messages.offerEquation, {
            bill: formatSat(terms.billSumSat),
            fee: formatSat(terms.effectiveFeeSat),
            offer: formatSat(terms.discountedSat),
          })}
        </FeeRow>
      </dl>

      <div className="border-t border-border pt-3">
        <div className="text-xs font-medium">{intl.formatMessage(messages.repaymentHeading)}</div>
        <p className="mt-1 text-xs text-muted-foreground">{intl.formatMessage(messages.repayment)}</p>
      </div>
    </div>
  );
}

export function CreditAssessmentCard({ decisionCase }: { decisionCase: DecisionCase }) {
  const intl = useIntl();
  const formatSat = (value: string) => `${intl.formatNumber(Number(value))} sat`;
  const { snapshot, policyPack } = decisionCase;
  const offerTerms =
    decisionCase.result.assessmentStatus === "ready_for_decision" && decisionCase.result.recommendation === "offer_available"
      ? decisionCase.result.terms
      : null;
  const validThrough = [snapshot.duplicateCheck.validThrough, snapshot.mintCapacity.validThrough]
    .concat(snapshot.invoice === null ? [] : snapshot.invoice.validThrough)
    .reduce((earliest, date) => (date < earliest ? date : earliest), snapshot.acceptor.validThrough);

  return (
    <Card className="gap-0 overflow-hidden p-0 text-sm">
      <div className="flex flex-col gap-3 p-5">
        <p className="text-xs text-muted-foreground">{intl.formatMessage(messages.assessed, { asOf: snapshot.asOfDate, validThrough })}</p>
        {decisionCase.mintQuoteId !== null && decisionCase.creditProgram === undefined && (
          <p className="text-xs font-medium text-amber-600 dark:text-amber-400">{intl.formatMessage(messages.legacyReadOnly)}</p>
        )}
        {offerTerms === null && <DecisionException decisionCase={decisionCase} formatSat={formatSat} />}
      </div>

      {offerTerms !== null && (
        <Disclosure
          title={intl.formatMessage(messages.feeDetails)}
          hint={intl.formatMessage(messages.feeHint, {
            fee: formatSat(offerTerms.effectiveFeeSat),
          })}
        >
          <FeeCalculation decisionCase={decisionCase} formatSat={formatSat} />
        </Disclosure>
      )}

      <Disclosure title={intl.formatMessage(messages.reviewDetails)} hint={intl.formatMessage(messages.reviewHint)}>
        <ApplicantClaims
          claims={snapshot.confirmedClaims}
          applicantRef={snapshot.applicantRef}
          confirmation={decisionCase.applicantConfirmation}
          submittedEvidence={decisionCase.submittedEvidence ?? []}
        />
        <InvoiceEvidence invoice={snapshot.invoice} />
        <AssessmentPanel decisionCase={decisionCase} formatSat={formatSat} />
      </Disclosure>

      <Disclosure
        title={intl.formatMessage(messages.policyDetails)}
        hint={`${policyPack.country} · ${words(policyPack.industry)} · ${decisionCase.policyFileName}`}
      >
        <dl className="flex flex-col gap-2">
          {decisionCase.creditProgram !== undefined && decisionCase.creditProgramAssignment !== undefined && (
            <>
              <AuditRow label={intl.formatMessage(messages.creditProgram)}>{words(decisionCase.creditProgram.creditProgramId)}</AuditRow>
              <AuditRow label={intl.formatMessage(messages.creditProgramVersion)}>
                {decisionCase.creditProgram.creditProgramVersion}
              </AuditRow>
              <AuditRow label={intl.formatMessage(messages.creditProgramDigest)}>
                <span title={decisionCase.creditProgram.creditProgramDigest}>{decisionCase.creditProgram.creditProgramDigest}</span>
              </AuditRow>
              <AuditRow label={intl.formatMessage(messages.creditProgramAssignment)}>
                <span title={decisionCase.creditProgramAssignment.assignmentDigest}>
                  {decisionCase.creditProgramAssignment.assignmentDigest}
                </span>
              </AuditRow>
            </>
          )}
          <AuditRow label={intl.formatMessage(messages.policyFile)}>{decisionCase.policyFileName}</AuditRow>
          <AuditRow label={intl.formatMessage(messages.product)}>{words(policyPack.product).replace(/\bdiscount\b/gi, "Minting")}</AuditRow>
          <AuditRow label={intl.formatMessage(messages.policyVersion)}>{policyPack.policyPackVersion}</AuditRow>
          <AuditRow label={intl.formatMessage(messages.calculationVersion)}>{policyPack.calculationVersion}</AuditRow>
          <AuditRow label={intl.formatMessage(messages.annualLimit)}>{percentFromBps(policyPack.maximumEffectiveAnnualBps)}</AuditRow>
          <AuditRow label={intl.formatMessage(messages.feeLimit)}>{percentFromBps(policyPack.maximumFeeRatioBps)}</AuditRow>
          <AuditRow label={intl.formatMessage(messages.mintId)}>{snapshot.mintId}</AuditRow>
          <AuditRow label={intl.formatMessage(messages.caseId)}>{snapshot.caseId}</AuditRow>
          <AuditRow label={intl.formatMessage(messages.snapshotDate)}>{snapshot.asOfDate}</AuditRow>
          <AuditRow label={intl.formatMessage(messages.snapshotDigest)}>
            <span title={snapshot.snapshotDigest}>{snapshot.snapshotDigest}</span>
          </AuditRow>
          <AuditRow label={intl.formatMessage(messages.policyDigest)}>
            <span title={policyPack.policyPackDigest}>{policyPack.policyPackDigest}</span>
          </AuditRow>
          <AuditRow label={intl.formatMessage(messages.resultDigest)}>
            <span title={decisionCase.resultDigest}>{decisionCase.resultDigest}</span>
          </AuditRow>
        </dl>
        <PricingTrace steps={decisionCase.result.calculationTrace} />
      </Disclosure>
    </Card>
  );
}
