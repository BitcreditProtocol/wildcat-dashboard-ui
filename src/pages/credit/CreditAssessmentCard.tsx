import { Badge } from "@/components/ui/badge";
import { Card, CardTitle } from "@bitcredit/ui-library";
import { ChevronDown } from "lucide-react";
import type { ReactNode } from "react";
import { defineMessages, useIntl } from "react-intl";
import { AssessmentPanel } from "./AssessmentPanel";
import { ApplicantClaims, InvoiceEvidence } from "./CaseEvidence";
import { SubmittedDocuments } from "./SubmittedDocuments";
import { percentFromBps, words, type DecisionCase } from "./decision-types";

const messages = defineMessages({
  eyebrow: {
    id: "credit.card.eyebrow",
    defaultMessage: "Governed credit decision",
    description: "Eyebrow above the deterministic credit decision",
  },
  synthetic: { id: "credit.synthetic", defaultMessage: "Synthetic", description: "Badge marking synthetic fixture data" },
  outcomeVerification: {
    id: "credit.outcome.verification",
    defaultMessage: "Verification required",
    description: "Primary title when evidence is incomplete",
  },
  outcomeOffer: { id: "credit.outcome.offer", defaultMessage: "Offer ready", description: "Primary title when governed terms exist" },
  outcomeNoFit: {
    id: "credit.outcome.noFit",
    defaultMessage: "No current product fit",
    description: "Primary title when policy permits no offer",
  },
  outcomeUnknown: {
    id: "credit.outcome.unknown",
    defaultMessage: "Assessment unavailable",
    description: "Primary title for a payload this build cannot safely understand",
  },
  offerSummary: {
    id: "credit.outcome.offerSummary",
    defaultMessage: "Deterministic terms for the full bill.",
    description: "Concise summary under an available governed offer",
  },
  verificationSummary: {
    id: "credit.outcome.verificationSummary",
    defaultMessage: "No quote can be issued until the requested evidence is verified.",
    description: "Concise summary under a verification-required outcome",
  },
  noFitSummary: {
    id: "credit.outcome.noFitSummary",
    defaultMessage: "No offer is available under the active policy.",
    description: "Concise summary under a no-current-product-fit outcome",
  },
  unknownSummary: {
    id: "credit.outcome.unknownSummary",
    defaultMessage: "This adapter cannot safely interpret the governed result. No action is available.",
    description: "Fail-closed summary for an unreadable governed result",
  },
  withinPolicy: { id: "credit.outcome.withinPolicy", defaultMessage: "Within policy", description: "Offer outcome badge" },
  blocked: { id: "credit.outcome.blocked", defaultMessage: "Blocked", description: "Verification outcome badge" },
  noOffer: { id: "credit.outcome.noOffer", defaultMessage: "No offer", description: "No-fit outcome badge" },
  unreadable: { id: "credit.outcome.unreadable", defaultMessage: "Unreadable", description: "Unreadable outcome badge" },
  discounted: {
    id: "credit.quote.discounted",
    defaultMessage: "Offer amount",
    description: "Label for the whole-bill discounted amount the operator may offer",
  },
  expires: { id: "credit.quote.expires", defaultMessage: "Valid until", description: "Label for the governed offer expiry" },
  effective: {
    id: "credit.quote.effective",
    defaultMessage: "Effective annual cost",
    description: "Effective annual cost label",
  },
  feeLine: {
    id: "credit.quote.feeLine",
    defaultMessage: "{fee} total fee · {feeRatio} of bill · {tenor}-day tenor",
    description: "Compact whole-bill fee summary",
  },
  repayment: {
    id: "credit.quote.repayment",
    defaultMessage: "Acceptor pays at maturity. Holder recourse applies only on dishonour; its legal form remains under review.",
    description: "Compact repayment and contingent-recourse disclosure",
  },
  checksPassed: {
    id: "credit.signals.checksPassed",
    defaultMessage: "{passed}/{total} checks passed",
    description: "Compact count of passing deterministic axes",
  },
  invoiceMatch: {
    id: "credit.signals.invoiceMatch",
    defaultMessage: "Invoice matches bill",
    description: "Compact positive invoice consistency signal",
  },
  invoiceReview: {
    id: "credit.signals.invoiceReview",
    defaultMessage: "Invoice needs review",
    description: "Compact non-positive invoice consistency signal",
  },
  reviewDetails: {
    id: "credit.details.review",
    defaultMessage: "Evidence & decision rationale",
    description: "Expandable section containing evidence and deterministic findings",
  },
  reviewHint: {
    id: "credit.details.reviewHint",
    defaultMessage: "Invoice, applicant claims, six checks and calculations",
    description: "Caption for the evidence and rationale disclosure",
  },
  policyDetails: {
    id: "credit.details.policy",
    defaultMessage: "Policy & audit trail",
    description: "Expandable section containing policy provenance and immutable identifiers",
  },
  product: { id: "credit.audit.product", defaultMessage: "Product", description: "Policy product label" },
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
    defaultMessage: "Required before a quote can be considered:",
    description: "Heading above outstanding verification requests",
  },
  noFitReasons: {
    id: "credit.quote.noFitReasons",
    defaultMessage: "Policy reasons: {reasons}",
    description: "Reason summary for a no-current-product-fit outcome",
  },
});

function useDecisionOutcome(decisionCase: DecisionCase) {
  const intl = useIntl();
  const { result } = decisionCase;

  if (result.assessmentStatus === "blocked_pending_verification") {
    return {
      title: intl.formatMessage(messages.outcomeVerification),
      summary: intl.formatMessage(messages.verificationSummary),
      badge: <Badge variant="pending">{intl.formatMessage(messages.blocked)}</Badge>,
    };
  }
  if (result.recommendation === "offer_available") {
    return {
      title: intl.formatMessage(messages.outcomeOffer),
      summary: intl.formatMessage(messages.offerSummary),
      badge: <Badge variant="success">{intl.formatMessage(messages.withinPolicy)}</Badge>,
    };
  }
  if (result.recommendation === "no_current_product_fit") {
    return {
      title: intl.formatMessage(messages.outcomeNoFit),
      summary: intl.formatMessage(messages.noFitSummary),
      badge: <Badge variant="secondary">{intl.formatMessage(messages.noOffer)}</Badge>,
    };
  }
  return {
    title: intl.formatMessage(messages.outcomeUnknown),
    summary: intl.formatMessage(messages.unknownSummary),
    badge: <Badge variant="destructive">{intl.formatMessage(messages.unreadable)}</Badge>,
  };
}

function GovernedTerms({ decisionCase, formatSat }: { decisionCase: DecisionCase; formatSat: (value: string) => string }) {
  const intl = useIntl();
  const { result, snapshot } = decisionCase;
  const terms = result.terms;
  const passed = result.axes.filter((finding) => finding.status === "pass").length;
  const mayShowOffer = result.assessmentStatus === "ready_for_decision" && result.recommendation === "offer_available";

  if (!mayShowOffer || terms === null) {
    return (
      <div className="rounded-lg border border-border bg-elevation-100 p-4">
        {result.assessmentStatus === "blocked_pending_verification" ? (
          <>
            <p className="font-medium text-signal-alert">{intl.formatMessage(messages.verification)}</p>
            <ul className="mt-2 list-disc space-y-1 pl-5 text-sm">
              {result.verificationRequests.map((request) => (
                <li key={request.code}>{request.requiredItem}</li>
              ))}
            </ul>
          </>
        ) : result.recommendation === "no_current_product_fit" ? (
          <p className="text-sm text-muted-foreground">
            {intl.formatMessage(messages.noFitReasons, { reasons: result.reasonCodes.map(words).join("; ") })}
          </p>
        ) : (
          <p className="font-medium text-signal-alert">{intl.formatMessage(messages.unknownSummary)}</p>
        )}
      </div>
    );
  }

  const invoiceMatches = snapshot.invoice?.billAndClaimsConsistency === "match" && snapshot.invoice.plausibility === "plausible";
  return (
    <div className="flex flex-col gap-3">
      <div className="grid gap-4 rounded-lg border border-border bg-elevation-100 p-4 sm:grid-cols-3">
        <div>
          <div className="text-xs font-medium text-muted-foreground">{intl.formatMessage(messages.discounted)}</div>
          <div className="mt-1 text-2xl font-semibold tabular-nums tracking-tight">{formatSat(terms.discountedSat)}</div>
        </div>
        <div>
          <div className="text-xs font-medium text-muted-foreground">{intl.formatMessage(messages.expires)}</div>
          <div className="mt-1 text-lg font-semibold tabular-nums">{terms.offerExpiresOn}</div>
        </div>
        <div>
          <div className="text-xs font-medium text-muted-foreground">{intl.formatMessage(messages.effective)}</div>
          <div className="mt-1 text-lg font-semibold tabular-nums">{percentFromBps(terms.effectiveAnnualBps)}</div>
        </div>
      </div>

      <div className="flex flex-wrap gap-2">
        <Badge variant="outline">{intl.formatMessage(messages.checksPassed, { passed, total: result.axes.length })}</Badge>
        {snapshot.invoice !== null && (
          <Badge variant={invoiceMatches ? "success" : "pending"}>
            {intl.formatMessage(invoiceMatches ? messages.invoiceMatch : messages.invoiceReview)}
          </Badge>
        )}
        <Badge variant="outline">{words(snapshot.acceptor.evidenceState)}</Badge>
      </div>

      <div className="grid gap-1 text-xs text-muted-foreground sm:grid-cols-2 sm:gap-4">
        <span>
          {intl.formatMessage(messages.feeLine, {
            fee: formatSat(terms.effectiveFeeSat),
            feeRatio: percentFromBps(terms.feeRatioBps),
            tenor: terms.tenorDays,
          })}
        </span>
        <span>{intl.formatMessage(messages.repayment)}</span>
      </div>
    </div>
  );
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

export function CreditAssessmentCard({ decisionCase }: { decisionCase: DecisionCase }) {
  const intl = useIntl();
  const formatSat = (value: string) => `${intl.formatNumber(Number(value))} sat`;
  const { snapshot, policyPack } = decisionCase;
  const outcome = useDecisionOutcome(decisionCase);

  return (
    <Card className="gap-0 overflow-hidden p-0 text-sm">
      <div className="flex flex-col gap-4 p-5">
        <div className="flex items-start gap-4">
          <div className="min-w-0 flex-1">
            <p className="text-[11px] font-medium uppercase tracking-widest text-muted-foreground">
              {intl.formatMessage(messages.eyebrow)}
            </p>
            <div className="mt-1 flex flex-wrap items-center gap-2">
              <CardTitle className="text-xl">{outcome.title}</CardTitle>
              {outcome.badge}
            </div>
            <p className="mt-1 text-sm text-muted-foreground">{outcome.summary}</p>
          </div>
          {snapshot.isSynthetic && <Badge variant="outline">{intl.formatMessage(messages.synthetic)}</Badge>}
        </div>

        <GovernedTerms decisionCase={decisionCase} formatSat={formatSat} />
      </div>

      <Disclosure title={intl.formatMessage(messages.reviewDetails)} hint={intl.formatMessage(messages.reviewHint)}>
        <InvoiceEvidence invoice={snapshot.invoice} />
        {snapshot.bill !== null && (
          <SubmittedDocuments billId={snapshot.bill.billId} submittedEvidence={decisionCase.submittedEvidence ?? []} />
        )}
        <ApplicantClaims claims={snapshot.confirmedClaims} applicantRef={snapshot.applicantRef} />
        <AssessmentPanel decisionCase={decisionCase} formatSat={formatSat} />
      </Disclosure>

      <Disclosure
        title={intl.formatMessage(messages.policyDetails)}
        hint={`${policyPack.country} · ${words(policyPack.industry)} · ${policyPack.policyPackVersion}`}
      >
        <dl className="flex flex-col gap-2">
          <AuditRow label={intl.formatMessage(messages.product)}>{words(policyPack.product)}</AuditRow>
          <AuditRow label={intl.formatMessage(messages.policyVersion)}>{policyPack.policyPackVersion}</AuditRow>
          <AuditRow label={intl.formatMessage(messages.calculationVersion)}>{policyPack.calculationVersion}</AuditRow>
          <AuditRow label={intl.formatMessage(messages.annualLimit)}>{percentFromBps(policyPack.maximumEffectiveAnnualBps)}</AuditRow>
          <AuditRow label={intl.formatMessage(messages.feeLimit)}>{percentFromBps(policyPack.maximumFeeRatioBps)}</AuditRow>
          <AuditRow label={intl.formatMessage(messages.caseId)}>{snapshot.caseId}</AuditRow>
          <AuditRow label={intl.formatMessage(messages.snapshotDate)}>{snapshot.asOfDate}</AuditRow>
          <AuditRow label={intl.formatMessage(messages.policyDigest)}>
            <span title={policyPack.policyPackDigest}>{policyPack.policyPackDigest}</span>
          </AuditRow>
          <AuditRow label={intl.formatMessage(messages.resultDigest)}>
            <span title={decisionCase.resultDigest}>{decisionCase.resultDigest}</span>
          </AuditRow>
        </dl>
      </Disclosure>
    </Card>
  );
}
