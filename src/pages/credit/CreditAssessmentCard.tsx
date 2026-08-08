import { Badge } from "@/components/ui/badge";
import { humanReadableDurationDays } from "@/utils/dates";
import { Card, CardTitle } from "@bitcredit/ui-library";
import { defineMessages, useIntl } from "react-intl";
import { AssessmentPanel } from "./AssessmentPanel";
import { ApplicantClaims, InvoiceEvidence } from "./CaseEvidence";
import { SubmittedDocuments } from "./SubmittedDocuments";
import { percentFromBps, words, type DecisionCase } from "./decision-types";

/**
 * The AI Credit assessment for one bill, rendered inside the mint's own quote view. It informs
 * the operator's existing Offer/Deny decision; it does not replace it. The figure shown is what
 * governed code says the mint may offer for the whole bill — the `discounted` amount the quote
 * API expects — and the applicant's claims and the six findings sit behind it.
 */

const messages = defineMessages({
  heading: { id: "credit.card.heading", defaultMessage: "AI Credit assessment", description: "Heading of the credit assessment card" },
  synthetic: { id: "credit.synthetic", defaultMessage: "Synthetic", description: "Badge marking synthetic fixture data" },
  asOf: { id: "credit.asOf", defaultMessage: "As of {date}", description: "Snapshot date of a case" },
  offerHeading: { id: "credit.quote.heading", defaultMessage: "Governed offer", description: "Heading of the offer figures" },
  discounted: {
    id: "credit.quote.discounted",
    defaultMessage: "Offer this amount",
    description: "Label for the discounted amount — what the operator enters in the quote's offer action",
  },
  expires: {
    id: "credit.quote.expires",
    defaultMessage: "Offer expires",
    description: "Label for the offer expiry — the ttl the quote's offer action takes",
  },
  effective: { id: "credit.quote.effective", defaultMessage: "Effective annual", description: "Effective annual cost label" },
  ceiling: { id: "credit.quote.ceiling", defaultMessage: "ceiling {ceiling}", description: "Caption naming the policy ceiling for a rate" },
  feeLine: {
    id: "credit.quote.feeLine",
    defaultMessage: "Fee {fee} over {tenor} days — {feeRatio} of the bill sum, against a {feeCeiling} ceiling.",
    description: "The mint's whole fee, measured against the holder guardrail",
  },
  endorsement: {
    id: "credit.quote.endorsement",
    defaultMessage:
      "The acceptor is the principal obligor. The holder carries the whole bill sum by endorsement only if the bill is dishonoured — the legal form of that liability is still under review.",
    description: "Honest statement of who owes what",
  },
  noOffer: { id: "credit.quote.none", defaultMessage: "No offer — {reasons}.", description: "Shown when policy produced no terms" },
  verification: {
    id: "credit.verification",
    defaultMessage: "Do not offer yet — verification is outstanding:",
    description: "Shown while the assessment is blocked",
  },
  outcomeVerification: { id: "credit.outcome.verification", defaultMessage: "Verification required", description: "Outcome badge" },
  outcomeOffer: { id: "credit.outcome.offer", defaultMessage: "Offer available at governed terms", description: "Outcome badge" },
  outcomeNoFit: { id: "credit.outcome.noFit", defaultMessage: "No current product fit", description: "Outcome badge" },
  outcomeUnknown: {
    id: "credit.outcome.unknown",
    defaultMessage: "Unrecognised outcome — check the adapter build",
    description: "Outcome badge for a payload this build does not understand",
  },
  actionNote: {
    id: "credit.card.actionNote",
    defaultMessage: "Offering and denying happen in the quote actions below. This assessment records no decision of its own.",
    description: "Points the operator at the real action rail",
  },
});

function OutcomeBadge({ result }: { result: DecisionCase["result"] }) {
  const intl = useIntl();
  if (result.assessmentStatus === "blocked_pending_verification") {
    return <Badge variant="pending">{intl.formatMessage(messages.outcomeVerification)}</Badge>;
  }
  if (result.recommendation === "offer_available") {
    return <Badge variant="success">{intl.formatMessage(messages.outcomeOffer)}</Badge>;
  }
  // Never let an outcome this build cannot read fall through to a refusal: a stale adapter would
  // then show every case as declined, which is both wrong and the most dangerous way to be wrong.
  if (result.recommendation !== "no_current_product_fit") {
    return <Badge variant="destructive">{intl.formatMessage(messages.outcomeUnknown)}</Badge>;
  }
  return <Badge variant="secondary">{intl.formatMessage(messages.outcomeNoFit)}</Badge>;
}

function GovernedOffer({ decisionCase, formatSat }: { decisionCase: DecisionCase; formatSat: (value: string) => string }) {
  const intl = useIntl();
  const { policyPack, result } = decisionCase;
  const terms = result.terms;

  if (terms === null) {
    return (
      <div className="flex flex-col gap-2 rounded-lg border border-border p-4">
        <p className="text-sm font-medium text-signal-alert">
          {result.assessmentStatus === "blocked_pending_verification"
            ? intl.formatMessage(messages.verification)
            : intl.formatMessage(messages.noOffer, { reasons: result.reasonCodes.map(words).join("; ") })}
        </p>
        {result.verificationRequests.length > 0 && (
          <ul className="list-disc space-y-0.5 pl-4 text-xs">
            {result.verificationRequests.map((request) => (
              <li key={request.code}>{request.requiredItem}</li>
            ))}
          </ul>
        )}
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-3 rounded-lg border border-border bg-elevation-100 p-4">
      <div className="text-[11px] uppercase tracking-widest text-muted-foreground">{intl.formatMessage(messages.offerHeading)}</div>
      {/* The three figures the offer action needs: the amount, its ttl, and the price it implies. */}
      <div className="grid gap-3 sm:grid-cols-3">
        <div>
          <div className="text-xs text-muted-foreground">{intl.formatMessage(messages.discounted)}</div>
          <div className="text-xl font-semibold tabular-nums">{formatSat(terms.discountedSat)}</div>
        </div>
        <div>
          <div className="text-xs text-muted-foreground">{intl.formatMessage(messages.expires)}</div>
          <div className="text-xl font-semibold tabular-nums">{terms.offerExpiresOn}</div>
          {/* Same relative phrasing the quote's own maturity row uses. */}
          <div className="text-[11px] text-muted-foreground">{humanReadableDurationDays(intl.locale, new Date(terms.offerExpiresOn))}</div>
        </div>
        <div>
          <div className="text-xs text-muted-foreground">{intl.formatMessage(messages.effective)}</div>
          <div className="text-xl font-semibold tabular-nums">{percentFromBps(terms.effectiveAnnualBps)}</div>
          {/* A rate without its limit tells an operator nothing about how much headroom is left. */}
          <div className="text-[11px] text-muted-foreground">
            {intl.formatMessage(messages.ceiling, { ceiling: percentFromBps(policyPack.maximumEffectiveAnnualBps) })}
          </div>
        </div>
      </div>
      <p className="text-xs text-muted-foreground">
        {intl.formatMessage(messages.feeLine, {
          fee: formatSat(terms.effectiveFeeSat),
          feeRatio: percentFromBps(terms.feeRatioBps),
          feeCeiling: percentFromBps(policyPack.maximumFeeRatioBps),
          tenor: terms.tenorDays,
        })}
      </p>
      <p className="text-xs text-muted-foreground">{intl.formatMessage(messages.endorsement)}</p>
    </div>
  );
}

export interface CreditAssessmentCardProps {
  decisionCase: DecisionCase;
  /** Set on the standalone synthetic view, where no real quote actions exist above the card. */
  hideActionNote?: boolean;
}

export function CreditAssessmentCard({ decisionCase, hideActionNote = false }: CreditAssessmentCardProps) {
  const intl = useIntl();
  const formatSat = (value: string) => `${intl.formatNumber(Number(value))} sat`;
  const { snapshot } = decisionCase;

  return (
    <Card className="flex flex-col gap-4 p-4 text-sm">
      <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
        <CardTitle className="text-base">{intl.formatMessage(messages.heading)}</CardTitle>
        <OutcomeBadge result={decisionCase.result} />
        {snapshot.isSynthetic && <Badge variant="outline">{intl.formatMessage(messages.synthetic)}</Badge>}
        <span className="ml-auto font-mono text-xs text-muted-foreground">
          {snapshot.caseId} · {intl.formatMessage(messages.asOf, { date: snapshot.asOfDate })}
        </span>
      </div>

      {/* Reading order is the operator's: what to offer, then what backs it, then detail on demand.
          Bill and party facts are not repeated here — the quote detail above this card carries them. */}
      <GovernedOffer decisionCase={decisionCase} formatSat={formatSat} />

      <InvoiceEvidence invoice={snapshot.invoice} />

      {snapshot.bill !== null && (
        <SubmittedDocuments billId={snapshot.bill.billId} submittedEvidence={decisionCase.submittedEvidence ?? []} />
      )}

      <ApplicantClaims claims={snapshot.confirmedClaims} applicantRef={snapshot.applicantRef} />

      <AssessmentPanel decisionCase={decisionCase} formatSat={formatSat} />

      {!hideActionNote && <p className="text-xs text-muted-foreground">{intl.formatMessage(messages.actionNote)}</p>}
    </Card>
  );
}
