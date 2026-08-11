import { Badge } from "@/components/ui/badge";
import type { PropsWithChildren } from "react";
import { defineMessages, useIntl } from "react-intl";
import { words, type ConfirmedClaims, type DecisionInvoice } from "./decision-types";

const messages = defineMessages({
  evidence: { id: "credit.invoice.heading", defaultMessage: "Invoice evidence", description: "Heading of the invoice evidence block" },
  goods: { id: "credit.invoice.goods", defaultMessage: "Goods", description: "Label for the invoiced goods description" },
  invoiceNumber: { id: "credit.invoice.number", defaultMessage: "Invoice", description: "Label for the invoice number" },
  plausibility: { id: "credit.invoice.plausibility", defaultMessage: "Plausibility", description: "Label for commercial plausibility" },
  consistency: {
    id: "credit.invoice.consistency",
    defaultMessage: "Bill and claims",
    description: "Label for bill-and-claims consistency",
  },
  reviewedBy: {
    id: "credit.invoice.reviewedBy",
    defaultMessage: "{assessor} · {methodology} · valid through {validThrough}",
    description: "Provenance line under the invoice evidence",
  },
  saidHeading: {
    id: "credit.said.heading",
    defaultMessage: "What the applicant said",
    description: "Summary label of the collapsed applicant-claims panel",
  },
  saidCaption: {
    id: "credit.said.caption",
    defaultMessage:
      "No chat transcript is stored. These are the claims the applicant confirmed during onboarding — quoted verbatim where the applicant wrote them.",
    description: "Honest caption explaining that no transcript exists",
  },
  saidUse: { id: "credit.said.use", defaultMessage: "Use of funds", description: "Label for the use-of-funds quote" },
  saidRepayment: { id: "credit.said.repayment", defaultMessage: "Repayment source", description: "Label for the repayment-source quote" },
  saidRecourse: {
    id: "credit.said.recourse",
    defaultMessage: "Acknowledged liability for the whole bill sum if the acceptor dishonours it",
    description: "Structured claim: endorsement liability acknowledgment",
  },
  saidRecourseMissing: {
    id: "credit.said.recourseMissing",
    defaultMessage: "Has not acknowledged liability for the whole bill sum",
    description: "Structured claim: endorsement liability acknowledgment missing",
  },
  attribution: {
    id: "credit.said.attribution",
    defaultMessage: "Applicant {applicantRef} · {evidenceState}",
    description: "Attribution line for the applicant's claims",
  },
});

function Row({ label, children }: PropsWithChildren<{ label: string }>) {
  return (
    <div className="flex gap-2">
      <span className="text-muted-foreground shrink-0">{label}</span>
      <span className="min-w-0 break-words">{children}</span>
    </div>
  );
}

/**
 * The one thing the underlying invoice says that the bill does not: which trade this is, and whether
 * the Mint's own review found it plausible and consistent with the bill.
 *
 * Its total and its parties are omitted — a "match" finding is exactly the assertion that they equal
 * the bill's, and a mismatch blocks with a verification request that names it. The bill's own facts
 * are not restated at all: they are on the quote detail above this card, and the real bill document
 * is opened from the documents list rather than redrawn here.
 */
export function InvoiceEvidence({ invoice }: { invoice: DecisionInvoice | null }) {
  const intl = useIntl();
  if (invoice === null) return null;

  return (
    <div className="text-xs">
      <div className="mb-1 flex flex-wrap items-center gap-2">
        <span className="font-medium">{intl.formatMessage(messages.evidence)}</span>
        <Badge variant={invoice.plausibility === "plausible" ? "success" : "destructive"}>
          {intl.formatMessage(messages.plausibility)}: {words(invoice.plausibility)}
        </Badge>
        <Badge variant={invoice.billAndClaimsConsistency === "match" ? "success" : "destructive"}>
          {intl.formatMessage(messages.consistency)}: {words(invoice.billAndClaimsConsistency)}
        </Badge>
      </div>
      <div className="grid gap-x-6 gap-y-1 sm:grid-cols-2">
        <Row label={intl.formatMessage(messages.goods)}>{invoice.goodsDescription}</Row>
        <Row label={intl.formatMessage(messages.invoiceNumber)}>
          <span className="font-mono">{invoice.invoiceNumber}</span>
        </Row>
      </div>
      <p className="mt-1 text-muted-foreground">
        {intl.formatMessage(messages.reviewedBy, {
          assessor: invoice.assessedBy,
          methodology: invoice.methodologyVersion,
          validThrough: invoice.validThrough,
        })}
      </p>
    </div>
  );
}

export interface ApplicantClaimsProps {
  claims: ConfirmedClaims;
  applicantRef: string;
}

/**
 * The applicant's own words, on demand. Collapsed by default; the verbatim fields are quoted, the
 * structured confirmations are listed. Nothing here is invented.
 *
 * The acceptor is deliberately absent. `confirmedClaims.acceptorRef` is copied from the
 * authoritative bill when the snapshot is assembled, not from the interview, so showing it here
 * attributed a statement to the applicant that they may never have made — and the free-text
 * acceptor claim they did make is not carried on this DTO at all. Restating the bill's acceptor
 * would be true and pointless; restating it under "what the applicant said" was neither. It stays
 * out until the snapshot carries the applicant's own claim to show.
 */
export function ApplicantClaims({ claims, applicantRef }: ApplicantClaimsProps) {
  const intl = useIntl();
  const quotes = [
    { label: intl.formatMessage(messages.saidUse), text: claims.useOfFunds },
    { label: intl.formatMessage(messages.saidRepayment), text: claims.repaymentSource },
  ];
  const confirmations = [
    claims.wholeFaceRecourseAcknowledged ? intl.formatMessage(messages.saidRecourse) : intl.formatMessage(messages.saidRecourseMissing),
  ];
  return (
    <details className="rounded-md border border-border px-3 py-2">
      <summary className="cursor-pointer select-none text-xs font-medium text-muted-foreground hover:text-foreground">
        {intl.formatMessage(messages.saidHeading)}
      </summary>
      <div className="mt-2 flex flex-col gap-2 text-sm">
        <p className="text-xs text-muted-foreground">{intl.formatMessage(messages.saidCaption)}</p>
        {quotes.map((quote) => (
          <blockquote key={quote.label} className="border-l-2 border-divider-200 pl-3">
            <p className="font-serif italic">“{quote.text}”</p>
            <footer className="text-xs text-muted-foreground">{quote.label}</footer>
          </blockquote>
        ))}
        <ul className="list-disc pl-6 text-xs">
          {confirmations.map((confirmation) => (
            <li key={confirmation}>{confirmation}</li>
          ))}
        </ul>
        <p className="text-xs text-muted-foreground">
          {intl.formatMessage(messages.attribution, { applicantRef, evidenceState: words(claims.evidenceState) })}
        </p>
      </div>
    </details>
  );
}
