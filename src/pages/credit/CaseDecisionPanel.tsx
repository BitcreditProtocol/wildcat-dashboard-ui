import { cn } from "@bitcredit/ui-library";
import { ChevronDown, CircleAlert, CircleCheck } from "lucide-react";
import type { ReactNode } from "react";
import { defineMessages, useIntl } from "react-intl";
import { Currency } from "@/components/Currency";
import type { CaseBrief } from "./case-brief";
import { CaseNextStepPanel } from "./CaseBrief";
import type { DecisionCase, DecisionTerms } from "./decision-types";
import type { FeeBreakdown, FeePart } from "./fee-breakdown";

const messages = defineMessages({
  title: { id: "credit.decision.title", defaultMessage: "Decision", description: "Heading of the operator decision column" },
  terms: {
    id: "credit.decision.terms",
    defaultMessage: "Proposed minting fee",
    description: "Governed terms calculated for the current assessment; not an offer until the operator sends one",
  },
  validThrough: {
    id: "credit.decision.validThrough",
    defaultMessage: "Valid through {date}",
    description: "Last day the governed terms can be offered",
  },
  holderReceives: {
    id: "credit.decision.holderWouldReceive",
    defaultMessage: "Holder would receive",
    description: "Net payout the holder would receive if this fee is offered and accepted; not available value",
  },
  holderReceivesContext: {
    id: "credit.decision.billDue",
    defaultMessage: "for a {bill} bill due {date}",
    description: "Bill face amount and maturity date under the net payout",
  },
  payerPays: {
    id: "credit.decision.payerPays",
    defaultMessage: "Payer pays at maturity",
    description: "What the payer owes the Mint on the maturity date: the bill amount",
  },
  recourse: {
    id: "credit.decision.recourse",
    defaultMessage: "Applicant liable if unpaid",
    description: "The applicant's contingent recourse exposure by endorsing the bill",
  },
  discount: {
    id: "credit.decision.discount",
    defaultMessage: "Discount for {days, plural, one {# day} other {# days}}",
    description: "Time-priced part of the minting fee; its parts are listed beneath it",
  },
  operatingCost: {
    id: "credit.decision.operatingCost",
    defaultMessage: "Operating cost",
    description: "Fixed governed operating cost included in the minting fee",
  },
  operatingCostDetail: {
    id: "credit.decision.operatingCostDetail",
    defaultMessage: "Fixed per case",
    description: "The operating cost does not depend on the bill amount or time",
  },
  mintingFee: {
    id: "credit.decision.mintingFee",
    defaultMessage: "Minting fee",
    description: "Total fee: discount plus operating cost",
  },
  feeShare: {
    id: "credit.decision.feeShare",
    defaultMessage: "{ratio} of the bill",
    description: "The minting fee as a share of the bill amount",
  },
  payerRisk: { id: "credit.decision.part.payerRisk", defaultMessage: "Payer risk", description: "Fee part for the payer not paying" },
  payerRiskDetail: {
    id: "credit.decision.part.payerRiskDetail",
    defaultMessage: "{pd} non-payment × {lgd} loss",
    description: "Default probability and loss share from the Mint-signed payer record",
  },
  uncertainty: { id: "credit.decision.part.uncertainty", defaultMessage: "Uncertainty", description: "Fee part for evidence quality" },
  uncertaintyDetail: {
    id: "credit.decision.part.uncertaintyDetail",
    defaultMessage: "Payer record {evidence}",
    description: "Evidence level of the payer risk record, which sets the uncertainty part",
  },
  funding: { id: "credit.decision.part.funding", defaultMessage: "Funding cost", description: "Fee part for the Mint's cost of funds" },
  fundingDetail: {
    id: "credit.decision.part.fundingDetail",
    defaultMessage: "Until maturity",
    description: "Why the funding cost depends on time",
  },
  mintReturn: {
    id: "credit.decision.part.mintReturn",
    defaultMessage: "Mint margin",
    description: "Fee part for the Mint's return objective",
  },
  subsidy: { id: "credit.decision.part.subsidy", defaultMessage: "Subsidy", description: "Policy reduction of the fee" },
  limitsWithin: {
    id: "credit.decision.limitsWithin",
    defaultMessage: "Within the Mint's fee limits",
    description: "The governed fee stays under both policy caps",
  },
  limitsNear: {
    id: "credit.decision.limitsNear",
    defaultMessage: "Close to the Mint's fee limits",
    description: "The governed fee uses more than 80% of a policy cap",
  },
  limitsExplained: {
    id: "credit.decision.limitsExplained",
    defaultMessage:
      "The Mint's policy caps a fee at {maxRatio} of the bill, and at {maxAnnual} a year measured on the amount paid out, so short bills cannot carry a steep fee. This fee is {ratio} of the bill, or {annual} a year on the amount paid out. Outside either cap there is no offer at all.",
    description: "Plain explanation of both governed fee caps and where this fee stands",
  },
  adjustHint: {
    id: "credit.decision.adjustHint",
    defaultMessage: "You can adjust the amount in the offer form. A change is re-quoted against these limits and recorded with your basis.",
    description: "Operator adjustments are requoted by governed code inside policy bounds, never applied directly",
  },
});

const evidenceMessages = defineMessages({
  independently_verified: {
    id: "credit.decision.evidence.independentlyVerified",
    defaultMessage: "independently verified",
    description: "Evidence level of the payer risk record: independently verified by an admitted assessor",
  },
  corroborated: {
    id: "credit.decision.evidence.corroborated",
    defaultMessage: "Mint-signed, corroborated",
    description: "Evidence level of the payer risk record: the Mint's own record, corroborated",
  },
});

const PART_MESSAGES = {
  payerRisk: messages.payerRisk,
  uncertainty: messages.uncertainty,
  funding: messages.funding,
  mintReturn: messages.mintReturn,
  subsidy: messages.subsidy,
} as const;

/** Negative values (a subsidy) carry their sign through `Currency`, so a converted amount is signed too. */
function Sat({ value }: { value: number }) {
  return (
    <span className="whitespace-nowrap">
      <Currency value={value} sourceCurrency="sat" className="inline" amountClassName="text-current" />
    </span>
  );
}

function TermRow({
  label,
  detail,
  value,
  tone = "normal",
}: {
  label: string;
  detail?: string;
  value: ReactNode;
  tone?: "normal" | "part" | "total" | "note";
}) {
  return (
    <div
      className={cn(
        "flex items-baseline justify-between gap-4",
        tone === "total" && "border-t border-border pt-2 font-semibold",
        tone === "part" && "pl-3 text-muted-foreground",
        tone !== "part" && tone !== "note" && "text-sm",
        tone === "note" && "text-xs",
        tone === "part" && "text-xs"
      )}
    >
      <dt className="min-w-0">
        {label}
        {detail !== undefined && <span className="block text-xs font-normal text-muted-foreground">{detail}</span>}
      </dt>
      <dd className="shrink-0 tabular-nums">{value}</dd>
    </div>
  );
}

function FeeLimits({ terms, policy, mayAdjust }: { terms: DecisionTerms; policy: DecisionCase["policyPack"]; mayAdjust: boolean }) {
  const intl = useIntl();
  const percent = (bps: number) => intl.formatNumber(bps / 10_000, { style: "percent", minimumFractionDigits: 2 });
  const { feeRatioBps, effectiveAnnualBps: annualBps } = terms;
  const { maximumFeeRatioBps: maxFeeRatioBps, maximumEffectiveAnnualBps: maxAnnualBps } = policy;
  const near = (maxFeeRatioBps > 0 && feeRatioBps / maxFeeRatioBps > 0.8) || (maxAnnualBps > 0 && annualBps / maxAnnualBps > 0.8);
  return (
    <details className="group rounded-md bg-elevation-50 px-3 py-2 text-xs">
      <summary className="flex cursor-pointer list-none items-center gap-1.5 marker:hidden">
        {near ? (
          <CircleAlert className="size-3.5 shrink-0 text-signal-alert" aria-hidden="true" />
        ) : (
          <CircleCheck className="size-3.5 shrink-0 text-signal-success" aria-hidden="true" />
        )}
        <span className="flex-1 font-medium">{intl.formatMessage(near ? messages.limitsNear : messages.limitsWithin)}</span>
        <ChevronDown className="size-3.5 text-muted-foreground transition-transform group-open:rotate-180" aria-hidden="true" />
      </summary>
      <p className="mt-2 text-muted-foreground">
        {intl.formatMessage(messages.limitsExplained, {
          maxRatio: percent(maxFeeRatioBps),
          maxAnnual: percent(maxAnnualBps),
          ratio: percent(feeRatioBps),
          annual: percent(annualBps),
        })}
      </p>
      {mayAdjust && <p className="mt-2 text-muted-foreground">{intl.formatMessage(messages.adjustHint)}</p>}
    </details>
  );
}

/**
 * The governed minting fee, laid out as what the operator approves: what the holder receives, and
 * what the fee pays for. The discount is split into its priced parts only when the calculation
 * trace adds up; otherwise the discount stands as one line.
 */
export function ProposedTerms({
  terms,
  policy,
  breakdown,
  mayAdjust,
}: {
  terms: DecisionTerms;
  policy: DecisionCase["policyPack"];
  breakdown?: FeeBreakdown;
  /** The signed-in operator may requote and the policy pack permits adjustment. */
  mayAdjust: boolean;
}) {
  const intl = useIntl();
  const percent = (bps: number) => intl.formatNumber(bps / 10_000, { style: "percent", minimumFractionDigits: 2 });
  const partDetail = (key: FeePart["key"]): string | undefined => {
    if (breakdown === undefined) return undefined;
    if (key === "payerRisk")
      return intl.formatMessage(messages.payerRiskDetail, {
        pd: percent(breakdown.payerRisk.probabilityOfDefaultBps),
        lgd: percent(breakdown.payerRisk.lossGivenDefaultBps),
      });
    if (key === "uncertainty") {
      const evidence = evidenceMessages[breakdown.uncertainty.evidenceState as keyof typeof evidenceMessages];
      return evidence === undefined
        ? undefined
        : intl.formatMessage(messages.uncertaintyDetail, { evidence: intl.formatMessage(evidence) });
    }
    if (key === "funding") return intl.formatMessage(messages.fundingDetail);
    return undefined;
  };
  return (
    <section aria-labelledby="case-decision-terms" className="space-y-4">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <h3 id="case-decision-terms" className="text-sm font-semibold">
          {intl.formatMessage(messages.terms)}
        </h3>
        <span className="text-xs text-muted-foreground">{intl.formatMessage(messages.validThrough, { date: terms.offerExpiresOn })}</span>
      </div>
      <div>
        <p className="text-xs text-muted-foreground">{intl.formatMessage(messages.holderReceives)}</p>
        <p className="text-2xl font-semibold tracking-tight tabular-nums">
          <Currency value={Number(terms.discountedSat)} sourceCurrency="sat" className="inline" amountClassName="text-current" />
        </p>
        <p className="text-xs text-muted-foreground tabular-nums">
          {intl.formatMessage(messages.holderReceivesContext, {
            bill: `${intl.formatNumber(Number(terms.billSumSat))} sat`,
            date: intl.formatDate(terms.maturityDate, { dateStyle: "medium", timeZone: "UTC" }),
          })}
        </p>
      </div>
      <dl className="space-y-1.5">
        <TermRow
          label={intl.formatMessage(messages.discount, { days: terms.tenorDays })}
          value={<Sat value={Number(terms.appliedDiscountSat)} />}
        />
        {breakdown?.parts.map((part) => (
          <TermRow
            key={part.key}
            tone="part"
            label={intl.formatMessage(PART_MESSAGES[part.key])}
            detail={partDetail(part.key)}
            value={<Sat value={part.sat} />}
          />
        ))}
        <TermRow
          label={intl.formatMessage(messages.operatingCost)}
          detail={intl.formatMessage(messages.operatingCostDetail)}
          value={<Sat value={Number(terms.operatingCostSat)} />}
        />
        <TermRow
          tone="total"
          label={intl.formatMessage(messages.mintingFee)}
          detail={intl.formatMessage(messages.feeShare, { ratio: percent(terms.feeRatioBps) })}
          value={<Sat value={Number(terms.effectiveFeeSat)} />}
        />
      </dl>
      {/* What each side carries afterwards, disclosed with the fee. */}
      <dl className="space-y-1 border-t border-dashed border-border pt-3 text-xs text-muted-foreground">
        <TermRow tone="note" label={intl.formatMessage(messages.payerPays)} value={<Sat value={Number(terms.billSumSat)} />} />
        <TermRow tone="note" label={intl.formatMessage(messages.recourse)} value={<Sat value={Number(terms.endorsementExposureSat)} />} />
      </dl>
      <FeeLimits terms={terms} policy={policy} mayAdjust={mayAdjust} />
    </section>
  );
}

interface CaseDecisionPanelProps {
  /** Absent for quotes without an AI Credit case; the panel then only hosts the quote actions. */
  brief?: CaseBrief;
  /** Only terms the operator can act on now; expired, historical or blocked terms are never shown here. */
  actionableTerms?: { terms: DecisionTerms; policy: DecisionCase["policyPack"]; breakdown?: FeeBreakdown; mayAdjust: boolean };
  /** The quote's own status, shown when there is no case next step to state. */
  statusLabel?: string;
  openPoints?: number;
  /** Governed controls, owned by `QuoteActions`. */
  actions?: ReactNode;
  /** Secondary tools such as the case discussion. */
  footer?: ReactNode;
}

/**
 * The operator's decision column: who acts next, the exact terms that would be offered and the
 * governed controls. It restates recorded state; every gate stays in the shared rules and actions.
 */
export function CaseDecisionPanel({ brief, statusLabel, actionableTerms, openPoints = 0, actions, footer }: CaseDecisionPanelProps) {
  const intl = useIntl();
  const showNextStep = brief !== undefined && brief.next.kind !== "closed";
  return (
    // `overflow-clip` rounds the corners without becoming a scroll container, so the actions can stick.
    <aside aria-labelledby="case-decision-title" className="overflow-clip rounded-lg border border-border bg-card print:hidden">
      <header className="border-b border-border bg-elevation-100 px-5 py-4">
        <h2 id="case-decision-title" className="text-xs font-semibold tracking-wide text-muted-foreground uppercase">
          {intl.formatMessage(messages.title)}
        </h2>
        {showNextStep ? (
          <div className="mt-3">
            <CaseNextStepPanel variant="panel" next={brief.next} brief={brief} openPoints={openPoints} />
          </div>
        ) : (
          statusLabel !== undefined && <p className="mt-3 text-sm font-semibold">{statusLabel}</p>
        )}
      </header>
      {actionableTerms !== undefined && (
        <div className="border-b border-border px-5 py-4">
          <ProposedTerms
            terms={actionableTerms.terms}
            policy={actionableTerms.policy}
            breakdown={actionableTerms.breakdown}
            mayAdjust={actionableTerms.mayAdjust}
          />
        </div>
      )}
      {/* Governed controls render nothing when no action applies; the panel then shows only its status. In the
          two-column layout the column scrolls on its own, and the controls stay pinned to its bottom. */}
      {actions !== undefined && (
        <div className="bg-card px-5 py-4 empty:hidden @4xl:sticky @4xl:bottom-0 @4xl:z-10 @4xl:shadow-[0_-8px_12px_-10px_rgb(0_0_0/0.25)]">
          {actions}
        </div>
      )}
      {footer !== undefined && <footer className="border-t border-border px-5 py-4 [&_button]:w-full">{footer}</footer>}
    </aside>
  );
}
